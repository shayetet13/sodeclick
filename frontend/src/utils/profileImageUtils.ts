// Utility function to generate correct profile image URL
export const getProfileImageUrl = (imagePath: string, userId?: string, baseUrl?: string): string => {
  if (!imagePath) return '';
  
  // If already a full URL or data URL, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  // Handle new path format: users/{userId}/{filename}
  if (imagePath.startsWith('users/')) {
    return `${apiBaseUrl}/uploads/${imagePath}`;
  }
  
  // Handle old path format: profile-{userId}-{timestamp}-{random}.{ext}
  if (imagePath.includes('profile-') && userId && imagePath.includes(userId)) {
    const newPath = `users/${userId}/${imagePath}`;
    return `${apiBaseUrl}/uploads/${newPath}`;
  }
  
  // Handle other formats (like profiles/)
  return `${apiBaseUrl}/uploads/${imagePath}`;
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
