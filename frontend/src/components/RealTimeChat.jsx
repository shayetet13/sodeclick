import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import MediaPreview from './MediaPreview';

import {
  Heart,
  Send,
  MoreVertical,
  Reply,
  Mic,
  X,
  ArrowLeft,
  ThumbsUp,
  Laugh,
  Angry,
  Frown,
  Image,
  Trash2,
  Smile
} from 'lucide-react';

const RealTimeChat = ({ roomId, currentUser, onBack }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModal, setImageModal] = useState({ show: false, src: '', alt: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const imageInputRef = useRef(null);

  // เชื่อมต่อ Socket.IO
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      
      // เข้าร่วมห้องแชท
      newSocket.emit('join-room', {
        roomId,
        userId: currentUser._id
      });
    });

    // รับ error จาก server
    newSocket.on('error', (error) => {
      console.error('Server error:', error);
      if (error.message === 'Unauthorized to join this private room') {
        alert('คุณไม่มีสิทธิ์เข้าห้องแชทส่วนตัวนี้');
      } else if (error.message === 'Daily chat limit reached') {
        alert('คุณส่งข้อความครบตามจำนวนที่กำหนดแล้ว');
      } else if (error.message === 'คุณได้กดหัวใจข้อความนี้แล้ว') {
        alert('คุณได้กดหัวใจข้อความนี้แล้ว');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // รับข้อความใหม่
    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottomOnNewMessage();
    });

    // อัปเดต reaction
    newSocket.on('message-reaction-updated', (data) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === data.messageId) {
          // อัปเดต reactions array
          let updatedReactions = msg.reactions || [];
          
                     if (data.action === 'removed') {
             // ลบ reaction ของผู้ใช้นี้
             updatedReactions = updatedReactions.filter(
               reaction => !((reaction.user === data.userId || reaction.user._id === data.userId) && reaction.type === data.reactionType)
             );
           } else if (data.action === 'added') {
             // เพิ่ม reaction ใหม่
             const existingIndex = updatedReactions.findIndex(
               reaction => (reaction.user === data.userId || reaction.user._id === data.userId) && reaction.type === data.reactionType
             );
            
            if (existingIndex === -1) {
              // เพิ่ม reaction ใหม่
              updatedReactions.push({
                user: data.userId,
                type: data.reactionType,
                createdAt: new Date()
              });
            }
          } else if (data.action === 'changed') {
            // เปลี่ยน reaction type
            const existingIndex = updatedReactions.findIndex(
              reaction => reaction.user === data.userId
            );
            
            if (existingIndex !== -1) {
              // อัปเดต reaction type
              updatedReactions[existingIndex].type = data.reactionType;
              updatedReactions[existingIndex].createdAt = new Date();
            }
          }
          
          return {
            ...msg,
            reactions: updatedReactions,
            stats: data.stats
          };
        }
        return msg;
      }));
    });

    // Typing indicators
    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(user => user.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user-stop-typing', (data) => {
      setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
    });

    // Online count updates
    newSocket.on('online-count-updated', (data) => {
      setOnlineCount(data.onlineCount);
      setOnlineUsers(data.onlineUsers || []);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      // ไม่แสดง alert ทุกครั้งที่มี error เพื่อไม่ให้รบกวนผู้ใช้
      if (error.message && !error.message.includes('Unauthorized')) {
        console.log('Socket error details:', error);
      }
    });

    // Connection error handling
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [roomId, currentUser._id]);

  // โหลดข้อความเก่า
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${roomId}?userId=${currentUser._id}`,
          {
            credentials: 'include'
          }
        );
        const data = await response.json();
        
        if (data.success) {
          setMessages(data.data.messages);
          // ไม่ต้อง scroll เมื่อโหลดข้อความเก่า เพื่อไม่ให้รบกวนผู้ใช้
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [roomId, currentUser._id]);

  // โหลดข้อมูลห้องแชท
  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${roomId}?userId=${currentUser._id}`,
          {
            credentials: 'include'
          }
        );
        const data = await response.json();
        
        if (data.success) {
          setRoomInfo(data.data);
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
      }
    };

    fetchRoomInfo();
  }, [roomId, currentUser._id]);

  // โหลดข้อมูลคนออนไลน์
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/${roomId}/online-users?userId=${currentUser._id}`,
          {
            credentials: 'include'
          }
        );
        const data = await response.json();
        
        if (data.success) {
          setOnlineUsers(data.data.onlineUsers);
          setOnlineCount(data.data.onlineCount);
        }
      } catch (error) {
        console.error('Error fetching online users:', error);
        // ถ้าไม่สามารถดึงข้อมูลได้ ให้เริ่มต้นด้วย 0
        setOnlineUsers([]);
        setOnlineCount(0);
      }
    };

    fetchOnlineUsers();
  }, [roomId, currentUser._id]);



  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  // ฟังก์ชันใหม่สำหรับ scroll เฉพาะเมื่อมีข้อความใหม่
  const scrollToBottomOnNewMessage = () => {
    // ใช้ setTimeout เพื่อให้ DOM อัปเดตก่อน
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        const scrollTop = messagesContainer.scrollTop;
        const scrollHeight = messagesContainer.scrollHeight;
        const clientHeight = messagesContainer.clientHeight;
        
        // ตรวจสอบว่าผู้ใช้อยู่ที่ด้านล่างหรือใกล้ด้านล่าง (ภายใน 200px)
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 200;
        
        // ถ้าผู้ใช้อยู่ที่ด้านล่างหรือใกล้ด้านล่าง ให้ scroll ลง
        if (isAtBottom) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    }, 50);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    // ตรวจสอบระดับสมาชิกก่อนส่งข้อความ
    const userLimits = getUserMembershipLimits(currentUser.membership?.tier || 'member');
    
    if (editingMessage) {
      // แก้ไขข้อความ
      handleEditMessage(editingMessage._id, newMessage);
    } else {
      // ตรวจสอบจำนวนข้อความที่ส่งได้ตามระดับสมาชิก
      if (!canSendMessage(currentUser.membership?.tier || 'member')) {
        alert(`คุณส่งข้อความครบตามระดับสมาชิกแล้ว (${userLimits.dailyChats} ข้อความต่อวัน)`);
        return;
      }

      // ส่งข้อความใหม่
      socket.emit('send-message', {
        content: newMessage,
        senderId: currentUser._id,
        chatRoomId: roomId,
        messageType: 'text',
        replyToId: replyTo?._id
      });
      
      // Scroll ลงด้านล่างเมื่อผู้ใช้ส่งข้อความเอง
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }

    setNewMessage('');
    setReplyTo(null);
    setEditingMessage(null);
    messageInputRef.current?.focus();
  };

  const getUserMembershipLimits = (tier) => {
    const limits = {
      member: { dailyChats: 5 },
      silver: { dailyChats: 15 },
      gold: { dailyChats: 50 },
      vip: { dailyChats: 100 },
      vip1: { dailyChats: 200 },
      vip2: { dailyChats: 500 },
      diamond: { dailyChats: -1 }, // unlimited
      platinum: { dailyChats: -1 } // unlimited
    };
    return limits[tier] || limits.member;
  };

  const canSendMessage = (tier) => {
    const limits = getUserMembershipLimits(tier);
    // สำหรับ demo ให้ส่งได้เสมอ (ในระบบจริงต้องเช็คจาก backend)
    return limits.dailyChats === -1 || true;
  };

  const handleReactToMessage = (messageId, reactionType = 'heart') => {
    if (!socket) return;

    // ตรวจสอบว่าผู้ใช้เคยกด reaction นี้แล้วหรือไม่
    const message = messages.find(msg => msg._id === messageId);
    const hasReacted = message && message.reactions && message.reactions.some(
      reaction => (reaction.user === currentUser._id || reaction.user._id === currentUser._id) && reaction.type === reactionType
    );
    
    // ส่งข้อมูลไปยัง backend
    socket.emit('react-message', {
      messageId,
      userId: currentUser._id,
      reactionType,
      action: hasReacted ? 'remove' : 'add'
    });
  };

  // ฟังก์ชันตรวจสอบว่าผู้ใช้เคยกด like แล้วหรือไม่
  const hasUserLiked = (message) => {
    if (!message.reactions || !currentUser._id) return false;
    return message.reactions.some(
      reaction => (reaction.user === currentUser._id || reaction.user._id === currentUser._id) && reaction.type === 'heart'
    );
  };

  // ฟังก์ชันนับจำนวน like
  const getLikeCount = (message) => {
    if (!message.reactions) return 0;
    return message.reactions.filter(reaction => reaction.type === 'heart').length;
  };

  // ฟังก์ชันตรวจสอบว่าผู้ใช้ react แล้วหรือไม่ (สำหรับ reaction อื่นๆ)
  const hasUserReacted = (message, reactionType) => {
    if (!message.reactions || !currentUser._id) return false;
    return message.reactions.some(
      reaction => (reaction.user === currentUser._id || reaction.user._id === currentUser._id) && reaction.type === reactionType
    );
  };



  const handleEditMessage = async (messageId, newContent) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            content: newContent,
            userId: currentUser._id
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content: newContent, isEdited: true, editedAt: new Date() }
            : msg
        ));
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !socket) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('senderId', currentUser._id);
    formData.append('chatRoomId', roomId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatroom/upload`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // ส่งข้อความรูปภาพผ่าน socket
        const messageData = {
          content: '',
          senderId: currentUser._id,
          chatRoomId: roomId,
          messageType: 'image',
          fileUrl: data.data.fileUrl
        };
        
        socket.emit('send-message', messageData);
        
        // Scroll ลงด้านล่างเมื่อผู้ใช้ส่งรูปภาพ
        setTimeout(() => {
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
        
        // รีเซ็ต state
        setSelectedImage(null);
        setImagePreview(null);
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      } else {
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + (data.message || 'ไม่ทราบสาเหตุ'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const handleDeleteMessage = async (messageId) => {
    // ตรวจสอบว่าเป็นข้อความรูปภาพและยังไม่เกิน 3 วินาทีหรือไม่
    const message = messages.find(msg => msg._id === messageId);
    if (message && message.messageType === 'image') {
      const messageTime = new Date(message.createdAt);
      const currentTime = new Date();
      const timeDiff = (currentTime - messageTime) / 1000; // วินาที
      
      if (timeDiff > 3) {
        alert('ไม่สามารถลบรูปภาพได้หลังจาก 3 วินาที');
        return;
      }
    } else {
      if (!confirm('คุณต้องการลบข้อความนี้หรือไม่?')) return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${messageId}`,
        {
          method: 'DELETE',
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
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };



  const handleTyping = () => {
    if (!socket) return;

    socket.emit('typing-start', {
      roomId,
      userId: currentUser._id,
      username: currentUser.displayName || currentUser.username
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', {
        roomId,
        userId: currentUser._id
      });
    }, 1000);
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

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };





  const renderMessageContent = (message) => {
    // Image message
    if (message.messageType === 'image' && (message.imageUrl || message.fileUrl)) {
      const imageUrl = message.imageUrl || message.fileUrl;
      return (
        <div className="space-y-2">
          <img
            src={imageUrl}
            alt="Shared image"
            className="max-w-48 max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
            onClick={() => {
              setImageModal({
                show: true,
                src: imageUrl,
                alt: 'Shared image'
              });
            }}
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              e.target.style.display = 'none';
            }}
          />
          {message.content && (
            <div className="text-sm">
              {message.content}
            </div>
          )}
        </div>
      );
    }
    
    // Text only message
    return message.content;
  };

     const getReactionIcon = (type) => {
     switch (type) {
       case 'heart':
         return <Heart className="h-3 w-3" />;
       case 'thumbsup':
         return <ThumbsUp className="h-3 w-3" />;
       case 'laugh':
         return <Laugh className="h-3 w-3" />;
       case 'angry':
         return <Angry className="h-3 w-3" />;
       case 'sad':
         return <Frown className="h-3 w-3" />;
       default:
         return <Heart className="h-3 w-3" />;
     }
   };

  if (!roomInfo) {
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
    <>
      <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h3 className="font-semibold text-lg">{roomInfo.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-white/90">
                  <span>{roomInfo.memberCount} สมาชิก</span>
                  <span>•</span>
                  <span className={`flex items-center ${isConnected ? 'text-green-200' : 'text-red-200'}`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-200' : 'bg-red-200'}`}></div>
                    {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
                  </span>
                </div>
              </div>
            </div>
                         <div className="flex items-center space-x-2">
               <span className="text-sm">{onlineCount} ออนไลน์</span>
               <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                 <MoreVertical className="h-5 w-5" />
               </Button>
             </div>
          </div>
        </div>

                    {/* Messages Area */}
       <div className="messages-container flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
         {messages.map((message, index) => (
           <div
             key={message._id}
             className={`flex ${message.sender._id === currentUser._id ? 'justify-end' : 'justify-start'} ${
               index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
             } p-2 rounded-lg`}
           >
            <div className={`flex max-w-[70%] ${message.sender._id === currentUser._id ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <Avatar className="w-8 h-8 mx-2">
                <AvatarImage 
                  src={message.sender.profileImages?.[0]} 
                  alt={message.sender.displayName || message.sender.username} 
                />
                <AvatarFallback className="bg-gradient-to-r from-pink-400 to-violet-400 text-white text-xs">
                  {(message.sender.displayName || message.sender.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Message Content */}
              <div className={`flex flex-col ${message.sender._id === currentUser._id ? 'items-end' : 'items-start'}`}>
                {/* Sender Info */}
                <div className={`flex items-center space-x-2 mb-1 ${message.sender._id === currentUser._id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-sm font-medium text-gray-700">
                    {message.sender.displayName || message.sender.username}
                  </span>
                  <Badge className={`text-xs ${getMembershipBadgeColor(message.sender.membershipTier)}`}>
                    {message.sender.membershipTier?.toUpperCase() || 'MEMBER'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>

                {/* Reply To */}
                {message.replyTo && (
                  <div className="bg-gray-200 rounded-lg p-2 mb-2 text-sm max-w-full">
                    <div className="text-gray-600 text-xs mb-1">
                      ตอบกลับ {message.replyTo.sender?.displayName || message.replyTo.sender?.username}
                    </div>
                    <div className="text-gray-800 truncate">
                      {message.replyTo.content}
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative rounded-2xl px-4 py-2 max-w-full break-words group ${
                    message.sender._id === currentUser._id
                      ? 'bg-gray-100 text-black'
                      : 'bg-white text-black shadow-sm border'
                  }`}
                >
                                     {renderMessageContent(message)}
                   
                   {message.isEdited && (
                     <div className="text-xs opacity-70 mt-1">
                       แก้ไขแล้ว
                     </div>
                   )}

                                       {/* Message Actions - ปุ่ม Like, Reply และ Delete ใต้ข้อความ */}
                    <div className="flex items-center space-x-4 mt-2 pt-2 border-t border-gray-200">
                                             {/* Like Button */}
                       <button
                         onClick={() => handleReactToMessage(message._id, 'heart')}
                         disabled={hasUserLiked(message)}
                         className={`flex items-center space-x-1 text-xs transition-all duration-200 rounded-full px-2 py-1 ${
                           hasUserLiked(message) 
                             ? 'bg-red-100 text-red-600 cursor-not-allowed' 
                             : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                         }`}
                         title={hasUserLiked(message) ? 'คุณได้กดหัวใจแล้ว' : 'กดไลค์'}
                       >
                         <Heart className={`h-4 w-4 ${hasUserLiked(message) ? 'fill-current text-red-600' : 'text-gray-600'}`} />
                         <span className="font-medium">{hasUserLiked(message) ? 'Liked' : 'Like'}</span>
                         {getLikeCount(message) > 0 && (
                           <span className="text-xs ml-1">({getLikeCount(message)})</span>
                         )}
                       </button>
                      
                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyTo(message)}
                        className="flex items-center space-x-1 text-xs text-black hover:text-blue-500 transition-colors"
                        title="ตอบกลับข้อความนี้"
                      >
                        <Reply className="h-4 w-4" />
                        <span>Reply</span>
                      </button>

                     {/* Delete Button - แสดงเฉพาะข้อความรูปภาพที่ยังไม่เกิน 3 วินาที */}
                     {message.messageType === 'image' && message.sender._id === currentUser._id && (
                       (() => {
                         const messageTime = new Date(message.createdAt);
                         const currentTime = new Date();
                         const timeDiff = (currentTime - messageTime) / 1000;
                         
                         if (timeDiff <= 3) {
                           return (
                             <button
                               onClick={() => handleDeleteMessage(message._id)}
                               className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                             >
                               <Trash2 className="h-4 w-4" />
                               <span>ลบ ({Math.ceil(3 - timeDiff)}s)</span>
                             </button>
                           );
                         }
                         return null;
                       })()
                     )}
                   </div>

                                      {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1 mt-2">
                        {Object.entries(
                          message.reactions.reduce((acc, reaction) => {
                            acc[reaction.type] = (acc[reaction.type] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([type, count]) => {
                          const userHasReacted = hasUserReacted(message, type);
                          return (
                                                         <button
                               key={type}
                               onClick={() => handleReactToMessage(message._id, type)}
                               disabled={userHasReacted}
                               className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs transition-colors ${
                                 userHasReacted 
                                   ? 'bg-red-100 text-red-600 cursor-not-allowed' 
                                   : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                               }`}
                               title={userHasReacted ? `คุณได้กด ${type} แล้ว` : `กด ${type}`}
                             >
                               <div className={userHasReacted ? 'text-red-600' : 'text-gray-600'}>
                                 {getReactionIcon(type)}
                               </div>
                               <span>{count}</span>
                             </button>
                          );
                        })}
                      </div>
                    )}


                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.map(user => user.username).join(', ')} กำลังพิมพ์...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply/Edit Bar */}
      {(replyTo || editingMessage) && (
        <div className="bg-blue-50 border-t border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-800">
                {editingMessage ? 'แก้ไขข้อความ' : `ตอบกลับ ${replyTo?.sender?.displayName || replyTo?.sender?.username}`}
              </div>
              <div className="text-sm text-blue-600 truncate">
                {editingMessage ? editingMessage.content : replyTo?.content}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setReplyTo(null);
                setEditingMessage(null);
                setNewMessage('');
              }}
              className="text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

                     {/* Input Area */}
        <div className="border-t bg-white p-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-3 relative">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-lg border"
                />
                <button
                  onClick={handleCancelImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-2 flex space-x-2">
                <Button
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm"
                >
                  {uploadingImage ? 'กำลังอัปโหลด...' : 'ส่งรูปภาพ'}
                </Button>
                <Button
                  onClick={handleCancelImage}
                  variant="outline"
                  className="text-sm"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}

                     <div className="flex items-center space-x-2">
             {/* Image Upload Button */}
             <input
               ref={imageInputRef}
               type="file"
               accept="image/*"
               onChange={handleImageSelect}
               className="hidden"
             />
             <Button 
               size="icon" 
               variant="ghost" 
               onClick={() => imageInputRef.current?.click()}
               className="text-gray-500 hover:text-gray-700"
               title="เพิ่มรูปภาพ"
             >
               <Image className="h-5 w-5" />
             </Button>

                                                       

              {/* Emoji Button */}
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-500 hover:text-gray-700"
                title="เพิ่มอีโมจิ"
              >
                <Smile className="h-5 w-5" />
              </Button>

              <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-700">
                <Mic className="h-5 w-5" />
              </Button>
          
          <div className="flex-1 relative">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={editingMessage ? 'แก้ไขข้อความ...' : 'พิมพ์ข้อความ...'}
              className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={!isConnected}
            />

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10">
                <div className="grid grid-cols-8 gap-1">
                  {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'].map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          
          
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedImage) || !isConnected}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>

    {/* Image Modal - Full Screen */}
    {imageModal.show && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]"
        onClick={() => setImageModal({ show: false, src: '', alt: '' })}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imageModal.src}
            alt={imageModal.alt}
            className="w-full h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setImageModal({ show: false, src: '', alt: '' })}
            className="absolute top-6 right-6 bg-black bg-opacity-70 text-white rounded-full p-3 hover:bg-opacity-90 transition-opacity z-10"
          >
            <X className="h-8 w-8" />
          </button>
        </div>
      </div>
    )}
  </>
);
};

export default RealTimeChat;