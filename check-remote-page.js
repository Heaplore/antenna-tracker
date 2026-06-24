const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Check remote page.tsx content
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/contents/app/page.tsx', {
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
        console.log('Has 市场概览:', content.includes('市场概览'));
        console.log('Has 四维交叉分析:', content.includes('四维交叉分析'));
        console.log('Has crossDimensionSummary:', content.includes('crossDimensionSummary'));
        console.log('Has Technology:', content.includes('Technology'));
        console.log('Has 综合:', content.includes('综合'));
        console.log('Has 分析生成:', content.includes('分析生成'));
        console.log('Has import marketData:', content.includes('marketDataRaw'));
        console.log('Has import newsData:', content.includes('newsDataRaw'));
        console.log('Has import companiesData:', content.includes('companiesDataRaw'));
    });
}).on('error', e => console.error(e.message));
