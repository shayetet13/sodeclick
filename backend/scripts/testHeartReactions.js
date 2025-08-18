const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

async function testHeartReactions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // หาข้อความที่มี reactions
    const messages = await Message.find({ 'reactions.0': { $exists: true } })
      .populate('sender', 'username displayName')
      .populate('reactions.user', 'username displayName')
      .limit(5);

    console.log(`📊 Found ${messages.length} messages with reactions`);

    messages.forEach((message, index) => {
      console.log(`\n📝 Message ${index + 1}:`);
      console.log(`   Content: ${message.content.substring(0, 50)}...`);
      console.log(`   Sender: ${message.sender.displayName || message.sender.username}`);
      console.log(`   Reactions: ${message.reactions.length}`);
      
      message.reactions.forEach((reaction, rIndex) => {
        const user = reaction.user;
        const userName = user.displayName || user.username;
        console.log(`     ${rIndex + 1}. ${reaction.type} by ${userName} (${user._id})`);
      });
    });

    // ทดสอบการเพิ่ม reaction ใหม่
    if (messages.length > 0) {
      const testMessage = messages[0];
      const testUser = await User.findOne({ isActive: true });
      
      if (testUser) {
        console.log(`\n🧪 Testing reaction addition:`);
        console.log(`   Message ID: ${testMessage._id}`);
        console.log(`   User: ${testUser.displayName || testUser.username} (${testUser._id})`);
        
        // เพิ่ม reaction
        testMessage.reactions.push({
          user: testUser._id,
          type: 'heart',
          createdAt: new Date()
        });
        
        testMessage.updateReactionStats();
        await testMessage.save();
        
        console.log(`   ✅ Added heart reaction`);
        console.log(`   Total reactions: ${testMessage.reactions.length}`);
        console.log(`   Heart count: ${testMessage.stats.heartCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing heart reactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testHeartReactions();
