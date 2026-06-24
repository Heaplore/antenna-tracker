const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';
const repo = 'Heaplore/antenna-tracker';
const basePath = 'E:\\OH-workspace\\antenna-tracker';

// Use the last known remote HEAD
const remoteHead = 'ade277b8653c1d540ab67863f30194c9ca3d0069';
console.log('Remote HEAD:', remoteHead);

// Get all files in the repo (since we can't diff with remote)
const allFiles = execSync('git ls-files', { cwd: basePath }).toString().trim().split('\n').filter(Boolean);
console.log('Total tracked files:', allFiles.length);

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
    // Upload all tracked files
    const blobShas = {};
    for (const f of allFiles) {
        const fullPath = basePath + '\\' + f.replace(/\//g, '\\');
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath);
            const encoded = content.toString('base64');
            const blobResp = await apiPost('/repos/' + repo + '/git/blobs', { content: encoded, encoding: 'base64' });
            blobShas[f] = blobResp.body.sha;
            console.log('Uploaded:', f, '->', blobResp.body.sha.substring(0, 8));
        } else {
            console.log('Skipped (not found):', f);
        }
    }
    
    // Get base tree
    const treeResp = await new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/' + repo + '/git/trees/' + remoteHead + '?recursive=1', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => {
                const body = JSON.parse(d);
                console.log('Tree status:', r.statusCode, 'has tree:', !!body.tree, 'keys:', Object.keys(body).join(','));
                resolve({ status: r.statusCode, body });
            });
        }).on('error', reject);
    });
    
    if (treeResp.status !== 200) {
        console.log('Tree error:', JSON.stringify(treeResp.body, null, 2).substring(0, 500));
        return;
    }
    
    const newTreeEntries = treeResp.body.tree.map(entry => {
        if (blobShas[entry.path]) {
            return { ...entry, sha: blobShas[entry.path] };
        }
        return entry;
    });
    
    const newTreeResp = await apiPost('/repos/' + repo + '/git/trees', { tree: newTreeEntries });
    console.log('New tree SHA:', newTreeResp.body.sha);
    
    const commitResp = await apiPost('/repos/' + repo + '/git/commits', {
        message: 'sync all local changes to remote',
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
    console.log('Done!');
}

main().catch(e => console.error(e.message));
