const https = require('https');
const fs = require('fs');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';
const repo = 'Heaplore/antenna-tracker';
const basePath = 'E:\\OH-workspace\\antenna-tracker';
const remoteHead = 'd4d59205455f48ef869c61dfb2c0bfc39c61c8e8';

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
        message: 'simplified workflow',
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
        poll(0);
    }).catch(e => console.error(e.message));
}

function poll(count) {
    https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs', {
        headers: {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'test'},
        agent: new https.Agent({rejectUnauthorized:false})
    }, (r) => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => {
            const data = JSON.parse(d);
            const pagesRuns = (data.workflow_runs || []).filter(run => run.name.includes('GitHub Pages'));
            if (pagesRuns.length > 0) {
                const latest = pagesRuns[0];
                console.log('[' + (count+1) + '] Run:' + latest.id + ' status:' + latest.status + ' conclusion:' + (latest.conclusion || 'running'));
                if (latest.status === 'completed') {
                    if (latest.conclusion === 'success') {
                        console.log('✅ CI 构建成功！');
                        setTimeout(() => {
                            https.get('https://heaplore.github.io/antenna-tracker/', {
                                headers: {'User-Agent':'Mozilla/5.0','Connection':'close'},
                                agent: new https.Agent({rejectUnauthorized:false})
                            }, (r) => {
                                let d = ''; r.on('data', c => d += c);
                                r.on('end', () => {
                                    console.log('Has 市场概览:', d.includes('市场概览'));
                                    console.log('Has 四维交叉分析:', d.includes('四维交叉分析'));
                                    console.log('Page length:', d.length);
                                });
                            }).on('error', e => console.error(e.message));
                        }, 20000);
                    } else {
                        console.log('❌ CI 构建失败');
                        // Show steps
                        https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/' + latest.id + '/jobs', {
                            headers: {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'test'},
                            agent: new https.Agent({rejectUnauthorized:false})
                        }, (r2) => {
                            let d2 = ''; r2.on('data', c => d2 += c);
                            r2.on('end', () => {
                                const jobs = JSON.parse(d2);
                                const buildJob = (jobs.jobs || []).find(j => j.name === 'build');
                                if (buildJob) {
                                    console.log('Build steps:');
                                    (buildJob.steps || []).forEach(step => {
                                        console.log('  #' + step.number + ': ' + step.name + ' -> ' + step.conclusion);
                                    });
                                }
                            });
                        });
                    }
                } else {
                    setTimeout(() => poll(count + 1), 10000);
                }
            }
        });
    }).on('error', e => console.error(e.message));
}

main().catch(e => console.error(e.message));
