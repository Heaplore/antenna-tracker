const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/28041109577/jobs', {
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
        console.log('Response:', d.substring(0, 3000));
    });
}).on('error', e => console.error(e.message));
