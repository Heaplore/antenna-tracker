const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/artifacts/7824785460/zip', {
    headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'test' },
    agent: new https.Agent({ rejectUnauthorized: false })
}, (r) => {
    if (r.statusCode === 302 && r.headers.location) {
        https.get(r.headers.location, {
            headers: { 'User-Agent': 'test' },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r2) => {
            let d = Buffer.alloc(0);
            r2.on('data', c => d = Buffer.concat([d, c]));
            r2.on('end', () => {
                // Extract tar using inflateRaw
                const dataPos = 42;
                const tarData = zlib.inflateRawSync(d.subarray(dataPos));
                console.log('Tar size:', tarData.length);
                
                // Parse tar
                let tPos = 0;
                let indexHtml = null;
                while (tPos < tarData.length) {
                    if (tPos + 512 > tarData.length) break;
                    const tName = tarData.toString('utf8', tPos, tPos + 100).replace(/\0/g, '').replace(/^\.\//, '');
                    if (!tName) { tPos += 512; continue; }
                    const tSize = parseInt(tarData.toString('utf8', tPos + 124, tPos + 136).replace(/\s/g, ''), 8) || 0;
                    const tDataPos = tPos + 512;
                    const tPaddedSize = Math.ceil(tSize / 512) * 512;
                    
                    if (tName === 'index.html') {
                        indexHtml = tarData.subarray(tDataPos, tDataPos + tSize).toString('utf-8');
                        console.log('Found index.html, length:', indexHtml.length);
                    }
                    tPos = tDataPos + tPaddedSize;
                }
                
                if (indexHtml) {
                    console.log('\n=== index.html content check ===');
                    console.log('Has 市场概览:', indexHtml.includes('市场概览'));
                    console.log('Has 四维交叉分析:', indexHtml.includes('四维交叉分析'));
                    console.log('Has crossDimensionSummary:', indexHtml.includes('crossDimensionSummary'));
                    console.log('Has Technology:', indexHtml.includes('Technology'));
                    console.log('Has 综合:', indexHtml.includes('综合'));
                    console.log('Has 分析生成:', indexHtml.includes('分析生成'));
                    console.log('Has 天线行业情报追踪:', indexHtml.includes('天线行业情报追踪'));
                    
                    // Show body content
                    const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/);
                    if (bodyMatch) {
                        console.log('\n=== BODY PREVIEW ===');
                        console.log(bodyMatch[1].substring(0, 3000));
                    }
                } else {
                    console.log('index.html not found');
                }
            });
        });
    }
}).on('error', e => console.error(e.message));
