const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

async function createUserProfile() {
  try {
    // เชื่อมต่อ MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // สร้าง user profile ตัวอย่าง
    const sampleUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123', // เพิ่ม password
      firstName: 'ทดสอบ',
      lastName: 'ผู้ใช้',
      displayName: 'ทดสอบผู้ใช้',
      nickname: 'ทดสอบ',
      dateOfBirth: new Date('1995-05-15'),
      gender: 'male',
      lookingFor: 'female',
      bio: 'สวัสดีครับ ผมเป็นคนที่ชอบการเดินทาง การอ่านหนังสือ และการถ่ายภาพ กำลังมองหาคนที่เข้าใจและสนใจในสิ่งเดียวกัน',
      location: 'กรุงเทพมหานคร',
      occupation: {
        job: 'โปรแกรมเมอร์',
        company: 'Tech Company'
      },
      education: {
        level: 'bachelor',
        institution: 'มหาวิทยาลัยธรรมศาสตร์'
      },
      physicalAttributes: {
        height: 175,
        weight: 70
      },
      religion: 'buddhist',
      languages: ['thai', 'english'],
      pets: {
        hasPets: true,
        petTypes: ['dog']
      },
      lifestyle: {
        smoking: 'never',
        drinking: 'occasionally',
        exercise: 'regularly',
        diet: 'omnivore',
        sleepSchedule: 'flexible',
        travel: 'love_travel',
        children: 'open_to_children'
      },
      interests: [
        {
          category: 'sports',
          items: ['ฟุตบอล', 'วิ่ง', 'ว่ายน้ำ']
        },
        {
          category: 'music',
          items: ['ป็อป', 'ร็อค', 'แจ๊ส']
        },
        {
          category: 'travel',
          items: ['เที่ยวต่างประเทศ', 'ถ่ายภาพ', 'เรียนรู้วัฒนธรรม']
        }
      ],
      promptAnswers: [
        {
          question: 'my_special_talent',
          answer: 'สามารถเล่นกีตาร์และร้องเพลงได้'
        },
        {
          question: 'way_to_win_my_heart',
          answer: 'การสนทนาที่มีความหมายและเข้าใจกัน'
        },
        {
          question: 'dream_destination',
          answer: 'ญี่ปุ่น - เพื่อดูซากุระและเรียนรู้วัฒนธรรม'
        }
      ],
      profileImages: [
        'https://placehold.co/500x600/6366f1/ffffff?text=Profile+1',
        'https://placehold.co/500x600/8b5cf6/ffffff?text=Profile+2',
        'https://placehold.co/500x600/06b6d4/ffffff?text=Profile+3'
      ],
      isVerified: true,
      membership: {
        tier: 'diamond',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 วัน
        autoRenew: true
      },
      coins: 1000,
      votePoints: 500,
      isOnline: true,
      lastActive: new Date(),
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // กรุงเทพมหานคร
      },
      role: 'user'
    });

    // บันทึก user
    const savedUser = await sampleUser.save();
    console.log('✅ Created user profile successfully!');
    console.log('User ID:', savedUser._id);
    console.log('Username:', savedUser.username);
    console.log('Email:', savedUser.email);

    // สร้าง admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123', // เพิ่ม password
      firstName: 'แอดมิน',
      lastName: 'ระบบ',
      displayName: 'แอดมินระบบ',
      nickname: 'แอดมิน',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      lookingFor: 'female',
      bio: 'แอดมินของระบบ sodeclick',
      location: 'กรุงเทพมหานคร',
      occupation: {
        job: 'System Administrator',
        company: 'Sodeclick'
      },
      education: {
        level: 'master',
        institution: 'มหาวิทยาลัยมหิดล'
      },
      physicalAttributes: {
        height: 180,
        weight: 75
      },
      religion: 'buddhist',
      languages: ['thai', 'english'],
      pets: {
        hasPets: false
      },
      lifestyle: {
        smoking: 'never',
        drinking: 'never',
        exercise: 'regularly',
        diet: 'omnivore',
        sleepSchedule: 'flexible',
        travel: 'occasional_travel',
        children: 'open_to_children'
      },
      interests: [
        {
          category: 'technology',
          items: ['การเขียนโปรแกรม', 'AI', 'Machine Learning']
        },
        {
          category: 'music',
          items: ['คลาสสิค', 'แจ๊ส']
        }
      ],
      profileImages: [
        'https://placehold.co/500x600/ef4444/ffffff?text=Admin+Profile'
      ],
      isVerified: true,
      membership: {
        tier: 'platinum',
        startDate: new Date(),
        autoRenew: true
      },
      coins: 9999,
      votePoints: 9999,
      isOnline: true,
      lastActive: new Date(),
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // กรุงเทพมหานคร
      },
      role: 'admin'
    });

    const savedAdmin = await adminUser.save();
    console.log('✅ Created admin user successfully!');
    console.log('Admin ID:', savedAdmin._id);
    console.log('Admin Username:', savedAdmin.username);

    console.log('\n🎉 Script completed successfully!');
    console.log('You can now test the profile API with these user IDs:');
    console.log('Regular User ID:', savedUser._id);
    console.log('Admin User ID:', savedAdmin._id);

  } catch (error) {
    console.error('❌ Error creating user profile:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// รัน script
createUserProfile();
