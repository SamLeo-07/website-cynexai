const fs = require('fs');
const path = 'src/components/AdminCourseManager.tsx';
let content = fs.readFileSync(path, 'utf8');
const initialLength = content.length;
content = content.replace(/<button(?![^>]*\btype=[\"\'])(?=\s|>)/g, '<button type="button"');
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced buttons. Original size: ' + initialLength + ', New size: ' + content.length);
