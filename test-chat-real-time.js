/**
 * 🧪 สคริปต์ทดสอบการแชทแบบเรียลไทม์
 * 
 * วิธีใช้:
 * 1. เปิด 2 browser tabs
 * 2. เข้าห้องแชทเดียวกันในทั้ง 2 tabs
 * 3. เปิด Console (F12) ใน Tab 1
 * 4. วาง script นี้และ run
 * 5. สังเกต logs ใน Console ของทั้ง 2 tabs
 */

(async function testRealtimeChat() {
  console.clear();
  console.log('🧪 ========================================');
  console.log('🧪 เริ่มทดสอบการแชทแบบเรียลไทม์');
  console.log('🧪 ========================================\n');

  // 1. ตรวจสอบ Socket Manager
  console.log('📋 ขั้นตอนที่ 1: ตรวจสอบ Socket Manager');
  console.log('----------------------------------------');
  
  if (!window.socketManager) {
    console.error('❌ ไม่พบ window.socketManager');
    return;
  }
  console.log('✅ พบ window.socketManager');
  
  const socket = window.socketManager.socket;
  if (!socket) {
    console.error('❌ ไม่พบ socket instance');
    return;
  }
  console.log('✅ พบ socket instance');
  
  console.log('\n📊 ข้อมูล Socket:');
  console.log('  - Socket ID:', socket.id);
  console.log('  - Connected:', socket.connected);
  console.log('  - Transport:', socket.io.engine.transport.name);
  
  if (!socket.connected) {
    console.error('❌ Socket ไม่ได้เชื่อมต่อ กรุณารอสักครู่แล้วลองใหม่');
    return;
  }

  // 2. ตรวจสอบ Event Listeners
  console.log('\n📋 ขั้นตอนที่ 2: ตรวจสอบ Event Listeners');
  console.log('----------------------------------------');
  
  const callbacks = socket._callbacks || {};
  const events = Object.keys(callbacks).map(key => key.replace('$', ''));
  
  console.log('📝 Event Listeners ที่มีอยู่:');
  events.forEach(event => {
    const count = callbacks[`$${event}`]?.length || 0;
    console.log(`  - ${event}: ${count} listener(s)`);
  });
  
  const requiredEvents = ['connect', 'disconnect', 'new-message', 'error'];
  const missingEvents = requiredEvents.filter(event => !events.includes(event));
  
  if (missingEvents.length > 0) {
    console.warn('⚠️ ขาด Event Listeners:', missingEvents.join(', '));
  } else {
    console.log('✅ มี Event Listeners ครบถ้วน');
  }

  // 3. ตรวจสอบว่าอยู่ใน room ไหน
  console.log('\n📋 ขั้นตอนที่ 3: ตรวจสอบ Room');
  console.log('----------------------------------------');
  
  const currentRoom = socket.currentRoom;
  if (!currentRoom) {
    console.warn('⚠️ ไม่พบข้อมูล currentRoom ใน socket');
    console.log('💡 กรุณาตรวจสอบว่าคุณอยู่ในหน้าแชทหรือไม่');
  } else {
    console.log('📍 กำลังอยู่ใน room:', currentRoom);
  }

  // 4. ทดสอบการส่งข้อความ
  console.log('\n📋 ขั้นตอนที่ 4: ทดสอบการส่งข้อความ');
  console.log('----------------------------------------');
  
  // เตรียม listener สำหรับรับข้อความ
  let testMessageReceived = false;
  const testMessageContent = `Test message at ${new Date().toLocaleTimeString()}`;
  
  const newMessageListener = (message) => {
    console.log('📨 [TEST] Received new-message event');
    console.log('📨 [TEST] Message:', message);
    
    if (message.content === testMessageContent) {
      testMessageReceived = true;
      console.log('✅ [TEST] ได้รับข้อความทดสอบสำเร็จ!');
    }
  };
  
  // เพิ่ม listener ชั่วคราว
  socket.on('new-message', newMessageListener);
  
  console.log('📤 กำลังส่งข้อความทดสอบ...');
  console.log('📝 เนื้อหา:', testMessageContent);
  
  // ดึง userId จาก sessionStorage
  const userStr = sessionStorage.getItem('user');
  if (!userStr) {
    console.error('❌ ไม่พบข้อมูลผู้ใช้ใน sessionStorage');
    socket.off('new-message', newMessageListener);
    return;
  }
  
  const user = JSON.parse(userStr);
  const userId = user._id || user.id;
  
  // ส่งข้อความ
  socket.emit('send-message', {
    content: testMessageContent,
    senderId: userId,
    chatRoomId: currentRoom || window.location.pathname.split('/').pop(),
    messageType: 'text'
  });
  
  console.log('✅ ส่งข้อความแล้ว รอรับ response...');
  
  // รอ 5 วินาที แล้วตรวจสอบผล
  setTimeout(() => {
    console.log('\n📋 ผลการทดสอบ:');
    console.log('========================================');
    
    if (testMessageReceived) {
      console.log('✅ ✅ ✅ ทดสอบสำเร็จ! ระบบแชทเรียลไทม์ทำงานได้ดี');
    } else {
      console.log('❌ ❌ ❌ ทดสอบล้มเหลว! ไม่ได้รับข้อความกลับมา');
      console.log('\n🔍 ตรวจสอบ:');
      console.log('  1. เปิด Tab อื่นในห้องเดียวกันแล้วหรือยัง?');
      console.log('  2. Backend server ทำงานอยู่หรือไม่?');
      console.log('  3. ดู Console ของ Backend มี error หรือไม่?');
      console.log('  4. ลองดู Network tab ว่า WebSocket เชื่อมต่อหรือไม่?');
    }
    
    // ลบ listener
    socket.off('new-message', newMessageListener);
    
    console.log('\n🧪 ========================================');
    console.log('🧪 จบการทดสอบ');
    console.log('🧪 ========================================');
  }, 5000);
  
})();

