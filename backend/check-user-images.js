const mongoose = require('mongoose');
require('dotenv').config({ path: './env.development' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');

  const User = require('./models/User');

  // ค้นหาผู้ใช้ที่ชื่อ 'อัย 123'
  const user = await User.findOne({ displayName: 'อัย 123' });

  if (user) {
    console.log('Found user:', user._id);
    console.log('Display Name:', user.displayName);
    console.log('Profile Images:', user.profileImages);
    console.log('Main Image Index:', user.mainProfileImageIndex);

    // ตรวจสอบแต่ละรูปภาพ
    if (Array.isArray(user.profileImages)) {
      user.profileImages.forEach((img, imgIndex) => {
        console.log(`Image ${imgIndex}:`);
        if (typeof img === 'string') {
          console.log('  Type: string');
          console.log('  Value:', img);
          if (img.startsWith('data:image/svg+xml')) {
            console.log('  🚨 SVG PLACEHOLDER!');
          } else if (img.includes('cloudinary.com') || img.includes('/image/upload/')) {
            console.log('  ☁️ Cloudinary URL');
          } else if (img.startsWith('users/')) {
            console.log('  📁 Local file path');
          } else {
            console.log('  ❓ Unknown format');
          }
        } else if (typeof img === 'object' && img !== null) {
          console.log('  Type: object');
          console.log('  URL:', img.url);
          console.log('  isBlurred:', img.isBlurred);
        }
      });
    }
  } else {
    console.log('User not found');
  }

  mongoose.connection.close();
}).catch(console.error);
