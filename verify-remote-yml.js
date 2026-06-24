const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Check remote workflow
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/contents/.github/workflows/deploy-pages.yml', {
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
        const content = Buffer.from(data.content, data.encoding).toString('utf-8');
        console.log('Has setup-python:', content.includes('setup-python'));
        console.log('Has AGNES_API_KEY:', content.includes('AGNES_API_KEY'));
        console.log('Has schedule:', content.includes('schedule'));
        console.log('Has pip install:', content.includes('pip install'));
        console.log('Has Generate analysis:', content.includes('Generate analysis'));
    });
}).on('error', e => console.error(e.message));
