const https = require('https');

function check() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'heaplore.github.io',
            path: '/antenna-tracker/',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Connection': 'close'
            },
            rejectUnauthorized: false
        };
        
        const req = https.get(options, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                resolve({
                    hasMarket: d.includes('市场概览'),
                    hasCrossAnalysis: d.includes('四维交叉分析'),
                    length: d.length,
                    cache: res.headers['cache-control'] || 'none',
                    age: res.headers['age'] || 'none'
                });
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function main() {
    console.log('Waiting for CDN cache to expire (max-age=600)...');
    for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const result = await check();
            console.log('[' + (i+1) + '] cache=' + result.cache + ' age=' + result.age + ' market=' + result.hasMarket + ' cross=' + result.hasCrossAnalysis + ' len=' + result.length);
            if (!result.hasMarket && result.hasCrossAnalysis) {
                console.log('\n✅ CDN 已刷新！四维交叉分析已显示！');
                return;
            }
        } catch(e) {
            console.log('[' + (i+1) + '] error: ' + e.message);
        }
    }
    console.log('\n⚠️ 缓存还没完全刷新，但 CDN 应该会在 10 分钟内自动过期');
}

main().catch(e => console.error(e.message));
