import { apiService } from '../config/api';

// FeelFreePay Configuration
const FEELFREEPAY_CONFIG = {
  token: 'UtKvHtno8LFfDtqisP+gO7n8srsXW+91Gzc7fU73JpTZJWSXrvvF8sHGCaUMDpXIIDfZQx8UmRaMRCrnnVYf6IwsHvYhxkuMW9XbFyrQ3wU+SN2zpBmd3WpK3iWIRWT/zZ2NHJic5iB1xjcLlkbFHd5ZvMI=',
  publicKey: 'Q3tyqDhLpeBJbR6oVRtOlDOcs670w4sg',
  secretKey: '3BM4eKl05N8pxq68eYYQvdIBgfrn3X8W',
  apiUrl: 'https://api.feelfreepay.com/v1',
  testURL: 'https://api-test.feelfreepay.com/ffp/gateway/qrcode',
  productionURL: 'https://api.feelfreepay.com/ffp/gateway/qrcode',
  statusURL: 'https://api.feelfreepay.com/v1/check_status_txn',
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
  // สร้าง Reference ID ตามมาตรฐาน FeelFreePay (15 หลัก)
  generateReferenceId: () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    // รวมเป็น 15 หลัก: YYMMDDHHMMSSXXX
    return `${year}${month}${day}${hours}${minutes}${seconds}${random}`.slice(0, 15);
  },

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
      merchantDefined5: new Date().toISOString(),
      referenceNo: feelFreePayHelpers.generateReferenceId()
    };
  },

  // Debug logger
  debugLog: (message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString('th-TH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] [FeelFreePay] ${message}`, data || '');
  },

  // เรียก API สร้าง QR Code โดยตรง
  createQRCodeDirect: async (paymentData, apiMode = 'test') => {
    const apiURL = apiMode === 'test' ? FEELFREEPAY_CONFIG.testURL : FEELFREEPAY_CONFIG.productionURL;
    
    try {
      feelFreePayHelpers.debugLog('Creating QR Code direct', 'info', { apiURL, paymentData });
      
      const formData = new FormData();
      formData.append('token', FEELFREEPAY_CONFIG.token);
      formData.append('referenceNo', paymentData.referenceNo || feelFreePayHelpers.generateReferenceId());
      formData.append('amount', paymentData.amount);
      formData.append('detail', paymentData.detail || 'Payment');
      formData.append('customerName', paymentData.customerName || '');
      formData.append('customerEmail', paymentData.customerEmail || '');
      
      const response = await fetch(apiURL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      // แปลง blob เป็น data URL
      const blob = await response.blob();
      const qrDataUrl = URL.createObjectURL(blob);
      
      feelFreePayHelpers.debugLog('QR Code created successfully', 'success');
      
      return {
        success: true,
        qrData: qrDataUrl,
        referenceNo: paymentData.referenceNo,
        amount: paymentData.amount
      };
      
    } catch (error) {
      feelFreePayHelpers.debugLog('Failed to create QR Code', 'error', error);
      throw error;
    }
  },

  // ตรวจสอบสถานะโดยตรง
  checkStatusDirect: async (referenceNo) => {
    try {
      const authString = `${FEELFREEPAY_CONFIG.secretKey}:`;
      const base64Auth = btoa(authString);
      
      const response = await fetch(FEELFREEPAY_CONFIG.statusURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Auth}`
        },
        body: JSON.stringify({ referenceNo })
      });
      
      if (!response.ok) {
        throw new Error(`Status API Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.resultCode === '00') {
        if (Array.isArray(result.txn)) {
          const latestTxn = result.txn[result.txn.length - 1];
          return latestTxn.status === 'S' ? 'success' : 'pending';
        } else if (result.txn) {
          return result.txn.status === 'S' ? 'success' : 'pending';
        }
        return 'pending';
      } else {
        return 'failed';
      }
      
    } catch (error) {
      feelFreePayHelpers.debugLog('Status check failed', 'error', error);
      throw error;
    }
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
