import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  MessageCircle,
  Users,
  Search,
  Crown,
  Star,
  Clock,
  Lock,
  Globe,
  Plus
} from 'lucide-react';

const ChatRoomList = ({ currentUser, onSelectRoom, onCreatePrivateRoom }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'public', 'private'
  const [onlineUsers, setOnlineUsers] = useState({}); // roomId -> onlineCount
  const [totalOnlineUsers, setTotalOnlineUsers] = useState(0); // รวมคนออนไลน์ทั้งหมด

  useEffect(() => {
    fetchChatRooms();
  }, [filterType]);

  // โหลดข้อมูลคนออนไลน์สำหรับทุกห้อง
  useEffect(() => {
    if (chatRooms.length > 0) {
      fetchOnlineUsers();
    }
  }, [chatRooms]);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom?type=${filterType}&search=${searchTerm}`,
        {
          credentials: 'include'
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setChatRooms(data.data.chatRooms);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const onlineData = {};
      
      // ดึงข้อมูลคนออนไลน์สำหรับทุกห้อง
      for (const room of chatRooms) {
                 try {
           const response = await fetch(
             `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${room.id}/online-users?userId=${currentUser._id}`,
             {
               credentials: 'include'
             }
           );
           
           if (response.ok) {
             const data = await response.json();
             if (data.success) {
               onlineData[room.id] = data.data.onlineCount;
             } else {
               onlineData[room.id] = 0;
             }
           } else if (response.status === 403) {
             // สำหรับห้องส่วนตัวที่ไม่ได้เป็นสมาชิก ให้แสดง 0
             onlineData[room.id] = 0;
           } else {
             onlineData[room.id] = 0;
           }
         } catch (error) {
           console.error(`Error fetching online users for room ${room.id}:`, error);
           onlineData[room.id] = 0;
         }
      }
      
             setOnlineUsers(onlineData);
       
       // คำนวณรวมคนออนไลน์ทั้งหมด
       const total = Object.values(onlineData).reduce((sum, count) => sum + count, 0);
       setTotalOnlineUsers(total);
     } catch (error) {
       console.error('Error fetching online users:', error);
     }
   };

  const handleRoomClick = async (room) => {
    // ตรวจสอบระดับสมาชิกก่อนเข้าห้อง
    if (room.type === 'private' && !canAccessPrivateChat(currentUser.membership?.tier || 'member')) {
      alert('คุณต้องเป็นสมาชิก Gold ขึ้นไปเพื่อเข้าแชทส่วนตัว');
      return;
    }

    // สำหรับห้องสาธารณะ - เข้าได้เลย
    if (room.type === 'public') {
      onSelectRoom(room.id);
      return;
    }

    // สำหรับห้องส่วนตัว - ต้องเข้าร่วมก่อน
    if (room.type === 'private' && !isUserMember(room)) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${room.id}/join`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              userId: currentUser._id
            })
          }
        );

        const data = await response.json();
        if (data.success) {
          fetchChatRooms();
          onSelectRoom(room.id);
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error joining room:', error);
        alert('เกิดข้อผิดพลาดในการเข้าร่วมห้องแชท');
      }
    } else {
      onSelectRoom(room.id);
    }
  };

  const getUserMembershipLimits = (tier) => {
    const limits = {
      member: { canAccessPrivateChat: false },
      silver: { canAccessPrivateChat: false },
      gold: { canAccessPrivateChat: true },
      vip: { canAccessPrivateChat: true },
      vip1: { canAccessPrivateChat: true },
      vip2: { canAccessPrivateChat: true },
      diamond: { canAccessPrivateChat: true },
      platinum: { canAccessPrivateChat: true }
    };
    return limits[tier] || limits.member;
  };

  const canAccessPrivateChat = (tier) => {
    return getUserMembershipLimits(tier).canAccessPrivateChat;
  };

  const canCreatePrivateRoom = (tier) => {
    return tier === 'platinum' || tier === 'diamond' || tier === 'vip1' || tier === 'vip2';
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-800',
      silver: 'bg-gray-200 text-gray-900',
      gold: 'bg-yellow-100 text-yellow-800',
      vip: 'bg-purple-100 text-purple-800',
      vip1: 'bg-purple-200 text-purple-900',
      vip2: 'bg-purple-300 text-purple-900',
      diamond: 'bg-blue-100 text-blue-800',
      platinum: 'bg-indigo-100 text-indigo-800'
    };
    return colors[tier] || colors.member;
  };

  const formatLastActivity = (date) => {
    if (!date) return 'ไม่ระบุ';
    
    try {
      const now = new Date();
      const lastActivity = new Date(date);
      const diffInMinutes = Math.floor((now - lastActivity) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'เมื่อสักครู่';
      if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ชั่วโมงที่แล้ว`;
      return `${Math.floor(diffInMinutes / 1440)} วันที่แล้ว`;
    } catch (error) {
      return 'ไม่ระบุ';
    }
  };

  const isUserMember = (room) => {
    return room.owner?.id === currentUser._id || 
           (room.members && room.members.some(member => member?.user === currentUser._id));
  };

  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดห้องแชท...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-violet-500 text-white p-4">
                 <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-3">
             <h2 className="text-xl font-semibold">ห้องแชท</h2>
             <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-lg">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-sm font-medium">{totalOnlineUsers} ออนไลน์</span>
             </div>
           </div>
           <div className="flex items-center space-x-3">
             {/* ปุ่มสร้างห้องส่วนตัวสำหรับ Platinum และ Diamond */}
             {canCreatePrivateRoom(currentUser.membership?.tier || 'member') && (
               <button
                 onClick={onCreatePrivateRoom}
                 className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-sm transition-colors"
               >
                 <Plus className="h-4 w-4" />
                 <span>สร้างห้องส่วนตัว</span>
               </button>
             )}
             <div className="text-sm text-right">
               <div>สมาชิก: {currentUser.membership?.tier?.toUpperCase() || 'MEMBER'}</div>
               <div className="text-xs opacity-80">
                 {canAccessPrivateChat(currentUser.membership?.tier || 'member')
                   ? 'เข้าแชทส่วนตัวได้'
                   : 'เฉพาะแชทสาธารณะ'}
               </div>
             </div>
           </div>
         </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
          <input
            type="text"
            placeholder="ค้นหาห้องแชท..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'public', label: 'สาธารณะ' },
            ...(canAccessPrivateChat(currentUser.membership?.tier || 'member')
              ? [{ key: 'private', label: 'ส่วนตัว' }]
              : [])
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                filterType === filter.key
                  ? 'bg-white text-pink-600 font-medium'
                  : 'text-white/80 hover:text-white hover:bg-white/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">ไม่พบห้องแชท</p>
            <p className="text-sm text-gray-400">ลองค้นหาด้วยคำอื่น</p>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const canAccess = room.type === 'public' ||
                            (room.type === 'private' && canAccessPrivateChat(currentUser.membership?.tier || 'member'));
            
            return (
              <div
                key={room.id}
                className={`bg-white border border-gray-200 rounded-lg p-4 transition-shadow cursor-pointer group ${
                  canAccess ? 'hover:shadow-md' : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => canAccess ? handleRoomClick(room) : null}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="flex items-center space-x-1">
                        {room.type === 'public' ? (
                          <Globe className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-orange-500" />
                        )}
                        <h3 className={`font-semibold transition-colors ${
                          canAccess ? 'text-gray-900 group-hover:text-pink-600' : 'text-gray-500'
                        }`}>
                          {room.name}
                        </h3>
                      </div>
                      <Badge variant="outline" className={`text-xs ${
                        room.type === 'public' ? 'border-green-200 text-green-700' : 'border-orange-200 text-orange-700'
                      }`}>
                        {room.type === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}
                      </Badge>
                      {(room.entryFee || 0) > 0 && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-800">
                          {room.entryFee} เหรียญ
                        </Badge>
                      )}
                    </div>
                    
                    {room.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {room.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{room.memberCount || 0} สมาชิก</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium">{onlineUsers[room.id] || 0} ออนไลน์</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{room.stats?.totalMessages || 0} ข้อความ</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastActivity(room.lastActivity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    {/* Owner Info */}
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={room.owner?.profileImages?.[0]} alt={room.owner?.displayName || 'Unknown'} />
                        <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                          {(room.owner?.displayName || room.owner?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-700 flex items-center">
                          <Crown className="h-3 w-3 text-yellow-500 mr-1" />
                          {room.owner?.displayName || room.owner?.username || 'Unknown User'}
                        </div>
                        <Badge className={`text-xs ${getMembershipBadgeColor(room.owner?.membershipTier)}`}>
                          {room.owner?.membershipTier?.toUpperCase() || 'MEMBER'}
                        </Badge>
                      </div>
                    </div>

                    {/* Access Status */}
                    <div className="text-right">
                      {canAccess ? (
                        <div className="text-xs text-green-600 font-medium">
                          {room.type === 'public' ? 'คลิกเพื่อแชท' :
                           isUserMember(room) ? 'คลิกเพื่อแชท' : 'คลิกเพื่อเข้าร่วม'}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          ต้องเป็นสมาชิก Gold+
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Age Restriction */}
                {room.ageRestriction && (
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span>อายุ: {room.ageRestriction?.minAge || 18}-{room.ageRestriction?.maxAge || 100} ปี</span>
                    {room.stats?.totalCoinsReceived > 0 && (
                      <span className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        {room.stats.totalCoinsReceived} เหรียญ
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatRoomList;