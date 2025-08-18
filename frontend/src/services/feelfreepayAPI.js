import { apiService } from '../config/api';

// FeelFreePay Configuration
const FEELFREEPAY_CONFIG = {
  publicKey: 'Q3tyqDhLpeBJbR6oVRtOlDOcs670w4sg',
  secretKey: '3BM4eKlO5N8pxq68eYYQvdIBgfrn3X8W',
  apiUrl: 'https://api.feelfreepay.com/v1',
  webhookUrl: '/api/payment/feelfreepay-webhook'
};

// FeelFreePay API Services - Using Backend Proxy
export const feelFreePayAPI = {
  // สร้างการชำระเงินใหม่
  createPayment: async (paymentData) => {
    try {
      const response = await apiService.post('/api/payment/feelfreepay/create', paymentData);

      if (response.data.resultCode !== '00') {
        throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการสร้างการชำระเงิน');
      }

      return response.data;
    } catch (error) {
      console.error('FeelFreePay createPayment error:', error);
      throw error;
    }
  },

  // ตรวจสอบสถานะการชำระเงิน
  checkPaymentStatus: async (referenceNo) => {
    try {
      const response = await apiService.post(`/api/payment/feelfreepay/status/${referenceNo}`);

      if (response.data.resultCode !== '00') {
        throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
      }

      return response.data;
    } catch (error) {
      console.error('FeelFreePay checkPaymentStatus error:', error);
      throw error;
    }
  },

  // ยกเลิกการชำระเงิน
  cancelPayment: async (referenceNo) => {
    try {
      const response = await apiService.post(`/api/payment/feelfreepay/cancel/${referenceNo}`);

      if (response.data.resultCode !== '00') {
        throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน');
      }

      return response.data;
    } catch (error) {
      console.error('FeelFreePay cancelPayment error:', error);
      throw error;
    }
  },

  // ดึงข้อมูลธนาคารที่รองรับ
  getSupportedBanks: async () => {
    try {
      const response = await apiService.get('/api/payment/feelfreepay/banks');

      if (response.data.resultCode !== '00') {
        throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลธนาคาร');
      }

      return response.data;
    } catch (error) {
      console.error('FeelFreePay getSupportedBanks error:', error);
      throw error;
    }
  },

  // ดึงประวัติการชำระเงิน
  getPaymentHistory: async (userId, page = 1, limit = 10) => {
    try {
      const response = await apiService.post('/api/payment/feelfreepay/history', {
        userId: userId,
        page: page,
        limit: limit
      });

      if (response.data.resultCode !== '00') {
        throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน');
      }

      return response.data;
    } catch (error) {
      console.error('FeelFreePay getPaymentHistory error:', error);
      throw error;
    }
  }
};

// Helper functions สำหรับ FeelFreePay
export const feelFreePayHelpers = {
  // สร้างข้อมูลการชำระเงินสำหรับ FeelFreePay
  createPaymentData: (plan, userInfo) => {
    return {
      amount: plan.price.amount,
      currencyCode: '764', // THB
      paymentType: 'Q', // QR Code
      detail: `อัปเกรดเป็น ${plan.name} - ${plan.tier}`,
      customerName: userInfo.name || 'Customer',
      customerEmail: userInfo.email || 'customer@example.com',
      customerTelephone: userInfo.phone || '0800000000',
      customerAddress: userInfo.address || 'Bangkok, Thailand',
      merchantDefined1: plan._id,
      merchantDefined2: plan.tier,
      merchantDefined3: userInfo.userId,
      merchantDefined4: plan.name,
      merchantDefined5: new Date().toISOString()
    };
  },

  // ตรวจสอบสถานะการชำระเงินแบบ polling
  pollPaymentStatus: async (referenceNo, onStatusChange, onComplete, onError) => {
    const maxAttempts = 60; // 60 ครั้ง (5 นาที)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const result = await feelFreePayAPI.checkPaymentStatus(referenceNo);
        
        // ตรวจสอบว่า txn เป็น array หรือ object
        const txn = Array.isArray(result.txn) ? result.txn[0] : result.txn;
        const status = txn.status;
        
        // เรียก callback เมื่อสถานะเปลี่ยน
        if (onStatusChange) {
          onStatusChange(status, txn);
        }
        
        // ถ้าชำระเงินสำเร็จหรือปฏิเสธ ให้หยุด polling
        if (status === 'S') { // Settle
          if (onComplete) {
            onComplete(txn);
          }
          return;
        }
        
        if (status === 'D') { // Decline
          if (onError) {
            onError('การชำระเงินถูกปฏิเสธ');
          }
          return;
        }
        
        // ถ้ายังไม่ครบจำนวนครั้งที่กำหนด ให้ polling ต่อ
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // ตรวจสอบทุก 5 วินาที
        } else {
          if (onError) {
            onError('หมดเวลารอการชำระเงิน');
          }
        }
      } catch (error) {
        console.error('Error polling FeelFreePay payment status:', error);
        if (onError) {
          onError('เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน');
        }
      }
    };
    
    // เริ่ม polling
    poll();
  },

  // จัดรูปแบบสถานะการชำระเงิน
  getStatusMessage: (status) => {
    const messages = {
      'G': 'สร้าง QR Code แล้ว',
      'A': 'กำลังประมวลผล',
      'S': 'ชำระเงินสำเร็จ',
      'D': 'การชำระเงินถูกปฏิเสธ'
    };
    
    return messages[status] || 'สถานะไม่ทราบ';
  },

  // จัดรูปแบบสีสถานะการชำระเงิน
  getStatusColor: (status) => {
    const colors = {
      'G': 'text-blue-600',
      'A': 'text-yellow-600',
      'S': 'text-green-600',
      'D': 'text-red-600'
    };
    
    return colors[status] || 'text-gray-600';
  },

  // จัดรูปแบบไอคอนสถานะการชำระเงิน
  getStatusIcon: (status) => {
    const icons = {
      'G': '⏳',
      'A': '⚙️',
      'S': '✅',
      'D': '❌'
    };
    
    return icons[status] || '❓';
  },

  // ตรวจสอบความถูกต้องของข้อมูลการชำระเงิน
  validatePaymentData: (data) => {
    const errors = [];
    
    if (!data.amount || data.amount <= 0) {
      errors.push('จำนวนเงินไม่ถูกต้อง');
    }
    
    if (!data.currencyCode) {
      errors.push('รหัสสกุลเงินไม่ถูกต้อง');
    }
    
    if (!data.paymentType) {
      errors.push('ประเภทการชำระเงินไม่ถูกต้อง');
    }
    
    if (!data.detail) {
      errors.push('รายละเอียดไม่ถูกต้อง');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  // แปลง resultCode เป็นข้อความ
  getResultCodeMessage: (resultCode) => {
    const messages = {
      '00': 'สำเร็จ',
      '01': 'พารามิเตอร์ที่จำเป็นขาดหายไป',
      '02': 'หมายเลขอ้างอิงไม่ถูกต้อง',
      '58': 'ธุรกรรมไม่อนุญาตให้ใช้กับเทอร์มินัลนี้',
      '90': 'ข้อผิดพลาดในการชำระเงิน',
      '91': 'ระบบของผู้ออกบัตรหรือสวิตช์ไม่พร้อมใช้งาน',
      '94': 'การส่งข้อมูลซ้ำ',
      '96': 'ระบบขัดข้อง',
      'xx': 'การชำระเงินหมดเวลา'
    };
    
    return messages[resultCode] || 'รหัสข้อผิดพลาดไม่ทราบ';
  }
};

export default feelFreePayAPI;
