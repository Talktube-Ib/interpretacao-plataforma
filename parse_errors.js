const fs = require('fs');

try {
    const content = fs.readFileSync('report.json', 'utf8');
    // Find the first '[' and last ']' to extract the JSON array
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']') + 1;
    if (start === -1 || end === 0) {
        console.error('No JSON array found in report.json');
        process.exit(1);
    }
    const jsonStr = content.substring(start, end);
    const data = JSON.parse(jsonStr);

    const filesWithErrors = data
        .filter(entry => entry.errorCount > 0)
        .map(entry => ({
            path: entry.filePath,
            errors: entry.errorCount,
            warnings: entry.warningCount
        }))
        .sort((a, b) => b.errors - a.errors);

    console.log(`${'Path'.padEnd(60)} | ${'Errors'.padEnd(7)} | ${'Warnings'.padEnd(7)}`);
    console.log('-'.repeat(80));
    filesWithErrors.slice(0, 20).forEach(item => {
        let p = item.path;
        if (p.length > 60) p = '...' + p.slice(-57);
        console.log(`${p.padEnd(60)} | ${String(item.errors).padEnd(7)} | ${String(item.warnings).padEnd(7)}`);
    });
} catch (e) {
    console.error('Error parsing JSON:', e.message);
    process.exit(1);
}
