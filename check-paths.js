import fs from 'fs';
import path from 'path';

// Log the SDK directory structure
const sdkRoot = path.resolve('./node_modules/@modelcontextprotocol/sdk');
console.log('SDK package exists:', fs.existsSync(sdkRoot));
console.log('CJS directory exists:', fs.existsSync(path.join(sdkRoot, 'dist/cjs')));

// Try a more direct approach using a relative path without require
console.log('File paths:');
try {
  fs.readdirSync(path.join(sdkRoot, 'dist/cjs')).forEach(file => {
    console.log(`- ${file}`);
  });
} catch (err) {
  console.error('Error reading directory:', err);
}

const clientDir = path.join(sdkRoot, 'dist/cjs/client');
console.log('Client directory exists:', fs.existsSync(clientDir));
try {
  fs.readdirSync(clientDir).forEach(file => {
    console.log(`- ${file}`);
  });
} catch (err) {
  console.error('Error reading client directory:', err);
}
