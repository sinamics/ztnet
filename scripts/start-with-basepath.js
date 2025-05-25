// scripts/start-with-basepath.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_PATH = process.env.BASE_PATH || '';
console.log(`Starting ZTNet with base path: ${BASE_PATH}`);

// Set working directory to project root
process.chdir(path.join(__dirname, '..'));

function replaceInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Replace /__PATH_PREFIX__ with the base path (avoiding double slashes)
    const newContent = content.replace(/\/__PATH_PREFIX__/g, BASE_PATH);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    // Ignore files that can't be read/written
  }
}

function replaceInDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  fs.readdirSync(dir, { withFileTypes: true }).forEach(file => {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      replaceInDirectory(fullPath);
    } else if (['.html', '.js', '.css', '.json'].includes(path.extname(file.name))) {
      replaceInFile(fullPath);
    }
  });
}

// Replace placeholders if base path is set
if (BASE_PATH && fs.existsSync('.next')) {
  console.log(`Replacing /__PATH_PREFIX__ with ${BASE_PATH}...`);
  replaceInDirectory('.next');
  console.log('Replacement complete!');
} else if (!BASE_PATH) {
  console.log('No base path specified - running at root');
}

// Start the Next.js server
console.log('Starting Next.js server...');
const serverProcess = spawn('node', ['.next/standalone/server.js'], { 
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH, NEXTAUTH_URL: process.env.NEXTAUTH_URL }
});

serverProcess.on('close', process.exit);