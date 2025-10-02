const imagePath = '/djzo2qajc/image/upload/v1759304894/love-app/profiles/68dc162ae00e04459a8fb715/profile-1759304893709-883215248.jpg';

// Test the logic we just added
if (imagePath.includes('cloudinary.com') || imagePath.includes('/image/upload/')) {
  console.log('☁️ Cloudinary URL detected:', imagePath);

  if (imagePath.startsWith('/')) {
    const fullUrl = `https://res.cloudinary.com${imagePath}`;
    console.log('🔧 Converted relative Cloudinary URL to full URL:', fullUrl);
  }
}

const testUrl = 'https://res.cloudinary.com/djzo2qajc/image/upload/v1759304894/love-app/profiles/68dc162ae00e04459a8fb715/profile-1759304893709-883215248.jpg';

console.log('Testing URL:', testUrl);
console.log('URL should be accessible and return image/jpeg');

fetch(testUrl).then(response => {
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('Content-Length:', response.headers.get('content-length'));
}).catch(err => {
  console.error('Error:', err.message);
});
