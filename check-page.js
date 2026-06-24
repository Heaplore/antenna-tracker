const https = require('https');

https.get('https://heaplore.github.io/antenna-tracker/', (r) => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
        console.log('Has 市场概览:', d.includes('市场概览'));
        console.log('Has 四维交叉分析:', d.includes('四维交叉分析'));
        console.log('Has crossDimensionSummary:', d.includes('crossDimensionSummary'));
        console.log('Has Technology:', d.includes('Technology'));
        console.log('Has Quality:', d.includes('Quality'));
        console.log('Has Cost:', d.includes('Cost'));
        console.log('Has Delivery:', d.includes('Delivery'));
        
        // Find navbar links
        const navMatches = d.match(/href="\/antenna-tracker[^"]*"/g) || [];
        console.log('Nav links:', navMatches.slice(0, 10));
        
        console.log('Content length:', d.length);
    });
}).on('error', e => console.error(e.message));
