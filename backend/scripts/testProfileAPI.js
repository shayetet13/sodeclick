const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000';
const USER_ID = '689899c4f3150706632b8020';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTg5OWM0ZjMxNTA3MDY2MzJiODAyMCIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc1NDgzMjE0MywiZXhwIjoxNzU1NDM2OTQzfQ.zivCWOriUfC2oJWL1qonru_X2qjItUXu63nMCEuFKig';

async function testProfileAPI() {
  console.log('🧪 Testing Profile API...\n');

  try {
    // ทดสอบ GET /api/profile/:userId
    console.log('📡 Testing GET /api/profile/:userId');
    const url = `${API_BASE_URL}/api/profile/${USER_ID}`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }

  console.log('\n🔗 Manual Test URLs:');
  console.log(`GET ${API_BASE_URL}/api/profile/${USER_ID}`);
  console.log('Headers: Authorization: Bearer ' + TOKEN);
  console.log('\n🌐 Browser Test:');
  console.log('1. Open browser developer tools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Run this command:');
  console.log(`
fetch('${API_BASE_URL}/api/profile/${USER_ID}', {
  headers: {
    'Authorization': 'Bearer ${TOKEN}',
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
  `);
}

// รัน test
testProfileAPI();
