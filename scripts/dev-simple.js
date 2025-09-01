#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to check if directory exists
function checkDirectory(dir) {
  return fs.existsSync(dir);
}

// Function to check if node_modules exists
function checkNodeModules(dir) {
  return fs.existsSync(path.join(dir, 'node_modules'));
}

// Function to run npm install in a directory
function runNpmInstall(dir) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Installing dependencies in ${path.basename(dir)}...`);
    const npm = spawn('npm', ['install'], { 
      cwd: dir, 
      stdio: 'inherit'
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Dependencies installed in ${path.basename(dir)}`);
        resolve();
      } else {
        reject(new Error(`Failed to install dependencies in ${path.basename(dir)}`));
      }
    });
  });
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');

    console.log('🔍 Checking project structure...');

    // Check if directories exist
    if (!checkDirectory(frontendDir)) {
      console.error('❌ Frontend directory not found');
      process.exit(1);
    }

    if (!checkDirectory(backendDir)) {
      console.error('❌ Backend directory not found');
      process.exit(1);
    }

    console.log('✅ Project structure verified');

    // Install dependencies if needed
    if (!checkNodeModules(frontendDir)) {
      await runNpmInstall(frontendDir);
    } else {
      console.log('✅ Frontend dependencies already installed');
    }

    if (!checkNodeModules(backendDir)) {
      await runNpmInstall(backendDir);
    } else {
      console.log('✅ Backend dependencies already installed');
    }

    // Use concurrently to run both servers
    console.log('🚀 Starting development servers with concurrently...');
    
    const concurrently = spawn('npx', ['concurrently', '--kill-others', '--prefix-colors', 'blue,green', '"npm run dev:frontend"', '"npm run dev:backend"'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping development servers...');
      concurrently.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping development servers...');
      concurrently.kill('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
