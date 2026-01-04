const fs = require('fs');
const path = require('path');
const https = require('https');

// Manually read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env.local', e);
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // remove quotes
        envVars[key] = val;
    }
});

const domain = envVars.METERED_DOMAIN || 'global.metered.live';
const apiKey = envVars.METERED_API_KEY;

if (!apiKey) {
    console.error('Missing METERED_API_KEY in .env.local');
    // Maybe checking process.env too if running in environment where acts are preloaded? 
    // But for this script we want to test the file.
}

console.log(`Testing connection to: ${domain}`);
const url = `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const json = JSON.parse(data);
                console.log('Success! Received ICE servers:');
                if (Array.isArray(json)) {
                    console.log(`Count: ${json.length}`);
                    console.log('Sample URL:', json[0].urls);
                } else {
                    console.log('Data:', json);
                }
            } else {
                console.error(`Error: ${res.statusCode} ${res.statusMessage}`);
                console.error(data);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.error('Raw:', data);
        }
    });
}).on('error', (err) => {
    console.error('Fetch error:', err.message);
});
