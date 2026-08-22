const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk(path.join(__dirname, '../src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const regex = /logger\.error\(\s*(['"][^'"]+['"])\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, (match, msg, errVar) => {
      return `logger.error(${errVar}, ${msg})`;
    });
    changed = true;
  }
  
  // also handle logger.info / logger.error single string argument incorrectly flagged
  // Actually, I'll just fix the known TS errors for the parameters manually using regex
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log('Fixed logger.error arguments');
