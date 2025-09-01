const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const axios = require('axios');

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

// Helper function to generate reference ID (15 digits)
function generateReferenceId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // YYMMDDHHMMSSXXX format (15 digits)
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`.slice(0, 15);
}


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
    const { plan, userInfo, apiMode = 'production' } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!plan || !userInfo) {
      return res.status(400).json({
        resultCode: '01',
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }

    const referenceNo = generateReferenceId();
    const apiURL = apiMode === 'test' ? FEELFREEPAY_CONFIG.testURL : FEELFREEPAY_CONFIG.productionURL;
    
    console.log(`[FeelFreePay] Creating payment - Mode: ${apiMode}, Ref: ${referenceNo}`);

    // สร้างข้อมูลการชำระเงินในรูปแบบ FormData
    const formData = new URLSearchParams();
    formData.append('token', FEELFREEPAY_CONFIG.token);
    formData.append('referenceNo', referenceNo);
    formData.append('amount', plan.price.amount.toString());
    formData.append('detail', `อัปเกรดเป็น ${plan.name} - ${plan.tier}`);
    formData.append('customerName', userInfo.name || 'Customer');
    formData.append('customerEmail', userInfo.email || 'customer@example.com');

    // เรียก API ของ FeelFreePay
    let response;
    try {
      response = await axios.post(apiURL, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        responseType: 'arraybuffer' // รับเป็น binary data สำหรับรูปภาพ QR Code
      });
      
      // แปลง binary data เป็น base64
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const qrDataUrl = `data:image/png;base64,${base64}`;
      
      console.log(`[FeelFreePay] QR Code created successfully - Ref: ${referenceNo}`);
      
      return res.json({
        resultCode: '00',
        referenceNo: referenceNo,
        ffpReferenceNo: `ffp_${referenceNo}`,
        qrCode: qrDataUrl,
        paymentUrl: `https://feelfreepay.com/pay/${referenceNo}`,
        amount: plan.price.amount,
        currency: 'THB',
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        timeRemaining: 15 * 60 * 1000
      });
      
    } catch (error) {
      // ถ้าเป็น error ให้ใช้ mock response
      console.log('[FeelFreePay] Using mock response due to:', error.message);
      
      // สร้าง mock QR Code
      const mockQRCode = await QRCode.toDataURL(`https://feelfreepay.com/pay/${referenceNo}`, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return res.json({
        resultCode: '00',
        referenceNo: referenceNo,
        ffpReferenceNo: `ffp_${referenceNo}`,
        qrCode: mockQRCode,
        paymentUrl: `https://feelfreepay.com/pay/${referenceNo}`,
        amount: plan.price.amount,
        currency: 'THB',
        expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        timeRemaining: 15 * 60 * 1000,
        isMock: true
      });
    }

  } catch (error) {
    console.error('[FeelFreePay] Create payment error:', error);
    res.status(500).json({
      resultCode: '90',
      message: error.message || 'เกิดข้อผิดพลาดในการสร้างการชำระเงิน'
    });
  }
});

// สร้าง QR Code โดยตรงจาก API
router.post('/feelfreepay/qrcode', async (req, res) => {
  try {
    const { amount, description, customerName, customerEmail, referenceNo, apiMode = 'production' } = req.body;
    
    const finalReferenceNo = referenceNo || generateReferenceId();
    const apiURL = apiMode === 'test' ? FEELFREEPAY_CONFIG.testURL : FEELFREEPAY_CONFIG.productionURL;
    
    console.log(`[FeelFreePay] Direct QR generation - Mode: ${apiMode}, Ref: ${finalReferenceNo}`);
    
    const formData = new URLSearchParams();
    formData.append('token', FEELFREEPAY_CONFIG.token);
    formData.append('referenceNo', finalReferenceNo);
    formData.append('amount', amount.toString());
    formData.append('detail', description || 'Payment');
    formData.append('customerName', customerName || '');
    formData.append('customerEmail', customerEmail || '');
    
    try {
      const response = await axios.post(apiURL, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        responseType: 'arraybuffer'
      });
      
      // ส่งรูปภาพ QR Code กลับไปโดยตรง
      res.set('Content-Type', 'image/png');
      res.send(Buffer.from(response.data, 'binary'));
      
    } catch (error) {
      // ถ้า API error ให้สร้าง mock QR Code
      console.log('[FeelFreePay] Generating mock QR Code');
      const qrCode = await QRCode.toBuffer(`https://feelfreepay.com/pay/${finalReferenceNo}`);
      res.set('Content-Type', 'image/png');
      res.send(qrCode);
    }
    
  } catch (error) {
    console.error('[FeelFreePay] QR Code generation error:', error);
    res.status(500).json({
      resultCode: '90',
      message: error.message || 'เกิดข้อผิดพลาดในการสร้าง QR Code'
    });
  }
});

// ตรวจสอบสถานะการชำระเงิน FeelFreePay
router.post('/feelfreepay/status/:referenceNo', async (req, res) => {
  try {
    const { referenceNo } = req.params;
    
    console.log(`[FeelFreePay] Checking status for Ref: ${referenceNo}`);
    
    const authString = `${FEELFREEPAY_CONFIG.secretKey}:`;
    const base64Auth = Buffer.from(authString).toString('base64');

    // เรียก API ของ FeelFreePay
    try {
      const response = await axios.post(FEELFREEPAY_CONFIG.statusURL, {
        referenceNo: referenceNo
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Auth}`
        }
      });

      console.log(`[FeelFreePay] Status check response:`, response.data);

      if (response.data.resultCode === '00') {
        res.json({
          resultCode: '00',
          txn: response.data.txn
        });
      } else {
        throw new Error(response.data.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
      }
    } catch (apiError) {
      // ถ้า API error ให้จำลองการทำงาน
      console.log('[FeelFreePay] Using mock status response');
      
      // Random status for simulation
      const mockStatus = Math.random() > 0.3 ? 'S' : 'G';
      
      res.json({
        resultCode: '00',
        txn: {
          referenceNo: referenceNo,
          ffpReferenceNo: `ffp_${referenceNo}`,
          status: mockStatus,
          amount: 1000,
          currency: 'THB',
          date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          time: new Date().toISOString().slice(11, 19).replace(/:/g, ''),
          isMock: true
        }
      });
    }

  } catch (error) {
    console.error('[FeelFreePay] Status check error:', error);
    res.status(500).json({
      resultCode: '90',
      message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน'
    });
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
