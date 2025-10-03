const mongoose = require('mongoose');
require('dotenv').config();

// ทดสอบการยืนยันการชำระเงินและอัปเกรดเหรียญ
async function testPaymentConfirmation() {
  try {
    // เชื่อมต่อฐานข้อมูล
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/love';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import models
    const User = require('./models/User');
    const CoinPackage = require('./models/CoinPackage');

    // สร้าง user สำหรับทดสอบถ้ายังไม่มี
    let testUser = await User.findById('507f1f77bcf86cd799439011');
    if (!testUser) {
      testUser = new User({
        _id: '507f1f77bcf86cd799439011',
        username: 'test_user',
        email: 'test@example.com',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        dateOfBirth: new Date('1995-01-15'),
        gender: 'male',
        lookingFor: 'female',
        location: 'Bangkok, Thailand',
        coordinates: {
          type: 'Point',
          coordinates: [100.5018, 13.7563]
        },
        coins: 1000,
        votePoints: 100,
        membership: { tier: 'member' },
        isVerified: false,
        isOnline: true,
        lastActive: new Date(),
        isActive: true,
        isBanned: false
      });
      await testUser.save();
      console.log('✅ Test user created');
    }

    // สร้าง coin package สำหรับทดสอบถ้ายังไม่มี
    let testPackage = await CoinPackage.findById('507f1f77bcf86cd799439014');
    if (!testPackage) {
      testPackage = new CoinPackage({
        _id: '507f1f77bcf86cd799439014',
        name: 'Test Package',
        description: 'Test package for 20 coins',
        price: 20,
        currency: 'THB',
        rewards: {
          coins: 10000,
          votePoints: 1000,
          bonusPercentage: 0
        },
        isActive: true,
        order: 1
      });
      await testPackage.save();
      console.log('✅ Test coin package created');
    }

    console.log(`\n📊 Test User: ${testUser.displayName}`);
    console.log(`💰 Current coins: ${testUser.coins}`);
    console.log(`🗳️ Current vote points: ${testUser.votePoints}`);

    console.log(`\n📦 Test Package: ${testPackage.name}`);
    console.log(`💰 Price: ${testPackage.price} ${testPackage.currency}`);
    console.log(`🪙 Rewards: ${testPackage.rewards.coins} coins, ${testPackage.rewards.votePoints} vote points`);

    // ทดสอบ API โดยตรง
    const axios = require('axios');

    const testTransactionId = `test_txn_${Date.now()}`;

    const response = await axios.post('http://localhost:5000/api/payment/confirm-payment', {
      transactionId: testTransactionId,
      paymentReference: testTransactionId,
      amount: 20,
      bankId: 'rabbit_gateway',
      planId: '507f1f77bcf86cd799439014',
      planTier: 'coin_package',
      userId: '507f1f77bcf86cd799439011'
    });

    console.log('\n🎉 API Response:');
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);

    if (response.data.data.upgradeResult) {
      console.log('\n📈 Upgrade Result:');
      console.log(`🪙 Coins added: ${response.data.data.upgradeResult.coins}`);
      console.log(`🗳️ Vote points added: ${response.data.data.upgradeResult.votePoints}`);
      console.log(`💰 New total coins: ${response.data.data.upgradeResult.totalCoins}`);
      console.log(`🗳️ New total vote points: ${response.data.data.upgradeResult.totalVotePoints}`);
    }

    // ตรวจสอบข้อมูลผู้ใช้หลังการอัปเกรด
    const updatedUser = await User.findById('507f1f77bcf86cd799439011');
    console.log(`\n✅ Updated User:`);
    console.log(`💰 Final coins: ${updatedUser.coins}`);
    console.log(`🗳️ Final vote points: ${updatedUser.votePoints}`);

    // ตรวจสอบประวัติการชำระเงิน
    if (updatedUser.paymentHistory && updatedUser.paymentHistory.length > 0) {
      const lastPayment = updatedUser.paymentHistory[updatedUser.paymentHistory.length - 1];
      console.log(`\n📋 Latest Payment History:`);
      console.log(`💰 Amount: ${lastPayment.amount} ${lastPayment.currency}`);
      console.log(`💳 Payment Method: ${lastPayment.paymentMethod}`);
      console.log(`🆔 Transaction ID: ${lastPayment.transactionId}`);
      console.log(`📅 Purchase Date: ${lastPayment.purchaseDate}`);
      console.log(`✅ Status: ${lastPayment.status}`);
    } else {
      console.log(`\n📋 No payment history found`);
    }

  } catch (error) {
    console.error('❌ Error testing payment confirmation:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// รัน test
if (require.main === module) {
  testPaymentConfirmation();
}

module.exports = { testPaymentConfirmation };
