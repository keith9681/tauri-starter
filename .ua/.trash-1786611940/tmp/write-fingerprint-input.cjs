const fs = require('fs');
const { execFileSync } = require('child_process');
const projectRoot = process.argv[2];
const outputPath = process.argv[3];
const scan = JSON.parse(fs.readFileSync(`${projectRoot}/.ua/intermediate/scan-result.json`, 'utf8'));
const input = {
  projectRoot,
  sourceFilePaths: scan.files.map((file) => file.path),
  gitCommitHash: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
};
fs.writeFileSync(outputPath, JSON.stringify(input, null, 2));
