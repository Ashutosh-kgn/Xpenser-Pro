import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, Button } from '../../design-system';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase/firebase';
import { 
  Palette, 
  ShieldCheck, 
  Coins, 
  Bot, 
  Bell, 
  Database, 
  Download, 
  Smartphone, 
  ChevronRight, 
  ChevronDown,
  LogOut,
  CloudLightning
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  const addXp = useStore(state => state.addXp);
  const setIsAuthenticated = useStore(state => state.setIsAuthenticated);
  const syncProfileData = useStore(state => state.syncProfileData);

  // States
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'appearance' | 'security' | 'finance' | 'ai' | 'notifications' | 'backup' | 'devices'>('appearance');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Profile preferences fields
  const [currency, setCurrency] = useState('INR (₹)');
  const [accentColor, setAccentColor] = useState('purple');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [animationLevel, setAnimationLevel] = useState('full');
  
  // Custom triggers
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);
  const [isAIAssistantEnabled, setIsAIAssistantEnabled] = useState(true);
  const [aiPersonality, setAiPersonality] = useState('friendly');
  
  // Device sessions list
  const [linkedDevices, setLinkedDevices] = useState([
    { id: 'dev-1', name: 'iPhone 15 Pro Max', lastSync: 'Active Now', status: 'Active', os: 'iOS 17.5' },
    { id: 'dev-2', name: 'MacBook Pro 16"', lastSync: '2 hours ago', status: 'Active', os: 'macOS Sonoma' }
  ]);

  // Live DB stats
  const profile = useLiveQuery(() => db.userProfile.get('profile'));
  const txCount = useLiveQuery(() => db.transactions.count()) || 0;
  const subCount = useLiveQuery(() => db.subscriptions.count()) || 0;
  const invCount = useLiveQuery(() => db.investments.count()) || 0;
  const goalCount = useLiveQuery(() => db.goals.count()) || 0;

  useEffect(() => {
    if (profile) {
      if (profile.currency) setCurrency(profile.currency);
      if (profile.theme) setTheme(profile.theme);
    }
  }, [profile]);

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    await db.userProfile.update('profile', { currency });
    await addXp(20);
    alert('🎨 System preferences and currency successfully updated! +20 XP');
    setLoading(false);
  };

  const handleResetSystem = async () => {
    if (confirm('⚠️ WARNING: This will permanently wipe all custom transactions, goals, investments, and settings, and restore Xpenser Pro to default seed values. Do you want to proceed?')) {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await db.transactions.clear();
      await db.subscriptions.clear();
      await db.investments.clear();
      await db.goals.clear();
      await db.userProfile.clear();
      
      localStorage.removeItem('xpenser_auth');
      alert('System reset successfully. Xpenser Pro has been restored to factory seed states.');
      setLoading(false);
      window.location.reload();
    }
  };

  const handleMockBackup = () => {
    alert('Simulating database JSON export... Backup package "xpenser_os_backup.json" downloaded successfully! +10 XP earned.');
    addXp(10);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out and lock Xpenser Pro?')) {
      try {
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Firebase signout bypassed:', err);
      }
      localStorage.removeItem('xpenser_auth');
      setIsAuthenticated(false);
    }
  };

  const handleRevokeDevice = (deviceId: string, deviceName: string) => {
    if (confirm(`Are you sure you want to log out and revoke access for ${deviceName}?`)) {
      setLinkedDevices(prev => prev.filter(d => d.id !== deviceId));
      addXp(15);
      alert(`Access revoked for ${deviceName}. Earned +15 XP for managing session security!`);
    }
  };

  const handleCloudBackup = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be signed in via Firebase to backup data to the cloud.');
      return;
    }
    
    setLoading(true);
    try {
      const transactions = await db.transactions.toArray();
      const subscriptions = await db.subscriptions.toArray();
      const investments = await db.investments.toArray();
      const goals = await db.goals.toArray();
      const profile = await db.userProfile.get('profile');
      
      await setDoc(doc(firestore, 'users', user.uid), {
        transactions,
        subscriptions,
        investments,
        goals,
        profile,
        updatedAt: new Date().toISOString()
      });
      
      await addXp(50);
      alert('☁️ Success! IndexedDB data synced securely to Firebase Firestore. Earned +50 XP!');
    } catch (e) {
      console.error(e);
      alert('Cloud backup failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCloudRestore = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be signed in via Firebase to restore data from the cloud.');
      return;
    }
    
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(firestore, 'users', user.uid));
      if (!docSnap.exists()) {
        alert('No backup found in Firestore cloud for this session.');
        return;
      }
      
      const data = docSnap.data();
      
      await db.transactions.clear();
      await db.subscriptions.clear();
      await db.investments.clear();
      await db.goals.clear();
      await db.userProfile.clear();
      
      if (data.transactions) await db.transactions.bulkAdd(data.transactions);
      if (data.subscriptions) await db.subscriptions.bulkAdd(data.subscriptions);
      if (data.investments) await db.investments.bulkAdd(data.investments);
      if (data.goals) await db.goals.bulkAdd(data.goals);
      if (data.profile) await db.userProfile.put(data.profile);
      
      await syncProfileData();
      alert('☁️ Success! IndexedDB data restored from Firebase Firestore cloud. System synced!');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Cloud restore failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* 1. HERO DESCRIPTION AREA */}
      <Card variant="glass" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(126, 82, 255, 0.1) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-heading)' }}>
              System Settings
            </h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Manage accounts, visualization preferences, cloud backups, and biometric security metrics.
            </span>
          </div>

          <Button variant="secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} />
            <span>Logout & Lock Session</span>
          </Button>
        </div>
      </Card>

      {/* 2. LAYOUT: NAVIGATION TABS AND CONTENT SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 9fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        
        {/* Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
            { id: 'security', label: 'Security & Auth', icon: <ShieldCheck size={16} /> },
            { id: 'finance', label: 'Financial Rules', icon: <Coins size={16} /> },
            { id: 'ai', label: 'AI Engine Settings', icon: <Bot size={16} /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
            { id: 'backup', label: 'Backup & Cloud Sync', icon: <Database size={16} /> },
            { id: 'devices', label: 'Linked Devices', icon: <Smartphone size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          
          {/* TAB A: APPEARANCE */}
          {activeTab === 'appearance' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>Appearance & Visual Customization</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Theme Selector */}
                <div>
                  <label className="form-label">Active Theme Palette</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px' }}>
                    {[
                      { id: 'dark', label: 'Soft Dark', desc: 'Sleek slate interface' },
                      { id: 'light', label: 'Stripe Light', desc: 'Clean bright layout' },
                      { id: 'amoled', label: 'AMOLED Black', desc: 'Pure black energy-saver' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: theme === t.id ? 'rgba(var(--primary-rgb), 0.06)' : 'var(--surface-elevated)',
                          cursor: 'pointer',
                          borderColor: theme === t.id ? 'var(--primary)' : 'var(--border)',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: theme === t.id ? 'var(--primary)' : 'var(--text-heading)' }}>{t.label}</div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Colors */}
                <div>
                  <label className="form-label">Accent Focus Color</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    {[
                      { id: 'purple', color: '#7e52ff', label: 'Classic Purple' },
                      { id: 'blue', color: '#00b0ff', label: 'Cobalt Blue' },
                      { id: 'emerald', color: '#00f5d4', label: 'Mint Emerald' },
                      { id: 'orange', color: '#ff3d00', label: 'Sunset Orange' }
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => setAccentColor(c.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: c.color,
                          border: accentColor === c.id ? '3px solid #ffffff' : '1px solid var(--border)',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'all 0.2s'
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Typography & Animations */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Interface Typography</label>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="input-field" style={{ marginTop: '8px' }}>
                      <option value="Inter">Inter Sans</option>
                      <option value="Geist">Geist Mono</option>
                      <option value="SF Pro">SF Pro Apple</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Render Animations</label>
                    <select value={animationLevel} onChange={(e) => setAnimationLevel(e.target.value)} className="input-field" style={{ marginTop: '8px' }}>
                      <option value="full">Full Motion (60 FPS)</option>
                      <option value="reduced">Reduced Timings</option>
                      <option value="disabled">Disabled Layout Transitions</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB B: SECURITY & AUTH */}
          {activeTab === 'security' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>Security Configurations</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>Two-Factor Authentication (2FA)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Require email verification code on logins</span>
                  </div>
                  <input type="checkbox" checked={is2FAEnabled} onChange={(e) => setIs2FAEnabled(e.target.checked)} style={{ width: '38px', height: '20px', cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>Passkey Biometric Login</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enable Windows Hello / Apple FaceID simulations</span>
                  </div>
                  <input type="checkbox" checked={isBiometricEnabled} onChange={(e) => setIsBiometricEnabled(e.target.checked)} style={{ width: '38px', height: '20px', cursor: 'pointer' }} />
                </div>

                {/* Score */}
                <div style={{ padding: '16px', background: 'rgba(var(--primary-rgb), 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <ShieldCheck size={28} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-heading)' }}>Security Health Score: 96/100</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Passkey active. Consider enabling 2FA for maximum database encryption.</span>
                  </div>
                </div>

                {/* Change Password */}
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '16px 0 8px 0', color: 'var(--text-heading)' }}>Change Password</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="password" placeholder="New Password" className="input-field" disabled />
                    <Button variant="secondary" onClick={() => alert('Demo Mode: Custom passwords can be updated directly via Firebase client profile.')} disabled style={{ fontSize: '0.75rem' }}>Update Credential</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB C: FINANCIAL RULES */}
          {activeTab === 'finance' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>Financial Rules & Preferences</h3>
              
              <form onSubmit={handleUpdatePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Global Currency Symbol</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field" style={{ marginTop: '8px' }}>
                      <option value="INR (₹)">INR (₹) Rupees</option>
                      <option value="USD ($)">USD ($) Dollars</option>
                      <option value="EUR (€)">EUR (€) Euros</option>
                      <option value="GBP (£)">GBP (£) Pounds</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Financial Year Period</label>
                    <select className="input-field" style={{ marginTop: '8px' }}>
                      <option value="apr-mar">April to March (India)</option>
                      <option value="jan-dec">January to December (US/EU)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Default Budget Cycle</label>
                    <select className="input-field" style={{ marginTop: '8px' }}>
                      <option value="monthly">Monthly Cycle rollover</option>
                      <option value="weekly">Weekly allocation cycle</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">AI Rounding Engine</label>
                    <select className="input-field" style={{ marginTop: '8px' }}>
                      <option value="disabled">Disable automatic rounding</option>
                      <option value="nearest-10">Round transactions to nearest ₹10</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" variant="primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                  Save Financial Rules
                </Button>
              </form>
            </Card>
          )}

          {/* TAB D: AI ENGINE */}
          {activeTab === 'ai' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>AI OS Briefing Preferences</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>Enable AI Assistant (Coach)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generate daily cash flow reviews and brief logs</span>
                  </div>
                  <input type="checkbox" checked={isAIAssistantEnabled} onChange={(e) => setIsAIAssistantEnabled(e.target.checked)} style={{ width: '38px', height: '20px', cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>Receipt OCR Parser</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Extract transaction metrics from upload receipts automatically</span>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: '38px', height: '20px', cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">AI Personality Tone</label>
                    <select value={aiPersonality} onChange={(e) => setAiPersonality(e.target.value)} className="input-field" style={{ marginTop: '8px' }}>
                      <option value="professional">Professional Financial Advisor</option>
                      <option value="friendly">Friendly & Gamified Mascots</option>
                      <option value="minimal">Minimal & Strict Alerts</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Portfolio diversification suggestions</label>
                    <select className="input-field" style={{ marginTop: '8px' }}>
                      <option value="moderate">Moderate Portfolio advice</option>
                      <option value="conservative">Conservative advice</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB E: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>System Alerts & Dispatch Toggles</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { id: 'push', label: 'Push App Notifications', desc: 'Instantly notify on budget limit reach' },
                  { id: 'email', label: 'Registered Email Alerts', desc: 'Dispatches monthly carry-forward reports and receipts' },
                  { id: 'renewals', label: 'Subscription Renewals', desc: 'Sends renewal timeline logs 3 days before debits' },
                  { id: 'weekly', label: 'Weekly Summary briefs', desc: 'Compile active savings rate stats on Sunday' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: idx === 3 ? 'none' : '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                    </div>
                    <input type="checkbox" defaultChecked style={{ width: '38px', height: '20px', cursor: 'pointer' }} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB F: BACKUP & CLOUD RESTORE */}
          {activeTab === 'backup' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>Backup, Restore & Reset</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Cloud Sync block */}
                <div style={{ padding: '20px', background: 'rgba(var(--primary-rgb), 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <CloudLightning size={24} style={{ color: 'var(--primary)' }} />
                    <div>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)' }}>Cloud Synchronization</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Sync IndexedDB data to Firebase Firestore</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="primary" onClick={handleCloudBackup} disabled={loading} style={{ flex: 1 }}>
                      Backup to Cloud
                    </Button>
                    <Button variant="secondary" onClick={handleCloudRestore} disabled={loading} style={{ flex: 1 }}>
                      Restore from Cloud
                    </Button>
                  </div>
                </div>

                {/* Export & Restore local */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Button variant="secondary" onClick={handleMockBackup} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <Download size={14} />
                    <span>Export JSON Backup</span>
                  </Button>
                  <Button variant="secondary" onClick={() => alert('Select backup JSON file from explorer to restore...')}>
                    <span>Restore Local Backup</span>
                  </Button>
                </div>

                {/* Dangerous reset */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-error)', display: 'block' }}>Wipe System Database</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Permanently clear IndexedDB tables and restore to factory settings</span>
                  </div>
                  <Button variant="danger" onClick={handleResetSystem} disabled={loading}>
                    Reset Workspace
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* TAB G: LINKED DEVICES */}
          {activeTab === 'devices' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-heading)' }}>Active Session Devices</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {linkedDevices.map(device => (
                  <div 
                    key={device.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px', 
                      background: 'var(--surface-elevated)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-sm)' 
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>{device.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OS: {device.os} &bull; Synced: {device.lastSync}</span>
                    </div>
                    <Button variant="secondary" onClick={() => handleRevokeDevice(device.id, device.name)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>

      </div>

      {/* 3. ADVANCED SETTINGS COLLAPSIBLE */}
      <Card style={{ marginTop: '24px', border: '1px solid var(--border)' }}>
        <button 
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-heading)',
            fontSize: '0.9375rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: 0,
            outline: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} style={{ color: 'var(--primary)' }} />
            <span>Advanced Developer Configurations</span>
          </div>
          {isAdvancedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isAdvancedOpen && (
          <div 
            style={{ 
              marginTop: '20px', 
              paddingTop: '20px', 
              borderTop: '1px solid var(--border)', 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '24px',
              animation: 'slide-down 0.2s ease-out'
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>Database Schema Versioning</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Database Engine</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Dexie JS (IndexedDB Wrapper)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Schema Version</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Active Version 2</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Registered Transactions</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{txCount} records</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Registered Subscriptions</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{subCount} records</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Investment Holdings</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{invCount} assets</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Financial Goals</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{goalCount} targets</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>Build Bundle Metadata</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Client App Version</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>v2.0.26 Production</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>React Framework Version</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>React 19.0.0-rc</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vite Compiler Engine</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Vite v6.1.0</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};
