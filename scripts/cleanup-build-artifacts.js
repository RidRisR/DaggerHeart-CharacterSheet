#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '../out')

if (!fs.existsSync(outDir)) {
  process.exit(0)
}

let removed = 0

for (const fileName of fs.readdirSync(outDir)) {
  if (!fileName.endsWith('.txt') || fileName === 'robots.txt') {
    continue
  }

  fs.unlinkSync(path.join(outDir, fileName))
  removed += 1
}

if (removed > 0) {
  console.log(`Removed ${removed} generated text artifact${removed === 1 ? '' : 's'}.`)
}
