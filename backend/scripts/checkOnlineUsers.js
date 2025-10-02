const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load environment variables - try .env.production first, then env.production
const envPath = path.resolve(__dirname, '../.env.production');
const envPath2 = path.resolve(__dirname, '../env.production');
const fs = require('fs');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else if (fs.existsSync(envPath2)) {
  require('dotenv').config({ path: envPath2 });
} else {
  console.warn('⚠️ No production environment file found, using default .env');
  require('dotenv').config();
}

/**
 * Script สำหรับตรวจสอบ online users ในฐานข้อมูล
 */

async function checkOnlineUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // นับจำนวน users ทั้งหมด
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);

    // นับจำนวน online users
    const onlineUsers = await User.find({ isOnline: true })
      .select('_id username displayName email isOnline lastActive createdAt')
      .sort({ lastActive: -1 })
      .lean();

    console.log(`\n🟢 Online users: ${onlineUsers.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (onlineUsers.length > 0) {
      const now = Date.now();
      onlineUsers.forEach((user, index) => {
        const lastActive = new Date(user.lastActive);
        const timeDiff = Math.floor((now - lastActive.getTime()) / 1000 / 60);
        const isGhost = timeDiff > 10;
        
        console.log(`${index + 1}. ${user.displayName || user.username} (${user.email})`);
        console.log(`   Last Active: ${lastActive.toISOString()} (${timeDiff} minutes ago)${isGhost ? ' 👻 GHOST' : ''}`);
        console.log(`   Status: 🟢 Online`);
      });
    } else {
      console.log('No users are currently online');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // นับจำนวน ghost users
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const ghostCount = await User.countDocuments({
      isOnline: true,
      lastActive: { $lt: tenMinutesAgo }
    });

    console.log(`\n👻 Ghost users (online but inactive > 10 min): ${ghostCount}`);

    // แสดงสถิติเพิ่มเติม
    const activeUsers = await User.countDocuments({
      isActive: true,
      isBanned: false
    });
    console.log(`✅ Active users (not banned): ${activeUsers}`);

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentlyActive = await User.countDocuments({
      lastActive: { $gte: lastHour }
    });
    console.log(`⏰ Users active in last hour: ${recentlyActive}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error checking online users:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
checkOnlineUsers();

