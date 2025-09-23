import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Heart, 
  Reply, 
  Trash2,
  Image as ImageIcon,
  X,
  MessageCircle
} from 'lucide-react';
import { getProfileImageUrl } from '../utils/profileImageUtils';
import { membershipHelpers } from '../services/membershipAPI';

const PrivateChatSocket = ({ 
  chatId, 
  currentUser, 
  otherUser,
  onBack, 
  showWebappNotification,
  onMessageReceived,
  onTypingUpdate
}) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModal, setImageModal] = useState({ show: false, src: '', alt: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasScrolledToBottomRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // เชื่อมต่อ Socket.IO สำหรับแชทส่วนตัว
  useEffect(() => {
    if (!chatId || !currentUser?._id) return;

    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true,
      timeout: 30000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      forceNew: false,
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
      pingTimeout: 30000,
      pingInterval: 15000,
      allowEIO3: true,
      polling: {
        extraHeaders: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    });

    newSocket.on('connect', () => {
      console.log('🔌 Private chat socket connected:', newSocket.id);
      setIsConnected(true);
      
      // เข้าร่วมห้องแชทส่วนตัว
      const token = sessionStorage.getItem('token');
      newSocket.emit('join-private-chat', {
        chatId,
        userId: currentUser._id,
        otherUserId: otherUser?._id,
        token
      });
    });

    // รับ error จาก server
    newSocket.on('error', (error) => {
      console.error('❌ Private chat socket error:', error);
      if (error.message === 'Unauthorized to join this private chat') {
        if (showWebappNotification) {
          showWebappNotification('คุณไม่มีสิทธิ์เข้าห้องแชทส่วนตัวนี้');
        }
      } else if (error.message === 'Daily chat limit reached') {
        if (showWebappNotification) {
          showWebappNotification('คุณส่งข้อความครบตามจำนวนที่กำหนดแล้ว');
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Private chat socket disconnected');
      setIsConnected(false);
    });

    // รับข้อความใหม่
    newSocket.on('new-private-message', (message) => {
      console.log('📨 New private message received:', message);
      
      setMessages(prev => [...prev, message]);
      scrollToBottomOnNewMessage();
      
      // แจ้ง parent component
      if (onMessageReceived) {
        onMessageReceived(message);
      }
    });

    // Typing indicators
    newSocket.on('user-typing-private', (data) => {
      if (data.userId !== currentUser._id) {
        setOtherUserTyping(true);
        setTypingUsers(prev => {
          if (!prev.find(user => user.userId === data.userId)) {
            return [...prev, data];
          }
          return prev;
        });
        
        if (onTypingUpdate) {
          onTypingUpdate(true, data.userId);
        }
      }
    });

    newSocket.on('user-stop-typing-private', (data) => {
      if (data.userId !== currentUser._id) {
        setOtherUserTyping(false);
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
        
        if (onTypingUpdate) {
          onTypingUpdate(false, data.userId);
        }
      }
    });

    // Message reaction updates
    newSocket.on('private-message-reaction-updated', (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
    });

    // Error handling
    newSocket.on('connect_error', (error) => {
      console.error('❌ Private chat socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [chatId, currentUser?._id, otherUser?._id]);

  // โหลดข้อความเก่า
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/private-chat/${chatId}`, {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMessages(data.data || []);
            scrollToBottomOnNewMessage();
          }
        }
      } catch (error) {
        console.error('❌ Error fetching private chat messages:', error);
      }
    };

    fetchMessages();
  }, [chatId]);

  const scrollToBottomOnNewMessage = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleTyping = () => {
    if (!socket || !isConnected) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing-private', {
        chatId,
        userId: currentUser._id,
        otherUserId: otherUser?._id
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop-typing-private', {
        chatId,
        userId: currentUser._id,
        otherUserId: otherUser?._id
      });
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) return;

    // ตรวจสอบระดับสมาชิกก่อนส่งข้อความ
    const userLimits = getUserMembershipLimits(currentUser.membership?.tier || 'member');
    
    if (editingMessage) {
      // แก้ไขข้อความ
      handleEditMessage(editingMessage._id, newMessage);
    } else {
      // ตรวจสอบจำนวนข้อความที่ส่งได้ตามระดับสมาชิก
      const canSend = canSendMessage(currentUser.membership?.tier || 'member');
      
      if (!canSend) {
        if (showWebappNotification) {
          showWebappNotification(`คุณส่งข้อความครบตามระดับสมาชิกแล้ว (${userLimits.dailyChats} ข้อความต่อวัน)`);
        }
        return;
      }

      // ส่งข้อความใหม่ผ่าน Socket.IO
      socket.emit('send-private-message', {
        content: newMessage,
        senderId: currentUser._id,
        chatId: chatId,
        messageType: 'text',
        replyToId: replyTo?._id,
        otherUserId: otherUser?._id
      });
      
      // เพิ่มจำนวนข้อความที่ส่งไปแล้ววันนี้ (สำหรับ tier ที่มี limit)
      const currentTier = currentUser.membership?.tier || 'member';
      const limits = getUserMembershipLimits(currentTier);
      if (limits.dailyChats !== -1) {
        const now = new Date();
        const today = now.toDateString();
        const dailyUsage = JSON.parse(localStorage.getItem('dailyUsage') || '{}');
        
        if (dailyUsage[today]) {
          dailyUsage[today].chats = (dailyUsage[today].chats || 0) + 1;
        } else {
          dailyUsage[today] = { chats: 1, votes: 0, blurs: 0 };
        }
        
        localStorage.setItem('dailyUsage', JSON.stringify(dailyUsage));
      }
      
      setNewMessage('');
      setReplyTo(null);
      
      // Stop typing
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stop-typing-private', {
          chatId,
          userId: currentUser._id,
          otherUserId: otherUser?._id
        });
      }
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    if (!socket || !isConnected) return;

    socket.emit('edit-private-message', {
      messageId,
      newContent,
      chatId,
      userId: currentUser._id
    });

    setEditingMessage(null);
    setNewMessage('');
  };

  const handleDeleteMessage = async (messageId) => {
    if (!socket || !isConnected) return;

    socket.emit('delete-private-message', {
      messageId,
      chatId,
      userId: currentUser._id
    });
  };

  const handleReaction = async (messageId, reactionType) => {
    if (!socket || !isConnected) return;

    socket.emit('react-to-private-message', {
      messageId,
      reactionType,
      chatId,
      userId: currentUser._id
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result);
        setImagePreview(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || !socket || !isConnected) return;

    setUploadingImage(true);
    
    try {
      // ส่งรูปภาพผ่าน Socket.IO
      socket.emit('send-private-message', {
        content: '',
        senderId: currentUser._id,
        chatId: chatId,
        messageType: 'image',
        imageData: selectedImage,
        otherUserId: otherUser?._id
      });

      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('❌ Error sending image:', error);
      if (showWebappNotification) {
        showWebappNotification('เกิดข้อผิดพลาดในการส่งรูปภาพ');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return '--:--';
    }
    
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('th-TH', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getUserMembershipLimits = (tier) => {
    return membershipHelpers.getUserLimits(tier);
  };

  const canSendMessage = (tier) => {
    return membershipHelpers.canSendMessage(tier);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={getProfileImageUrl(otherUser?.profileImages?.[0], otherUser?._id)} 
              alt={otherUser?.displayName || otherUser?.username} 
            />
            <AvatarFallback>
              {otherUser?.displayName?.charAt(0) || otherUser?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-sm">
              {otherUser?.displayName || otherUser?.username}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'ออนไลน์' : 'ออฟไลน์'}
              </span>
              {otherUserTyping && (
                <span className="text-xs text-blue-500">กำลังพิมพ์...</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.sender?._id === currentUser._id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender?._id === currentUser._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.replyTo && (
                <div className="text-xs opacity-75 mb-1 border-l-2 pl-2">
                  ตอบกลับ: {message.replyTo.content}
                </div>
              )}
              
              {message.messageType === 'image' && message.fileUrl && (
                <div className="mb-2">
                  <img
                    src={message.fileUrl}
                    alt="Sent image"
                    className="max-w-full h-auto rounded cursor-pointer"
                    onClick={() => setImageModal({ 
                      show: true, 
                      src: message.fileUrl, 
                      alt: 'Sent image' 
                    })}
                  />
                </div>
              )}
              
              <div className="text-sm">{message.content}</div>
              
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs opacity-75">
                  {formatTime(message.createdAt)}
                </span>
                
                {message.sender?._id === currentUser._id && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => setEditingMessage(message)}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => handleDeleteMessage(message._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="p-4 border-t bg-gray-50">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full h-32 object-cover rounded"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 p-1 h-auto"
              onClick={() => {
                setImagePreview(null);
                setSelectedImage(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white">
        {replyTo && (
          <div className="mb-2 p-2 bg-gray-100 rounded text-sm">
            <div className="flex items-center justify-between">
              <span>ตอบกลับ: {replyTo.content}</span>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            className="p-2"
          >
            <ImageIcon className="h-4 w-4" />
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
              placeholder="พิมพ์ข้อความ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {selectedImage ? (
            <Button
              onClick={handleSendImage}
              disabled={uploadingImage}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {uploadingImage ? 'กำลังส่ง...' : 'ส่งรูป'}
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {imageModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={imageModal.src}
              alt={imageModal.alt}
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-2 bg-white rounded-full"
              onClick={() => setImageModal({ show: false, src: '', alt: '' })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateChatSocket;
