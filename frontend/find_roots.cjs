const fs = require('fs');
const path = require('path');

function getFiles(dir, ext, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, ext, fileList);
    } else if (filePath.endsWith(ext)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsxFiles = getFiles('./src/pages', '.jsx').concat(getFiles('./src/components', '.jsx'));

jsxFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Find the first className="xyz" after return
  const returnMatch = content.indexOf('return (');
  if (returnMatch !== -1) {
    const afterReturn = content.slice(returnMatch);
    const classMatch = afterReturn.match(/className=["']([^"']+)["']/);
    if (classMatch) {
      const firstClass = classMatch[1].split(' ')[0];
      const cssFileName = path.basename(file).replace('.jsx', '.css');
      console.log(`${path.basename(file)} -> Root Class: .${firstClass} -> Targets: ${cssFileName}`);
    }
  }
});
