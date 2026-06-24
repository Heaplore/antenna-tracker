const https = require('https');
const token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"';

function poll(count) {
    https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs', {
        headers: {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'test'},
        agent: new https.Agent({rejectUnauthorized:false})
    }, (r) => {
        let d = ''; r.on('data', c => d += c);
        r.on('end', () => {
            const data = JSON.parse(d);
            const pagesRuns = (data.workflow_runs || []).filter(run => run.name.includes('GitHub Pages') && run.status !== 'queued');
            if (pagesRuns.length > 0) {
                const latest = pagesRuns[0];
                console.log('[' + (count+1) + '] Run:' + latest.id + ' status:' + latest.status + ' conclusion:' + (latest.conclusion || 'running'));
                if (latest.status === 'completed') {
                    if (latest.conclusion === 'success') {
                        console.log('✅ CI 构建成功！');
                        setTimeout(() => {
                            https.get('https://heaplore.github.io/antenna-tracker/', {
                                headers: {'User-Agent':'Mozilla/5.0','Connection':'close'},
                                agent: new https.Agent({rejectUnauthorized:false})
                            }, (r) => {
                                let d = ''; r.on('data', c => d += c);
                                r.on('end', () => {
                                    console.log('Has 市场概览:', d.includes('市场概览'));
                                    console.log('Has 四维交叉分析:', d.includes('四维交叉分析'));
                                    console.log('Page length:', d.length);
                                });
                            }).on('error', e => console.error(e.message));
                        }, 20000);
                    } else {
                        console.log('❌ CI 构建失败');
                        https.get('https://api.github.com/repos/Heaplore/antenna-tracker/actions/runs/' + latest.id + '/jobs', {
                            headers: {'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'test'},
                            agent: new https.Agent({rejectUnauthorized:false})
                        }, (r2) => {
                            let d2 = ''; r2.on('data', c => d2 += c);
                            r2.on('end', () => {
                                const jobs = JSON.parse(d2);
                                const buildJob = (jobs.jobs || []).find(j => j.name === 'build');
                                if (buildJob) {
                                    console.log('Build steps:');
                                    (buildJob.steps || []).forEach(step => {
                                        console.log('  #' + step.number + ': ' + step.name + ' -> ' + step.conclusion);
                                    });
                                }
                            });
                        });
                    }
                } else {
                    setTimeout(() => poll(count + 1), 10000);
                }
            }
        });
    }).on('error', e => console.error(e.message));
}

poll(0);
