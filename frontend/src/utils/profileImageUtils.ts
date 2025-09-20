// Utility function to generate correct profile image URL
export const getProfileImageUrl = (imagePath: string, userId?: string, baseUrl?: string): string => {
  if (!imagePath) return '';
  
  // If already a full URL or data URL, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  console.log('🖼️ Processing image path:', imagePath, 'userId:', userId);
  
  // Handle new path format: users/{userId}/{filename}
  if (imagePath.startsWith('users/')) {
    const finalUrl = `${apiBaseUrl}/uploads/${imagePath}`;
    console.log('🔗 Generated URL (users/):', finalUrl);
    return finalUrl;
  }
  
  // Handle old path format: profile-{userId}-{timestamp}-{random}.{ext}
  if (imagePath.includes('profile-') && userId && imagePath.includes(userId)) {
    const newPath = `users/${userId}/${imagePath}`;
    const finalUrl = `${apiBaseUrl}/uploads/${newPath}`;
    console.log('🔗 Generated URL (profile-):', finalUrl);
    return finalUrl;
  }
  
  // Handle profiles/ directory - remove profiles/ prefix and use direct path
  if (imagePath.startsWith('profiles/')) {
    const fileName = imagePath.replace('profiles/', '');
    console.log('🔄 Removed profiles/ prefix, fileName:', fileName);
    // Extract userId from filename if not provided
    const fileUserId = userId || fileName.match(/profile-([a-f0-9]{24})-/)?.[1];
    console.log('📋 Extracted userId:', fileUserId, 'from fileName:', fileName);
    if (fileUserId) {
      const finalUrl = `${apiBaseUrl}/uploads/users/${fileUserId}/${fileName}`;
      console.log('🔗 Generated URL (profiles/):', finalUrl);
      return finalUrl;
    }
    // Fallback: try profiles directory directly
    const fallbackUrl = `${apiBaseUrl}/uploads/profiles/${fileName}`;
    console.log('🔗 Fallback URL (profiles/):', fallbackUrl);
    return fallbackUrl;
  }
  
  // Handle other formats
  const finalUrl = `${apiBaseUrl}/uploads/${imagePath}`;
  console.log('🔗 Generated URL (other):', finalUrl);
  return finalUrl;
};

// Utility function to get main profile image
export const getMainProfileImage = (profileImages: string[], mainProfileImageIndex?: number, userId?: string): string => {
  if (!profileImages || profileImages.length === 0) {
    return '';
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  if (!mainImage || mainImage.startsWith('data:image/svg+xml')) {
    return '';
  }
  
  return getProfileImageUrl(mainImage, userId);
};
