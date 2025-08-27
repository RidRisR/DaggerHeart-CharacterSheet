const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const TARGET_SIZE_KB = 120;
const TARGET_SIZE_BYTES = TARGET_SIZE_KB * 1024;
const IMAGE_DIR = path.join(__dirname, '../public/image');

// Color for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x947b[36m',
  gray: '\x1b[90m'
};

async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

async function walkDir(dir, callback) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await walkDir(fullPath, callback);
    } else {
      await callback(fullPath);
    }
  }
}

function isWebP(file) {
  return /\.webp$/i.test(file);
}

async function optimizeImage(filePath) {
  const originalSize = await getFileSize(filePath);
  const relativePath = path.relative(IMAGE_DIR, filePath);
  
  // Skip if already under target size
  if (originalSize <= TARGET_SIZE_BYTES) {
    // Don't log for already optimized files to reduce output noise
    return { skipped: true, originalSize };
  }
  
  console.log(`${colors.yellow}Processing: ${relativePath} (${(originalSize / 1024).toFixed(1)}KB)${colors.reset}`);
  
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Start with dimensions
    let width = metadata.width;
    let height = metadata.height;
    let resultBuffer;
    let resultSize;
    
    // Binary search for optimal quality
    let minQuality = 10;
    let maxQuality = 90;
    let bestBuffer = null;
    let bestSize = Infinity;
    
    // First, try with original dimensions
    while (maxQuality - minQuality > 5) {
      const testQuality = Math.floor((minQuality + maxQuality) / 2);
      
      resultBuffer = await sharp(filePath)
        .webp({ 
          quality: testQuality,
          effort: 6, // Higher effort for better compression
          lossless: false,
          nearLossless: false,
          smartSubsample: true,
          reductionEffort: 6
        })
        .toBuffer();
      
      resultSize = resultBuffer.length;
      
      if (resultSize <= TARGET_SIZE_BYTES) {
        bestBuffer = resultBuffer;
        bestSize = resultSize;
        minQuality = testQuality;
      } else {
        maxQuality = testQuality;
      }
    }
    
    // If still too large, progressively reduce dimensions
    if (!bestBuffer || bestSize > TARGET_SIZE_BYTES) {
      const scales = [0.9, 0.8, 0.7, 0.6, 0.5];
      
      for (const scale of scales) {
        const newWidth = Math.floor(width * scale);
        const newHeight = Math.floor(height * scale);
        
        // Reset quality search for new dimensions
        minQuality = 20;
        maxQuality = 85;
        
        while (maxQuality - minQuality > 5) {
          const testQuality = Math.floor((minQuality + maxQuality) / 2);
          
          resultBuffer = await sharp(filePath)
            .resize(newWidth, newHeight, {
              fit: 'inside',
              withoutEnlargement: true,
              kernel: sharp.kernel.lanczos3
            })
            .webp({ 
              quality: testQuality,
              effort: 6,
              lossless: false,
              nearLossless: false,
              smartSubsample: true,
              reductionEffort: 6
            })
            .toBuffer();
          
          resultSize = resultBuffer.length;
          
          if (resultSize <= TARGET_SIZE_BYTES) {
            bestBuffer = resultBuffer;
            bestSize = resultSize;
            minQuality = testQuality;
          } else {
            maxQuality = testQuality;
          }
        }
        
        if (bestBuffer && bestSize <= TARGET_SIZE_BYTES) {
          console.log(`  ${colors.cyan}Resized to ${newWidth}x${newHeight} (${(scale * 100).toFixed(0)}%)${colors.reset}`);
          break;
        }
      }
    }
    
    // If we found a suitable compression, save it
    if (bestBuffer && bestSize <= TARGET_SIZE_BYTES) {
      // Write optimized image directly (no backup)
      await fs.writeFile(filePath, bestBuffer);
      
      const reduction = ((originalSize - bestSize) / originalSize * 100).toFixed(1);
      console.log(`  ${colors.green}✓ Optimized: ${(originalSize / 1024).toFixed(1)}KB → ${(bestSize / 1024).toFixed(1)}KB (-${reduction}%)${colors.reset}`);
      
      return {
        optimized: true,
        originalSize,
        newSize: bestSize,
        reduction
      };
    } else {
      // Last resort: aggressive compression
      resultBuffer = await sharp(filePath)
        .resize(Math.floor(width * 0.4), Math.floor(height * 0.4), {
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        })
        .webp({ 
          quality: 10,
          effort: 6,
          lossless: false,
          alphaQuality: 50
        })
        .toBuffer();
      
      // Write optimized image directly (no backup)
      await fs.writeFile(filePath, resultBuffer);
      resultSize = resultBuffer.length;
      
      console.log(`  ${colors.yellow}⚠ Aggressive compression applied (40% size, quality 10)${colors.reset}`);
      console.log(`  ${colors.green}✓ Reduced: ${(originalSize / 1024).toFixed(1)}KB → ${(resultSize / 1024).toFixed(1)}KB${colors.reset}`);
      
      return {
        optimized: true,
        aggressive: true,
        originalSize,
        newSize: resultSize
      };
    }
    
  } catch (error) {
    console.error(`  ${colors.red}✗ Failed to optimize: ${error.message}${colors.reset}`);
    return { error: true, originalSize };
  }
}

async function main() {
  console.log(`${colors.bright}Starting image optimization...${colors.reset}`);
  console.log(`Target size: ${TARGET_SIZE_KB}KB`);
  console.log(`Directory: ${IMAGE_DIR}\n`);
  
  const stats = {
    total: 0,
    skipped: 0,
    optimized: 0,
    aggressive: 0,
    failed: 0,
    totalOriginalSize: 0,
    totalNewSize: 0
  };
  
  // Collect all WebP files first
  const webpFiles = [];
  await walkDir(IMAGE_DIR, async (filePath) => {
    if (isWebP(filePath) && !filePath.endsWith('.backup')) {
      webpFiles.push(filePath);
    }
  });
  
  stats.total = webpFiles.length;
  
  // Quick check: count files that need optimization
  let needsOptimization = 0;
  for (const filePath of webpFiles) {
    const size = await getFileSize(filePath);
    if (size > TARGET_SIZE_BYTES) {
      needsOptimization++;
    }
  }
  
  console.log(`Found ${stats.total} WebP files`);
  console.log(`${colors.yellow}${needsOptimization} files need optimization (>${TARGET_SIZE_KB}KB)${colors.reset}`);
  console.log(`${colors.gray}${stats.total - needsOptimization} files already optimized (≤${TARGET_SIZE_KB}KB)${colors.reset}\n`);
  
  // Process files in batches for better performance
  const BATCH_SIZE = 5; // Process 5 files at a time
  for (let i = 0; i < webpFiles.length; i += BATCH_SIZE) {
    const batch = webpFiles.slice(i, Math.min(i + BATCH_SIZE, webpFiles.length));
    
    const results = await Promise.all(batch.map(filePath => optimizeImage(filePath)));
    
    results.forEach(result => {
      stats.totalOriginalSize += result.originalSize;
      
      if (result.skipped) {
        stats.skipped++;
        stats.totalNewSize += result.originalSize;
      } else if (result.error) {
        stats.failed++;
        stats.totalNewSize += result.originalSize;
      } else if (result.optimized) {
        stats.optimized++;
        stats.totalNewSize += result.newSize;
        if (result.aggressive) {
          stats.aggressive++;
        }
      }
    });
    
    // Show progress
    const processed = Math.min(i + BATCH_SIZE, webpFiles.length);
    if (processed % 20 === 0 || processed === webpFiles.length) {
      console.log(`${colors.gray}Progress: ${processed}/${webpFiles.length} files processed${colors.reset}`);
    }
  }
  
  // Print summary
  console.log(`\n${colors.bright}=== Optimization Summary ===${colors.reset}`);
  console.log(`Total files found: ${stats.total}`);
  console.log(`${colors.gray}○ Already under ${TARGET_SIZE_KB}KB (skipped): ${stats.skipped}${colors.reset}`);
  console.log(`${colors.green}✓ Successfully optimized: ${stats.optimized}${colors.reset}`);
  if (stats.aggressive > 0) {
    console.log(`${colors.yellow}⚠ Required aggressive compression: ${stats.aggressive}${colors.reset}`);
  }
  if (stats.failed > 0) {
    console.log(`${colors.red}✗ Failed: ${stats.failed}${colors.reset}`);
  }
  
  const totalReduction = stats.totalOriginalSize - stats.totalNewSize;
  const reductionPercent = (totalReduction / stats.totalOriginalSize * 100).toFixed(1);
  
  console.log(`\n${colors.bright}Storage saved:${colors.reset}`);
  console.log(`  Original total: ${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  New total: ${(stats.totalNewSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  ${colors.green}Saved: ${(totalReduction / 1024 / 1024).toFixed(2)}MB (${reductionPercent}%)${colors.reset}`);
}

main().catch(console.error);