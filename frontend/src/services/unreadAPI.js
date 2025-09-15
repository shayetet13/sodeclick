import enhancedAPI from './enhancedAPI';

/**
 * API service สำหรับจัดการ unread message count
 */
export const unreadAPI = {
  /**
   * ดึงจำนวนข้อความที่ยังไม่ได้อ่านทั้งหมด
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} ข้อมูลจำนวนข้อความที่ยังไม่ได้อ่าน
   */
  async getUnreadCount(userId) {
    try {
      const response = await enhancedAPI.get(`/messages/unread-count/${userId}`);
      return response;
    } catch (error) {
      console.error('Error getting unread count:', error);
      
      // Return fallback data แทนการ throw error
      return {
        success: false,
        data: {
          totalUnreadCount: 0,
          chatUnreadCounts: []
        },
        error: error.message
      };
    }
  },

  /**
   * ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแชทส่วนตัวเท่านั้น
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} ข้อมูลจำนวนข้อความที่ยังไม่ได้อ่านสำหรับแชทส่วนตัว
   */
  async getPrivateChatUnreadCount(userId) {
    try {
      const response = await enhancedAPI.get(`/messages/private-chats-unread/${userId}`);
      return response;
    } catch (error) {
      console.error('Error getting private chat unread count:', error);
      
      // Return fallback data แทนการ throw error
      return {
        success: false,
        data: {
          totalUnreadCount: 0,
          chatUnreadCounts: []
        },
        error: error.message
      };
    }
  },

  /**
   * ทำเครื่องหมายข้อความว่าอ่านแล้ว
   * @param {string} chatRoomId - ID ของห้องแชท
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} ผลลัพธ์การทำเครื่องหมาย
   */
  async markAsRead(chatRoomId, userId) {
    try {
      const response = await enhancedAPI.post('/messages/mark-as-read', {
        chatRoomId,
        userId
      });
      
      if (response.success) {
        return response.data;
      } else {
        console.warn('Mark as read failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return null;
    }
  },

  /**
   * ดึงรายการแชทส่วนตัวพร้อมจำนวนข้อความที่ยังไม่ได้อ่าน
   * @param {string} userId - ID ของผู้ใช้
   * @returns {Promise<Object>} รายการแชทส่วนตัว
   */
  async getPrivateChats(userId) {
    try {
      const response = await enhancedAPI.get(`/messages/private-chats/${userId}`);
      return response;
    } catch (error) {
      console.error('Error getting private chats:', error);
      
      // Return fallback data แทนการ throw error
      return {
        success: false,
        data: {
          privateChats: [],
          total: 0
        },
        error: error.message
      };
    }
  }
};

export default unreadAPI;
