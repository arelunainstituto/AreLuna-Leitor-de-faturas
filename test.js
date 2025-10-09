const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:8000';
const TEST_TIMEOUT = 5000;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test functions
async function testHealthEndpoint() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200 && result.status === 'OK') {
            log('✅ Health endpoint test passed', 'green');
            resolve(true);
          } else {
            log('❌ Health endpoint test failed', 'red');
            resolve(false);
          }
        } catch (error) {
          log('❌ Health endpoint test failed - Invalid JSON', 'red');
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      log('❌ Health endpoint test failed - Connection error', 'red');
      resolve(false);
    });

    req.setTimeout(TEST_TIMEOUT, () => {
      log('❌ Health endpoint test failed - Timeout', 'red');
      req.destroy();
      resolve(false);
    });
  });
}

async function testServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      if (res.statusCode === 200) {
        log('✅ Server is running and accessible', 'green');
        resolve(true);
      } else {
        log(`❌ Server returned status code: ${res.statusCode}`, 'red');
        resolve(false);
      }
    });

    req.on('error', () => {
      log('❌ Server is not running or not accessible', 'red');
      resolve(false);
    });

    req.setTimeout(TEST_TIMEOUT, () => {
      log('❌ Server test failed - Timeout', 'red');
      req.destroy();
      resolve(false);
    });
  });
}

async function testFileStructure() {
  const requiredFiles = [
    'server.js',
    'package.json',
    'public/index.html',
    'README.md'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file} exists`, 'green');
    } else {
      log(`❌ ${file} is missing`, 'red');
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

async function runTests() {
  log('🧪 Starting QR Code Reader Service Tests', 'blue');
  log('=' .repeat(50), 'blue');

  const results = [];

  // Test 1: File structure
  log('\n📁 Testing file structure...', 'yellow');
  results.push(await testFileStructure());

  // Test 2: Server running
  log('\n🚀 Testing server accessibility...', 'yellow');
  results.push(await testServerRunning());

  // Test 3: Health endpoint
  log('\n❤️  Testing health endpoint...', 'yellow');
  results.push(await testHealthEndpoint());

  // Summary
  log('\n' + '=' .repeat(50), 'blue');
  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    log(`🎉 All tests passed! (${passed}/${total})`, 'green');
    log('\n✨ Your QR Code Reader Service is ready to use!', 'green');
    log(`🌐 Access it at: ${BASE_URL}`, 'blue');
  } else {
    log(`⚠️  Some tests failed (${passed}/${total})`, 'yellow');
    log('\n💡 Make sure to:', 'yellow');
    log('   1. Run "npm install" to install dependencies', 'yellow');
    log('   2. Run "npm start" to start the server', 'yellow');
    log('   3. Check that port 8000 is available', 'yellow');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log(`❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});