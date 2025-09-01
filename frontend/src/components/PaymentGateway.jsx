import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { membershipHelpers } from '../services/membershipAPI'
import { paymentAPI, paymentHelpers } from '../services/paymentAPI'
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Star,
  QrCode,
  Wallet,
  Banknote,
  Sparkles,
  Lock,
  Zap,
  ExternalLink,
  Copy,
  RefreshCw,
  Timer
} from 'lucide-react'
import { feelFreePayAPI, feelFreePayHelpers } from '../services/feelfreepayAPI'
import { useAuth } from '../contexts/AuthContext'

const PaymentGateway = ({ plan, onBack, onSuccess, onCancel }) => {
  const { user } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [timeRemaining, setTimeRemaining] = useState(900000) // 15 นาที
  const [currentTransaction, setCurrentTransaction] = useState(null)
  const [paymentCheckInterval, setPaymentCheckInterval] = useState(null)
  const [apiMode, setApiMode] = useState('production') // 'test' or 'production'
  const [debugMode, setDebugMode] = useState(false)

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
  }

  // ระดับชั้นและราคาที่ตรงกัน
  const tierPricing = {
    member: { amount: 0, currency: 'THB', name: 'สมาชิกฟรี' },
    silver: { amount: 20, currency: 'THB', name: 'Silver Member' },
    gold: { amount: 50, currency: 'THB', name: 'Gold Member' },
    vip: { amount: 100, currency: 'THB', name: 'VIP Member' },
    vip1: { amount: 150, currency: 'THB', name: 'VIP 1' },
    vip2: { amount: 300, currency: 'THB', name: 'VIP 2' },
    diamond: { amount: 500, currency: 'THB', name: 'Diamond Member' },
    platinum: { amount: 1000, currency: 'THB', name: 'Platinum Member' }
  }

  // Timer สำหรับ QR Code
  useEffect(() => {
    if (qrData && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            setPaymentStatus('expired')
            return 0
          }
          return prev - 1000
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [qrData, timeRemaining])

  // Polling ตรวจสถานะจาก FeelFreePay โดยตรง (G/A/S/D)
  useEffect(() => {
    if (qrData && (paymentStatus === 'G' || paymentStatus === 'A')) {
      feelFreePayHelpers.pollPaymentStatus(
        qrData.referenceNo,
        (status) => {
          setPaymentStatus(status)
        },
        (txn) => {
          setPaymentStatus('S')
          onSuccess && onSuccess(txn)
        },
        (err) => {
          console.error(err)
        }
      )
    }
  }, [qrData, paymentStatus, onSuccess])

  // สร้าง QR อัตโนมัติเมื่อ component mount
  useEffect(() => {
    if (!qrData) {
      createFeelFreePayPayment()
    }
  }, [])

  // สร้าง FeelFreePay Payment ด้วยวิธีใหม่จาก HTML
  const createFeelFreePayPayment = async () => {
    feelFreePayHelpers.debugLog('=== Starting QR Code Generation ===', 'info')
    setProcessing(true)
    
    try {
      // เตรียมข้อมูลการชำระเงิน
      const paymentData = {
        amount: plan.price.amount,
        description: `อัปเกรดเป็น ${plan.name} - ${plan.tier}`,
        customerName: user?.displayName || 'Customer',
        customerEmail: user?.email || 'customer@example.com',
        referenceNo: feelFreePayHelpers.generateReferenceId(),
        detail: `อัปเกรดเป็น ${plan.name} - ${plan.tier}`,
        timestamp: new Date().toISOString(),
        currency: 'THB'
      }
      
      feelFreePayHelpers.debugLog('Payment data prepared:', 'info', paymentData)
      
      // ตรวจสอบว่าใช้ API โดยตรงหรือผ่าน backend
      let result
      
      try {
        // ลองเรียก API โดยตรงก่อน
        feelFreePayHelpers.debugLog('Trying direct API call...', 'info')
        result = await feelFreePayHelpers.createQRCodeDirect(paymentData, apiMode)
        feelFreePayHelpers.debugLog('Direct API call successful', 'success')
      } catch (directError) {
        // ถ้าเรียกโดยตรงไม่ได้ ใช้ backend proxy
        feelFreePayHelpers.debugLog('Direct API failed, using backend proxy', 'warning')
        
        const requestData = {
          plan: plan,
          userInfo: {
            userId: user?._id || user?.id || 'user123',
            name: paymentData.customerName,
            email: paymentData.customerEmail,
            phone: '0800000000',
            address: 'Bangkok, Thailand'
          }
        }
        
        result = await feelFreePayAPI.createPayment(requestData)
      }
      
      // บันทึก transaction data
      const transaction = {
        ...paymentData,
        ...result,
        status: 'pending',
        createdAt: new Date(),
        apiMode: apiMode
      }
      
      setCurrentTransaction(transaction)
      feelFreePayHelpers.debugLog('Transaction data saved:', 'info', transaction)
      
      // ตั้งค่า QR Data
      setQrData({
        qrCode: result.qrCode || result.qrData || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSIxNTAiIHk9IjE1MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iYmxhY2siIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5GRUVMRlJFRVBBWTwvdGV4dD4KPHRleHQgeD0iMTUwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9ImdyYXkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5RUkNvZGU8L3RleHQ+Cjwvc3ZnPgo=',
        referenceNo: result.referenceNo || paymentData.referenceNo,
        ffpReferenceNo: result.ffpReferenceNo || 'ffp_' + result.referenceNo,
        amount: result.amount || plan.price.amount,
        expiryTime: result.expiryTime ? new Date(result.expiryTime) : new Date(Date.now() + 15 * 60 * 1000),
        paymentUrl: result.paymentUrl || `https://feelfreepay.com/pay/${result.referenceNo}`,
        isMock: result.isMock || false
      })
      
      setTimeRemaining(result.timeRemaining || 15 * 60 * 1000)
      setPaymentStatus('G') // Generate
      
      // เริ่มตรวจสอบสถานะอัตโนมัติ
      feelFreePayHelpers.debugLog('Starting automatic status checking...', 'info')
      startAutoCheck()
      
      feelFreePayHelpers.debugLog('=== QR Code Generation Completed Successfully ===', 'success')
      
    } catch (error) {
      feelFreePayHelpers.debugLog('QR Code generation failed:', 'error', {
        message: error.message,
        stack: error.stack
      })
      console.error('เกิดข้อผิดพลาดในการสร้าง QR Code:', error.message)
    } finally {
      setProcessing(false)
    }
  }

  // เริ่มตรวจสอบสถานะอัตโนมัติทุก 10 วินาที
  const startAutoCheck = () => {
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval)
    }
    
    const interval = setInterval(() => {
      if (currentTransaction && currentTransaction.status === 'pending') {
        checkPaymentStatusDirect()
      }
    }, 10000)
    
    setPaymentCheckInterval(interval)
  }

  // ตรวจสอบสถานะการชำระเงินโดยตรง
  const checkPaymentStatusDirect = async () => {
    if (!currentTransaction) {
      feelFreePayHelpers.debugLog('No current transaction found', 'error')
      return
    }
    
    try {
      feelFreePayHelpers.debugLog('Checking payment status...', 'info')
      const status = await feelFreePayHelpers.checkStatusDirect(currentTransaction.referenceNo)
      
      feelFreePayHelpers.debugLog(`Status check result: ${status}`, 'success')
      updatePaymentStatus(status)
      
    } catch (error) {
      feelFreePayHelpers.debugLog('Status check failed', 'error', error)
    }
  }

  // อัปเดตสถานะการชำระเงิน
  const updatePaymentStatus = (status) => {
    switch(status) {
      case 'success':
      case 'S':
        setPaymentStatus('S')
        if (currentTransaction) {
          currentTransaction.status = 'success'
        }
        // หยุดการตรวจสอบอัตโนมัติ
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval)
          setPaymentCheckInterval(null)
        }
        onSuccess && onSuccess(currentTransaction)
        break
      case 'failed':
      case 'D':
        setPaymentStatus('D')
        if (currentTransaction) {
          currentTransaction.status = 'failed'
        }
        // หยุดการตรวจสอบอัตโนมัติ
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval)
          setPaymentCheckInterval(null)
        }
        break
      default:
        setPaymentStatus('G')
    }
  }

  const handlePayment = async () => {
    await createFeelFreePayPayment()
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    // alert('คัดลอกแล้ว') // ลบการแจ้งเตือน
    console.log('คัดลอกแล้ว')
  }

  const refreshQRCode = () => {
    setQrData(null)
    setPaymentStatus('pending')
    setTimeRemaining(900000)
    setCurrentTransaction(null)
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval)
      setPaymentCheckInterval(null)
    }
    createFeelFreePayPayment()
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval)
      }
    }
  }, [paymentCheckInterval])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-violet-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-violet-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
        {/* Header */}
        <div className="flex items-center mb-8 animate-fadeIn">
          <Button 
            onClick={onBack}
            variant="ghost" 
            className="mr-4 hover:bg-white/70 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <div className="flex items-center">
            <div className="mr-4">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent">
                ชำระเงิน
              </h1>
              <p className="text-slate-600 flex items-center">
                <Lock className="h-4 w-4 mr-1 text-green-500" />
                ปลอดภัย รวดเร็ว และน่าเชื่อถือ
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1 animate-slideInLeft">
            <Card className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl sticky top-8 hover:shadow-3xl transition-all duration-500 group">
              <CardHeader className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  สรุปคำสั่งซื้อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Plan Info */}
                <div className="relative overflow-hidden p-4 bg-gradient-to-r from-pink-50 to-violet-50 rounded-xl border border-pink-100/50 hover:shadow-lg transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${membershipHelpers.getTierGradient(plan.tier)} flex items-center justify-center text-xl mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {membershipHelpers.getTierIcon(plan.tier)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
                      <p className="text-sm text-slate-600 flex items-center">
                        <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                        {plan.duration.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features Highlight */}
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700 flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    สิทธิพิเศษที่คุณจะได้รับ
                  </h4>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div>💬 แชทได้ {plan.features.dailyChats === -1 ? 'ไม่จำกัด' : plan.features.dailyChats} ครั้ง/วัน</div>
                    <div>📸 อัปโหลดรูป {plan.features.dailyImages === -1 ? 'ไม่จำกัด' : plan.features.dailyImages} รูป/วัน</div>
                    <div>🎬 อัปโหลดวิดีโอ {plan.features.dailyVideos === -1 ? 'ไม่จำกัด' : plan.features.dailyVideos} วิดีโอ/วัน</div>
                    <div>🪙 โบนัสรายวัน {plan.features.dailyBonus.toLocaleString()} เหรียญ</div>
                    {plan.features.specialFeatures.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        {plan.features.specialFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                            {feature.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="relative border-t border-gradient-to-r from-pink-200 to-violet-200 pt-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-pink-500/5 to-violet-500/5 rounded-xl border border-pink-100">
                    <div>
                      <span className="text-slate-600 text-sm">ราคารวม</span>
                      {plan.price.amount > 0 && (
                        <p className="text-xs text-green-600 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          รวม VAT แล้ว
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent">
                        {membershipHelpers.formatPrice(plan.price.amount, plan.price.currency)}
                      </span>
                      {plan.price.amount > 0 && (
                        <div className="text-xs text-slate-500 flex items-center justify-end">
                          <Banknote className="h-3 w-3 mr-1" />
                          ชำระครั้งเดียว
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2 animate-slideInRight">
            <Card className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3 animate-pulse">
                    <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-xs font-bold text-blue-600">
                      FF
                    </div>
                  </div>
                  ชำระเงินผ่าน FeelFreePay Gateway
                </CardTitle>
                <p className="text-sm text-slate-600 flex items-center">
                  <Lock className="h-4 w-4 mr-1 text-green-500" />
                  ปลอดภัยด้วยการเข้ารหัส SSL 256-bit | รองรับทุกธนาคาร
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* FeelFreePay Features Banner */}
                <div className="relative overflow-hidden p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">FeelFreePay Gateway</h3>
                        <p className="text-white/90 text-sm">ระบบชำระเงินที่ปลอดภัย รวดเร็ว และสะดวกสบาย</p>
                      </div>
                      <div className="hidden sm:block">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-lg shadow-xl">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl font-bold text-blue-600">
                            FF
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                        <QrCode className="h-4 w-4 text-white mr-2" />
                        <span className="text-white text-sm">QR Code</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Display */}
                {qrData && (
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                          <QrCode className="h-6 w-6 inline mr-2 text-blue-600" />
                          สแกน QR Code เพื่อชำระเงิน
                        </h3>
                        <p className="text-sm text-slate-600">ใช้แอปธนาคารหรือ Mobile Banking สแกน QR Code ด้านล่าง</p>
                      </div>
                      
                      {/* QR Code Container - Full Size 453x264 */}
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          {/* QR Code Full Size without container restrictions */}
                          <img
                            src={qrData.qrCode}
                            alt="QR Code"
                            className="rounded-lg shadow-2xl"
                            style={{
                              width: '180px',
                              height: '264px',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              imageRendering: 'crisp-edges'
                            }}
                          />
                          {paymentStatus === 'pending' && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
                              <div className="text-center">
                                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2 text-blue-500" />
                                <p className="text-sm text-slate-600">กำลังโหลด QR Code...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-slate-600">จำนวนเงิน:</span>
                          <span className="font-bold text-lg text-slate-800">
                            {membershipHelpers.formatPrice(qrData.amount, plan.price.currency)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-slate-600">รหัสอ้างอิง:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-800">{qrData.referenceNo}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(qrData.referenceNo)}
                              className="p-1 h-auto"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Timer */}
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="text-slate-600 flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            เวลาที่เหลือ:
                          </span>
                          <span className={`font-bold ${timeRemaining < 60000 ? 'text-red-500' : 'text-slate-800'}`}>
                            {paymentHelpers.formatTimeRemaining(timeRemaining)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={refreshQRCode}
                          variant="outline"
                          className="flex-1"
                          disabled={processing}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          รีเฟรช QR Code
                        </Button>
                       
                      </div>

                      {/* Status */}
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            paymentStatus === 'expired' ? 'bg-red-100 text-red-800' :
                            paymentStatus === 'S' ? 'bg-green-100 text-green-800' :
                            (paymentStatus === 'G' || paymentStatus === 'A') ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            <span className="mr-1">
                              {paymentStatus === 'expired' ? '⏰' : paymentStatus === 'S' ? '✅' : (paymentStatus === 'G' || paymentStatus === 'A') ? '⏳' : '❓'}
                            </span>
                            <span className="ml-1">{paymentStatus === 'expired' ? 'QR Code หมดอายุแล้ว' : feelFreePayHelpers.getStatusMessage(paymentStatus)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}



                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1 h-12 border-2 hover:bg-slate-50 transition-all duration-300 hover:scale-105"
                    disabled={processing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={handlePayment}
                    className={`flex-1 h-12 shadow-lg hover:shadow-xl transition-all duration-300 ${
                      processing
                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 opacity-50 cursor-not-allowed hover:scale-100'
                        : qrData
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white cursor-default hover:scale-100'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:scale-105'
                    }`}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        กำลังประมวลผล...
                      </>
                    ) : qrData ? (
                      <>
                        <div className="flex items-center justify-center w-full">
                          <CheckCircle className="h-5 w-5 mr-2 text-white" />
                          <span className="font-medium">QR Code พร้อมใช้งาน</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-full">
                          <div className="flex items-center">
                            <div className="p-1 bg-white/20 rounded-full mr-3 animate-pulse">
                              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                                FF
                              </div>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium">สร้าง QR Code ชำระเงิน</span>
                              <span className="text-xs opacity-90">
                                {membershipHelpers.formatPrice(plan.price.amount, plan.price.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </Button>
                </div>

                {/* Security Notice */}
                <div className="flex items-center justify-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <Shield className="h-3 w-3 mr-1 text-green-500" />
                  การชำระเงินของคุณได้รับการปกป้องด้วยเทคโนโลยีการเข้ารหัสระดับธนาคาร
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentGateway
