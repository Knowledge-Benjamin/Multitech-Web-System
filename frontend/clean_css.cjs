const fs = require('fs');
const path = require('path');

const targetClasses = [
  'form-group', 'form-row', 'form-actions', 'button', 'button-primary',
  'button-secondary', 'button-accent', 'button-outline', 'button-danger',
  'alert', 'alert-error', 'alert-success', 'badge', 'status-badge',
  'status-rejected', 'admin-layout', 'admin-sidebar', 'admin-content',
  'admin-container', 'content-header', 'card-header'
];

function getCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getCssFiles(filePath, fileList);
    } else if (filePath.endsWith('.css') && !filePath.includes('global.css') && !filePath.includes('mobile.css') && !filePath.includes('App.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const cssFiles = getCssFiles('./src');

// Regex to match a block like .classname { ... }
const createRegex = (className) => new RegExp(`\\.${className}\\s*\\{[^}]*\\}`, 'g');

let removedCount = 0;

cssFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  targetClasses.forEach(cls => {
    const regex = createRegex(cls);
    content = content.replace(regex, '');
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    removedCount++;
    console.log(`Stripped duplicate globals from ${path.basename(file)}`);
  }
});

console.log(`\nSuccessfully cleaned ${removedCount} CSS files.`);
