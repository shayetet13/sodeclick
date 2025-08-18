const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'ไม่พบ token การยืนยันตัวตน'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token ไม่ถูกต้อง'
      });
    }
    req.user = user;
    next();
  });
};

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ใช้ absolute path เพื่อให้แน่ใจว่าไฟล์ถูกบันทึกในตำแหน่งที่ถูกต้อง
    const uploadPath = path.join(__dirname, '..', 'uploads', 'profiles');
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF)'));
    }
  }
});

// GET /api/profile/search - ค้นหาโปรไฟล์ (ต้องมาก่อน :userId)
router.get('/search', async (req, res) => {
  try {
    const {
      ageMin = 18,
      ageMax = 100,
      gender,
      location,
      interests,
      lifestyle,
      page = 1,
      limit = 20
    } = req.query;

    const query = {
      isActive: true,
      isBanned: false
    };

    if (gender) {
      query.gender = gender;
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (interests) {
      const interestArray = interests.split(',');
      query['interests.category'] = { $in: interestArray };
    }
    if (lifestyle) {
      const lifestyleFilters = JSON.parse(lifestyle);
      Object.keys(lifestyleFilters).forEach(key => {
        query[`lifestyle.${key}`] = lifestyleFilters[key];
      });
    }

    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('firstName lastName nickname age gender location profileImages bio interests lifestyle membership')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastActive: -1 });

    const filteredUsers = users.filter(user => {
      const userAge = user.age;
      return userAge >= ageMin && userAge <= ageMax;
    });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users: filteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error searching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถค้นหาโปรไฟล์ได้',
      error: error.message
    });
  }
});

// GET /api/profile/premium - รายชื่อสมาชิกระดับ Premium ตามลำดับ tier
router.get('/premium', async (req, res) => {
  try {
    const tiers = ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver']
    const limit = parseInt(req.query.limit || '20')

    const users = await User.aggregate([
      {
        $match: {
          isActive: true,
          isBanned: false,
          'membership.tier': { $in: tiers }
        }
      },
      {
        $addFields: {
          tierRank: { $indexOfArray: [ tiers, '$membership.tier' ] }
        }
      },
      { $sort: { tierRank: 1, lastActive: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          displayName: 1,
          nickname: 1,
          location: 1,
          profileImages: 1,
          membership: 1,
          lastActive: 1,
          gender: 1,
          dateOfBirth: 1
        }
      }
    ])

    res.json({ success: true, data: { users } })
  } catch (error) {
    console.error('Error fetching premium profiles:', error)
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงรายชื่อพรีเมียมได้', error: error.message })
  }
})

// GET /api/profile/:userId - ดึงข้อมูลโปรไฟล์ผู้ใช้
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ตรวจสอบ token ถ้ามี (สำหรับการตรวจสอบสิทธิ์)
    let currentUser = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUser = decoded;
      } catch (error) {
        // Token ไม่ถูกต้อง แต่ยังสามารถดูโปรไฟล์ได้
        console.log('Invalid token, but allowing profile view');
      }
    }
    
    const user = await User.findById(userId).select('-password -phoneVerificationCode -phoneVerificationExpires -loginHistory');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // ตรวจสอบสิทธิ์การเข้าถึงโปรไฟล์
    const isOwnProfile = currentUser && currentUser.id === userId;
    const isAdmin = currentUser && ['admin', 'superadmin'].includes(currentUser.role);

    // ถ้าไม่ใช่โปรไฟล์ของตัวเองและไม่ใช่ admin ให้ซ่อนข้อมูลส่วนตัวบางส่วน
    let profileData = user.toObject();
    if (!isOwnProfile && !isAdmin) {
      delete profileData.email;
      delete profileData.phone;
      delete profileData.preferences;
      delete profileData.dailyUsage;
      delete profileData.coins;
      delete profileData.votePoints;
    }

    res.json({
      success: true,
      data: {
        profile: profileData,
        isOwnProfile,
        age: user.age
      }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้',
      error: error.message
    });
  }
});

// PUT /api/profile/:userId - อัปเดตข้อมูลโปรไฟล์
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ตรวจสอบสิทธิ์
    if (req.user.id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์แก้ไขโปรไฟล์นี้'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    const {
      nickname,
      bio,
      location,
      occupation,
      education,
      physicalAttributes,
      religion,
      languages,
      pets,
      lifestyle,
      interests,
      promptAnswers
    } = req.body;

    // อัปเดตข้อมูลที่อนุญาต
    const updateData = {};
    
    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (education !== undefined) updateData.education = education;
    if (physicalAttributes !== undefined) updateData.physicalAttributes = physicalAttributes;
    if (religion !== undefined) {
      if (religion === '') {
        // Don't set religion if it's empty string
      } else {
        updateData.religion = religion;
      }
    }
    if (languages !== undefined) updateData.languages = languages;
    if (pets !== undefined) updateData.pets = pets;
    if (lifestyle !== undefined) updateData.lifestyle = lifestyle;
    if (interests !== undefined) updateData.interests = interests;
    if (promptAnswers !== undefined) updateData.promptAnswers = promptAnswers;

    // ทำความสะอาดข้อมูลก่อนอัปเดต
    if (updateData.physicalAttributes) {
      // แปลง height และ weight เป็น Number
      if (updateData.physicalAttributes.height !== undefined && updateData.physicalAttributes.height !== '') {
        updateData.physicalAttributes.height = Number(updateData.physicalAttributes.height);
      }
      if (updateData.physicalAttributes.weight !== undefined && updateData.physicalAttributes.weight !== '') {
        updateData.physicalAttributes.weight = Number(updateData.physicalAttributes.weight);
      }
    }

    // แปลง religion enum values
    if (updateData.religion) {
      const religionMapping = {
        'buddhism': 'buddhist',
        'christianity': 'christian',
        'islam': 'muslim',
        'hinduism': 'hindu',
        'other': 'other',
        'none': 'none'
      };
      if (religionMapping[updateData.religion]) {
        updateData.religion = religionMapping[updateData.religion];
      }
    }

    // แปลง languages enum values
    if (updateData.languages && Array.isArray(updateData.languages)) {
      const languageMapping = {
        'ไทย': 'thai',
        'อังกฤษ': 'english',
        'จีน': 'chinese',
        'ญี่ปุ่น': 'japanese',
        'เกาหลี': 'korean',
        'อื่นๆ': 'other'
      };
      updateData.languages = updateData.languages.map(lang => languageMapping[lang] || lang);
    }

    // แปลง education level enum values
    if (updateData.education && updateData.education.level && updateData.education.level !== '') {
      const educationMapping = {
        'high_school': 'high_school',
        'bachelor': 'bachelor',
        'master': 'master',
        'phd': 'doctorate',
        'vocational': 'diploma',
        'other': 'other'
      };
      if (educationMapping[updateData.education.level]) {
        updateData.education.level = educationMapping[updateData.education.level];
      }
    } else if (updateData.education && updateData.education.level === '') {
      // ลบ education level ถ้าเป็นค่าว่าง
      delete updateData.education.level;
    }

    // แปลง lifestyle enum values
    if (updateData.lifestyle) {
      if (updateData.lifestyle.smoking && updateData.lifestyle.smoking !== '') {
        const smokingMapping = {
          'no': 'never',
          'yes': 'regularly',
          'occasionally': 'occasionally',
          'quit': 'trying_to_quit'
        };
        if (smokingMapping[updateData.lifestyle.smoking]) {
          updateData.lifestyle.smoking = smokingMapping[updateData.lifestyle.smoking];
        }
      } else if (updateData.lifestyle.smoking === '') {
        delete updateData.lifestyle.smoking;
      }

      if (updateData.lifestyle.drinking && updateData.lifestyle.drinking !== '') {
        const drinkingMapping = {
          'no': 'never',
          'yes': 'regularly',
          'socially': 'socially',
          'occasionally': 'occasionally'
        };
        if (drinkingMapping[updateData.lifestyle.drinking]) {
          updateData.lifestyle.drinking = drinkingMapping[updateData.lifestyle.drinking];
        }
      } else if (updateData.lifestyle.drinking === '') {
        delete updateData.lifestyle.drinking;
      }

      if (updateData.lifestyle.exercise && updateData.lifestyle.exercise !== '') {
        const exerciseMapping = {
          'never': 'never',
          'rarely': 'rarely',
          'sometimes': 'sometimes',
          'regularly': 'regularly',
          'daily': 'daily'
        };
        if (exerciseMapping[updateData.lifestyle.exercise]) {
          updateData.lifestyle.exercise = exerciseMapping[updateData.lifestyle.exercise];
        }
      } else if (updateData.lifestyle.exercise === '') {
        delete updateData.lifestyle.exercise;
      }

      if (updateData.lifestyle.diet && updateData.lifestyle.diet !== '') {
        const dietMapping = {
          'regular': 'omnivore',
          'vegetarian': 'vegetarian',
          'vegan': 'vegan',
          'halal': 'other',
          'other': 'other'
        };
        if (dietMapping[updateData.lifestyle.diet]) {
          updateData.lifestyle.diet = dietMapping[updateData.lifestyle.diet];
        }
      } else if (updateData.lifestyle.diet === '') {
        delete updateData.lifestyle.diet;
      }
    }

    console.log('Updating user profile with data:', updateData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -loginHistory');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้หลังจากอัปเดต'
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      data: {
        profile: updatedUser
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    // จัดการ validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: validationErrors
      });
    }
    
    // จัดการ cast errors (เช่น invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปเดตโปรไฟล์ได้',
      error: error.message
    });
  }
});

// POST /api/profile/:userId/upload-image - อัปโหลดรูปโปรไฟล์
router.post('/:userId/upload-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // ตรวจสอบสิทธิ์
    if (req.user.id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์อัปโหลดรูปภาพสำหรับโปรไฟล์นี้'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์รูปภาพ'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // เพิ่มรูปภาพใหม่เข้าไปใน profileImages array
    const imagePath = req.file.filename;
    user.profileImages.push(imagePath);

    // จำกัดจำนวนรูปภาพตามระดับสมาชิก
    const limits = user.getMembershipLimits();
    const maxImages = limits.dailyImages === -1 ? 10 : Math.min(limits.dailyImages, 10);
    
    if (user.profileImages.length > maxImages) {
      user.profileImages = user.profileImages.slice(-maxImages);
    }

    await user.save();

    res.json({
      success: true,
      message: 'อัปโหลดรูปภาพสำเร็จ',
      data: {
        imagePath: imagePath,
        profileImages: user.profileImages
      }
    });

  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถอัปโหลดรูปภาพได้',
      error: error.message
    });
  }
});

// DELETE /api/profile/:userId/image/:imageIndex - ลบรูปโปรไฟล์
router.delete('/:userId/image/:imageIndex', authenticateToken, async (req, res) => {
  try {
    const { userId, imageIndex } = req.params;
    
    // ตรวจสอบสิทธิ์
    if (req.user.id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ลบรูปภาพสำหรับโปรไฟล์นี้'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    const index = parseInt(imageIndex);
    if (index < 0 || index >= user.profileImages.length) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรูปภาพที่ต้องการลบ'
      });
    }

    // ลบรูปภาพออกจาก array
    user.profileImages.splice(index, 1);
    await user.save();

    res.json({
      success: true,
      message: 'ลบรูปภาพสำเร็จ',
      data: {
        profileImages: user.profileImages
      }
    });

  } catch (error) {
    console.error('Error deleting profile image:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถลบรูปภาพได้',
      error: error.message
    });
  }
});

// GET /api/profile/:userId/compatibility/:targetUserId - ตรวจสอบความเข้ากันได้
router.get('/:userId/compatibility/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { userId, targetUserId } = req.params;
    
    // ตรวจสอบสิทธิ์
    if (req.user.id !== userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
      });
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (!user || !targetUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // คำนวณความเข้ากันได้
    let compatibilityScore = 0;
    const factors = [];

    // ตรวจสอบความเข้ากันได้ด้านอายุ
    const ageDiff = Math.abs(user.age - targetUser.age);
    if (ageDiff <= 5) {
      compatibilityScore += 20;
      factors.push({ factor: 'อายุใกล้เคียงกัน', score: 20 });
    } else if (ageDiff <= 10) {
      compatibilityScore += 10;
      factors.push({ factor: 'อายุค่อนข้างใกล้เคียง', score: 10 });
    }

    // ตรวจสอบความเข้ากันได้ด้านไลฟ์สไตล์
    if (user.lifestyle && targetUser.lifestyle) {
      if (user.lifestyle.smoking === targetUser.lifestyle.smoking) {
        compatibilityScore += 15;
        factors.push({ factor: 'ทัศนคติเรื่องการสูบบุหรี่เหมือนกัน', score: 15 });
      }
      
      if (user.lifestyle.drinking === targetUser.lifestyle.drinking) {
        compatibilityScore += 15;
        factors.push({ factor: 'ทัศนคติเรื่องการดื่มสุราเหมือนกัน', score: 15 });
      }

      if (user.lifestyle.exercise === targetUser.lifestyle.exercise) {
        compatibilityScore += 10;
        factors.push({ factor: 'รูปแบบการออกกำลังกายเหมือนกัน', score: 10 });
      }
    }

    // ตรวจสอบความเข้ากันได้ด้านความสนใจ
    if (user.interests && targetUser.interests && user.interests.length > 0 && targetUser.interests.length > 0) {
      const userInterestCategories = user.interests.map(i => i.category);
      const targetInterestCategories = targetUser.interests.map(i => i.category);
      const commonInterests = userInterestCategories.filter(cat => targetInterestCategories.includes(cat));
      
      const interestScore = Math.min(commonInterests.length * 5, 25);
      compatibilityScore += interestScore;
      if (interestScore > 0) {
        factors.push({ factor: `มีความสนใจร่วมกัน ${commonInterests.length} ด้าน`, score: interestScore });
      }
    }

    // ตรวจสอบความเข้ากันได้ด้านศาสนา
    if (user.religion && targetUser.religion && user.religion === targetUser.religion) {
      compatibilityScore += 15;
      factors.push({ factor: 'ศาสนาเดียวกัน', score: 15 });
    }

    // จำกัดคะแนนสูงสุดที่ 100
    compatibilityScore = Math.min(compatibilityScore, 100);

    res.json({
      success: true,
      data: {
        compatibilityScore,
        factors,
        level: compatibilityScore >= 80 ? 'excellent' : 
               compatibilityScore >= 60 ? 'good' : 
               compatibilityScore >= 40 ? 'fair' : 'low'
      }
    });

  } catch (error) {
    console.error('Error calculating compatibility:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถคำนวณความเข้ากันได้',
      error: error.message
    });
  }
});

// (moved to top to avoid route conflict with :userId)

module.exports = router;