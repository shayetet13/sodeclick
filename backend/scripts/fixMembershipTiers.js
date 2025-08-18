const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fixMembershipTiers = async () => {
  try {
    // Find users with old membershipTier field
    const usersWithOldField = await User.find({ membershipTier: { $exists: true } });
    
    console.log(`Found ${usersWithOldField.length} users with old membershipTier field`);
    
    for (const user of usersWithOldField) {
      // Move membershipTier to membership.tier
      if (user.membershipTier && !user.membership) {
        user.membership = { tier: user.membershipTier };
        user.markModified('membership');
        
        // Remove the old field
        user.membershipTier = undefined;
        
        await user.save();
        console.log(`Fixed user: ${user.username}`);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixMembershipTiers();
