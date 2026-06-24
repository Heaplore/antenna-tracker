const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Purge GitHub Pages cache by requesting the latest deployment
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/deployments', {
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
        const deps = JSON.parse(d);
        if (deps.length > 0) {
            const latest = deps[0];
            console.log('Latest deployment:', latest.id, 'state:', latest.state, 'SHA:', latest.sha.substring(0, 8));
            
            // Try to get the actual deployed page
            https.get('https://heaplore.github.io/antenna-tracker/', {
                headers: { 'User-Agent': 'test' },
                agent: new https.Agent({ rejectUnauthorized: false })
            }, (r2) => {
                let d2 = '';
                r2.on('data', c => d2 += c);
                r2.on('end', () => {
                    // Check if page contains cross-analysis
                    const hasCrossAnalysis = d2.includes('四维交叉分析') || d2.includes('cross-analysis') || d2.includes('crossDimensionSummary');
                    const hasMarketOverview = d2.includes('市场概览') || d2.includes('marketData');
                    console.log('Page has 四维交叉分析:', hasCrossAnalysis);
                    console.log('Page has 市场概览:', hasMarketOverview);
                    console.log('Page length:', d2.length);
                    if (d2.length < 5000) {
                        console.log('Preview:', d2.substring(0, 2000));
                    }
                });
            }).on('error', e => console.error('Fetch error:', e.message));
        }
    });
}).on('error', e => console.error(e.message));
