const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Get all workflow runs for this repo
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs?per_page=5', {
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
        (data.workflow_runs || []).forEach(run => {
            console.log('Run ID:', run.id);
            console.log('  Name:', run.name);
            console.log('  Status:', run.status);
            console.log('  Conclusion:', run.conclusion);
            console.log('  Created:', new Date(run.created_at).toLocaleString());
            console.log('  Head commit:', run.head_commit?.message?.substring(0, 50));
            console.log();
        });
    });
}).on('error', e => console.error(e.message));
