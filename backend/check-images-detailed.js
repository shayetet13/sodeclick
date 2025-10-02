const mongoose = require('mongoose');
require('dotenv').config({ path: './env.development' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');

  const User = require('./models/User');

  // หาผู้ใช้ทั้งหมดที่มี profileImages
  const usersWithImages = await User.find({ profileImages: { $exists: true, $ne: [] } }).limit(20);

  console.log(`Found ${usersWithImages.length} users with profile images`);

  let svgCount = 0;
  let cloudinaryCount = 0;
  let localCount = 0;
  let blurredCount = 0;

  usersWithImages.forEach((user, index) => {
    console.log(`\n=== User ${index + 1}: ${user._id} ===`);
    console.log('Display Name:', user.displayName || user.username);
    console.log('Profile Images Count:', user.profileImages?.length || 0);
    console.log('Main Image Index:', user.mainProfileImageIndex);

    // ตรวจสอบแต่ละรูปภาพ
    if (Array.isArray(user.profileImages)) {
      user.profileImages.forEach((img, imgIndex) => {
        if (typeof img === 'string') {
          console.log(`  Image ${imgIndex}: ${img.substring(0, 100)}...`);
          if (img.startsWith('data:image/svg+xml')) {
            console.log(`    🚨 SVG PLACEHOLDER DETECTED!`);
            svgCount++;
          } else if (img.includes('cloudinary.com')) {
            console.log(`    ☁️ Cloudinary URL`);
            cloudinaryCount++;
          } else if (img.startsWith('users/')) {
            console.log(`    📁 Local file path`);
            localCount++;
          } else {
            console.log(`    ❓ Unknown format`);
          }
        } else if (typeof img === 'object' && img !== null) {
          console.log(`  Image ${imgIndex}: Object - URL: ${img.url?.substring(0, 100)}...`);
          if (img.isBlurred) {
            console.log(`    🔒 BLURRED IMAGE`);
            blurredCount++;
          }
        }
      });
    }
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`SVG Placeholders: ${svgCount}`);
  console.log(`Cloudinary URLs: ${cloudinaryCount}`);
  console.log(`Local file paths: ${localCount}`);
  console.log(`Blurred images: ${blurredCount}`);

  mongoose.connection.close();
}).catch(console.error);
