# Mobile Crop Guide - คู่มือการใช้งานบนมือถือ

## ภาพรวม
ImageCropModal ได้รับการปรับปรุงให้รองรับการใช้งานบนหน้าจอมือถืออย่างเต็มที่ โดยมีฟีเจอร์ที่เหมาะสมกับ touch interface

## ฟีเจอร์สำหรับมือถือ

### 1. Responsive Design
- **Canvas Size**: ปรับขนาดอัตโนมัติตามหน้าจอ
  - หน้าจอเล็ก (< 640px): สูงสุด 400x400px
  - หน้าจอใหญ่ (≥ 640px): 500x500px
- **Modal Size**: ปรับขนาดและ padding ตามหน้าจอ
- **Text Size**: ปรับขนาดตัวอักษรให้เหมาะสม

### 2. Touch Events
- **Touch Start**: เริ่มการลากหรือปรับขนาด
- **Touch Move**: ลากกรอบหรือปรับขนาด
- **Touch End**: จบการลาก
- **Prevent Default**: ป้องกันการ scroll ขณะลาก

### 3. Mobile-Optimized UI

#### Header
- ปรับขนาดไอคอนและข้อความ
- ซ่อนคำอธิบายบนหน้าจอเล็ก
- ปรับ padding ให้เหมาะสม

#### Canvas Container
- ปรับขนาดตามหน้าจอ
- เพิ่ม `touch-none` class เพื่อป้องกันการ scroll
- Loading indicator ที่เหมาะสมกับหน้าจอเล็ก

#### Controls
- **Zoom Controls**: ปุ่มเล็กกว่าและใกล้กันมากขึ้น
- **Rotate Button**: ข้อความสั้นลงบนมือถือ
- **Action Buttons**: ปุ่มเต็มความกว้างบนมือถือ
- **Instructions**: ข้อความที่เหมาะสมกับ touch interface

### 4. Handle Size
- **Desktop**: 12px handles
- **Mobile**: 16px handles (ใหญ่ขึ้นเพื่อให้แตะง่าย)

## การใช้งานบนมือถือ

### การลากกรอบ
1. แตะที่กรอบสีน้ำเงิน
2. ลากไปยังตำแหน่งที่ต้องการ
3. ปล่อยนิ้วเพื่อยืนยันตำแหน่ง

### การปรับขนาด
1. แตะที่มุมของกรอบ (handle สีน้ำเงิน)
2. ลากเพื่อปรับขนาด
3. ปล่อยนิ้วเพื่อยืนยันขนาด

### การซูม
1. แตะปุ่ม `-` เพื่อซูมออก
2. แตะปุ่ม `+` เพื่อซูมเข้า
3. ดูเปอร์เซ็นต์การซูมที่แสดง

### การหมุน
1. แตะปุ่ม "หมุน" (บนมือถือ) หรือ "หมุน 90°" (บนเดสก์ท็อป)
2. รูปภาพจะหมุน 90 องศาทุกครั้งที่แตะ

### การตัดรูป
1. ปรับแต่งกรอบตามต้องการ
2. แตะปุ่ม "ตัดรูป" (สีน้ำเงิน)
3. รอการประมวลผลและอัพโหลด

## การปรับแต่งเพิ่มเติม

### เปลี่ยน Handle Size
```javascript
// ในฟังก์ชัน drawOverlay
const isMobile = window.innerWidth < 640;
const handleSize = isMobile ? 20 : 12; // เพิ่มขนาดบนมือถือ
```

### เปลี่ยน Canvas Size
```javascript
// ใน useEffect สำหรับ resize
const containerWidth = isMobile ? Math.min(window.innerWidth - 16, 350) : 500;
const containerHeight = isMobile ? Math.min(window.innerHeight * 0.35, 350) : 500;
```

### เปลี่ยน Touch Sensitivity
```javascript
// ใน handleTouchStart
const handleSize = isMobile ? 20 : 12; // เพิ่มพื้นที่แตะ
```

## การแก้ไขปัญหา

### กรอบไม่ตอบสนองการแตะ
- ตรวจสอบว่า canvas มี `touch-none` class
- ตรวจสอบ touch event handlers
- ตรวจสอบ handle size

### กรอบเลื่อนออกนอกพื้นที่
- ตรวจสอบการคำนวณ canvas bounds
- ตรวจสอบ responsive canvas size

### ปุ่มเล็กเกินไปบนมือถือ
- ตรวจสอบ responsive classes
- ปรับขนาดปุ่มใน mobile breakpoint

### การ scroll ขณะลาก
- ตรวจสอบ `preventDefault()` ใน touch events
- ตรวจสอบ `touch-none` class

## Best Practices

### สำหรับผู้ใช้
1. ใช้นิ้วเดียวในการลากกรอบ
2. แตะที่ handle อย่างชัดเจน
3. ลากอย่างช้าๆ เพื่อความแม่นยำ
4. ใช้ปุ่มซูมเมื่อต้องการดูรายละเอียด

### สำหรับนักพัฒนา
1. ทดสอบบนอุปกรณ์จริง
2. ตรวจสอบ performance บนมือถือ
3. ใช้ responsive design patterns
4. ทดสอบ touch events อย่างละเอียด

## การทดสอบ

### บนมือถือ
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Android Tablet (Chrome)

### บนเดสก์ท็อป
- Chrome (DevTools mobile simulation)
- Firefox (Responsive Design Mode)
- Safari (Responsive Design Mode)

## การปรับปรุงในอนาคต

### ฟีเจอร์ที่อาจเพิ่ม
- Pinch to zoom
- Double tap to reset
- Gesture-based rotation
- Haptic feedback
- Voice instructions

### การปรับปรุง Performance
- Canvas optimization
- Touch event debouncing
- Memory management
- Battery optimization
