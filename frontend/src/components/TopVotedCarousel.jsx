import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { getMainProfileImage, getMainProfileImageGuest, getDefaultAvatarUrl } from '../utils/profileImageUtils';
import voteAPI from '../services/voteAPI';
import socketManager from '../services/socketManager';

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
    // ใช้ guest mode function ที่รองรับ fallback
    const imageUrl = getMainProfileImageGuest(
      user.profileImages, 
      user.mainProfileImageIndex, 
      user._id || user.id,
      user.gender
    );
    console.log('🔗 Generated image URL (guest mode):', imageUrl);
    return imageUrl;
  }
  
  console.log('❌ No images found for user, using default avatar');
  // ใช้ default avatar เมื่อไม่มีรูป
  return getDefaultAvatarUrl(user.gender);
};

const TopVotedCarousel = () => {
  const [topVotedUsers, setTopVotedUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const autoScrollRef = useRef(null);

  // Fetch top voted users using the same API as Popular Vote
  const fetchTopVotedUsers = async () => {
    try {
      console.log('🔍 TopVotedCarousel - Fetching top voted users...');
      setLoading(true);
      
      // ใช้ voteAPI service เดียวกับ VoteRanking component
      const response = await voteAPI.getRanking('popularity_combined', 'all', 3);
      
      console.log('📊 TopVotedCarousel - API Response:', response);
      
      if (response.success && response.data && response.data.ranking) {
        const rankingData = response.data.ranking;
        console.log('✅ TopVotedCarousel - Top voted users:', rankingData);
        console.log('📊 TopVotedCarousel - Ranking count:', rankingData.length);
        
        // ตรวจสอบข้อมูลผู้ใช้แต่ละคน
        rankingData.forEach((item, index) => {
          console.log(`🔍 TopVotedCarousel User ${index + 1}:`, {
            user: item.user,
            profileImages: item.user?.profileImages,
            mainProfileImageIndex: item.user?.mainProfileImageIndex,
            userId: item.user?._id
          });
        });
        
        setTopVotedUsers(rankingData);
      } else {
        console.warn('⚠️ TopVotedCarousel - No ranking data found:', response);
        setTopVotedUsers([]);
      }
    } catch (error) {
      console.error('❌ TopVotedCarousel - Error fetching top voted users:', error);
      setTopVotedUsers([]);
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

  // Real-time vote updates (same as VoteRanking component)
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('🔄 TopVotedCarousel - Vote update received:', data);
      
      // ตรวจสอบว่าเป็นประเภทการโหวตที่เรากำลังแสดงหรือไม่
      if (data.voteType === 'popularity_combined' || 
          data.voteType === 'popularity_male' || 
          data.voteType === 'popularity_female') {
        console.log('🔄 TopVotedCarousel - Refreshing ranking due to vote update');
        // รีเฟรชข้อมูลอันดับ
        fetchTopVotedUsers();
      }
    };

    // เชื่อมต่อ socket และเพิ่ม listener
    const socket = socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    socketManager.on('vote-updated', handleVoteUpdate);

    // Cleanup
    return () => {
      socketManager.off('vote-updated', handleVoteUpdate);
    };
  }, []);


  if (loading) {
    return (
      <div className="relative w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (topVotedUsers.length === 0) {
    return (
      <div className="relative w-full max-w-xs mx-auto h-[500px] bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-gray-600 font-medium mb-2">ยังไม่มีข้อมูลการโหวต</p>
          <p className="text-gray-500 text-sm">เริ่มต้นโหวตเพื่อดูอันดับความนิยม</p>
        </div>
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
