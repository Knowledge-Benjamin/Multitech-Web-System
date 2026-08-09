const fs = require('fs');
const path = require('path');

function getFiles(dir, ext, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, ext, fileList);
    } else if (filePath.endsWith(ext) && !filePath.includes('global.css') && !filePath.includes('mobile.css') && !filePath.includes('App.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const cssFiles = getFiles('./src/pages', '.css').concat(getFiles('./src/components', '.css'));
let scopedCount = 0;

cssFiles.forEach(file => {
  const baseName = path.basename(file, '.css');
  const uniqueScope = `scope-${baseName.toLowerCase()}`;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // If we already ran the previous script, we need to unwrap it first.
  // The previous script wrapped it in .rootClass { ... }
  // To be safe, let's restore them from git again to guarantee a clean slate.
  // We'll assume git restore is run right before this script.
  
  // Wrap the entire content
  const scopedContent = `.${uniqueScope} {\n${content}\n}`;
  fs.writeFileSync(file, scopedContent);
  scopedCount++;
  console.log(`Scoped ${path.basename(file)} with .${uniqueScope}`);
});

console.log(`\nSuccessfully scoped ${scopedCount} CSS files with unique scopes.`);
