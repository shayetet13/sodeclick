const MembershipPlan = require('../models/MembershipPlan');

const membershipPlans = [
  {
    tier: 'member',
    name: 'Member',
    price: { amount: 0, currency: 'THB' },
    duration: { days: 365, description: 'ฟรี' },
    features: {
      dailyChats: 10,
      dailyImages: 3,
      dailyVideos: 1,
      spinInterval: { minutes: 1440, description: 'วันละ 1 ครั้ง' },
      dailyBonus: 500,
      votePoints: 0,
      profileVideos: 0,
      pinnedPosts: 0,
      blurredImages: 0,
      chatRooms: 0,
      specialFeatures: [],
      bonusCoins: 0
    },
    badge: {
      color: '#64748b',
      icon: '👤',
      gradient: 'from-slate-400 to-slate-600'
    },
    order: 1
  },
  {
    tier: 'test',
    name: 'Test Member',
    price: { amount: 0.1, currency: 'THB' },
    duration: { days: 1, description: '1 วัน' },
    features: {
      dailyChats: 5,
      dailyImages: 2,
      dailyVideos: 1,
      spinInterval: { minutes: 1440, description: 'วันละ 1 ครั้ง' },
      dailyBonus: 100,
      votePoints: 50,
      profileVideos: 0,
      pinnedPosts: 0,
      blurredImages: 0,
      chatRooms: 0,
      specialFeatures: [
        { name: 'testFeature', description: 'ฟีเจอร์ทดสอบ', enabled: true }
      ],
      bonusCoins: 0
    },
    badge: {
      color: '#10b981',
      icon: '🧪',
      gradient: 'from-emerald-400 to-green-600'
    },
    order: 2
  },
  {
    tier: 'silver',
    name: 'Silver Member',
    price: { amount: 20, currency: 'THB' },
    duration: { days: 7, description: '7 วัน' },
    features: {
      dailyChats: 30,
      dailyImages: 30,
      dailyVideos: 10,
      spinInterval: { minutes: 120, description: 'ทุก 2 ชั่วโมง' },
      dailyBonus: 1000,
      votePoints: 200,
      profileVideos: 0,
      pinnedPosts: 0,
      blurredImages: 0,
      chatRooms: 0,
      specialFeatures: [],
      bonusCoins: 0
    },
    badge: {
      color: '#94a3b8',
      icon: '🥈',
      gradient: 'from-slate-300 to-slate-500'
    },
    order: 3
  },
  {
    tier: 'gold',
    name: 'Gold Member',
    price: { amount: 50, currency: 'THB' },
    duration: { days: 15, description: '15 วัน' },
    features: {
      dailyChats: 60,
      dailyImages: 50,
      dailyVideos: 25,
      spinInterval: { minutes: 90, description: 'ทุก 90 นาที' },
      dailyBonus: 3000,
      votePoints: 500,
      profileVideos: 1,
      pinnedPosts: 0,
      blurredImages: 0,
      chatRooms: 0,
      specialFeatures: [
        { name: 'profileVideo', description: 'เพิ่มวิดีโอโปรไฟล์', enabled: true },
        { name: 'verificationBadge', description: 'ติ๊กยืนยันโปรไฟล์', enabled: true },
        { name: 'specialFrame', description: 'กรอบโปรไฟล์พิเศษ', enabled: true }
      ],
      bonusCoins: 0
    },
    badge: {
      color: '#fbbf24',
      icon: '🥇',
      gradient: 'from-yellow-400 to-yellow-600'
    },
    order: 4
  },
  {
    tier: 'vip',
    name: 'VIP Member',
    price: { amount: 100, currency: 'THB' },
    duration: { days: 30, description: '1 เดือน' },
    features: {
      dailyChats: 120,
      dailyImages: 100,
      dailyVideos: 50,
      spinInterval: { minutes: 60, description: 'ทุก 1 ชั่วโมง' },
      dailyBonus: 8000,
      votePoints: 1000,
      profileVideos: 3,
      pinnedPosts: 1,
      blurredImages: 3,
      chatRooms: 10,
      specialFeatures: [
        { name: 'profileVideo', description: 'เพิ่มวิดีโอโปรไฟล์', enabled: true },
        { name: 'verificationBadge', description: 'ติ๊กยืนยันโปรไฟล์', enabled: true },
        { name: 'specialFrame', description: 'กรอบโปรไฟล์พิเศษ', enabled: true },
        { name: 'pinPosts', description: 'ปักหมุดโพสต์', enabled: true },
        { name: 'blurImages', description: 'เบลอรูปภาพส่วนตัว', enabled: true },
        { name: 'createChatRooms', description: 'สร้างห้องแชท', enabled: true }
      ],
      bonusCoins: 0
    },
    badge: {
      color: '#8b5cf6',
      icon: '👑',
      gradient: 'from-purple-400 to-purple-600'
    },
    order: 5
  },
  {
    tier: 'vip1',
    name: 'VIP 1',
    price: { amount: 150, currency: 'THB' },
    duration: { days: 30, description: '1 เดือน' },
    features: {
      dailyChats: 180,
      dailyImages: 150,
      dailyVideos: 75,
      spinInterval: { minutes: 45, description: 'ทุก 45 นาที' },
      dailyBonus: 15000,
      votePoints: 1500,
      profileVideos: 5,
      pinnedPosts: 3,
      blurredImages: 5,
      chatRooms: 20,
      specialFeatures: [
        { name: 'profileVideo', description: 'เพิ่มวิดีโอโปรไฟล์', enabled: true },
        { name: 'verificationBadge', description: 'ติ๊กยืนยันโปรไฟล์', enabled: true },
        { name: 'specialFrame', description: 'กรอบโปรไฟล์พิเศษ', enabled: true },
        { name: 'pinPosts', description: 'ปักหมุดโพสต์', enabled: true },
        { name: 'blurImages', description: 'เบลอรูปภาพส่วนตัว', enabled: true },
        { name: 'createChatRooms', description: 'สร้างห้องแชท', enabled: true },
        { name: 'hideOnlineStatus', description: 'ซ่อนสถานะออนไลน์', enabled: true }
      ],
      bonusCoins: 0
    },
    badge: {
      color: '#ec4899',
      icon: '💎',
      gradient: 'from-pink-400 to-purple-600'
    },
    order: 6
  },
  {
    tier: 'vip2',
    name: 'VIP 2',
    price: { amount: 300, currency: 'THB' },
    duration: { days: 30, description: '1 เดือน' },
    features: {
      dailyChats: 300,
      dailyImages: -1, // ไม่จำกัด
      dailyVideos: -1, // ไม่จำกัด
      spinInterval: { minutes: 30, description: 'ทุก 30 นาที' },
      dailyBonus: 30000,
      votePoints: 3000,
      profileVideos: 10,
      pinnedPosts: 5,
      blurredImages: 10,
      chatRooms: 30,
      specialFeatures: [
        { name: 'profileVideo', description: 'เพิ่มวิดีโอโปรไฟล์', enabled: true },
        { name: 'verificationBadge', description: 'ติ๊กยืนยันโปรไฟล์', enabled: true },
        { name: 'specialFrame', description: 'กรอบโปรไฟล์พิเศษ', enabled: true },
        { name: 'pinPosts', description: 'ปักหมุดโพสต์', enabled: true },
        { name: 'blurImages', description: 'เบลอรูปภาพส่วนตัว', enabled: true },
        { name: 'createChatRooms', description: 'สร้างห้องแชท', enabled: true },
        { name: 'hideOnlineStatus', description: 'ซ่อนสถานะออนไลน์', enabled: true },
        { name: 'unlimitedMedia', description: 'อัพโหลดสื่อไม่จำกัด', enabled: true }
      ],
      bonusCoins: 0
    },
    badge: {
      color: '#f59e0b',
      icon: '⭐',
      gradient: 'from-amber-400 to-orange-600'
    },
    order: 7
  },
  {
    tier: 'diamond',
    name: 'Diamond Member',
    price: { amount: 500, currency: 'THB' },
    duration: { days: 30, description: '1 เดือน' },
    features: {
      dailyChats: 500,
      dailyImages: -1, // ไม่จำกัด
      dailyVideos: -1, // ไม่จำกัด
      spinInterval: { minutes: 20, description: 'ทุก 20 นาที' },
      dailyBonus: 50000,
      votePoints: 5000,
      profileVideos: 15,
      pinnedPosts: 20,
      blurredImages: 15,
      chatRooms: -1, // ไม่จำกัด
      specialFeatures: [
        { name: 'profileVideo', description: 'เพิ่มวิดีโอโปรไฟล์', enabled: true },
        { name: 'verificationBadge', description: 'ติ๊กยืนยันโปรไฟล์', enabled: true },
        { name: 'specialFrame', description: 'กรอบโปรไฟล์พิเศษ', enabled: true },
        { name: 'pinPosts', description: 'ปักหมุดโพสต์', enabled: true },
        { name: 'blurImages', description: 'เบลอรูปภาพส่วนตัว', enabled: true },
        { name: 'createChatRooms', description: 'สร้างห้องแชทไม่จำกัด', enabled: true },
        { name: 'hideOnlineStatus', description: 'ซ่อนสถานะออนไลน์', enabled: true },
        { name: 'unlimitedMedia', description: 'อัพโหลดสื่อไม่จำกัด', enabled: true },
        { name: 'transferCoins', description: 'โอนเหรียญได้', enabled: true }
      ],
      bonusCoins: 100000
    },
    badge: {
      color: '#06b6d4',
      icon: '💎',
      gradient: 'from-cyan-400 to-blue-600'
    },
    order: 8
  },
  {
    tier: 'platinum',
    name: 'Platinum Member',
    price: { amount: 1000, currency: 'THB' },
    duration: { days: 30, description: '1 เดือน' },
    features: {
      dailyChats: -1, // ไม่จำกัด
      dailyImages: -1, // ไม่จำกัด
      dailyVideos: -1, // ไม่จำกัด
      spinInterval: { minutes: 10, description: 'ทุก 10 นาที' },
      dailyBonus: 100000,
      votePoints: 15000,
      profileVideos: 15,
      pinnedPosts: 20,
      blurredImages: 15,
      chatRooms: -1, // ไม่จำกัด
      specialFeatures: [
        { name: 'profileVideo', description: 'เพิ่มวิดีโอโปรไฟล์', enabled: true },
        { name: 'verificationBadge', description: 'ติ๊กยืนยันโปรไฟล์', enabled: true },
        { name: 'specialFrame', description: 'กรอบโปรไฟล์พิเศษ', enabled: true },
        { name: 'pinPosts', description: 'ปักหมุดโพสต์', enabled: true },
        { name: 'blurImages', description: 'เบลอรูปภาพส่วนตัว', enabled: true },
        { name: 'createChatRooms', description: 'สร้างห้องแชทไม่จำกัด', enabled: true },
        { name: 'hideOnlineStatus', description: 'ซ่อนสถานะออนไลน์', enabled: true },
        { name: 'unlimitedMedia', description: 'อัพโหลดสื่อไม่จำกัด', enabled: true },
        { name: 'transferCoins', description: 'โอนเหรียญได้', enabled: true },
        { name: 'unlimited', description: 'สิทธิ์ไม่จำกัดทุกอย่าง', enabled: true }
      ],
      bonusCoins: 100000
    },
    badge: {
      color: '#6366f1',
      icon: '🏆',
      gradient: 'from-indigo-400 to-purple-600'
    },
    order: 9
  }
];

async function seedMembershipPlans() {
  try {
    // ลบข้อมูลเก่า
    await MembershipPlan.deleteMany({});
    
    // เพิ่มข้อมูลใหม่
    await MembershipPlan.insertMany(membershipPlans);
    
    console.log('✅ Membership plans seeded successfully');
    console.log(`📊 Created ${membershipPlans.length} membership plans`);
    
    return membershipPlans;
  } catch (error) {
    console.error('❌ Error seeding membership plans:', error);
    throw error;
  }
}

module.exports = { seedMembershipPlans, membershipPlans };
