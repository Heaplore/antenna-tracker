const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

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
        const data = JSON.parse(d);
        if (data.content) {
            const content = Buffer.from(data.content, data.encoding).toString('utf-8');
            console.log('Has minimax_client import:', content.includes('minimax_client'));
            console.log('Has agnes_client import:', content.includes('agnes_client'));
        } else {
            console.log('No content in response:', JSON.stringify(data).substring(0, 500));
        }
    });
}).on('error', e => console.error(e.message));
