# Chat Like Toggle Feature - ข้อ 5

## 🎯 ฟีเจอร์ที่เพิ่ม

**ข้อ 5: like สามารถกดได้แค่ 1 ครั้ง ต่อ 1 user นั้นๆ หากกดอีกที่คือ ยกเลิก**

### ✅ ฟีเจอร์ที่ได้:
1. **Like Toggle** - กดครั้งแรกเพื่อ like, กดครั้งที่สองเพื่อยกเลิก
2. **Visual Feedback** - แสดงสถานะ like ด้วยสีแดงและไอคอนเต็ม
3. **Like Count** - แสดงจำนวน like ในวงเล็บ
4. **Dynamic Text** - เปลี่ยนจาก "Like" เป็น "Liked" เมื่อกดแล้ว
5. **Tooltip** - แสดงคำอธิบายที่เหมาะสม

## 🔧 การแก้ไขที่ทำ

### 1. เพิ่มฟังก์ชันตรวจสอบสถานะ Like

**ไฟล์:** `frontend/src/components/RealTimeChat.jsx`

```javascript
// ฟังก์ชันตรวจสอบว่าผู้ใช้เคยกด like แล้วหรือไม่
const hasUserLiked = (message) => {
  if (!message.reactions) return false;
  return message.reactions.some(
    reaction => reaction.user === currentUser._id && reaction.type === 'heart'
  );
};

// ฟังก์ชันนับจำนวน like
const getLikeCount = (message) => {
  if (!message.reactions) return 0;
  return message.reactions.filter(reaction => reaction.type === 'heart').length;
};
```

### 2. ปรับปรุงปุ่ม Like

```jsx
{/* Like Button */}
<button
  onClick={() => handleReactToMessage(message._id, 'heart')}
  className={`flex items-center space-x-1 text-xs transition-colors ${
    hasUserLiked(message) 
      ? 'text-red-500 hover:text-red-600' 
      : 'text-black hover:text-gray-600'
  }`}
  title={hasUserLiked(message) ? 'ยกเลิกไลค์' : 'กดไลค์'}
>
  <Heart className={`h-4 w-4 ${hasUserLiked(message) ? 'fill-current' : ''}`} />
  <span>{hasUserLiked(message) ? 'Liked' : 'Like'}</span>
  {getLikeCount(message) > 0 && (
    <span className="text-xs text-gray-500">({getLikeCount(message)})</span>
  )}
</button>
```

### 3. ฟังก์ชัน handleReactToMessage ที่มีอยู่แล้ว

```javascript
const handleReactToMessage = (messageId, reactionType = 'heart') => {
  if (!socket) return;

  // ตรวจสอบว่าผู้ใช้เคยกด reaction นี้แล้วหรือไม่
  const message = messages.find(msg => msg._id === messageId);
  if (message && message.reactions) {
    const existingReaction = message.reactions.find(
      reaction => reaction.user === currentUser._id && reaction.type === reactionType
    );
    
    if (existingReaction) {
      // ถ้ากดซ้ำ ให้ยกเลิก reaction
      socket.emit('react-message', {
        messageId,
        userId: currentUser._id,
        reactionType,
        action: 'remove'
      });
      return;
    }
  }

  // กด reaction ใหม่
  socket.emit('react-message', {
    messageId,
    userId: currentUser._id,
    reactionType,
    action: 'add'
  });
};
```

## 🎯 ผลลัพธ์

### ✅ หลังการแก้ไข:
- **Like Toggle:** กดครั้งแรกเพื่อ like, กดครั้งที่สองเพื่อยกเลิก
- **Visual Feedback:** แสดงสถานะ like ด้วยสีแดงและไอคอนเต็ม
- **Like Count:** แสดงจำนวน like ในวงเล็บ
- **Dynamic Text:** เปลี่ยนจาก "Like" เป็น "Liked" เมื่อกดแล้ว
- **Tooltip:** แสดงคำอธิบายที่เหมาะสม

### 🔧 การทำงาน:
- **ครั้งแรก:** กดเพื่อ like ข้อความ
- **ครั้งที่สอง:** กดเพื่อยกเลิก like
- **Visual State:** 
  - ไม่ได้ like: สีดำ, ไอคอนว่าง, ข้อความ "Like"
  - ได้ like แล้ว: สีแดง, ไอคอนเต็ม, ข้อความ "Liked"
- **Like Count:** แสดงจำนวน like ทั้งหมดในวงเล็บ
- **Real-time:** อัปเดตแบบ real-time ผ่าน Socket.IO

## 📁 ไฟล์ที่แก้ไข

### Frontend:
- `frontend/src/components/RealTimeChat.jsx` - ปรับปรุงฟีเจอร์ Like

## 🎉 สรุป

การแก้ไขนี้ทำให้:
- Like button ทำงานแบบ toggle (กดครั้งแรกเพื่อ like, กดครั้งที่สองเพื่อยกเลิก)
- มี visual feedback ที่ชัดเจน
- แสดงจำนวน like ทั้งหมด
- ทำงานแบบ real-time
- 1 user สามารถ like ได้แค่ 1 ครั้งต่อข้อความ

---

**🎉 ข้อ 5 เสร็จสมบูรณ์แล้ว! พร้อมสำหรับข้อ 6**
