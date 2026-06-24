const https = require('https');
const fs = require('fs');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';
const repo = 'Heaplore/antenna-tracker';
const basePath = 'E:\\OH-workspace\\antenna-tracker';
const remoteHead = '54ba37e072dd17944458a8ef3054de2c1c82e07c';

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
    const content = fs.readFileSync(basePath + '/.github/workflows/deploy-pages.yml', 'utf8');
    const encoded = Buffer.from(content).toString('base64');
    const blobResp = await apiPost('/repos/' + repo + '/git/blobs', { content: encoded, encoding: 'base64' });
    
    const treeResp = await new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/' + repo + '/git/trees/' + remoteHead + '?recursive=1', {
            headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'antenna-tracker' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = ''; r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject);
    });
    
    const newTreeEntries = treeResp.body.tree.map(entry => {
        if (entry.path === '.github/workflows/deploy-pages.yml' && entry.type === 'blob') {
            return { ...entry, sha: blobResp.body.sha };
        }
        return entry;
    });
    
    const newTreeResp = await apiPost('/repos/' + repo + '/git/trees', { tree: newTreeEntries });
    const commitResp = await apiPost('/repos/' + repo + '/git/commits', {
        message: 'use npx next build',
        tree: newTreeResp.body.sha,
        parents: [remoteHead]
    });
    
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
    console.log('Pushed to:', refResp.body.object.sha);
    
    // Trigger CI
    https.post = function(url, body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body || '');
            const urlObj = new URL(url);
            const req = https.request({
                hostname: urlObj.hostname, path: urlObj.pathname, method: 'POST',
                headers: {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'User-Agent':'antenna-tracker'},
                agent: new https.Agent({rejectUnauthorized:false})
            }, (res) => {
                let d = ''; res.on('data', c => d += c);
                res.on('end', () => resolve({ status: res.statusCode, body: d }));
            });
            req.on('error', reject);
            if (data) req.write(data);
            req.end();
        });
    };
    
    https.post('https://api.github.com/repos/' + repo + '/actions/workflows/deploy-pages.yml/dispatches', { ref: 'main' }).then(r => {
        console.log('Dispatch:', r.status);
    }).catch(e => console.error(e.message));
}

main().catch(e => console.error(e.message));
