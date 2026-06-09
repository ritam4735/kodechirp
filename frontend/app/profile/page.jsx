'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, handleLogout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'edit', 'settings'
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [editForm, setEditForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    website_url: '',
    avatar_url: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else {
      loadProfile();
    }
  }, [isAuthenticated, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfileData(data.user);
      setStats(data.stats);
      setEditForm({
        display_name: data.user.display_name || '',
        username: data.user.username || '',
        bio: data.user.bio || '',
        github_url: data.user.github_url || '',
        linkedin_url: data.user.linkedin_url || '',
        website_url: data.user.website_url || '',
        avatar_url: data.user.avatar_url || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updates = { ...editForm };
      
      // Validation basic
      if (updates.avatar_url && !updates.avatar_url.startsWith('http') && !updates.avatar_url.startsWith('data:image')) {
        throw new Error('Avatar must be a valid URL or data URI');
      }

      await api.updateProfile(updates);
      if (updates.avatar_url !== profileData.avatar_url) {
        await api.updateAvatar(updates.avatar_url);
      }
      
      setSuccess('Profile updated successfully!');
      loadProfile();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.changePassword(passwordForm.current_password, passwordForm.new_password);
      setSuccess('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#58a6ff]"></div>
      </div>
    );
  }

  const user = profileData || authUser;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 flex flex-col items-center text-center">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="Avatar" 
                className="w-32 h-32 rounded-full mb-4 object-cover border-4 border-[#21262d]"
              />
            ) : (
              <div className="w-32 h-32 bg-[#58a6ff]/20 text-[#58a6ff] rounded-full flex items-center justify-center text-5xl font-bold mb-4 border-4 border-[#21262d]">
                {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-[#e6edf3]">
              {user?.display_name || user?.username}
            </h2>
            <p className="text-[#8b949e] text-lg mb-2">@{user?.username}</p>
            <p className="text-[#8b949e] mb-4 text-sm">{user?.email}</p>
            
            {user?.bio && (
              <p className="text-[#e6edf3] text-sm italic mb-4">"{user.bio}"</p>
            )}

            <div className="flex gap-4 mt-2 mb-6">
              {user?.github_url && (
                <a href={user.github_url} target="_blank" rel="noreferrer" className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                  GitHub
                </a>
              )}
              {user?.linkedin_url && (
                <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                  LinkedIn
                </a>
              )}
              {user?.website_url && (
                <a href={user.website_url} target="_blank" rel="noreferrer" className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                  Website
                </a>
              )}
            </div>

            <button
              onClick={() => {
                handleLogout();
                router.push('/');
              }}
              className="w-full bg-[#21262d] hover:bg-[#30363d] text-[#f85149] px-4 py-2 rounded-lg font-medium transition-colors border border-[#30363d]"
            >
              Sign Out
            </button>
          </div>

          {stats && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
              <h3 className="text-lg font-bold text-[#e6edf3] mb-4 border-b border-[#21262d] pb-2">Statistics</h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#8b949e]">Problems Solved</span>
                  <span className="text-[#e6edf3] font-bold bg-[#2ea043]/20 text-[#3fb950] px-2 py-0.5 rounded">
                    {stats.problems_solved}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b949e]">Total Submissions</span>
                  <span className="text-[#e6edf3] font-bold">
                    {stats.total_submissions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b949e]">Acceptance Rate</span>
                  <span className="text-[#e6edf3] font-bold">
                    {stats.acceptance_rate}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <div className="flex border-b border-[#21262d]">
            <button 
              className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'profile' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
              onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
            >
              Overview
            </button>
            <button 
              className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'edit' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
              onClick={() => { setActiveTab('edit'); setError(''); setSuccess(''); }}
            >
              Edit Profile
            </button>
            <button 
              className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'settings' ? 'text-[#58a6ff] border-b-2 border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}
              onClick={() => { setActiveTab('settings'); setError(''); setSuccess(''); }}
            >
              Account Settings
            </button>
          </div>

          {error && (
            <div className="bg-[#f85149]/10 border border-[#f85149]/50 text-[#f85149] px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[#2ea043]/10 border border-[#2ea043]/50 text-[#3fb950] px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#e6edf3] mb-4">About Me</h3>
              {user?.bio ? (
                <p className="text-[#c9d1d9] whitespace-pre-wrap">{user.bio}</p>
              ) : (
                <p className="text-[#8b949e] italic">No bio provided yet.</p>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[#e6edf3] font-medium">Username</label>
                    <input 
                      type="text" 
                      value={editForm.username} 
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[#e6edf3] font-medium">Display Name</label>
                    <input 
                      type="text" 
                      value={editForm.display_name} 
                      onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                      className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#e6edf3] font-medium">Avatar URL</label>
                  <input 
                    type="url" 
                    value={editForm.avatar_url} 
                    onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                    placeholder="https://example.com/avatar.png"
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                  />
                  <span className="text-xs text-[#8b949e]">Leave blank for default. You can use image URLs or Base64 data URIs.</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#e6edf3] font-medium">Bio</label>
                  <textarea 
                    value={editForm.bio} 
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    rows={4}
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[#e6edf3] font-medium">GitHub URL</label>
                    <input 
                      type="url" 
                      value={editForm.github_url} 
                      onChange={(e) => setEditForm({...editForm, github_url: e.target.value})}
                      className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[#e6edf3] font-medium">LinkedIn URL</label>
                    <input 
                      type="url" 
                      value={editForm.linkedin_url} 
                      onChange={(e) => setEditForm({...editForm, linkedin_url: e.target.value})}
                      className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-sm text-[#e6edf3] font-medium">Personal Website</label>
                    <input 
                      type="url" 
                      value={editForm.website_url} 
                      onChange={(e) => setEditForm({...editForm, website_url: e.target.value})}
                      className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#e6edf3] mb-4">Change Password</h3>
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-md">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#e6edf3] font-medium">Current Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.current_password} 
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#e6edf3] font-medium">New Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.new_password} 
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    required
                  />
                  <span className="text-xs text-[#8b949e]">Minimum 8 characters, at least one uppercase letter and one number.</span>
                </div>
                <div className="flex justify-start mt-2">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
