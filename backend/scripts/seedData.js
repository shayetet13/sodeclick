const mongoose = require('mongoose');
const { seedMembershipPlans } = require('../seeders/membershipPlans');
const { seedGifts } = require('../seeders/gifts');
const { seedCoinPackages } = require('../seeders/coinPackages');
const User = require('../models/User');
require('dotenv').config();

// สร้างข้อมูลผู้ใช้ตัวอย่าง
const createSampleUsers = async () => {
  try {
    // ลบข้อมูลผู้ใช้เก่า
    await User.deleteMany({});
    
    const sampleUsers = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'john_doe',
        email: 'john@example.com',
        password: 'hashedpassword123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1995-01-15'),
        gender: 'male',
        lookingFor: 'female',
        location: 'Bangkok',
        bio: 'Software developer who loves coffee and hiking. Looking for meaningful connections.',
        membership: { tier: 'member' }, // Fixed: use correct structure
        coins: 2500,
        votePoints: 0,
        dailyUsage: {
          chatCount: 3,
          imageUploadCount: 1,
          videoUploadCount: 0,
          lastReset: new Date()
        },
        profileImages: ['https://placehold.co/500x600/6366f1/ffffff?text=John'],
        isVerified: false,
        isOnline: true,
        lastActive: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        username: 'sarah_smith',
        email: 'sarah@example.com',
        password: 'hashedpassword456',
        firstName: 'Sarah',
        lastName: 'Smith',
        dateOfBirth: new Date('1997-03-20'),
        gender: 'female',
        lookingFor: 'male',
        location: 'Bangkok',
        bio: 'Art lover and yoga instructor. Seeking someone with positive energy.',
        membership: { 
          tier: 'gold',
          startDate: new Date(),
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        }, // Fixed: use correct structure
        coins: 15000,
        votePoints: 500,
        dailyUsage: {
          chatCount: 25,
          imageUploadCount: 15,
          videoUploadCount: 5,
          lastReset: new Date()
        },
        profileImages: ['https://placehold.co/500x600/8b5cf6/ffffff?text=Sarah'],
        isVerified: true,
        isOnline: false,
        lastActive: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        username: 'mike_wilson',
        email: 'mike@example.com',
        password: 'hashedpassword789',
        displayName: 'Mike Wilson',
        age: 32,
        gender: 'male',
        location: {
          city: 'Bangkok',
          country: 'Thailand'
        },
        bio: 'Diamond member enjoying all the premium features. Adventure seeker and foodie.',
        interests: ['Adventure', 'Food', 'Travel', 'Photography', 'Scuba Diving'],
        membershipTier: 'diamond',
        membershipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 วันข้างหน้า
        coins: 250000,
        votePoints: 5000,
        dailyUsage: {
          date: new Date(),
          chatsSent: 150,
          imagesUploaded: 50,
          videosUploaded: 20,
          spinWheel: 5,
          lastSpinTime: new Date(Date.now() - 15 * 60 * 1000), // 15 นาทีที่แล้ว
          dailyBonusClaimed: true
        },
        profileImages: [
          {
            url: 'https://placehold.co/500x600/06b6d4/ffffff?text=Mike',
            isMain: true,
            isBlurred: false
          },
          {
            url: 'https://placehold.co/500x600/10b981/ffffff?text=Mike+Travel',
            isMain: false,
            isBlurred: true
          }
        ],
        profileVideos: [
          {
            url: 'https://example.com/video2.mp4',
            thumbnail: 'https://placehold.co/300x200/06b6d4/ffffff?text=Adventure',
            duration: 45
          },
          {
            url: 'https://example.com/video3.mp4',
            thumbnail: 'https://placehold.co/300x200/10b981/ffffff?text=Diving',
            duration: 60
          }
        ],
        pinnedPosts: [],
        createdChatRooms: [],
        privacySettings: {
          hideOnlineStatus: true,
          allowCoinTransfer: true
        },
        isVerified: true,
        verificationBadge: 'diamond',
        isOnline: true,
        lastSeen: new Date(),
        paymentHistory: [
          {
            tier: 'diamond',
            amount: 500,
            currency: 'THB',
            paymentMethod: 'credit_card',
            transactionId: 'tx_diamond_001',
            status: 'completed',
            purchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 วันที่แล้ว
            expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
          }
        ]
      }
    ];

    await User.insertMany(sampleUsers);
    console.log('✅ Sample users created successfully');
    console.log(`📊 Created ${sampleUsers.length} users`);
    
    return sampleUsers;
  } catch (error) {
    console.error('❌ Error creating sample users:', error);
    throw error;
  }
};

// ฟังก์ชันหลักสำหรับ seed ข้อมูล
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // เชื่อมต่อ MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Seed membership plans
    console.log('\n📦 Seeding membership plans...');
    await seedMembershipPlans();
    
    // Seed gifts
    console.log('\n🎁 Seeding gifts...');
    await seedGifts();
    
    // Seed coin packages
    console.log('\n💰 Seeding coin packages...');
    await seedCoinPackages();
    
    // Seed sample users
    console.log('\n👥 Creating sample users...');
    await createSampleUsers();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Membership Plans: 8 plans created');
    console.log('   - Gifts: 20 gifts created');
    console.log('   - Coin Packages: 7 packages created');
    console.log('   - Sample Users: 3 users created');
    console.log('   - Test User ID: 507f1f77bcf86cd799439011 (John Doe - Member)');
    console.log('   - Test User ID: 507f1f77bcf86cd799439012 (Sarah Smith - Gold)');
    console.log('   - Test User ID: 507f1f77bcf86cd799439013 (Mike Wilson - Diamond)');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// เรียกใช้ script ถ้ารันไฟล์นี้โดยตรง
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, createSampleUsers };
