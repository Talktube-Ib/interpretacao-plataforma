const https = require('https');

const apiKey = '755252d60ebf349ab5d1ae9a42aafdc99831';
const domainResult = 'talktubeib.metered.live';
const globalDomain = 'global.metered.live';

// Function to test a specific url
function testUrl(label, url) {
    console.log(`\n--- Testing ${label} ---`);
    console.log(`URL: ${url}`);

    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log('SUCCESS! \u2705');
                try {
                    const json = JSON.parse(data);
                    console.log('Valid JSON received.');
                } catch (e) { console.log('Data is not JSON'); }
            } else {
                console.log('FAILED \u274C');
                console.log('Response:', data);
            }
        });
    }).on('error', err => console.error('Net Error:', err.message));
}

// 1. Test Provided Domain + Key
testUrl('Custom Domain', `https://${domainResult}/api/v1/turn/credentials?apiKey=${apiKey}`);

// 2. Test Global Domain + Key (Sometimes keys work globally)
testUrl('Global Domain', `https://${globalDomain}/api/v1/turn/credentials?apiKey=${apiKey}`);

// 3. Test Trimmed Key (Just in case the dash is weird or accidental, though unlikely)
// testUrl('Trimmed Key', `https://${domainResult}/api/v1/turn/credentials?apiKey=${apiKey.substring(1)}`);
