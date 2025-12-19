const { spawn } = require('child_process');
const fs = require('fs');

console.log("Starting tunnel...");
const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', '-R', '80:localhost:3000', 'nokey@localhost.run']);

function checkData(data) {
    const str = data.toString();
    console.log(str);
    // Regex for localhost.run URLs (random-id.lhr.life)
    const match = str.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match) {
        console.log("URL FOUND:", match[0]);
        fs.writeFileSync('url.txt', match[0]);
        // Keep process alive!
    }
}

ssh.stdout.on('data', checkData);
ssh.stderr.on('data', checkData);

ssh.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
