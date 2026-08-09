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

const jsxFiles = getFiles('./src/pages', '.jsx').concat(getFiles('./src/components', '.jsx'));
let injectedCount = 0;

jsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const baseName = path.basename(file, '.jsx');
  const uniqueScope = `scope-${baseName.toLowerCase()}`;
  
  // Find the first className=" after return (
  const returnIndex = content.indexOf('return (');
  if (returnIndex !== -1) {
    const beforeReturn = content.slice(0, returnIndex);
    let afterReturn = content.slice(returnIndex);
    
    // Check if it already has the scope
    if (!afterReturn.includes(uniqueScope)) {
      // Replace the first className=" with className="scope-name 
      afterReturn = afterReturn.replace(/className=(["'])/, `className=$1${uniqueScope} `);
      fs.writeFileSync(file, beforeReturn + afterReturn);
      injectedCount++;
      console.log(`Injected ${uniqueScope} into ${baseName}.jsx`);
    }
  }
});

console.log(`\nInjected unique scopes into ${injectedCount} JSX files.`);
