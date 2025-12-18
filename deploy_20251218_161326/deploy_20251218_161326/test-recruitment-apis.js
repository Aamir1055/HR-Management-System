// Test script to verify recruitment master APIs are working
const fetch = require('node-fetch');

async function testAPIs() {
  const baseUrl = 'http://localhost:5000/api';
  
  const endpoints = [
    '/recruitment-sources',
    '/recruitment-pipelines', 
    '/recruitment-platforms'
  ];
  
  console.log('🧪 Testing Recruitment Master APIs...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Testing: ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${endpoint}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Records: ${data.sources?.length || data.pipelines?.length || data.platforms?.length || 0}`);
      } else {
        console.log(`❌ FAILED: ${endpoint}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${await response.text()}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${endpoint}`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
}

testAPIs();