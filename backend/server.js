const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({
  path: path.join(__dirname, `env.${NODE_ENV}`)
});

const app = express();
const server = http.createServer(app);

// Environment Variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // อนุญาตให้ requests ที่ไม่มี origin (เช่น mobile apps, postman)
    if (!origin) return callback(null, true);
    
    // อนุญาต localhost ทั้ง port 5173 และ 5174 (กรณี port เปลี่ยน)
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // อนุญาตให้ส่ง cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));

// Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    console.log('🚫 CORS Error:', req.headers.origin);
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin
    });
  }
  next(err);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin privileges middleware
const { bypassMembershipRestrictions } = require('./middleware/adminPrivileges');
app.use(bypassMembershipRestrictions);

// Request logging middleware (เฉพาะ development)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('📦 Body:', req.body);
    }
    next();
  });
}

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas - Database: sodeclick');
    console.log(`🗄️  Environment: ${NODE_ENV}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const membershipRoutes = require('./routes/membership');
const upgradeSimpleRoutes = require('./routes/upgrade-simple');
const blurRoutes = require('./routes/blur');
const chatroomRoutes = require('./routes/chatroom');
const messagesRoutes = require('./routes/messages');
const giftRoutes = require('./routes/gift');
const voteRoutes = require('./routes/vote');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const matchingRoutes = require('./routes/matching');

// Preflight OPTIONS handling
app.options('*', cors(corsOptions));

// Basic Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Love Project Backend! ❤️',
    status: 'success',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'sodeclick',
    version: '1.0.0'
  });
});

// Health Check Routes
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    message: 'Backend is running smoothly!',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: 'sodeclick',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  };

  // ตรวจสอบสถานะ MongoDB
  if (mongoose.connection.readyState === 1) {
    healthData.database_status = 'connected';
  } else {
    healthData.database_status = 'disconnected';
    healthData.status = 'unhealthy';
  }

  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// Database Health Check
app.get('/health/database', async (req, res) => {
  try {
    // ทดสอบการเชื่อมต่อ database
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'healthy',
      message: 'Database connection is working',
      database: 'sodeclick',
      connection_state: mongoose.connection.readyState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: NODE_ENV === 'development' ? error.message : 'Database unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// API Info Route
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Sodeclick API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      database_health: '/health/database',
      auth: '/api/auth',
      profile: '/api/profile',
      membership: '/api/membership',
      blur: '/api/blur',
      chatroom: '/api/chatroom',
      gift: '/api/gift',
      vote: '/api/vote',
      shop: '/api/shop',
      payment: '/api/payment',
      root: '/'
    },
    timestamp: new Date().toISOString()
  });
});

// Use all routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/upgrade-simple', upgradeSimpleRoutes);
app.use('/api/blur', blurRoutes);
app.use('/api/chatroom', chatroomRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/gift', giftRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/matching', matchingRoutes);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS policy violation',
      error: 'Origin not allowed',
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    message: 'Something went wrong!',
    error: NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
          available_endpoints: {
        root: '/',
        health: '/health',
        database_health: '/health/database',
        api_info: '/api/info',
        membership: '/api/membership',
        blur: '/api/blur',
        chatroom: '/api/chatroom',
        gift: '/api/gift',
        vote: '/api/vote',
        shop: '/api/shop',
        payment: '/api/payment'
      }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Socket.IO Configuration
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_URL.split(',').map(url => url.trim()),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available to routes
app.set('io', io);

// Socket.IO Real-time Chat
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');
const User = require('./models/User');

// เก็บข้อมูลผู้ใช้ออนไลน์ในแต่ละห้อง
const roomUsers = new Map(); // roomId -> Set of userIds
const userSockets = new Map(); // userId -> Set of socketIds
const onlineUsers = new Map(); // userId -> { socketId, roomId, lastSeen }

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // เข้าร่วมห้องแชท
  socket.on('join-room', async (data) => {
    try {
      const { roomId, userId } = data;
      
      // ตรวจสอบสิทธิ์
      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom) {
        socket.emit('error', { message: 'Chat room not found' });
        return;
      }

      // ตรวจสอบผู้ใช้
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // สำหรับห้องสาธารณะ - เข้าได้เลย
      if (chatRoom.type === 'public') {
        if (!chatRoom.isMember(userId)) {
          chatRoom.addMember(userId);
          await chatRoom.save();
        }
      } else if (chatRoom.type === 'private' && !chatRoom.isMember(userId)) {
        // SuperAdmin สามารถเข้าร่วมห้องส่วนตัวได้โดยไม่ต้องเป็นสมาชิกก่อน
        if (!user.isSuperAdmin()) {
          socket.emit('error', { message: 'Unauthorized to join this private room' });
          return;
        } else {
          // SuperAdmin เข้าร่วมห้องส่วนตัวโดยอัตโนมัติ
          chatRoom.addMember(userId);
          await chatRoom.save();
        }
      }

      socket.join(roomId);
      socket.userId = userId;
      socket.currentRoom = roomId;
      
      // เพิ่มผู้ใช้ในรายการออนไลน์
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(userId);

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      
      // อัปเดตสถานะออนไลน์
      onlineUsers.set(userId, {
        socketId: socket.id,
        roomId: roomId,
        lastSeen: new Date(),
        username: user.displayName || user.username
      });
      
      console.log(`👤 User ${userId} joined room ${roomId}`);
      
      // ส่งจำนวนคนออนไลน์ไปยังทุกคนในห้อง
      const onlineCount = roomUsers.get(roomId).size;
      const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
        const onlineUser = onlineUsers.get(uid);
        return {
          userId: uid,
          username: onlineUser?.username || 'Unknown',
          lastSeen: onlineUser?.lastSeen
        };
      });
      
      console.log(`📊 Room ${roomId} online count: ${onlineCount} users`);
      
      io.to(roomId).emit('online-count-updated', {
        roomId,
        onlineCount,
        onlineUsers: roomOnlineUsers
      });
      
      // แจ้งสมาชิกอื่นว่ามีคนเข้าร่วม
      socket.to(roomId).emit('user-joined', {
        userId,
        message: 'มีสมาชิกใหม่เข้าร่วมแชท'
      });
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ส่งข้อความ
  socket.on('send-message', async (data) => {
    try {
      const { content, senderId, chatRoomId, messageType = 'text', replyToId, fileUrl, fileName, fileSize, fileType } = data;
      
      // ตรวจสอบสิทธิ์
      const [sender, chatRoom] = await Promise.all([
        User.findById(senderId),
        ChatRoom.findById(chatRoomId)
      ]);

      if (!sender || !chatRoom || !chatRoom.isMember(senderId)) {
        socket.emit('error', { message: 'Unauthorized to send message' });
        return;
      }

      // ตรวจสอบข้อจำกัด (เฉพาะห้องส่วนตัว) - SuperAdmin ข้ามการตรวจสอบ
      if (chatRoom.type === 'private' && !sender.isSuperAdmin()) {
        sender.resetDailyUsage();
        if (!sender.canPerformAction('chat')) {
          socket.emit('error', { message: 'Daily chat limit reached' });
          return;
        }
      }

      // สร้างข้อความ
      const messageData = {
        content: messageType === 'image' ? '' : content, // สำหรับรูปภาพให้ content เป็นค่าว่าง
        sender: senderId,
        chatRoom: chatRoomId,
        messageType,
        replyTo: replyToId || null
      };

      // เพิ่มข้อมูลไฟล์ถ้ามี
      if ((messageType === 'file' || messageType === 'image') && (fileUrl || data.imageUrl)) {
        messageData.fileUrl = fileUrl || data.imageUrl;
        messageData.fileName = fileName;
        messageData.fileSize = fileSize;
        messageData.fileType = fileType;
      }

      const message = new Message(messageData);
      await message.save();

      // อัปเดตสถิติ
      chatRoom.stats.totalMessages += 1;
      chatRoom.lastActivity = new Date();
      sender.dailyUsage.chatCount += 1;

      await Promise.all([chatRoom.save(), sender.save()]);

      // Populate ข้อมูล
      await message.populate([
        { path: 'sender', select: 'username displayName membershipTier profileImages' },
        { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
      ]);

      // ส่งข้อความไปยังสมาชิกทุกคนในห้อง
      io.to(chatRoomId).emit('new-message', message);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // React ข้อความ
  socket.on('react-message', async (data) => {
    try {
      const { messageId, userId, reactionType = 'heart', action = 'add' } = data;
      
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // ตรวจสอบสิทธิ์
      const chatRoom = await ChatRoom.findById(message.chatRoom);
      if (!chatRoom.isMember(userId)) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // ตรวจสอบว่าผู้ใช้เคย react แล้วหรือไม่
      const existingReaction = message.reactions.find(
        reaction => reaction.user.toString() === userId.toString() && reaction.type === reactionType
      );
      
      let finalAction;
      
      if (existingReaction) {
        // ถ้าเคย react แล้ว ไม่ให้ทำอะไร (กดได้แค่ 1 ครั้ง)
        socket.emit('error', { message: 'คุณได้กดหัวใจข้อความนี้แล้ว' });
        return;
      } else {
        // เพิ่ม reaction ใหม่
        message.reactions.push({
          user: userId,
          type: reactionType,
          createdAt: new Date()
        });
        finalAction = 'added';
      }
      
      // อัปเดตสถิติ
      message.updateReactionStats();
      await message.save();

      // ส่งการอัปเดต reaction ไปยังทุกคนในห้อง
      io.to(message.chatRoom.toString()).emit('message-reaction-updated', {
        messageId: message._id,
        userId,
        reactionType: reactionType,
        hasReaction: finalAction === 'added',
        stats: message.stats,
        action: finalAction
      });
      
    } catch (error) {
      console.error('Error reacting to message:', error);
      socket.emit('error', { message: 'Failed to react to message' });
    }
  });

  // ออกจากห้อง
  socket.on('leave-room', (data) => {
    const { roomId, userId } = data;
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', {
      userId,
      message: 'สมาชิกออกจากแชท'
    });
    console.log(`👤 User ${userId} left room ${roomId}`);
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    const { roomId, userId, username } = data;
    socket.to(roomId).emit('user-typing', { userId, username });
  });

  socket.on('typing-stop', (data) => {
    const { roomId, userId } = data;
    socket.to(roomId).emit('user-stop-typing', { userId });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
    
    if (socket.currentRoom && socket.userId) {
      const roomId = socket.currentRoom;
      const userId = socket.userId;
      
      // ลบ socket จากรายการ
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        
        // ถ้าผู้ใช้ไม่มี socket เชื่อมต่ออยู่แล้ว ให้ลบออกจากห้อง
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId);
          
          // ลบจากรายการออนไลน์
          onlineUsers.delete(userId);
          
          if (roomUsers.has(roomId)) {
            roomUsers.get(roomId).delete(userId);
            
            // ส่งจำนวนคนออนไลน์ที่อัปเดต
            const onlineCount = roomUsers.get(roomId).size;
            const roomOnlineUsers = Array.from(roomUsers.get(roomId)).map(uid => {
              const onlineUser = onlineUsers.get(uid);
              return {
                userId: uid,
                username: onlineUser?.username || 'Unknown',
                lastSeen: onlineUser?.lastSeen
              };
            });
            
            console.log(`📊 Room ${roomId} online count updated: ${onlineCount} users`);
            
            io.to(roomId).emit('online-count-updated', {
              roomId,
              onlineCount,
              onlineUsers: roomOnlineUsers
            });
          }
          
          socket.to(roomId).emit('user-left', {
            userId,
            message: 'สมาชิกออกจากแชท'
          });
        }
      }
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log('🚀 ============================================');
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📱 Frontend URLs: ${FRONTEND_URL}`);
  console.log(`🔧 Backend API: http://localhost:${PORT}`);
  console.log(`💬 Socket.IO: Real-time chat enabled`);
  console.log(`🗄️  Database: sodeclick`);
  console.log('🚀 ============================================');
});