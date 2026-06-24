const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Check latest remote HEAD
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/contents/scripts/generate-analysis.py', {
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
        try {
            const data = JSON.parse(d);
            console.log('File exists, size:', data.size);
            console.log('SHA:', data.sha);
        } catch(e) {
            console.log('Error:', d.substring(0, 500));
        }
    });
}).on('error', e => console.error(e.message));
