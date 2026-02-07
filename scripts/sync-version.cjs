const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, '../PUBLIC_CHANGELOG.md');
const packagePath = path.join(__dirname, '../package.json');

try {
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Match format: ## [0.1.0] or ## 0.1.0 (with optional text after)
    const versionRegex = /^##\s+(?:\[?(\d+\.\d+\.\d+)\]?)/m;
    const match = changelog.match(versionRegex);

    if (match) {
        const newVersion = match[1];
        if (packageJson.version !== newVersion) {
            console.log(`\x1b[36m[Sync Version]\x1b[0m Updating version: \x1b[31m${packageJson.version}\x1b[0m -> \x1b[32m${newVersion}\x1b[0m`);
            packageJson.version = newVersion;
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        } else {
            console.log(`\x1b[36m[Sync Version]\x1b[0m Version is up to date: \x1b[32m${newVersion}\x1b[0m`);
        }
    } else {
        console.warn('\x1b[33m[Sync Version] Warning: No version number found in PUBLIC_CHANGELOG.md (Format expected: ## [x.y.z] ...)\x1b[0m');
    }
} catch (error) {
    console.error('\x1b[31m[Sync Version] Error:\x1b[0m', error.message);
    process.exit(1);
}
