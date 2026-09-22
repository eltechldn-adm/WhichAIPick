import https from 'https';

const url = 'https://phase-review.whichaipick.pages.dev/build-info.json';
const targetCommit = '7bfae939cde4c93478c72a827bedf720c62ed600';

function check() {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const info = JSON.parse(data);
        console.log(`Current commit: ${info.commitHash}, Target: ${targetCommit}`);
        if (info.commitHash === targetCommit && info.schemaVersion === '8G') {
          console.log('✅ Cloudflare deployment completed and matches target commit.');
          console.log(JSON.stringify(info, null, 2));
          process.exit(0);
        } else {
          setTimeout(check, 10000);
        }
      } catch (e) {
        console.log('Error parsing JSON, retrying...', e.message);
        setTimeout(check, 10000);
      }
    });
  }).on('error', (e) => {
    console.error('Request error:', e.message);
    setTimeout(check, 10000);
  });
}

check();
