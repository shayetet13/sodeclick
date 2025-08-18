const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/messages');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// GET /api/messages/:roomId - ดึงข้อความในห้องแชท
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50, userId } = req.query;

    // ตรวจสอบว่าห้องแชทมีอยู่จริง
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของห้องหรือไม่ (ยกเว้นห้องสาธารณะ)
    if (userId && chatRoom.type === 'private' && !chatRoom.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this private chat room'
      });
    }

    // สำหรับห้องสาธารณะ - เพิ่มเป็นสมาชิกอัตโนมัติ
    if (userId && chatRoom.type === 'public' && !chatRoom.isMember(userId)) {
      chatRoom.addMember(userId);
      await chatRoom.save();
    }

    const messages = await Message.getMessagesInRoom(roomId, parseInt(page), parseInt(limit));
    
    // เพิ่มข้อมูลว่าผู้ใช้ปัจจุบัน react หรือไม่
    const messagesWithUserReactions = messages.map(message => {
      const messageObj = message.toObject();
      if (userId) {
        messageObj.userReaction = message.getUserReactionType(userId);
        messageObj.hasUserReacted = message.hasUserReacted(userId);
      }
      return messageObj;
    });

    res.json({
      success: true,
      data: {
        messages: messagesWithUserReactions.reverse(), // เรียงจากเก่าไปใหม่
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// POST /api/messages - ส่งข้อความใหม่
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const { content, senderId, chatRoomId, messageType = 'text', replyToId } = req.body;

    if (!senderId || !chatRoomId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID and Chat Room ID are required'
      });
    }

    // ตรวจสอบว่าผู้ส่งและห้องแชทมีอยู่จริง
    const [sender, chatRoom] = await Promise.all([
      User.findById(senderId),
      ChatRoom.findById(chatRoomId)
    ]);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // ตรวจสอบว่าผู้ส่งเป็นสมาชิกของห้องหรือไม่
    if (!chatRoom.isMember(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    // ตรวจสอบข้อจำกัดการส่งข้อความตาม membership
    sender.resetDailyUsage();
    if (!sender.canPerformAction('chat')) {
      const limits = sender.getMembershipLimits();
      return res.status(403).json({
        success: false,
        message: `Daily chat limit reached. Your limit: ${limits.dailyChats} messages per day`,
        currentUsage: sender.dailyUsage.chatCount,
        limit: limits.dailyChats
      });
    }

    // จัดการไฟล์แนบ
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' :
              file.mimetype.startsWith('audio/') ? 'audio' : 'file',
        url: `/uploads/messages/${file.filename}`,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }));
    }

    // สร้างข้อความใหม่
    const message = new Message({
      content: content || '',
      sender: senderId,
      chatRoom: chatRoomId,
      messageType,
      attachments,
      replyTo: replyToId || null
    });

    await message.save();

    // อัปเดตสถิติห้องแชทและผู้ใช้
    chatRoom.stats.totalMessages += 1;
    chatRoom.lastActivity = new Date();
    sender.dailyUsage.chatCount += 1;

    await Promise.all([
      chatRoom.save(),
      sender.save()
    ]);

    // Populate ข้อมูลก่อนส่งกลับ
    await message.populate([
      { path: 'sender', select: 'username displayName membershipTier profileImages' },
      { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username displayName' } }
    ]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// POST /api/messages/:messageId/react - เพิ่ม/ลบ reaction
router.post('/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, reactionType = 'heart' } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ตรวจสอบว่าผู้ใช้เป็นสมาชิกของห้องแชทหรือไม่
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    if (!chatRoom.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    // เพิ่ม/ลบ reaction
    const hadReaction = message.hasUserReacted(userId);
    const previousReactionType = message.getUserReactionType(userId);
    
    message.addReaction(userId, reactionType);
    await message.save();

    // ตรวจสอบสถานะหลังการเปลี่ยนแปลง
    const hasReactionNow = message.hasUserReacted(userId);
    const currentReactionType = message.getUserReactionType(userId);

    let action = 'added';
    if (hadReaction && !hasReactionNow) {
      action = 'removed';
    } else if (hadReaction && hasReactionNow && previousReactionType !== currentReactionType) {
      action = 'changed';
    }

    res.json({
      success: true,
      message: `Reaction ${action} successfully`,
      data: {
        messageId: message._id,
        action,
        reactionType: currentReactionType,
        hasReaction: hasReactionNow,
        stats: message.stats
      }
    });

  } catch (error) {
    console.error('Error reacting to message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to react to message',
      error: error.message
    });
  }
});

// PUT /api/messages/:messageId - แก้ไขข้อความ
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, userId } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        message: 'User ID and content are required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ตรวจสอบว่าเป็นเจ้าของข้อความหรือไม่
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // ตรวจสอบว่าข้อความไม่เก่าเกินไป (เช่น 15 นาที)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit messages older than 15 minutes'
      });
    }

    await message.editMessage(content);

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: message
    });

  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: error.message
    });
  }
});

// DELETE /api/messages/:messageId - ลบข้อความ
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // ตรวจสอบสิทธิ์ในการลบ (เจ้าของข้อความหรือเจ้าของห้อง)
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    const isOwner = message.sender.toString() === userId;
    const isRoomOwner = chatRoom.isOwner(userId);

    if (!isOwner && !isRoomOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages or you must be the room owner'
      });
    }

    await message.softDelete();

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        messageId: message._id,
        deletedAt: message.deletedAt
      }
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

// GET /api/messages/:messageId/reactions - ดูรายละเอียด reactions
router.get('/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('reactions.user', 'username displayName profileImages membershipTier');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // จัดกลุ่ม reactions ตามประเภท
    const reactionsByType = {};
    message.reactions.forEach(reaction => {
      if (!reactionsByType[reaction.type]) {
        reactionsByType[reaction.type] = [];
      }
      reactionsByType[reaction.type].push({
        user: reaction.user,
        createdAt: reaction.createdAt
      });
    });

    res.json({
      success: true,
      data: {
        messageId: message._id,
        totalReactions: message.reactions.length,
        reactionsByType,
        stats: message.stats
      }
    });

  } catch (error) {
    console.error('Error fetching message reactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message reactions',
      error: error.message
    });
  }
});

module.exports = router;