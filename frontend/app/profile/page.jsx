'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

// Suppress the SSR/client hydration mismatch: this page is 100% auth-gated
// so the server never has meaningful content to render. We return a stable
// shell on the first render (both server and client-before-mount), then
// let the real UI take over once the component has mounted on the client.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';
import { 
  User, Settings as SettingsIcon, Github, Linkedin, Globe, 
  Camera, CheckCircle, AlertCircle, Award, Activity, CheckSquare, ChevronRight 
} from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser, isAuthenticated, handleLogout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'edit', 'settings'
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  
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
    
    // Optimistic Update
    const prevProfile = { ...profileData };
    setProfileData(prev => ({ ...prev, ...editForm }));

    try {
      // Strip avatar_url — it must ONLY go through the dedicated /avatar endpoint
      // (which has a 3mb body-parser limit). Sending it via PUT /api/profile would
      // hit the global 100kb limit and cause a 413.
      const { avatar_url, ...profileUpdates } = editForm;
      await api.updateProfile(profileUpdates);
      
      if (avatar_url !== prevProfile.avatar_url) {
        await api.updateAvatar(avatar_url);
      }
      
      setSuccess('Profile updated successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      // Revert Optimistic Update
      setProfileData(prevProfile);
      setError(err.message || 'Failed to update profile');
      setTimeout(() => setError(''), 3000);
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
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change password');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatar_url: reader.result }));
        setProfileData(prev => ({ ...prev, avatar_url: reader.result })); // Optimistic UI for Avatar
      };
      reader.readAsDataURL(file);
    }
  };

  const mounted = useMounted();

  // Before mount: return the same stable shell the server rendered.
  // This keeps SSR and initial client HTML identical → no hydration error.
  if (!mounted) {
    return <div className="relative flex-1 bg-[#0d1117] min-h-screen overflow-hidden" />;
  }

  if (!isAuthenticated) return null;

  const user = profileData || authUser;

  return (
    <div className="relative flex-1 bg-[#0d1117] min-h-screen overflow-hidden">
      <AnimatedBackground variant="particles" />
      
      <div className="relative z-10 max-w-6xl mx-auto w-full px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-display font-bold text-white mb-8">My Profile</h1>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58a6ff]"></div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full lg:w-1/3 flex flex-col gap-6"
            >
              {/* Profile Card */}
              <div className="bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-[#58a6ff]/20 to-[#8957e5]/20"></div>
                
                <div className="relative group mt-4">
                  <div className="w-32 h-32 rounded-full mb-4 border-4 border-[#161b22] bg-[#0d1117] flex items-center justify-center overflow-hidden z-10 relative">
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={64} className="text-[#8b949e]" />
                    )}
                  </div>
                  {activeTab === 'edit' && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-4 right-0 bg-[#58a6ff] hover:bg-[#3182ce] text-white p-2 rounded-full transition-colors z-20 shadow-md"
                      title="Upload Avatar"
                    >
                      <Camera size={16} />
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/png, image/jpeg, image/webp, image/gif" 
                    className="hidden" 
                  />
                </div>
                
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {user?.display_name || user?.username}
                </h2>
                <p className="text-[#58a6ff] font-medium mb-1">@{user?.username}</p>
                <p className="text-[#8b949e] text-sm mb-2">{user?.email}</p>
                {user?.created_at && (
                  <p className="text-[#8b949e] text-xs mb-6 flex items-center justify-center gap-1">
                    <CheckCircle size={12} className="text-[#3fb950]"/> 
                    Joined {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                  </p>
                )}
                
                {user?.bio && (
                  <p className="text-[#c9d1d9] text-sm italic mb-6 leading-relaxed max-w-xs px-2">"{user.bio}"</p>
                )}

                <div className="flex gap-4 mb-6">
                  {user?.github_url && (
                    <a href={user.github_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-[#21262d] flex items-center justify-center text-[#8b949e] hover:text-white hover:bg-[#30363d] transition-all">
                      <Github size={18} />
                    </a>
                  )}
                  {user?.linkedin_url && (
                    <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-[#21262d] flex items-center justify-center text-[#8b949e] hover:text-[#0a66c2] hover:bg-[#30363d] transition-all">
                      <Linkedin size={18} />
                    </a>
                  )}
                  {user?.website_url && (
                    <a href={user.website_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-[#21262d] flex items-center justify-center text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#30363d] transition-all">
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              </div>

              {/* Stats Card */}
              {stats && (
                <div className="bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    <Award size={18} className="text-[#d2a8ff]" />
                    Submission Statistics
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center p-3 bg-[#21262d]/50 rounded-xl border border-[#30363d]">
                      <div className="w-10 h-10 rounded-lg bg-[#2ea043]/20 flex items-center justify-center text-[#3fb950] mr-4">
                        <CheckSquare size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold">Solved</p>
                        <p className="text-xl font-bold text-white">{stats.problems_solved}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-[#21262d]/50 rounded-xl border border-[#30363d]">
                      <div className="w-10 h-10 rounded-lg bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] mr-4">
                        <Activity size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold">Submissions</p>
                        <p className="text-xl font-bold text-white">{stats.total_submissions}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-[#21262d]/50 rounded-xl border border-[#30363d]">
                      <div className="w-10 h-10 rounded-lg bg-[#f0883e]/20 flex items-center justify-center text-[#f0883e] mr-4">
                        <Award size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold">Acceptance Rate</p>
                        <p className="text-xl font-bold text-white">{stats.acceptance_rate}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Main Content Area */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full lg:w-2/3 flex flex-col gap-6"
            >
              {/* Navigation Tabs */}
              <div className="bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-2xl p-2 flex gap-2 shadow-sm">
                {[
                  { id: 'profile', label: 'Overview', icon: User },
                  { id: 'edit', label: 'Edit Profile', icon: Camera },
                  { id: 'settings', label: 'Account Settings', icon: SettingsIcon },
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-[#21262d] text-white shadow-sm border border-[#30363d]' 
                        : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]/50'
                    }`}
                    onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                  >
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-[#58a6ff]' : ''} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Alerts */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#f85149]/10 border border-[#f85149]/30 text-[#ff7b72] px-4 py-3 rounded-xl text-sm flex items-center gap-3"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#2ea043]/10 border border-[#2ea043]/30 text-[#3fb950] px-4 py-3 rounded-xl text-sm flex items-center gap-3"
                  >
                    <CheckCircle size={16} className="shrink-0" />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Contents */}
              <div className="bg-[#161b22]/80 backdrop-blur-md border border-[#30363d] rounded-2xl p-6 md:p-8 shadow-lg min-h-[400px]">
                
                {activeTab === 'profile' && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col gap-8"
                  >
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-[#30363d] pb-3">
                        <User size={20} className="text-[#58a6ff]" />
                        About Me
                      </h3>
                      {user?.bio ? (
                        <p className="text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{user.bio}</p>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-[#8b949e]">
                          <User size={32} className="mb-3 opacity-20" />
                          <p>No bio provided yet.</p>
                          <button 
                            onClick={() => setActiveTab('edit')} 
                            className="mt-4 text-[#58a6ff] hover:underline text-sm font-medium flex items-center"
                          >
                            Add a bio <ChevronRight size={14} className="ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'edit' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-[#30363d] pb-3">
                      <SettingsIcon size={20} className="text-[#58a6ff]" />
                      Profile Details
                    </h3>
                    <form onSubmit={handleEditSubmit} className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-[#c9d1d9] font-semibold">Username</label>
                          <input 
                            type="text" 
                            value={editForm.username} 
                            onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-[#c9d1d9] font-semibold">Display Name</label>
                          <input 
                            type="text" 
                            value={editForm.display_name} 
                            onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-[#c9d1d9] font-semibold">Bio</label>
                        <textarea 
                          value={editForm.bio} 
                          onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                          rows={4}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-[#c9d1d9] font-semibold flex items-center gap-2"><Github size={14}/> GitHub URL</label>
                          <input 
                            type="url" 
                            value={editForm.github_url} 
                            onChange={(e) => setEditForm({...editForm, github_url: e.target.value})}
                            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                            placeholder="https://github.com/username"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm text-[#c9d1d9] font-semibold flex items-center gap-2"><Linkedin size={14}/> LinkedIn URL</label>
                          <input 
                            type="url" 
                            value={editForm.linkedin_url} 
                            onChange={(e) => setEditForm({...editForm, linkedin_url: e.target.value})}
                            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="text-sm text-[#c9d1d9] font-semibold flex items-center gap-2"><Globe size={14}/> Personal Website</label>
                          <input 
                            type="url" 
                            value={editForm.website_url} 
                            onChange={(e) => setEditForm({...editForm, website_url: e.target.value})}
                            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end mt-6 pt-6 border-t border-[#30363d]">
                        <button 
                          type="submit" 
                          disabled={saving}
                          className="bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#3fb950] text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-[#2ea043]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {activeTab === 'settings' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-[#30363d] pb-3">
                      <SettingsIcon size={20} className="text-[#f0883e]" />
                      Security
                    </h3>
                    <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6 max-w-md">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-[#c9d1d9] font-semibold">Current Password</label>
                        <input 
                          type="password" 
                          value={passwordForm.current_password} 
                          onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-[#c9d1d9] font-semibold">New Password</label>
                        <input 
                          type="password" 
                          value={passwordForm.new_password} 
                          onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                          className="bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                          required
                        />
                        <span className="text-xs text-[#8b949e]">Minimum 8 characters, at least one uppercase letter and one number.</span>
                      </div>
                      <div className="flex justify-start mt-4 pt-4">
                        <button 
                          type="submit" 
                          disabled={saving}
                          className="bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          {saving ? (
                            <><div className="w-4 h-4 border-2 border-[#8b949e] border-t-white rounded-full animate-spin"></div> Updating...</>
                          ) : (
                            'Update Password'
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
