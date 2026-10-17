const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../node_modules/monaco-editor/min/vs');
const destDir = path.resolve(__dirname, '../public/monaco/vs');

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-monaco] monaco-editor package not found in node_modules, skipping.');
  process.exit(0);
}

// Check if destination already exists with loader.js
const loaderFile = path.join(destDir, 'loader.js');
if (fs.existsSync(loaderFile)) {
  console.log('[copy-monaco] Monaco assets already present in public/monaco/vs.');
  process.exit(0);
}

try {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('[copy-monaco] Successfully copied Monaco editor assets to public/monaco/vs.');
} catch (err) {
  console.error('[copy-monaco] Error copying Monaco assets:', err);
  process.exit(1);
}
