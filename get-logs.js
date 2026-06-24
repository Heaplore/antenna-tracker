const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/28043701377/jobs', {
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
        const buildJob = (data.jobs || []).find(j => j.name === 'build');
        if (buildJob) {
            console.log('Build job ID:', buildJob.id);
            https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/jobs/' + buildJob.id + '/logs', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'test'
                },
                agent: new https.Agent({ rejectUnauthorized: false })
            }, (r2) => {
                let d2 = '';
                r2.on('data', c => d2 += c);
                r2.on('end', () => {
                    console.log('Log size:', d2.length);
                    // Show ALL content
                    console.log('=== FULL LOG ===');
                    console.log(d2);
                });
            }).on('error', e => console.error(e.message));
        }
    });
}).on('error', e => console.error(e.message));
