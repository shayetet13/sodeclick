import { io } from 'socket.io-client';

// Global socket instance เพื่อป้องกันการสร้าง connection หลายตัว
let globalSocket = null;
let socketUsers = new Set();

/**
 * Socket Manager สำหรับจัดการ Socket.IO connections
 */
class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.rooms = new Set();
    this.listeners = new Map();
  }

  /**
   * เชื่อมต่อ Socket.IO
   */
  connect(baseURL) {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Socket already connected:', this.socket.id);
      return this.socket;
    }

    console.log('🔌 Creating new Socket.IO connection to:', baseURL);
    
    // ปิดการเชื่อมต่อเก่าหากมี
    if (this.socket) {
      console.log('🔌 Closing existing socket connection...');
      this.socket.disconnect();
    }
    
    this.socket = io(baseURL, {
      withCredentials: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      forceNew: true, // บังคับให้สร้าง connection ใหม่
      transports: ['polling', 'websocket'], // เปลี่ยนลำดับให้ polling ก่อน
      upgrade: true,
      rememberUpgrade: false,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id);
      this.isConnected = true;
      
      // เข้าร่วมห้องที่เคยอยู่
      this.rooms.forEach(roomId => {
        this.socket.emit('join-room', { roomId, userId: this.getCurrentUserId() });
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.isConnected = false;
    });

    // Listen for notifications and dispatch to window
    this.socket.on('newNotification', (notification) => {
      console.log('🔔 Received notification:', notification);
      window.dispatchEvent(new CustomEvent('newNotification', {
        detail: notification
      }));
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
      this.isConnected = false;
      
      // ลองใช้ polling transport หาก websocket ล้มเหลว
      if (error.type === 'TransportError' && error.description === 'websocket error') {
        console.log('🔄 Retrying with polling transport...');
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            this.socket.io.opts.transports = ['polling'];
            this.socket.connect();
          }
        }, 2000);
      }
    });

    return this.socket;
  }

  /**
   * เข้าร่วมห้องแชท (ปรับปรุงเพื่อป้องกันปัญหา)
   */
  joinRoom(roomId, userId) {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ Socket not connected, cannot join room');
      return;
    }

    if (!roomId || !userId) {
      console.warn('⚠️ Invalid roomId or userId:', { roomId, userId });
      return;
    }

    // ตรวจสอบว่าอยู่ในห้องนี้แล้วหรือยัง
    if (this.socket.currentRoom === roomId && this.socket.currentUserId === userId) {
      console.log('📝 Already in room:', roomId, 'with correct userId');
      return;
    }

    // ออกจากห้องเก่าก่อน (ถ้ามี)
    if (this.socket.currentRoom && this.socket.currentRoom !== roomId) {
      console.log('🚪 Switching from room:', this.socket.currentRoom, 'to:', roomId);
      this.leaveRoom(this.socket.currentRoom);
    }

    // เก็บข้อมูลห้องปัจจุบัน
    this.socket.currentRoom = roomId;
    this.socket.currentUserId = userId;

    console.log('🚪 Joining room:', roomId, 'with userId:', userId);
    this.socket.emit('join-room', { roomId, userId });
    this.rooms.add(roomId);
  }

  /**
   * ออกจากห้องแชท (ปรับปรุงเพื่อป้องกัน null userId)
   */
  leaveRoom(roomId) {
    if (!this.socket || !this.socket.connected) {
      console.log('🚪 Socket not connected, skipping leave room');
      return;
    }

    // ตรวจสอบว่าอยู่ในห้องนี้จริงหรือไม่
    if (!this.rooms.has(roomId) && this.socket.currentRoom !== roomId) {
      console.log('🚪 Not in room:', roomId, '- skipping leave');
      return;
    }

    // ใช้ currentUserId ที่เก็บไว้หรือ getCurrentUserId() เป็น fallback
    const userId = this.socket.currentUserId || this.getCurrentUserId();
    
    if (!userId) {
      console.warn('⚠️ Cannot leave room - no valid userId available');
      // ล้างข้อมูลท้องถิ่นแม้ไม่มี userId
      this.rooms.delete(roomId);
      if (this.socket.currentRoom === roomId) {
        this.socket.currentRoom = null;
        this.socket.currentUserId = null;
      }
      return;
    }
    
    console.log('🚪 Leaving room:', roomId, 'with userId:', userId);
    this.socket.emit('leave-room', { roomId, userId });
    
    // ล้างข้อมูลท้องถิ่น
    this.rooms.delete(roomId);
    
    // ล้างข้อมูลห้องปัจจุบัน
    if (this.socket.currentRoom === roomId) {
      this.socket.currentRoom = null;
      this.socket.currentUserId = null;
    }
  }

  /**
   * เพิ่ม event listener
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn('⚠️ Socket not connected, cannot add listener');
      return;
    }

    this.socket.on(event, callback);
    
    // เก็บ reference สำหรับ cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * ลบ event listener
   */
  off(event, callback) {
    if (!this.socket) {
      return;
    }

    this.socket.off(event, callback);
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * ส่งข้อความ
   */
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket not connected, cannot emit event');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * ปิดการเชื่อมต่อ
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.rooms.clear();
      this.listeners.clear();
    }
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อ
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      rooms: Array.from(this.rooms)
    };
  }

  /**
   * ดึง User ID ปัจจุบัน (ต้อง implement ตามระบบ auth)
   */
  getCurrentUserId() {
    // ใช้ข้อมูลจาก localStorage หรือ context
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user._id || user.id;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return null;
  }
}

// สร้าง global instance
const socketManager = new SocketManager();

export default socketManager;
