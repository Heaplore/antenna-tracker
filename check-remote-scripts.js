const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

// Get current HEAD commit SHA
https.get('https://api.github.com/repos/Heaplore/antenna-tracker/commits/main', {
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
        console.log('HEAD SHA:', data.sha);
        console.log('Message:', data.commit.message);
        
        // Get tree
        https.get('https://api.github.com/repos/Heaplore/antenna-tracker/git/trees/' + data.sha + '?recursive=1', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'test'
            },
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (r2) => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
                const tree = JSON.parse(d2);
                const scripts = (tree.tree || []).filter(t => t.path.startsWith('scripts/'));
                console.log('\nScripts files in remote:');
                scripts.forEach(s => console.log('  ' + s.path + ' (' + s.type + ', ' + s.size + ' bytes)'));
                
                // Check specifically for generate-analysis.py
                const hasGen = scripts.find(s => s.path === 'scripts/generate-analysis.py');
                console.log('\nHas generate-analysis.py:', !!hasGen);
            });
        }).on('error', e => console.error(e.message));
    });
}).on('error', e => console.error(e.message));
