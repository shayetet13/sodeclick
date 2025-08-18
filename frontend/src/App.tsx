import { useState, useEffect } from 'react'
import { Button } from './components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, VisuallyHidden } from './components/ui/dialog'
import MembershipDashboard from './components/MembershipDashboard'
import MembershipPlans from './components/MembershipPlans'
import PaymentGateway from './components/PaymentGateway'
import PaymentSuccess from './components/PaymentSuccess'
import LoginModal from './components/LoginModal'
import UserProfile from './components/UserProfile'
import ChatRoomList from './components/ChatRoomList'
import RealTimeChat from './components/RealTimeChat'
import CreatePrivateRoomModal from './components/CreatePrivateRoomModal'
import AIMatchingSystem from './components/AIMatchingSystem'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './components/ui/toast'
import { 
  Heart, 
  Search, 
  MessageCircle, 
  User, 
  Settings, 
  LogIn, 
  ChevronRight, 
  Filter, 
  MapPin, 
  Calendar, 
  Coffee, 
  Utensils, 
  Music, 
  Film, 
  BookOpen, 
  Mountain,
  Star,
  Sparkles,
  Zap,
  Camera,
  Shield,
  Gift,
  TrendingUp,
  MessageSquare,
  Video,
  Gift as GiftIcon,
  Clock,
  CheckCircle,
  X,
  ArrowLeft,
  Users,
  Crown
} from 'lucide-react'

type PublicUser = {
  _id?: string
  firstName?: string
  lastName?: string
  nickname?: string
  age?: number
  location?: string
  profileImages?: string[]
  bio?: string
  interests?: any[]
  membership?: { tier?: string }
}

type FeaturedProfile = {
  id?: string | number
  name: string
  age?: number
  location?: string
  distance?: string
  bio?: string
  interests: string[]
  images: string[]
  verified?: boolean
  online?: boolean
  lastActive?: string
  height?: string
  education?: string
  job?: string
  lifestyle?: string
  lookingFor?: string
  languages?: string[]
  personality?: string
}

// Sample profile data
const profiles: FeaturedProfile[] = [
  {
    id: 1,
    name: 'Sophie',
    age: 28,
    location: 'Bangkok',
    distance: '3 km',
    bio: 'Coffee enthusiast, book lover, and adventure seeker. Looking for someone who enjoys meaningful conversations and creating lasting memories together.',
    interests: ['Reading', 'Coffee', 'Travel', 'Hiking', 'Photography'],
    images: [
      'https://placehold.co/500x600/6366f1/ffffff?text=Sophie',
      'https://placehold.co/500x600/8b5cf6/ffffff?text=Sophie+Travel',
      'https://placehold.co/500x600/06b6d4/ffffff?text=Sophie+Coffee',
      'https://placehold.co/500x600/10b981/ffffff?text=Sophie+Books'
    ],
    verified: true,
    online: true,
    lastActive: 'Online now',
    height: "5'6\"",
    education: 'Master\'s Degree',
    job: 'Graphic Designer',
    lifestyle: 'Non-smoker, occasional drinker',
    lookingFor: 'Long-term relationship',
    languages: ['English', 'Thai'],
    personality: 'Introverted but social when comfortable'
  },
  {
    id: 2,
    name: 'Alex',
    age: 31,
    location: 'Bangkok',
    distance: '5 km',
    bio: 'Photographer and foodie. Let\'s explore new restaurants and capture beautiful moments together. Passionate about art, music, and creating authentic experiences.',
    interests: ['Photography', 'Food', 'Art', 'Music', 'Concerts'],
    images: [
      'https://placehold.co/500x600/8b5cf6/ffffff?text=Alex',
      'https://placehold.co/500x600/6366f1/ffffff?text=Alex+Photos',
      'https://placehold.co/500x600/06b6d4/ffffff?text=Alex+Food',
      'https://placehold.co/500x600/10b981/ffffff?text=Alex+Concert'
    ],
    verified: true,
    online: false,
    lastActive: '2 hours ago',
    height: "5'11\"",
    education: 'Bachelor\'s Degree',
    job: 'Professional Photographer',
    lifestyle: 'Non-smoker, enjoys wine',
    lookingFor: 'Serious relationship',
    languages: ['English', 'Spanish'],
    personality: 'Extroverted and adventurous'
  },
  {
    id: 3,
    name: 'Emma',
    age: 26,
    location: 'Bangkok',
    distance: '7 km',
    bio: 'Yoga instructor and plant mom. Seeking someone with positive energy and an open mind. Let\'s grow together, both literally and figuratively.',
    interests: ['Yoga', 'Plants', 'Meditation', 'Cooking', 'Nature'],
    images: [
      'https://placehold.co/500x600/06b6d4/ffffff?text=Emma',
      'https://placehold.co/500x600/8b5cf6/ffffff?text=Emma+Yoga',
      'https://placehold.co/500x600/6366f1/ffffff?text=Emma+Plants',
      'https://placehold.co/500x600/10b981/ffffff?text=Emma+Cooking'
    ],
    verified: true,
    online: true,
    lastActive: 'Online now',
    height: "5'4\"",
    education: 'Certified Yoga Instructor',
    job: 'Wellness Coach',
    lifestyle: 'Vegetarian, non-smoker',
    lookingFor: 'Meaningful connection',
    languages: ['English', 'Mandarin'],
    personality: 'Calm and empathetic'
  },
  {
    id: 4,
    name: 'Daniel',
    age: 30,
    location: 'Bangkok',
    distance: '4 km',
    bio: 'Software engineer by day, musician by night. Looking for someone to share both quiet evenings and concert adventures. Let\'s create our own soundtrack.',
    interests: ['Music', 'Technology', 'Concerts', 'Gaming', 'Coding'],
    images: [
      'https://placehold.co/500x600/10b981/ffffff?text=Daniel',
      'https://placehold.co/500x600/6366f1/ffffff?text=Daniel+Music',
      'https://placehold.co/500x600/8b5cf6/ffffff?text=Daniel+Tech',
      'https://placehold.co/500x600/06b6d4/ffffff?text=Daniel+Gaming'
    ],
    verified: true,
    online: false,
    lastActive: '5 hours ago',
    height: "6'0\"",
    education: 'Computer Science Degree',
    job: 'Senior Developer',
    lifestyle: 'Occasional drinker, non-smoker',
    lookingFor: 'Relationship with growth potential',
    languages: ['English', 'Japanese'],
    personality: 'Thoughtful and analytical'
  },
  {
    id: 5,
    name: 'Lily',
    age: 27,
    location: 'Bangkok',
    distance: '6 km',
    bio: 'Art lover and coffee connoisseur. Let\'s create beautiful memories together. I believe every day is an opportunity for inspiration and connection.',
    interests: ['Art', 'Coffee', 'Music', 'Travel', 'Painting'],
    images: [
      'https://placehold.co/500x600/f59e0b/ffffff?text=Lily',
      'https://placehold.co/500x600/6366f1/ffffff?text=Lily+Art',
      'https://placehold.co/500x600/8b5cf6/ffffff?text=Lily+Coffee',
      'https://placehold.co/500x600/06b6d4/ffffff?text=Lily+Travel'
    ],
    verified: true,
    online: true,
    lastActive: 'Online now',
    height: "5'5\"",
    education: 'Fine Arts Degree',
    job: 'Gallery Curator',
    lifestyle: 'Non-smoker, enjoys craft coffee',
    lookingFor: 'Creative partnership',
    languages: ['English', 'French'],
    personality: 'Expressive and intuitive'
  },
  {
    id: 6,
    name: 'James',
    age: 32,
    location: 'Bangkok',
    distance: '8 km',
    bio: 'Adventure seeker and food explorer. Looking for someone to share life\'s journeys with. Let\'s make every meal an adventure and every weekend a discovery.',
    interests: ['Adventure', 'Food', 'Travel', 'Photography', 'Scuba Diving'],
    images: [
      'https://placehold.co/500x600/ef4444/ffffff?text=James',
      'https://placehold.co/500x600/6366f1/ffffff?text=James+Adventure',
      'https://placehold.co/500x600/8b5cf6/ffffff?text=James+Food',
      'https://placehold.co/500x600/06b6d4/ffffff?text=James+Diving'
    ],
    verified: true,
    online: false,
    lastActive: '1 day ago',
    height: "6'2\"",
    education: 'Tourism Management',
    job: 'Travel Blogger',
    lifestyle: 'Non-smoker, occasional drinker',
    lookingFor: 'Adventure partner for life',
    languages: ['English', 'German'],
    personality: 'Bold and spontaneous'
  }
]

// Sample messages
const messages = [
  {
    id: 1,
    name: 'Sophie',
    avatar: 'https://placehold.co/200x200/6366f1/ffffff?text=S',
    lastMessage: 'Would you like to meet for coffee this weekend?',
    time: '15m',
    unread: true,
    online: true
  },
  {
    id: 2,
    name: 'Alex',
    avatar: 'https://placehold.co/200x200/8b5cf6/ffffff?text=A',
    lastMessage: 'That restaurant sounds amazing! I\'d love to try it.',
    time: '2h',
    unread: false,
    online: false
  },
  {
    id: 3,
    name: 'Emma',
    avatar: 'https://placehold.co/200x200/06b6d4/ffffff?text=E',
    lastMessage: 'Thanks for the yoga class recommendation!',
    time: '1d',
    unread: false,
    online: true
  },
  {
    id: 4,
    name: 'Daniel',
    avatar: 'https://placehold.co/200x200/10b981/ffffff?text=D',
    lastMessage: 'Let\'s plan our next adventure!',
    time: '3h',
    unread: false,
    online: false
  }
]

function App() {
  const { user, login, logout, loading } = useAuth()
  const { ToastContainer } = useToast()
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'messages' | 'membership' | 'profile'>('discover')
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<FeaturedProfile | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [premiumUsers, setPremiumUsers] = useState<PublicUser[]>([])
  const [isLoadingPremium, setIsLoadingPremium] = useState(false)
  const premiumTierOrder = ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver']
  
  // Payment flow states
  const [currentView, setCurrentView] = useState<'main' | 'payment' | 'success'>('main') // 'main', 'payment', 'success'
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [transactionData, setTransactionData] = useState<any>(null)
  
  // Chat states
  const [chatView, setChatView] = useState<'list' | 'chat'>('list') // 'list', 'chat'
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  
  // Top voted profiles - ใช้ profiles ที่มี voteCount สูงสุด
  const [topVotedProfiles] = useState(() => {
    return profiles
      .map(profile => ({
        ...profile,
        voteCount: Math.floor(Math.random() * 1000) + 100 // สุ่ม vote count สำหรับ demo
      }))
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, 5) // เก็บ top 5
  })
  
  // Check authentication on mount
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
  }, [user])

  // Load Premium Members for Discover tab (from backend only)
  useEffect(() => {
    let isCancelled = false
    const loadPremium = async () => {
      try {
        setIsLoadingPremium(true)
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
        const res = await fetch(`${base}/api/profile/premium?limit=20`, {
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
          }
        })
        if (!res.ok) return
        const data = await res.json()
        const users: PublicUser[] = data?.data?.users || []
        // Ensure final ordering and cap
        const sorted = users
          .sort((a: PublicUser, b: PublicUser) => {
            const ai = premiumTierOrder.indexOf((a?.membership?.tier || '') as string)
            const bi = premiumTierOrder.indexOf((b?.membership?.tier || '') as string)
            return ai - bi
          })
          .slice(0, 20)
        if (!isCancelled) setPremiumUsers(sorted)
      } catch (_) {
        // ignore errors for this section
      } finally {
        if (!isCancelled) setIsLoadingPremium(false)
      }
    }
    loadPremium()
    return () => { isCancelled = true }
  }, [])
  
  // Load user profile image for header avatar
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        if (user?._id) {
          const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
          const res = await fetch(`${base}/api/profile/${user._id}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
            }
          })
          if (res.ok) {
            const data = await res.json()
            const img = (data?.data?.profile?.profileImages?.[0] as string | undefined) || ''
            const assetsBase = base.replace(/\/api$/, '')
            setAvatarUrl(img ? `${assetsBase}/uploads/profiles/${img}` : null)
            if (img) return
          }
        }
      } catch (_) {
        // ignore
      }
      setAvatarUrl(null)
    }
    if (isAuthenticated) {
      loadAvatar()
    } else {
      setAvatarUrl(null)
    }
  }, [isAuthenticated, user])
  
  // ฟัง event เมื่อมีการตั้งรูปโปรไฟล์ใหม่ เพื่อรีโหลด avatar ใน header
  useEffect(() => {
    const handler = () => {
      // Trigger a reload of avatar
      if (user?._id) {
        // reuse loader without duplicating code by toggling state
        (async () => {
          try {
            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
            const res = await fetch(`${base}/api/profile/${user._id}`, {
              headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
              }
            })
            if (res.ok) {
              const data = await res.json()
              const img = data?.data?.profile?.profileImages?.[0]
              if (img) {
                const assetsBase = base.replace(/\/api$/, '')
                setAvatarUrl(`${assetsBase}/uploads/profiles/${img}`)
                return
              }
            }
          } catch (_) {}
          setAvatarUrl(null)
        })()
      }
    }
    window.addEventListener('profile-avatar-updated', handler)
    return () => window.removeEventListener('profile-avatar-updated', handler)
  }, [user])
  
  const handleLoginSuccess = (data: any) => {
    // data includes { user, token }; pass through so token is preserved
    login(data)
    setIsAuthenticated(true)
    setShowLoginDialog(false)
  }
  
  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
  }
  
  const openProfileModal = (profile: FeaturedProfile) => {
    setSelectedProfile(profile)
    setActiveImageIndex(0)
    setShowProfileModal(true)
  }
  
  // Payment flow handlers
  const handleNavigateToPayment = (plan: any) => {
    setSelectedPlan(plan)
    setCurrentView('payment')
  }
  
  const handlePaymentSuccess = async (transactionData: any) => {
    setTransactionData(transactionData)
    setCurrentView('success')
    // Call actual upgrade API
    try {
      const { membershipAPI } = await import('./services/membershipAPI')
      await membershipAPI.upgradeMembership({
        userId: user._id,
        tier: transactionData.tier,
        paymentMethod: transactionData.paymentMethod,
        transactionId: transactionData.transactionId,
        amount: transactionData.amount,
        currency: transactionData.currency
      })
    } catch (error) {
      console.error('Error upgrading membership:', error)
    }
  }
  
  const handleBackToMain = () => {
    setCurrentView('main')
    setSelectedPlan(null)
    setTransactionData(null)
    setActiveTab('membership') // กลับไปที่ membership tab
  }
  
  // Set up global payment navigation
  useEffect(() => {
    ;(window as any).navigateToPayment = handleNavigateToPayment
    const handlePaymentEvent = (event: any) => {
      handleNavigateToPayment(event.detail.plan)
    }
    window.addEventListener('navigateToPayment', handlePaymentEvent)
    return () => {
      window.removeEventListener('navigateToPayment', handlePaymentEvent)
      delete (window as any).navigateToPayment
    }
  }, [])
  
  // Chat handlers
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId)
    setChatView('chat')
  }
  
  const handleBackToRoomList = () => {
    setChatView('list')
    setSelectedRoomId(null)
  }
  
  const handleCreatePrivateRoom = (newRoom: any) => {
    // รีเฟรชรายการห้องแชทหลังจากสร้างห้องใหม่
    setChatView('list')
    setSelectedRoomId(null)
    // อาจจะต้องรีเฟรชข้อมูลห้องแชทที่นี่
  }
  
  // Render different views based on current state
  if (currentView === 'payment' && selectedPlan) {
    return (
      <PaymentGateway
        plan={selectedPlan}
        onBack={handleBackToMain}
        onSuccess={handlePaymentSuccess}
        onCancel={handleBackToMain}
      />
    )
  }
  
  if (currentView === 'success' && transactionData && selectedPlan) {
    return (
      <PaymentSuccess
        transactionData={transactionData}
        plan={selectedPlan}
        onContinue={handleBackToMain}
      />
    )
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Modern Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-pink-300/20 to-violet-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-80 h-80 bg-gradient-to-br from-blue-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-60 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-300/25 to-indigo-300/25 rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>
      {/* Modern Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 text-4xl opacity-20 animate-float">✨</div>
        <div className="absolute top-1/3 right-1/4 text-5xl opacity-15 animate-float delay-1000">💫</div>
        <div className="absolute bottom-1/3 left-1/3 text-6xl opacity-10 animate-float delay-2000">🌟</div>
        <div className="absolute bottom-1/4 right-1/3 text-3xl opacity-25 animate-float delay-3000">💖</div>
        <div className="absolute top-1/2 left-1/6 text-4xl opacity-20 animate-float delay-4000">🎉</div>
        <div className="absolute top-3/4 right-1/6 text-5xl opacity-15 animate-float delay-5000">🌈</div>
      </div>
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b border-white/30 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg heart-beat">
                <Heart className="h-6 w-6 text-white" fill="white" />
              </div>
              <div>
                <span className="text-2xl font-bold gradient-text">sodeclick</span>
                <div className="text-xs text-gray-600 -mt-1">Find Your Love ✨</div>
              </div>
            </div>
            <div className="hidden md:flex space-x-1">
              {!isAuthenticated ? (
                <>
                  <Button
                    onClick={() => setShowLoginDialog(true)}
                    className="modern-button"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    เข้าสู่ระบบ
                  </Button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} alt="profile" />
                      <AvatarFallback>{user?.firstName?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">สวัสดี, {user?.displayName || user?.firstName}</span>
                  </div>
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = '/admin'}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Admin
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout} 
                    className="border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300 transition-colors"
                  >
                    ออกจากระบบ
                  </Button>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => !isAuthenticated ? setShowLoginDialog(true) : handleLogout()}>
              <LogIn className="h-5 w-5 text-slate-600" />
            </Button>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-6 py-3 rounded-full glass-effect border border-white/30 text-pink-600 text-sm font-semibold shadow-lg">
                <Sparkles className="h-4 w-4 mr-2" />
                <span>Thailand's #1 Dating Platform 🇹🇭</span>
              </div>
              <div>
                <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-8 gradient-text">
                  Find Your<br />
                  Perfect Match ✨
                </h1>
                <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg">
                  Join thousands of verified singles creating meaningful connections. Your love story starts here.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                <Button 
                  size="lg" 
                  onClick={() => setShowLoginDialog(true)}
                  className="modern-button text-lg px-10 py-6 rounded-2xl font-bold shadow-2xl hover:shadow-pink-300/50 hover:scale-105 transform transition-all duration-300"
                >
                  <Heart className="h-6 w-6 mr-3" fill="white" />
                  Start Dating Now
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-pink-300/50 text-pink-600 hover:bg-pink-50/80 px-10 py-6 rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-105 glass-effect"
                >
                  <MessageCircle className="h-6 w-6 mr-3" />
                  Learn More
                </Button>
              </div>
            </div>
            {/* 
              สลับรูป user ที่ถูกโหวตเยอะที่สุดแบบเรียลไทม์ 
              - แสดง 2 อันดับแรก (top 2 voted)
              - ถ้ามีการเปลี่ยนแปลงอันดับ เรียลไทม์จะอัปเดตทันที
            */}
            <div className="relative hidden md:flex justify-end items-center">
              <div className="relative w-[340px] h-[340px]">
                {topVotedProfiles.slice(0, 2).map((profile, idx) => (
                  <div
                    key={profile.id}
                    className={
                      "absolute " +
                      (idx === 0
                        ? "top-0 right-0 z-20 rotate-3"
                        : "bottom-0 left-8 z-10 -rotate-3 border-4 border-white") +
                      " w-64 h-80 rounded-3xl overflow-hidden shadow-2xl transition-all duration-700"
                    }
                    style={{
                      // เพิ่ม transition effect เวลาสลับ
                      transition: "all 0.7s cubic-bezier(.4,2,.6,1)",
                    }}
                  >
                    <img
                      src={profile.images?.[0] || "https://placehold.co/500x600?text=Profile"}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Badge โหวต */}
                    <div className="absolute bottom-3 right-3 bg-white/80 px-3 py-1 rounded-full text-xs font-medium text-pink-600 shadow">
                      ❤️ {profile.voteCount ?? 0} votes
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* App Interface */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-10">
        <div className="modern-card rounded-3xl shadow-2xl overflow-hidden">
          <Tabs defaultValue="discover" value={activeTab} onValueChange={setActiveTab}>
            <div className="glass-effect border-b border-white/30">
              <TabsList className="w-full justify-between bg-transparent h-20 p-0">
                <TabsTrigger 
                  value="discover" 
                  className="flex-1 h-full data-[state=active]:bg-white/90 data-[state=active]:shadow-lg data-[state=active]:border-b-4 data-[state=active]:border-pink-500 rounded-none text-gray-600 data-[state=active]:text-pink-600 transition-all duration-300 font-semibold hover:bg-white/50"
                >
                  <Search className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Discover</span> ✨
                </TabsTrigger>
                <TabsTrigger 
                  value="matches" 
                  className="flex-1 h-full data-[state=active]:bg-white/90 data-[state=active]:shadow-lg data-[state=active]:border-b-4 data-[state=active]:border-pink-500 rounded-none text-gray-600 data-[state=active]:text-pink-600 transition-all duration-300 font-semibold hover:bg-white/50"
                >
                  <Heart className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Matches</span> 💕
                </TabsTrigger>
                <TabsTrigger 
                  value="messages" 
                  className="flex-1 h-full data-[state=active]:bg-white/90 data-[state=active]:shadow-lg data-[state=active]:border-b-4 data-[state=active]:border-pink-500 rounded-none text-gray-600 data-[state=active]:text-pink-600 transition-all duration-300 font-semibold hover:bg-white/50"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Messages</span> 💬
                </TabsTrigger>
                <TabsTrigger 
                  value="membership" 
                  className="flex-1 h-full data-[state=active]:bg-white/90 data-[state=active]:shadow-lg data-[state=active]:border-b-4 data-[state=active]:border-pink-500 rounded-none text-gray-600 data-[state=active]:text-pink-600 transition-all duration-300 font-semibold hover:bg-white/50"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Premium</span> ⭐
                </TabsTrigger>
                <TabsTrigger 
                  value="profile" 
                  className="flex-1 h-full data-[state=active]:bg-white/90 data-[state=active]:shadow-lg data-[state=active]:border-b-4 data-[state=active]:border-pink-500 rounded-none text-gray-600 data-[state=active]:text-pink-600 transition-all duration-300 font-semibold hover:bg-white/50"
                >
                  <User className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Profile</span> 👤
                </TabsTrigger>
              </TabsList>
            </div>
            {/* Discover Tab */}
            <TabsContent value="discover" className="p-8">
              <div className="flex justify-end items-center mb-10">
                <Button variant="outline" size="lg" className="gap-3 border-pink-200 hover:border-pink-300 text-pink-600 hover:text-pink-700 hover:bg-pink-50 transition-all duration-300 px-6 py-3 rounded-xl font-semibold">
                  <Filter className="h-5 w-5" />
                  Filters
                </Button>
              </div>
              {/* Premium Member Exclusive */}
              <div className="mb-10">
                <div className="mb-6">
                  <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-pink-500 to-violet-600 bg-clip-text text-transparent flex items-center">
                    Premium Member Exclusive
                    <Crown className="h-7 w-7 md:h-8 md:w-8 ml-3 text-amber-500" />
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mt-2">สมาชิกระดับพรีเมียมคัดสรร • เรียงตามระดับสมาชิก</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                  {premiumUsers.map((u: PublicUser, idx: number) => {
                    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
                    const assetsBase = apiBase.replace(/\/api$/, '')
                    const firstImage = u?.profileImages?.[0]
                    const imageUrl = firstImage ? `${assetsBase}/uploads/profiles/${firstImage}` : 'https://placehold.co/500x600/ffd166/1f2937?text=Premium+Member'
                    const displayName = u?.nickname || u?.firstName || u?.lastName || 'Premium User'
                    const tier: string = (u?.membership?.tier || 'member') as string
                    const tierColors: Record<string, string> = {
                      platinum: 'from-purple-500 to-pink-500',
                      diamond: 'from-blue-500 to-cyan-500',
                      vip2: 'from-red-500 to-orange-500',
                      vip1: 'from-orange-500 to-yellow-500',
                      vip: 'from-purple-400 to-pink-400',
                      gold: 'from-yellow-500 to-amber-500',
                      silver: 'from-gray-400 to-slate-400'
                    }
                    const badgeGradient = tierColors[tier] || 'from-gray-300 to-gray-400'
                    return (
                      <div
                        key={u._id || idx}
                        className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group"
                        onClick={() => {
                          const modalProfile: FeaturedProfile = {
                            id: u._id,
                            name: displayName,
                            age: u?.age,
                            location: u?.location || 'Thailand',
                            distance: 'Premium',
                            bio: u?.bio || '',
                            interests: Array.isArray(u?.interests)
                              ? u.interests.map((it: any) => it?.category || it?.name || `${it}`).filter(Boolean)
                              : [],
                            images: (u?.profileImages || []).map((img: string) => `${assetsBase}/uploads/profiles/${img}`),
                            verified: false,
                            online: false,
                            lastActive: ''
                          }
                          openProfileModal(modalProfile)
                        }}
                      >
                        <div className="h-72 overflow-hidden relative">
                          <img
                            src={imageUrl}
                            alt={displayName}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          <div className="absolute top-4 left-4">
                            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${badgeGradient} shadow-xl border border-white/10`}>{tier.toUpperCase()}</div>
                          </div>
                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <div className="flex justify-between items-end">
                              <div>
                                <h3 className="text-xl font-bold">{displayName}{u?.age ? `, ${u.age}` : ''}</h3>
                                {u?.location && (
                                  <div className="flex items-center text-white/90 text-sm">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    <span>{u.location}</span>
                                  </div>
                                )}
                              </div>
                              <Button size="icon" variant="ghost" className="rounded-full text-white hover:text-pink-300 hover:bg-white/20 transition-all duration-300">
                                <Heart className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Discover Amazing People */}
              <div className="flex justify-between items-center mb-6 mt-12">
                <div>
                  <h2 className="text-3xl font-bold gradient-text mb-2">Discover Amazing People ✨</h2>
                  <p className="text-gray-600">Find your perfect match from verified singles</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {profiles.map(profile => (
                  <div key={profile.id} className="modern-card rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer group floating-hearts" onClick={() => openProfileModal(profile)}>
                    <div className="h-72 overflow-hidden relative">
                      <img 
                        src={profile.images[0]} 
                        alt={profile.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      {profile.verified && (
                        <div className="absolute top-4 left-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl">
                            <CheckCircle className="h-5 w-5 text-white" fill="white" />
                          </div>
                        </div>
                      )}
                      {profile.online && (
                        <div className="absolute top-4 right-4">
                          <div className="w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-xl font-bold">{profile.name}, {profile.age}</h3>
                            <div className="flex items-center text-white/90 text-sm">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{profile.location} • {profile.distance}</span>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="rounded-full text-white hover:text-pink-300 hover:bg-white/20 transition-all duration-300 heart-beat hover:scale-110">
                            <Heart className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4 leading-relaxed">{profile.bio}</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.slice(0, 3).map((interest, i) => (
                          <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-pink-700 rounded-full text-xs font-semibold hover:from-pink-200 hover:to-violet-200 transition-all duration-300 shadow-sm">
                            {interest}
                          </span>
                        ))}
                        {profile.interests.length > 3 && (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                            +{profile.interests.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            {/* Matches Tab */}
            <TabsContent value="matches" className="p-6">
              {!isAuthenticated ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบเพื่อใช้งาน AI Matching</p>
                  <Button onClick={() => setShowLoginDialog(true)}>
                    เข้าสู่ระบบ
                  </Button>
                </div>
              ) : (
                <AIMatchingSystem currentUser={user} />
              )}
            </TabsContent>
            {/* Messages Tab */}
            <TabsContent value="messages" className="p-0">
              {!isAuthenticated ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบเพื่อใช้งานแชท</p>
                  <Button onClick={() => setShowLoginDialog(true)}>
                    เข้าสู่ระบบ
                  </Button>
                </div>
              ) : chatView === 'list' ? (
                <ChatRoomList
                  currentUser={user}
                  onSelectRoom={handleSelectRoom}
                  onCreatePrivateRoom={() => setShowCreateRoomModal(true)}
                />
              ) : (
                <RealTimeChat
                  roomId={selectedRoomId}
                  currentUser={user}
                  onBack={handleBackToRoomList}
                />
              )}
            </TabsContent>
            {/* Membership Tab */}
            <TabsContent value="membership" className="p-6">
              <div className="space-y-8">
                <MembershipDashboard userId={user?._id} />
                <div className="border-t border-slate-200 pt-8">
                  <MembershipPlans currentUserId={user?._id} currentTier="member" />
                </div>
              </div>
            </TabsContent>
            {/* Profile Tab */}
            <TabsContent value="profile" className="p-6">
              {isAuthenticated && user ? (
                <UserProfile
                  userId={user._id || user.id}
                  isOwnProfile={true}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์</p>
                  <Button onClick={() => setShowLoginDialog(true)}>
                    เข้าสู่ระบบ
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-violet-100 text-pink-700 text-sm font-medium mb-6">
              <Zap className="h-4 w-4 mr-2" />
              <span>Why Choose Us</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-light text-slate-800 mb-4">
              Find your perfect match with <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">sodeclick</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Experience dating with a beautifully designed platform that prioritizes meaningful connections and user experience.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Heart className="h-6 w-6 text-white" fill="white" />
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-3">Meaningful Connections</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our intelligent algorithm matches you with people who share your interests and values, creating authentic relationships that matter.
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-3">Verified Profiles</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                All profiles are verified for authenticity, ensuring a safe and trustworthy environment for genuine connections.
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-3">Date Planning</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Suggest and plan dates easily with our integrated tools and personalized local recommendations for memorable experiences.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-white/40 backdrop-blur-md border-t border-white/20 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-7 h-7 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" fill="white" />
              </div>
              <span className="text-xl font-light bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">sodeclick</span>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">About</a>
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">Privacy</a>
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">Terms</a>
              <a href="#" className="text-slate-500 hover:text-pink-500 transition-colors duration-200">Contact</a>
            </div>
          </div>
          <div className="mt-8 text-center md:text-left text-slate-400 text-sm">
            © {new Date().getFullYear()} sodeclick. All rights reserved.
          </div>
        </div>
      </footer>
      {/* Profile Modal */}
      {selectedProfile && (
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent className="sm:max-w-4xl bg-white/90 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-0 overflow-hidden">
            <VisuallyHidden>
              <DialogTitle>Profile of {selectedProfile.name}</DialogTitle>
              <DialogDescription>
                View detailed profile information for {selectedProfile.name}, age {selectedProfile.age} from {selectedProfile.location}
              </DialogDescription>
            </VisuallyHidden>
            <div className="flex flex-col md:flex-row h-[70vh] max-h-[80vh]">
              {/* Image Gallery */}
              <div className="md:w-1/2 relative">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="relative h-64 md:h-full">
                  <img
                    src={selectedProfile.images[activeImageIndex]}
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  {/* Profile Info Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <h3 className="text-2xl font-medium">{selectedProfile.name}, {selectedProfile.age}</h3>
                        <div className="flex items-center text-white/90">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{selectedProfile.location}</span>
                          <span className="mx-2">•</span>
                          <span>{selectedProfile.distance}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full text-white hover:text-pink-300 hover:bg-white/10"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full text-white hover:text-pink-300 hover:bg-white/10"
                        >
                          <Heart className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Image Indicators */}
                  {selectedProfile.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {selectedProfile.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Profile Details */}
              <div className="md:w-1/2 p-6 overflow-y-auto bg-white">
                <div className="flex items-center mb-4">
                  <h4 className="text-xl font-medium text-slate-800">{selectedProfile.name}</h4>
                  {selectedProfile.verified && (
                    <div className="ml-2 flex items-center text-blue-500 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" fill="currentColor" />
                      <span>Verified</span>
                    </div>
                  )}
                  {selectedProfile.online && (
                    <div className="ml-2 flex items-center text-green-500 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      <span>Online</span>
                    </div>
                  )}
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">{selectedProfile.bio}</p>
                {/* Quick Facts */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Height</div>
                    <div className="font-medium text-slate-800">{selectedProfile.height}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Education</div>
                    <div className="font-medium text-slate-800">{selectedProfile.education}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Occupation</div>
                    <div className="font-medium text-slate-800">{selectedProfile.job}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500">Looking for</div>
                    <div className="font-medium text-slate-800">{selectedProfile.lookingFor}</div>
                  </div>
                </div>
                {/* Interests */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-slate-800 mb-3 flex items-center">
                    <Heart className="h-4 w-4 mr-2 text-pink-500" />
                    Interests
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-full text-sm font-medium">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Lifestyle */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-slate-800 mb-3">Lifestyle</h5>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Coffee className="h-4 w-4 mr-2 text-slate-500" />
                      <span className="text-sm text-slate-700">{selectedProfile.lifestyle}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      <Clock className="h-4 w-4 mr-2 text-slate-500" />
                      <span className="text-sm text-slate-700">Last active: {selectedProfile.lastActive}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-slate-500">Languages:</span>
                      <div className="flex ml-2 space-x-2">
                        {(selectedProfile.languages || []).map((lang, i) => (
                          <span key={i} className="px-2 py-1 bg-white text-slate-600 rounded text-xs">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 border-slate-200 hover:bg-slate-50">
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      {/* Create Private Room Modal */}
      <CreatePrivateRoomModal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onCreateRoom={handleCreatePrivateRoom}
        currentUser={user}
      />
      <ToastContainer />
    </div>
  )
}

const AppWrapper = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );
};

export default AppWrapper