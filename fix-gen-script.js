const https = require('https');
const fs = require('fs');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';
const repo = 'Heaplore/antenna-tracker';
const basePath = 'E:\\OH-workspace\\antenna-tracker';
const remoteHead = '180a9c58cceebe98287f717f421497822723e470';

function apiPost(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        https.request('https://api.github.com' + path, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject).end(data);
    });
}

async function main() {
    // Upload generate-analysis.py
    const content = fs.readFileSync(basePath + '/scripts/generate-analysis.py', 'utf8');
    const encoded = Buffer.from(content).toString('base64');
    const blobResp = await apiPost('/repos/' + repo + '/git/blobs', { content: encoded, encoding: 'base64' });
    console.log('Blob SHA:', blobResp.body.sha);
    
    // Get base tree
    const treeResp = await new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/' + repo + '/git/trees/' + remoteHead + '?recursive=1', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject);
    });
    
    console.log('Base tree entries:', treeResp.body.tree.length);
    
    // Check if scripts/generate-analysis.py exists in base tree
    const existing = treeResp.body.tree.find(t => t.path === 'scripts/generate-analysis.py');
    console.log('Existing in tree:', existing ? 'YES (sha: ' + existing.sha + ')' : 'NO - need to ADD');
    
    // Add or replace the entry
    let newTreeEntries;
    if (existing) {
        newTreeEntries = treeResp.body.tree.map(entry => {
            if (entry.path === 'scripts/generate-analysis.py' && entry.type === 'blob') {
                return { ...entry, sha: blobResp.body.sha };
            }
            return entry;
        });
    } else {
        // ADD the entry
        newTreeEntries = [...treeResp.body.tree, {
            path: 'scripts/generate-analysis.py',
            sha: blobResp.body.sha,
            mode: '100644',
            type: 'blob'
        }];
    }
    
    const newTreeResp = await apiPost('/repos/' + repo + '/git/trees', { tree: newTreeEntries });
    console.log('New tree SHA:', newTreeResp.body.sha);
    
    const commitResp = await apiPost('/repos/' + repo + '/git/commits', {
        message: 'add scripts/generate-analysis.py',
        tree: newTreeResp.body.sha,
        parents: [remoteHead]
    });
    console.log('New commit SHA:', commitResp.body.sha);
    
    https.patch = function(path, body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            https.request('https://api.github.com' + path, {
                method: 'PATCH',
                headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'User-Agent': 'antenna-tracker' },
                agent: new https.Agent({ rejectUnauthorized: false })
            }, (r) => {
                let d = ''; r.on('data', c => d += c);
                r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
            }).on('error', reject).end(data);
        });
    };
    
    const refResp = await https.patch('/repos/' + repo + '/git/refs/heads/main', { sha: commitResp.body.sha, force: true });
    console.log('Main updated to:', refResp.body.object.sha);
    
    // Verify
    const verifyResp = await new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/' + repo + '/contents/scripts/generate-analysis.py', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject);
    });
    console.log('\nVerify status:', verifyResp.status);
    if (verifyResp.status === 200) {
        console.log('File exists! Size:', verifyResp.body.size, 'bytes');
    } else {
        console.log('Still missing:', JSON.stringify(verifyResp.body).substring(0, 300));
    }
}

main().catch(e => console.error(e.message));
