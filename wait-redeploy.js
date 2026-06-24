const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

function check() {
    return new Promise((resolve, reject) => {
        https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'test'
            },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r) => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => {
                const data = JSON.parse(d);
                const pagesRuns = (data.workflow_runs || []).filter(run => run.name.includes('GitHub Pages'));
                if (pagesRuns.length > 0) {
                    resolve(pagesRuns[0]);
                } else {
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('Waiting for re-deploy...');
    for (let i = 0; i < 40; i++) {
        const run = await check();
        if (run) {
            console.log('[' + (i+1) + '] Run ID:' + run.id + ' status:' + run.status + ' conclusion:' + (run.conclusion || 'running'));
            if (run.status === 'completed') {
                if (run.conclusion === 'success') {
                    console.log('✅ Re-deploy succeeded!');
                    // Check page
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    checkPage();
                } else {
                    console.log('❌ Re-deploy failed');
                }
                return;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    console.log('Timeout');
}

function checkPage() {
    https.get('https://heaplore.github.io/antenna-tracker/', (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
            console.log('Has 市场概览:', d.includes('市场概览'));
            console.log('Has 四维交叉分析:', d.includes('四维交叉分析'));
            console.log('Page length:', d.length);
        });
    }).on('error', e => console.error(e.message));
}

main().catch(e => console.error(e.message));
