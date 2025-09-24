# การแก้ไขระบบแจ้งเตือนแชทส่วนตัว

## ปัญหาที่พบ
- การแจ้งเตือนข้อความส่วนตัวใช้ `showWebappNotification` (alert) แทนที่จะแสดงในกระดิ่งแจ้งเตือน
- ไม่มีการแสดงชื่อและรูปโปรไฟล์ของคนส่งข้อความในแจ้งเตือน

## การแก้ไขที่ทำ

### 1. Frontend - App.tsx

#### แก้ไขการแจ้งเตือนใน `handleNewPrivateChat`:
```javascript
// ส่งแจ้งเตือนไปยังกระดิ่งแทนการใช้ alert
console.log('🔔 Adding private message notification to bell:', {
  senderName: sender.displayName,
  senderId: sender._id,
  senderProfileImage: sender.profileImages?.[sender.mainProfileImageIndex || 0],
  messageContent: message.content || message.text || ''
});

// เพิ่มแจ้งเตือนใหม่ในรายการ
const newNotification = {
  _id: `msg_${message._id}`,
  type: 'private_message',
  title: 'ข้อความใหม่',
  message: `${sender.displayName || sender.firstName || sender.username || 'Unknown User'} ส่งข้อความมา`,
  data: {
    senderId: sender._id,
    senderName: sender.displayName || sender.firstName || sender.username || 'Unknown User',
    senderProfileImage: sender.profileImages && sender.profileImages.length > 0 ? 
      (sender.mainProfileImageIndex !== undefined ? 
        sender.profileImages[sender.mainProfileImageIndex] : 
        sender.profileImages[0]) : null,
    messageId: message._id,
    chatRoom: chatRoomId,
    messageContent: message.content || message.text || ''
  },
  createdAt: new Date(),
  isRead: false
};

setNotifications(prev => [newNotification, ...prev]);
setUnreadCount(prev => prev + 1);
```

#### เพิ่ม Socket.IO event listener สำหรับ `new-private-message`:
```javascript
// ฟัง event สำหรับข้อความแชทส่วนตัวใหม่
socket.on('new-private-message', (data) => {
  console.log('📨 Received new-private-message event:', data);
  const { message, sender, chatRoomId } = data;
  
  // ตรวจสอบว่าเป็นผู้รับหรือไม่
  if (message.sender && message.sender._id !== user?._id) {
    console.log('🔔 Adding private message notification from Socket.IO');
    
    // เพิ่มแจ้งเตือนใหม่ในรายการ
    const newNotification = {
      _id: `msg_${message._id}`,
      type: 'private_message',
      title: 'ข้อความใหม่',
      message: `${sender.displayName || sender.firstName || sender.username || 'Unknown User'} ส่งข้อความมา`,
      data: {
        senderId: sender._id,
        senderName: sender.displayName || sender.firstName || sender.username || 'Unknown User',
        senderProfileImage: sender.profileImages && sender.profileImages.length > 0 ? 
          (sender.mainProfileImageIndex !== undefined ? 
            sender.profileImages[sender.mainProfileImageIndex] : 
            sender.profileImages[0]) : null,
        messageId: message._id,
        chatRoom: chatRoomId,
        messageContent: message.content || message.text || ''
      },
      createdAt: new Date(),
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }
});
```

#### เพิ่ม custom event listener:
```javascript
// ฟัง custom event สำหรับข้อความแชทส่วนตัวใหม่
const handlePrivateMessageEvent = (event: any) => {
  console.log('📨 Received private-chat-message event:', event.detail);
  const { message, sender, chatRoomId } = event.detail;
  
  // ตรวจสอบว่าเป็นผู้รับหรือไม่
  if (message.sender && message.sender._id !== user?._id) {
    console.log('🔔 Adding private message notification from custom event');
    
    // เพิ่มแจ้งเตือนใหม่ในรายการ
    const newNotification = {
      _id: `msg_${message._id}`,
      type: 'private_message',
      title: 'ข้อความใหม่',
      message: `${sender.displayName || sender.firstName || sender.username || 'Unknown User'} ส่งข้อความมา`,
      data: {
        senderId: sender._id,
        senderName: sender.displayName || sender.firstName || sender.username || 'Unknown User',
        senderProfileImage: sender.profileImages && sender.profileImages.length > 0 ? 
          (sender.mainProfileImageIndex !== undefined ? 
            sender.profileImages[sender.mainProfileImageIndex] : 
            sender.profileImages[0]) : null,
        messageId: message._id,
        chatRoom: chatRoomId,
        messageContent: message.content || message.text || ''
      },
      createdAt: new Date(),
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }
};

window.addEventListener('private-chat-message', handlePrivateMessageEvent as EventListener);
```

### 2. Backend - server.js

#### เพิ่มการส่ง event `new-private-message`:
```javascript
// ส่งแจ้งเตือนข้อความส่วนตัวไปยังผู้รับ (ไม่ใช่ผู้ส่ง)
const recipientId = senderId === userId1 ? userId2 : userId1;
const sender = await User.findById(senderId).select('username displayName firstName lastName profileImages mainProfileImageIndex');

if (sender && recipientId) {
  console.log('🔔 Sending private message notification to recipient:', recipientId);
  io.to(`user_${recipientId}`).emit('new-private-message', {
    message: message,
    sender: sender,
    chatRoomId: chatRoomId
  });
}
```

## ฟีเจอร์ที่เพิ่มขึ้น

### 1. แจ้งเตือนในกระดิ่ง
- ✅ แจ้งเตือนข้อความส่วนตัวแสดงในกระดิ่งแจ้งเตือนแทนการใช้ alert
- ✅ แสดงจำนวนข้อความที่ยังไม่ได้อ่านบนกระดิ่ง

### 2. ข้อมูลผู้ส่ง
- ✅ แสดงชื่อผู้ส่งข้อความ (displayName, firstName, หรือ username)
- ✅ แสดงรูปโปรไฟล์ของผู้ส่งข้อความ
- ✅ แสดงเนื้อหาข้อความในแจ้งเตือน

### 3. การโต้ตอบ
- ✅ คลิกที่แจ้งเตือนเพื่อไปยังแชทส่วนตัว
- ✅ แจ้งเตือนจะหายไปเมื่อคลิกแล้ว
- ✅ รีเฟรชรายการแชทส่วนตัวเมื่อได้รับข้อความใหม่

### 4. Real-time Updates
- ✅ ใช้ Socket.IO สำหรับการส่งแจ้งเตือนแบบ real-time
- ✅ รองรับทั้ง custom events และ Socket.IO events
- ✅ ทำงานได้ทั้งใน development และ production

## การทดสอบ

1. **เปิดแชทส่วนตัวใน 2 หน้าต่าง/แท็บ**
2. **ส่งข้อความจากหน้าต่างแรก**
3. **ตรวจสอบว่าแจ้งเตือนปรากฏในกระดิ่งของหน้าต่างที่สอง**
4. **ตรวจสอบว่าแจ้งเตือนแสดงชื่อและรูปโปรไฟล์ของผู้ส่ง**
5. **คลิกที่แจ้งเตือนเพื่อไปยังแชทส่วนตัว**

## หมายเหตุ

- ระบบแจ้งเตือนใช้ข้อมูลจากฐานข้อมูลและ Socket.IO
- แจ้งเตือนจะแสดงในกระดิ่งแทนการใช้ alert popup
- รองรับการแสดงชื่อและรูปโปรไฟล์ของผู้ส่งข้อความ
- ทำงานแบบ real-time โดยไม่ต้อง refresh หน้าเว็บ
