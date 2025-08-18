const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const premiumUsers = [
  {
    username: 'platinum_user1',
    email: 'platinum1@example.com',
    password: 'password123',
    firstName: 'สมชาย',
    lastName: 'ทองคำ',
    dateOfBirth: '1990-01-15',
    gender: 'male',
    lookingFor: 'female',
    location: 'กรุงเทพมหานคร',
    role: 'user',
    membership: { tier: 'platinum' },
    coins: 5000,
    isActive: true,
    isBanned: false
  },
  {
    username: 'diamond_user1',
    email: 'diamond1@example.com',
    password: 'password123',
    firstName: 'สมหญิง',
    lastName: 'เพชรน้ำค้าง',
    dateOfBirth: '1988-05-20',
    gender: 'female',
    lookingFor: 'male',
    location: 'เชียงใหม่',
    role: 'user',
    membership: { tier: 'diamond' },
    coins: 3000,
    isActive: true,
    isBanned: false
  },
  {
    username: 'vip2_user1',
    email: 'vip2_1@example.com',
    password: 'password123',
    firstName: 'วิชัย',
    lastName: 'วิเศษ',
    dateOfBirth: '1992-08-10',
    gender: 'male',
    lookingFor: 'both',
    location: 'ภูเก็ต',
    role: 'user',
    membership: { tier: 'vip2' },
    coins: 2000,
    isActive: true,
    isBanned: false
  },
  {
    username: 'vip1_user1',
    email: 'vip1_1@example.com',
    password: 'password123',
    firstName: 'วิไล',
    lastName: 'วิเศษ',
    dateOfBirth: '1995-12-25',
    gender: 'female',
    lookingFor: 'male',
    location: 'พัทยา',
    role: 'user',
    membership: { tier: 'vip1' },
    coins: 1500,
    isActive: true,
    isBanned: false
  },
  {
    username: 'vip_user1',
    email: 'vip_1@example.com',
    password: 'password123',
    firstName: 'วีระ',
    lastName: 'วีระ',
    dateOfBirth: '1985-03-30',
    gender: 'male',
    lookingFor: 'female',
    location: 'หาดใหญ่',
    role: 'user',
    membership: { tier: 'vip' },
    coins: 1000,
    isActive: true,
    isBanned: false
  },
  {
    username: 'gold_user1',
    email: 'gold1@example.com',
    password: 'password123',
    firstName: 'ทองคำ',
    lastName: 'ทองคำ',
    dateOfBirth: '1993-07-12',
    gender: 'male',
    lookingFor: 'female',
    location: 'นครราชสีมา',
    role: 'user',
    membership: { tier: 'gold' },
    coins: 500,
    isActive: true,
    isBanned: false
  },
  {
    username: 'silver_user1',
    email: 'silver1@example.com',
    password: 'password123',
    firstName: 'เงิน',
    lastName: 'เงิน',
    dateOfBirth: '1997-11-05',
    gender: 'female',
    lookingFor: 'male',
    location: 'ขอนแก่น',
    role: 'user',
    membership: { tier: 'silver' },
    coins: 200,
    isActive: true,
    isBanned: false
  },
  {
    username: 'platinum_user2',
    email: 'platinum2@example.com',
    password: 'password123',
    firstName: 'พลอย',
    lastName: 'พลอย',
    dateOfBirth: '1989-09-18',
    gender: 'female',
    lookingFor: 'male',
    location: 'ชลบุรี',
    role: 'user',
    membership: { tier: 'platinum' },
    coins: 4500,
    isActive: true,
    isBanned: false
  },
  {
    username: 'diamond_user2',
    email: 'diamond2@example.com',
    password: 'password123',
    firstName: 'ดวง',
    lastName: 'ดวง',
    dateOfBirth: '1991-04-22',
    gender: 'male',
    lookingFor: 'female',
    location: 'สุราษฎร์ธานี',
    role: 'user',
    membership: { tier: 'diamond' },
    coins: 2500,
    isActive: true,
    isBanned: false
  },
  {
    username: 'vip2_user2',
    email: 'vip2_2@example.com',
    password: 'password123',
    firstName: 'วีระ',
    lastName: 'วีระ',
    dateOfBirth: '1994-06-08',
    gender: 'female',
    lookingFor: 'male',
    location: 'นครศรีธรรมราช',
    role: 'user',
    membership: { tier: 'vip2' },
    coins: 1800,
    isActive: true,
    isBanned: false
  }
];

async function createPremiumUsers() {
  try {
    console.log('Creating premium users...');
    
    for (const userData of premiumUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email: userData.email }, { username: userData.username }] 
      });
      
      if (existingUser) {
        console.log(`User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword,
        coordinates: {
          type: 'Point',
          coordinates: [0, 0] // Default coordinates
        }
      });

      await user.save();
      console.log(`Created premium user: ${userData.username} (${userData.membership.tier})`);
    }

    console.log('Premium users creation completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating premium users:', error);
    process.exit(1);
  }
}

createPremiumUsers();
