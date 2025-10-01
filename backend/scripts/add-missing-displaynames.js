const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sodeclick';

async function addMissingDisplayNames() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ค้นหาผู้ใช้ที่ไม่มี displayName หรือ displayName เป็นค่าว่าง
    const usersWithoutDisplayName = await User.find({
      $or: [
        { displayName: { $exists: false } },
        { displayName: null },
        { displayName: '' }
      ]
    });

    console.log(`\n📊 Found ${usersWithoutDisplayName.length} users without displayName`);

    if (usersWithoutDisplayName.length === 0) {
      console.log('✅ All users already have displayName!');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithoutDisplayName) {
      // สร้าง displayName จาก firstName และ lastName
      if (user.firstName || user.lastName) {
        const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        if (displayName) {
          user.displayName = displayName;
          await user.save();
          console.log(`✅ Updated user ${user._id}: "${user.username}" -> displayName: "${displayName}"`);
          updatedCount++;
        } else {
          // ถ้าไม่มีทั้งชื่อจริงและนามสกุล ให้ใช้ username
          user.displayName = user.username;
          await user.save();
          console.log(`⚠️  User ${user._id} has no name, using username: "${user.username}"`);
          updatedCount++;
        }
      } else {
        // ถ้าไม่มีทั้งชื่อจริงและนามสกุล ให้ใช้ username
        user.displayName = user.username;
        await user.save();
        console.log(`⚠️  User ${user._id} has no name, using username: "${user.username}"`);
        updatedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Updated: ${updatedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);
    console.log(`📈 Total: ${usersWithoutDisplayName.length} users processed`);

    console.log('\n✅ Display names added successfully!');

  } catch (error) {
    console.error('❌ Error adding display names:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
addMissingDisplayNames();

