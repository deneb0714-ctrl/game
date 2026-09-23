const fs = require('fs');
const path = require('path');

const gaId = process.env.NEXT_PUBLIC_GA_ID;

if (!gaId) {
  console.log('NEXT_PUBLIC_GA_ID is not set. Skipping injection.');
  process.exit(0);
}

// target files that need injection
const targetFiles = [
  path.join(__dirname, 'game', 'hello-world', 'index.html'),
];

targetFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/__NEXT_PUBLIC_GA_ID__/g, gaId);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Injected GA_ID into ${file}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
});
