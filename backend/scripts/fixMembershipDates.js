const mongoose = require('mongoose');
require('dotenv').config({ path: './env.development' });

// Import models
const User = require('../models/User');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

async function fixMembershipDates() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // หา Premium Members ทั้งหมด
    const premiumUsers = await User.find({
      'membership.tier': { $ne: 'member' }
    });

    console.log(`📊 Found ${premiumUsers.length} Premium Members to check`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of premiumUsers) {
      console.log(`\n🔍 Checking user: ${user.username} (${user.membership.tier})`);
      
      // กำหนดระยะเวลาตาม tier
      let durationDays = 30; // default
      
      switch (user.membership.tier) {
        case 'silver':
          durationDays = 7;
          break;
        case 'gold':
          durationDays = 15;
          break;
        case 'vip':
        case 'vip1':
        case 'vip2':
        case 'diamond':
        case 'platinum':
          durationDays = 30;
          break;
        case 'test':
          durationDays = 1;
          break;
        default:
          durationDays = 30;
      }

      const startDate = user.membership.startDate;
      const currentEndDate = user.membership.endDate;

      if (!startDate) {
        console.log(`⚠️  User ${user.username} has no startDate - setting to current date`);
        user.membership.startDate = new Date();
        user.membership.endDate = new Date(user.membership.startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        await user.save();
        fixedCount++;
        console.log(`✅ Fixed: ${user.username} - New endDate: ${user.membership.endDate.toISOString()}`);
        continue;
      }

      if (!currentEndDate) {
        console.log(`⚠️  User ${user.username} has no endDate - creating from startDate`);
        user.membership.endDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        await user.save();
        fixedCount++;
        console.log(`✅ Fixed: ${user.username} - New endDate: ${user.membership.endDate.toISOString()}`);
        continue;
      }

      // ตรวจสอบว่าระยะเวลาถูกต้องหรือไม่
      const actualDuration = Math.ceil((currentEndDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (actualDuration !== durationDays) {
        console.log(`⚠️  User ${user.username} has wrong duration: ${actualDuration} days vs ${durationDays} days`);
        console.log(`   StartDate: ${startDate.toISOString()}`);
        console.log(`   CurrentEndDate: ${currentEndDate.toISOString()}`);
        
        // สร้าง endDate ใหม่จาก startDate
        const newEndDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
        user.membership.endDate = newEndDate;
        await user.save();
        
        fixedCount++;
        console.log(`✅ Fixed: ${user.username} - New endDate: ${newEndDate.toISOString()}`);
      } else {
        console.log(`✅ User ${user.username} has correct duration: ${actualDuration} days`);
        skippedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Fixed: ${fixedCount} users`);
    console.log(`   Skipped: ${skippedCount} users`);
    console.log(`   Total: ${premiumUsers.length} users`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixMembershipDates();
