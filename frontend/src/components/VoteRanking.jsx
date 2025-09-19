import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Heart, Users, Crown, Filter } from 'lucide-react';
import voteAPI, { voteHelpers } from '../services/voteAPI';
import { useToast } from './ui/toast';
import socketManager from '../services/socketManager';
import { getMainProfileImage } from '../utils/profileImageUtils';

const VoteRanking = ({ 
  voteType = 'popularity_combined',
  period = 'all',
  limit = 20,
  showFilters = true,
  className = '',
  onUserProfileClick = null
}) => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedVoteType, setSelectedVoteType] = useState(voteType);
  const { error: showError } = useToast();

  // สร้างสี avatar ตามชื่อผู้ใช้
  const getAvatarColor = (name) => {
    const colors = [
      'from-red-500 to-pink-600',
      'from-blue-500 to-indigo-600', 
      'from-green-500 to-teal-600',
      'from-purple-500 to-violet-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-purple-600',
      'from-teal-500 to-cyan-600',
      'from-yellow-500 to-orange-600',
      'from-violet-500 to-purple-600'
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  // ดึงข้อมูลอันดับ
  const fetchRanking = async () => {
    try {
      setLoading(true);
      const response = await voteAPI.getRanking(selectedVoteType, selectedPeriod, limit);
      
      console.log('🔍 VoteRanking - Full API Response:', response);
      
      if (response.success) {
        const rankingData = response.data.ranking || [];
        console.log('🔍 VoteRanking - Ranking Data:', rankingData);
        
        // ตรวจสอบข้อมูลผู้ใช้แต่ละคน
        rankingData.forEach((item, index) => {
          console.log(`🔍 User ${index + 1}:`, {
            user: item.user,
            profileImages: item.user?.profileImages,
            mainProfileImageIndex: item.user?.mainProfileImageIndex,
            userId: item.user?._id
          });
        });
        
        setRanking(rankingData);
      } else {
        setRanking([]);
        showError('ไม่สามารถดึงข้อมูลอันดับได้');
      }
    } catch (error) {
      console.error('Error fetching ranking:', error);
      showError('ไม่สามารถดึงข้อมูลอันดับได้');
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อ component mount หรือเมื่อ filter เปลี่ยน
  useEffect(() => {
    fetchRanking();
  }, [selectedVoteType, selectedPeriod, limit]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('📡 VoteRanking received vote-updated event:', data);
      
      // ตรวจสอบว่าเป็นประเภทการโหวตที่เรากำลังแสดงหรือไม่
      if (data.voteType === selectedVoteType) {
        console.log('🔄 Refreshing ranking due to vote update');
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
  }, [selectedVoteType]);



  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h3 className="text-lg font-semibold">กำลังโหลดอันดับ...</h3>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
          <h3 className="text-base sm:text-lg font-bold text-gray-800">
            อันดับ{voteHelpers.getVoteTypeName(selectedVoteType)}
          </h3>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center space-x-4">
            {/* Vote Type Filter */}
            <select
              value={selectedVoteType}
              onChange={(e) => setSelectedVoteType(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="popularity_combined">ความนิยมรวม (ชาย + หญิง)</option>
              <option value="popularity_male">ความนิยมชาย</option>
              <option value="popularity_female">ความนิยมหญิง</option>
            </select>

            {/* Period Filter */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="all">ตลอดกาล</option>
              <option value="monthly">เดือนนี้</option>
              <option value="weekly">สัปดาห์นี้</option>
            </select>
          </div>
        )}
      </div>

      {/* Ranking List */}
      <div className="space-y-2">
        {ranking.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>ยังไม่มีข้อมูลการโหวต</p>
          </div>
        ) : (
          ranking.map((item, index) => {
            const user = item.user;
            const totalVotes = item.stats?.totalVotes || 0;
            const uniqueVoters = item.stats?.uniqueVoters || 0;

            return (
              <div
                key={user?._id || `ranking-${index}`}
                className="
                  flex items-center space-x-3 p-3 sm:p-4 rounded-xl border transition-all duration-200
                  hover:shadow-lg cursor-pointer bg-white border-gray-200 shadow-sm
                "
                onClick={() => {
                  if (onUserProfileClick && user) {
                    onUserProfileClick(user);
                  } else {
                    console.log('Navigate to user:', user?._id);
                  }
                }}
              >

                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <div className="w-[75px] h-[75px] sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 border-white shadow-xl bg-gray-100">
                    {(() => {
                      // ใช้ getMainProfileImage เพื่อดึงรูปแรก
                      const mainImage = getMainProfileImage(user?.profileImages || [], user?.mainProfileImageIndex, user?._id);
                      
                      if (mainImage && mainImage.trim() !== '') {
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
                                    <span class="text-white font-bold text-lg sm:text-xl drop-shadow-lg">
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
                            <span className="text-white font-bold text-lg sm:text-xl drop-shadow-lg">
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
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-bold text-gray-900 truncate text-sm sm:text-base">
                      {user?.displayName || user?.username || 'ผู้ใช้ไม่ระบุชื่อ'}
                    </h4>
                    {user?.membershipTier && user?.membershipTier !== 'member' && (
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 text-xs sm:text-sm">
                    <span className="flex items-center space-x-1 text-gray-600">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-semibold text-gray-800">{voteHelpers.formatVoteCount(totalVotes)} คะแนน</span>
                    </span>
                    <span className="flex items-center space-x-1 text-gray-500">
                      <Users className="h-3 w-3 text-blue-400" />
                      <span>{voteHelpers.formatVoteCount(uniqueVoters)} คน</span>
                    </span>
                  </div>
                </div>

                {/* Vote Score Badge */}
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-3 py-2 rounded-lg shadow-lg">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold">
                        {voteHelpers.formatVoteCount(totalVotes)}
                      </div>
                      <div className="text-xs opacity-90">คะแนน</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {ranking.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
          แสดง {ranking.length} อันดับแรก • อัพเดทล่าสุด: {new Date().toLocaleDateString('th-TH')}
        </div>
      )}
    </div>
  );
};

export default VoteRanking;
