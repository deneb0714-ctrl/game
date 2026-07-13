const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const destDir = path.join(__dirname, 'assets', 'images');

const filesToConvert = [
  'title_bg.js',
  'title_1x_hello_world.js',
  'title_1x_baria.js',
  'game_over_img.js',
  'title_1x_back.js',
  'title_1x_number.js',
  'title_bg_glitch.js',
  'hero_stand_blink.js'
];

for (const file of filesToConvert) {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skip ${file} (not found)`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  // Match "data:image/png;base64,....."
  const match = content.match(/data:image\/[^;]+;base64,([^"']+)/);
  if (match && match[1]) {
    const base64Data = match[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const outName = file.replace('.js', '.png');
    const outPath = path.join(destDir, outName);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${outName}`);
  } else {
    console.log(`No base64 found in ${file}`);
  }
}
