const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace standard strings
  content = content.replace(/'http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');
  content = content.replace(/\"http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');
  
  // Replace backtick strings with interpolations, e.g., `http://localhost:5000/api/${id}`
  content = content.replace(/`http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');

  // Fix strings that were single quotes but now have interpolations, ending with single quote
  content = content.replace(/`http:\/\/\$\{window\.location\.hostname\}:5000([^']*)'/g, '`http://${window.location.hostname}:5000$1`');
  
  // Fix strings that ended with double quotes
  content = content.replace(/`http:\/\/\$\{window\.location\.hostname\}:5000([^"]*)"/g, '`http://${window.location.hostname}:5000$1`');

  if(original !== content) {
    fs.writeFileSync(filePath, content);
    console.log('Updated: ' + filePath);
  }
};

const searchAndReplace = (dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if(file !== 'node_modules' && file !== 'dist') searchAndReplace(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      replaceInFile(fullPath);
    }
  }
};

searchAndReplace('./admin/src');
searchAndReplace('./user/src');
searchAndReplace('./projector/src');
