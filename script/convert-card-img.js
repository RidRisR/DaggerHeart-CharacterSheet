const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.join(__dirname, '../public');

function walkDir(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

function isImage(file) {
  return /\.(jpe?g|png)$/i.test(file);
}

walkDir(rootDir, file => {
  if (isImage(file)) {
    const webpPath = file.replace(/\.(jpe?g|png)$/i, '.webp');
    sharp(file)
      .webp({ quality: 80 })
      .toFile(webpPath)
      .then(() => {
        fs.unlinkSync(file);
        console.log(`Converted and deleted: ${file} -> ${webpPath}`);
      })
      .catch(err => {
        console.error(`Failed to convert ${file}:`, err);
      });
  }
});
