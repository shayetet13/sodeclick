import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { membershipAPI, membershipHelpers } from '../services/membershipAPI'
import { useToast } from './ui/toast'
import { 
  Crown, 
  Coins, 
  Gift, 
  MessageCircle, 
  Image, 
  Video, 
  RefreshCw, 
  TrendingUp,
  Calendar,
  Star,
  Vote,
  Zap,
  Award,
  Timer
} from 'lucide-react'

const MembershipDashboard = ({ userId }) => {
  const [membershipData, setMembershipData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const { success, error: showError, ToastContainer } = useToast()

  // ดึงข้อมูลสมาชิก
  const fetchMembershipData = async () => {
    if (!userId) {
      setLoading(false)
      setError('กรุณาเข้าสู่ระบบก่อน')
      return
    }

    try {
      setLoading(true)
      const response = await membershipAPI.getUserMembership(userId)
      setMembershipData(response.data.data)
      
             // Debug: แสดงข้อมูลที่ได้รับ (เฉพาะเมื่อต้องการ debug)
       // console.log('🔍 Frontend Debug - Membership Data:', response.data.data)
      
      setError(null)
    } catch (err) {
      console.error('Error fetching membership data:', err)
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลสมาชิกได้')
    } finally {
      setLoading(false)
    }
  }

  // รับโบนัสรายวัน
  const claimDailyBonus = async () => {
    try {
      setActionLoading(prev => ({ ...prev, dailyBonus: true }))
      const response = await membershipAPI.claimDailyBonus(userId)
      
      // อัพเดตข้อมูลใหม่
      await fetchMembershipData()
      
      // แสดงข้อความสำเร็จ
      success(`ได้รับโบนัส ${response.data.data.bonusAmount} เหรียญแล้ว!`)
    } catch (err) {
      console.error('Error claiming daily bonus:', err)
      showError(err.response?.data?.message || 'ไม่สามารถรับโบนัสได้')
    } finally {
      setActionLoading(prev => ({ ...prev, dailyBonus: false }))
    }
  }

  // หมุนวงล้อของขวัญ
  const spinWheel = async () => {
    try {
      setActionLoading(prev => ({ ...prev, spinWheel: true }))
      const response = await membershipAPI.spinWheel(userId)
      
      // อัพเดตข้อมูลใหม่
      await fetchMembershipData()
      
      // แสดงรางวัลที่ได้
      const prize = response.data.data.prize
      let message = ''
      
      if (prize.type === 'coins') {
        message = `ยินดีด้วย! ได้รับ ${prize.amount} เหรียญ! 🎉`
      } else if (prize.type === 'votePoints') {
        message = `ยินดีด้วย! ได้รับ ${prize.amount} คะแนนโหวต! 🎉`
      } else {
        message = `ยินดีด้วย! ได้รับ ${prize.name}! 🎉`
      }
      
      success(message)
    } catch (err) {
      console.error('Error spinning wheel:', err)
      showError(err.response?.data?.message || 'ไม่สามารถหมุนวงล้อได้')
    } finally {
      setActionLoading(prev => ({ ...prev, spinWheel: false }))
    }
  }

  // การนับถอยหลัง
  useEffect(() => {
    if (!membershipData?.membershipExpiry || membershipData?.membershipTier === 'member') {
      setTimeRemaining(membershipHelpers.getTimeRemaining(membershipData?.membershipExpiry, membershipData?.membershipTier))
      return
    }

    const updateTimeRemaining = () => {
      const result = membershipHelpers.getTimeRemainingDetailed(membershipData.membershipExpiry, membershipData.membershipTier)
      setTimeRemaining(result.text)
      
      // ถ้าหมดอายุแล้ว ให้รีเฟรชข้อมูล
      if (result.isExpired) {
        fetchMembershipData()
      }
    }

    // อัพเดตทันที
    updateTimeRemaining()

    // อัพเดตทุกวินาที
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [membershipData?.membershipExpiry, membershipData?.membershipTier])

  useEffect(() => {
    fetchMembershipData()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-pink-500 mr-3" />
        <span className="text-lg text-slate-600">กำลังโหลดข้อมูลสมาชิก...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={fetchMembershipData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          ลองใหม่
        </Button>
      </div>
    )
  }

  const { membershipTier, membershipExpiry, coins, votePoints, dailyUsage, limits, isActive } = membershipData

  return (
    <div className="space-y-6">
      {/* Membership Status Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${membershipHelpers.getTierGradient(membershipTier)} flex items-center justify-center text-xl mr-4 shadow-lg`}>
              {membershipHelpers.getTierIcon(membershipTier)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                {membershipHelpers.getTierName(membershipTier)}
              </h2>
                             {(() => {
                 // ตรวจสอบการหมดอายุโดยตรงจากข้อมูล
                 const now = new Date();
                 const expiry = membershipExpiry ? new Date(membershipExpiry) : null;
                 const isExpired = expiry && now >= expiry;
                 
                 // Debug: แสดงข้อมูลการคำนวณ (เฉพาะเมื่อต้องการ debug)
                 // console.log('🔍 Frontend Debug - Expiry Check:', { now: now.toISOString(), expiry: expiry?.toISOString(), isExpired, tier: membershipTier });
                 
                 if (membershipTier === 'member') {
                   // กรณี Member ฟรี
                   return (
                     <>
                       <div className="flex items-center text-slate-600">
                         <Calendar className="h-4 w-4 mr-1" />
                         <span className="font-mono">
                           ไม่มีวันหมดอายุ
                         </span>
                       </div>
                       <div className="text-sm text-slate-500 mt-1">
                         ระยะเวลา: {membershipHelpers.getMembershipDuration(membershipTier)}
                       </div>
                     </>
                   );
                 } else if (isExpired) {
                   // กรณีหมดอายุแล้ว - แสดงเตือนและเปลี่ยนเป็น member
                   return (
                     <>
                       <div className="flex items-center text-red-600">
                         <Calendar className="h-4 w-4 mr-1" />
                         <span className="font-mono font-semibold">
                           หมดอายุแล้ว
                         </span>
                       </div>
                       <div className="text-sm text-red-500 mt-1">
                         สมาชิกหมดอายุแล้ว - เปลี่ยนเป็น Member ธรรมดา
                       </div>
                     </>
                   );
                 } else {
                   // กรณี Premium Member ที่ยังไม่หมดอายุ - แสดงเฉพาะจำนวนวันที่เหลือ
                   return (
                     <>
                       <div className="flex items-center text-slate-600">
                         <Calendar className="h-4 w-4 mr-1" />
                         <span className="font-mono">
                           {timeRemaining || membershipHelpers.getTimeRemaining(membershipExpiry, membershipTier)}
                         </span>
                       </div>
                     </>
                   );
                 }
               })()}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isActive ? '✓ ใช้งานได้' : '✗ หมดอายุ'}
            </div>
          </div>
        </div>

        {/* Coins and Points */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Coins className="h-5 w-5 text-amber-600 mr-2" />
                <span className="text-slate-700 font-medium">เหรียญ</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">
                {membershipHelpers.formatCoins(coins)}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Vote className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-slate-700 font-medium">คะแนนโหวต</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {votePoints.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={claimDailyBonus}
            disabled={actionLoading.dailyBonus || !membershipData.canClaimDailyBonus}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            {actionLoading.dailyBonus ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Gift className="h-4 w-4 mr-2" />
            )}
            {membershipData.canClaimDailyBonus ? `รับโบนัส ${limits.dailyBonus}` : 'รอ 24 ชม.'}
          </Button>
          
          <Button
            onClick={spinWheel}
            disabled={actionLoading.spinWheel || !membershipData.canSpinWheel}
            variant="outline"
            className="border-pink-200 text-pink-700 hover:bg-pink-50"
          >
            {actionLoading.spinWheel ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {membershipData.canSpinWheel ? 'หมุนวงล้อ' : 'รอ 24 ชม.'}
          </Button>
        </div>

        {/* Timer Display */}
        {(!membershipData.canClaimDailyBonus || !membershipData.canSpinWheel) && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center text-sm text-yellow-800">
              <Timer className="h-4 w-4 mr-2" />
              <span>
                {!membershipData.canClaimDailyBonus && !membershipData.canSpinWheel 
                  ? 'รอ 24 ชั่วโมงเพื่อรับโบนัสและหมุนวงล้ออีกครั้ง'
                  : !membershipData.canClaimDailyBonus 
                    ? 'รอ 24 ชั่วโมงเพื่อรับโบนัสอีกครั้ง'
                    : 'รอ 24 ชั่วโมงเพื่อหมุนวงล้ออีกครั้ง'
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Daily Usage Stats */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
          การใช้งานวันนี้
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chat Usage */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-slate-700 text-sm">แชท</span>
              </div>
              <span className="text-xs text-slate-500">
                {limits.dailyChats === -1 ? 'ไม่จำกัด' : `${dailyUsage.chatCount}/${limits.dailyChats}`}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: limits.dailyChats === -1 ? '0%' : `${Math.min((dailyUsage.chatCount / limits.dailyChats) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Image Upload Usage */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Image className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-slate-700 text-sm">รูปภาพ</span>
              </div>
              <span className="text-xs text-slate-500">
                {limits.dailyImages === -1 ? 'ไม่จำกัด' : `${dailyUsage.imageUploadCount}/${limits.dailyImages}`}
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: limits.dailyImages === -1 ? '0%' : `${Math.min((dailyUsage.imageUploadCount / limits.dailyImages) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* Video Upload Usage */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Video className="h-4 w-4 text-purple-600 mr-2" />
                <span className="text-slate-700 text-sm">วิดีโอ</span>
              </div>
              <span className="text-xs text-slate-500">
                {limits.dailyVideos === -1 ? 'ไม่จำกัด' : `${dailyUsage.videoUploadCount}/${limits.dailyVideos}`}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: limits.dailyVideos === -1 ? '0%' : `${Math.min((dailyUsage.videoUploadCount / limits.dailyVideos) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Membership Benefits */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-yellow-500" />
          สิทธิประโยชน์ของคุณ
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm text-slate-700">แชทรายวัน</div>
            <div className="font-bold text-blue-600">
              {limits.dailyChats === -1 ? 'ไม่จำกัด' : `${limits.dailyChats} คน`}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <Image className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm text-slate-700">อัพโหลดรูป</div>
            <div className="font-bold text-green-600">
              {limits.dailyImages === -1 ? 'ไม่จำกัด' : `${limits.dailyImages} รูป`}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <Video className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-sm text-slate-700">อัพโหลดวิดีโอ</div>
            <div className="font-bold text-purple-600">
              {limits.dailyVideos === -1 ? 'ไม่จำกัด' : `${limits.dailyVideos} คลิป`}
            </div>
          </div>
          
                     <div className="text-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
             <Gift className="h-8 w-8 text-amber-600 mx-auto mb-2" />
             <div className="text-sm text-slate-700">หมุนวงล้อ</div>
             <div className="font-bold text-amber-600">
               {(() => {
                 const spinInterval = limits.spinInterval;
                 if (spinInterval === -1) return 'ไม่จำกัด';
                 const hours = Math.floor(spinInterval / (1000 * 60 * 60));
                 const minutes = Math.floor((spinInterval % (1000 * 60 * 60)) / (1000 * 60));
                 if (hours > 0) {
                   return minutes > 0 ? `ทุก ${hours} ชม ${minutes} นาที` : `ทุก ${hours} ชม`;
                 } else {
                   return `ทุก ${minutes} นาที`;
                 }
               })()}
             </div>
           </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default MembershipDashboard
