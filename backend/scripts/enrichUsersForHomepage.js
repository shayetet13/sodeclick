const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// Mongo URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

// Load candidate local profile images from uploads directory
function loadLocalProfileImages() {
  try {
    const dir = path.join(__dirname, '..', 'uploads', 'profiles');
    const files = fs.readdirSync(dir)
      .filter(f => /\.(png|jpe?g|svg)$/i.test(f));
    // Fallback if nothing found
    if (!files || files.length === 0) {
      return ['sample-profile.png'];
    }
    return files;
  } catch (e) {
    return ['sample-profile.png'];
  }
}

const LOCAL_IMAGES = loadLocalProfileImages();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sampleOne(list) {
  return list[randomInt(0, list.length - 1)];
}

function sampleMany(list, count) {
  const copy = [...list];
  const result = [];
  while (copy.length > 0 && result.length < count) {
    const i = randomInt(0, copy.length - 1);
    result.push(copy.splice(i, 1)[0]);
  }
  return result;
}

async function enrichUsers() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const users = await User.find({});
  console.log(`👥 Found ${users.length} users to enrich`);

  const bios = [
    'Coffee lover and travel enthusiast. Looking for meaningful connections.',
    'Art lover and coffee connoisseur. Let’s create beautiful memories together.',
    'Adventure seeker and foodie. Always up for new experiences.',
    'Music and movie fan. Weekend photographer and nature admirer.',
    'Techie by day, dreamer by night. Love books and quiet cafes.'
  ];

  const jobs = ['Software Engineer', 'Designer', 'Photographer', 'Teacher', 'Marketer', 'Content Creator', 'Data Analyst'];
  const companies = ['Freelance', 'Creative Studio', 'Tech Co.', 'Startup Inc.', 'Global Corp'];
  const educationLevels = ['high_school', 'diploma', 'bachelor', 'master', 'doctorate'];
  const religions = ['buddhist', 'christian', 'muslim', 'hindu', 'other', 'none'];
  const languages = ['thai', 'english', 'chinese', 'japanese', 'korean', 'french', 'german', 'spanish'];
  const lifestyle = {
    smoking: ['never', 'occasionally', 'regularly', 'trying_to_quit'],
    drinking: ['never', 'occasionally', 'socially', 'regularly'],
    exercise: ['never', 'rarely', 'sometimes', 'regularly', 'daily'],
    diet: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'other'],
    sleepSchedule: ['early_bird', 'night_owl', 'flexible'],
    children: ['have_children', 'want_children', 'dont_want_children', 'open_to_children']
  };
  const interestCatalog = [
    { category: 'sports', items: ['Football', 'Running', 'Swimming', 'Badminton'] },
    { category: 'music', items: ['Pop', 'Rock', 'Jazz', 'Indie'] },
    { category: 'movies', items: ['Action', 'Romance', 'Sci-Fi', 'Drama'] },
    { category: 'books', items: ['Fiction', 'Biography', 'Self-help'] },
    { category: 'cooking', items: ['Baking', 'Thai Food', 'BBQ'] },
    { category: 'travel', items: ['Beach', 'Mountain', 'Road Trip'] },
    { category: 'technology', items: ['AI', 'Gadgets', 'Programming'] },
    { category: 'art', items: ['Painting', 'Museum', 'Gallery'] },
    { category: 'gaming', items: ['PC Games', 'Console', 'Mobile'] },
    { category: 'fitness', items: ['Gym', 'Yoga', 'Cycling'] },
    { category: 'nature', items: ['Hiking', 'Camping', 'Bird Watching'] },
    { category: 'photography', items: ['Portrait', 'Landscape', 'Travel'] },
    { category: 'dancing', items: ['Salsa', 'Hip-hop', 'K-pop'] },
    { category: 'other', items: ['Volunteering', 'Board Games'] }
  ];

  let updated = 0;
  for (const user of users) {
    const set = {};

    // Images
    if (!user.profileImages || user.profileImages.length === 0) {
      const imgCount = randomInt(1, 3);
      set.profileImages = sampleMany(LOCAL_IMAGES, imgCount);
    }

    // Bio & basic flags
    if (!user.bio) set.bio = sampleOne(bios);
    if (user.isVerified === undefined) set.isVerified = Math.random() < 0.6;
    if (user.isOnline === undefined) set.isOnline = Math.random() < 0.3;
    if (!user.lastActive) set.lastActive = new Date(Date.now() - randomInt(5, 720) * 60 * 1000);

    // Education & occupation
    if (!user.education || !user.education.level) {
      set['education.level'] = sampleOne(educationLevels);
      set['education.institution'] = sampleOne(['Chulalongkorn University', 'Thammasat University', 'Kasetsart University', 'KMUTT']);
    }
    if (!user.occupation || !user.occupation.job) {
      set['occupation.job'] = sampleOne(jobs);
      set['occupation.company'] = sampleOne(companies);
    }

    // Physical attributes
    if (!user.physicalAttributes || user.physicalAttributes.height === undefined) {
      set['physicalAttributes.height'] = randomInt(150, 190);
    }
    if (!user.physicalAttributes || user.physicalAttributes.weight === undefined) {
      set['physicalAttributes.weight'] = randomInt(45, 95);
    }

    // Religion & languages
    if (!user.religion) set.religion = sampleOne(religions);
    if (!user.languages || user.languages.length === 0) {
      set.languages = sampleMany(languages, randomInt(1, 3));
    }

    // Lifestyle
    if (!user.lifestyle || !user.lifestyle.smoking) set['lifestyle.smoking'] = sampleOne(lifestyle.smoking);
    if (!user.lifestyle || !user.lifestyle.drinking) set['lifestyle.drinking'] = sampleOne(lifestyle.drinking);
    if (!user.lifestyle || !user.lifestyle.exercise) set['lifestyle.exercise'] = sampleOne(lifestyle.exercise);
    if (!user.lifestyle || !user.lifestyle.diet) set['lifestyle.diet'] = sampleOne(lifestyle.diet);
    if (!user.lifestyle || !user.lifestyle.sleepSchedule) set['lifestyle.sleepSchedule'] = sampleOne(lifestyle.sleepSchedule);
    if (!user.lifestyle || !user.lifestyle.children) set['lifestyle.children'] = sampleOne(lifestyle.children);

    // Interests
    if (!user.interests || user.interests.length === 0) {
      const interestGroups = sampleMany(interestCatalog, 3);
      set.interests = interestGroups.map(g => ({ category: g.category, items: sampleMany(g.items, randomInt(1, 3)) }));
    }

    // Location & coordinates (if missing)
    if (!user.location) set.location = sampleOne(['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Khon Kaen']);
    if (!user.coordinates || !Array.isArray(user.coordinates?.coordinates) || user.coordinates.coordinates.length !== 2) {
      set.coordinates = { type: 'Point', coordinates: [100.5018, 13.7563] };
    }

    // Daily usage sanity
    if (!user.dailyUsage) {
      set.dailyUsage = { chatCount: 0, imageUploadCount: 0, videoUploadCount: 0, lastReset: new Date() };
    }

    // Apply update if there is anything to set
    if (Object.keys(set).length > 0) {
      await User.findByIdAndUpdate(user._id, { $set: set });
      updated += 1;
    }
  }

  console.log(`✅ Enriched ${updated} users`);
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

enrichUsers().catch(async (err) => {
  console.error('❌ Failed to enrich users:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});


