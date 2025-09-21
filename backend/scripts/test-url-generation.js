/**
 * Script to test URL generation for profile images
 */

// Simulate the URL generation logic
function getProfileImageUrl(imagePath, userId, baseUrl = 'https://sodeclick-backend-production-6036.up.railway.app') {
  if (!imagePath) return '';
  
  console.log('🖼️ Processing image path:', imagePath, 'userId:', userId);
  console.log('🌐 API Base URL:', baseUrl);
  
  // Emergency fix: Remove any existing /profiles/ from URL if it's a full URL
  if (imagePath.includes('/profiles/') && imagePath.includes('uploads/users/')) {
    const correctedPath = imagePath.replace('/profiles/', '/');
    console.log('🚨 Emergency fix - Corrected path:', correctedPath);
    return correctedPath;
  }
  
  // Handle profiles/ directory - use new structure (users/{userId}/)
  if (imagePath.startsWith('profiles/')) {
    const fileName = imagePath.replace('profiles/', '');
    console.log('🔄 Removed profiles/ prefix, fileName:', fileName);
    
    // Extract userId from filename if not provided
    const fileUserId = userId || fileName.match(/profile-([a-f0-9]{24})-/)?.[1];
    console.log('📋 Extracted userId:', fileUserId, 'from fileName:', fileName);
    
    if (fileUserId) {
      // Use new structure: /uploads/users/{userId}/{fileName}
      const newStructureUrl = `${baseUrl}/uploads/users/${fileUserId}/${fileName}`;
      console.log('🔗 Generated URL (users/{userId}/):', newStructureUrl);
      
      // Temporary fix: Ensure no double /profiles/ in URL
      const correctedUrl = newStructureUrl.replace('/profiles/', '/');
      if (correctedUrl !== newStructureUrl) {
        console.log('🔧 Corrected URL (removed duplicate /profiles/):', correctedUrl);
        return correctedUrl;
      }
      
      return newStructureUrl;
    }
    
    // Fallback: try profiles directory directly
    const fallbackUrl = `${baseUrl}/uploads/profiles/${fileName}`;
    console.log('🔗 Fallback URL (profiles/):', fallbackUrl);
    return fallbackUrl;
  }
  
  // Handle other formats
  const finalUrl = `${baseUrl}/uploads/${imagePath}`;
  console.log('🔗 Generated URL (other):', finalUrl);
  return finalUrl;
}

// Test cases
console.log('🧪 Testing URL Generation\n');

// Test case 1: Min Mi's profile image
const testCase1 = {
  imagePath: 'profiles/profile-68c41f8d66b47eeaf22da734-1757683612407-893211923.jpg',
  userId: '68c41f8d66b47eeaf22da734',
  expected: 'https://sodeclick-backend-production-6036.up.railway.app/uploads/users/68c41f8d66b47eeaf22da734/profile-68c41f8d66b47eeaf22da734-1757683612407-893211923.jpg'
};

console.log('📝 Test Case 1: Min Mi');
console.log('Input:', testCase1);
const result1 = getProfileImageUrl(testCase1.imagePath, testCase1.userId);
console.log('Result:', result1);
console.log('Expected:', testCase1.expected);
console.log('✅ Match:', result1 === testCase1.expected ? 'YES' : 'NO');
console.log('');

// Test case 2: Test user's profile image
const testCase2 = {
  imagePath: 'profiles/profile-689ec2fc551e95c88e6f73de-1755341712549-307261286.png',
  userId: '689ec2fc551e95c88e6f73de',
  expected: 'https://sodeclick-backend-production-6036.up.railway.app/uploads/users/689ec2fc551e95c88e6f73de/profile-689ec2fc551e95c88e6f73de-1755341712549-307261286.png'
};

console.log('📝 Test Case 2: Test User');
console.log('Input:', testCase2);
const result2 = getProfileImageUrl(testCase2.imagePath, testCase2.userId);
console.log('Result:', result2);
console.log('Expected:', testCase2.expected);
console.log('✅ Match:', result2 === testCase2.expected ? 'YES' : 'NO');
console.log('');

// Test case 3: Emergency fix test
const testCase3 = {
  imagePath: 'https://sodeclick-backend-production-6036.up.railway.app/uploads/users/68c41f8d66b47eeaf22da734/profiles/profile-68c41f8d66b47eeaf22da734-1757683612407-893211923.jpg',
  userId: '68c41f8d66b47eeaf22da734',
  expected: 'https://sodeclick-backend-production-6036.up.railway.app/uploads/users/68c41f8d66b47eeaf22da734/profile-68c41f8d66b47eeaf22da734-1757683612407-893211923.jpg'
};

console.log('📝 Test Case 3: Emergency Fix (URL with duplicate /profiles/)');
console.log('Input:', testCase3);
const result3 = getProfileImageUrl(testCase3.imagePath, testCase3.userId);
console.log('Result:', result3);
console.log('Expected:', testCase3.expected);
console.log('✅ Match:', result3 === testCase3.expected ? 'YES' : 'NO');
console.log('');

console.log('🎯 Test Summary:');
console.log(`Test 1: ${result1 === testCase1.expected ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 2: ${result2 === testCase2.expected ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 3: ${result3 === testCase3.expected ? '✅ PASS' : '❌ FAIL'}`);
