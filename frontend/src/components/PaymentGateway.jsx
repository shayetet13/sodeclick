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
  const [selectedMethod, setSelectedMethod] = useState('feelfreepay')
  const [processing, setProcessing] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [timeRemaining, setTimeRemaining] = useState(900000) // 15 นาที
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    holderName: '',
    phone: '',
    email: ''
  })

  // FeelFreePay Configuration
  const FEELFREEPAY_CONFIG = {
    publicKey: 'Q3tyqDhLpeBJbR6oVRtOlDOcs670w4sg',
    secretKey: '3BM4eKlO5N8pxq68eYYQvdIBgfrn3X8W',
    apiUrl: 'https://api.feelfreepay.com/v1',
    webhookUrl: '/api/payment/feelfreepay-webhook'
  }

  const paymentMethods = [
    {
      id: 'feelfreepay',
      name: 'FeelFreePay',
      icon: (
        <div className="relative">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
            FF
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full animate-pulse"></div>
        </div>
      ),
      description: 'ชำระเงินผ่าน FeelFreePay Gateway',
      popular: true,
      color: 'from-blue-500 to-purple-600',
      features: ['QR Code', 'Mobile Banking', 'Credit Card', 'E-Wallet'],
      badge: 'แนะนำ'
    },
    {
      id: 'credit_card',
      name: 'บัตรเครดิต/เดบิต',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Visa, MasterCard, JCB',
      popular: false,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'mobile_banking',
      name: 'Mobile Banking',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'SCB Easy, Kbank, BBL Mobile',
      popular: false,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'qr_code',
      name: 'QR Code Payment',
      icon: <QrCode className="h-5 w-5" />,
      description: 'สแกน QR ผ่านแอปธนาคาร',
      popular: false,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'e_wallet',
      name: 'E-Wallet',
      icon: <Wallet className="h-5 w-5" />,
      description: 'TrueMoney, Rabbit LINE Pay',
      popular: false,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'internet_banking',
      name: 'Internet Banking',
      icon: <Building2 className="h-5 w-5" />,
      description: 'โอนผ่านธนาคารออนไลน์',
      popular: false,
      color: 'from-indigo-500 to-indigo-600'
    }
  ]

  // ระดับชั้นและราคาที่ตรงกัน
  const tierPricing = {
    member: { amount: 0, currency: 'THB', name: 'สมาชิกฟรี' },
    test: { amount: 0.1, currency: 'THB', name: 'Test Member' },
    silver: { amount: 99, currency: 'THB', name: 'Silver Member' },
    gold: { amount: 199, currency: 'THB', name: 'Gold Member' },
    vip: { amount: 299, currency: 'THB', name: 'VIP Member' },
    vip1: { amount: 499, currency: 'THB', name: 'VIP 1' },
    vip2: { amount: 799, currency: 'THB', name: 'VIP 2' },
    diamond: { amount: 1299, currency: 'THB', name: 'Diamond Member' },
    platinum: { amount: 1999, currency: 'THB', name: 'Platinum Member' }
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

  // สร้าง QR อัตโนมัติเมื่อเลือกวิธี FeelFreePay
  useEffect(() => {
    if (selectedMethod === 'feelfreepay' && !qrData) {
      createFeelFreePayPayment()
    }
  }, [selectedMethod])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
  }

  const formatExpiryDate = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2')
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    if (formatted.length <= 19) {
      setFormData(prev => ({ ...prev, cardNumber: formatted }))
    }
  }

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value)
    if (formatted.length <= 5) {
      setFormData(prev => ({ ...prev, expiryDate: formatted }))
    }
  }

  // สร้าง FeelFreePay Payment
  const createFeelFreePayPayment = async () => {
    setProcessing(true)
    try {
      // สร้างข้อมูลสำหรับส่งไปยัง backend
      const requestData = {
        plan: plan,
        userInfo: {
          userId: user?._id || user?.id || 'user123',
          name: formData.holderName || user?.displayName || 'Customer',
          email: formData.email || user?.email || 'customer@example.com',
          phone: formData.phone || '0800000000',
          address: 'Bangkok, Thailand' // default address
        }
      }

      // เรียก API ผ่าน backend proxy
      const result = await feelFreePayAPI.createPayment(requestData)

      // ใช้ข้อมูลจาก response
      setQrData({
        qrCode: result.qrCode || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSIxNTAiIHk9IjE1MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iYmxhY2siIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5GRUVMRlJFRVBBWTwvdGV4dD4KPHRleHQgeD0iMTUwIiB5PSIxNzAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9ImdyYXkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5RUkNvZGU8L3RleHQ+Cjwvc3ZnPgo=',
        referenceNo: result.referenceNo || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ffpReferenceNo: result.ffpReferenceNo || 'ffp_' + result.referenceNo,
        amount: result.amount || plan.price.amount,
        expiryTime: result.expiryTime ? new Date(result.expiryTime) : new Date(Date.now() + 15 * 60 * 1000),
        paymentUrl: result.paymentUrl || `https://feelfreepay.com/pay/${result.referenceNo}`,
        isMock: result.isMock || false
      })
              setTimeRemaining(result.timeRemaining || 15 * 60 * 1000)
        setPaymentStatus('G') // Generate
    } catch (error) {
      console.error('FeelFreePay payment error:', error)
      alert('เกิดข้อผิดพลาดในการสร้าง QR Code กรุณาลองใหม่อีกครั้ง')
    } finally {
      setProcessing(false)
    }
  }

  const handlePayment = async () => {
    if (selectedMethod === 'feelfreepay') {
      await createFeelFreePayPayment()
    } else {
      // วิธีการชำระเงินแบบเดิม
      setProcessing(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const transactionData = {
          planId: plan._id,
          tier: plan.tier,
          amount: plan.price.amount,
          currency: plan.price.currency,
          paymentMethod: selectedMethod,
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          status: 'completed'
        }
        
        onSuccess(transactionData)
      } catch (error) {
        console.error('Payment error:', error)
        alert('เกิดข้อผิดพลาดในการชำระเงิน กรุณาลองใหม่อีกครั้ง')
      } finally {
        setProcessing(false)
      }
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('คัดลอกแล้ว')
  }

  const refreshQRCode = () => {
    setQrData(null)
    setPaymentStatus('pending')
    setTimeRemaining(900000)
    createFeelFreePayPayment()
  }

  const isFormValid = () => {
    if (selectedMethod === 'feelfreepay') {
      return true // FeelFreePay ไม่ต้องการข้อมูลเพิ่มเติม
    }
    if (selectedMethod === 'credit_card') {
      return formData.cardNumber.replace(/\s/g, '').length === 16 &&
             formData.expiryDate.length === 5 &&
             formData.cvv.length >= 3 &&
             formData.holderName.trim() !== ''
    }
    return formData.phone !== '' && formData.email !== ''
  }

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
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mr-3 animate-pulse">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  เลือกวิธีการชำระเงิน
                </CardTitle>
                <p className="text-sm text-slate-600 flex items-center">
                  <Lock className="h-4 w-4 mr-1 text-green-500" />
                  ข้อมูลของคุณปลอดภัยด้วยการเข้ารหัส SSL 256-bit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Methods */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paymentMethods.map((method, index) => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group animate-fadeIn ${
                        selectedMethod === method.id
                          ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-violet-50 shadow-lg'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {method.popular && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-bounce">
                          <Sparkles className="h-3 w-3 inline mr-1" />
                          {method.badge || 'แนะนำ'}
                        </div>
                      )}
                      
                      {selectedMethod === method.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-2xl animate-pulse"></div>
                      )}
                      
                      <div className="relative z-10 flex items-center">
                        <div className={`p-3 rounded-xl transition-all duration-300 ${
                          selectedMethod === method.id 
                            ? `bg-gradient-to-r ${method.color} shadow-lg` 
                            : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}>
                          <div className={selectedMethod === method.id ? 'text-white' : 'text-slate-600'}>
                            {method.icon}
                          </div>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className={`font-semibold transition-colors duration-300 ${
                            selectedMethod === method.id ? 'text-slate-900' : 'text-slate-800'
                          }`}>
                            {method.name}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">{method.description}</p>
                          {method.features && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {method.features.map((feature, idx) => (
                                <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {selectedMethod === method.id && (
                          <div className="ml-2">
                            <CheckCircle className="h-5 w-5 text-green-500 animate-scale-in" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* FeelFreePay QR Code Display */}
                {selectedMethod === 'feelfreepay' && qrData && (
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">สแกน QR Code เพื่อชำระเงิน</h3>
                        <p className="text-sm text-slate-600">ใช้แอปธนาคารหรือ Mobile Banking สแกน QR Code ด้านล่าง</p>
                      </div>
                      
                      {/* QR Code */}
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <img 
                            src={qrData.qrCode} 
                            alt="QR Code" 
                            className="w-48 h-48 border-4 border-white shadow-lg rounded-lg"
                          />
                          {paymentStatus === 'pending' && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                              <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
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
                        <Button
                          onClick={() => window.open(qrData.paymentUrl, '_blank')}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          เปิดลิงก์ชำระเงิน
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

                {/* Payment Form Fields for other methods */}
                {selectedMethod !== 'feelfreepay' && (
                  selectedMethod === 'credit_card' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          หมายเลขบัตร
                        </label>
                        <input
                          type="text"
                          value={formData.cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="1234 5678 9012 3456"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            วันหมดอายุ
                          </label>
                          <input
                            type="text"
                            value={formData.expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            name="cvv"
                            value={formData.cvv}
                            onChange={handleInputChange}
                            placeholder="123"
                            maxLength="4"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          ชื่อผู้ถือบัตร
                        </label>
                        <input
                          type="text"
                          name="holderName"
                          value={formData.holderName}
                          onChange={handleInputChange}
                          placeholder="ชื่อ-นามสกุล ตามบัตร"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          หมายเลขโทรศัพท์
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="08X-XXX-XXXX"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          อีเมล
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="example@email.com"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium">ขั้นตอนการชำระเงิน:</p>
                            <ol className="list-decimal list-inside mt-1 space-y-1">
                              <li>กดปุ่มชำระเงิน</li>
                              <li>ระบบจะแสดง QR Code หรือลิงก์สำหรับชำระเงิน</li>
                              <li>ทำการชำระผ่านแอปธนาคาร</li>
                              <li>รอการยืนยันจากระบบ</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Terms */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="flex items-start">
                    <input type="checkbox" className="mt-1 mr-3" defaultChecked />
                    <span className="text-sm text-slate-600">
                      ฉันยอมรับ <a href="#" className="text-pink-500 hover:underline">ข้อกำหนดการใช้งาน</a> และ 
                      <a href="#" className="text-pink-500 hover:underline ml-1">นโยบายความเป็นส่วนตัว</a>
                    </span>
                  </label>
                </div>

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
                    className="flex-1 h-12 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    disabled={!isFormValid() || processing || (selectedMethod === 'feelfreepay' && qrData)}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        กำลังประมวลผล...
                      </>
                    ) : selectedMethod === 'feelfreepay' && qrData ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        QR Code พร้อมใช้งาน
                      </>
                    ) : selectedMethod === 'feelfreepay' ? (
                      <>
                        <div className="flex items-center justify-center w-full">
                          <div className="flex items-center">
                            <div className="p-1 bg-white/20 rounded-full mr-3 animate-pulse">
                              <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                FF
                              </div>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium">ชำระเงินผ่าน FeelFreePay</span>
                              <span className="text-xs opacity-90">
                                {membershipHelpers.formatPrice(plan.price.amount, plan.price.currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <div className="p-1 bg-white/20 rounded mr-2">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">ชำระเงิน</span>
                            <span className="text-xs opacity-90">
                              {membershipHelpers.formatPrice(plan.price.amount, plan.price.currency)}
                            </span>
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
