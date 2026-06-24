const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Get the latest failed run's build job logs
// Try to get the log download URL
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/28047006671/jobs', {
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
            // Get all step logs
            buildJob.steps.forEach(step => {
                if (step.conclusion === 'failure' || step.conclusion === 'cancelled') {
                    console.log('Failed step:', step.name, '(number:', step.number + ')');
                    // Try to get logs for this step
                    const logUrl = 'https://api.github.com/repos/Heaplore/antenna-tracker/actions/jobs/' + buildJob.id + '/logs';
                    https.get(logUrl, {
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
                            console.log('Log size for job', buildJob.id, ':', d2.length);
                            if (d2.length > 0) {
                                console.log('Content:', d2.substring(0, 2000));
                            }
                        });
                    }).on('error', e => console.error(e.message));
                }
            });
        }
    });
}).on('error', e => console.error(e.message));
