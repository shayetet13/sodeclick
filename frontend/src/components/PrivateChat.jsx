import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../services/socketManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getProfileImageUrl } from '../utils/profileImageUtils';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Video, 
  FileText,
  Smile,
  MoreVertical,
  Phone,
  Video as VideoCall
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
  chatRoomId = null
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSentTime, setLastSentTime] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});

  // เชื่อมต่อ Socket.IO สำหรับ private chat (optimized)
  useEffect(() => {
    if (!chatRoomId || !currentUser?._id) return;
    
    // ตรวจสอบการเปลี่ยนแปลงจริงๆ
    const socket = socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    const isAlreadyInCorrectRoom = socket.currentRoom === chatRoomId && 
                                 socket.currentUserId === currentUser._id;
    
    // ถ้าอยู่ในห้องถูกต้องแล้ว ไม่ต้องทำอะไร
    if (isAlreadyInCorrectRoom) {
      console.log('🔌 Already in correct room, skipping setup');
      return;
    }
    
    console.log('🔌 Setting up new room connection:', chatRoomId);
    
    // ออกจากห้องเก่าก่อน (ถ้ามี)
    if (socket.currentRoom && socket.currentRoom !== chatRoomId) {
      console.log('🔌 Leaving previous room:', socket.currentRoom);
      socketManager.leaveRoom(socket.currentRoom);
    }
    
    // เตรียม event handlers
    const handleConnect = () => {
      console.log('🔌 Socket connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    };

    const handleNewMessage = (message) => {
      console.log('📨 New message received:', message);
      const formattedMessage = {
        _id: message._id,
        content: message.content,
        senderId: message.sender?._id || message.sender,
        timestamp: message.createdAt || new Date(),
        isDelivered: true,
        isRead: false,
        sender: message.sender,
        fileUrl: message.fileUrl,
        messageType: message.messageType
      };
      
      if (onSendMessage && typeof onSendMessage === 'function') {
        onSendMessage(null, null, formattedMessage, 'socket-message');
      }
      
      window.dispatchEvent(new CustomEvent('unread-count-update', {
        detail: { chatRoomId, unreadCount: 1 }
      }));
    };

    const handleUnreadCountUpdate = (data) => {
      console.log('📊 Unread count update:', data);
      window.dispatchEvent(new CustomEvent('unread-count-update', { detail: data }));
    };

    const handleMessageDelivered = (data) => {
      console.log('📬 Message delivered:', data);
      window.dispatchEvent(new CustomEvent('message-status-update', {
        detail: { messageId: data.messageId, status: 'delivered' }
      }));
    };

    const handleMessageRead = (data) => {
      console.log('👁️ Message read:', data);
      if (onMessageRead && data.messageId) {
        onMessageRead(data.messageId);
      }
      window.dispatchEvent(new CustomEvent('message-status-update', {
        detail: { messageId: data.messageId, status: 'read' }
      }));
    };

    // ตั้งค่า event listeners
    socketManager.on('connect', handleConnect);
    socketManager.on('disconnect', handleDisconnect);
    socketManager.on('new-message', handleNewMessage);
    socketManager.on('unread-count-update', handleUnreadCountUpdate);
    socketManager.on('message-delivered', handleMessageDelivered);
    socketManager.on('message-read', handleMessageRead);
    
    // รอแล้วค่อย join room เพื่อป้องกัน rate limiting
    const joinTimeout = setTimeout(() => {
      console.log('🔌 Joining room:', chatRoomId);
      socketManager.joinRoom(chatRoomId, currentUser._id);
    }, 200);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up event listeners');
      clearTimeout(joinTimeout);
      socketManager.off('connect', handleConnect);
      socketManager.off('disconnect', handleDisconnect);
      socketManager.off('new-message', handleNewMessage);
      socketManager.off('unread-count-update', handleUnreadCountUpdate);
      socketManager.off('message-delivered', handleMessageDelivered);
      socketManager.off('message-read', handleMessageRead);
    };
  }, [chatRoomId, currentUser?._id]); // ลด dependencies และใช้ optional chaining

  // Cleanup เมื่อ component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 PrivateChat component unmounting, leaving room');
      if (chatRoomId) {
        socketManager.leaveRoom(chatRoomId);
      }
    };
  }, []); // รันแค่ครั้งเดียวเมื่อ mount/unmount

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ตรวจจับการมองเห็นข้อความเพื่อทำเครื่องหมายว่าอ่านแล้ว (Throttled)
  useEffect(() => {
    if (!messagesContainerRef.current || !currentUser || messages.length === 0) return;

    // Throttle การทำเครื่องหมายอ่าน
    let readTimeout = null;
    const readQueue = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageElement = entry.target;
            const messageId = messageElement.getAttribute('data-message-id');
            const senderId = messageElement.getAttribute('data-sender-id');
            
            // ถ้าไม่ใช่ข้อความของตัวเองและยังไม่ได้อ่าน
            if (messageId && senderId !== currentUser._id) {
              const message = messages.find(m => m._id === messageId);
              if (message && !message.isRead) {
                // เพิ่มลงใน queue
                readQueue.add(messageId);
                
                // ประมวลผล queue หลังจาก 1 วินาที
                if (readTimeout) clearTimeout(readTimeout);
                readTimeout = setTimeout(() => {
                  readQueue.forEach(id => markMessageAsRead(id));
                  readQueue.clear();
                }, 1000);
              }
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        rootMargin: '0px',
        threshold: 0.7 // เพิ่มเป็น 70% เพื่อความแน่ใจ
      }
    );

    // สังเกตการณ์เฉพาะข้อความที่ยังไม่ได้อ่าน
    Object.values(messageRefs.current).forEach((messageEl) => {
      if (messageEl) {
        const messageId = messageEl.getAttribute('data-message-id');
        const senderId = messageEl.getAttribute('data-sender-id');
        
        if (messageId && senderId !== currentUser._id) {
          const message = messages.find(m => m._id === messageId);
          if (message && !message.isRead) {
            observer.observe(messageEl);
          }
        }
      }
    });

    return () => {
      if (readTimeout) clearTimeout(readTimeout);
      observer.disconnect();
    };
  }, [messages, currentUser]);

  // ฟังก์ชันทำเครื่องหมายข้อความว่าอ่านแล้ว
  const markMessageAsRead = (messageId) => {
    if (!chatRoomId || !currentUser) return;

    console.log('👁️ Marking message as read:', messageId);
    
    // ส่งผ่าน Socket.IO
    socketManager.emit('mark-message-read', {
      messageId: messageId,
      chatRoomId: chatRoomId,
      userId: currentUser._id
    });

    // เรียกใช้ callback
    if (onMessageRead) {
      onMessageRead(messageId);
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !chatRoomId) return;

    const now = Date.now();
    
    // Debounce - ป้องกันการส่งข้อความซ้ำภายใน 1 วินาที
    if (now - lastSentTime < 1000) {
      console.log('🚫 Message sending throttled - too frequent');
      return;
    }
    setLastSentTime(now);

    const messageData = {
      content: newMessage.trim(),
      chatRoomId: chatRoomId,
      senderId: currentUser._id,
      messageType: 'text'
    };

    // สร้างข้อความชั่วคราว
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      content: newMessage.trim(),
      senderId: currentUser._id,
      timestamp: new Date(),
      isDelivered: false,
      isRead: false,
      sender: currentUser,
      isTemporary: true
    };

    // ส่งข้อความชั่วคราวไปยัง parent component
    if (onSendMessage && typeof onSendMessage === 'function') {
      onSendMessage(null, null, tempMessage, 'temp-message');
    }

    // ส่งข้อความผ่าน Socket.IO
    socketManager.emit('send-message', messageData);

    setNewMessage('');
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Handle file upload logic here
    console.log('File selected:', file);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ฟังก์ชันแสดงสเตตัสของข้อความ
  const renderMessageStatus = (message) => {
    if (message.isTemporary) {
      // ข้อความกำลังส่ง
      return (
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs opacity-70">กำลังส่ง...</span>
        </div>
      );
    }
    
    if (message.isRead) {
      // อ่านแล้ว (เครื่องหมายถูกสองตัวสีฟ้า)
      return (
        <div className="flex items-center space-x-1" title="อ่านแล้ว">
          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-4 h-4 text-blue-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    if (message.isDelivered) {
      // ส่งแล้ว (เครื่องหมายถูกสองตัวสีเทา)
      return (
        <div className="flex items-center space-x-1" title="ส่งแล้ว">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-4 h-4 text-gray-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    // ยังไม่ส่ง (เครื่องหมายนาฬิกา)
    return (
      <div className="flex items-center space-x-1" title="กำลังส่ง">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12,6 12,12 16,14"></polyline>
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-pink-500 to-violet-500 text-white">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
              {otherUser?.profileImages?.[0] ? (
                <img
                  src={getProfileImageUrl(otherUser.profileImages[0], otherUser._id || otherUser.id)}
                  alt={otherUser.displayName || otherUser.firstName}
                  className="w-full h-full rounded-full object-cover object-center"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : (
                <span className="text-lg font-semibold text-white">
                  {otherUser?.firstName?.[0] || otherUser?.displayName?.[0] || '👤'}
                </span>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-semibold">
                {otherUser?.displayName || `${otherUser?.firstName} ${otherUser?.lastName}`}
              </h2>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="text-sm opacity-80">
                  {isConnected ? 'ออนไลน์' : 'ออฟไลน์'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <VideoCall className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message._id}
                ref={(el) => {
                  if (el) messageRefs.current[message._id] = el;
                }}
                data-message-id={message._id}
                data-sender-id={message.senderId}
                className={`flex ${message.senderId === currentUser._id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderId === currentUser._id
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {message.fileUrl && (
                    <div className="mt-2">
                      {message.messageType === 'image' ? (
                        <img
                          src={message.fileUrl}
                          alt="Uploaded image"
                          className="max-w-full h-auto rounded"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">ไฟล์แนบ</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    
                    {message.senderId === currentUser._id && (
                      <div className="flex items-center space-x-1">
                        {/* แสดงสเตตัสของข้อความ */}
                        {renderMessageStatus(message)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isOtherUserTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">กำลังพิมพ์</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="text-gray-500 hover:text-pink-500"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="พิมพ์ข้อความ..."
              className="w-full pr-10"
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-pink-500"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <div className="mt-2 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2"
            >
              <ImageIcon className="h-4 w-4" />
              <span>รูปภาพ</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Video className="h-4 w-4" />
              <span>วิดีโอ</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>ไฟล์</span>
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default PrivateChat;
