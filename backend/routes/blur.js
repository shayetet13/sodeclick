const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const BlurTransaction = require('../models/BlurTransaction');
const { auth: authenticateToken } = require('../middleware/auth');

// GET /api/blur/user/:userId - ดูรูปที่เบลอของผู้ใช้
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { viewerId } = req.query; // ผู้ที่ต้องการดูรูป

    const user = await User.findById(userId).select('profileImages username displayName');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // กรองรูปที่เบลอ
    const blurredImages = user.profileImages.filter(img => img.isBlurred);

    // ถ้ามี viewerId ให้เช็คว่าซื้อรูปไหนไปแล้วบ้าง
    let purchasedImages = [];
    if (viewerId) {
      const transactions = await BlurTransaction.find({
        buyer: viewerId,
        imageOwner: userId,
        status: 'completed'
      }).select('imageId');
      
      purchasedImages = transactions.map(t => t.imageId);
    }

    // เตรียมข้อมูลรูป
    const imageData = blurredImages.map(img => ({
      id: img._id.toString(),
      url: img.url,
      isBlurred: true,
      isPurchased: purchasedImages.includes(img._id.toString()),
      cost: 10000 // ราคาคงที่ 10,000 เหรียญ
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName
        },
        images: imageData,
        totalBlurredImages: blurredImages.length
      }
    });

  } catch (error) {
    console.error('Error fetching blurred images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blurred images',
      error: error.message
    });
  }
});

// POST /api/blur/purchase - ซื้อรูปที่เบลอ
router.post('/purchase', async (req, res) => {
  try {
    const { buyerId, imageOwnerId, imageId } = req.body;

    if (!buyerId || !imageOwnerId || !imageId) {
      return res.status(400).json({
        success: false,
        message: 'Buyer ID, Image Owner ID, and Image ID are required'
      });
    }

    // ตรวจสอบว่าซื้อแล้วหรือยัง
    const existingTransaction = await BlurTransaction.findOne({
      buyer: buyerId,
      imageOwner: imageOwnerId,
      imageId: imageId,
      status: 'completed'
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Image already purchased'
      });
    }

    // ดึงข้อมูลผู้ซื้อและเจ้าของรูป
    const [buyer, imageOwner] = await Promise.all([
      User.findById(buyerId),
      User.findById(imageOwnerId)
    ]);

    if (!buyer || !imageOwner) {
      return res.status(404).json({
        success: false,
        message: 'Buyer or image owner not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (buyerId === imageOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot purchase your own image'
      });
    }

    // ค้นหารูปที่ต้องการซื้อ
    const targetImage = imageOwner.profileImages.find(
      img => img._id.toString() === imageId && img.isBlurred
    );

    if (!targetImage) {
      return res.status(404).json({
        success: false,
        message: 'Blurred image not found'
      });
    }

    const cost = 10000;
    const ownerShare = 5000;
    const systemShare = 5000;

    // ตรวจสอบยอดเหรียญ
    if (buyer.coins < cost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: cost,
        current: buyer.coins
      });
    }

    // ทำธุรกรรม
    buyer.coins -= cost;
    imageOwner.coins += ownerShare;

    // บันทึกธุรกรรม
    const transaction = new BlurTransaction({
      buyer: buyerId,
      imageOwner: imageOwnerId,
      imageId: imageId,
      imageUrl: targetImage.url,
      cost: cost,
      ownerShare: ownerShare,
      systemShare: systemShare,
      status: 'completed',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // บันทึกทุกอย่าง
    await Promise.all([
      buyer.save(),
      imageOwner.save(),
      transaction.save()
    ]);

    res.json({
      success: true,
      message: 'Image purchased successfully',
      data: {
        transaction: {
          id: transaction._id,
          cost: cost,
          ownerShare: ownerShare,
          systemShare: systemShare
        },
        buyer: {
          remainingCoins: buyer.coins
        },
        imageOwner: {
          earnedCoins: ownerShare,
          totalCoins: imageOwner.coins
        },
        image: {
          id: imageId,
          url: targetImage.url
        }
      }
    });

  } catch (error) {
    console.error('Error purchasing blurred image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase image',
      error: error.message
    });
  }
});

// GET /api/blur/transactions/:userId - ดูประวัติการซื้อ/ขาย
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (type === 'purchases') {
      query.buyer = userId;
    } else if (type === 'sales') {
      query.imageOwner = userId;
    } else {
      query = {
        $or: [
          { buyer: userId },
          { imageOwner: userId }
        ]
      };
    }

    const [transactions, total] = await Promise.all([
      BlurTransaction.find(query)
        .populate('buyer', 'username displayName')
        .populate('imageOwner', 'username displayName')
        .sort({ purchasedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      BlurTransaction.countDocuments(query)
    ]);

    // สรุปสถิติ
    const stats = await BlurTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$buyer', mongoose.Types.ObjectId(userId)] },
                '$cost',
                0
              ]
            }
          },
          totalEarned: {
            $sum: {
              $cond: [
                { $eq: ['$imageOwner', mongoose.Types.ObjectId(userId)] },
                '$ownerShare',
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.buyer._id.toString() === userId ? 'purchase' : 'sale',
          buyer: {
            id: t.buyer._id,
            username: t.buyer.username,
            displayName: t.buyer.displayName
          },
          imageOwner: {
            id: t.imageOwner._id,
            username: t.imageOwner.username,
            displayName: t.imageOwner.displayName
          },
          cost: t.cost,
          ownerShare: t.ownerShare,
          imageUrl: t.imageUrl,
          purchasedAt: t.purchasedAt,
          status: t.status
        })),
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        },
        stats: stats[0] || {
          totalTransactions: 0,
          totalSpent: 0,
          totalEarned: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching blur transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
});

// GET /api/blur/stats - สถิติรวมของระบบ
router.get('/stats', async (req, res) => {
  try {
    const stats = await BlurTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$systemShare' },
          totalCoinsCirculated: { $sum: '$cost' },
          averageTransaction: { $avg: '$cost' }
        }
      }
    ]);

    const topBuyers = await BlurTransaction.aggregate([
      {
        $group: {
          _id: '$buyer',
          totalSpent: { $sum: '$cost' },
          totalPurchases: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          displayName: '$user.displayName',
          totalSpent: 1,
          totalPurchases: 1
        }
      }
    ]);

    const topSellers = await BlurTransaction.aggregate([
      {
        $group: {
          _id: '$imageOwner',
          totalEarned: { $sum: '$ownerShare' },
          totalSales: { $sum: 1 }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          displayName: '$user.displayName',
          totalEarned: 1,
          totalSales: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalTransactions: 0,
          totalRevenue: 0,
          totalCoinsCirculated: 0,
          averageTransaction: 0
        },
        topBuyers,
        topSellers
      }
    });

  } catch (error) {
    console.error('Error fetching blur stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// POST /api/blur/pay - จ่ายเหรียญเพื่อดูรูปเบลอ (สำหรับการ์ดโปรไฟล์)
router.post('/pay', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, amount } = req.body;
    const payerId = req.user.id;

    console.log('💰 Blur payment request:', {
      payerId,
      targetUserId,
      amount,
      timestamp: new Date().toISOString()
    });

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!targetUserId || !amount) {
      console.log('❌ Missing required data:', { targetUserId, amount });
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }
    console.log('✅ Data validation passed');

    // ตรวจสอบจำนวนเหรียญ
    if (amount !== 10000) {
      console.log('❌ Invalid amount:', { amount, expected: 10000 });
      return res.status(400).json({
        success: false,
        message: 'จำนวนเหรียญไม่ถูกต้อง ต้องเป็น 10,000 เหรียญ'
      });
    }
    console.log('✅ Amount validation passed');

    // ตรวจสอบว่าไม่ใช่การจ่ายให้ตัวเอง
    if (payerId === targetUserId) {
      console.log('❌ Self payment attempt:', { payerId, targetUserId });
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถจ่ายเหรียญให้ตัวเองได้'
      });
    }
    console.log('✅ Self payment check passed');

    // ดึงข้อมูลผู้จ่าย
    const payer = await User.findById(payerId);
    if (!payer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    console.log('💰 Checking payer coins:', {
      payerId,
      payerCoins: payer.coins,
      requiredAmount: amount,
      hasEnoughCoins: (payer.coins || 0) >= amount
    });

    // ตรวจสอบยอดเหรียญ
    if ((payer.coins || 0) < amount) {
      console.log('❌ Insufficient coins:', {
        currentCoins: payer.coins || 0,
        required: amount,
        difference: amount - (payer.coins || 0)
      });
      
      return res.status(400).json({
        success: false,
        message: 'เหรียญไม่เพียงพอ',
        data: {
          currentCoins: payer.coins || 0,
          required: amount
        }
      });
    }

    // ดึงข้อมูลผู้รับ
    const target = await User.findById(targetUserId);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ต้องการจ่าย'
      });
    }

    // ตรวจสอบว่าเคยจ่ายแล้วหรือไม่
    const existingPayment = payer.blurImagePurchases || [];
    const alreadyPaid = existingPayment.includes(targetUserId);
    
    if (alreadyPaid) {
      return res.status(400).json({
        success: false,
        message: 'คุณได้จ่ายเหรียญเพื่อดูรูปของผู้ใช้นี้แล้ว'
      });
    }

    // ดึงข้อมูล admin - ลองหาหลายแบบ
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      // ถ้าไม่พบ admin ให้ลองหา admin อื่น ๆ
      admin = await User.findOne({ 
        $or: [
          { username: 'admin' },
          { email: { $regex: /admin/i } },
          { isAdmin: true }
        ]
      });
      console.log('👑 Admin search fallback:', {
        adminFound: !!admin,
        criteria: 'username/email/isAdmin'
      });
    }
    
    if (!admin) {
      // ถ้ายังไม่พบ ให้สร้าง default admin account
      console.log('🔧 Creating default admin account...');
      admin = new User({
        username: 'system_admin',
        email: 'admin@system.local',
        role: 'admin',
        coins: 0,
        firstName: 'System',
        lastName: 'Admin',
        password: 'temp_password_' + Date.now() // temporary password
      });
      await admin.save();
      console.log('✅ Created default admin:', admin._id);
    }
    
    console.log('👑 Final admin user:', {
      adminFound: !!admin,
      adminId: admin?._id,
      adminCoins: admin?.coins,
      adminRole: admin?.role
    });

    // คำนวณการแบ่งเหรียญ
    const targetShare = 5000; // 50% ไปให้เจ้าของโปรไฟล์
    const adminShare = 5000;  // 50% ไปให้ admin

    console.log('💰 Payment calculation:', {
      totalAmount: amount,
      targetShare,
      adminShare,
      payerCurrentCoins: payer.coins,
      targetCurrentCoins: target.coins,
      adminCurrentCoins: admin.coins
    });

    // อัพเดทข้อมูลผู้จ่าย
    const updatedPayer = await User.findByIdAndUpdate(
      payerId,
      {
        $inc: { coins: -amount },
        $addToSet: { blurImagePurchases: targetUserId }
      },
      { new: true }
    );

    // อัพเดทข้อมูลผู้รับ
    const updatedTarget = await User.findByIdAndUpdate(
      targetUserId,
      {
        $inc: { coins: targetShare }
      },
      { new: true }
    );

    // อัพเดทข้อมูล admin
    const updatedAdmin = await User.findByIdAndUpdate(
      admin._id,
      {
        $inc: { coins: adminShare }
      },
      { new: true }
    );

    console.log('💰 Coin updates completed:', {
      payer: {
        id: payerId,
        coinsBefore: payer.coins,
        coinsAfter: updatedPayer.coins,
        difference: updatedPayer.coins - payer.coins
      },
      target: {
        id: targetUserId,
        coinsBefore: target.coins,
        coinsAfter: updatedTarget.coins,
        difference: updatedTarget.coins - target.coins
      },
      admin: {
        id: admin._id,
        coinsBefore: admin.coins,
        coinsAfter: updatedAdmin.coins,
        difference: updatedAdmin.coins - admin.coins
      }
    });

    console.log('✅ Payment completed successfully:', {
      payerId,
      targetUserId,
      amount,
      targetShare,
      adminShare,
      payerRemainingCoins: updatedPayer.coins
    });

    // บันทึกประวัติการทำธุรกรรม
    try {
      const transaction = new BlurTransaction({
        buyer: payerId,
        imageOwner: targetUserId,
        imageId: `profile_unlock_${payerId}_${targetUserId}`, // สร้าง unique ID
        imageUrl: 'profile_unlock', // ใช้ค่าพิเศษสำหรับการปลดล็อคทั้งโปรไฟล์
        cost: amount,
        ownerShare: targetShare,
        systemShare: adminShare,
        status: 'completed',
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          type: 'profile_unlock' // ระบุว่าเป็นการปลดล็อคโปรไฟล์
        }
      });
      
      await transaction.save();
      console.log('📝 Transaction record saved:', transaction._id);
    } catch (transactionError) {
      console.error('❌ Failed to save transaction record:', transactionError);
      console.error('❌ Transaction error details:', transactionError.message);
      // ไม่ return error เพื่อไม่ให้กระทบกับการทำธุรกรรมหลัก
    }

    res.json({
      success: true,
      message: 'จ่ายเหรียญสำเร็จ',
      data: {
        remainingCoins: updatedPayer.coins,
        paidAmount: amount,
        targetUserId: targetUserId,
        targetUserName: target.firstName || target.username || 'ไม่ระบุชื่อ',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in blur payment:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
});

// GET /api/blur/purchases - ดูรายการที่จ่ายแล้ว
router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('blurImagePurchases', 'firstName lastName username profileImages')
      .select('blurImagePurchases');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    res.json({
      success: true,
      data: {
        purchases: user.blurImagePurchases || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting blur purchases:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
});

module.exports = router;
