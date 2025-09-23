import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../services/socketManager';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import MediaPreview from './MediaPreview';
import YouTubePreview from './YouTubePreview';
import { separateYouTubeFromText } from '../utils/linkUtils';
import { membershipHelpers } from '../services/membershipAPI';
import { getProfileImageUrl } from '../utils/profileImageUtils';

import {
  Heart,
  Send,
  MoreVertical,
  Reply,
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

const PrivateChat = ({ 
  currentUser, 
  otherUser, 
  onBack, 
  onSendMessage,
  messages = [],
  isLoading = false,
  isOtherUserTyping = false,
  onSimulateTyping = null,
  onSimulateRead = null,
  onMessageRead = null,
  chatRoomId = null,
  showWebappNotification = null
}) => {
  const [messagesState, setMessagesState] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeChatters, setActiveChatters] = useState(new Set());
  const [activeChattersCount, setActiveChattersCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModal, setImageModal] = useState({ show: false, src: '', alt: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasScrolledToBottomRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // อัปเดตจำนวน active chatters เมื่อ activeChatters เปลี่ยน
  useEffect(() => {
    setActiveChattersCount(activeChatters.size);
  }, [activeChatters]);

  // อัปเดต active chatters จากข้อความที่มีอยู่
  useEffect(() => {
    if (messagesState.length > 0) {
      const chatters = new Set();
      messagesState.forEach(message => {
        if (message.sender && message.sender._id) {
          chatters.add(message.sender._id);
        }
      });
      setActiveChatters(chatters);
    }
  }, [messagesState]);

  // โหลดข้อความจาก props (ถ้ามี)
  useEffect(() => {
    if (messages && messages.length > 0) {
      console.log('📥 Loading messages from props:', messages.length, 'messages');
      setMessagesState(messages);
    }
  }, [messages]);

  // เชื่อมต่อ Socket.IO
  useEffect(() => {
    if (!chatRoomId || !currentUser?._id) return;

    console.log('🔌 Setting up private chat with socketManager for room:', chatRoomId);

    // ใช้ socketManager แทนการสร้าง socket ใหม่
    const connectSocket = async () => {
      try {
        const socket = await socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
        return socket;
      } catch (error) {
        console.error('❌ Failed to connect socket:', error);
        return null;
      }
    };

    connectSocket().then(socket => {
      if (!socket) {
        console.error('❌ Failed to establish socket connection');
        if (showWebappNotification) {
          showWebappNotification('ไม่สามารถเชื่อมต่อได้ กรุณารีเฟรชหน้าเว็บ', 'error');
        }
        return;
      }

      // ตรวจสอบสถานะการเชื่อมต่อ
      const connectionStatus = socketManager.getConnectionStatus();
      setIsConnected(connectionStatus.isConnected);

      // เข้าร่วมห้องแชท
      console.log('🔌 Joining private chat room:', chatRoomId);
      socketManager.joinRoom(chatRoomId, currentUser._id, sessionStorage.getItem('token'));

      // Event handlers สำหรับ socketManager
      const handleConnect = () => {
        console.log('🔌 Private chat socket connected');
        setIsConnected(true);
      };

      const handleDisconnect = () => {
        console.log('🔌 Private chat socket disconnected');
        setIsConnected(false);
      };

      const handleNewMessage = (message) => {
        console.log('📨 New private message received:', message);
        
        // เพิ่มผู้ส่งข้อความลงในรายการ active chatters
        if (message.sender && message.sender._id) {
          setActiveChatters(prev => {
            const newSet = new Set(prev);
            newSet.add(message.sender._id);
            return newSet;
          });
        }
        
        // ตรวจสอบว่าเป็นข้อความใหม่หรือไม่ (ป้องกัน duplicate)
        setMessagesState(prev => {
          const messageExists = prev.some(msg => msg._id === message._id);
          if (messageExists) {
            console.log('📨 Message already exists, skipping duplicate');
            return prev;
          }
          console.log('📨 Adding new message to state');
          return [...prev, message];
        });
        
        // ส่ง custom event ไปยัง App.tsx เพื่อ real-time update
        window.dispatchEvent(new CustomEvent('private-chat-message', {
          detail: { chatRoomId, message }
        }));
        
        scrollToBottomOnNewMessage();
      };

      // ตั้งค่า event listeners
      socketManager.on('connect', handleConnect);
      socketManager.on('disconnect', handleDisconnect);
      socketManager.on('new-message', handleNewMessage);
      socketManager.on('user-typing', (data) => {
        setTypingUsers(prev => {
          if (!prev.find(user => user.userId === data.userId)) {
            return [...prev, data];
          }
          return prev;
        });
      });
      socketManager.on('user-stop-typing', (data) => {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      });
      socketManager.on('online-count-updated', (data) => {
        setOnlineCount(data.onlineCount);
        setOnlineUsers(data.onlineUsers || []);
      });
      socketManager.on('membership-updated', (data) => {
        console.log('🔄 Received membership update:', data);
        setMessagesState(prev => prev.map(msg => {
          if (msg.sender && msg.sender._id === data.userId) {
            return {
              ...msg,
              sender: {
                ...msg.sender,
                membershipTier: data.membershipTier
              }
            };
          }
          return msg;
        }));
      });
      socketManager.on('new-private-chat', (data) => {
        console.log('🆕 Received new-private-chat event in PrivateChat:', data);
        window.dispatchEvent(new CustomEvent('new-private-chat-received', {
          detail: data
        }));
      });
      socketManager.on('error', (error) => {
        console.error('Socket error:', error);
        if (error.message === 'Unauthorized to join this private room') {
          if (showWebappNotification) {
            showWebappNotification('คุณไม่มีสิทธิ์เข้าห้องแชทส่วนตัวนี้');
          }
        } else if (error.message === 'Daily chat limit reached') {
          if (showWebappNotification) {
            showWebappNotification('คุณส่งข้อความครบตามจำนวนที่กำหนดแล้ว');
          }
        } else if (error.message && error.message.includes('send-message')) {
          if (showWebappNotification) {
            showWebappNotification('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่');
          }
        }
      });

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up private chat socket listeners');
        socketManager.off('connect', handleConnect);
        socketManager.off('disconnect', handleDisconnect);
        socketManager.off('new-message', handleNewMessage);
        socketManager.off('user-typing');
        socketManager.off('user-stop-typing');
        socketManager.off('online-count-updated');
        socketManager.off('membership-updated');
        socketManager.off('new-private-chat');
        socketManager.off('error');
      };
    });
  }, [chatRoomId, currentUser._id]);

  // โหลดข้อความเก่า
  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatRoomId || !currentUser?._id) return;
      
      try {
        console.log('📥 Fetching messages for private chat:', chatRoomId);
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/messages/${chatRoomId}?userId=${currentUser._id}`,
          {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📥 Fetched messages data:', data);
          
          if (data.success && data.data && data.data.messages) {
            console.log('📥 Setting messages state with:', data.data.messages.length, 'messages');
            setMessagesState(data.data.messages);
          } else {
            console.log('📥 No messages found or invalid response format');
            setMessagesState([]);
          }
        } else {
          console.error('📥 Failed to fetch messages:', response.status, response.statusText);
          const errorData = await response.json();
          console.error('📥 Error details:', errorData);
          setMessagesState([]);
        }
      } catch (error) {
        console.error('📥 Error fetching private messages:', error);
        setMessagesState([]);
      }
    };

    fetchMessages();
  }, [chatRoomId, currentUser._id]);

  // โหลดข้อมูลคนใช้งาน
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        console.log(`🔍 PrivateChat: Fetching online users for room: ${chatRoomId}`);
        
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatroom/${chatRoomId}/online-users?userId=${currentUser._id}`,
          {
            credentials: 'include'
          }
        );
        
        console.log(`📊 PrivateChat: Online users response status: ${response.status}`);
        const data = await response.json();
        
        if (data.success) {
          setOnlineUsers(data.data.onlineUsers);
          setOnlineCount(data.data.onlineCount);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
        setOnlineUsers([]);
        setOnlineCount(0);
      }
    };

    fetchOnlineUsers();
  }, [chatRoomId, currentUser._id]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('🔍 PrivateChat: Messages changed, scheduling scroll');
    console.log('🔍 PrivateChat: Messages count:', messagesState.length);
    console.log('🔍 PrivateChat: isInitialLoad:', isInitialLoadRef.current);
    
    if (messagesState.length > 0) {
      if (isInitialLoadRef.current) {
        // Scroll ไปยังข้อความล่าสุดเมื่อเข้าห้องแชทครั้งแรก
        console.log('🔍 PrivateChat: Initial load detected, scheduling scroll');
        setTimeout(() => {
          console.log('🔍 PrivateChat: Executing initial scroll');
          scrollToBottom();
          isInitialLoadRef.current = false;
          hasScrolledToBottomRef.current = true;
        }, 500);
      } else {
        // Scroll เฉพาะเมื่อมีข้อความใหม่และผู้ใช้อยู่ใกล้ด้านล่าง
        scrollToBottomOnNewMessage();
      }
    }
  }, [messagesState.length]);

  // ฟังก์ชัน scroll ลงด้านล่าง
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ฟังก์ชันใหม่สำหรับ scroll เฉพาะเมื่อมีข้อความใหม่
  const scrollToBottomOnNewMessage = () => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
    
    if (isNearBottom || hasScrolledToBottomRef.current) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const connectionStatus = socketManager.getConnectionStatus();
    if (!connectionStatus.isConnected) {
      console.error('❌ Socket not connected!');
      if (showWebappNotification) {
        showWebappNotification('การเชื่อมต่อขาดหาย กรุณาลองใหม่', 'error');
      }
      return;
    }

    const messageData = {
      content: newMessage.trim(),
      chatRoomId: chatRoomId,
      senderId: currentUser._id,
      messageType: 'text'
    };

    try {
      console.log('📤 Sending private message:', messageData);
      socketManager.emit('send-message', messageData);
      setNewMessage('');
      
      // Scroll ลงด้านล่างเมื่อผู้ใช้ส่งข้อความเอง
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      if (showWebappNotification) {
        showWebappNotification('เกิดข้อผิดพลาดในการส่งข้อความ');
      }
    }
  };

  const handleTyping = () => {
    const connectionStatus = socketManager.getConnectionStatus();
    if (!connectionStatus.isConnected) return;

    socketManager.emit('typing-start', {
      roomId: chatRoomId,
      userId: currentUser._id,
      username: currentUser.displayName || currentUser.username
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socketManager.emit('typing-stop', {
        roomId: chatRoomId,
        userId: currentUser._id
      });
    }, 1000);
  };

  const getMembershipBadgeColor = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-800',
      silver: 'bg-slate-200 text-slate-900',
      gold: 'bg-amber-100 text-amber-800',
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

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const renderMessageContent = (message) => {
    // Image message
    if (message.messageType === 'image' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <img
            src={message.fileUrl}
            alt="Shared image"
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setImageModal({ show: true, src: message.fileUrl, alt: 'Shared image' })}
          />
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    // File message
    if (message.messageType === 'file' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
            <Image className="h-5 w-5 text-gray-500" />
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              {message.fileName || 'Download File'}
            </a>
          </div>
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    // YouTube preview
    const youtubeLinks = separateYouTubeFromText(message.content);
    if (youtubeLinks.length > 0) {
      return (
        <div className="space-y-2">
          {youtubeLinks.map((link, index) => (
            <YouTubePreview key={index} url={link} />
          ))}
          <p className="text-sm">{youtubeLinks.reduce((text, link) => text.replace(link, ''), message.content).trim()}</p>
        </div>
      );
    }

    // Regular text message
    return <p className="text-sm">{message.content}</p>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-pink-500 to-violet-500 text-white p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src={getProfileImageUrl(otherUser?.profileImages?.[otherUser?.mainProfileImageIndex] || '', otherUser?._id)} alt={otherUser?.displayName || otherUser?.username} />
                <AvatarFallback>
                  {(otherUser?.displayName || otherUser?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm sm:text-lg">{otherUser?.displayName || otherUser?.username}</h3>
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-white/90">
                  <span>{activeChattersCount} ใช้งานแล้ว</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-sm sm:text-lg flex items-center">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                กำลังใช้งาน {onlineCount}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area - Scrollable */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {messagesState.map((message) => {
            const isOwnMessage = message.senderId === currentUser._id || message.sender?._id === currentUser._id;
            console.log('🔍 Message debug:', {
              messageId: message._id,
              messageSenderId: message.senderId,
              messageSenderObjectId: message.sender?._id,
              currentUserId: currentUser._id,
              isOwnMessage: isOwnMessage,
              messageContent: message.content
            });
            
            return (
            <div
              key={message._id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-2 max-w-xs sm:max-w-md lg:max-w-lg ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* แสดง Avatar เฉพาะข้อความของคนอื่น */}
                {!isOwnMessage && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={getProfileImageUrl(message.sender?.profileImages?.[message.sender?.mainProfileImageIndex] || '', message.sender?._id)} alt={message.sender?.displayName || message.sender?.username} />
                    <AvatarFallback>
                      {(message.sender?.displayName || message.sender?.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`rounded-lg p-3 ${isOwnMessage 
                  ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
                }`}>
                  {/* แสดงชื่อและ badge เฉพาะข้อความของคนอื่น */}
                  {!isOwnMessage && (
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-xs">
                        {message.sender?.displayName || message.sender?.username}
                      </span>
                      <Badge className={`text-xs ${getMembershipBadgeColor(message.sender?.membershipTier)}`}>
                        {message.sender?.membershipTier?.toUpperCase() || 'MEMBER'}
                      </Badge>
                    </div>
                  )}
                  
                  {renderMessageContent(message)}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatTime(message.createdAt || message.timestamp)}
                    </span>
                    
                    {/* แสดงปุ่ม reaction เฉพาะข้อความของคนอื่น */}
                    {!isOwnMessage && (
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:bg-gray-200"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:bg-gray-200"
                        >
                          <Reply className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}

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

        {/* Input Area - Fixed */}
        <div className="flex-shrink-0 p-2 sm:p-4 bg-white border-t border-gray-200">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => imageInputRef.current?.click()}
              className="text-gray-500 hover:text-pink-500"
            >
              <Image className="h-4 w-4 sm:h-5 sm:w-5" />
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
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base sm:text-base"
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

            <button
              onClick={() => {
                console.log('Private chat send button clicked!', { 
                  newMessage: newMessage.trim(), 
                  isConnected,
                  messageLength: newMessage.length 
                });
                if (newMessage.trim()) {
                  handleSendMessage();
                }
              }}
              disabled={!newMessage.trim()}
              style={{
                minWidth: '40px',
                minHeight: '40px',
                borderRadius: '50%',
                border: 'none',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                backgroundColor: newMessage.trim() ? '#ec4899' : '#9ca3af',
                color: 'white',
                opacity: newMessage.trim() ? '1' : '0.6',
                boxShadow: newMessage.trim() ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (newMessage.trim()) {
                  e.target.style.backgroundColor = '#be185d';
                  e.target.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (newMessage.trim()) {
                  e.target.style.backgroundColor = '#ec4899';
                  e.target.style.transform = 'scale(1)';
                }
              }}
              title={!newMessage.trim() ? 'กรุณาพิมพ์ข้อความ' : 'ส่งข้อความ'}
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
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

      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            // Handle image upload logic here
            console.log('Image selected:', file);
          }
        }}
      />
    </>
  );
};

export default PrivateChat;