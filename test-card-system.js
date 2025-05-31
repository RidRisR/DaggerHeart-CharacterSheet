#!/usr/bin/env node

/**
 * Quick test script to verify the card system is working
 * Run with: node test-card-system.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Card System...\n');

// Test JSON files exist
const jsonDir = path.join(__dirname, 'public/card-data');
const jsonFiles = [
  'metadata.json',
  'profession-cards.json',
  'ancestry-cards.json', 
  'community-cards.json',
  'domain-cards.json',
  'subclass-cards.json'
];

console.log('📁 Checking JSON files:');
let totalCards = 0;

jsonFiles.forEach(file => {
  const filePath = path.join(jsonDir, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let count;
    
    if (file === 'metadata.json') {
      count = data.totalCards || 'metadata';
      console.log(`  ✅ ${file}: ${count} total cards in metadata`);
    } else {
      count = data.cards ? data.cards.length : 0;
      console.log(`  ✅ ${file}: ${count} cards`);
      totalCards += count;
    }
  } else {
    console.log(`  ❌ ${file}: NOT FOUND`);
  }
});

console.log(`\n📊 Total cards: ${totalCards}`);

// Test TypeScript compilation
console.log('\n🔨 Testing TypeScript compilation:');
const { execSync } = require('child_process');

try {
  execSync('npx tsc --noEmit --project .', { cwd: __dirname, stdio: 'pipe' });
  console.log('  ✅ TypeScript compilation successful');
} catch (error) {
  console.log('  ❌ TypeScript compilation failed');
  console.log('  Error:', error.stdout.toString());
}

console.log('\n✨ Card system test complete!');
