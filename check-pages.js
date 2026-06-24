const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Force purge by creating a new deployment
// First, let's check if there's a way to invalidate cache
// GitHub Pages CDN cache typically lasts 1-2 hours

// Let's try a different approach - check the actual deployed index.html
// by downloading the artifact from the latest successful run

https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/28035461001/artifacts', {
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
        console.log('Artifacts:', JSON.stringify(data, null, 2));
    });
}).on('error', e => console.error(e.message));
