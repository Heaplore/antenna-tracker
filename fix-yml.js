const https = require('https');
const fs = require('fs');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';
const repo = 'Heaplore/antenna-tracker';
const basePath = 'E:\\OH-workspace\\antenna-tracker';
const remoteHead = 'e7d0077fdafad3483119e2eb6ae9054b5ca7826e'; // latest commit

function apiGet(path) {
    return new Promise((resolve, reject) => {
        https.get('https://api.github.com' + path, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'antenna-tracker-deploy'
            },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject);
    });
}

function apiPost(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        https.request('https://api.github.com' + path, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'User-Agent': 'antenna-tracker-deploy'
            },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject).end(data);
    });
}

function apiPatch(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        https.request('https://api.github.com' + path, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'User-Agent': 'antenna-tracker-deploy'
            },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(d) }));
        }).on('error', reject).end(data);
    });
}

async function main() {
    // 1. Upload workflow file
    const workflowContent = fs.readFileSync(basePath + '/.github/workflows/deploy-pages.yml', 'utf8');
    const encoded = Buffer.from(workflowContent).toString('base64');
    const blobResp = await apiPost('/repos/' + repo + '/git/blobs', {
        content: encoded,
        encoding: 'base64'
    });
    console.log('Blob SHA:', blobResp.body.sha);

    // 2. Get base tree
    const treeResp = await apiGet('/repos/' + repo + '/git/trees/' + remoteHead + '?recursive=1');
    const baseTree = treeResp.body;

    // 3. Update tree entry
    const newTreeEntries = baseTree.tree.map(entry => {
        if (entry.path === '.github/workflows/deploy-pages.yml' && entry.type === 'blob') {
            return { ...entry, sha: blobResp.body.sha };
        }
        return entry;
    });

    const newTreeResp = await apiPost('/repos/' + repo + '/git/trees', { tree: newTreeEntries });
    console.log('New tree SHA:', newTreeResp.body.sha);

    // 4. Create commit
    const commitResp = await apiPost('/repos/' + repo + '/git/commits', {
        message: 'fix: add Python analysis to CI workflow',
        tree: newTreeResp.body.sha,
        parents: [remoteHead]
    });
    console.log('New commit SHA:', commitResp.body.sha);

    // 5. Update main branch
    const refResp = await apiPatch('/repos/' + repo + '/git/refs/heads/main', {
        sha: commitResp.body.sha,
        force: true
    });
    console.log('Main updated to:', refResp.body.object.sha);

    // 6. Verify
    const verifyResp = await apiGet('/repos/' + repo + '/contents/.github/workflows/deploy-pages.yml');
    const verifyContent = Buffer.from(verifyResp.body.content, verifyResp.body.encoding).toString('utf-8');
    console.log('\nVerification:');
    console.log('Has setup-python:', verifyContent.includes('setup-python'));
    console.log('Has AGNES_API_KEY:', verifyContent.includes('AGNES_API_KEY'));
    console.log('Has pip install:', verifyContent.includes('pip install'));
    console.log('Has Generate analysis:', verifyContent.includes('Generate analysis'));
}

main().catch(e => console.error(e.message));
