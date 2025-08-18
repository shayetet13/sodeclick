# Chat Image Upload Feature - ข้อ 1

## 🎯 ฟีเจอร์ที่เพิ่ม

**ข้อ 1: ห้องแชทสามารถเพิ่มรูปภาพได้ และลบได้ก่อน 3 วินาที หากไม่ต้องการ**

### ✅ ฟีเจอร์ที่ได้:
1. **อัปโหลดรูปภาพ** - เพิ่มปุ่มอัปโหลดรูปภาพใน input area
2. **Preview รูปภาพ** - แสดง preview ก่อนส่ง
3. **ลบได้ก่อน 3 วินาที** - ข้อความรูปภาพสามารถลบได้ภายใน 3 วินาทีแรก
4. **แสดงเวลานับถอยหลัง** - แสดงเวลาที่เหลือในการลบ
5. **รูปภาพสมสัดส่วน** - รูปภาพแสดงในขนาดที่เหมาะสม

## 🔧 การแก้ไขที่ทำ

### 1. เพิ่ม State และ Refs

**ไฟล์:** `frontend/src/components/RealTimeChat.jsx`

```javascript
// เพิ่ม state สำหรับรูปภาพ
const [selectedImage, setSelectedImage] = useState(null);
const [imagePreview, setImagePreview] = useState(null);
const [uploadingImage, setUploadingImage] = useState(false);

// เพิ่ม ref สำหรับ input file
const imageInputRef = useRef(null);
```

### 2. เพิ่มฟังก์ชันจัดการรูปภาพ

```javascript
// เลือกรูปภาพ
const handleImageSelect = (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }
};

// อัปโหลดรูปภาพ
const handleImageUpload = async () => {
  if (!selectedImage || !socket) return;

  setUploadingImage(true);
  const formData = new FormData();
  formData.append('file', selectedImage);
  formData.append('senderId', currentUser._id);
  formData.append('chatRoomId', roomId);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/upload`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData
      }
    );

    const data = await response.json();
    if (data.success) {
      // ส่งข้อความรูปภาพผ่าน socket
      socket.emit('send-message', {
        content: '',
        senderId: currentUser._id,
        chatRoomId: roomId,
        messageType: 'image',
        imageUrl: data.data.fileUrl,
        fileName: selectedImage.name
      });
      
      // รีเซ็ต state
      setSelectedImage(null);
      setImagePreview(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } else {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
  } finally {
    setUploadingImage(false);
  }
};

// ยกเลิกรูปภาพ
const handleCancelImage = () => {
  setSelectedImage(null);
  setImagePreview(null);
  if (imageInputRef.current) {
    imageInputRef.current.value = '';
  }
};
```

### 3. แก้ไขฟังก์ชันลบข้อความ

```javascript
const handleDeleteMessage = async (messageId) => {
  // ตรวจสอบว่าเป็นข้อความรูปภาพและยังไม่เกิน 3 วินาทีหรือไม่
  const message = messages.find(msg => msg._id === messageId);
  if (message && message.messageType === 'image') {
    const messageTime = new Date(message.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - messageTime) / 1000; // วินาที
    
    if (timeDiff > 3) {
      alert('ไม่สามารถลบรูปภาพได้หลังจาก 3 วินาที');
      return;
    }
  } else {
    if (!confirm('คุณต้องการลบข้อความนี้หรือไม่?')) return;
  }

  // ... rest of delete logic
};
```

### 4. แก้ไขฟังก์ชันแสดงข้อความ

```javascript
const renderMessageContent = (message) => {
  // Image message
  if (message.messageType === 'image' && message.imageUrl) {
    return (
      <div className="space-y-2">
        <img
          src={message.imageUrl}
          alt="Shared image"
          className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => {
            // TODO: Add image modal for full view
            window.open(message.imageUrl, '_blank');
          }}
        />
        {message.content && (
          <div className="text-sm">
            {detectLinks(message.content)}
          </div>
        )}
      </div>
    );
  }
  
  // Text only message
  return detectLinks(message.content);
};
```

### 5. เพิ่ม UI สำหรับอัปโหลดรูปภาพ

```jsx
{/* Image Preview */}
{imagePreview && (
  <div className="mb-3 relative">
    <div className="relative inline-block">
      <img
        src={imagePreview}
        alt="Preview"
        className="max-h-32 rounded-lg border"
      />
      <button
        onClick={handleCancelImage}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
    <div className="mt-2 flex space-x-2">
      <Button
        onClick={handleImageUpload}
        disabled={uploadingImage}
        className="bg-green-500 hover:bg-green-600 text-white text-sm"
      >
        {uploadingImage ? 'กำลังอัปโหลด...' : 'ส่งรูปภาพ'}
      </Button>
      <Button
        onClick={handleCancelImage}
        variant="outline"
        className="text-sm"
      >
        ยกเลิก
      </Button>
    </div>
  </div>
)}

{/* Image Upload Button */}
<input
  ref={imageInputRef}
  type="file"
  accept="image/*"
  onChange={handleImageSelect}
  className="hidden"
/>
<Button 
  size="icon" 
  variant="ghost" 
  onClick={() => imageInputRef.current?.click()}
  className="text-gray-500 hover:text-gray-700"
>
  <Image className="h-5 w-5" />
</Button>
```

### 6. เพิ่มปุ่มลบสำหรับรูปภาพ

```jsx
{/* Delete Button - แสดงเฉพาะข้อความรูปภาพที่ยังไม่เกิน 3 วินาที */}
{message.messageType === 'image' && message.sender._id === currentUser._id && (
  (() => {
    const messageTime = new Date(message.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - messageTime) / 1000;
    
    if (timeDiff <= 3) {
      return (
        <button
          onClick={() => handleDeleteMessage(message._id)}
          className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>ลบ ({Math.ceil(3 - timeDiff)}s)</span>
        </button>
      );
    }
    return null;
  })()
)}
```

## 🎯 ผลลัพธ์

### ✅ หลังการแก้ไข:
- **อัปโหลดรูปภาพ:** สามารถเลือกและอัปโหลดรูปภาพได้
- **Preview:** แสดง preview รูปภาพก่อนส่ง
- **ลบได้ 3 วินาที:** รูปภาพสามารถลบได้ภายใน 3 วินาทีแรก
- **นับถอยหลัง:** แสดงเวลาที่เหลือในการลบ
- **รูปภาพสมสัดส่วน:** รูปภาพแสดงในขนาดที่เหมาะสม

### 🔧 การทำงาน:
- **เลือกรูปภาพ:** คลิกปุ่มรูปภาพเพื่อเลือกไฟล์
- **Preview:** แสดง preview และปุ่มส่ง/ยกเลิก
- **อัปโหลด:** ส่งรูปภาพไปยัง server
- **แสดงในแชท:** รูปภาพแสดงในข้อความ
- **ลบได้:** ปุ่มลบแสดงเฉพาะ 3 วินาทีแรก

## 📁 ไฟล์ที่แก้ไข

### Frontend:
- `frontend/src/components/RealTimeChat.jsx` - เพิ่มฟีเจอร์อัปโหลดรูปภาพ

### Backend:
- `backend/routes/chatroom.js` - มี API upload อยู่แล้ว

## 🎉 สรุป

การแก้ไขนี้ทำให้:
- ผู้ใช้สามารถอัปโหลดรูปภาพในแชทได้
- รูปภาพแสดงในขนาดที่เหมาะสม
- สามารถลบรูปภาพได้ภายใน 3 วินาทีแรก
- มีการแสดงเวลานับถอยหลังสำหรับการลบ

---

**🎉 ข้อ 1 เสร็จสมบูรณ์แล้ว! พร้อมสำหรับข้อ 2**
