const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Check if generate-analysis.py exists at commit ade277b
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/contents/scripts/generate-analysis.py?ref=ade277b8653c1d540ab67863f30194c9ca3d0069', {
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
        console.log('Status:', r.statusCode);
        console.log('Response:', d.substring(0, 500));
    });
}).on('error', e => console.error(e.message));
