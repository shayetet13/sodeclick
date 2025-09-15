# ระบบติดตามข้อความที่ยังไม่ได้อ่าน (Unread Messages System)

## ภาพรวม
ระบบนี้ช่วยติดตามจำนวนข้อความที่ยังไม่ได้อ่านในแชทส่วนตัว และจะรีเซ็ตจำนวนเมื่อผู้ใช้เข้าไปดูแชทนั้น

## คุณสมบัติหลัก

### 1. การติดตามข้อความที่ยังไม่ได้อ่าน
- ใช้ `readBy` array ใน Message model เพื่อติดตามว่าผู้ใช้ใดอ่านข้อความแล้ว
- คำนวณจำนวนข้อความที่ยังไม่ได้อ่านแบบ real-time
- รองรับทั้ง private chat และ ChatRoom ปกติ

### 2. การแสดงผลใน Frontend
- แสดงตัวเลขจำนวนข้อความที่ยังไม่ได้อ่านในรายการแชทส่วนตัว
- ตัวเลขจะหายไปเมื่อผู้ใช้เข้าไปดูแชท
- อัปเดตแบบ real-time เมื่อมีข้อความใหม่

### 3. Real-time Updates
- ใช้ Socket.IO เพื่อส่งข้อมูล unread count แบบ real-time
- อัปเดตทันทีเมื่อมีข้อความใหม่หรือเมื่อผู้ใช้เข้าแชท

## API Endpoints

### 1. ดึงจำนวนข้อความที่ยังไม่ได้อ่านทั้งหมด
```
GET /api/messages/unread-count/:userId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalUnreadCount": 5,
    "chatUnreadCounts": [
      {
        "chatRoom": "private_123_456",
        "unreadCount": 3,
        "lastMessage": {...}
      }
    ]
  }
}
```

### 2. ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแชทส่วนตัวเท่านั้น
```
GET /api/messages/private-chats-unread/:userId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalUnreadCount": 3,
    "chatUnreadCounts": [
      {
        "chatRoom": "private_123_456",
        "unreadCount": 2,
        "lastMessage": {...}
      }
    ]
  }
}
```

### 3. ทำเครื่องหมายข้อความว่าอ่านแล้ว
```
POST /api/messages/mark-as-read
```
**Request Body:**
```json
{
  "chatRoomId": "private_123_456",
  "userId": "123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Messages marked as read successfully",
  "data": {
    "modifiedCount": 5
  }
}
```

## Socket.IO Events

### 1. unread-count-update
ส่งข้อมูล unread count ที่อัปเดตแล้ว
```javascript
socket.on('unread-count-update', (data) => {
  console.log('Unread count update:', data);
  // data = { chatRoomId: "private_123_456", unreadCount: 3 }
});
```

### 2. join-room
เมื่อผู้ใช้เข้าร่วมห้องแชท จะได้รับข้อมูล unread count ปัจจุบัน
```javascript
socket.emit('join-room', { roomId: 'private_123_456', userId: '123' });
```

## Frontend Components

### 1. PrivateChatList
- แสดงรายการแชทส่วนตัวพร้อมจำนวนข้อความที่ยังไม่ได้อ่าน
- รีเซ็ตจำนวนเมื่อผู้ใช้คลิกเข้าแชท
- อัปเดตแบบ real-time เมื่อมีข้อความใหม่

### 2. PrivateChat
- จัดการการส่งและรับข้อความ
- ส่งข้อมูล unread count updates เมื่อมีข้อความใหม่
- รีเซ็ต unread count เมื่อผู้ใช้เข้าแชท

### 3. unreadAPI Service
- API service สำหรับจัดการ unread count
- ฟังก์ชันสำหรับดึงข้อมูล, ทำเครื่องหมายว่าอ่านแล้ว, และจัดการแชทส่วนตัว

## การใช้งาน

### 1. การแสดงจำนวนข้อความที่ยังไม่ได้อ่าน
```javascript
import unreadAPI from '../services/unreadAPI';

// ดึงข้อมูล unread count
const response = await unreadAPI.getPrivateChatUnreadCount(userId);
const unreadCounts = response.data.chatUnreadCounts;
```

### 2. การรีเซ็ตจำนวนเมื่อเข้าแชท
```javascript
// เมื่อผู้ใช้คลิกเข้าแชท
const handleSelectChat = async (chat) => {
  // รีเซ็ต unread count
  await unreadAPI.markAsRead(chat.roomId, currentUser._id);
  
  // อัปเดต UI
  setUnreadCounts(prev => ({
    ...prev,
    [chat.roomId]: 0
  }));
  
  // เปิดแชท
  onSelectChat(chat);
};
```

### 3. การจัดการ Real-time Updates
```javascript
useEffect(() => {
  const handleUnreadCountUpdate = (event) => {
    const { chatRoomId, unreadCount } = event.detail;
    setUnreadCounts(prev => ({
      ...prev,
      [chatRoomId]: unreadCount
    }));
  };

  window.addEventListener('unread-count-update', handleUnreadCountUpdate);
  
  return () => {
    window.removeEventListener('unread-count-update', handleUnreadCountUpdate);
  };
}, []);
```

## การทำงานของระบบ

1. **เมื่อมีข้อความใหม่:**
   - Server ส่งข้อความไปยังผู้ใช้ที่เกี่ยวข้อง
   - Server คำนวณ unread count ใหม่
   - Server ส่งข้อมูล unread count ไปยังผู้ใช้ผ่าน Socket.IO
   - Frontend อัปเดต UI แสดงจำนวนใหม่

2. **เมื่อผู้ใช้เข้าแชท:**
   - Frontend เรียก API mark-as-read
   - Server อัปเดต readBy array ในข้อความที่เกี่ยวข้อง
   - Frontend รีเซ็ตจำนวนเป็น 0 ทันที
   - UI อัปเดตไม่แสดงตัวเลขอีกต่อไป

3. **เมื่อผู้ใช้เข้าร่วมห้องแชท:**
   - Server คำนวณ unread count ปัจจุบัน
   - Server ส่งข้อมูล unread count ให้ผู้ใช้
   - Frontend แสดงจำนวนที่ถูกต้อง

## ข้อดีของระบบ

1. **ประสิทธิภาพ:** ใช้ readBy array แทนการสร้างตารางแยก
2. **Real-time:** อัปเดตทันทีเมื่อมีข้อความใหม่
3. **แม่นยำ:** คำนวณจำนวนที่ถูกต้องตามสถานะการอ่านจริง
4. **ใช้งานง่าย:** API และ Socket.IO events ที่เข้าใจง่าย
5. **ยืดหยุ่น:** รองรับทั้ง private chat และ ChatRoom ปกติ

## การทดสอบ

1. ส่งข้อความในแชทส่วนตัว
2. ตรวจสอบว่าตัวเลขแสดงในรายการแชท
3. คลิกเข้าแชท
4. ตรวจสอบว่าตัวเลขหายไป
5. ส่งข้อความใหม่จากอีกฝ่าย
6. ตรวจสอบว่าตัวเลขแสดงขึ้นมาใหม่
