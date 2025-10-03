// Utility function to check if image exists at URL
const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Utility function to generate correct profile image URL with fallback
export const getProfileImageUrlWithFallback = async (imagePath: string, userId?: string, baseUrl?: string): Promise<string> => {
  if (!imagePath) return '';
  
  // ✅ NEW: If it's a Cloudinary URL, convert to full URL if needed
  if (imagePath.includes('cloudinary.com') || imagePath.includes('/image/upload/')) {
    console.log('☁️ Cloudinary CDN URL detected (async):', imagePath);

    // ถ้าเป็น relative path ให้สร้าง full URL
    if (imagePath.startsWith('/')) {
      const fullUrl = `https://res.cloudinary.com${imagePath}`;
      console.log('🔧 Converted relative Cloudinary URL to full URL:', fullUrl);

      // ตรวจสอบว่า URL ที่สร้างขึ้นถูกต้อง
      try {
        new URL(fullUrl);
        return fullUrl;
      } catch (error) {
        console.error('🚨 Invalid Cloudinary URL generated:', fullUrl, error);
        return '';
      }
    }

    return imagePath;
  }
  
  // If already a full URL or data URL, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  console.log('🖼️ Processing image path with fallback:', imagePath, 'userId:', userId);
  
  // Handle profiles/ directory - try both locations
  if (imagePath.startsWith('profiles/')) {
    const fileName = imagePath.replace('profiles/', '');
    const fileUserId = userId || fileName.match(/profile-([a-f0-9]{24})-/)?.[1];
    
    if (fileUserId) {
      // Try new structure first: /uploads/users/{userId}/{fileName}
      const newStructureUrl = `${apiBaseUrl}/uploads/users/${fileUserId}/${fileName}`;
      const existsInNewStructure = await checkImageExists(newStructureUrl);
      
      if (existsInNewStructure) {
        console.log('✅ Found image in new structure:', newStructureUrl);
        return newStructureUrl;
      }
      
      // Try old structure: /uploads/profiles/{fileName}
      const oldStructureUrl = `${apiBaseUrl}/uploads/profiles/${fileName}`;
      const existsInOldStructure = await checkImageExists(oldStructureUrl);
      
      if (existsInOldStructure) {
        console.log('✅ Found image in old structure:', oldStructureUrl);
        return oldStructureUrl;
      }
      
      console.log('❌ Image not found in either structure');
      return newStructureUrl; // Return new structure URL as default
    }
    
    // Fallback: try profiles directory directly
    const fallbackUrl = `${apiBaseUrl}/uploads/profiles/${fileName}`;
    return fallbackUrl;
  }
  
  // Handle other formats
  const finalUrl = `${apiBaseUrl}/uploads/${imagePath}`;
  return finalUrl;
};

// Utility function to fix broken URLs with duplicate /profiles/
const fixBrokenUrl = (url: string): string => {
  if (!url) return url;
  
  // Fix the specific issue: remove /profiles/ when it appears after /users/{userId}/
  const brokenPattern = /\/uploads\/users\/([a-f0-9]{24})\/profiles\//;
  if (brokenPattern.test(url)) {
    const fixedUrl = url.replace('/profiles/', '/');
    console.log('🔧 Fixed broken URL:', url, '→', fixedUrl);
    return fixedUrl;
  }
  
  return url;
};

// Utility function to generate correct profile image URL
export const getProfileImageUrl = (imagePath: string, userId?: string, baseUrl?: string): string => {
  if (!imagePath || typeof imagePath !== 'string') {
    console.warn('🚨 Invalid image path provided:', imagePath);
    return '';
  }
  
  // ✅ NEW: If it's a Cloudinary URL (contains cloudinary.com or /image/upload/), convert to full URL if needed
  if (imagePath.includes('cloudinary.com') || imagePath.includes('/image/upload/')) {
    console.log('☁️ Cloudinary CDN URL detected:', imagePath);

    // ถ้าเป็น relative path ให้สร้าง full URL
    if (imagePath.startsWith('/')) {
      const fullUrl = `https://res.cloudinary.com${imagePath}`;
      console.log('🔧 Converted relative Cloudinary URL to full URL:', fullUrl);

      // ตรวจสอบว่า URL ที่สร้างขึ้นถูกต้อง
      try {
        new URL(fullUrl);
        return fullUrl;
      } catch (error) {
        console.error('🚨 Invalid Cloudinary URL generated:', fullUrl, error);
        return '';
      }
    }

    return imagePath;
  }
  
  // If already a full URL or data URL, fix and return
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return fixBrokenUrl(imagePath);
  }
  
  const apiBaseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  console.log('🖼️ Processing image path:', imagePath, 'userId:', userId);
  console.log('🌐 API Base URL:', apiBaseUrl);
  
  
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
  
  // Handle profiles/ directory - use new structure (users/{userId}/)
  if (imagePath.startsWith('profiles/')) {
    const fileName = imagePath.replace('profiles/', '');
    console.log('🔄 Removed profiles/ prefix, fileName:', fileName);
    
    // Extract userId from filename if not provided
    const fileUserId = userId || fileName.match(/profile-([a-f0-9]{24})-/)?.[1];
    console.log('📋 Extracted userId:', fileUserId, 'from fileName:', fileName);
    
    if (fileUserId) {
      // Use new structure: /uploads/users/{userId}/{fileName}
      const newStructureUrl = `${apiBaseUrl}/uploads/users/${fileUserId}/${fileName}`;
      console.log('🔗 Generated URL (users/{userId}/):', newStructureUrl);
      console.log('🔍 Debug - Full URL components:', {
        apiBaseUrl,
        fileUserId,
        fileName,
        finalUrl: newStructureUrl
      });
      
      
      return newStructureUrl;
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

// Utility function to get main profile image (synchronous version)
export const getMainProfileImage = (profileImages: string[], mainProfileImageIndex?: number, userId?: string): string => {
  if (!profileImages || profileImages.length === 0) {
    return '';
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  // Handle both string and object types
  const imagePath = typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '';
  
  if (!imagePath || imagePath.startsWith('data:image/svg+xml')) {
    return '';
  }
  
  const imageUrl = getProfileImageUrl(imagePath, userId);
  
  // Apply final fix to ensure URL is correct
  return fixBrokenUrl(imageUrl);
};

// Utility function to get main profile image with fallback (asynchronous version)
export const getMainProfileImageWithFallback = async (profileImages: string[], mainProfileImageIndex?: number, userId?: string): Promise<string> => {
  if (!profileImages || profileImages.length === 0) {
    return '';
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  // Handle both string and object types
  const imagePath = typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '';
  
  if (!imagePath || imagePath.startsWith('data:image/svg+xml')) {
    return '';
  }
  
  return await getProfileImageUrlWithFallback(imagePath, userId);
};

// ฟังก์ชันสำหรับ guest mode - ไม่ต้อง authentication
export const getProfileImageUrlGuest = (imagePath: string, userId?: string, baseUrl?: string): string => {
  // ✅ NEW: If it's a Cloudinary URL, return as is
  if (imagePath && imagePath.includes('cloudinary.com')) {
    console.log('☁️ Cloudinary CDN URL detected (guest):', imagePath);
    return imagePath;
  }
  
  // ใช้ฟังก์ชันเดิม แต่เพิ่ม fallback สำหรับ guest mode
  const url = getProfileImageUrl(imagePath, userId, baseUrl);
  
  // ถ้าไม่มี URL หรือ URL ไม่ถูกต้อง ให้ใช้ default avatar
  if (!url || url === '' || url.includes('undefined')) {
    console.log('🔄 Guest mode - using default avatar for:', imagePath);
    return getDefaultAvatarUrl();
  }
  
  return url;
};

// ฟังก์ชันสำหรับ guest mode - ไม่ต้อง authentication (synchronous version)
export const getMainProfileImageGuest = (profileImages: string[], mainProfileImageIndex?: number, userId?: string, _gender?: string): string | null => {
  if (!profileImages || profileImages.length === 0) {
    return null; // ไม่มีรูป
  }
  
  const index = mainProfileImageIndex || 0;
  const mainImage = profileImages[index];
  
  // Handle both string and object types
  const imagePath = typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '';
  
  if (!imagePath) {
    return null; // ไม่มีรูป
  }
  
  const imageUrl = getProfileImageUrl(imagePath, userId);
  
  // ถ้าไม่มี URL หรือ URL ไม่ถูกต้อง
  if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
    return null; // ไม่มีรูป
  }
  
  return imageUrl;
};

// Default avatar function - return empty string to avoid SVG creation
export const getDefaultAvatarUrl = (): string => {
  console.warn('🔄 getDefaultAvatarUrl called - returning empty string to prevent SVG creation');
  return '';
};
