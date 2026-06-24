const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Check if package-lock.json exists in remote
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/contents/package-lock.json', {
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
        try {
            const data = JSON.parse(d);
            console.log('package-lock.json exists:', !!data.sha);
            console.log('SHA:', data.sha);
        } catch(e) {
            console.log('Error:', d.substring(0, 500));
        }
    });
}).on('error', e => console.error(e.message));
