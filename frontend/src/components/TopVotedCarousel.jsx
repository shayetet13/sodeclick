import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { getProfileImageUrl, getMainProfileImage } from '../utils/profileImageUtils';

const TopVotedCarousel = () => {
  const [topVotedUsers, setTopVotedUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const autoScrollRef = useRef(null);

  // Fetch top voted users
  const fetchTopVotedUsers = async () => {
    try {
      console.log('🔍 Fetching top voted users...');
      const response = await fetch('/api/vote/ranking?voteType=popularity_combined&limit=3');
      const data = await response.json();
      
      console.log('📊 API Response:', data);
      
      if (data.success && data.data.ranking) {
        console.log('✅ Top voted users:', data.data.ranking);
        setTopVotedUsers(data.data.ranking);
      } else {
        console.warn('⚠️ No ranking data found:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching top voted users:', error);
      console.log('🔄 Using mock data for testing...');
      
      // Mock data for testing when API is not available
      const mockData = [
        {
          rank: 1,
          user: {
            _id: '689e0b8d92e674571e4c1dcf',
            id: '689e0b8d92e674571e4c1dcf',
            username: 'tanachok',
            displayName: 'Tanachok',
            gender: 'male',
            profileImages: [
              'profiles/profile-689e0b8d92e674571e4c1dcf-1755189312345-14434830.jpg'
            ],
            mainProfileImageIndex: 0
          },
          stats: {
            totalVotes: 6,
            voteCount: 6,
            uniqueVoters: 5
          }
        },
        {
          rank: 2,
          user: {
            _id: '689ec2fc551e95c88e6f73de',
            id: '689ec2fc551e95c88e6f73de',
            username: 'testuser',
            displayName: 'Test User',
            gender: 'female',
            profileImages: [
              'profiles/profile-689ec2fc551e95c88e6f73de-1755341712549-307261286.png'
            ],
            mainProfileImageIndex: 0
          },
          stats: {
            totalVotes: 4,
            voteCount: 4,
            uniqueVoters: 3
          }
        },
        {
          rank: 3,
          user: {
            _id: '68c41f8d66b47eeaf22da734',
            id: '68c41f8d66b47eeaf22da734',
            username: 'minmi',
            displayName: 'Min Mi',
            gender: 'female',
            profileImages: [
              'profiles/profile-68c41f8d66b47eeaf22da734-1757683612407-893211923.jpg'
            ],
            mainProfileImageIndex: 0
          },
          stats: {
            totalVotes: 2,
            voteCount: 2,
            uniqueVoters: 2
          }
        }
      ];
      
      setTopVotedUsers(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll functionality
  const startAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    
    autoScrollRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => 
        prevIndex >= topVotedUsers.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000); // 7 seconds
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
  };

  // Navigation functions
  const goToPrevious = () => {
    stopAutoScroll();
    setCurrentIndex(prevIndex => 
      prevIndex <= 0 ? topVotedUsers.length - 1 : prevIndex - 1
    );
    setTimeout(startAutoScroll, 1000); // Restart auto-scroll after 1 second
  };

  const goToNext = () => {
    stopAutoScroll();
    setCurrentIndex(prevIndex => 
      prevIndex >= topVotedUsers.length - 1 ? 0 : prevIndex + 1
    );
    setTimeout(startAutoScroll, 1000); // Restart auto-scroll after 1 second
  };

  // Initialize
  useEffect(() => {
    fetchTopVotedUsers();
  }, []);

  // Start auto-scroll when data is loaded
  useEffect(() => {
    if (topVotedUsers.length > 0) {
      startAutoScroll();
    }
    
    return () => stopAutoScroll();
  }, [topVotedUsers]);

  // Get profile image URL
  const getImageUrl = (userData) => {
    console.log('🖼️ Getting image for user data:', userData);
    
    // userData is from ranking API, structure: { user: {...}, stats: {...}, rank: ... }
    const user = userData?.user;
    if (!user) {
      console.log('❌ No user object found');
      return null;
    }
    
    console.log('👤 User object:', user);
    console.log('📸 Profile images:', user.profileImages);
    console.log('🔢 Main image index:', user.mainProfileImageIndex);
    
    if (user.profileImages && user.profileImages.length > 0) {
      const imageUrl = getMainProfileImage(
        user.profileImages, 
        user.mainProfileImageIndex, 
        user._id || user.id
      );
      console.log('🔗 Generated image URL:', imageUrl);
      return imageUrl;
    }
    
    console.log('❌ No images found for user');
    return null;
  };

  if (loading) {
    return (
      <div className="relative w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (topVotedUsers.length === 0) {
    return (
      <div className="relative w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center">
        <p className="text-gray-600 font-medium">ไม่มีข้อมูลผู้ใช้</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto h-[500px]">
      {/* Render 3 stacked cards */}
      {topVotedUsers.slice(0, 3).map((userData, index) => {
        // Calculate which card should be shown based on currentIndex
        const cardPosition = (index - currentIndex + topVotedUsers.length) % topVotedUsers.length;
        const isActive = cardPosition === 0;
        const isNext = cardPosition === 1;
        const isPrevious = cardPosition === 2;
        
        let zIndex, scale, translateY, translateX, opacity;
        
        if (isActive) {
          zIndex = 30;
          scale = 1;
          translateY = 0;
          translateX = 0;
          opacity = 1;
        } else if (isNext) {
          zIndex = 20;
          scale = 0.95;
          translateY = 10;
          translateX = 15;
          opacity = 0.8;
        } else {
          zIndex = 10;
          scale = 0.9;
          translateY = 20;
          translateX = -15;
          opacity = 0.6;
        }

        return (
          <div
            key={userData.user?.id || index}
            className="absolute inset-0 transition-all duration-700 ease-in-out"
            style={{
              zIndex,
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
              opacity
            }}
          >
            {isActive ? (
              // Active card with full content
              <div 
                className="w-full h-full overflow-hidden shadow-2xl bg-gradient-to-br from-pink-50 to-purple-50 !rounded-[32px]"
                style={{ 
                  borderRadius: '32px !important',
                  clipPath: 'inset(0 round 32px)'
                }}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  {getImageUrl(userData) ? (
                    <img
                      src={getImageUrl(userData)}
                      alt={userData.user?.displayName || userData.user?.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('❌ Image failed to load:', e.target.src);
                        e.target.style.display = 'none';
                        const fallbackDiv = e.target.parentElement.querySelector('.fallback-avatar');
                        if (fallbackDiv) {
                          fallbackDiv.style.display = 'flex';
                        }
                      }}
                      onLoad={(e) => {
                        console.log('✅ Image loaded successfully:', e.target.src);
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback Avatar */}
                  <div className={`fallback-avatar w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 items-center justify-center ${getImageUrl(userData) ? 'hidden' : 'flex'}`}>
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-5xl font-bold text-gray-600">
                        {userData.user?.displayName?.[0] || userData.user?.username?.[0] || '?'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  {/* User Info */}
                  <div className="text-white mb-4">
                    <h3 className="text-xl font-bold mb-2">
                      {userData.user?.displayName || userData.user?.username}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm opacity-90">อันดับ #{userData.rank}</span>
                      <span className="text-sm opacity-75">•</span>
                      <span className="text-sm opacity-90">{userData.user?.gender === 'male' ? '👨 ชาย' : '👩 หญิง'}</span>
                    </div>
                  </div>

                  {/* Vote Count Badge */}
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                    <Heart className="h-4 w-4 text-pink-500" fill="currentColor" />
                    <span className="text-sm font-bold text-gray-800">
                      {userData.stats?.totalVotes || 0} votes
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Inactive card - completely invisible, no border
              <div className="w-full h-full bg-transparent">
                {/* No content for inactive cards - completely hidden */}
              </div>
            )}
          </div>
        );
      })}


      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-4 z-40 flex space-x-2">
        {topVotedUsers.slice(0, 3).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              stopAutoScroll();
              setCurrentIndex(index);
              setTimeout(startAutoScroll, 1000);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-white shadow-lg scale-125'
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Loading Indicator for Image Transitions */}
      <div className="absolute top-4 right-4 z-40">
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default TopVotedCarousel;
