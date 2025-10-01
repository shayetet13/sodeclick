import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/toast';
import { membershipHelpers } from '../services/membershipAPI';
import { profileAPI } from '../services/profileAPI';
import { useLazyData } from '../hooks/useLazyData';
import { getProfileImageUrl, getMainProfileImage } from '../utils/profileImageUtils';
import { thaiProvinces } from '../utils/thaiProvinces';
import {
  User,
  Edit3,
  Camera,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
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
  Info,
  Coins
} from 'lucide-react';
import HeartVote from './HeartVote';
import ImageCropModal from './ImageCropModal';
import blurAPI from '../services/blurAPI';

const UserProfile = ({ userId, isOwnProfile = false }) => {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [petsInput, setPetsInput] = useState('');
  const [previewImages, setPreviewImages] = useState([]); // สำหรับแสดง preview รูปที่กำลังอัพโหลด
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]); // สำหรับเลือกรูปที่ต้องการเบลอ/ลบ
  const [isBlurring, setIsBlurring] = useState(false);
  const [isUnblurring, setIsUnblurring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blurredImages, setBlurredImages] = useState([]); // รูปที่เบลอของผู้ใช้
  const [showBlurredImages, setShowBlurredImages] = useState(false); // แสดง modal รูปเบลอ
  const [purchasingImage, setPurchasingImage] = useState(null); // รูปที่กำลังซื้อ
  const { success, error: showError } = useToast();
  const lastClickTimeRef = useRef({ blur: 0, unblur: 0, delete: 0 }); // ป้องกันการกดเร็วเกินไปแยกตามปุ่ม
  const retryCountRef = useRef(0); // เพิ่ม ref สำหรับนับ retry

  // ใช้ lazy loading สำหรับข้อมูลโปรไฟล์
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
    updateData: updateProfile,
    invalidateCache: invalidateProfileCache
  } = useLazyData(
    useCallback(() => profileAPI.getUserProfile(userId), [userId]),
    [userId],
    {
      cacheKey: `profile_${userId}`,
      staleTime: 10 * 60 * 1000, // เพิ่มเป็น 10 นาที เพื่อลดการโหลดซ้ำ
      backgroundRefresh: false, // ปิด background refresh เพื่อป้องกันการ overwrite ข้อมูลใหม่
      onSuccess: (response) => {
        console.log('✅ Profile loaded successfully:', response);
        if (response && response.success && response.data && response.data.profile) {
          console.log('📋 Profile data received:', {
            userId: response.data.profile._id || response.data.profile.id,
            hasProfileImages: !!response.data.profile.profileImages,
            profileImagesCount: response.data.profile.profileImages?.length || 0,
            hasBasicInfo: !!(response.data.profile.firstName || response.data.profile.displayName)
          });
          setEditData(response.data.profile);
          setPetsInput(formatPetsForInput(response.data.profile?.pets));
        } else {
          console.error('❌ Profile response missing data:', response);
          // ลด auto-refetch เพื่อไม่ให้เกิด infinite loop
          if (retryCountRef.current < 1) { // จำกัดการ retry เพียง 1 ครั้ง
            console.log('🔄 Attempting to refetch profile...');
            retryCountRef.current++;
            setTimeout(() => {
              refetchProfile();
            }, 500); // ลดเวลารอจาก 1000ms เป็น 500ms
          } else {
            console.warn('⚠️ Max retry attempts reached for profile fetch');
          }
        }
      },
      onError: (err) => {
        console.error('❌ Profile loading error:', err);
        if (err.message.includes('403')) {
          showError('ไม่มีสิทธิ์เข้าถึงโปรไฟล์นี้');
        } else if (err.message.includes('404')) {
          showError('ไม่พบโปรไฟล์ผู้ใช้');
        } else if (err.message.includes('401')) {
          showError('กรุณาเข้าสู่ระบบใหม่');
        } else {
          showError('ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
        }
      }
    }
  );

  // ใช้ lazy loading สำหรับข้อมูลสมาชิก
  const {
    data: membershipData,
    loading: membershipLoading
  } = useLazyData(
    useCallback(async () => {
      const token = sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/user/${userId}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
      return null;
    }, [userId]),
    [userId],
    {
      cacheKey: `membership_${userId}`,
      staleTime: 5 * 60 * 1000, // 5 นาที
      enabled: !!userId
    }
  );

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


  // บันทึกข้อมูลโปรไฟล์
  const saveProfile = async () => {
    try {
      setSaving(true);
      
      console.log('saveProfile called');
      console.log('Current editData:', editData);
      console.log('Current profile:', profile);
      
      // ตรวจสอบ token ก่อน
      const token = sessionStorage.getItem('token');
      if (!token) {
        showError('กรุณาเข้าสู่ระบบใหม่');
        // Redirect ไปหน้า login
        window.location.href = '/';
        return;
      }
      
      // ตรวจสอบว่ามีรูปภาพจริง (ไม่ใช่ default avatar)
      const hasRealImages = profileData?.profileImages?.some(img => {
        const imagePath = typeof img === 'string' ? img : img?.url || '';
        return !imagePath.startsWith('data:image/svg+xml');
      });

      if (!hasRealImages) {
        showError('กรุณาอัปโหลดรูปภาพโปรไฟล์อย่างน้อย 1 รูปก่อนบันทึก');
        setSaving(false);
        return;
      }

      // ตรวจสอบว่าได้เลือกรูปหลักแล้วหรือไม่
      const mainImageIndex = profileData?.mainProfileImageIndex ?? 0;
      const mainImage = profileData?.profileImages?.[mainImageIndex];
      const mainImagePath = typeof mainImage === 'string' ? mainImage : mainImage?.url || '';
      
      if (mainImagePath.startsWith('data:image/svg+xml')) {
        showError('กรุณาเลือกรูปโปรไฟล์หลักที่เป็นรูปจริง ไม่ใช่รูปเริ่มต้น');
        setSaving(false);
        return;
      }
      
      const normalizedPets = Array.isArray(editData.pets)
        ? { hasPets: editData.pets.length > 0, petTypes: editData.pets }
        : (editData.pets || {});

      const cleanData = {
        ...editData,
        // ทำความสะอาดข้อมูลก่อนส่ง
        education: editData.education || {},
        pets: normalizedPets,
        lifestyle: editData.lifestyle || {},
        interests: editData.interests || [],
        membership: editData.membership || {}
      };
      
      console.log('Cleaned profile data:', cleanData);
      console.log('Religion field:', cleanData.religion);
      console.log('Languages field:', cleanData.languages);
      console.log('Interests field:', cleanData.interests);
      
      const response = await profileAPI.updateUserProfile(userId, cleanData);
      console.log('Response from backend:', response);
      console.log('Updated profile:', response.data?.profile);
      console.log('Interests data:', response.data?.profile?.interests);
      
      // อัปเดตข้อมูลใน cache แทนการรีเฟรช
      if (response.data?.profile) {
        const updatedProfile = response.data.profile;
        
        console.log('✅ Profile update successful, updating UI...');
        console.log('📋 Updated profile data:', updatedProfile);
        
        // อัปเดต profile cache ด้วย structure ที่ถูกต้อง
        updateProfile({
          success: true,
          data: {
            profile: updatedProfile
          }
        });
        setEditData(updatedProfile);
        setPetsInput(formatPetsForInput(updatedProfile?.pets));
        
        // ถ้าเป็นโปรไฟล์ของตัวเอง ให้อัปเดต sessionStorage ด้วย
        if (isOwnProfile) {
          const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
          const updatedUser = {
            ...currentUser,
            displayName: updatedProfile.displayName || currentUser.displayName,
            firstName: updatedProfile.firstName || currentUser.firstName,
            lastName: updatedProfile.lastName || currentUser.lastName,
            nickname: updatedProfile.nickname || currentUser.nickname,
            bio: updatedProfile.bio || currentUser.bio,
            location: updatedProfile.location || currentUser.location,
            profileImages: updatedProfile.profileImages || currentUser.profileImages,
            mainProfileImageIndex: updatedProfile.mainProfileImageIndex ?? currentUser.mainProfileImageIndex
          };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('✅ Updated sessionStorage user data:', updatedUser);
          
          // ส่ง event เพื่อบอกให้ components อื่นๆ รู้ว่าข้อมูลผู้ใช้ถูกอัปเดต
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
            detail: { user: updatedUser } 
          }));
        }
        
        setEditMode(false);
        success('อัปเดตโปรไฟล์สำเร็จ');
        
        // Re-fetch ข้อมูลใหม่ทันทีเพื่อความแน่ใจว่าแสดงข้อมูลล่าสุด
        await refetchProfile();
        console.log('🔄 Profile re-fetched successfully');
      } else {
        throw new Error('ไม่พบข้อมูลโปรไฟล์ที่อัปเดต');
      }
      
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // จัดการ error ตามประเภท
      if (err.message.includes('Session expired') || err.message.includes('Authentication token not found') || err.message.includes('Token ไม่ถูกต้อง')) {
        showError('Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
        // ล้างข้อมูลและ redirect ไปหน้า login
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
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
    console.log('startEdit called, profileData:', profileData);
    console.log('Setting editData to:', { ...profileData });
    setEditData({ ...profileData });
    setEditMode(true);
    console.log('editMode set to true');
    setPetsInput(formatPetsForInput(profileData?.pets));
  };

  // ยกเลิกการแก้ไข
  const cancelEdit = () => {
    console.log('cancelEdit called');
    console.log('Resetting editData to:', { ...profileData });
    setEditData({ ...profileData });
    setEditMode(false);
    console.log('editMode set to false');
    setPetsInput(formatPetsForInput(profileData?.pets));
  };

  // เลือกรูปภาพและเปิด crop modal
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ตรวจสอบจำนวนรูปภาพตามระดับสมาชิก
    if (membershipData) {
      const currentImageCount = profileData.profileImages ? profileData.profileImages.filter(img => {
        const imagePath = typeof img === 'string' ? img : img?.url || '';
        return !imagePath.startsWith('data:image/svg+xml');
      }).length : 0;
      const maxImages = membershipData.limits.dailyImages === -1 ? 10 : membershipData.limits.dailyImages;
      
      if (currentImageCount >= maxImages) {
        showError(`คุณสามารถอัปโหลดรูปภาพได้สูงสุด ${maxImages} รูปตามระดับสมาชิก ${membershipHelpers.getTierName(membershipData.membershipTier)}`);
        return;
      }
    }

    // เปิด crop modal
    setImageToCrop(file);
    setCropModalOpen(true);
    
    // Reset file input
    event.target.value = '';
  };

  // อัปโหลดรูปภาพหลังจาก crop
  const handleCropComplete = async (croppedFile) => {
    try {
      setUploadingImage(true);
      
      // สร้าง preview รูปภาพทันทีก่อนอัพโหลด
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target.result;
        console.log('📸 Created preview URL for immediate display');
        
        // เพิ่ม preview image ลงใน state
        setPreviewImages(prev => [...prev, previewUrl]);
        
        // อัพเดท profileData ด้วย preview image ทันที
        if (profileData) {
          const tempProfileData = {
            ...profileData,
            profileImages: [...(profileData.profileImages || []), previewUrl]
          };
          updateProfile({ data: { profile: tempProfileData } });
        }
      };
      reader.readAsDataURL(croppedFile);
      
      const response = await profileAPI.uploadProfileImage(userId, croppedFile);
      console.log('📤 Upload response:', response);
      
      // อัพเดต UI ด้วยข้อมูลจริงจาก response และลบ preview
      if (response && response.success && response.data && response.data.profileImages) {
        console.log('🔄 Updating profile data with real images');
        
        // ลบ preview images
        setPreviewImages([]);
        
        // สร้าง profile object ใหม่ที่มี profileImages อัพเดท
        const updatedProfileData = {
          ...profileData,
          profileImages: response.data.profileImages
        };
        
        // อัพเดทข้อมูลใน cache แบบถาวร (ไม่ต้อง invalidate)
        updateProfile({ data: { profile: updatedProfileData } });
        console.log('✅ Profile images updated permanently in real-time:', response.data.profileImages);
      }
      
      success('อัปโหลดรูปภาพสำเร็จ');
    } catch (err) {
      console.error('❌ Upload error:', err);
      
      // ลบ preview images เมื่อเกิด error
      setPreviewImages([]);
      
      // คืนค่า profileData เดิมโดยลบ preview images ออก
      if (profileData) {
        const cleanProfileData = {
          ...profileData,
          profileImages: profileData.profileImages.filter(img => {
            const imagePath = typeof img === 'string' ? img : img?.url || '';
            return !imagePath.startsWith('data:image/');
          })
        };
        updateProfile({ data: { profile: cleanProfileData } });
      }
      
      showError(err.response?.data?.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setUploadingImage(false);
    }
  };

  // ลบรูปภาพ
  const deleteImage = async (imageIndex) => {
    try {
      console.log('🗑️ Deleting image at index:', imageIndex);
      console.log('🗑️ Current profile images:', profileData?.profileImages);
      console.log('🗑️ Profile images length:', profileData?.profileImages?.length);
      
      // ตรวจสอบว่า index ถูกต้องหรือไม่
      if (imageIndex < 0 || imageIndex >= (profileData?.profileImages?.length || 0)) {
        throw new Error(`ไม่พบรูปภาพที่ต้องการลบ (index: ${imageIndex}, total: ${profileData?.profileImages?.length || 0})`);
      }
      
      // ตรวจสอบว่ามีรูปภาพจริงๆ หรือไม่ (ไม่ใช่ default avatar)
      const imageToDelete = profileData.profileImages[imageIndex];
      const imagePath = typeof imageToDelete === 'string' ? imageToDelete : imageToDelete?.url || '';
      if (imagePath && imagePath.startsWith('data:image/svg+xml')) {
        throw new Error('ไม่สามารถลบรูป default avatar ได้');
      }
      
      console.log('🗑️ Image to delete:', imageToDelete);
      
      const response = await profileAPI.deleteProfileImage(userId, imageIndex);
      console.log('🗑️ Delete response:', response);
      
      // อัพเดต UI ทันทีด้วยข้อมูลจาก response
      if (response && response.success && response.data && response.data.profileImages) {
        console.log('🔄 Updating profile data immediately after delete');
        
        // สร้าง profile object ใหม่ที่มี profileImages อัพเดท
        const updatedProfileData = {
          ...profileData,
          profileImages: response.data.profileImages,
          // อัพเดท mainProfileImageIndex ถ้ามี
          ...(response.data.mainProfileImageIndex !== undefined && {
            mainProfileImageIndex: response.data.mainProfileImageIndex
          })
        };
        
        // อัพเดทข้อมูลใน cache แบบถาวร (ไม่ต้อง invalidate)
        updateProfile({ data: { profile: updatedProfileData } });
        console.log('✅ Profile images updated permanently after delete:', response.data.profileImages);
      }
      
      success('ลบรูปภาพสำเร็จ');
    } catch (err) {
      console.error('❌ Error deleting image:', err);
      showError(err.response?.data?.message || err.message || 'ไม่สามารถลบรูปภาพได้');
    }
  };

  // ตั้งรูปโปรไฟล์หลัก
  const setMainProfileImage = async (imageIndex) => {
    try {
      console.log('Setting main profile image with index:', imageIndex);
      const response = await profileAPI.setMainProfileImage(userId, imageIndex);
      console.log('API response:', response);
      
      // อัพเดต UI ทันทีด้วยข้อมูลจาก response
      if (response && response.success && response.data && response.data.profileImages) {
        console.log('🔄 Updating profile data immediately after setting main image');
        
        // สร้าง profile object ใหม่ที่มี profileImages อัพเดทและ mainProfileImageIndex = 0
        // เนื่องจาก backend ย้ายรูปที่เลือกมาเป็นรูปแรก
        const updatedProfileData = {
          ...profileData,
          profileImages: response.data.profileImages,
          mainProfileImageIndex: 0 // รูปหลักจะอยู่ที่ index 0 เสมอ
        };
        
        // อัพเดทข้อมูลใน cache แบบถาวร (ไม่ต้อง invalidate)
        updateProfile({ data: { profile: updatedProfileData } });
        console.log('✅ Main profile image updated permanently:', response.data.profileImages);
      }
      
      // รีเฟรช avatar ใน header โดยไม่ต้องรีเฟรชหน้าเว็บ
      const event = new CustomEvent('profileImageUpdated', { 
        detail: { 
          userId, 
          profileImages: response.data?.profileImages || profileData?.profileImages,
          mainProfileImageIndex: 0
        } 
      });
      window.dispatchEvent(event);
      
      success('ตั้งรูปโปรไฟล์หลักสำเร็จ');
    } catch (err) {
      console.error('Error setting main profile image:', err);
      showError(err.response?.data?.message || 'ไม่สามารถตั้งรูปโปรไฟล์หลักได้');
    }
  };

  // เลือก/ยกเลิกเลือกรูป
  const toggleImageSelection = (imageIndex) => {
    console.log('🔍 toggleImageSelection called:', {
      imageIndex,
      currentSelected: selectedImages,
      willBeSelected: !selectedImages.includes(imageIndex)
    });
    
    setSelectedImages(prev => {
      const newSelection = prev.includes(imageIndex) 
        ? prev.filter(index => index !== imageIndex)
        : [...prev, imageIndex];
      
      console.log('🔍 New selection:', newSelection);
      return newSelection;
    });
  };

  // เบลอรูปที่เลือก
  const blurSelectedImages = async () => {
    console.log('🔒 blurSelectedImages called:', {
      selectedImages,
      userId,
      isBlurring,
      isUnblurring,
      isDeleting,
      canBlur: canBlurImages()
    });
    
    if (selectedImages.length === 0) {
      console.log('❌ No images selected');
      showError('กรุณาเลือกรูปที่ต้องการเบลอ');
      return;
    }

    // ป้องกันการเรียกซ้ำ
    if (isBlurring) {
      console.log('❌ Already blurring, ignoring blur request');
      return;
    }

    try {
      setIsBlurring(true);
      console.log('🔒 Starting blur process for images:', selectedImages);
      console.log('🔒 About to call profileAPI.blurProfileImages...');
      console.log('🔒 profileAPI object:', profileAPI);
      console.log('🔒 profileAPI.blurProfileImages:', typeof profileAPI.blurProfileImages);
      
      if (!profileAPI || typeof profileAPI.blurProfileImages !== 'function') {
        throw new Error('profileAPI.blurProfileImages is not available');
      }
      
      const response = await profileAPI.blurProfileImages(userId, selectedImages);
      console.log('🔒 Blur API response received:', response);
      
      if (response && response.success && response.data) {
        console.log('✅ Blur successful, updating profile data');
        console.log('🔒 New profileImages from API:', response.data.profileImages);
        
        // อัพเดทข้อมูลโปรไฟล์
        const updatedProfileData = {
          ...profileData,
          profileImages: response.data.profileImages
        };
        
        console.log('🔒 Updated profile data:', updatedProfileData);
        updateProfile({ data: { profile: updatedProfileData } });
        
        // ล้างการเลือก
        setSelectedImages([]);
        
        success(`เบลอรูปภาพสำเร็จ ${response.data.blurredCount} รูป`);
      } else {
        console.log('❌ Blur response not successful:', response);
        showError('ไม่สามารถเบลอรูปภาพได้');
      }
    } catch (err) {
      console.error('❌ Error blurring images:', err);
      console.error('❌ Error stack:', err.stack);
      console.error('❌ Error details:', {
        name: err.name,
        message: err.message,
        cause: err.cause
      });
      showError(err.message || 'ไม่สามารถเบลอรูปภาพได้');
    } finally {
      console.log('🔒 Setting isBlurring to false');
      setIsBlurring(false);
    }
  };

  // ยกเลิกการเบลอรูปที่เลือก
  // ดูรูปเบลอของผู้ใช้
  const loadBlurredImages = async () => {
    try {
      const currentUserId = JSON.parse(sessionStorage.getItem('user'))?.id;
      const response = await blurAPI.getBlurredImages(userId, currentUserId);
      
      if (response.success) {
        setBlurredImages(response.data.images || []);
        setShowBlurredImages(true);
      }
    } catch (error) {
      showError('ไม่สามารถโหลดรูปเบลอได้: ' + error.message);
    }
  };

  // ซื้อรูปเบลอ
  const purchaseBlurredImage = async (imageId, imageOwnerId) => {
    try {
      const currentUserId = JSON.parse(sessionStorage.getItem('user'))?.id;
      if (!currentUserId) {
        showError('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      setPurchasingImage(imageId);
      
      const response = await blurAPI.purchaseBlurredImage(currentUserId, imageOwnerId, imageId);
      
      if (response.success) {
        success(`ซื้อรูปสำเร็จ! จ่าย ${response.data.paidAmount.toLocaleString()} เหรียญ`);
        
        // อัพเดทรายการรูปเบลอเฉพาะรูปที่ซื้อ
        setBlurredImages(prev => 
          prev.map(img => 
            img.id === imageId 
              ? { ...img, isPurchased: true }
              : img
          )
        );
        
        // อัพเดท sessionStorage เพื่อบันทึกการซื้อรูปเฉพาะ
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const purchasedImage = {
          profileId: imageOwnerId,
          imageId: imageId,
          purchasedAt: new Date().toISOString()
        };
        
        const updatedUser = {
          ...currentUser,
          purchasedImages: [...(currentUser.purchasedImages || []), purchasedImage]
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      showError('ไม่สามารถซื้อรูปได้: ' + error.message);
    } finally {
      setPurchasingImage(null);
    }
  };

  const unblurSelectedImages = async () => {
    console.log('🔓 unblurSelectedImages called:', {
      selectedImages,
      userId,
      isBlurring,
      isUnblurring,
      isDeleting
    });
    
    if (selectedImages.length === 0) {
      console.log('❌ No images selected for unblur');
      showError('กรุณาเลือกรูปที่ต้องการยกเลิกการเบลอ');
      return;
    }

    // ป้องกันการเรียกซ้ำ
    if (isUnblurring) {
      console.log('❌ Already unblurring, ignoring unblur request');
      return;
    }

    try {
      setIsUnblurring(true);
      console.log('🔓 Starting unblur process for images:', selectedImages);
      
      const response = await profileAPI.unblurProfileImages(userId, selectedImages);
      console.log('🔓 Unblur API response:', response);
      
      if (response && response.success && response.data) {
        console.log('✅ Unblur successful, updating profile data');
        
        // อัพเดทข้อมูลโปรไฟล์
        const updatedProfileData = {
          ...profileData,
          profileImages: response.data.profileImages
        };
        updateProfile({ data: { profile: updatedProfileData } });
        
        // ล้างการเลือก
        setSelectedImages([]);
        
        success(`ยกเลิกการเบลอรูปภาพสำเร็จ ${response.data.unblurredCount} รูป`);
      } else {
        console.log('❌ Unblur response not successful:', response);
        showError('ไม่สามารถยกเลิกการเบลอรูปภาพได้');
      }
    } catch (err) {
      console.error('❌ Error unblurring images:', err);
      showError(err.message || 'ไม่สามารถยกเลิกการเบลอรูปภาพได้');
    } finally {
      setIsUnblurring(false);
    }
  };

  // ลบรูปที่เลือก
  const deleteSelectedImages = async () => {
    console.log('🗑️ deleteSelectedImages called:', {
      selectedImages,
      userId,
      isBlurring,
      isUnblurring,
      isDeleting
    });
    
    if (selectedImages.length === 0) {
      console.log('❌ No images selected for delete');
      showError('กรุณาเลือกรูปที่ต้องการลบ');
      return;
    }

    // ป้องกันการเรียกซ้ำ
    if (isDeleting) {
      console.log('❌ Already deleting, ignoring delete request');
      return;
    }

    try {
      setIsDeleting(true);
      console.log('🗑️ Starting delete process for images:', selectedImages);
      
      // ลบรูปทีละรูป (เนื่องจาก API ปัจจุบันรองรับการลบทีละรูป)
      for (const imageIndex of selectedImages.sort((a, b) => b - a)) { // เรียงจากมากไปน้อยเพื่อไม่ให้ index เปลี่ยน
        console.log('🗑️ Deleting image at index:', imageIndex);
        await profileAPI.deleteProfileImage(userId, imageIndex);
      }
      
      // รีเฟรชข้อมูลโปรไฟล์
      await refetchProfile();
      
      // ล้างการเลือก
      setSelectedImages([]);
      
      success(`ลบรูปภาพสำเร็จ ${selectedImages.length} รูป`);
    } catch (err) {
      console.error('❌ Error deleting images:', err);
      showError(err.message || 'ไม่สามารถลบรูปภาพได้');
    } finally {
      setIsDeleting(false);
    }
  };

  // ตรวจสอบสิทธิ์การเบลอรูป
  const canBlurImages = () => {
    // ตรวจสอบว่าเป็น superadmin หรือไม่
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.role === 'superadmin';
    
    // ถ้าเป็น superadmin สามารถเบลอได้เสมอ
    if (isSuperAdmin) {
      console.log('🔍 Debug canBlurImages: SuperAdmin bypass');
      return true;
    }
    
    const tier = profileData?.membership?.tier || 'member';
    
    // ดึงข้อมูลจาก membershipData ที่โหลดจาก API
    let blurredImagesLimit = membershipData?.features?.blurredImages || 0;
    
    // Fallback: ถ้ายังไม่มี membershipData ให้ใช้ค่าจาก tier
    if (!membershipData && tier !== 'member') {
      const tierLimits = {
        silver: 0,
        gold: 0,
        vip: 3,
        vip1: 5,
        vip2: 10,
        diamond: 15,
        platinum: 15
      };
      blurredImagesLimit = tierLimits[tier] || 0;
      console.log('⚠️  Using fallback tier limits for', tier, ':', blurredImagesLimit);
    }
    
    // สามารถเบลอได้ถ้ามีสิทธิ์เบลอรูป
    const canBlur = blurredImagesLimit > 0;
    
    console.log('🔍 Debug canBlurImages:', {
      tier,
      membershipDataLoaded: !!membershipData,
      membershipFeatures: membershipData?.features,
      blurredImagesLimit,
      isSuperAdmin,
      userRole: currentUser.role,
      canBlur,
      isOwnProfile,
      hasToken: !!sessionStorage.getItem('token')
    });
    
    return canBlur;
  };

  // ดึงข้อมูลโปรไฟล์จาก response (ย้ายมาที่นี่เพื่อให้ใช้ได้ใน useEffect)
  const profileData = profile && profile.data && profile.data.profile ? profile.data.profile : null;

  // ตรวจสอบว่าข้อมูลโปรไฟล์มีเนื้อหาหรือไม่ (ปรับปรุงให้ยืดหยุ่นมากขึ้น)
  const hasValidProfileData = profileData && (
    profileData.firstName || 
    profileData.displayName || 
    profileData.username ||
    profileData._id ||
    profileData.id ||
    profileData.email ||
    profileData.gender ||
    profileData.location
  );

  useEffect(() => {
    // ไม่ต้องเรียก fetchProfile และ fetchMembershipData อีกแล้ว เพราะใช้ lazy loading
    // เพียงแค่ตั้งค่าเริ่มต้นของ editData เมื่อ profile โหลดเสร็จ
    if (profileData && !editData._id) {
      setEditData({ ...profileData });
      setPetsInput(formatPetsForInput(profileData?.pets));
    }
  }, [profileData]);

  // ฟังก์ชันแปลงข้อมูลการศึกษา (รองรับทั้งค่าจากฟอร์มและจากฐานข้อมูล)
  const getEducationLabel = (level) => {
    const educationLevels = {
      'high_school': 'มัธยมศึกษา',
      'bachelor': 'ปริญญาตรี',
      'master': 'ปริญญาโท',
      'phd': 'ปริญญาเอก',
      'doctorate': 'ปริญญาเอก',
      'vocational': 'อาชีวศึกษา',
      'diploma': 'ปวส./อนุปริญญา',
      'other': 'อื่นๆ'
    };
    return educationLevels[level] || level;
  };

  // ฟังก์ชันแปลงข้อมูลศาสนา (รองรับทั้งค่าจากฟอร์มและค่าที่บันทึกในฐานข้อมูล)
  const getReligionLabel = (religion) => {
    const religions = {
      // values saved in DB
      'buddhist': 'พุทธ',
      'christian': 'คริสต์',
      'muslim': 'อิสลาม',
      'hindu': 'ฮินดู',
      'other': 'อื่นๆ',
      'none': 'ไม่มีศาสนา',
      // values from form select (pre-mapping)
      'buddhism': 'พุทธ',
      'christianity': 'คริสต์',
      'islam': 'อิสลาม',
      'hinduism': 'ฮินดู'
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

  // ฟังก์ชันแปลงข้อมูลไลฟ์สไตล์ (รองรับทั้งค่าจากฟอร์มและจากฐานข้อมูล)
  const getLifestyleLabel = (category, value) => {
    const lifestyleLabels = {
      smoking: {
        // form values
        'yes': 'สูบบุหรี่',
        'no': 'ไม่สูบบุหรี่',
        'occasionally': 'สูบเป็นครั้งคราว',
        'quit': 'เลิกสูบแล้ว',
        // db values
        'regularly': 'สูบบุหรี่',
        'never': 'ไม่สูบบุหรี่',
        'trying_to_quit': 'เลิกสูบแล้ว'
      },
      drinking: {
        // form values
        'yes': 'ดื่มสุรา',
        'no': 'ไม่ดื่มสุรา',
        'socially': 'ดื่มในงานสังคม',
        'occasionally': 'ดื่มเป็นครั้งคราว',
        'quit': 'ไม่ดื่มสุรา',
        // db values
        'regularly': 'ดื่มสุรา',
        'never': 'ไม่ดื่มสุรา'
      },
      exercise: {
        // form values
        'daily': 'ออกกำลังกายทุกวัน',
        'weekly': 'ออกกำลังกายสัปดาห์ละ 2-3 ครั้ง',
        'monthly': 'ออกกำลังกายเป็นครั้งคราว',
        'never': 'ไม่ค่อยออกกำลังกาย',
        // db values
        'regularly': 'ออกกำลังกายสม่ำเสมอ',
        'sometimes': 'ออกกำลังกายเป็นครั้งคราว',
        'rarely': 'แทบไม่ออกกำลังกาย'
      },
      diet: {
        // form values
        'regular': 'ทานอาหารทั่วไป',
        'vegetarian': 'มังสวิรัติ',
        'vegan': 'วีแกน',
        'halal': 'ฮาลาล',
        'other': 'อื่นๆ',
        // db values
        'omnivore': 'ทานอาหารทั่วไป'
      },
      sleep: {
        // legacy form values
        'early': 'นอนเร็ว (ก่อน 22:00)',
        'normal': 'นอนปกติ (22:00-24:00)',
        'late': 'นอนดึก (หลัง 24:00)',
        'irregular': 'นอนไม่เป็นเวลา',
        // db values (sleepSchedule)
        'early_bird': 'นอนเร็ว ตื่นเช้า',
        'night_owl': 'นอนดึก ตื่นสาย',
        'flexible': 'ยืดหยุ่น'
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

  // ฟังก์ชันแปลงประเภทสัตว์เลี้ยง
  const getPetTypeLabel = (type) => {
    const map = {
      dog: 'สุนัข',
      cat: 'แมว',
      bird: 'นก',
      fish: 'ปลา',
      rabbit: 'กระต่าย',
      hamster: 'แฮมสเตอร์',
      other: 'อื่นๆ'
    };
    return map[type] || type;
  };

  const normalizePetsInputToTypes = (input) => {
    if (!input) return [];
    const tokenToEnum = {
      'สุนัข': 'dog', 'หมา': 'dog', 'dog': 'dog',
      'แมว': 'cat', 'cat': 'cat',
      'นก': 'bird', 'bird': 'bird',
      'ปลา': 'fish', 'fish': 'fish',
      'กระต่าย': 'rabbit', 'rabbit': 'rabbit',
      'แฮมสเตอร์': 'hamster', 'hamster': 'hamster',
    };
    const normalizeToken = (raw) => {
      if (!raw) return '';
      // remove counts like '1 ตัว', spaces around, and punctuation
      const cleaned = raw
        .replace(/\d+/g, '') // numbers
        .replace(/ตัว/g, '')
        .replace(/จำนวน/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      return cleaned;
    };
    return input
      .split(',')
      .map(segment => segment.trim())
      .filter(Boolean)
      .flatMap(segment => {
        // extract count if provided (e.g., 'แมว 2 ตัว')
        const countMatch = segment.match(/(\d+)/);
        const count = countMatch ? Math.max(1, parseInt(countMatch[1], 10)) : 1;
        const token = normalizeToken(segment);
        const enumVal = tokenToEnum[token] || 'other';
        return Array(count).fill(enumVal);
      });
  };

  const formatPetsForInput = (pets) => {
    const petArray = Array.isArray(pets) ? pets : (pets?.petTypes || []);
    if (!petArray || petArray.length === 0) return '';
    const counter = petArray.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1; return acc;
    }, {});
    return Object.entries(counter)
      .map(([type, count]) => `${getPetTypeLabel(type)} ${count} ตัว`)
      .join(', ');
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-3 text-gray-600">กำลังโหลดโปรไฟล์...</span>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-2">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-lg font-semibold">เกิดข้อผิดพลาด</p>
        </div>
        <p className="text-gray-500 mb-4">{profileError.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'}</p>
        <div className="space-x-2">
          <Button 
            onClick={() => refetchProfile()} 
            variant="outline"
            className="text-sm"
          >
            ลองใหม่
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="text-sm"
          >
            รีเฟรชหน้า
          </Button>
        </div>
      </div>
    );
  }

  if (!profile || !profile.data || !hasValidProfileData) {
    // ถ้ายังกำลังโหลด ให้แสดง loading
    if (profileLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <span className="ml-3 text-gray-600">กำลังโหลดโปรไฟล์...</span>
        </div>
      );
    }
    
    // ถ้าไม่มีข้อมูลโปรไฟล์ ให้แสดง error และปุ่มลองใหม่
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <User className="h-8 w-8 mx-auto mb-2" />
          <p className="text-lg font-semibold">ไม่พบข้อมูลโปรไฟล์</p>
        </div>
        <p className="text-gray-500 mb-4">โปรไฟล์นี้ไม่มีอยู่หรือคุณไม่มีสิทธิ์เข้าถึง</p>
        <div className="space-x-2">
          <Button 
            onClick={() => refetchProfile()} 
            variant="outline"
            className="text-sm"
          >
            ลองใหม่
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="text-sm"
          >
            รีเฟรชหน้า
          </Button>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          <p>Debug info:</p>
          <p>Profile exists: {profile ? 'Yes' : 'No'}</p>
          <p>Profile data exists: {profile?.data ? 'Yes' : 'No'}</p>
          <p>Profile profile exists: {profile?.data?.profile ? 'Yes' : 'No'}</p>
          <p>Has valid profile data: {hasValidProfileData ? 'Yes' : 'No'}</p>
          <p>Profile data keys: {profileData ? Object.keys(profileData).join(', ') : 'None'}</p>
        </div>
      </div>
    );
  }


  console.log('UserProfile render - editMode:', editMode, 'isOwnProfile:', isOwnProfile);
  
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 min-h-screen pb-20">
      {/* Mobile-First Header Section */}
      <Card className="p-4 sm:p-6 mt-4">
        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-lg sm:text-2xl font-bold overflow-hidden relative">
                {(() => {
                  // สร้าง profile image URL ที่ถูกต้อง
                  const mainImageIndex = profileData.mainProfileImageIndex || 0;
                  const mainImage = profileData.profileImages?.[mainImageIndex];
                  
                  // ตรวจสอบว่ารูปหลักเบลอหรือไม่
                  const isMainImageBlurred = typeof mainImage === 'object' && mainImage.isBlurred;
                  
                  const profileImageUrl = getMainProfileImage(
                    profileData.profileImages || [], 
                    profileData.mainProfileImageIndex, 
                    userId
                  )
                  
                  console.log('🔍 Main profile image debug:', {
                    mainImageIndex,
                    mainImage,
                    isMainImageBlurred,
                    profileImageUrl
                  });
                  
                  const mainImagePath = typeof profileData.profileImages[mainImageIndex] === 'string' 
                    ? profileData.profileImages[mainImageIndex] 
                    : profileData.profileImages[mainImageIndex]?.url || '';
                  return profileImageUrl && !mainImagePath.startsWith('data:image/svg+xml') ? (
                    <>
                      <img 
                        src={profileImageUrl}
                        alt="Profile"
                        className={`w-full h-full rounded-full object-cover object-center ${isMainImageBlurred ? 'blur-sm filter' : ''}`}
                        style={{ 
                          objectFit: 'cover', 
                          width: '100%', 
                          height: '100%',
                          ...(isMainImageBlurred && { 
                            filter: 'blur(8px)',
                            transition: 'filter 0.3s ease'
                          })
                        }}
                        onError={(e) => {
                          console.error('❌ Profile image failed to load:', profileImageUrl);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        onLoad={() => {
                          console.log('✅ Profile image loaded successfully');
                        }}
                      />
                      {/* Overlay สำหรับรูป profile หลักที่เบลอ */}
                      {isMainImageBlurred && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-full backdrop-blur-sm">
                          <EyeOff className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <User className="h-8 w-8 sm:h-10 sm:w-10" />
                  )
                })()}
                <div className={`absolute inset-0 w-full h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white text-lg sm:text-2xl font-bold hidden`}>
                  <User className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
              </div>
              {profileData.membership && (
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r ${membershipHelpers.getTierGradient(profileData.membership.tier)} flex items-center justify-center text-white text-xs shadow-lg`}>
                  {membershipHelpers.getTierIcon(profileData.membership.tier)}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                    {profileData.displayName || `${profileData.firstName} ${profileData.lastName}`}
                  </h1>
                  {/* Online Status Indicator */}
                  <div className={`h-2 w-2 rounded-full ${profileData.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} 
                       title={profileData.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}></div>
                </div>
                {profileData.nickname && (
                  <span className="text-gray-500 text-sm sm:text-base">({profileData.nickname})</span>
                )}
                {profileData.isVerified && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    ยืนยันแล้ว
                  </Badge>
                )}
              </div>
              {/* Online Status Text */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{profileData.isOnline ? '🟢 ออนไลน์' : '🔴 ออฟไลน์'}</span>
                {profileData.lastActive && !profileData.isOnline && (
                  <span className="text-gray-400">
                    • สุดท้าย {new Date(profileData.lastActive).toLocaleString('th-TH')}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {getAgeFromDate(profileData.dateOfBirth)} ปี
                </span>
                {profileData.location && !/^\d+\.?\d*,\d+\.?\d*$/.test(profileData.location) && (
                  <span className="flex items-center">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {profileData.location}
                  </span>
                )}
                {profileData.membership && (
                  <Badge className={`bg-gradient-to-r ${membershipHelpers.getTierGradient(profileData.membership.tier)} text-white text-xs`}>
                    <Crown className="h-3 w-3 mr-1" />
                    {membershipHelpers.getTierName(profileData.membership.tier)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Heart Vote Section */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <HeartVote
                candidateId={userId}
                candidateGender={profileData.gender}
                candidateDisplayName={profileData.displayName || `${profileData.firstName} ${profileData.lastName}`}
                isOwnProfile={isOwnProfile}
                className=""
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* ปุ่มสำหรับเจ้าของโปรไฟล์ */}
            {isOwnProfile && sessionStorage.getItem('token') && (
              <Button
                onClick={startEdit}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2"
              >
                <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">แก้ไขโปรไฟล์</span>
                <span className="sm:hidden">แก้ไข</span>
              </Button>
            )}
            
            {/* ปุ่มดูรูปเบลอ (สำหรับคนอื่น) */}
            {!isOwnProfile && sessionStorage.getItem('token') && (
              <Button
                onClick={loadBlurredImages}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2 border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">ดูรูปเบลอ (10,000 เหรียญ/รูป)</span>
                <span className="sm:hidden">รูปเบลอ</span>
              </Button>
            )}
          </div>

          {/* ปุ่มสำหรับเจ้าของโปรไฟล์ */}
          {isOwnProfile && sessionStorage.getItem('token') && (
            <div className="flex flex-col sm:flex-row gap-2">
              
              {/* ปุ่มทดสอบเบลอรูปหลัก */}
              {canBlurImages() && (
                <Button
                  onClick={async () => {
                    const mainImageIndex = profileData.mainProfileImageIndex || 0;
                    const mainImage = profileData.profileImages?.[mainImageIndex];
                    const isMainImageBlurred = typeof mainImage === 'object' && mainImage.isBlurred;
                    
                    if (isMainImageBlurred) {
                      // ยกเลิกเบลอ
                      await unblurSelectedImages();
                    } else {
                      // เบลอรูปหลัก
                      setSelectedImages([mainImageIndex]);
                      await blurSelectedImages();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  disabled={isBlurring || isUnblurring}
                >
                  {(() => {
                    const mainImageIndex = profileData.mainProfileImageIndex || 0;
                    const mainImage = profileData.profileImages?.[mainImageIndex];
                    const isMainImageBlurred = typeof mainImage === 'object' && mainImage.isBlurred;
                    
                    if (isBlurring || isUnblurring) {
                      return (
                        <>
                          <div className="animate-spin h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full mr-1" />
                          กำลังประมวลผล...
                        </>
                      );
                    }
                    
                    return isMainImageBlurred ? (
                      <>
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">ยกเลิกเบลอรูปหลัก</span>
                        <span className="sm:hidden">ยกเลิกเบลอ</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">เบลอรูปหลัก</span>
                        <span className="sm:hidden">เบลอ</span>
                      </>
                    );
                  })()}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Mobile-First Bio */}
        {profileData.bio && (
          <div className="mb-4 sm:mb-6">
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{profileData.bio}</p>
          </div>
        )}

        {/* Mobile-First Profile Images */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-semibold flex items-center">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-pink-500" />
              รูปภาพ
              {membershipData && (
                <span className="ml-2 text-xs sm:text-sm text-gray-500">
                  ({profileData.profileImages ? profileData.profileImages.filter(img => {
                    const imagePath = typeof img === 'string' ? img : img?.url || '';
                    return !imagePath.startsWith('data:image/svg+xml');
                  }).length : 0}/{membershipData.limits.dailyImages === -1 ? 'ไม่จำกัด' : membershipData.limits.dailyImages})
                </span>
              )}
            </h3>
            {isOwnProfile && sessionStorage.getItem('token') && (
              <div className="relative w-full sm:w-auto flex flex-col gap-2">
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
                  className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  {uploadingImage ? (
                    <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-pink-500 border-t-transparent rounded-full mr-1 sm:mr-2" />
                  ) : (
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  )}
                  เพิ่มรูป
                </Button>
              </div>
            )}
          </div>

          {/* คำแนะนำการเลือกรูปหลัก */}
          {isOwnProfile && sessionStorage.getItem('token') && (() => {
            const hasRealImages = profileData?.profileImages?.some(img => {
              const imagePath = typeof img === 'string' ? img : img?.url || '';
              return !imagePath.startsWith('data:image/svg+xml');
            });
            const mainImageIndex = profileData?.mainProfileImageIndex ?? 0;
            const mainImage = profileData?.profileImages?.[mainImageIndex];
            const mainImagePath = typeof mainImage === 'string' ? mainImage : mainImage?.url || '';
            const isMainImageDefault = mainImagePath.startsWith('data:image/svg+xml');
            
            if (hasRealImages && isMainImageDefault) {
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs sm:text-sm text-amber-800">
                    <strong className="font-semibold">คำเตือน:</strong> กรุณาคลิกที่รูปภาพที่คุณต้องการเพื่อตั้งเป็นรูปโปรไฟล์หลัก ระบบจะบันทึกได้ก็ต่อเมื่อคุณเลือกรูปจริงเป็นรูปหลักแล้ว
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Image Selection Controls */}
          {(() => {
            const showControls = isOwnProfile && sessionStorage.getItem('token') && canBlurImages();
            const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
            console.log('🔍 Image Selection Controls Debug:', {
              isOwnProfile,
              hasToken: !!sessionStorage.getItem('token'),
              canBlur: canBlurImages(),
              showControls,
              membershipTier: profileData?.membership?.tier,
              userRole: currentUser.role,
              isSuperAdmin: currentUser.role === 'superadmin',
              blurredImagesLimit: profileData?.membership?.blurredImages || 0
            });
            return showControls;
          })() && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="select-all-images"
                    checked={selectedImages.length > 0 && selectedImages.length === profileData.profileImages.filter(img => {
                      const imagePath = typeof img === 'string' ? img : img?.url || '';
                      return !imagePath.startsWith('data:image/svg+xml');
                    }).length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allImageIndices = profileData.profileImages
                          .map((img, index) => {
                            const imagePath = typeof img === 'string' ? img : img?.url || '';
                            return imagePath.startsWith('data:image/svg+xml') ? null : index;
                          })
                          .filter(index => index !== null);
                        setSelectedImages(allImageIndices);
                      } else {
                        setSelectedImages([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="select-all-images" className="text-sm font-medium text-gray-700">
                    เลือกทั้งหมด ({selectedImages.length} รูป)
                    {(() => {
                      const membership = profileData?.membership;
                      const blurredImagesLimit = membership?.blurredImages || 0;
                      const currentBlurredCount = (profileData?.profileImages || []).filter(img => 
                        typeof img === 'object' && img.isBlurred
                      ).length;
                      
                      // ตรวจสอบว่าเป็น superadmin หรือไม่
                      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
                      const isSuperAdmin = currentUser.role === 'superadmin';
                      
                      if (isSuperAdmin) {
                        return (
                          <span className="ml-2 text-xs text-red-600 font-bold">
                            (Superadmin - เบลอได้ไม่จำกัด, เบลอแล้ว {currentBlurredCount} รูป)
                          </span>
                        );
                      } else if (blurredImagesLimit > 0) {
                        return (
                          <span className="ml-2 text-xs text-blue-600">
                            (เบลอได้ {blurredImagesLimit} รูป, เบลอแล้ว {currentBlurredCount} รูป)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </label>
                </div>
                
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {console.log('🔒 Rendering blur buttons, selectedImages:', selectedImages)}
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // ป้องกันการกดเร็วเกินไป (debounce 500ms)
                    const now = Date.now();
                    if (now - lastClickTimeRef.current.blur < 500) {
                      console.log('❌ Blur click too fast, ignoring');
                      return;
                    }
                    lastClickTimeRef.current.blur = now;
                    
                    console.log('🔒 Blur button clicked!');
                    console.log('🔒 About to check isBlurring:', isBlurring);
                    if (!isBlurring) {
                      console.log('🔒 Calling blurSelectedImages...');
                      blurSelectedImages();
                    } else {
                      console.log('❌ Already blurring, skipping call');
                    }
                  }}
                  disabled={isBlurring}
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  type="button"
                >
                      {isBlurring ? (
                        <div className="animate-spin h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full mr-1" />
                      ) : (
                        <EyeOff className="h-3 w-3 mr-1" />
                      )}
                      เบลอรูป ({selectedImages.length})
                    </Button>
                    
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // ป้องกันการกดเร็วเกินไป (debounce 500ms)
                    const now = Date.now();
                    if (now - lastClickTimeRef.current.unblur < 500) {
                      console.log('❌ Unblur click too fast, ignoring');
                      return;
                    }
                    lastClickTimeRef.current.unblur = now;
                    
                    console.log('🔓 Unblur button clicked!');
                    if (!isUnblurring) {
                      unblurSelectedImages();
                    }
                  }}
                  disabled={isUnblurring}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  type="button"
                >
                      {isUnblurring ? (
                        <div className="animate-spin h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full mr-1" />
                      ) : (
                        <Eye className="h-3 w-3 mr-1" />
                      )}
                      ยกเลิกเบลอ ({selectedImages.length})
                    </Button>
                    
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Gallery with Proper Aspect Ratio */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {profileData.profileImages && profileData.profileImages.length > 0 && !profileData.profileImages.every(img => {
              const imagePath = typeof img === 'string' ? img : img?.url || '';
              return imagePath.startsWith('data:image/svg+xml');
            }) ? (
              profileData.profileImages.map((image, originalIndex) => {
                // ข้ามรูป default
                const imagePath = typeof image === 'string' ? image : image?.url || '';
                if (imagePath.startsWith('data:image/svg+xml')) return null;
                
                // ตรวจสอบว่าเป็น preview image หรือไม่
                const isPreviewImage = imagePath.startsWith('data:image/');
                
                // สร้าง image URL ที่ถูกต้อง
                const imageUrl = isPreviewImage ? image : getProfileImageUrl(image, userId)
                
                
                // ตรวจสอบว่ารูปนี้เบลอหรือไม่
                const isBlurred = typeof image === 'object' && image.isBlurred;
                const imageUrlToShow = isBlurred ? image.url : image;
                const finalImageUrl = isPreviewImage ? imageUrl : getProfileImageUrl(imageUrlToShow, userId);
                
                // Debug blur status
                console.log('🔍 Image blur debug:', {
                  originalIndex,
                  imageType: typeof image,
                  isBlurred,
                  hasBlurredProperty: image?.isBlurred,
                  imageValue: image,
                  imageUrlToShow,
                  finalImageUrl
                });

                return (
                <div key={originalIndex} className="relative group">
                  {/* Checkbox สำหรับเลือกรูป */}
                  {(() => {
                    const isMainImage = originalIndex === (profileData.mainProfileImageIndex || 0);
                    const showCheckbox = isOwnProfile && sessionStorage.getItem('token') && canBlurImages() && !isPreviewImage && !isMainImage;
                    console.log('🔍 Checkbox Debug for image', originalIndex, ':', {
                      isOwnProfile,
                      hasToken: !!sessionStorage.getItem('token'),
                      canBlur: canBlurImages(),
                      isPreviewImage,
                      isMainImage,
                      mainProfileImageIndex: profileData.mainProfileImageIndex,
                      showCheckbox
                    });
                    return showCheckbox;
                  })() && (
                    <div 
                      className="absolute top-2 left-2 z-30"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 Checkbox container clicked for image', originalIndex);
                        const isMainImage = originalIndex === (profileData.mainProfileImageIndex || 0);
                        if (isMainImage) {
                          showError('ไม่สามารถเบลอรูปโปรไฟล์หลักได้ กรุณาเลือกรูปอื่น');
                          return;
                        }
                        toggleImageSelection(originalIndex);
                      }}
                      style={{ 
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        width: '24px',
                        height: '24px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(originalIndex)}
                        onChange={() => {}} // Empty handler since we handle click on container
                        className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        style={{ 
                          pointerEvents: 'none',
                          margin: 0
                        }}
                        readOnly
                      />
                    </div>
                  )}
                  
                  <div 
                    className={`aspect-square w-full bg-gray-100 rounded-lg overflow-hidden ${
                      originalIndex === (profileData.mainProfileImageIndex || 0) 
                        ? 'ring-4 ring-red-500 ring-opacity-75 shadow-lg profile-image-main' 
                        : 'ring-2 ring-transparent hover:ring-red-300 hover:ring-opacity-50'
                    } transition-all duration-300 ${isPreviewImage ? 'opacity-75' : ''} ${selectedImages.includes(originalIndex) ? 'ring-4 ring-blue-500 ring-opacity-75' : ''}`}
                    onClick={(e) => {
                      // ป้องกันการคลิกที่รูปเมื่อมี checkbox
                      if (isOwnProfile && sessionStorage.getItem('token') && canBlurImages() && !isPreviewImage) {
                        const isMainImage = originalIndex === (profileData.mainProfileImageIndex || 0);
                        if (!isMainImage) {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔍 Image clicked for selection:', originalIndex);
                          toggleImageSelection(originalIndex);
                        }
                      }
                    }}
                    style={{ 
                      cursor: isOwnProfile && sessionStorage.getItem('token') && canBlurImages() && !isPreviewImage && originalIndex !== (profileData.mainProfileImageIndex || 0) ? 'pointer' : 'default',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={finalImageUrl}
                      alt={`Profile ${originalIndex + 1}`}
                      className={`w-full h-full object-cover object-center ${isBlurred ? 'blur-sm filter' : ''}`}
                      style={{ 
                        objectFit: 'cover',
                        ...(isBlurred && { 
                          filter: 'blur(8px)',
                          transition: 'filter 0.3s ease'
                        })
                      }}
                      onError={(e) => {
                        if (!isPreviewImage) {
                          console.error('❌ Gallery image failed to load:', finalImageUrl);
                          e.target.style.display = 'none';
                        }
                      }}
                      onLoad={() => {
                        if (!isPreviewImage) {
                          console.log('✅ Gallery image loaded successfully');
                        }
                      }}
                    />
                    
                    {/* Overlay สำหรับรูปที่เบลอ */}
                    {isBlurred && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="text-white text-center bg-black bg-opacity-70 px-3 py-2 rounded-lg">
                          <EyeOff className="h-6 w-6 mx-auto mb-1" />
                          <span className="text-xs font-bold">รูปเบลอ</span>
                          <div className="text-xs opacity-75 mt-1">Blurred Image</div>
                        </div>
                      </div>
                    )}
                    {/* แสดง loading indicator สำหรับ preview images */}
                    {isPreviewImage && uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  {isOwnProfile && sessionStorage.getItem('token') && !isPreviewImage && (
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex space-x-1">
                      {/* ปุ่มตั้งรูปโปรไฟล์หลัก */}
                      <button
                        onClick={() => setMainProfileImage(originalIndex)}
                        className="bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ตั้งเป็นรูปโปรไฟล์หลัก"
                      >
                        <Star className="h-2 w-2 sm:h-3 sm:w-3" />
                      </button>
                      {/* ปุ่มลบรูป */}
                      <button
                        onClick={() => deleteImage(originalIndex)}
                        className="bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ลบรูปภาพ"
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </button>
                    </div>
                  )}
                  {/* แสดงเครื่องหมายรูปโปรไฟล์หลัก */}
                  {originalIndex === (profileData.mainProfileImageIndex || 0) && !isPreviewImage && (
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-red-500 text-white rounded-full px-1 py-0.5 sm:px-2 sm:py-1 text-xs flex items-center shadow-lg">
                      <Star className="h-2 w-2 mr-1 fill-current" />
                      รูปหลัก
                    </div>
                  )}
                  {/* แสดงสถานะการอัพโหลดสำหรับ preview images */}
                  {isPreviewImage && (
                    <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-blue-500 text-white rounded-full px-1 py-0.5 sm:px-2 sm:py-1 text-xs flex items-center shadow-lg">
                      <Upload className="h-2 w-2 mr-1" />
                      กำลังอัพโหลด...
                    </div>
                  )}
                </div>
                );
              }).filter(Boolean)
            ) : (
              // Empty state when no images
              <div className="col-span-2 md:col-span-4">
                <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">ยังไม่มีรูปภาพ</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* New Simple Tabs Design */}
      <div className="mt-8 mb-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 bg-white border rounded-lg p-1 h-auto">
            <TabsTrigger 
              value="basic"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              ข้อมูลพื้นฐาน
            </TabsTrigger>
            <TabsTrigger 
              value="lifestyle"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              ไลฟ์สไตล์
            </TabsTrigger>
            <TabsTrigger 
              value="interests"
              className="text-xs sm:text-sm py-2 px-1 sm:px-3 rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              ความสนใจ
            </TabsTrigger>
          </TabsList>

          {/* Content with Clear Spacing */}
          <TabsContent value="basic" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-white" />
              </div>
              ข้อมูลส่วนตัว
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Enhanced Occupation */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">อาชีพ</p>
                  <p className="text-sm text-gray-700 mb-1">{profileData.occupation?.job || 'ยังไม่ได้ระบุ'}</p>
                  {profileData.occupation?.company && (
                    <p className="text-xs text-gray-600">{profileData.occupation.company}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Education */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">จบสถาบันศึกษา</p>
                  <p className="text-sm text-gray-700 mb-1">{profileData.education?.institution || 'ยังไม่ได้ระบุ'}</p>
                  {profileData.education?.level && (
                    <p className="text-xs text-gray-600">ระดับ: {getEducationLabel(profileData.education.level)}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Physical Attributes */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Ruler className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">ร่างกาย</p>
                  <p className="text-sm text-gray-700">
                    {profileData.physicalAttributes?.height || profileData.physicalAttributes?.weight ? (
                      <>
                        {profileData.physicalAttributes?.height ? `${profileData.physicalAttributes.height} ซม.` : ''}
                        {profileData.physicalAttributes?.height && profileData.physicalAttributes?.weight ? ' / ' : ''}
                        {profileData.physicalAttributes?.weight ? `${profileData.physicalAttributes.weight} กก.` : ''}
                      </>
                    ) : (
                      'ยังไม่ได้ระบุ'
                    )}
                  </p>
                </div>
              </div>

              {/* Enhanced Religion */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Church className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">ศาสนา</p>
                  <p className="text-sm text-gray-700">{profileData.religion ? getReligionLabel(profileData.religion) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              {/* Enhanced Languages */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Languages className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">ภาษา</p>
                  <p className="text-sm text-gray-700">
                    {Array.isArray(profileData.languages) && profileData.languages.length > 0
                      ? profileData.languages.join(', ')
                      : 'ยังไม่ได้ระบุ'}
                  </p>
                </div>
              </div>

              {/* Enhanced Pets */}
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Dog className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">สัตว์เลี้ยง</p>
                  <p className="text-sm text-gray-700">
                    {(() => {
                      const petArray = Array.isArray(profileData.pets)
                        ? profileData.pets
                        : (profileData.pets?.petTypes || []);
                      if (!petArray || petArray.length === 0) return 'ยังไม่ได้ระบุ';
                      const counter = petArray.reduce((acc, t) => {
                        acc[t] = (acc[t] || 0) + 1; return acc;
                      }, {});
                      return Object.entries(counter)
                        .map(([type, count]) => `${getPetTypeLabel(type)} ${count} ตัว`)
                        .join(', ');
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

          <TabsContent value="lifestyle" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <Heart className="h-4 w-4 text-white" />
              </div>
              ไลฟ์สไตล์
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Cigarette className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">การสูบบุหรี่</p>
                  <p className="text-sm text-gray-700">{profileData.lifestyle?.smoking ? getLifestyleLabel('smoking', profileData.lifestyle.smoking) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wine className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">การดื่มสุรา</p>
                  <p className="text-sm text-gray-700">{profileData.lifestyle?.drinking ? getLifestyleLabel('drinking', profileData.lifestyle.drinking) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">การออกกำลังกาย</p>
                  <p className="text-sm text-gray-700">{profileData.lifestyle?.exercise ? getLifestyleLabel('exercise', profileData.lifestyle.exercise) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Utensils className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm sm:text-base text-gray-800 mb-1">อาหาร</p>
                  <p className="text-sm text-gray-700">{profileData.lifestyle?.diet ? getLifestyleLabel('diet', profileData.lifestyle.diet) : 'ยังไม่ได้ระบุ'}</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

          <TabsContent value="interests" className="mt-6">
            <Card className="p-4 sm:p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <Star className="h-4 w-4 text-white" />
              </div>
              ความสนใจ
            </h3>
            
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {[
                { key: 'sports', label: 'กิจกรรมที่ชอบ', testData: 'ดูหนัง, ฟังเพลง, เล่นเกม', icon: <Dumbbell className="h-4 w-4" />, color: 'from-blue-500 to-cyan-500', bgColor: 'from-blue-50 to-cyan-50', borderColor: 'border-blue-200' },
                { key: 'music', label: 'เพลงที่ชอบ', testData: 'Hello Goodbye - The Beatles', icon: <Music className="h-4 w-4" />, color: 'from-purple-500 to-pink-500', bgColor: 'from-purple-50 to-pink-50', borderColor: 'border-purple-200' },
                { key: 'movies', label: 'หนังที่ชอบ', testData: 'Interstellar, Oppenheimer', icon: <Film className="h-4 w-4" />, color: 'from-green-500 to-emerald-500', bgColor: 'from-green-50 to-emerald-50', borderColor: 'border-green-200' }
              ].map((item) => {
                // ใช้ข้อมูลจาก sessionStorage ชั่วคราว
                const savedData = sessionStorage.getItem(`interest_${item.key}`) || '';
                const description = savedData || item.testData || '';
                
                return (
                  <div key={item.key} className={`p-4 bg-gradient-to-r ${item.bgColor} rounded-lg border ${item.borderColor}`}>
                    <div className="flex items-center mb-3">
                      <div className={`w-8 h-8 bg-gradient-to-r ${item.color} rounded-lg flex items-center justify-center mr-3`}>
                        {item.icon}
                      </div>
                      <h4 className="font-semibold text-gray-800">{item.label}</h4>
                    </div>
                    <div className="text-sm text-gray-700">
                      {description ? (
                        description.includes(',') ? (
                          <div className="flex flex-wrap gap-2">
                            {description.split(',').map((desc, index) => (
                              <span key={index} className="inline-block bg-white/80 text-gray-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm border">
                                {desc.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="bg-white/60 p-3 rounded-lg">{description}</p>
                        )
                      ) : (
                        <p className="text-gray-500 bg-white/40 p-3 rounded-lg">ยังไม่ได้ระบุ</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        </Tabs>
      </div>

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
              <h4 className="font-semibold text-lg text-blue-600 flex items-center">
                📋 ข้อมูลพื้นฐาน
              </h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="displayName">ชื่อที่แสดง <span className="text-red-500">*</span></Label>
                  <Input
                    id="displayName"
                    value={editData.displayName || ''}
                    onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                    placeholder="ชื่อที่จะแสดงในโปรไฟล์ของคุณ"
                    className="font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    นี่คือชื่อที่จะแสดงให้ผู้อื่นเห็นทั่วทั้งเว็บไซต์
                  </p>
                </div>
              </div>
              
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
                  <Label htmlFor="location">ที่อยู่ (จังหวัด)</Label>
                  <select
                    id="location"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({...editData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">เลือกจังหวัด</option>
                    {thaiProvinces.map((province, index) => (
                      <option key={index} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Occupation + Education Level */}
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

              {/* Institution + Languages (same row) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div>
                  <Label htmlFor="languages">ภาษาที่พูดได้</Label>
                  <Input
                    id="languages"
                    value={editData.languages?.join(', ') || ''}
                    onChange={(e) => setEditData({
                      ...editData, 
                      languages: e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang)
                    })}
                    placeholder="ตัวอย่าง: ไทย, อังกฤษ, จีน"
                  />
                </div>
              </div>

              {/* Religion + Pets (same row) */}
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
                    <option value="buddhist">พุทธ</option>
                    <option value="christian">คริสต์</option>
                    <option value="muslim">อิสลาม</option>
                    <option value="hindu">ฮินดู</option>
                    <option value="other">อื่นๆ</option>
                    <option value="none">ไม่มีศาสนา</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="pets">สัตว์เลี้ยง</Label>
                  <Input
                    id="pets"
                    value={petsInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPetsInput(value);
                      setEditData({
                        ...editData,
                        pets: normalizePetsInputToTypes(value)
                      });
                    }}
                    placeholder="แมว 1 ตัว, สุนัข 1 ตัว"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-indigo-600 flex items-center">
                  💬 เกี่ยวกับฉัน
                </h4>
                
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

            </div>

            {/* Lifestyle */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-green-600 flex items-center">
                🌟 ไลฟ์สไตล์
              </h4>
              
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
                    <option value="never">ไม่สูบบุหรี่</option>
                    <option value="regularly">สูบบุหรี่</option>
                    <option value="occasionally">สูบเป็นครั้งคราว</option>
                    <option value="trying_to_quit">เลิกสูบแล้ว</option>
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
                    <option value="never">ไม่ดื่มสุรา</option>
                    <option value="regularly">ดื่มสุรา</option>
                    <option value="socially">ดื่มในงานสังคม</option>
                    <option value="occasionally">ดื่มเป็นครั้งคราว</option>
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
                    <option value="regularly">ออกกำลังกายสม่ำเสมอ</option>
                    <option value="sometimes">ออกกำลังกายเป็นครั้งคราว</option>
                    <option value="rarely">แทบไม่ออกกำลังกาย</option>
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
                    <option value="omnivore">ทานอาหารทั่วไป</option>
                    <option value="vegetarian">มังสวิรัติ</option>
                    <option value="vegan">วีแกน</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interests (editable) */}
            <div className="space-y-2 mt-6">
              <h4 className="font-semibold text-lg text-orange-600 flex items-center">
                🎯 ความสนใจ
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: 'sports', label: 'กิจกรรมที่ชอบ' },
                  { key: 'music', label: 'เพลงที่ชอบ' },
                  { key: 'movies', label: 'หนังที่ชอบ' }
                ].map((item) => {
                  const currentList = Array.isArray(editData.interests) ? editData.interests : [];
                  const existing = currentList.find(i => i.category === item.key);
                  const savedData = sessionStorage.getItem(`interest_${item.key}`) || '';
                  const value = existing?.description || savedData || '';
                  return (
                    <div key={item.key}>
                      <Label htmlFor={`interest-${item.key}`}>
                        {item.label}
                      </Label>
                      <Input
                        id={`interest-${item.key}`}
                        value={value}
                        onChange={(e) => {
                          const desc = e.target.value;
                          
                          // บันทึกใน sessionStorage ชั่วคราว
                          if (desc.trim()) {
                            sessionStorage.setItem(`interest_${item.key}`, desc);
                          } else {
                            sessionStorage.removeItem(`interest_${item.key}`);
                          }
                          
                          const updated = [...currentList];
                          const idx = updated.findIndex(i => i.category === item.key);
                          if (desc.trim() === '') {
                            if (idx !== -1) updated.splice(idx, 1);
                          } else {
                            if (idx === -1) updated.push({ category: item.key, description: desc });
                            else updated[idx] = { ...updated[idx], description: desc };
                          }
                          setEditData({ ...editData, interests: updated });
                        }}
                        placeholder={
                          item.key === 'sports' ? 'ดูหนัง, ฟังเพลง, เล่นเกม' :
                          item.key === 'music' ? 'เพลงโปรดของคุณ....' :
                          'หนังโปรดของคุณคือ....'
                        }
                      />
                    </div>
                  );
                })}
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

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setImageToCrop(null);
        }}
        imageFile={imageToCrop}
        onCropComplete={handleCropComplete}
        aspectRatio={1} // Square crop
        minCropSize={100}
      />

      {/* Blurred Images Modal */}
      <Dialog open={showBlurredImages} onOpenChange={setShowBlurredImages}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-orange-500" />
              รูปเบลอของ {profileData?.displayName || profileData?.username}
            </DialogTitle>
            <DialogDescription>
              คลิกซื้อรูปด้วย 10,000 เหรียญต่อรูป เจ้าของรูปได้ 5,000 เหรียญ ระบบได้ 5,000 เหรียญ
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {blurredImages.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <EyeOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">ไม่มีรูปเบลอ</p>
              </div>
            ) : (
              blurredImages.map((image, index) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square relative overflow-hidden rounded-lg border-2 border-gray-200">
                    {/* รูปเบลอ */}
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/${image.url}`}
                      alt={`Blurred image ${index + 1}`}
                      className={`w-full h-full object-cover ${image.isPurchased ? '' : 'filter blur-lg'}`}
                    />
                    
                    {/* Overlay สำหรับรูปที่ยังไม่ซื้อ */}
                    {!image.isPurchased && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <EyeOff className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-semibold">รูปเบลอ</p>
                          <p className="text-xs">10,000 เหรียญ/รูป</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* ปุ่มซื้อ */}
                  {!image.isPurchased && (
                    <Button
                      onClick={() => purchaseBlurredImage(image.id, userId)}
                      disabled={purchasingImage === image.id}
                      className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white"
                      size="sm"
                    >
                      {purchasingImage === image.id ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          กำลังซื้อ...
                        </>
                      ) : (
                        <>
                          <Coins className="h-4 w-4 mr-2" />
                          ซื้อรูปนี้ 10,000 เหรียญ
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* แสดงสถานะซื้อแล้ว */}
                  {image.isPurchased && (
                    <div className="w-full mt-2 p-2 bg-green-100 text-green-800 text-center text-sm rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ซื้อแล้ว
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserProfile;