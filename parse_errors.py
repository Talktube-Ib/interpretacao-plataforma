import json
import sys

try:
    with open('report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    files_with_errors = []
    for entry in data:
        error_count = entry.get('errorCount', 0)
        if error_count > 0:
            files_with_errors.append({
                'path': entry['filePath'],
                'errors': error_count,
                'warnings': entry.get('warningCount', 0)
            })
    
    # Sort by error count descending
    files_with_errors.sort(key=lambda x: x['errors'], reverse=True)
    
    print(f"{'Path':<80} | {'Errors':<7} | {'Warnings':<7}")
    print("-" * 100)
    for item in files_with_errors[:20]:
        # Truncate path if too long for display
        path = item['path']
        if len(path) > 80:
            path = "..." + path[-77:]
        print(f"{path:<80} | {item['errors']:<7} | {item['warnings']:<7}")

except Exception as e:
    print(f"Error parsing JSON: {e}")
    sys.exit(1)
