import React, { useState, useEffect, useRef } from 'react';
import socketManager from '../services/socketManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getProfileImageUrl } from '../utils/profileImageUtils';
import YouTubePreview from './YouTubePreview';
import { separateYouTubeFromText } from '../utils/linkUtils';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Video, 
  FileText,
  Smile,
  MoreVertical
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
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSentTime, setLastSentTime] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});
  const hasScrolledToBottomRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // เชื่อมต่อ Socket.IO สำหรับ private chat (optimized)
  useEffect(() => {
    if (!chatRoomId || !currentUser?._id) return;
    
    // ตรวจสอบการเปลี่ยนแปลงจริงๆ
    const token = sessionStorage.getItem('token');
    console.log('🔑 Token check before connect:', token ? 'available' : 'missing');
    
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
      
      // ตรวจสอบสถานะการเชื่อมต่ออีกครั้ง (รอสักครู่ให้ socket setup เสร็จ)
      setTimeout(() => {
        const connectionStatus = socketManager.getConnectionStatus();
        if (!connectionStatus.isConnected || !connectionStatus.socketId) {
          console.warn('⚠️ Socket connection status check failed:', connectionStatus);
          // ไม่ต้อง return ที่นี่ เพราะอาจเป็น false positive
          // ให้ลองทำการ setup ต่อไป
        } else {
          console.log('✅ Socket connection verified:', connectionStatus);
        }
      }, 1000);
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
      
      // ส่ง custom event ไปยัง App.tsx เพื่อ real-time update
      window.dispatchEvent(new CustomEvent('private-chat-message', {
        detail: { chatRoomId, message: formattedMessage }
      }));
      
      // ไม่เรียก onSendMessage เพื่อป้องกัน duplicate
      // เพราะข้อความจะถูกจัดการผ่าน custom event แล้ว
      
      window.dispatchEvent(new CustomEvent('unread-count-update', {
        detail: { chatRoomId, unreadCount: 1 }
      }));
    };

    const handleError = (error) => {
      console.error('❌ Socket error:', error);
      if (error.message === 'Authentication required') {
        console.error('❌ Authentication failed - token may be invalid or expired');
        if (showWebappNotification) {
          showWebappNotification('การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        }
        // Redirect to login or refresh token
        window.location.reload();
      } else if (error.message && error.message.includes('send-message')) {
        if (showWebappNotification) {
          showWebappNotification('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่');
        }
      }
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
    socketManager.on('error', handleError);
    
    // รอแล้วค่อย join room เพื่อป้องกัน rate limiting
    const joinTimeout = setTimeout(() => {
      console.log('🔌 Joining room:', chatRoomId);
      const token = sessionStorage.getItem('token');
      console.log('🔑 Token available:', token ? 'Yes' : 'No');
      
      socketManager.joinRoom(chatRoomId, currentUser._id, token);
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
      socketManager.off('error', handleError);
    };
    
    }); // ปิด connectSocket().then()
  }, [chatRoomId, currentUser?._id]); // ลด dependencies และใช้ optional chaining

  // Cleanup เมื่อ component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 PrivateChat component unmounting, leaving room');
      if (chatRoomId) {
        socketManager.leaveRoom(chatRoomId);
      }
      
      // ตรวจสอบสถานะการเชื่อมต่อก่อน unmount
      const connectionStatus = socketManager.getConnectionStatus();
      if (!connectionStatus.isConnected) {
        console.warn('⚠️ Socket disconnected during component unmount');
      }
    };
  }, []); // รันแค่ครั้งเดียวเมื่อ mount/unmount

  // ฟังก์ชันสำหรับ scroll ไปยังข้อความล่าสุด (ใช้เมื่อเข้าห้องแชทหรือกลับมาหน้าแชท)
  const scrollToBottom = () => {
    console.log('🔍 PrivateChat: scrollToBottom called, messagesContainerRef:', messagesContainerRef.current);
    if (messagesContainerRef.current) {
      console.log('🔍 PrivateChat: Scroll values before:', {
        scrollTop: messagesContainerRef.current.scrollTop,
        scrollHeight: messagesContainerRef.current.scrollHeight,
        clientHeight: messagesContainerRef.current.clientHeight
      });
      
      // Scroll ไปยังด้านล่างสุด
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      
      console.log('🔍 PrivateChat: Scroll values after:', {
        scrollTop: messagesContainerRef.current.scrollTop,
        scrollHeight: messagesContainerRef.current.scrollHeight
      });
    } else {
      console.log('❌ PrivateChat: messagesContainerRef not available');
    }
  };

  // ฟังก์ชันสำหรับ scroll เฉพาะเมื่อมีข้อความใหม่
  const scrollToBottomOnNewMessage = () => {
    // ใช้ setTimeout เพื่อให้ DOM อัปเดตก่อน
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const scrollTop = messagesContainerRef.current.scrollTop;
        const scrollHeight = messagesContainerRef.current.scrollHeight;
        const clientHeight = messagesContainerRef.current.clientHeight;
        
        // ตรวจสอบว่าผู้ใช้อยู่ที่ด้านล่างหรือใกล้ด้านล่าง (ภายใน 200px)
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 200;
        
        // ถ้าผู้ใช้อยู่ที่ด้านล่างหรือใกล้ด้านล่าง ให้ scroll ลง
        if (isAtBottom) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    }, 50);
  };

  // รีเซ็ตสถานะการ scroll เมื่อเปลี่ยนห้องแชท
  useEffect(() => {
    console.log('🔍 PrivateChat: Chat room changed, resetting scroll state');
    isInitialLoadRef.current = true;
    hasScrolledToBottomRef.current = false;
  }, [chatRoomId]);

  // ติดตามการเปลี่ยน activeTab และ scroll เมื่อกลับมาหน้าแชท
  useEffect(() => {
    const handleTabChange = () => {
      // ตรวจสอบว่ากำลังอยู่ในหน้าแชทหรือไม่
      const messagesTab = document.querySelector('[data-value="messages"]');
      const isMessagesTabActive = messagesTab && messagesTab.getAttribute('data-state') === 'active';
      
      if (isMessagesTabActive && hasScrolledToBottomRef.current === false) {
        // Scroll ไปยังข้อความล่าสุดเมื่อกลับมาหน้าแชท
        console.log('🔍 PrivateChat: Tab change detected, scheduling scroll');
        setTimeout(() => {
          console.log('🔍 PrivateChat: Executing scroll on tab change');
          scrollToBottom();
          hasScrolledToBottomRef.current = true;
        }, 500);
      }
    };

    // ฟัง event เมื่อมีการเปลี่ยน tab
    const tabTriggers = document.querySelectorAll('[data-value="messages"]');
    tabTriggers.forEach(trigger => {
      trigger.addEventListener('click', handleTabChange);
    });

    // ตรวจสอบทันทีเมื่อ component mount
    handleTabChange();

    return () => {
      tabTriggers.forEach(trigger => {
        trigger.removeEventListener('click', handleTabChange);
      });
    };
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('🔍 PrivateChat: Messages changed, scheduling scroll');
    console.log('🔍 PrivateChat: Messages count:', messages.length);
    console.log('🔍 PrivateChat: isInitialLoad:', isInitialLoadRef.current);
    
    if (messages.length > 0) {
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
  }, [messages.length]);

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
    console.log('📤 Attempting to send message...');
    console.log('📤 Debug info:', {
      newMessage: newMessage.trim(),
      currentUser: currentUser?._id,
      chatRoomId: chatRoomId,
      isConnected: isConnected
    });

    if (!newMessage.trim()) {
      console.log('❌ Message is empty');
      return;
    }

    if (!currentUser) {
      console.log('❌ No current user');
      return;
    }

    if (!chatRoomId) {
      console.log('❌ No chat room ID');
      return;
    }

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

    console.log('📤 Message data to send:', messageData);

    // ตรวจสอบ socket connection
    const socketStatus = socketManager.getConnectionStatus();
    console.log('🔌 Socket status:', socketStatus);

    if (!socketStatus.isConnected || !socketStatus.socketId) {
      console.error('❌ Socket not connected! Attempting to reconnect...');
      
      // พยายามเชื่อมต่อใหม่แบบ async
      try {
        const socket = await socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
        
        // ตรวจสอบสถานะการเชื่อมต่อ
        const newStatus = socketManager.getConnectionStatus();
        if (!newStatus.isConnected) {
          console.error('❌ Failed to reconnect socket');
          if (showWebappNotification) {
            showWebappNotification('การเชื่อมต่อขาดหาย กรุณารีเฟรชหน้าเว็บ', 'error');
          }
          return;
        }
        
        console.log('✅ Socket reconnected successfully');
        // ลองส่งข้อความอีกครั้งหลังเชื่อมต่อสำเร็จ
        console.log('🔄 Retrying message send after reconnection');
        handleSendMessage();
      } catch (error) {
        console.error('❌ Error reconnecting socket:', error);
        if (showWebappNotification) {
          showWebappNotification('ไม่สามารถเชื่อมต่อได้ กรุณารีเฟรชหน้าเว็บ', 'error');
        }
      }
      
      return;
    }

    // สร้างข้อความชั่วคราว
    const tempMessage = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: newMessage.trim(),
      senderId: currentUser._id,
      timestamp: new Date(),
      isDelivered: false,
      isRead: false,
      sender: currentUser,
      isTemporary: true
    };

    console.log('📤 Temp message created:', tempMessage);

    // ไม่ส่ง temp message ไปยัง parent component เพื่อป้องกัน duplicate
    // ให้รอ socket response แทน
    console.log('📤 Skipping temp message callback to prevent duplicates');

    try {
      // ส่งข้อความผ่าน Socket.IO
      console.log('📤 Emitting send-message event');
      const emitResult = socketManager.emit('send-message', messageData);
      
      if (emitResult) {
        console.log('✅ Message sent via socket successfully');
        
        // แสดงข้อความทันทีโดยไม่รอ socket response
        if (onSendMessage && typeof onSendMessage === 'function') {
          console.log('📤 Calling onSendMessage callback for immediate display');
          onSendMessage(null, null, {
            ...tempMessage,
            isDelivered: true
          }, 'own-message');
        }
      } else {
        console.error('❌ Failed to emit message - socket not ready');
        if (showWebappNotification) {
          showWebappNotification('การเชื่อมต่อไม่พร้อม กรุณาลองใหม่');
        }
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (showWebappNotification) {
        showWebappNotification('เกิดข้อผิดพลาดในการส่งข้อความ');
      }
    }

    setNewMessage('');
    
    // Scroll ลงด้านล่างเมื่อผู้ใช้ส่งข้อความเอง
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
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
    <div className="flex flex-col h-full bg-white relative">
      {/* Header - Fixed at top */}
      <div className="flex items-center justify-between p-1.5 sm:p-2 border-b border-gray-200 bg-gradient-to-r from-pink-500 to-violet-500 text-white z-10 sticky top-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
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
              <h2 className="text-xs sm:text-sm font-semibold">
                {otherUser?.displayName || `${otherUser?.firstName} ${otherUser?.lastName}`}
              </h2>
              <div className="flex items-center space-x-1">
                <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-xs opacity-80">
                  {isConnected ? 'เชื่อมต่อแล้ว' : 'การเชื่อมต่อขาดหาย'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
          >
            <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Messages - Scrollable area with proper spacing */}
      <div 
        ref={messagesContainerRef}
        className="messages-container flex-1 overflow-y-auto p-4 space-y-4"
        style={{ 
          paddingTop: '0.5rem', 
          paddingBottom: '0.5rem',
          maxHeight: 'calc(-120px + 70vh)' // Reserve space for header and input
        }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : (
          <>
            {messages
              .filter((message, index, arr) => {
                // ลบ duplicate messages โดยใช้ _id และ content เป็น unique identifier
                return arr.findIndex(m => m._id === message._id && m.content === message.content) === index;
              })
              .map((message) => (
              <div
                key={`${message._id}_${message.content}_${message.timestamp || Date.now()}`}
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
                  {message.content && (() => {
                    const { text, youtubeUrls } = separateYouTubeFromText(message.content);
                    return (
                      <div className="space-y-2">
                        {/* Display clean text if any */}
                        {text && (
                          <p className="text-sm whitespace-pre-wrap">{text}</p>
                        )}
                        
                        {/* Display YouTube previews */}
                        {youtubeUrls.map((youtubeData, index) => (
                          <YouTubePreview
                            key={`${message._id}-youtube-${index}`}
                            url={youtubeData.url}
                            className="max-w-80"
                          />
                        ))}
                      </div>
                    );
                  })()}
                  
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

      {/* Message Input - Fixed at bottom */}
      <div className="relative p-2 sm:p-3 border-t border-gray-200 bg-white z-10 sticky bottom-0">
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
            disabled={!newMessage.trim() || !isConnected}
            className={`${
              isConnected 
                ? 'bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600' 
                : 'bg-gray-400'
            } text-white transition-all duration-200`}
            title={isConnected ? 'ส่งข้อความ' : 'ไม่ได้เชื่อมต่อ'}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Attachment Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-full left-0 right-0 p-2 bg-white border border-gray-200 rounded-t-lg shadow-lg z-20">
            <div className="flex space-x-2">
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
