const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

https.post = function(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body || '');
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname, path: urlObj.pathname, method: 'POST',
            headers: {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'User-Agent':'antenna-tracker-deploy'},
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

https.post('https://api.github.com/repos/Heaplore/antenna-tracker/actions/workflows/deploy-pages.yml/dispatches', { ref: 'main' }).then(r => {
    console.log('Dispatch:', r.status);
    if (r.status === 204) {
        // Wait and check
        setTimeout(check, 10000);
    }
}).catch(e => console.error(e.message));

function check() {
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
                console.log('Run ID:', latest.id, 'Status:', latest.status, 'Conclusion:', latest.conclusion || 'running');
                if (latest.status === 'completed') {
                    if (latest.conclusion === 'success') {
                        console.log('✅ CI 构建成功！');
                        // Check page
                        setTimeout(checkPage, 5000);
                    } else {
                        console.log('❌ CI 构建失败');
                    }
                } else {
                    setTimeout(check, 10000);
                }
            }
        });
    }).on('error', e => console.error(e.message));
}

function checkPage() {
    https.get('https://heaplore.github.io/antenna-tracker/', (r) => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => {
            console.log('Has 市场概览:', d.includes('市场概览'));
            console.log('Has 四维交叉分析:', d.includes('四维交叉分析'));
            console.log('Page length:', d.length);
        });
    }).on('error', e => console.error(e.message));
}
