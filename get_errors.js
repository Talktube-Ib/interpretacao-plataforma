const fs = require('fs');
try {
    const report = JSON.parse(fs.readFileSync('report.json', 'utf8'));
    const filesWithErrors = report.filter(f => f.errorCount > 0);
    let output = '';
    filesWithErrors.forEach(f => {
        output += `\nFile: ${f.filePath}\n`;
        f.messages.forEach(m => {
            if (m.severity === 2) {
                 output += `  Line ${m.line}: ${m.message} (${m.ruleId || 'TS'})\n`;
            }
        });
    });
    output += `\nTotal files with errors: ${filesWithErrors.length}\n`;
    fs.writeFileSync('parsed_errors.log', output);
} catch(e) { console.error(e) }
