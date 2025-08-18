# ระบบคนออนไลน์ในแชท (Real-time Online Users System)

## 🎯 ฟีเจอร์ที่เพิ่ม

**ระบบติดตามสถานะคนออนไลน์ในแชทแบบ Real-time**

### ✅ ฟีเจอร์ที่ได้:
1. **Real-time Online Tracking** - ติดตามสถานะคนออนไลน์แบบ Real-time
2. **Socket.IO Integration** - ใช้ Socket.IO สำหรับการอัปเดตแบบ Real-time
3. **API Endpoint** - API สำหรับดึงข้อมูลคนออนไลน์
4. **Automatic Updates** - อัปเดตอัตโนมัติเมื่อคนเข้า/ออกจากห้อง
5. **Accurate Count** - นับจำนวนคนออนไลน์ที่แม่นยำ

## 🔧 การแก้ไขที่ทำ

### 1. Backend Server (server.js)

#### เพิ่มการจัดการสถานะออนไลน์:
```javascript
// เก็บข้อมูล socket ของผู้ใช้
const roomUsers = new Map(); // roomId -> Set of userIds
const userSockets = new Map(); // userId -> Set of socketIds
const onlineUsers = new Map(); // userId -> { socketId, roomId, lastSeen }
```

#### อัปเดต join-room event:
```javascript
// อัปเดตสถานะออนไลน์
onlineUsers.set(userId, {
  socketId: socket.id,
  roomId: roomId,
  lastSeen: new Date(),
  username: user.displayName || user.username
});

// ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
const onlineCount = roomUsers.get(roomId).size;
const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
  const onlineUser = onlineUsers.get(uid);
  return {
    userId: uid,
    username: onlineUser?.username || 'Unknown',
    lastSeen: onlineUser?.lastSeen
  };
});

io.to(roomId).emit('online-count-updated', {
  roomId,
  onlineCount,
  onlineUsers: roomOnlineUsers
});
```

#### อัปเดต disconnect event:
```javascript
// ลบจากรายการออนไลน์
onlineUsers.delete(userId);

// ส่งจำนวนคนออนไลน์ที่อัปเดต
const onlineCount = roomUsers.get(roomId).size;
const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
  const onlineUser = onlineUsers.get(uid);
  return {
    userId: uid,
    username: onlineUser?.username || 'Unknown',
    lastSeen: onlineUser?.lastSeen
  };
});

io.to(roomId).emit('online-count-updated', {
  roomId,
  onlineCount,
  onlineUsers: roomOnlineUsers
});
```

### 2. API Endpoint (chatroom.js)

#### เพิ่ม endpoint สำหรับดึงข้อมูลคนออนไลน์:
```javascript
// GET /api/chatroom/:roomId/online-users - ดึงข้อมูลคนออนไลน์
router.get('/:roomId/online-users', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ success: false, message: 'Chat room not found' });
    }

    // ตรวจสอบสิทธิ์
    if (!chatRoom.isMember(userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this chat room' });
    }

    // ดึงข้อมูลคนออนไลน์จาก Socket.IO server
    const io = req.app.get('io');
    const roomUsers = io.sockets.adapter.rooms.get(roomId);
    
    let onlineUsers = [];
    if (roomUsers) {
      const socketIds = Array.from(roomUsers);
      onlineUsers = socketIds.map(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        return {
          userId: socket.userId,
          socketId: socketId,
          lastSeen: new Date()
        };
      });
    }

    res.json({
      success: true,
      data: {
        roomId,
        onlineCount: onlineUsers.length,
        onlineUsers
      }
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
```

### 3. Frontend (RealTimeChat.jsx)

#### เพิ่มการโหลดข้อมูลคนออนไลน์:
```javascript
// โหลดข้อมูลคนออนไลน์
useEffect(() => {
  const fetchOnlineUsers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${roomId}/online-users?userId=${currentUser._id}`,
        {
          credentials: 'include'
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setOnlineUsers(data.data.onlineUsers);
        setOnlineCount(data.data.onlineCount);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
      // ถ้าไม่สามารถดึงข้อมูลได้ ให้เริ่มต้นด้วย 0
      setOnlineUsers([]);
      setOnlineCount(0);
    }
  };

  fetchOnlineUsers();
}, [roomId, currentUser._id]);
```

#### อัปเดต Socket.IO event handler:
```javascript
// Online count updates
newSocket.on('online-count-updated', (data) => {
  setOnlineCount(data.onlineCount);
  setOnlineUsers(data.onlineUsers || []);
});
```

#### แสดงจำนวนคนออนไลน์ใน header:
```javascript
<span className="text-sm">{onlineCount} ออนไลน์</span>
```

## 🎯 ผลลัพธ์

### ✅ หลังการแก้ไข:
- **Real-time Updates:** จำนวนคนออนไลน์อัปเดตแบบ Real-time
- **Accurate Count:** นับจำนวนคนออนไลน์ที่แม่นยำจาก Socket.IO
- **API Integration:** มี API endpoint สำหรับดึงข้อมูลคนออนไลน์
- **Error Handling:** จัดการกรณีที่ไม่สามารถดึงข้อมูลได้
- **Zero State:** แสดง 0 เมื่อไม่มีคนออนไลน์

### 🔧 การทำงาน:
1. **เมื่อเข้าร่วมห้อง:** อัปเดตสถานะออนไลน์และส่งข้อมูลไปยังทุกคนในห้อง
2. **เมื่อออกจากห้อง:** ลบจากรายการออนไลน์และอัปเดตจำนวน
3. **Real-time Updates:** ใช้ Socket.IO ส่งการอัปเดตแบบ Real-time
4. **API Fallback:** ใช้ API endpoint เป็น fallback สำหรับการโหลดข้อมูลเริ่มต้น
5. **Error Handling:** แสดง 0 เมื่อไม่สามารถดึงข้อมูลได้

## 📁 ไฟล์ที่แก้ไข

### Backend:
- `backend/server.js` - เพิ่มการจัดการสถานะออนไลน์และ Socket.IO events
- `backend/routes/chatroom.js` - เพิ่ม API endpoint สำหรับดึงข้อมูลคนออนไลน์

### Frontend:
- `frontend/src/components/RealTimeChat.jsx` - เพิ่มการโหลดและแสดงข้อมูลคนออนไลน์

## 🎉 สรุป

การแก้ไขนี้ทำให้:
- ระบบคนออนไลน์ทำงานแบบ Real-time
- จำนวนคนออนไลน์แม่นยำและอัปเดตทันที
- มี API endpoint สำหรับดึงข้อมูลคนออนไลน์
- จัดการกรณี error และแสดง 0 เมื่อไม่มีคนออนไลน์
- ระบบทำงานแบบ Real-time โดยไม่ต้องใช้ mock data

---

**🎉 ระบบคนออนไลน์เสร็จสมบูรณ์แล้ว!**
