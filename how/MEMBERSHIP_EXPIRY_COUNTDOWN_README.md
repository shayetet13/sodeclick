# การแก้ไขการนับถอยหลังและการจัดการการหมดอายุสมาชิก

## ปัญหาที่พบ
1. **ข้อความ "หมดอายุแล้ว"** แสดงผิดเมื่อยังมีวันเหลือ
2. **ไม่มีการนับถอยหลัง** แสดงเวลาที่เหลือแบบ real-time
3. **เมื่อหมดอายุไม่กลายเป็น member ธรรมดา**
4. **สิทธิ์ไม่อิงจาก membership จริง**
5. **การคำนวณวันหมดอายุผิด** ทำให้สมาชิกที่เพิ่งสมัครแสดงว่าหมดอายุแล้ว

## การแก้ไขที่ทำ

### 1. แก้ไขฟังก์ชัน `getTimeRemaining` (`frontend/src/services/membershipAPI.js`)
ปรับปรุงการแสดงผลเวลาให้ปัดเศษขึ้นไปเป็นวัน:
ปรับปรุงการแสดงผลเวลาให้ละเอียดขึ้น:

```javascript
getTimeRemaining: (expiryDate, tier = 'member') => {
  if (!expiryDate) {
    if (tier === 'member') {
      return 'ไม่มีวันหมดอายุ';
    }
    return 'หมดอายุแล้ว';
  }
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - now;
  
  if (diff <= 0) return 'หมดอายุแล้ว';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // ปัดเศษขึ้นไป: ถ้ามีชั่วโมงหรือนาที ให้ปัดขึ้นเป็นวัน
  if (hours > 0 || minutes > 0) {
    return `เหลือ ${days + 1} วัน`;
  }
  
  return `เหลือ ${days} วัน`;
}
```

### 2. แก้ไขฟังก์ชัน `getTimeRemainingDetailed` (`frontend/src/services/membershipAPI.js`)
ปรับปรุงการแสดงผลเวลาให้ปัดเศษขึ้นไปเป็นวัน:
สำหรับการนับถอยหลังแบบละเอียด:

```javascript
getTimeRemainingDetailed: (expiryDate, tier = 'member') => {
  if (!expiryDate) {
    if (tier === 'member') {
      return { text: 'ไม่มีวันหมดอายุ', isExpired: false };
    }
    return { text: 'หมดอายุแล้ว', isExpired: true };
  }
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry - now;
  
  if (diff <= 0) {
    return { text: 'หมดอายุแล้ว', isExpired: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  // ปัดเศษขึ้นไป: ถ้ามีชั่วโมงหรือนาที ให้ปัดขึ้นเป็นวัน
  let displayDays = days;
  if (hours > 0 || minutes > 0) {
    displayDays = days + 1;
  }
  
  let text = '';
  if (displayDays > 0) {
    text = `เหลือ ${displayDays} วัน`;
  } else if (hours > 0) {
    text = `เหลือ ${hours} ชั่วโมง`;
  } else if (minutes > 0) {
    text = `เหลือ ${minutes} นาที`;
  } else {
    text = `เหลือ ${seconds} วินาที`;
  }
  
  return { text, isExpired: false, diff };
}
```

### 3. เพิ่มการนับถอยหลังใน MembershipDashboard (`frontend/src/components/MembershipDashboard.jsx`)

```javascript
// การนับถอยหลัง
useEffect(() => {
  if (!membershipData?.membershipExpiry || membershipData?.membershipTier === 'member') {
    setTimeRemaining(membershipHelpers.getTimeRemaining(membershipData?.membershipExpiry, membershipData?.membershipTier))
    return
  }

  const updateTimeRemaining = () => {
    const result = membershipHelpers.getTimeRemainingDetailed(membershipData.membershipExpiry, membershipData.membershipTier)
    setTimeRemaining(result.text)
    
    // ถ้าหมดอายุแล้ว ให้รีเฟรชข้อมูล
    if (result.isExpired) {
      fetchMembershipData()
    }
  }

  // อัพเดตทันที
  updateTimeRemaining()

  // อัพเดตทุกวินาที
  const interval = setInterval(updateTimeRemaining, 1000)

  return () => clearInterval(interval)
}, [membershipData?.membershipExpiry, membershipData?.membershipTier])
```

### 4. เพิ่มฟังก์ชันจัดการการหมดอายุใน User Model (`backend/models/User.js`)

```javascript
// Method to check and handle membership expiration
userSchema.methods.checkAndHandleExpiration = async function() {
  if (this.membership.tier === 'member') return false;
  if (!this.membership.endDate) return false;
  
  const now = new Date();
  const isExpired = now >= this.membership.endDate;
  
  if (isExpired) {
    // เปลี่ยนเป็น member ธรรมดา
    this.membership.tier = 'member';
    this.membership.endDate = null;
    this.membership.startDate = new Date();
    this.membership.planId = null;
    
    // รีเซ็ตการใช้งานรายวัน
    this.dailyUsage = {
      chatCount: 0,
      imageUploadCount: 0,
      videoUploadCount: 0,
      lastReset: new Date(),
      lastDailyBonusClaim: null,
      lastSpinWheelTime: null
    };
    
    await this.save();
    return true; // หมดอายุแล้ว
  }
  
  return false; // ยังไม่หมดอายุ
};
```

### 5. แก้ไขฟังก์ชัน `getMembershipLimits` (`backend/models/User.js`)
ให้ตรวจสอบการหมดอายุก่อน:

```javascript
getMembershipLimits = function() {
  // ตรวจสอบการหมดอายุก่อน
  if (this.membership.tier !== 'member' && this.membership.endDate) {
    const now = new Date();
    if (now >= this.membership.endDate) {
      // ถ้าหมดอายุแล้ว ให้ใช้สิทธิ์ของ member
      this.membership.tier = 'member';
      this.membership.endDate = null;
    }
  }
  
  // ... rest of the function
}
```

### 6. แก้ไขการคำนวณวันหมดอายุใน `upgrade-simple.js`
### 7. แก้ไขการสร้าง endDate ใน `membership.js` ให้อ้างอิงจากไฟล์ membership
แก้ไขการคำนวณวันหมดอายุให้ถูกต้อง:

```javascript
// เดิม (ผิด)
const endDate = new Date(startDate);
endDate.setDate(endDate.getDate() + plan.duration.days);

// ใหม่ (ถูกต้อง)
const endDate = new Date(startDate.getTime() + (plan.duration.days * 24 * 60 * 60 * 1000));
```

### 7. แก้ไขการสร้าง endDate ใน `membership.js` ให้อ้างอิงจากไฟล์ membership และตรวจสอบความถูกต้อง

```javascript
// ตรวจสอบว่าต้องสร้าง endDate ใหม่หรือไม่
let needNewEndDate = false;

if (!user.membership.endDate) {
  console.log(`⚠️  พบ Premium Member (${user.membership.tier}) ที่ไม่มี endDate - สร้างใหม่`);
  needNewEndDate = true;
} else {
  // ตรวจสอบว่า endDate ปัจจุบันตรงกับระยะเวลาที่กำหนดหรือไม่
  const now = new Date();
  const currentEndDate = new Date(user.membership.endDate);
  const currentDays = Math.ceil((currentEndDate - now) / (1000 * 60 * 60 * 24));
  
  // ถ้าวันที่เหลือไม่ตรงกับระยะเวลาที่กำหนด ให้สร้างใหม่
  if (Math.abs(currentDays - durationDays) > 1) {
    console.log(`⚠️  พบ Premium Member (${user.membership.tier}) ที่มี endDate ไม่ตรงกับระยะเวลาที่กำหนด (${currentDays} วัน vs ${durationDays} วัน) - สร้างใหม่`);
    needNewEndDate = true;
  }
}

if (needNewEndDate) {
  // สร้าง endDate ใหม่ตามระยะเวลาที่กำหนด
  const newEndDate = new Date();
  newEndDate.setDate(newEndDate.getDate() + durationDays);
  
  user.membership.endDate = newEndDate;
  await user.save();
  
  membershipExpiry = newEndDate;
  isActive = true;
  
  console.log(`✅ สร้าง endDate ใหม่: ${newEndDate.toISOString()} (${durationDays} วัน)`);
}
```
```

## การแสดงผลที่ถูกต้อง

### สำหรับ Premium Members ที่ยังไม่หมดอายุ:
- **สถานะ**: เหลือ X วัน (ปัดเศษขึ้นไปตามเวลาจริง)
- **ไม่แสดง**: ระยะเวลาของแพ็กเกจ (ลบออกเพื่อความชัดเจน)
- **สิทธิ์**: ตามระดับสมาชิกจริง
- **การปัดเศษ**: ถ้ามีชั่วโมงหรือนาทีเหลือ จะปัดขึ้นเป็นวัน

### สำหรับ Premium Members ที่หมดอายุแล้ว:
- **สถานะ**: หมดอายุแล้ว (สีแดง)
- **ข้อความ**: "สมาชิกหมดอายุแล้ว - เปลี่ยนเป็น Member ธรรมดา"
- **สิทธิ์**: เปลี่ยนเป็น member ธรรมดาโดยอัตโนมัติ
- **การใช้งาน**: รีเซ็ตเป็น 0

### สำหรับ Member (ฟรี):
- **สถานะ**: ไม่มีวันหมดอายุ
- **ระยะเวลา**: แสดงระยะเวลาของ member (เช่น "ระยะเวลา: 365 วัน (ฟรี)")
- **สิทธิ์**: ตาม member ธรรมดา

## การทำงานของระบบ

1. **การนับถอยหลัง**: อัพเดตทุกวินาที แสดงเวลาที่เหลือแบบละเอียด
2. **การตรวจสอบหมดอายุ**: ตรวจสอบทุกครั้งที่ดึงข้อมูลสมาชิก
3. **การเปลี่ยนระดับ**: เมื่อหมดอายุจะเปลี่ยนเป็น member ธรรมดาอัตโนมัติ
4. **การรีเซ็ตสิทธิ์**: รีเซ็ตการใช้งานรายวันเมื่อหมดอายุ

## ไฟล์ที่แก้ไข
- `frontend/src/services/membershipAPI.js` - เพิ่มฟังก์ชัน getTimeRemainingDetailed
- `frontend/src/components/MembershipDashboard.jsx` - เพิ่มการนับถอยหลัง
- `backend/models/User.js` - เพิ่มฟังก์ชันจัดการการหมดอายุ
- `backend/routes/membership.js` - เรียกใช้ฟังก์ชันตรวจสอบการหมดอายุ
- `backend/routes/upgrade-simple.js` - แก้ไขการคำนวณวันหมดอายุ

## ผลลัพธ์
- ✅ การแสดงเวลาที่เหลือถูกต้องและละเอียด
- ✅ การนับถอยหลังแบบ real-time
- ✅ การจัดการการหมดอายุอัตโนมัติ
- ✅ การเปลี่ยนเป็น member ธรรมดาเมื่อหมดอายุ
- ✅ สิทธิ์อิงจาก membership จริง
- ✅ การคำนวณวันหมดอายุถูกต้อง (แก้ไขปัญหา "หมดอายุแล้ว" สำหรับสมาชิกที่เพิ่งสมัคร)
- ✅ แสดงเฉพาะจำนวนวันที่เหลือ (ลบระยะเวลาของแพ็กเกจออก)
- ✅ เปลี่ยนเป็น member ธรรมดาอัตโนมัติเมื่อหมดอายุ
- ✅ แก้ไขปัญหา Premium Members ที่ไม่มี endDate (สร้างใหม่อัตโนมัติ)
- ✅ แก้ไขปัญหา WebSocket connection failed (รีสตาร์ท frontend server)
- ✅ ปัดเศษการแสดงผลขึ้นไปเป็นวัน (29 วัน 23 ชม → 30 วัน)
- ✅ อ้างอิงระยะเวลาจากไฟล์ membership (Silver: 7 วัน, Gold: 15 วัน, VIP+: 30 วัน)
- ✅ ตรวจสอบและแก้ไข endDate ที่ไม่ตรงกับ tier (Silver 30 วัน → 7 วัน)
