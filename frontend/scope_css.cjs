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
const rootMap = {};

// 1. Build a map of css file -> root class
jsxFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const returnMatch = content.indexOf('return (');
  if (returnMatch !== -1) {
    const afterReturn = content.slice(returnMatch);
    const classMatch = afterReturn.match(/className=["']([^"']+)["']/);
    if (classMatch) {
      const firstClass = classMatch[1].split(' ')[0];
      const cssFileName = path.basename(file).replace('.jsx', '.css');
      rootMap[cssFileName] = firstClass;
    }
  }
});

// 2. Process all CSS files
const cssFiles = getFiles('./src/pages', '.css').concat(getFiles('./src/components', '.css'));
let scopedCount = 0;

cssFiles.forEach(file => {
  const cssFileName = path.basename(file);
  const rootClass = rootMap[cssFileName];
  
  if (rootClass) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it's already wrapped (heuristic)
    if (content.trim().startsWith(`.${rootClass} {`) && content.trim().endsWith('}')) {
       // Might be already scoped, skip to be safe if it looks fully wrapped
       // Actually, let's just proceed carefully
    }
    
    // Remove existing explicit scoping to prevent .home .home
    // Regex: match .rootClass followed by a space or pseudo-class, replacing with just the space/pseudo
    const regex = new RegExp(`\\\\.${rootClass}(\\\\s+|:)`, 'g');
    content = content.replace(regex, '$1');
    
    // Wrap the entire content
    const scopedContent = `.${rootClass} {\n${content}\n}`;
    fs.writeFileSync(file, scopedContent);
    scopedCount++;
    console.log(`Scoped ${cssFileName} with .${rootClass}`);
  } else {
    console.log(`Warning: No root class found for ${cssFileName}`);
  }
});

console.log(`\nSuccessfully scoped ${scopedCount} CSS files.`);
