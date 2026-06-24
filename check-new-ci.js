const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Get the latest Pages run
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
        const latest = pagesRuns[0];
        console.log('Run ID:', latest.id);
        
        // Get jobs
        https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/' + latest.id + '/jobs', {
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
                const jobs = JSON.parse(d2);
                (jobs.jobs || []).forEach(job => {
                    console.log('Job:', job.name, '| Status:', job.status, '| Conclusion:', job.conclusion);
                });
                
                // Get build job logs
                const buildJob = (jobs.jobs || []).find(j => j.name === 'build');
                if (buildJob) {
                    console.log('\nFetching build job logs for run', latest.id, '...');
                    https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/jobs/' + buildJob.id + '/logs', {
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
                            // Look for python/agnes related lines
                            const lines = d3.split('\n');
                            const relevant = lines.filter(l => 
                                l.toLowerCase().includes('python') || 
                                l.toLowerCase().includes('pip') || 
                                l.toLowerCase().includes('agnes') || 
                                l.toLowerCase().includes('generate analysis') ||
                                l.toLowerCase().includes('setup python') ||
                                l.toLowerCase().includes('openai')
                            );
                            console.log('Relevant lines:', relevant.length);
                            relevant.forEach(l => console.log(l.trim()));
                        });
                    }).on('error', e => console.error(e.message));
                }
            });
        }).on('error', e => console.error(e.message));
    });
}).on('error', e => console.error(e.message));
