const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const rootDir = path.join(__dirname, '../public/convert');
const TARGET_SIZE_KB = 120;
const TARGET_SIZE_BYTES = TARGET_SIZE_KB * 1024;

// Color for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

async function walkDir(dir, callback) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walkDir(fullPath, callback);
      } else {
        await callback(fullPath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
}

function isImage(file) {
  return /\.(jpe?g|png)$/i.test(file);
}

async function convertImage(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  const webpPath = filePath.replace(/\.(jpe?g|png)$/i, '.webp');
  
  console.log(`${colors.yellow}Converting: ${relativePath}${colors.reset}`);
  
  try {
    // Start with high quality (90)
    let quality = 90;
    let resultBuffer;
    let resultSize;
    
    // Try with high quality first
    resultBuffer = await sharp(filePath)
      .webp({ 
        quality: quality,
        effort: 6, // Higher effort for better compression
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        reductionEffort: 6
      })
      .toBuffer();
    
    resultSize = resultBuffer.length;
    
    // If file is too large, use binary search to find optimal quality
    if (resultSize > TARGET_SIZE_BYTES) {
      console.log(`  ${colors.cyan}File size ${(resultSize / 1024).toFixed(1)}KB > ${TARGET_SIZE_KB}KB, optimizing...${colors.reset}`);
      
      let minQuality = 10;
      let maxQuality = 90;
      let bestBuffer = null;
      let bestSize = Infinity;
      
      while (maxQuality - minQuality > 5) {
        const testQuality = Math.floor((minQuality + maxQuality) / 2);
        
        const testBuffer = await sharp(filePath)
          .webp({ 
            quality: testQuality,
            effort: 6,
            lossless: false,
            nearLossless: false,
            smartSubsample: true,
            reductionEffort: 6
          })
          .toBuffer();
        
        const testSize = testBuffer.length;
        
        if (testSize <= TARGET_SIZE_BYTES) {
          bestBuffer = testBuffer;
          bestSize = testSize;
          minQuality = testQuality;
        } else {
          maxQuality = testQuality;
        }
      }
      
      if (bestBuffer) {
        resultBuffer = bestBuffer;
        resultSize = bestSize;
        quality = minQuality;
      }
    }
    
    // Write the optimized file
    await fs.writeFile(webpPath, resultBuffer);
    
    // Delete original file
    await fs.unlink(filePath);
    
    const sizeText = resultSize > TARGET_SIZE_BYTES 
      ? `${colors.yellow}${(resultSize / 1024).toFixed(1)}KB (>${TARGET_SIZE_KB}KB)${colors.reset}`
      : `${colors.green}${(resultSize / 1024).toFixed(1)}KB${colors.reset}`;
    
    console.log(`  ${colors.green}✓ Converted: ${path.basename(filePath)} → ${path.basename(webpPath)} (${sizeText}, Q${quality})${colors.reset}`);
    
    return {
      success: true,
      originalPath: filePath,
      webpPath: webpPath,
      size: resultSize,
      quality: quality
    };
    
  } catch (error) {
    console.error(`  ${colors.red}✗ Failed to convert ${relativePath}: ${error.message}${colors.reset}`);
    return {
      success: false,
      originalPath: filePath,
      error: error.message
    };
  }
}

async function main() {
  console.log(`${colors.bright}Starting image conversion...${colors.reset}`);
  console.log(`Source directory: ${rootDir}`);
  console.log(`Target size: ${TARGET_SIZE_KB}KB\n`);
  
  const stats = {
    total: 0,
    converted: 0,
    failed: 0,
    totalSize: 0,
    oversized: 0
  };
  
  // Collect all image files first
  const imageFiles = [];
  await walkDir(rootDir, async (filePath) => {
    if (isImage(filePath)) {
      imageFiles.push(filePath);
    }
  });
  
  stats.total = imageFiles.length;
  
  if (stats.total === 0) {
    console.log(`${colors.gray}No image files found in ${rootDir}${colors.reset}`);
    return;
  }
  
  console.log(`Found ${stats.total} image files to convert\n`);
  
  // Convert files one by one
  for (const filePath of imageFiles) {
    const result = await convertImage(filePath);
    
    if (result.success) {
      stats.converted++;
      stats.totalSize += result.size;
      if (result.size > TARGET_SIZE_BYTES) {
        stats.oversized++;
      }
    } else {
      stats.failed++;
    }
  }
  
  // Print summary
  console.log(`\n${colors.bright}=== Conversion Summary ===${colors.reset}`);
  console.log(`Total files processed: ${stats.total}`);
  console.log(`${colors.green}✓ Successfully converted: ${stats.converted}${colors.reset}`);
  if (stats.failed > 0) {
    console.log(`${colors.red}✗ Failed: ${stats.failed}${colors.reset}`);
  }
  if (stats.oversized > 0) {
    console.log(`${colors.yellow}⚠ Files > ${TARGET_SIZE_KB}KB: ${stats.oversized}${colors.reset}`);
  }
  
  if (stats.converted > 0) {
    console.log(`\n${colors.bright}Total converted size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB${colors.reset}`);
    console.log(`${colors.gray}Average size per file: ${(stats.totalSize / stats.converted / 1024).toFixed(1)}KB${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}Next step: Move converted WebP files to public/image/ directory${colors.reset}`);
}

main().catch(console.error);
