const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function monitorImages() {
  try {
    console.log('🔍 Starting image monitoring...');

    // เชื่อมต่อ MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sodeclick');
    console.log('✅ Connected to MongoDB');

    // ค้นหาผู้ใช้ทั้งหมดที่มี profileImages
    const users = await User.find({ profileImages: { $exists: true, $ne: [] } });

    console.log(`📊 Found ${users.length} users with profile images`);

    let issues = {
      svgPlaceholders: 0,
      emptyImages: 0,
      invalidUrls: 0,
      cloudinaryIssues: 0,
      totalImages: 0
    };

    for (const user of users) {
      if (!Array.isArray(user.profileImages)) continue;

      for (let i = 0; i < user.profileImages.length; i++) {
        const img = user.profileImages[i];
        issues.totalImages++;

        if (typeof img === 'string') {
          // ตรวจสอบ SVG placeholders
          if (img.startsWith('data:image/svg+xml')) {
            issues.svgPlaceholders++;
            console.warn(`🚨 SVG Placeholder found for user ${user._id} at index ${i}: ${img.substring(0, 100)}...`);
          }

          // ตรวจสอบรูปภาพว่าง
          if (img === '' || img === null || img === undefined) {
            issues.emptyImages++;
            console.warn(`🚨 Empty image found for user ${user._id} at index ${i}`);
          }

          // ตรวจสอบ URL ที่ผิดปกติ
          if (img.includes('undefined') || img.includes('null')) {
            issues.invalidUrls++;
            console.warn(`🚨 Invalid URL found for user ${user._id} at index ${i}: ${img}`);
          }

          // ตรวจสอบ Cloudinary URL ที่อาจมีปัญหา
          if (img.includes('cloudinary.com') && !img.startsWith('https://')) {
            issues.cloudinaryIssues++;
            console.warn(`🚨 Cloudinary URL without HTTPS for user ${user._id} at index ${i}: ${img}`);
          }

        } else if (typeof img === 'object' && img !== null) {
          // ตรวจสอบ object ที่มีปัญหา
          if (!img.url || img.url === '') {
            issues.emptyImages++;
            console.warn(`🚨 Empty object image found for user ${user._id} at index ${i}`);
          }

          if (img.url && img.url.startsWith('data:image/svg+xml')) {
            issues.svgPlaceholders++;
            console.warn(`🚨 SVG Placeholder in object found for user ${user._id} at index ${i}`);
          }
        }
      }
    }

    console.log('\n📊 Monitoring Results:');
    console.log(`Total images checked: ${issues.totalImages}`);
    console.log(`SVG Placeholders: ${issues.svgPlaceholders}`);
    console.log(`Empty images: ${issues.emptyImages}`);
    console.log(`Invalid URLs: ${issues.invalidUrls}`);
    console.log(`Cloudinary issues: ${issues.cloudinaryIssues}`);

    if (issues.svgPlaceholders > 0 || issues.emptyImages > 0) {
      console.error('❌ Issues found! Please check the warnings above.');

      // ส่งอีเมลหรือแจ้งเตือน admin (สามารถเพิ่มได้ในอนาคต)
      console.log('📧 Should notify admin about image issues');

      return false; // มีปัญหา
    } else {
      console.log('✅ No issues found. All images are valid.');
      return true; // ไม่มีปัญหา
    }

  } catch (error) {
    console.error('❌ Error during image monitoring:', error);
    return false;
  } finally {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  }
}

// รัน monitoring ถ้าถูกเรียกโดยตรง
if (require.main === module) {
  monitorImages().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { monitorImages };
