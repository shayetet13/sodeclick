const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const VoteTransaction = require('../models/VoteTransaction');
const User = require('../models/User');

// Import socket.io instance
const { getSocketInstance } = require('../server');

// POST /api/vote/cast - โหวตให้ผู้ใช้ (1 user 1 vote)
router.post('/cast', async (req, res) => {
  try {
    const { voterId, candidateId, voteType, message } = req.body;

    if (!voterId || !candidateId || !voteType) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID, Candidate ID, and Vote Type are required'
      });
    }

    // ตรวจสอบว่าโหวตแล้วหรือยัง (1 user 1 vote)
    const existingVote = await VoteTransaction.findOne({
      voter: voterId,
      candidate: candidateId,
      voteType,
      status: 'active'
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this user',
        canUnvote: true
      });
    }

    // ใช้คะแนนโหวตเป็น 1 คะแนนเสมอ
    const votePoints = 1;

    const validVoteTypes = ['popularity_male', 'popularity_female', 'popularity_combined', 'gift_ranking'];
    if (!validVoteTypes.includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const [voter, candidate] = await Promise.all([
      User.findById(voterId),
      User.findById(candidateId)
    ]);

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: 'Voter not found'
      });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // ตรวจสอบว่าไม่ใช่คนเดียวกัน
    if (voterId === candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot vote for yourself'
      });
    }

    // ตรวจสอบเพศสำหรับการโหวตความนิยม
    if (voteType === 'popularity_male' && candidate.gender !== 'male') {
      return res.status(400).json({
        success: false,
        message: 'Can only vote for male candidates in male popularity contest'
      });
    }

    if (voteType === 'popularity_female' && candidate.gender !== 'female') {
      return res.status(400).json({
        success: false,
        message: 'Can only vote for female candidates in female popularity contest'
      });
    }

    // สำหรับระบบ heart vote ไม่ต้องหักคะแนน (ฟรี)
    // แต่ยังคงเก็บ votePoints ไว้เป็น 1 เพื่อการนับ

    // สร้างธุรกรรมโหวต
    const voteTransaction = new VoteTransaction({
      voter: voterId,
      candidate: candidateId,
      votePoints,
      voteType,
      message: message?.trim(),
      context: {
        type: 'ranking'
      },
      status: 'active'
    });

    // บันทึกธุรกรรมโหวต (ไม่ต้องบันทึก voter เพราะไม่ได้แก้ไข)
    await voteTransaction.save();

    // ส่ง real-time update ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        // คำนวณคะแนนโหวตใหม่
        const newVoteStats = await VoteTransaction.aggregate([
          {
            $match: {
              candidate: new mongoose.Types.ObjectId(candidateId),
              status: 'active'
            }
          },
          {
            $group: {
              _id: '$voteType',
              totalVotes: { $sum: '$votePoints' },
              uniqueVoters: { $addToSet: '$voter' }
            }
          }
        ]);

        const voteData = {};
        newVoteStats.forEach(stat => {
          voteData[stat._id] = {
            totalVotes: stat.totalVotes,
            uniqueVoters: stat.uniqueVoters.length
          };
        });

        // ส่ง event ไปยังทุก client
        io.emit('vote-updated', {
          candidateId,
          voteType,
          voteStats: voteData,
          action: 'cast',
          voter: {
            id: voterId,
            username: voter.username,
            displayName: voter.displayName
          },
          candidate: {
            id: candidateId,
            username: candidate.username,
            displayName: candidate.displayName
          }
        });

        // ส่ง notification ไปยังผู้ที่ถูกโหวต
        io.emit('vote-notification', {
          voterId,
          candidateId,
          voteType,
          action: 'cast'
        });

        console.log('📡 Sent vote-updated event:', {
          candidateId,
          voteType,
          voteStats: voteData
        });
      }
    } catch (socketError) {
      console.error('Error sending socket update:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }

    res.json({
      success: true,
      message: `Successfully voted ${votePoints} points for ${candidate.displayName}`,
      data: {
        transaction: {
          id: voteTransaction._id,
          votePoints,
          voteType,
          message: voteTransaction.message
        },
        voter: {
          remainingVotePoints: voter.votePoints
        },
        candidate: {
          username: candidate.username,
          displayName: candidate.displayName,
          gender: candidate.gender
        }
      }
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cast vote',
      error: error.message
    });
  }
});

// POST /api/vote/uncast - ยกเลิกการโหวต
router.post('/uncast', async (req, res) => {
  try {
    const { voterId, candidateId, voteType } = req.body;

    if (!voterId || !candidateId || !voteType) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID, Candidate ID, and Vote Type are required'
      });
    }

    // ค้นหาการโหวตที่มีอยู่
    const existingVote = await VoteTransaction.findOne({
      voter: voterId,
      candidate: candidateId,
      voteType,
      status: 'active'
    });

    if (!existingVote) {
      return res.status(404).json({
        success: false,
        message: 'No active vote found to remove'
      });
    }

    // เปลี่ยนสถานะเป็น expired แทนการลบ
    existingVote.status = 'expired';
    await existingVote.save();

    const candidate = await User.findById(candidateId);

    // ส่ง real-time update ผ่าน Socket.IO
    try {
      const io = getSocketInstance();
      if (io) {
        // คำนวณคะแนนโหวตใหม่
        const newVoteStats = await VoteTransaction.aggregate([
          {
            $match: {
              candidate: new mongoose.Types.ObjectId(candidateId),
              status: 'active'
            }
          },
          {
            $group: {
              _id: '$voteType',
              totalVotes: { $sum: '$votePoints' },
              uniqueVoters: { $addToSet: '$voter' }
            }
          }
        ]);

        const voteData = {};
        newVoteStats.forEach(stat => {
          voteData[stat._id] = {
            totalVotes: stat.totalVotes,
            uniqueVoters: stat.uniqueVoters.length
          };
        });

        // ส่ง event ไปยังทุก client
        io.emit('vote-updated', {
          candidateId,
          voteType,
          voteStats: voteData,
          action: 'uncast',
          voter: {
            id: voterId,
            username: existingVote.voter?.username || 'Unknown',
            displayName: existingVote.voter?.displayName || 'Unknown'
          },
          candidate: {
            id: candidateId,
            username: candidate.username,
            displayName: candidate.displayName
          }
        });

        // ส่ง notification ไปยังผู้ที่ถูกยกเลิกการโหวต
        io.emit('vote-notification', {
          voterId,
          candidateId,
          voteType,
          action: 'uncast'
        });

        console.log('📡 Sent vote-updated event (uncast):', {
          candidateId,
          voteType,
          voteStats: voteData
        });
      }
    } catch (socketError) {
      console.error('Error sending socket update:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }

    res.json({
      success: true,
      message: `Successfully removed vote for ${candidate.displayName}`,
      data: {
        removedVote: {
          id: existingVote._id,
          votePoints: existingVote.votePoints,
          voteType: existingVote.voteType
        },
        candidate: {
          username: candidate.username,
          displayName: candidate.displayName
        }
      }
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove vote',
      error: error.message
    });
  }
});

// POST /api/vote/buy-points - ซื้อคะแนนโหวต
router.post('/buy-points', async (req, res) => {
  try {
    const { userId, packageType } = req.body;

    if (!userId || !packageType) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Package Type are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // แพ็กเกจคะแนนโหวต
    const votePackages = {
      'coins_100': { coins: 1000, votePoints: 100, name: '100 Vote Points' },
      'money_100': { money: 10, votePoints: 100, name: '100 Vote Points (Money)' }
    };

    const selectedPackage = votePackages[packageType];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package type',
        availablePackages: Object.keys(votePackages)
      });
    }

    // ตรวจสอบยอดเงิน/เหรียญ
    if (selectedPackage.coins && user.coins < selectedPackage.coins) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: selectedPackage.coins,
        current: user.coins
      });
    }

    // หักเงิน/เหรียญและเพิ่มคะแนนโหวต
    if (selectedPackage.coins) {
      user.coins -= selectedPackage.coins;
    }
    user.votePoints += selectedPackage.votePoints;

    await user.save();

    res.json({
      success: true,
      message: `Successfully purchased ${selectedPackage.votePoints} vote points`,
      data: {
        package: {
          name: selectedPackage.name,
          cost: selectedPackage.coins ? `${selectedPackage.coins} coins` : `${selectedPackage.money} THB`,
          votePoints: selectedPackage.votePoints
        },
        user: {
          remainingCoins: user.coins,
          totalVotePoints: user.votePoints
        }
      }
    });

  } catch (error) {
    console.error('Error buying vote points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to buy vote points',
      error: error.message
    });
  }
});

// GET /api/vote/ranking - ดูอันดับการโหวต
router.get('/ranking', async (req, res) => {
  try {
    const { voteType, period = 'all', limit = 50 } = req.query;
    const limitNum = parseInt(limit);

    if (!voteType) {
      return res.status(400).json({
        success: false,
        message: 'Vote type is required'
      });
    }

    let matchStage = { 
      status: 'active'
    };

    // จัดการ voteType สำหรับ popularity_combined
    if (voteType === 'popularity_combined') {
      matchStage.voteType = { $in: ['popularity_male', 'popularity_female'] };
    } else {
      matchStage.voteType = voteType;
    }

    // กรองตามช่วงเวลา
    const now = new Date();
    if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchStage.votedAt = { $gte: weekAgo };
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchStage.votedAt = { $gte: monthAgo };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$candidate',
          totalVotes: { $sum: '$votePoints' },
          voteCount: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voter' },
          lastVoted: { $max: '$votedAt' },
          // เพิ่มการนับ heart votes (popularity_male + popularity_female) เป็น tie-breaker
          heartVotes: {
            $sum: {
              $cond: [
                { $in: ['$voteType', ['popularity_male', 'popularity_female']] },
                1,
                0
              ]
            }
          }
        }
      },
      { 
        $sort: { 
          totalVotes: -1,    // เรียงตาม total votes ก่อน
          heartVotes: -1,    // ถ้า total votes เท่ากัน ให้เรียงตาม heart votes
          lastVoted: -1      // ถ้าทั้งคู่เท่ากัน ให้เรียงตามเวลาล่าสุด
        } 
      },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                displayName: 1,
                gender: 1,
                profileImages: 1,
                mainProfileImageIndex: 1,
                'membership.tier': 1,
                verificationBadge: 1
              }
            }
          ]
        }
      },
      { $unwind: '$user' }
    ];

    const ranking = await VoteTransaction.aggregate(pipeline);
    

    // คำนวณรางวัล
    const calculateReward = (rank, voteType) => {
      if (voteType === 'popularity_male' || voteType === 'popularity_female') {
        if (rank === 1) return { type: 'money', amount: 1000, description: 'เงินสด 1,000 บาท' };
        if (rank === 2) return { type: 'money', amount: 500, description: 'เงินสด 500 บาท' };
        if (rank === 3) return { type: 'money', amount: 300, description: 'เงินสด 300 บาท' };
        if (rank === 4) return { type: 'coins', amount: 50000, description: '50,000 เหรียญ' };
        if (rank === 5) return { type: 'coins', amount: 10000, description: '10,000 เหรียญ' };
        if (rank >= 6 && rank <= 10) return { type: 'coins', amount: 5000, description: '5,000 เหรียญ' };
        if (rank >= 11 && rank <= 20) return { type: 'coins', amount: 3000, description: '3,000 เหรียญ' };
        if (rank >= 21 && rank <= 30) return { type: 'coins', amount: 1000, description: '1,000 เหรียญ' };
        if (rank >= 31 && rank <= 50) return { type: 'coins', amount: 500, description: '500 เหรียญ' };
      } else if (voteType === 'gift_ranking') {
        if (rank === 1) return { type: 'mixed', coins: 15000, votePoints: 5000, description: '15,000 เหรียญ + 5,000 คะแนนโหวต' };
        if (rank === 2) return { type: 'mixed', coins: 10000, votePoints: 3000, description: '10,000 เหรียญ + 3,000 คะแนนโหวต' };
        if (rank === 3) return { type: 'mixed', coins: 5000, votePoints: 1000, description: '5,000 เหรียญ + 1,000 คะแนนโหวต' };
        if (rank === 4) return { type: 'mixed', coins: 3000, votePoints: 500, description: '3,000 เหรียญ + 500 คะแนนโหวต' };
        if (rank === 5) return { type: 'mixed', coins: 1000, votePoints: 100, description: '1,000 เหรียญ + 100 คะแนนโหวต' };
        if (rank >= 6 && rank <= 10) return { type: 'coins', amount: 500, description: '500 เหรียญ' };
        if (rank >= 11 && rank <= 20) return { type: 'coins', amount: 300, description: '300 เหรียญ' };
        if (rank >= 21 && rank <= 30) return { type: 'coins', amount: 100, description: '100 เหรียญ' };
        if (rank >= 31 && rank <= 50) return { type: 'coins', amount: 50, description: '50 เหรียญ' };
      }
      return null;
    };

    // Create response data
    const responseData = {
      success: true,
      data: {
        ranking: ranking.map((item, index) => {
          const rank = index + 1;
          const reward = calculateReward(rank, voteType);
          
          // ตรวจสอบว่า user object มีค่าหรือไม่
          if (!item.user || !item.user._id) {
            console.error(`❌ Backend - User data is missing for ranking item ${index}:`, item);
            return null; // ข้าม item นี้
          }
          
          return {
            rank,
            user: {
              _id: item.user._id,
              id: item.user._id,
              username: item.user.username,
              displayName: item.user.displayName,
              gender: item.user.gender,
              membershipTier: item.user.membership?.tier || 'member',
              verificationBadge: item.user.verificationBadge,
              profileImages: Array.isArray(item.user.profileImages) ? item.user.profileImages : [],
              mainProfileImageIndex: item.user.mainProfileImageIndex || 0
            },
            stats: {
              totalVotes: item.totalVotes,
              voteCount: item.voteCount,
              uniqueVoters: item.uniqueVoters.length,
              lastVoted: item.lastVoted,
              heartVotes: item.heartVotes || 0  // เพิ่ม heart votes ใน stats
            },
            reward
          };
        }).filter(item => item !== null), // กรอง null items ออก
        metadata: {
          voteType,
          period,
          totalRanked: ranking.length,
          generatedAt: new Date(),
          contestInfo: {
            description: voteType === 'popularity_male' ? 'การประกวดความนิยมชาย' :
                        voteType === 'popularity_female' ? 'การประกวดความนิยมหญิง' :
                        'การประกวดของขวัญ',
            rewardDistribution: '7 วันหลังจากสิ้นสุดการแข่งขัน'
          }
        }
      }
    };
    
    // Send response with proper JSON serialization
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching vote ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vote ranking',
      error: error.message
    });
  }
});

// GET /api/vote/status/:candidateId - ตรวจสอบสถานะการโหวตและคะแนน
router.get('/status/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { voterId, voteType = 'popularity_male' } = req.query;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: 'Candidate ID is required'
      });
    }

    // ดึงข้อมูลผู้ใช้
    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // นับคะแนนโหวตทั้งหมดของผู้ใช้
    const voteStats = await VoteTransaction.aggregate([
      {
        $match: {
          candidate: new mongoose.Types.ObjectId(candidateId),
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$voteType',
          totalVotes: { $sum: '$votePoints' },
          uniqueVoters: { $addToSet: '$voter' }
        }
      }
    ]);

    // แปลงข้อมูลให้อ่านง่าย
    const voteData = {};
    voteStats.forEach(stat => {
      voteData[stat._id] = {
        totalVotes: stat.totalVotes,
        uniqueVoters: stat.uniqueVoters.length
      };
    });

    // ตรวจสอบว่า voterId โหวตแล้วหรือยัง (ถ้ามี voterId)
    let hasVoted = false;
    if (voterId) {
      const userVote = await VoteTransaction.findOne({
        voter: voterId,
        candidate: candidateId,
        voteType,
        status: 'active'
      });
      hasVoted = !!userVote;
    }

    res.json({
      success: true,
      data: {
        candidate: {
          id: candidate._id,
          username: candidate.username,
          displayName: candidate.displayName,
          gender: candidate.gender
        },
        voteStats: voteData,
        hasVoted,
        requestedVoteType: voteType
      }
    });

  } catch (error) {
    console.error('Error getting vote status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vote status',
      error: error.message
    });
  }
});

// GET /api/vote/history/:userId - ดูประวัติการโหวต
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'cast', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (type === 'cast') {
      query.voter = userId;
    } else if (type === 'received') {
      query.candidate = userId;
    } else {
      query = {
        $or: [
          { voter: userId },
          { candidate: userId }
        ]
      };
    }

    query.status = 'active';

    const [votes, total] = await Promise.all([
      VoteTransaction.find(query)
        .populate('voter', 'username displayName membershipTier')
        .populate('candidate', 'username displayName membershipTier gender')
        .sort({ votedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      VoteTransaction.countDocuments(query)
    ]);

    // สถิติ
    const stats = await VoteTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVotesCast: {
            $sum: {
              $cond: [{ $eq: ['$voter', mongoose.Types.ObjectId(userId)] }, '$votePoints', 0]
            }
          },
          totalVotesReceived: {
            $sum: {
              $cond: [{ $eq: ['$candidate', mongoose.Types.ObjectId(userId)] }, '$votePoints', 0]
            }
          },
          uniqueCandidates: {
            $addToSet: {
              $cond: [{ $eq: ['$voter', mongoose.Types.ObjectId(userId)] }, '$candidate', null]
            }
          },
          uniqueVoters: {
            $addToSet: {
              $cond: [{ $eq: ['$candidate', mongoose.Types.ObjectId(userId)] }, '$voter', null]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        votes: votes.map(vote => ({
          id: vote._id,
          type: vote.voter._id.toString() === userId ? 'cast' : 'received',
          voter: {
            id: vote.voter._id,
            username: vote.voter.username,
            displayName: vote.voter.displayName,
            membershipTier: vote.voter.membershipTier
          },
          candidate: {
            id: vote.candidate._id,
            username: vote.candidate.username,
            displayName: vote.candidate.displayName,
            membershipTier: vote.candidate.membershipTier,
            gender: vote.candidate.gender
          },
          votePoints: vote.votePoints,
          voteType: vote.voteType,
          message: vote.message,
          votedAt: vote.votedAt
        })),
        stats: stats[0] || {
          totalVotesCast: 0,
          totalVotesReceived: 0,
          uniqueCandidates: [],
          uniqueVoters: []
        },
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalItems: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vote history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vote history',
      error: error.message
    });
  }
});

module.exports = router;
