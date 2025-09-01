import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  User, 
  Eye,
  Ban,
  Unlock,
  Mail,
  Clock
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [banForm, setBanForm] = useState({
    isBanned: false,
    banReason: '',
    banDuration: 1,
    banDurationType: 'days'
  });

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    membership: { tier: 'member' }
  });

  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    lookingFor: 'both',
    location: '',
    role: 'user',
    membership: { tier: 'member' }
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sort: '-createdAt'
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/ban-duration`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(banForm)
      });

      if (res.ok) {
        await fetchUsers();
        setShowBanModal(false);
        setBanForm({
          isBanned: false,
          banReason: '',
          banDuration: 1,
          banDurationType: 'days'
        });
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleEditUser = async (userId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        await fetchUsers();
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error editing user:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (res.ok) {
        await fetchUsers();
        setShowCreateModal(false);
        setCreateForm({
          username: '',
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'male',
          lookingFor: 'both',
          location: '',
          role: 'user',
          membership: { tier: 'member' }
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;

    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleViewProfile = async (userId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const userData = await res.json();
        setSelectedUser(userData);
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getStatusBadge = (user) => {
    if (user.isBanned) {
      return <Badge variant="destructive">ถูกแบน</Badge>;
    }
    if (!user.isActive) {
      return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
    }
    return <Badge variant="default">ใช้งาน</Badge>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      user: 'bg-blue-100 text-blue-800',
      admin: 'bg-purple-100 text-purple-800',
      // superadmin: 'bg-red-100 text-red-800' // ซ่อน SuperAdmin
    };
    return <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>{role}</Badge>;
  };

  const getMembershipBadge = (tier) => {
    const colors = {
      member: 'bg-gray-100 text-gray-800',
      silver: 'bg-slate-100 text-slate-800',
      gold: 'bg-amber-100 text-amber-800',
      vip: 'bg-purple-100 text-purple-800',
      diamond: 'bg-blue-100 text-blue-800',
      platinum: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[tier] || 'bg-gray-100 text-gray-800'}>{tier}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-slate-800">กำลังโหลดข้อมูลผู้ใช้...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center gap-3">
              <Users size={32} />
              จัดการผู้ใช้
            </h1>
            <p className="text-slate-600 mt-1">จัดการข้อมูลผู้ใช้ทั้งหมดในระบบ</p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} className="mr-2" />
              เพิ่มผู้ใช้
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/admin'}>
              กลับไป Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">ค้นหา</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="ค้นหาชื่อ, อีเมล, username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={fetchUsers}>
                  ค้นหา
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายชื่อผู้ใช้ ({users.filter(user => user.role !== 'superadmin').length} คน)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 font-medium text-slate-700">ผู้ใช้</th>
                    <th className="text-left p-4 font-medium text-slate-700">อีเมล</th>
                    <th className="text-left p-4 font-medium text-slate-700">สถานะ</th>
                    <th className="text-left p-4 font-medium text-slate-700">ระดับ</th>
                    <th className="text-left p-4 font-medium text-slate-700">สมาชิก</th>
                    <th className="text-left p-4 font-medium text-slate-700">วันที่สมัคร</th>
                    <th className="text-left p-4 font-medium text-slate-700">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(user => user.role !== 'superadmin').map((user) => (
                    <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-slate-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="p-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="p-4">
                        {getMembershipBadge(user.membership?.tier)}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {/* ซ่อนปุ่มการจัดการสำหรับ SuperAdmin */}
                          {user.role !== 'superadmin' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewProfile(user._id)}
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditForm({
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    role: user.role,
                                    membership: user.membership
                                  });
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanForm({
                                    isBanned: !user.isBanned,
                                    banReason: user.banReason || '',
                                    banDuration: 1,
                                    banDurationType: 'days'
                                  });
                                  setShowBanModal(true);
                                }}
                              >
                                {user.isBanned ? <Unlock size={14} /> : <Ban size={14} />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    ก่อนหน้า
                  </Button>
                  <span className="flex items-center px-4 text-slate-600">
                    หน้า {currentPage} จาก {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ban Modal */}
      <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {banForm.isBanned ? <Ban size={20} /> : <Unlock size={20} />}
              {banForm.isBanned ? 'แบนผู้ใช้' : 'ปลดแบนผู้ใช้'}
            </DialogTitle>
            <DialogDescription>
              {banForm.isBanned ? 'ระบุเหตุผลและระยะเวลาในการแบนผู้ใช้' : 'ปลดแบนผู้ใช้เพื่อให้สามารถใช้งานได้อีกครั้ง'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {banForm.isBanned && (
              <>
                <div>
                  <Label htmlFor="banReason">เหตุผล</Label>
                  <Input
                    id="banReason"
                    value={banForm.banReason}
                    onChange={(e) => setBanForm({...banForm, banReason: e.target.value})}
                    placeholder="ระบุเหตุผลในการแบน"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="banDuration">ระยะเวลา</Label>
                    <Input
                      id="banDuration"
                      type="number"
                      value={banForm.banDuration}
                      onChange={(e) => setBanForm({...banForm, banDuration: parseInt(e.target.value)})}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banDurationType">หน่วย</Label>
                    <select
                      id="banDurationType"
                      value={banForm.banDurationType}
                      onChange={(e) => setBanForm({...banForm, banDurationType: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-md"
                    >
                      <option value="hours">ชั่วโมง</option>
                      <option value="days">วัน</option>
                      <option value="months">เดือน</option>
                      <option value="permanent">ถาวร</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleBanUser(selectedUser._id)}
              >
                {banForm.isBanned ? 'แบน' : 'ปลดแบน'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBanModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              แก้ไขผู้ใช้
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลส่วนตัว ระดับ และสมาชิกของผู้ใช้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">ชื่อ</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">นามสกุล</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editEmail">อีเมล</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="editRole">ระดับ</Label>
              <select
                id="editRole"
                value={editForm.role}
                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                <option value="user">ผู้ใช้</option>
                <option value="admin">แอดมิน</option>
                {/* ซ่อน SuperAdmin จากตัวเลือก */}
                {/* <option value="superadmin">ซูเปอร์แอดมิน</option> */}
              </select>
            </div>
            <div>
              <Label htmlFor="editMembership">สมาชิก</Label>
              <select
                id="editMembership"
                value={editForm.membership.tier}
                onChange={(e) => setEditForm({
                  ...editForm, 
                  membership: {...editForm.membership, tier: e.target.value}
                })}
                className="w-full p-2 border border-slate-200 rounded-md"
              >
                <option value="member">Member</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="vip">VIP</option>
                <option value="diamond">Diamond</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleEditUser(selectedUser._id)}
              >
                บันทึก
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} />
              เพิ่มผู้ใช้ใหม่
            </DialogTitle>
            <DialogDescription>
              สร้างผู้ใช้ใหม่พร้อมกำหนดระดับและสมาชิก
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createUsername">Username</Label>
                <Input
                  id="createUsername"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="createEmail">อีเมล</Label>
                <Input
                  id="createEmail"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="createPassword">รหัสผ่าน</Label>
              <Input
                id="createPassword"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createFirstName">ชื่อ</Label>
                <Input
                  id="createFirstName"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="createLastName">นามสกุล</Label>
                <Input
                  id="createLastName"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="createLocation">ที่อยู่</Label>
              <Input
                id="createLocation"
                value={createForm.location}
                onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="createDateOfBirth">วันเกิด</Label>
              <Input
                id="createDateOfBirth"
                type="date"
                value={createForm.dateOfBirth}
                onChange={(e) => setCreateForm({...createForm, dateOfBirth: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="createRole">ระดับ</Label>
                <select
                  id="createRole"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-md"
                >
                  <option value="user">ผู้ใช้</option>
                  <option value="admin">แอดมิน</option>
                  {/* ซ่อน SuperAdmin จากตัวเลือก */}
                  {/* <option value="superadmin">ซูเปอร์แอดมิน</option> */}
                </select>
              </div>
              <div>
                <Label htmlFor="createMembership">สมาชิก</Label>
                <select
                  id="createMembership"
                  value={createForm.membership.tier}
                  onChange={(e) => setCreateForm({
                    ...createForm, 
                    membership: {...createForm.membership, tier: e.target.value}
                  })}
                  className="w-full p-2 border border-slate-200 rounded-md"
                >
                  <option value="member">Member</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="vip">VIP</option>
                  <option value="diamond">Diamond</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleCreateUser}
              >
                สร้างผู้ใช้
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User size={20} />
              โปรไฟล์ผู้ใช้
            </DialogTitle>
            <DialogDescription>
              ดูข้อมูลรายละเอียดของผู้ใช้
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-violet-400 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {selectedUser.firstName?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-slate-600">@{selectedUser.username}</p>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(selectedUser)}
                    {getRoleBadge(selectedUser.role)}
                    {getMembershipBadge(selectedUser.membership?.tier)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">ข้อมูลส่วนตัว</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-sm">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm">สมัครเมื่อ: {formatDate(selectedUser.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600">ข้อมูลสมาชิก</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Crown size={14} className="text-slate-400" />
                        <span className="text-sm">Coins: {selectedUser.coins}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-sm">เข้าสู่ระบบล่าสุด: {formatDate(selectedUser.lastLogin)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">เกี่ยวกับตัว</Label>
                  <p className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-md">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {selectedUser.isBanned && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <Ban size={16} />
                    <span className="font-medium">ถูกแบน</span>
                  </div>
                  {selectedUser.banReason && (
                    <p className="text-sm text-red-700 mt-1">เหตุผล: {selectedUser.banReason}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
