const fetch = require('node-fetch');

async function testOnlineStatus() {
  try {
    console.log('🔍 ทดสอบสถานะออนไลน์ผ่าน API...\n');

    // ทดสอบ API endpoint
    const response = await fetch('http://localhost:5000/api/matching/ai-matches?page=1&limit=10&maxDistance=40&minAge=18&maxAge=60', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // ต้องใส่ token จริง
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data && data.data.matches) {
        const matches = data.data.matches;
        console.log(`\n📊 จำนวนผู้ใช้ที่ได้รับ: ${matches.length}`);
        
        const onlineUsers = matches.filter(user => user.isOnline);
        console.log(`🟢 จำนวนผู้ใช้ออนไลน์: ${onlineUsers.length}`);
        
        console.log('\n👥 รายละเอียดผู้ใช้:');
        matches.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name || user.displayName || 'ไม่ระบุชื่อ'}`);
          console.log(`   - isOnline: ${user.isOnline}`);
          console.log(`   - email: ${user.email || 'ไม่ระบุ'}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

// รันการทดสอบ
testOnlineStatus();
