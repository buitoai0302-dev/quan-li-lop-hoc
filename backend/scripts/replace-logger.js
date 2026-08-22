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

  if (content.includes('console.log') || content.includes('console.error')) {
    if (!content.includes('logger') && !file.endsWith('logger.ts')) {
      let depth = file.split('src\\')[1].split('\\').length - 1;
      if (depth === 0) depth = file.split('src/')[1]?.split('/')?.length - 1 || 0;
      let relativePath = depth === 0 ? './utils/logger' : '../'.repeat(depth) + 'utils/logger';
      content = "import { logger } from '" + relativePath + "';\n" + content;
    }

    content = content.replace(/console\.log/g, 'logger.info');
    content = content.replace(/console\.error/g, 'logger.error');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Replaced console.logs with logger.info/error');
