const https = require('https');

const options = {
    hostname: 'heaplore.github.io',
    path: '/antenna-tracker/',
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
        'Connection': 'close'
    },
    rejectUnauthorized: false
};

const req = https.get(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Cache:', res.headers['cache-control'] || 'none');
    console.log('Age:', res.headers['age'] || 'none');
    
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('Content length:', d.length);
        console.log('Has 市场概览:', d.includes('市场概览'));
        console.log('Has 四维交叉分析:', d.includes('四维交叉分析'));
        console.log('Has crossDimensionSummary:', d.includes('crossDimensionSummary'));
    });
});

req.on('error', e => console.error(e.message));
