# การแก้ไขการแสดงวันหมดอายุสมาชิก

## ปัญหาที่พบ
- แสดง "ไม่มีวันหมดอายุ" สำหรับทุกระดับสมาชิก
- ไม่แสดงระยะเวลาสมาชิกตามข้อมูลใน seeders
- ไม่มีการแยกแยะระหว่าง Member (ฟรี) กับ Premium Members

## การแก้ไขที่ทำ

### 1. แก้ไขฟังก์ชัน `getTimeRemaining` (`frontend/src/services/membershipAPI.js`)
เพิ่มการจัดการกรณีต่างๆ:

```javascript
getTimeRemaining: (expiryDate, tier = 'member') => {
  if (!expiryDate) {
    // สำหรับ member tier ที่ไม่มีวันหมดอายุ
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
  
  if (days > 0) return `เหลือ ${days} วัน`;
  if (hours > 0) return `เหลือ ${hours} ชั่วโมง`;
  
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `เหลือ ${minutes} นาที`;
}
```

### 2. เพิ่มฟังก์ชัน `getMembershipDuration` (`frontend/src/services/membershipAPI.js`)
แสดงระยะเวลาสมาชิกตาม tier:

```javascript
getMembershipDuration: (tier) => {
  const durations = {
    member: '365 วัน (ฟรี)',
    test: '1 วัน',
    silver: '7 วัน',
    gold: '15 วัน',
    vip: '30 วัน (1 เดือน)',
    vip1: '30 วัน (1 เดือน)',
    vip2: '30 วัน (1 เดือน)',
    diamond: '30 วัน (1 เดือน)',
    platinum: '30 วัน (1 เดือน)'
  };
  return durations[tier] || 'ไม่ระบุ';
}
```

### 3. แก้ไข MembershipDashboard (`frontend/src/components/MembershipDashboard.jsx`)
อัพเดตการแสดงผล:

```javascript
<div className="flex items-center text-slate-600">
  <Calendar className="h-4 w-4 mr-1" />
  <span>
    {membershipHelpers.getTimeRemaining(membershipExpiry, membershipTier)}
  </span>
</div>
<div className="text-sm text-slate-500 mt-1">
  ระยะเวลา: {membershipHelpers.getMembershipDuration(membershipTier)}
</div>
```

## ข้อมูลระยะเวลาสมาชิกที่ถูกต้อง

| ระดับ | ระยะเวลา | ราคา | สถานะ |
|-------|----------|------|-------|
| Member | 365 วัน | ฟรี | ไม่มีวันหมดอายุ |
| Test | 1 วัน | 0.1 บาท | มีวันหมดอายุ |
| Silver | 7 วัน | 20 บาท | มีวันหมดอายุ |
| Gold | 15 วัน | 50 บาท | มีวันหมดอายุ |
| VIP | 30 วัน | 100 บาท | มีวันหมดอายุ |
| VIP 1 | 30 วัน | 150 บาท | มีวันหมดอายุ |
| VIP 2 | 30 วัน | 300 บาท | มีวันหมดอายุ |
| Diamond | 30 วัน | 500 บาท | มีวันหมดอายุ |
| Platinum | 30 วัน | 1,000 บาท | มีวันหมดอายุ |

## การแสดงผลที่ถูกต้อง

### สำหรับ Member (ฟรี):
- **สถานะ**: ไม่มีวันหมดอายุ
- **ระยะเวลา**: 365 วัน (ฟรี)

### สำหรับ Premium Members:
- **สถานะ**: เหลือ X วัน (หรือ ชั่วโมง/นาที)
- **ระยะเวลา**: X วัน (ตาม tier)

## การคำนวณวันหมดอายุใน Backend

```javascript
// คำนวณวันหมดอายุ
const startDate = new Date();
const expiryDate = new Date(startDate.getTime() + (plan.duration.days * 24 * 60 * 60 * 1000));

// อัพเดตข้อมูลสมาชิก
user.membership.tier = tier;
user.membership.startDate = startDate;
user.membership.endDate = tier === 'member' ? null : expiryDate;
```

## ผลลัพธ์

ตอนนี้การแสดงวันหมดอายุจะถูกต้องตามข้อมูลจริง:

1. **Member**: แสดง "ไม่มีวันหมดอายุ" และ "ระยะเวลา: 365 วัน (ฟรี)"
2. **Premium Members**: แสดงเวลาที่เหลือและระยะเวลาสมาชิก
3. **การคำนวณ**: ถูกต้องตามข้อมูลใน seeders

## ไฟล์ที่แก้ไข
- `frontend/src/services/membershipAPI.js` - แก้ไขฟังก์ชัน getTimeRemaining และเพิ่ม getMembershipDuration
- `frontend/src/components/MembershipDashboard.jsx` - อัพเดตการแสดงผล
