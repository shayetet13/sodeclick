# ImageCropModal Component

## ภาพรวม
ImageCropModal เป็น component สำหรับปรับแต่งรูปภาพก่อนอัพโหลด โดยมีฟีเจอร์คล้ายกับ LINE และ Facebook ที่ให้ผู้ใช้สามารถ:

- ลากกรอบสี่เหลี่ยมเพื่อเลือกพื้นที่ที่ต้องการ
- ปรับขนาดกรอบโดยลากมุม
- ซูมเข้า/ออก
- หมุนรูปภาพ
- ตัดรูปภาพตามพื้นที่ที่เลือก

## ฟีเจอร์หลัก

### 1. การเลือกพื้นที่ (Crop Area)
- กรอบสี่เหลี่ยมสีน้ำเงินที่สามารถลากได้
- มุมทั้งสี่มี handle สำหรับปรับขนาด
- มี crosshair ตรงกลางเพื่อช่วยในการจัดตำแหน่ง
- กรอบมีขอบสีขาวเพื่อความชัดเจน

### 2. การควบคุม
- **Zoom In/Out**: ปุ่ม +/- สำหรับซูมเข้า/ออก
- **Rotate**: ปุ่มหมุนรูปภาพ 90 องศา
- **Drag**: ลากกรอบเพื่อปรับตำแหน่ง
- **Resize**: ลากมุมเพื่อปรับขนาด

### 3. UI/UX
- Modal แบบ full-screen overlay
- Header ที่มีไอคอนและคำอธิบาย
- Controls ที่จัดเรียงอย่างเป็นระเบียบ
- Loading indicator ขณะโหลดรูปภาพ
- Responsive design

## การใช้งาน

```jsx
import ImageCropModal from './ImageCropModal';

const MyComponent = () => {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const handleCropComplete = (croppedFile) => {
    // จัดการไฟล์ที่ crop แล้ว
    console.log('Cropped file:', croppedFile);
  };

  return (
    <ImageCropModal
      isOpen={cropModalOpen}
      onClose={() => setCropModalOpen(false)}
      imageFile={imageToCrop}
      onCropComplete={handleCropComplete}
      aspectRatio={1} // 1 = square, 16/9 = landscape, 9/16 = portrait
      minCropSize={100}
    />
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | - | สถานะการเปิด/ปิด modal |
| `onClose` | function | - | ฟังก์ชันเรียกเมื่อปิด modal |
| `imageFile` | File | - | ไฟล์รูปภาพที่ต้องการ crop |
| `onCropComplete` | function | - | ฟังก์ชันเรียกเมื่อ crop เสร็จสิ้น |
| `aspectRatio` | number | 1 | อัตราส่วนของกรอบ crop |
| `minCropSize` | number | 100 | ขนาดขั้นต่ำของกรอบ crop |

## การทำงาน

1. **โหลดรูปภาพ**: เมื่อได้รับไฟล์รูปภาพ จะสร้าง Image object และแสดงใน canvas
2. **สร้างกรอบเริ่มต้น**: สร้างกรอบ crop ตรงกลางรูปภาพ
3. **การโต้ตอบ**: ผู้ใช้สามารถลากกรอบ ปรับขนาด ซูม และหมุนได้
4. **การ crop**: เมื่อกดปุ่ม "ตัดรูป" จะสร้างไฟล์ใหม่จากพื้นที่ที่เลือก
5. **ส่งคืนผลลัพธ์**: เรียก `onCropComplete` พร้อมไฟล์ที่ crop แล้ว

## เทคนิคที่ใช้

- **Canvas API**: สำหรับการวาดและจัดการรูปภาพ
- **File API**: สำหรับการสร้างไฟล์ใหม่
- **React Hooks**: useState, useEffect, useRef, useCallback
- **Event Handling**: mouse events สำหรับการโต้ตอบ
- **CSS**: Tailwind CSS สำหรับ styling

## การปรับแต่ง

### เปลี่ยนสีกรอบ
```javascript
// ในฟังก์ชัน drawOverlay
ctx.strokeStyle = '#your-color'; // เปลี่ยนสีกรอบ
```

### เปลี่ยนขนาด handle
```javascript
const handleSize = 12; // เปลี่ยนขนาด handle
```

### เปลี่ยน aspect ratio
```javascript
<ImageCropModal
  aspectRatio={16/9} // สำหรับรูป landscape
  // หรือ
  aspectRatio={9/16} // สำหรับรูป portrait
/>
```

## ข้อจำกัด

- รองรับเฉพาะไฟล์รูปภาพ (image/*)
- ต้องใช้ browser ที่รองรับ Canvas API
- ขนาดไฟล์ที่ crop จะขึ้นอยู่กับขนาดกรอบที่เลือก
- ไม่รองรับการ crop แบบอิสระ (freeform crop)

## การแก้ไขปัญหา

### รูปภาพไม่แสดง
- ตรวจสอบว่าไฟล์เป็นรูปภาพที่ถูกต้อง
- ตรวจสอบ console สำหรับ error messages

### กรอบ crop ไม่ทำงาน
- ตรวจสอบว่า canvas มีขนาดที่ถูกต้อง
- ตรวจสอบ event handlers

### ไฟล์ที่ crop ไม่ถูกต้อง
- ตรวจสอบการคำนวณ coordinates
- ตรวจสอบ Canvas API methods
