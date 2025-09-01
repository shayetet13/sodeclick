const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-2024';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location 
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว'
      });
    }

    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    if (actualAge < 18) {
      return res.status(400).json({
        success: false,
        message: 'คุณต้องมีอายุ 18 ปีขึ้นไป'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      lookingFor,
      location,
      role: 'user', // กำหนดสิทธิ์เป็น user เท่านั้น
      coordinates: {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates, can be updated later
      },
      displayName: `${firstName} ${lastName}`,
      membership: {
        tier: 'member',
        startDate: new Date()
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'email',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: error.message
    });
  }
});

// Register with phone (ไม่ต้องใช้ OTP)
router.post('/register-phone', async (req, res) => {
  try {
    const { 
      phone, 
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location 
    } = req.body;

    // Validate required fields
    if (!phone || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'เบอร์โทรนี้ได้ถูกใช้งานแล้ว'
      });
    }

    // Generate username from phone (remove first 0, add prefix)
    const username = 'user_' + phone.replace(/^0/, '');

    // Create new user
    const newUser = new User({
      username,
      email: `${username}@temp.com`, // Generate temporary email
      phone,
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      lookingFor,
      location,
      role: 'user', // กำหนดสิทธิ์เป็น user เท่านั้น
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // Default Bangkok coordinates
      },
      coins: 1000, // เริ่มต้น 1000 coins
      votes: 100,  // เริ่มต้น 100 votes
      membership: {
        tier: 'member',
        startDate: new Date(),
        endDate: null,
        autoRenew: false,
        planId: null
      },
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      }
    });

    await newUser.save();

    // Generate JWT token
    const token = generateToken(newUser);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      data: {
        token,
        user: newUser.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Phone register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
  }
});

// Login with email/password
// Login with phone (ไม่ต้องใช้ OTP)
router.post('/login-phone', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์'
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้นี้'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return success response
    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log('🔐 Login attempt:', { email, username, hasPassword: !!password });

    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสผ่าน'
      });
    }

    if (!email && !username) {
      console.log('❌ No email or username provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลหรือชื่อผู้ใช้'
      });
    }

    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
      console.log('🔍 Finding user by email:', email, 'Found:', !!user);
    } else {
      user = await User.findOne({ username });
      console.log('🔍 Finding user by username:', username, 'Found:', !!user);
    }

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      console.log('❌ User is banned:', user._id);
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณถูกระงับการใช้งาน',
        reason: user.banReason
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User is inactive:', user._id);
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณไม่สามารถใช้งานได้'
      });
    }

    // Verify password
    console.log('🔑 Verifying password for user:', user._id);
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user._id);
      return res.status(401).json({
        success: false,
        message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Generate token
    const token = generateToken(user);
    console.log('✅ Login successful for user:', user._id, 'Token generated:', !!token);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'email',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: error.message
    });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Generate token
      const token = generateToken(user);

      // Update login history
      if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
        timestamp: new Date(),
        method: 'google',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      user.lastLogin = new Date();
      await user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&success=true`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=false&error=oauth_error`);
    }
  }
);

// Phone verification - Send OTP
router.post('/phone/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์'
      });
    }

    // Validate phone number format (Thai)
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists
    let user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ลงทะเบียนด้วยเบอร์โทรศัพท์นี้'
      });
    }

    // Update OTP
    user.phoneVerificationCode = otp;
    user.phoneVerificationExpires = expiresAt;
    await user.save();

    // TODO: Send SMS with OTP
    // For now, just return the OTP (in production, send via SMS service)
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      success: true,
      message: 'ส่งรหัส OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว',
      data: {
        phone,
        expiresIn: 10 * 60 * 1000 // 10 minutes in milliseconds
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง OTP',
      error: error.message
    });
  }
});

// Phone verification - Verify OTP
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์และรหัส OTP'
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // Check if OTP is valid
    if (user.phoneVerificationCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'รหัส OTP ไม่ถูกต้อง'
      });
    }

    // Check if OTP is expired
    if (user.phoneVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'รหัส OTP หมดอายุแล้ว'
      });
    }

    // Verify phone
    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;

    // Generate token
    const token = generateToken(user);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'phone',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'ยืนยันเบอร์โทรศัพท์สำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยัน OTP',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ token'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณไม่สามารถใช้งานได้'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
      error: error.message
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user) {
        user.isOnline = false;
        user.lastActive = new Date();
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      error: error.message
    });
  }
});

// Check if username is available
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const existingUser = await User.findOne({ username });
    
    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้',
      error: error.message
    });
  }
});

// Check if email is available
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const existingUser = await User.findOne({ email });
    
    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล',
      error: error.message
    });
  }
});

module.exports = router;
