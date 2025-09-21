import React, { useState, useEffect } from 'react';
import { Trophy, Heart, Users, Crown } from 'lucide-react';
import voteAPI, { voteHelpers } from '../services/voteAPI';
import socketManager from '../services/socketManager';
import { getMainProfileImage, getMainProfileImageGuest } from '../utils/profileImageUtils';
import { useToast } from './ui/toast';

const VoteRankingMini = ({ 
  voteType = 'popularity_combined',
  limit = 5,
  className = '',
  onUserProfileClick = null
}) => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});
  const { warning } = useToast();
  
  // Check if user is logged in using sessionStorage (same as HeartVote component)
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isLoggedIn = !!currentUser.id;

  // สร้างสี avatar ตามชื่อผู้ใช้
  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-pink-500',
      'from-blue-500 to-indigo-500', 
      'from-green-500 to-teal-500',
      'from-purple-500 to-violet-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-cyan-500',
      'from-yellow-500 to-orange-500',
      'from-violet-500 to-purple-500'
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  // ดึงข้อมูลอันดับ
  const fetchRanking = async () => {
    try {
      setLoading(true);
      const response = await voteAPI.getRanking(voteType, 'all', limit);
      
      if (response.success) {
        const rankingData = response.data.ranking || [];
        
        // ใช้ข้อมูลรูปภาพจาก vote API โดยตรง (ไม่ต้องเรียก profile API แยก)
        const profilesMap = {};
        rankingData.forEach(item => {
          if (item.user && item.user._id) {
            profilesMap[item.user._id] = {
              userId: item.user._id,
              profileImages: item.user.profileImages || [],
              mainProfileImageIndex: item.user.mainProfileImageIndex || 0
            };
          }
        });
        
        setUserProfiles(profilesMap);
        setRanking(rankingData);
      } else {
        setRanking([]);
      }
    } catch (error) {
      console.error('Error fetching mini ranking:', error);
      // ไม่แสดง error เพื่อไม่รบกวน UX
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อ component mount
  useEffect(() => {
    fetchRanking();
  }, [voteType, limit]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      // ตรวจสอบว่าเป็นประเภทการโหวตที่เรากำลังแสดงหรือไม่
      if (data.voteType === voteType) {
        // รีเฟรชข้อมูลอันดับ
        fetchRanking();
      }
    };

    // เชื่อมต่อ socket และเพิ่ม listener
    const socket = socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    socketManager.on('vote-updated', handleVoteUpdate);

    // Cleanup
    return () => {
      socketManager.off('vote-updated', handleVoteUpdate);
    };
  }, [voteType]);


  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-4 shadow-md ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-gray-800">กำลังโหลด...</h3>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={`loading-${i}`} className="animate-pulse flex items-center space-x-3 py-2">
            <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-3 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className={`bg-white rounded-lg p-4 shadow-md ${className}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-gray-800">
            {voteHelpers.getVoteTypeName(voteType)}
          </h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">
          ยังไม่มีข้อมูลการโหวต
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-4 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-gray-800">
          🏆 {voteHelpers.getVoteTypeName(voteType)}
        </h3>
      </div>

      {/* Ranking List */}
      <div className="space-y-2">
        {ranking.map((item, index) => {
          const user = item.user;
          const totalVotes = item.stats?.totalVotes || 0;
          const uniqueVoters = item.stats?.uniqueVoters || 0;
          

          return (
            <div
              key={user?._id || `ranking-${index}`}
              className="flex items-center space-x-2 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
              onClick={() => {
                // Check if user is logged in first
                if (!isLoggedIn) {
                  warning('กรุณาเข้าสู่ระบบก่อน');
                  return;
                }
                
                if (onUserProfileClick && item.user) {
                  onUserProfileClick(item.user);
                } else {
                  console.log('Navigate to user:', item.user?._id);
                }
              }}
            >

              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-[75px] h-[75px] rounded-full overflow-hidden border-2 border-white shadow-lg bg-gray-100">
                  {(() => {
                    // ใช้ข้อมูลรูปภาพจาก profile API
                    const userProfile = userProfiles[user?._id];
                    const profileImages = userProfile?.profileImages || [];
                    const mainProfileImageIndex = userProfile?.mainProfileImageIndex || 0;
                    
                    // ใช้ getMainProfileImageGuest เพื่อรองรับ guest mode
                    const mainImage = getMainProfileImageGuest(profileImages, mainProfileImageIndex, user?._id, user?.gender);
                    
                    
                    if (mainImage && mainImage.trim() !== '' && !mainImage.startsWith('data:image/svg+xml')) {
                      return (
                        <img
                          src={mainImage}
                          alt={user?.displayName || user?.username || 'ผู้ใช้'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // ซ่อนรูปที่โหลดไม่ได้และแสดง avatar แทน
                            e.target.style.display = 'none';
                            const parentDiv = e.target.parentElement;
                            if (parentDiv) {
                              const userName = user?.displayName || user?.username || '?';
                              const avatarColor = getAvatarColor(userName);
                              parentDiv.innerHTML = `
                                <div class="w-full h-full bg-gradient-to-br ${avatarColor} flex items-center justify-center">
                                  <span class="text-white font-bold text-lg drop-shadow-lg">
                                    ${String(userName).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              `;
                            }
                          }}
                        />
                      );
                    } else {
                      // Avatar แทนรูปโปรไฟล์
                      return (
                        <div className={`w-full h-full bg-gradient-to-br ${getAvatarColor(user?.displayName || user?.username)} flex items-center justify-center`}>
                          <span className="text-white font-bold text-lg drop-shadow-lg">
                            {String(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {user?.displayName || user?.username || 'ผู้ใช้ไม่ระบุชื่อ'}
                  </span>
                  {user?.membershipTier && user?.membershipTier !== 'member' && (
                    <Crown className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Heart className="h-2 w-2 text-red-500" />
                    <span className="font-semibold text-gray-800">{voteHelpers.formatVoteCount(totalVotes)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="h-2 w-2 text-blue-400" />
                    <span>{voteHelpers.formatVoteCount(uniqueVoters)}</span>
                  </span>
                </div>
              </div>

              {/* Vote Score Badge */}
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-2 py-1 rounded-md shadow-md">
                  <div className="text-center">
                    <div className="text-sm font-bold">
                      {voteHelpers.formatVoteCount(totalVotes)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          อัพเดทแบบเรียลไทม์
        </p>
      </div>
    </div>
  );
};

export default VoteRankingMini;
