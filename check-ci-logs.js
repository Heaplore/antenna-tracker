const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Get the latest Pages run jobs
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/28034149183/jobs', {
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
        (data.jobs || []).forEach(job => {
            console.log('Job ID:', job.id, '| Name:', job.name, '| Status:', job.status, '| Conclusion:', job.conclusion);
        });
        
        // Get build job logs
        const buildJob = (data.jobs || []).find(j => j.name === 'build');
        if (buildJob) {
            console.log('\nFetching build job logs...');
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
                    // Logs come as a zip download
                    console.log('Log download URL: https://github.com/Heaplore/antenna-tracker/actions/runs/28034149183/job/' + buildJob.id);
                    
                    // Check if analysis-output.json was generated
                    https.get('https://api.github.com/repos/Heaplore/antenna-tracker/contents/app/_data/analysis-output.json', {
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Accept': 'application/vnd.github+json',
                            'User-Agent': 'test'
                        },
                        agent: new https.Agent({ rejectUnauthorized: false })
                    }, (r3) => {
                        let d3 = '';
                        r3.on('data', c => d3 += c);
                        r3.on('end', () => {
                            try {
                                const content = JSON.parse(d3);
                                const decoded = Buffer.from(content.content, content.encoding).toString('utf-8');
                                const parsed = JSON.parse(decoded);
                                console.log('\nRemote analysis-output.json generatedAt:', parsed.generatedAt);
                                console.log('Has dimensions:', !!parsed.dimensions);
                                console.log('Tech cards:', parsed.dimensions?.technology?.cards?.length || 0);
                            } catch(e) {
                                console.log('Could not parse remote analysis-output.json');
                            }
                        });
                    }).on('error', e => console.error(e.message));
                });
            }).on('error', e => console.error(e.message));
        }
    });
}).on('error', e => console.error(e.message));
