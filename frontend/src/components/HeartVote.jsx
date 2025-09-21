import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import voteAPI, { voteHelpers } from '../services/voteAPI';
import { useToast } from './ui/toast';
import socketManager from '../services/socketManager';

const HeartVote = ({ 
  candidateId, 
  candidateGender = 'male',
  candidateDisplayName = 'ผู้ใช้',
  isOwnProfile = false,
  className = '' 
}) => {
  const [voteStatus, setVoteStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const { success, error: showError } = useToast();

  // กำหนดประเภทการโหวตตามเพศ
  const voteType = voteHelpers.getVoteTypeByGender(candidateGender);
  
  // ดึงข้อมูล user ปัจจุบัน
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const voterId = currentUser.id;
  const isLoggedIn = !!voterId;

  // ดึงสถานะการโหวต
  const fetchVoteStatus = async () => {
    try {
      setLoading(true);
      const response = await voteAPI.getVoteStatus(candidateId, voterId, voteType);
      setVoteStatus(response.data);
    } catch (error) {
      console.error('Error fetching vote status:', error);
    } finally {
      setLoading(false);
    }
  };

  // จัดการการกดดาว
  const handleStarClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isLoggedIn) {
      showError('กรุณาเข้าสู่ระบบเพื่อโหวต');
      return;
    }

    if (isOwnProfile) {
      showError('ไม่สามารถโหวตให้ตัวเองได้');
      return;
    }

    if (voting) return;

    try {
      setVoting(true);
      
      const response = await voteAPI.toggleVote(voterId, candidateId, voteType);
      
      if (response.success) {
        await fetchVoteStatus();
        
        if (voteStatus?.hasVoted) {
          success('ยกเลิกการโหวตสำเร็จ');
        } else {
          success(`โหวตให้ ${candidateDisplayName} สำเร็จ! ⭐`);
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      showError(error.message || 'ไม่สามารถโหวตได้');
    } finally {
      setVoting(false);
    }
  };

  // ดึงข้อมูลเมื่อ component mount
  useEffect(() => {
    if (candidateId) {
      fetchVoteStatus();
    }
  }, [candidateId, voterId, voteType]);

  // Real-time vote updates
  useEffect(() => {
    const handleVoteUpdate = (data) => {
      console.log('📡 Received vote-updated event:', data);
      
      // ตรวจสอบว่าเป็นคะแนนโหวตของผู้ใช้คนนี้หรือไม่
      if (data.candidateId === candidateId) {
        console.log('🔄 Updating vote status for candidate:', candidateId);
        
        // อัปเดต voteStatus state
        setVoteStatus(prevStatus => ({
          ...prevStatus,
          voteStats: data.voteStats,
          hasVoted: data.action === 'cast' ? 
            (data.voter?.id === voterId) : 
            (prevStatus?.hasVoted && data.voter?.id !== voterId)
        }));
      }
    };

    // เชื่อมต่อ socket และเพิ่ม listener
    const socket = socketManager.connect(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    socketManager.on('vote-updated', handleVoteUpdate);

    // Cleanup
    return () => {
      socketManager.off('vote-updated', handleVoteUpdate);
    };
  }, [candidateId, voterId]);

  // ดึงข้อมูลคะแนนโหวต
  const voteStats = voteStatus?.voteStats?.[voteType] || { totalVotes: 0, uniqueVoters: 0 };
  const hasVoted = voteStatus?.hasVoted || false;
  const totalVotes = voteStats.totalVotes;


  // Check if this is a compact display (for card overlay)
  const isCompact = className.includes('bg-black/50') || className.includes('backdrop-blur');

  if (isCompact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '4px 8px',
        borderRadius: '4px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        <button
          onClick={handleStarClick}
          disabled={voting || isOwnProfile || !isLoggedIn}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: isOwnProfile || !isLoggedIn ? 'not-allowed' : 'pointer',
            opacity: isOwnProfile || !isLoggedIn ? 0.5 : 1,
            outline: 'none'
          }}
          title={
            isOwnProfile 
              ? 'ไม่สามารถโหวตให้ตัวเองได้' 
              : !isLoggedIn 
                ? 'กรุณาเข้าสู่ระบบเพื่อโหวต'
                : hasVoted 
                  ? 'คลิกเพื่อยกเลิกการโหวต' 
                  : 'คลิกเพื่อโหวต'
          }
        >
          <Star 
            style={{
              width: '16px',
              height: '16px',
              color: hasVoted ? '#eab308' : '#9ca3af',
              fill: hasVoted ? 'currentColor' : 'none'
            }}
          />
        </button>

        <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {voteHelpers.formatVoteCount(totalVotes)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        onClick={handleStarClick}
        disabled={voting || isOwnProfile || !isLoggedIn}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: isOwnProfile || !isLoggedIn ? 'not-allowed' : 'pointer',
          opacity: isOwnProfile || !isLoggedIn ? 0.5 : 1,
          outline: 'none'
        }}
        title={
          isOwnProfile 
            ? 'ไม่สามารถโหวตให้ตัวเองได้' 
            : !isLoggedIn 
              ? 'กรุณาเข้าสู่ระบบเพื่อโหวต'
              : hasVoted 
                ? 'คลิกเพื่อยกเลิกการโหวต' 
                : 'คลิกเพื่อโหวต'
        }
      >
        <Star 
          style={{
            width: '32px',
            height: '32px',
            color: hasVoted ? '#eab308' : '#9ca3af',
            fill: hasVoted ? 'currentColor' : 'none'
          }}
        />
      </button>

      <span style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
        {voteHelpers.formatVoteCount(totalVotes)}
      </span>
    </div>
  );
};

export default HeartVote;