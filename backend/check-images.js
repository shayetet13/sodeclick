
const mongoose = require('mongoose');
require('dotenv').config({ path: './env.development' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');

  const User = require('./models/User');

  // หาผู้ใช้ที่มี profileImages
  const users = await User.find({ profileImages: { $exists: true, $ne: [] } }).limit(5);

  console.log(`Found ${users.length} users with profile images`);

  users.forEach(user => {
    console.log('User:', user._id);
    console.log('ProfileImages:', user.profileImages);
    console.log('---');
  });

  mongoose.connection.close();
}).catch(console.error);
