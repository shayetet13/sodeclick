const fs = require('fs');
const path = require('path');

console.log('🚀 Starting profile image migration...');

// Paths
const profilesDir = path.join(__dirname, 'backend', 'uploads', 'profiles');
const usersDir = path.join(__dirname, 'backend', 'uploads', 'users');

// Create users directory if it doesn't exist
if (!fs.existsSync(usersDir)) {
  fs.mkdirSync(usersDir, { recursive: true });
  console.log(`📁 Created users directory: ${usersDir}`);
}

// Get all profile images
const files = fs.readdirSync(profilesDir);
const imageFiles = files.filter(file => 
  file.match(/\.(jpg|jpeg|png|gif)$/i) && file.startsWith('profile-')
);

console.log(`📊 Found ${imageFiles.length} profile images to migrate`);

let movedCount = 0;
let errorCount = 0;

// Group by user ID and move files
const userImages = {};
imageFiles.forEach(file => {
  const match = file.match(/profile-(.+?)-/);
  if (match) {
    const userId = match[1];
    if (!userImages[userId]) {
      userImages[userId] = [];
    }
    userImages[userId].push(file);
  }
});

// Move files for each user
Object.keys(userImages).forEach(userId => {
  const userDir = path.join(usersDir, userId);
  
  // Create user directory
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    console.log(`📁 Created user directory: ${userDir}`);
  }
  
  // Move files
  userImages[userId].forEach(file => {
    const oldPath = path.join(profilesDir, file);
    const newPath = path.join(userDir, file);
    
    try {
      fs.copyFileSync(oldPath, newPath);
      fs.unlinkSync(oldPath);
      console.log(`✅ Moved: ${file} -> users/${userId}/${file}`);
      movedCount++;
    } catch (error) {
      console.error(`❌ Error moving ${file}:`, error.message);
      errorCount++;
    }
  });
});

console.log(`\n🎉 Migration completed!`);
console.log(`✅ Files moved: ${movedCount}`);
console.log(`❌ Errors: ${errorCount}`);

// Check remaining files
const remainingFiles = fs.readdirSync(profilesDir).filter(file => 
  !file.startsWith('.') && file !== '.gitkeep'
);

if (remainingFiles.length === 0) {
  console.log('🧹 Profiles directory is clean');
} else {
  console.log(`⚠️ ${remainingFiles.length} files still in profiles directory:`, remainingFiles);
}