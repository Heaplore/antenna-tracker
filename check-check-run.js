const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Get the build job ID from the latest run
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/28045859040/jobs', {
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
            console.log('Build job:', buildJob.id);
            console.log('Check run URL:', buildJob.check_run_url);
            
            // Get check run details
            https.get(buildJob.check_run_url, {
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
                    const cr = JSON.parse(d2);
                    console.log('\nCheck run:');
                    console.log('Name:', cr.name);
                    console.log('Status:', cr.status);
                    console.log('Conclusion:', cr.conclusion);
                    console.log('Title:', cr.output?.title);
                    console.log('Summary:', (cr.output?.summary || '').substring(0, 3000));
                });
            }).on('error', e => console.error(e.message));
        }
    });
}).on('error', e => console.error(e.message));
