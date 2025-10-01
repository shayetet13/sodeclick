const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatRoom = require("../models/ChatRoom");

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // อัปเดตสถานะออนไลน์เมื่อมีการใช้งาน API
    const now = new Date();
    
    // อัพเดท lastActive ทุกครั้งที่เรียก API เพื่อให้สถานะ online แม่นยำ
    user.lastActive = now;
    user.isOnline = true;
    await user.save();
    
    console.log(`🔄 Updated user ${user._id} lastActive: ${now.toISOString()}`);

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware to check chatroom access with admin override
const chatroomAccess = async (req, res, next) => {
  try {
    const chatroomId = req.params.roomId || req.params.chatroomId || req.params.id;
    
    if (!chatroomId) {
      return res.status(400).json({ message: "Chatroom ID required" });
    }

    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      return res.status(404).json({ message: "Chatroom not found" });
    }

    // SuperAdmin can access any chatroom
    if (req.user.isSuperAdmin && req.user.isSuperAdmin()) {
      return next();
    }

    // Admin and superadmin can access any chatroom
    if (['admin', 'superadmin'].includes(req.user.role)) {
      return next();
    }

    // For public rooms, allow access without membership check
    if (chatroom.type === 'public') {
      return next();
    }

    // Check if user is a member of the chatroom using the proper method
    if (!chatroom.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied to this chatroom" });
    }

    next();
  } catch (error) {
    console.error('chatroomAccess middleware error:', error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { auth, chatroomAccess };
