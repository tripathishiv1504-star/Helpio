import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Input,
  Button,
  Badge,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import useSession from '../../lib/session.js';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, login, logout, token } = useSession();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    // Fetch latest user details
    async function loadLatestUser() {
      try {
        const res = await api.get('/auth/me');
        if (res.user) {
          login(token, res.user);
          setProfileData({
            name: res.user.name || '',
            phone: res.user.phone || '',
          });
        }
      } catch (err) {
        console.error('Failed to refresh user profile:', err);
      }
    }
    loadLatestUser();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await api.patch('/auth/me', {
        name: profileData.name,
        phone: profileData.phone,
      });

      login(token, res.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);

    try {
      await api.patch('/auth/me', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.info('You have been signed out.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Account Profile"
        subtitle="Manage your personal information, roles and security credentials"
        action={
          <Button variant="danger" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Overview Card */}
        <div className="md:col-span-1">
          <Card className="text-center p-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 text-white font-extrabold text-2xl flex items-center justify-center mx-auto mb-4 shadow-sm uppercase">
              {user?.name?.[0] || 'U'}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Roles
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {user?.roles?.map((role) => (
                  <Badge
                    key={role}
                    variant={
                      role === 'admin'
                        ? 'danger'
                        : role === 'helper'
                        ? 'accent'
                        : 'primary'
                    }
                    className="capitalize font-semibold"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Account Status:{' '}
                <span className="font-semibold text-emerald-600 capitalize">
                  {user?.status || 'Active'}
                </span>
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info Form */}
          <Card title="Personal Information">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                value={profileData.name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={user?.email || ''}
                disabled
                helperText="Email address cannot be changed."
              />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+1234567890"
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" loading={savingProfile}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password Form */}
          <Card title="Security & Password">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                required
              />

              <Input
                label="New Password"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                required
                helperText="Must be at least 6 characters"
              />

              <Input
                label="Confirm New Password"
                name="confirmNewPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.confirmNewPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirmNewPassword: e.target.value,
                  }))
                }
                required
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="secondary" loading={savingPassword}>
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
