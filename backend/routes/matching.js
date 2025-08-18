const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// ฟังก์ชันคำนวณระยะทางระหว่างพิกัด
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // รัศมีโลกในกิโลเมตร
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// ฟังก์ชันคำนวณความเข้ากันได้ด้วย AI
const calculateCompatibilityScore = (user, match, userLocation) => {
  let score = 0;
  const factors = [];

  // 1. ระยะทาง (40%)
  if (userLocation && match.gpsLocation) {
    const distance = calculateDistance(
      userLocation.lat, userLocation.lng,
      match.gpsLocation.lat, match.gpsLocation.lng
    );
    const distanceScore = Math.max(0, 40 - (distance / 40) * 40);
    score += distanceScore;
    factors.push({ 
      factor: 'ระยะทาง', 
      score: Math.round(distanceScore), 
      detail: `${distance.toFixed(1)} กม.` 
    });
  } else {
    // ถ้าไม่มีตำแหน่ง ให้คะแนนกลาง
    score += 20;
    factors.push({ 
      factor: 'ระยะทาง', 
      score: 20, 
      detail: 'ไม่ระบุตำแหน่ง' 
    });
  }

  // 2. อายุ (20%)
  if (user.dateOfBirth && match.dateOfBirth) {
    const userAge = Math.floor((new Date() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    const matchAge = Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    const ageDiff = Math.abs(userAge - matchAge);
    const ageScore = Math.max(0, 20 - ageDiff * 2);
    score += ageScore;
    factors.push({ 
      factor: 'อายุ', 
      score: Math.round(ageScore), 
      detail: `ต่างกัน ${ageDiff} ปี` 
    });
  } else {
    // ถ้าไม่มีข้อมูลอายุ ให้คะแนนกลาง
    score += 10;
    factors.push({ 
      factor: 'อายุ', 
      score: 10, 
      detail: 'ไม่ระบุอายุ' 
    });
  }

  // 3. ความสนใจ (20%)
  if (user.interests && match.interests && user.interests.length > 0 && match.interests.length > 0) {
    const userInterestItems = user.interests.flatMap(interest => interest.items || []);
    const matchInterestItems = match.interests.flatMap(interest => interest.items || []);
    const commonInterests = userInterestItems.filter(interest => 
      matchInterestItems.includes(interest)
    );
    const interestScore = (commonInterests.length / Math.max(userInterestItems.length, matchInterestItems.length)) * 20;
    score += interestScore;
    factors.push({ 
      factor: 'ความสนใจ', 
      score: Math.round(interestScore), 
      detail: `${commonInterests.length} รายการร่วมกัน` 
    });
  }

  // 4. ไลฟ์สไตล์ (15%)
  if (user.lifestyle && match.lifestyle) {
    const lifestyleMatches = Object.keys(user.lifestyle).filter(key => 
      user.lifestyle[key] === match.lifestyle[key]
    );
    const lifestyleScore = (lifestyleMatches.length / Object.keys(user.lifestyle).length) * 15;
    score += lifestyleScore;
    factors.push({ 
      factor: 'ไลฟ์สไตล์', 
      score: Math.round(lifestyleScore), 
      detail: `${lifestyleMatches.length} ด้านตรงกัน` 
    });
  }

  // 5. ระดับสมาชิก (5%)
  const tierScore = 5; // ให้คะแนนเท่ากันสำหรับ demo
  score += tierScore;
  factors.push({ 
    factor: 'ระดับสมาชิก', 
    score: tierScore, 
    detail: 'Premium' 
  });

  return { score: Math.round(score), factors };
};

// GET /api/matching/ai-matches - ดึง AI matches
router.get('/ai-matches', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      maxDistance = 40,
      minAge = 18,
      maxAge = 60,
      interests = [],
      lifestyle = []
    } = req.query;

    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // สร้าง query filters
    const filters = {
      _id: { $ne: userId }, // ไม่รวมตัวเอง
      isActive: true
    };

    // กรองตามอายุ (ถ้ามี dateOfBirth)
    if (user.dateOfBirth) {
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - parseInt(maxAge));
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - parseInt(minAge));
      
      filters.dateOfBirth = { $gte: minDate, $lte: maxDate };
    }

    // กรองตามความสนใจ
    if (interests.length > 0) {
      filters['interests.items'] = { $in: interests };
    }

    // กรองตามไลฟ์สไตล์
    if (lifestyle.length > 0) {
      const lifestyleFilters = {};
      lifestyle.forEach(item => {
        const [key, value] = item.split(':');
        if (key && value) {
          lifestyleFilters[`lifestyle.${key}`] = value;
        }
      });
      if (Object.keys(lifestyleFilters).length > 0) {
        Object.assign(filters, lifestyleFilters);
      }
    }

    // คำนวณ skip สำหรับ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงข้อมูลผู้ใช้ทั้งหมดที่ตรงตามเงื่อนไข
    const allUsers = await User.find(filters)
      .select('_id firstName lastName displayName dateOfBirth profileImages gpsLocation interests lifestyle membership bio lastActive')
      .limit(parseInt(limit) * 3); // ดึงมากกว่าเพื่อกรองตามระยะทาง

    // ตรวจสอบว่าผู้ใช้มีตำแหน่งหรือไม่
    if (!user.gpsLocation) {
      // ถ้าไม่มีตำแหน่ง ให้ส่งข้อมูลแบบไม่มีระยะทาง
      const usersWithScore = allUsers.map(match => {
        const compatibility = calculateCompatibilityScore(user, match, null);
        
        // คำนวณอายุ
        const age = match.dateOfBirth 
          ? Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : 25; // ค่าเริ่มต้น

        return {
          ...match.toObject(),
          name: match.displayName || `${match.firstName || ''} ${match.lastName || ''}`.trim() || 'ผู้ใช้',
          age: age,
          compatibilityScore: compatibility.score,
          compatibilityFactors: compatibility.factors,
          distance: 0,
          distanceText: 'ไม่ระบุ',
          membershipTier: match.membership?.tier || 'member'
        };
      });

      const filteredUsers = usersWithScore
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, parseInt(limit));

      return res.json({
        success: true,
        data: {
          matches: filteredUsers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: allUsers.length,
            hasMore: false
          },
          stats: {
            totalMatches: allUsers.length,
            averageDistance: 0,
            averageScore: filteredUsers.length > 0 
              ? Math.round(filteredUsers.reduce((sum, match) => sum + match.compatibilityScore, 0) / filteredUsers.length)
              : 0
          }
        }
      });
    }

    // คำนวณความเข้ากันได้และระยะทาง
    const usersWithScore = allUsers.map(match => {
      const compatibility = calculateCompatibilityScore(user, match, user.gpsLocation);
      
      let distance = 0;
      let distanceText = 'ไม่ระบุ';
      
      if (user.gpsLocation && match.gpsLocation) {
        distance = calculateDistance(
          user.gpsLocation.lat, user.gpsLocation.lng,
          match.gpsLocation.lat, match.gpsLocation.lng
        );
        distanceText = distance < 1 ? `${Math.round(distance * 1000)} ม.` : `${distance.toFixed(1)} กม.`;
      } else if (!user.gpsLocation) {
        distanceText = 'คุณยังไม่ได้ตั้งค่าตำแหน่ง';
      } else if (!match.gpsLocation) {
        distanceText = 'ผู้ใช้นี้ยังไม่ได้ตั้งค่าตำแหน่ง';
      }

      // คำนวณอายุ
      const age = match.dateOfBirth 
        ? Math.floor((new Date() - new Date(match.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
        : 25; // ค่าเริ่มต้น

      return {
        ...match.toObject(),
        name: match.displayName || `${match.firstName || ''} ${match.lastName || ''}`.trim() || 'ผู้ใช้',
        age: age,
        compatibilityScore: compatibility.score,
        compatibilityFactors: compatibility.factors,
        distance: distance,
        distanceText: distanceText,
        membershipTier: match.membership?.tier || 'member'
      };
    });

    // กรองและเรียงลำดับตามคะแนน (ไม่กรองตามระยะทางถ้าไม่มี gpsLocation)
    const filteredUsers = usersWithScore
      .filter(match => {
        // ถ้า user ปัจจุบันไม่มี gpsLocation หรือ match ไม่มี gpsLocation ให้แสดง
        if (!user.gpsLocation || !match.gpsLocation) {
          return true;
        }
        // ถ้ามี gpsLocation ทั้งคู่ ให้กรองตามระยะทาง
        return match.distance <= parseInt(maxDistance);
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, parseInt(limit));

    // นับจำนวนทั้งหมด (แบบง่าย)
    const totalCount = allUsers.length;

    res.json({
      success: true,
      data: {
        matches: filteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          hasMore: skip + filteredUsers.length < totalCount
        },
        stats: {
          totalMatches: totalCount,
          averageDistance: filteredUsers.length > 0 
            ? (filteredUsers.reduce((sum, match) => sum + match.distance, 0) / filteredUsers.length).toFixed(1)
            : 0,
          averageScore: filteredUsers.length > 0 
            ? Math.round(filteredUsers.reduce((sum, match) => sum + match.compatibilityScore, 0) / filteredUsers.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI matches:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล matches'
    });
  }
});

// POST /api/matching/like - กดไลค์ match
router.post('/like', auth, async (req, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.id;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ matchId'
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่ถูกไลค์มีอยู่จริง
    const matchUser = await User.findById(matchId);
    if (!matchUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ระบุ'
      });
    }

    // ตรวจสอบว่าไลค์ตัวเองไม่ได้
    if (userId === matchId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถไลค์ตัวเองได้'
      });
    }

    // ตรวจสอบว่าเคยไลค์แล้วหรือไม่
    const existingLike = await User.findOne({
      _id: userId,
      likes: matchId
    });

    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'คุณได้ไลค์ผู้ใช้นี้แล้ว'
      });
    }

    // เพิ่มไลค์
    await User.findByIdAndUpdate(userId, {
      $addToSet: { likes: matchId }
    });

    // ตรวจสอบว่าเป็น mutual like หรือไม่
    const isMutualLike = await User.findOne({
      _id: matchId,
      likes: userId
    });

    if (isMutualLike) {
      // สร้าง notification สำหรับ mutual like
      // ในระบบจริงจะส่ง notification
      console.log(`Mutual like between ${userId} and ${matchId}`);
    }

    res.json({
      success: true,
      message: 'ไลค์สำเร็จ',
      data: {
        isMutualLike: !!isMutualLike
      }
    });

  } catch (error) {
    console.error('Error liking match:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการไลค์'
    });
  }
});

// POST /api/matching/send-message - ส่งข้อความ
router.post('/send-message', auth, async (req, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.id;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ matchId'
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่ส่งข้อความมีอยู่จริง
    const matchUser = await User.findById(matchId);
    if (!matchUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ระบุ'
      });
    }

    // ตรวจสอบว่าไม่ส่งข้อความให้ตัวเอง
    if (userId === matchId) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถส่งข้อความให้ตัวเองได้'
      });
    }

    // ในระบบจริงจะสร้างข้อความหรือเปิดแชท
    // สำหรับตอนนี้ให้ส่ง success response
    res.json({
      success: true,
      message: 'ส่งข้อความสำเร็จ',
      data: {
        matchId: matchId,
        message: 'ข้อความถูกส่งแล้ว'
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
    });
  }
});

// POST /api/matching/unlike - ยกเลิกไลค์
router.post('/unlike', auth, async (req, res) => {
  try {
    const { matchId } = req.body;
    const userId = req.user.id;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ matchId'
      });
    }

    // ลบไลค์
    await User.findByIdAndUpdate(userId, {
      $pull: { likes: matchId }
    });

    res.json({
      success: true,
      message: 'ยกเลิกไลค์สำเร็จ'
    });

  } catch (error) {
    console.error('Error unliking match:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกไลค์'
    });
  }
});

// GET /api/matching/mutual-likes - ดึง mutual likes
router.get('/mutual-likes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงผู้ใช้ที่ mutual like
    const mutualLikes = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
          likes: userId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $match: {
          'userDetails.likes': userId
        }
      },
      {
        $project: {
          _id: 1,
          name: '$userDetails.displayName',
          age: '$userDetails.dateOfBirth',
          profileImages: '$userDetails.profileImages',
          gpsLocation: '$userDetails.gpsLocation',
          interests: '$userDetails.interests',
          lifestyle: '$userDetails.lifestyle',
          membershipTier: '$userDetails.membership.tier',
          bio: '$userDetails.bio',
          lastActive: '$userDetails.lastActive'
        }
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // นับจำนวนทั้งหมด
    const totalCount = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
          likes: userId
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $match: {
          'userDetails.likes': userId
        }
      },
      {
        $count: 'total'
      }
    ]);

    res.json({
      success: true,
      data: {
        mutualLikes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0]?.total || 0,
          hasMore: skip + mutualLikes.length < (totalCount[0]?.total || 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching mutual likes:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล mutual likes'
    });
  }
});

// PUT /api/matching/update-location - อัปเดตตำแหน่ง
router.put('/update-location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุตำแหน่ง (lat, lng)'
      });
    }

    // อัปเดตตำแหน่ง
    await User.findByIdAndUpdate(userId, {
      gpsLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
      lastLocationUpdate: new Date()
    });

    res.json({
      success: true,
      message: 'อัปเดตตำแหน่งสำเร็จ'
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตตำแหน่ง'
    });
  }
});

module.exports = router;
