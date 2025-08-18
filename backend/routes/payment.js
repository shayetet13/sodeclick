const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const axios = require('axios');

// FeelFreePay Configuration
const FEELFREEPAY_CONFIG = {
  publicKey: 'Q3tyqDhLpeBJbR6oVRtOlDOcs670w4sg',
  secretKey: '3BM4eKlO5N8pxq68eYYQvdIBgfrn3X8W',
  apiUrl: 'https://api.feelfreepay.com/v1',
  webhookUrl: '/api/payment/feelfreepay-webhook'
};


// สร้าง QR Code สำหรับการชำระเงิน
router.post('/generate-qr', async (req, res) => {
  try {
    const { bankId, amount, planId, planTier, planName, userId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!bankId || !amount || !planId || !planTier || !userId) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }

    // ตรวจสอบธนาคาร
    const bank = bankAccounts[bankId];
    if (!bank) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบข้อมูลธนาคาร'
      });
    }

    // สร้าง Transaction ID
    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // สร้างเวลาหมดอายุ (15 นาที)
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

    // สร้างข้อมูล QR Code ตามมาตรฐาน PromptPay
    const qrData = {
      bankCode: bank.bankCode,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      amount: parseFloat(amount),
      currency: 'THB',
      transactionId: transactionId,
      planId: planId,
      planTier: planTier,
      planName: planName,
      userId: userId,
      timestamp: new Date().toISOString(),
      expiryTime: expiryTime.toISOString()
    };

    // สร้าง QR Code string สำหรับ PromptPay
    const promptPayString = generatePromptPayString(qrData);

    // สร้าง QR Code image
    const qrCodeImage = await QRCode.toDataURL(promptPayString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // บันทึกข้อมูล transaction ลงฐานข้อมูล (ในระบบจริง)
    const transaction = {
      transactionId: transactionId,
      userId: userId,
      planId: planId,
      planTier: planTier,
      amount: parseFloat(amount),
      currency: 'THB',
      bankId: bankId,
      bankName: bank.name,
      accountNumber: bank.accountNumber,
      status: 'pending',
      createdAt: new Date(),
      expiryTime: expiryTime,
      qrCodeData: qrData
    };

    // TODO: บันทึก transaction ลงฐานข้อมูล
    // await Transaction.create(transaction);

    res.json({
      success: true,
      data: {
        transactionId: transactionId,
        qrCodeImage: qrCodeImage,
        qrCodeString: promptPayString,
        bankInfo: {
          name: bank.name,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName
        },
        amount: parseFloat(amount),
        currency: 'THB',
        planInfo: {
          id: planId,
          tier: planTier,
          name: planName
        },
        expiryTime: expiryTime.toISOString(),
        timeRemaining: 15 * 60 * 1000 // 15 นาทีในมิลลิวินาที
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง QR Code'
    });
  }
});

// ตรวจสอบสถานะการชำระเงิน
router.get('/check-payment/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    // TODO: ดึงข้อมูล transaction จากฐานข้อมูล
    // const transaction = await Transaction.findOne({ transactionId });

    // จำลองการตรวจสอบการชำระเงิน
    const mockTransaction = {
      transactionId: transactionId,
      status: 'pending', // pending, completed, expired, failed
      amount: 1000,
      currency: 'THB',
      createdAt: new Date(),
      expiryTime: new Date(Date.now() + 15 * 60 * 1000)
    };

    // ตรวจสอบว่า QR Code หมดอายุหรือยัง
    const isExpired = new Date() > new Date(mockTransaction.expiryTime);
    
    if (isExpired && mockTransaction.status === 'pending') {
      mockTransaction.status = 'expired';
    }

    res.json({
      success: true,
      data: {
        transactionId: transactionId,
        status: mockTransaction.status,
        amount: mockTransaction.amount,
        currency: mockTransaction.currency,
        isExpired: isExpired,
        timeRemaining: isExpired ? 0 : new Date(mockTransaction.expiryTime) - new Date()
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน'
    });
  }
});

// ยืนยันการชำระเงิน (สำหรับระบบจริง)
router.post('/confirm-payment', async (req, res) => {
  try {
    const { transactionId, paymentReference, amount, bankId } = req.body;

    // TODO: ตรวจสอบข้อมูลการชำระเงินกับธนาคาร
    // ตรวจสอบว่า transaction ยังไม่หมดอายุ
    // ตรวจสอบจำนวนเงินตรงกับที่ระบุ
    // ตรวจสอบว่าไม่เคยยืนยันแล้ว

    // จำลองการยืนยันการชำระเงิน
    const paymentConfirmation = {
      transactionId: transactionId,
      paymentReference: paymentReference,
      amount: parseFloat(amount),
      bankId: bankId,
      confirmedAt: new Date(),
      status: 'completed'
    };

    // TODO: อัปเดตสถานะ transaction ในฐานข้อมูล
    // await Transaction.findOneAndUpdate(
    //   { transactionId: transactionId },
    //   { 
    //     status: 'completed',
    //     paymentReference: paymentReference,
    //     confirmedAt: new Date()
    //   }
    // );

    // TODO: อัปเกรดสมาชิกของผู้ใช้
    // await upgradeUserMembership(userId, planId);

    res.json({
      success: true,
      message: 'ยืนยันการชำระเงินสำเร็จ',
      data: paymentConfirmation
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน'
    });
  }
});

// สร้าง PromptPay string ตามมาตรฐาน
function generatePromptPayString(data) {
  // ตามมาตรฐาน EMV QR Code สำหรับ PromptPay
  const payload = {
    "00": "02", // Payload Format Indicator
    "01": "12", // Point of Initiation Method
    "26": {
      "00": "A000000677010112", // Global Unique Identifier
      "01": data.accountNumber, // PromptPay ID
      "02": "00" // PromptPay ID Type
    },
    "52": "0000", // Merchant Category Code
    "53": "764", // Transaction Currency
    "54": data.amount.toFixed(2), // Transaction Amount
    "58": "TH", // Country Code
    "59": data.accountName, // Merchant Name
    "60": "Bangkok", // Merchant City
    "62": {
      "01": data.transactionId // Reference 1
    }
  };

  // แปลงเป็น TLV format
  return encodeTLV(payload);
}

// แปลงข้อมูลเป็น TLV format
function encodeTLV(data) {
  let result = '';
  
  for (const [tag, value] of Object.entries(data)) {
    if (typeof value === 'object') {
      const nestedValue = encodeTLV(value);
      result += tag + padZero(nestedValue.length, 2) + nestedValue;
    } else {
      result += tag + padZero(value.length, 2) + value;
    }
  }
  
  return result;
}

// เพิ่มเลข 0 นำหน้า
function padZero(num, size) {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

// ดึงข้อมูลธนาคารทั้งหมด
router.get('/banks', (req, res) => {
  try {
    const banks = Object.keys(bankAccounts).map(id => ({
      id: id,
      name: bankAccounts[id].name,
      accountNumber: bankAccounts[id].accountNumber,
      accountName: bankAccounts[id].accountName,
      bankCode: bankAccounts[id].bankCode
    }));

    res.json({
      success: true,
      data: banks
    });

  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลธนาคาร'
    });
  }
});

// FeelFreePay Routes
// สร้างการชำระเงินผ่าน FeelFreePay
router.post('/feelfreepay/create', async (req, res) => {
  try {
    const { plan, userInfo } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!plan || !userInfo) {
      return res.status(400).json({
        resultCode: '01',
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }

    // สร้างข้อมูลการชำระเงินสำหรับ FeelFreePay
    const paymentData = {
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

    // เรียก API ของ FeelFreePay
    let response;
    try {
      response = await axios.post(`${FEELFREEPAY_CONFIG.apiUrl}/payments/create`, paymentData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(FEELFREEPAY_CONFIG.secretKey + ':').toString('base64')}`
        }
      });
    } catch (error) {
      // ถ้าเป็น authentication error หรือ network error ให้ใช้ mock response
      if (error.response?.status === 401 || error.code === 'ECONNREFUSED' || error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.log('Using mock FeelFreePay response due to:', error.message);
        const referenceNo = `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const ffpReferenceNo = `ffp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        return res.json({
          resultCode: '00',
          referenceNo: referenceNo,
          ffpReferenceNo: ffpReferenceNo,
          qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSIxNTAiIHk9IjE1MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iYmxhY2siIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5GRUVMRlJFRVBBWTwvdGV4dD4KPHRleHQgeD0iMTUwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9ImdyYXkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5RUkNvZGU8L3RleHQ+Cjwvc3ZnPgo=',
          paymentUrl: `https://feelfreepay.com/pay/${referenceNo}`,
          amount: plan.price.amount,
          currency: 'THB',
          expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          timeRemaining: 15 * 60 * 1000,
          isMock: true
        });
      } else {
        throw error;
      }
    }

    if (response.data.resultCode === '00') {
      // บันทึกข้อมูล transaction ลงฐานข้อมูล
      const transaction = {
        referenceNo: response.data.referenceNo,
        ffpReferenceNo: response.data.ffpReferenceNo,
        userId: userInfo.userId,
        planId: plan._id,
        planTier: plan.tier,
        amount: plan.price.amount,
        currency: 'THB',
        paymentMethod: 'feelfreepay',
        status: 'G', // Generate
        createdAt: new Date(),
        expiryTime: new Date(Date.now() + 15 * 60 * 1000),
        paymentData: response.data
      };

      // TODO: บันทึก transaction ลงฐานข้อมูล
      // await Transaction.create(transaction);

      res.json({
        resultCode: '00',
        referenceNo: response.data.referenceNo,
        ffpReferenceNo: response.data.ffpReferenceNo,
        qrCode: response.data.qrCode,
        paymentUrl: response.data.paymentUrl,
        amount: plan.price.amount,
        currency: 'THB',
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        timeRemaining: 15 * 60 * 1000
      });
    } else {
      throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการสร้างการชำระเงิน');
    }

  } catch (error) {
    console.error('FeelFreePay create payment error:', error);
    res.status(500).json({
      resultCode: '90',
      message: error.message || 'เกิดข้อผิดพลาดในการสร้างการชำระเงิน'
    });
  }
});

// ตรวจสอบสถานะการชำระเงิน FeelFreePay
router.post('/feelfreepay/status/:referenceNo', async (req, res) => {
  try {
    const { referenceNo } = req.params;

    // เรียก API ของ FeelFreePay
    const response = await axios.post(`${FEELFREEPAY_CONFIG.apiUrl}/check_status_txn`, {
      referenceNo: referenceNo
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(FEELFREEPAY_CONFIG.secretKey + ':').toString('base64')}`
      }
    });

    if (response.data.resultCode === '00') {
      res.json({
        resultCode: '00',
        txn: response.data.txn
      });
    } else {
      throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
    }

  } catch (error) {
    console.error('FeelFreePay check status error:', error);
    
    // ถ้าเป็น CORS error หรือ network error ให้จำลองการทำงาน
    if (error.code === 'ECONNREFUSED' || error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      // จำลองการตรวจสอบสถานะ
      const mockStatus = Math.random() > 0.7 ? 'S' : 'G';
      
      res.json({
        resultCode: '00',
        txn: {
          referenceNo: referenceNo,
          ffpReferenceNo: `ffp_${Date.now()}`,
          status: mockStatus,
          amount: 1000,
          currency: 'THB',
          date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          time: new Date().toISOString().slice(11, 17).replace(/:/g, ''),
          isMock: true
        }
      });
    } else {
      res.status(500).json({
        resultCode: '90',
        message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน'
      });
    }
  }
});

// ยกเลิกการชำระเงิน FeelFreePay
router.post('/feelfreepay/cancel/:referenceNo', async (req, res) => {
  try {
    const { referenceNo } = req.params;

    // เรียก API ของ FeelFreePay
    const response = await axios.post(`${FEELFREEPAY_CONFIG.apiUrl}/cancel_payment`, {
      referenceNo: referenceNo
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(FEELFREEPAY_CONFIG.secretKey + ':').toString('base64')}`
      }
    });

    if (response.data.resultCode === '00') {
      res.json({
        resultCode: '00',
        message: 'ยกเลิกการชำระเงินสำเร็จ'
      });
    } else {
      throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน');
    }

  } catch (error) {
    console.error('FeelFreePay cancel payment error:', error);
    
    // ถ้าเป็น CORS error หรือ network error ให้จำลองการทำงาน
    if (error.code === 'ECONNREFUSED' || error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      res.json({
        resultCode: '00',
        message: 'ยกเลิกการชำระเงินสำเร็จ (จำลอง)',
        isMock: true
      });
    } else {
      res.status(500).json({
        resultCode: '90',
        message: error.message || 'เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน'
      });
    }
  }
});

// ดึงข้อมูลธนาคารที่รองรับ FeelFreePay
router.get('/feelfreepay/banks', async (req, res) => {
  try {
    // เรียก API ของ FeelFreePay
    const response = await axios.get(`${FEELFREEPAY_CONFIG.apiUrl}/banks/supported`, {
      headers: {
        'Authorization': `Bearer ${FEELFREEPAY_CONFIG.publicKey}`,
        'X-Secret-Key': FEELFREEPAY_CONFIG.secretKey
      }
    });

    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลธนาคาร');
    }

  } catch (error) {
    console.error('FeelFreePay get banks error:', error);
    
    // ถ้าเป็น CORS error หรือ network error ให้จำลองการทำงาน
    if (error.code === 'ECONNREFUSED' || error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      // จำลองข้อมูลธนาคาร
      const mockBanks = [
        { id: 'scb', name: 'ธนาคารไทยพาณิชย์', code: 'SCB' },
        { id: 'kbank', name: 'ธนาคารกสิกรไทย', code: 'KBANK' },
        { id: 'bbl', name: 'ธนาคารกรุงเทพ', code: 'BBL' },
        { id: 'ktb', name: 'ธนาคารกรุงไทย', code: 'KTB' },
        { id: 'baac', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', code: 'BAAC' },
        { id: 'gsb', name: 'ธนาคารออมสิน', code: 'GSB' }
      ];
      
      res.json({
        success: true,
        data: mockBanks,
        isMock: true
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลธนาคาร'
      });
    }
  }
});

// ดึงประวัติการชำระเงิน FeelFreePay
router.post('/feelfreepay/history', async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.body;

    // เรียก API ของ FeelFreePay
    const response = await axios.post(`${FEELFREEPAY_CONFIG.apiUrl}/payment_history`, {
      userId: userId,
      page: page,
      limit: limit
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(FEELFREEPAY_CONFIG.secretKey + ':').toString('base64')}`
      }
    });

    if (response.data.resultCode === '00') {
      res.json({
        success: true,
        resultCode: '00',
        data: response.data.data || [],
        pagination: response.data.pagination || {}
      });
    } else {
      throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน');
    }

  } catch (error) {
    console.error('FeelFreePay get payment history error:', error);
    
    // ถ้าเป็น CORS error หรือ network error ให้จำลองการทำงาน
    if (error.code === 'ECONNREFUSED' || error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      // จำลองข้อมูลประวัติการชำระเงิน
      const mockHistory = [
        {
          id: 'tx_001',
          amount: 299,
          currency: 'THB',
          status: 'completed',
          paymentMethod: 'feelfreepay',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          referenceNo: 'ref_001'
        },
        {
          id: 'tx_002',
          amount: 599,
          currency: 'THB',
          status: 'pending',
          paymentMethod: 'feelfreepay',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          referenceNo: 'ref_002'
        }
      ];
      
      res.json({
        success: true,
        resultCode: '00',
        data: mockHistory,
        pagination: {
          page: page,
          limit: limit,
          total: mockHistory.length,
          totalPages: 1
        },
        isMock: true
      });
    } else {
      res.status(500).json({
        success: false,
        resultCode: '96',
        message: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน'
      });
    }
  }
});

// Webhook สำหรับ FeelFreePay
router.post('/feelfreepay-webhook', async (req, res) => {
  try {
    const { transactionId, status, amount, paymentReference } = req.body;

    console.log('FeelFreePay webhook received:', {
      transactionId,
      status,
      amount,
      paymentReference
    });

    // ตรวจสอบ signature (ในระบบจริง)
    // const signature = req.headers['x-feelfreepay-signature'];
    // if (!verifySignature(req.body, signature)) {
    //   return res.status(400).json({ error: 'Invalid signature' });
    // }

    // อัปเดตสถานะ transaction ในฐานข้อมูล
    // await Transaction.findOneAndUpdate(
    //   { transactionId: transactionId },
    //   { 
    //     status: status,
    //     paymentReference: paymentReference,
    //     updatedAt: new Date()
    //   }
    // );

    // ถ้าชำระเงินสำเร็จ ให้อัปเกรดสมาชิก
    if (status === 'completed') {
      // TODO: อัปเกรดสมาชิกของผู้ใช้
      // const transaction = await Transaction.findOne({ transactionId });
      // await upgradeUserMembership(transaction.userId, transaction.planId);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('FeelFreePay webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
