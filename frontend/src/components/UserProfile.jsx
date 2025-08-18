import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/toast';
import { membershipHelpers } from '../services/membershipAPI';
import { profileAPI, profileHelpers } from '../services/profileAPI';
import {
  User,
  Edit3,
  Camera,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
  MessageCircle,
  Star,
  Award,
  Crown,
  Upload,
  X,
  Plus,
  Save,
  Eye,
  EyeOff,
  Cigarette,
  Wine,
  Dumbbell,
  Utensils,
  Clock,
  Plane,
  Baby,
  Dog,
  Languages,
  Church,
  Ruler,
  Weight,
  Sparkles,
  Music,
  Film,
  Gamepad2,
  Camera as CameraIcon,
  Book,
  Palette,
  Code,
  Mountain,
  Car,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const UserProfile = ({ userId, isOwnProfile = false }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [membershipData, setMembershipData] = useState(null);
  const { success, error: showError, ToastContainer } = useToast();

  // ฟังก์ชันคำนวณอายุจากวันเกิด
  const getAgeFromDate = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // ดึงข้อมูลโปรไฟล์
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getUserProfile(userId);
      
      if (response.success) {
        setProfile(response.data.profile);
        setEditData(response.data.profile);
        console.log('Profile loaded successfully:', response.data.profile);
      } else {
        console.error('Profile API returned error:', response);
        showError(response.message || 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      
      // จัดการ error ตามประเภท
      if (err.message.includes('403')) {
        showError('ไม่มีสิทธิ์เข้าถึงโปรไฟล์นี้');
      } else if (err.message.includes('404')) {
        showError('ไม่พบโปรไฟล์ผู้ใช้');
      } else {
        showError('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
      }
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลสมาชิก
  const fetchMembershipData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // เพิ่ม token ถ้ามี
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/user/${userId}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMembershipData(data.data);
        }
      } else {
        console.log('Membership data not available (may require login)');
      }
    } catch (err) {
      console.log('Error fetching membership data (non-critical):', err);
    }
  };

  // บันทึกข้อมูลโปรไฟล์
  const saveProfile = async () => {
    try {
      setSaving(true);
      
      console.log('saveProfile called');
      console.log('Current editData:', editData);
      console.log('Current profile:', profile);
      
      // ตรวจสอบ token ก่อน
      const token = localStorage.getItem('token');
      if (!token) {
        showError('กรุณาเข้าสู่ระบบใหม่');
        // Redirect ไปหน้า login
        window.location.href = '/';
        return;
      }
      
      const cleanData = {
        ...editData,
        // ทำความสะอาดข้อมูลก่อนส่ง
        education: editData.education || {},
        pets: editData.pets || {},
        lifestyle: editData.lifestyle || {},
        coordinates: editData.coordinates || { type: 'Point', coordinates: [0, 0] },
        membership: editData.membership || {}
      };
      
      console.log('Cleaned profile data:', cleanData);
      console.log('Religion field:', cleanData.religion);
      console.log('Languages field:', cleanData.languages);
      
      const response = await profileAPI.updateUserProfile(userId, cleanData);
      setProfile(response.data.profile);
      setEditData(response.data.profile);
      setEditMode(false);
      success('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // จัดการ error ตามประเภท
      if (err.message.includes('Session expired') || err.message.includes('Authentication token not found')) {
        showError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        // Redirect ไปหน้า login
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }
      
      // จัดการ validation errors
      if (err.message.includes('Validation error')) {
        showError(err.message);
      } else if (err.message && err.message.includes('400')) {
        try {
          const errorMatch = err.message.match(/message: (.+)/);
          if (errorMatch) {
            showError(errorMatch[1]);
          } else {
            showError('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
          }
        } catch (parseError) {
          showError('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
        }
      } else {
        showError(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } finally {
      setSaving(false);
    }
  };

  // เริ่มแก้ไข
  const startEdit = () => {
    console.log('startEdit called, profile:', profile);
    console.log('Setting editData to:', { ...profile });
    setEditData({ ...profile });
    setEditMode(true);
    console.log('editMode set to true');
  };

  // ยกเลิกการแก้ไข
  const cancelEdit = () => {
    console.log('cancelEdit called');
    console.log('Resetting editData to:', { ...profile });
    setEditData({ ...profile });
    setEditMode(false);
    console.log('editMode set to false');
  };

  // อัปโหลดรูปภาพ
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ตรวจสอบจำนวนรูปภาพตามระดับสมาชิก
    if (membershipData) {
      const currentImageCount = profile.profileImages ? profile.profileImages.length : 0;
      const maxImages = membershipData.limits.dailyImages === -1 ? 10 : membershipData.limits.dailyImages;
      
      if (currentImageCount >= maxImages) {
        showError(`คุณสามารถอัปโหลดรูปภาพได้สูงสุด ${maxImages} รูปตามระดับสมาชิก ${membershipHelpers.getTierName(membershipData.membershipTier)}`);
        return;
      }
    }

    try {
      setUploadingImage(true);
      await profileAPI.uploadProfileImage(userId, file);
      await fetchProfile();
      success('อัปโหลดรูปภาพสำเร็จ');
    } catch (err) {
      showError(err.response?.data?.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingImage(false);
    }
  };

  // ลบรูปภาพ
  const deleteImage = async (imageIndex) => {
    try {
      await profileAPI.deleteProfileImage(userId, imageIndex);
      await fetchProfile();
      success('ลบรูปภาพสำเร็จ');
    } catch (err) {
      showError(err.response?.data?.message || 'ไม่สามารถลบรูปภาพได้');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchMembershipData();
    }
  }, [userId]);

  // ฟังก์ชันแปลงข้อมูลการศึกษา
  const getEducationLabel = (level) => {
    const educationLevels = {
      'high_school': 'มัธยมศึกษา',
      'bachelor': 'ปริญญาตรี',
      'master': 'ปริญญาโท',
      'phd': 'ปริญญาเอก',
      'vocational': 'อาชีวศึกษา',
      'other': 'อื่นๆ'
    };
    return educationLevels[level] || level;
  };

  // ฟังก์ชันแปลงข้อมูลศาสนา
  const getReligionLabel = (religion) => {
    const religions = {
      'buddhism': 'พุทธ',
      'christianity': 'คริสต์',
      'islam': 'อิสลาม',
      'hinduism': 'ฮินดู',
      'other': 'อื่นๆ',
      'none': 'ไม่มีศาสนา'
    };
    return religions[religion] || religion;
  };

  // ฟังก์ชันแปลงข้อมูลภาษา
  const getLanguageLabel = (lang) => {
    const languages = {
      'thai': 'ไทย',
      'english': 'อังกฤษ',
      'chinese': 'จีน',
      'japanese': 'ญี่ปุ่น',
      'korean': 'เกาหลี',
      'other': 'อื่นๆ'
    };
    return languages[lang] || lang;
  };

  // ฟังก์ชันแปลงข้อมูลไลฟ์สไตล์
  const getLifestyleLabel = (category, value) => {
    const lifestyleLabels = {
      smoking: {
        'yes': 'สูบบุหรี่',
        'no': 'ไม่สูบบุหรี่',
        'occasionally': 'สูบเป็นครั้งคราว',
        'quit': 'เลิกสูบแล้ว'
      },
      drinking: {
        'yes': 'ดื่มสุรา',
        'no': 'ไม่ดื่มสุรา',
        'socially': 'ดื่มในงานสังคม',
        'quit': 'เลิกดื่มแล้ว'
      },
      exercise: {
        'daily': 'ออกกำลังกายทุกวัน',
        'weekly': 'ออกกำลังกายสัปดาห์ละ 2-3 ครั้ง',
        'monthly': 'ออกกำลังกายเป็นครั้งคราว',
        'never': 'ไม่ค่อยออกกำลังกาย'
      },
      diet: {
        'regular': 'ทานอาหารทั่วไป',
        'vegetarian': 'มังสวิรัติ',
        'vegan': 'วีแกน',
        'halal': 'ฮาลาล',
        'other': 'อื่นๆ'
      },
      sleep: {
        'early': 'นอนเร็ว (ก่อน 22:00)',
        'normal': 'นอนปกติ (22:00-24:00)',
        'late': 'นอนดึก (หลัง 24:00)',
        'irregular': 'นอนไม่เป็นเวลา'
      }
    };
    return lifestyleLabels[category]?.[value] || value;
  };

  // ฟังก์ชันแปลงข้อมูลความสนใจ
  const getInterestIcon = (category) => {
    const icons = {
      sports: <Dumbbell className="h-4 w-4" />,
      music: <Music className="h-4 w-4" />,
      movies: <Film className="h-4 w-4" />,
      books: <Book className="h-4 w-4" />,
      cooking: <Utensils className="h-4 w-4" />,
      travel: <Plane className="h-4 w-4" />,
      technology: <Code className="h-4 w-4" />,
      art: <Palette className="h-4 w-4" />,
      gaming: <Gamepad2 className="h-4 w-4" />,
      fitness: <Dumbbell className="h-4 w-4" />,
      nature: <Mountain className="h-4 w-4" />,
      photography: <CameraIcon className="h-4 w-4" />,
      dancing: <Music className="h-4 w-4" />,
      other: <Star className="h-4 w-4" />
    };
    return icons[category] || <Star className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดโปรไฟล์...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ไม่พบข้อมูลโปรไฟล์</p>
      </div>
    );
  }

  console.log('UserProfile render - editMode:', editMode, 'isOwnProfile:', isOwnProfile);
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                {profile.profileImages && profile.profileImages.length > 0 ? (
                  <img 
                    src={`http://localhost:5000/uploads/profiles/${profile.profileImages[0]}`}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold ${profile.profileImages && profile.profileImages.length > 0 ? 'hidden' : ''}`}>
                  <User className="h-10 w-10" />
                </div>
              </div>
              {profile.membership && (
                <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r ${membershipHelpers.getTierGradient(profile.membership.tier)} flex items-center justify-center text-white text-xs shadow-lg`}>
                  {membershipHelpers.getTierIcon(profile.membership.tier)}
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-800">
                  {profile.displayName || `${profile.firstName} ${profile.lastName}`}
                </h1>
                {profile.nickname && (
                  <span className="text-gray-500">({profile.nickname})</span>
                )}
                {profile.isVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Award className="h-3 w-3 mr-1" />
                    ยืนยันแล้ว
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {getAgeFromDate(profile.dateOfBirth)} ปี
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.location}
                </span>
                {profile.membership && (
                  <Badge className={`bg-gradient-to-r ${membershipHelpers.getTierGradient(profile.membership.tier)} text-white`}>
                    <Crown className="h-3 w-3 mr-1" />
                    {membershipHelpers.getTierName(profile.membership.tier)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {isOwnProfile && localStorage.getItem('token') && (
            <Button
              onClick={startEdit}
              variant="outline"
              size="sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              แก้ไขโปรไฟล์
            </Button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Profile Images */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Camera className="h-5 w-5 mr-2 text-pink-500" />
              รูปภาพ
              {membershipData && (
                <span className="ml-2 text-sm text-gray-500">
                  ({profile.profileImages ? profile.profileImages.length : 0}/{membershipData.limits.dailyImages === -1 ? 'ไม่จำกัด' : membershipData.limits.dailyImages})
                </span>
              )}
            </h3>
            {isOwnProfile && localStorage.getItem('token') && (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={uploadingImage}
                  size="sm"
                  variant="outline"
                >
                  {uploadingImage ? (
                    <div className="animate-spin h-4 w-4 border-2 border-pink-500 border-t-transparent rounded-full mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  เพิ่มรูป
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {profile.profileImages && profile.profileImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={`http://localhost:5000/uploads/profiles/${image}`}
                  alt={`Profile ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span class="text-gray-500 text-sm">ไม่สามารถโหลดรูปภาพได้</span>
                      </div>
                    `;
                  }}
                />
                {isOwnProfile && localStorage.getItem('token') && (
                  <button
                    onClick={() => deleteImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Profile Details Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">ข้อมูลพื้นฐาน</TabsTrigger>
          <TabsTrigger value="lifestyle">ไลฟ์สไตล์</TabsTrigger>
          <TabsTrigger value="interests">ความสนใจ</TabsTrigger>
          <TabsTrigger value="prompts">คำถามพิเศษ</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              ข้อมูลส่วนตัว
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Occupation */}
              {profile.occupation && (profile.occupation.job || profile.occupation.company) && (
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{profile.occupation.job || 'ไม่ระบุ'}</p>
                    {profile.occupation.company && (
                      <p className="text-sm text-gray-600">{profile.occupation.company}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Education */}
              {profile.education && profile.education.level && (
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{getEducationLabel(profile.education.level)}</p>
                    {profile.education.institution && (
                      <p className="text-sm text-gray-600">{profile.education.institution}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Physical Attributes */}
              {profile.physicalAttributes && (profile.physicalAttributes.height || profile.physicalAttributes.weight) && (
                <div className="flex items-center space-x-3">
                  <Ruler className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">ร่างกาย</p>
                    <p className="text-sm text-gray-600">
                      {profile.physicalAttributes.height && `${profile.physicalAttributes.height} ซม.`}
                      {profile.physicalAttributes.height && profile.physicalAttributes.weight && ' / '}
                      {profile.physicalAttributes.weight && `${profile.physicalAttributes.weight} กก.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Religion */}
              {profile.religion && (
                <div className="flex items-center space-x-3">
                  <Church className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">ศาสนา</p>
                    <p className="text-sm text-gray-600">{getReligionLabel(profile.religion)}</p>
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Languages className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">ภาษา</p>
                    <p className="text-sm text-gray-600">
                      {profile.languages.map(lang => getLanguageLabel(lang)).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Pets */}
              {profile.pets && profile.pets.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Dog className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">สัตว์เลี้ยง</p>
                    <p className="text-sm text-gray-600">
                      {profile.pets.map(pet => pet.type).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Lifestyle */}
        <TabsContent value="lifestyle" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-green-500" />
              ไลฟ์สไตล์
            </h3>
            
            {profile.lifestyle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.lifestyle.smoking && (
                  <div className="flex items-center space-x-3">
                    <Cigarette className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">การสูบบุหรี่</p>
                      <p className="text-sm text-gray-600">{getLifestyleLabel('smoking', profile.lifestyle.smoking)}</p>
                    </div>
                  </div>
                )}

                {profile.lifestyle.drinking && (
                  <div className="flex items-center space-x-3">
                    <Wine className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">การดื่มสุรา</p>
                      <p className="text-sm text-gray-600">{getLifestyleLabel('drinking', profile.lifestyle.drinking)}</p>
                    </div>
                  </div>
                )}

                {profile.lifestyle.exercise && (
                  <div className="flex items-center space-x-3">
                    <Dumbbell className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">การออกกำลังกาย</p>
                      <p className="text-sm text-gray-600">{getLifestyleLabel('exercise', profile.lifestyle.exercise)}</p>
                    </div>
                  </div>
                )}

                {profile.lifestyle.diet && (
                  <div className="flex items-center space-x-3">
                    <Utensils className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">อาหาร</p>
                      <p className="text-sm text-gray-600">{getLifestyleLabel('diet', profile.lifestyle.diet)}</p>
                    </div>
                  </div>
                )}

                {profile.lifestyle.sleep && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">เวลานอน</p>
                      <p className="text-sm text-gray-600">{getLifestyleLabel('sleep', profile.lifestyle.sleep)}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">ยังไม่ได้ระบุไลฟ์สไตล์</p>
            )}
          </Card>
        </TabsContent>

        {/* Interests */}
        <TabsContent value="interests" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              ความสนใจ
            </h3>
            
            {profile.interests && profile.interests.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {profile.interests.map((interest, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    {getInterestIcon(interest.category)}
                    <div>
                      <p className="font-medium text-sm">{interest.category}</p>
                      {interest.description && (
                        <p className="text-xs text-gray-600">{interest.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">ยังไม่ได้ระบุความสนใจ</p>
            )}
          </Card>
        </TabsContent>

        {/* Prompt Questions */}
        <TabsContent value="prompts" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-green-500" />
              คำถามพิเศษ
            </h3>
            
            {profile.promptAnswers && profile.promptAnswers.length > 0 ? (
              <div className="space-y-4">
                {profile.promptAnswers.map((prompt, index) => {
                  const questionLabels = {
                    'my_special_talent': 'ความสามารถพิเศษของฉันคือ...',
                    'way_to_win_my_heart': 'วิธีชนะใจฉันคือ...',
                    'dream_destination': 'สถานที่ในฝันที่อยากไปคือ...',
                    'last_laugh_until_tears': 'ครั้งล่าสุดที่หัวเราะจนน้ำตาไหลคือ...',
                    'perfect_first_date': 'เดทแรกในฝันของฉันคือ...',
                    'life_motto': 'คติประจำใจของฉันคือ...',
                    'favorite_memory': 'ความทรงจำที่ชื่นชอบที่สุดคือ...',
                    'biggest_fear': 'สิ่งที่กลัวที่สุดคือ...',
                    'dream_job': 'งานในฝันของฉันคือ...',
                    'guilty_pleasure': 'ความผิดที่ชอบทำคือ...'
                  };
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">
                        {questionLabels[prompt.question] || prompt.question}
                      </h4>
                      <p className="text-gray-600">{prompt.answer}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">ยังไม่ได้ตอบคำถามพิเศษ</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      <Dialog open={editMode} onOpenChange={(open) => {
        console.log('Dialog onOpenChange called with:', open);
        console.log('Current editData:', editData);
        setEditMode(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขโปรไฟล์</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลโปรไฟล์ของคุณเพื่อให้ผู้อื่นรู้จักคุณมากขึ้น
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-lg">ข้อมูลพื้นฐาน</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nickname">ชื่อเล่น</Label>
                  <Input
                    id="nickname"
                    value={editData.nickname || ''}
                    onChange={(e) => setEditData({...editData, nickname: e.target.value})}
                    placeholder="ชื่อเล่น"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">ที่อยู่ (จังหวัด/เมือง)</Label>
                  <Input
                    id="location"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({...editData, location: e.target.value})}
                    placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
                  />
                </div>
              </div>

              {/* Occupation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job">อาชีพ</Label>
                  <Input
                    id="job"
                    value={editData.occupation?.job || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      occupation: { ...(editData.occupation || {}), job: e.target.value }
                    })}
                    placeholder="อาชีพ"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">บริษัท/สถานศึกษา</Label>
                  <Input
                    id="company"
                    value={editData.occupation?.company || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      occupation: { ...(editData.occupation || {}), company: e.target.value }
                    })}
                    placeholder="บริษัทหรือสถานศึกษา"
                  />
                </div>
              </div>

              {/* Education */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="education_level">ระดับการศึกษา</Label>
                  <select
                    id="education_level"
                    value={editData.education?.level || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      education: { ...(editData.education || {}), level: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือกระดับการศึกษา</option>
                    <option value="high_school">มัธยมศึกษา</option>
                    <option value="bachelor">ปริญญาตรี</option>
                    <option value="master">ปริญญาโท</option>
                    <option value="phd">ปริญญาเอก</option>
                    <option value="vocational">อาชีวศึกษา</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="institution">สถาบันการศึกษา</Label>
                  <Input
                    id="institution"
                    value={editData.education?.institution || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      education: { ...(editData.education || {}), institution: e.target.value }
                    })}
                    placeholder="ชื่อสถาบันการศึกษา"
                  />
                </div>
              </div>

              {/* Physical Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">ส่วนสูง (ซม.)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={editData.physicalAttributes?.height || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      physicalAttributes: { ...(editData.physicalAttributes || {}), height: e.target.value }
                    })}
                    placeholder="ส่วนสูง"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">น้ำหนัก (กก.)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={editData.physicalAttributes?.weight || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      physicalAttributes: { ...(editData.physicalAttributes || {}), weight: e.target.value }
                    })}
                    placeholder="น้ำหนัก"
                  />
                </div>
              </div>

              {/* Religion & Languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="religion">ศาสนา</Label>
                  <select
                    id="religion"
                    value={editData.religion || ''}
                    onChange={(e) => setEditData({...editData, religion: e.target.value})}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือกศาสนา</option>
                    <option value="buddhism">พุทธ</option>
                    <option value="christianity">คริสต์</option>
                    <option value="islam">อิสลาม</option>
                    <option value="hinduism">ฮินดู</option>
                    <option value="other">อื่นๆ</option>
                    <option value="none">ไม่มีศาสนา</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="languages">ภาษาที่พูดได้</Label>
                  <Input
                    id="languages"
                    value={editData.languages?.join(', ') || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      languages: e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang)
                    })}
                    placeholder="เช่น ไทย, อังกฤษ, จีน"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-4">
              <h4 className="font-medium text-lg">เกี่ยวกับฉัน</h4>
              
              <div>
                <Label htmlFor="bio">Bio / About Me</Label>
                <textarea
                  id="bio"
                  value={editData.bio || ''}
                  onChange={(e) => setEditData({...editData, bio: e.target.value})}
                  placeholder="เล่าเกี่ยวกับตัวเอง... จุดเด่น สิ่งที่ชอบทำ สิ่งที่กำลังเรียนรู้ สิ่งที่มองหา"
                  className="w-full p-3 border rounded-lg resize-none h-32"
                  maxLength={1000}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {editData.bio?.length || 0}/1000 ตัวอักษร
                </p>
              </div>
            </div>

            {/* Lifestyle */}
            <div className="space-y-4">
              <h4 className="font-medium text-lg">ไลฟ์สไตล์</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smoking">การสูบบุหรี่</Label>
                  <select
                    id="smoking"
                    value={editData.lifestyle?.smoking || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), smoking: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="no">ไม่สูบบุหรี่</option>
                    <option value="yes">สูบบุหรี่</option>
                    <option value="occasionally">สูบเป็นครั้งคราว</option>
                    <option value="quit">เลิกสูบแล้ว</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="drinking">การดื่มสุรา</Label>
                  <select
                    id="drinking"
                    value={editData.lifestyle?.drinking || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), drinking: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="no">ไม่ดื่มสุรา</option>
                    <option value="yes">ดื่มสุรา</option>
                    <option value="socially">ดื่มในงานสังคม</option>
                    <option value="quit">เลิกดื่มแล้ว</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="exercise">การออกกำลังกาย</Label>
                  <select
                    id="exercise"
                    value={editData.lifestyle?.exercise || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), exercise: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="daily">ออกกำลังกายทุกวัน</option>
                    <option value="weekly">ออกกำลังกายสัปดาห์ละ 2-3 ครั้ง</option>
                    <option value="monthly">ออกกำลังกายเป็นครั้งคราว</option>
                    <option value="never">ไม่ค่อยออกกำลังกาย</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="diet">อาหาร</Label>
                  <select
                    id="diet"
                    value={editData.lifestyle?.diet || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      lifestyle: { ...(editData.lifestyle || {}), diet: e.target.value }
                    })}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">เลือก</option>
                    <option value="regular">ทานอาหารทั่วไป</option>
                    <option value="vegetarian">มังสวิรัติ</option>
                    <option value="vegan">วีแกน</option>
                    <option value="halal">ฮาลาล</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={cancelEdit}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="bg-gradient-to-r from-pink-500 to-violet-500 text-white"
              >
                {saving ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </div>
  );
};

export default UserProfile;