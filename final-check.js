const https = require('https');

// Wait 2 minutes then check
setTimeout(() => {
    const options = {
        hostname: 'heaplore.github.io',
        path: '/antenna-tracker/',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Connection': 'close'
        },
        rejectUnauthorized: false
    };
    
    const req = https.get(options, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
            console.log('market:', d.includes('市场概览'));
            console.log('cross:', d.includes('四维交叉分析'));
            console.log('len:', d.length);
        });
    });
    req.on('error', e => console.error(e.message));
}, 120000);

console.log('Waiting 2 minutes...');
