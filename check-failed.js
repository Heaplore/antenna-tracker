const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Check latest successful Pages run
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
        const pagesRuns = (data.workflow_runs || []).filter(run => run.name.includes('GitHub Pages') && run.conclusion === 'success');
        if (pagesRuns.length > 0) {
            const latest = pagesRuns[0];
            console.log('Latest successful Pages run:', latest.id);
            console.log('Created:', new Date(latest.created_at).toLocaleString());
            
            // Wait and check page
            setTimeout(() => {
                https.get('https://heaplore.github.io/antenna-tracker/', (r2) => {
                    let d2 = '';
                    r2.on('data', c => d2 += c);
                    r2.on('end', () => {
                        console.log('Has 市场概览:', d2.includes('市场概览'));
                        console.log('Has 四维交叉分析:', d2.includes('四维交叉分析'));
                        console.log('Page length:', d2.length);
                        
                        // Also check the HTML content for any analysis-related strings
                        if (d2.length > 10000) {
                            console.log('Page seems to have content');
                        }
                    });
                }).on('error', e => console.error(e.message));
            }, 10000);
        } else {
            console.log('No successful Pages runs found');
        }
    });
}).on('error', e => console.error(e.message));
