const https = require('https');
const fs = require('fs');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';
const repo = 'Heaplore/antenna-tracker';
const basePath = 'E:\\OH-workspace\\antenna-tracker';
const remoteHead = 'ade277b8653c1d540ab67863f30194c9ca3d0069'; // latest remote HEAD

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
    // Read simplified page.tsx
    const content = fs.readFileSync(basePath + '/app/page.tsx', 'utf8');
    const encoded = Buffer.from(content).toString('base64');
    
    // Upload blob
    const blobResp = await apiPost('/repos/' + repo + '/git/blobs', { content: encoded, encoding: 'base64' });
    console.log('Blob SHA:', blobResp.body.sha);
    
    // Get base tree using GET
    const treeResp = await new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/' + repo + '/git/trees/' + remoteHead + '?recursive=1', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject);
    });
    console.log('Tree status:', treeResp.status);
    if (treeResp.status !== 200) {
        console.log('Tree error:', JSON.stringify(treeResp.body, null, 2).substring(0, 500));
        return;
    }
    const baseTree = treeResp.body;
    
    // Update tree entry
    const newTreeEntries = baseTree.tree.map(entry => {
        if (entry.path === 'app/page.tsx' && entry.type === 'blob') {
            return { ...entry, sha: blobResp.body.sha };
        }
        return entry;
    });
    
    const newTreeResp = await apiPost('/repos/' + repo + '/git/trees', { tree: newTreeEntries });
    console.log('New tree SHA:', newTreeResp.body.sha);
    
    const commitResp = await apiPost('/repos/' + repo + '/git/commits', {
        message: 'fix: simplify homepage to cross-analysis only',
        tree: newTreeResp.body.sha,
        parents: [remoteHead]
    });
    console.log('New commit SHA:', commitResp.body.sha);
    
    // Update main ref
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
    const verifyResp = await apiPost('/repos/' + repo + '/contents/app/page.tsx', {});
    // Actually need GET
    const verifyGet = await new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/' + repo + '/contents/app/page.tsx', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
    const verifyContent = Buffer.from(verifyGet.content, verifyGet.encoding).toString('utf-8');
    console.log('\nVerification:');
    console.log('Has 市场概览:', verifyContent.includes('市场概览'));
    console.log('Has 四维交叉分析:', verifyContent.includes('四维交叉分析'));
    console.log('Has import marketData:', verifyContent.includes('marketDataRaw'));
}

main().catch(e => console.error(e.message));
