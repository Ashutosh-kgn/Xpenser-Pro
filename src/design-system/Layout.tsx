import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db, seedDatabase } from '../db/db';
import { CommandPalette } from './CommandPalette';
import { AddTransactionModal } from '../features/transactions/AddTransactionModal';
import { auth, firestore } from '../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  TrendingUp, 
  CreditCard, 
  Sliders, 
  Users, 
  Bot, 
  Award, 
  Search, 
  Plus, 
  Flame, 
  Sparkles,
  Sun,
  Moon,
  Settings,
  History,
  User,
  X,
  Menu,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    activeSection,
    setActiveSection,
    theme,
    setTheme,
    commandPaletteOpen,
    setCommandPaletteOpen,
    activeTransactionModal,
    setActiveTransactionModal,
    xp,
    level,
    streak,
    syncProfileData
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync profile details on mount
  useEffect(() => {
    syncProfileData();
  }, [syncProfileData]);

  // Global keyboard listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Gamification Level-Up confetti animation
  useEffect(() => {
    const handleLevelUp = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLevel = customEvent.detail?.level;
      
      // Fire confetti burst!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#7e52ff', '#00f5d4', '#ffb300', '#ff3d00']
      });

      // Show alert or toast notification (simulation)
      alert(`🎉 Level Up! You reached Level ${newLevel}! Keep spending smart and saving!`);
    };

    window.addEventListener('xpenser-level-up', handleLevelUp);
    return () => window.removeEventListener('xpenser-level-up', handleLevelUp);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'history', label: 'History', icon: <History size={18} /> },
    { id: 'investments', label: 'Investments', icon: <TrendingUp size={18} /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={18} /> },
    { id: 'budgets', label: 'Smart Budget', icon: <Sliders size={18} /> },
    { id: 'family', label: 'Family Space', icon: <Users size={18} /> },
    { id: 'ai', label: 'AI Coach', icon: <Bot size={18} /> },
    { id: 'gamification', label: 'Gamification', icon: <Award size={18} /> },
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ] as const;

  const handleResetDb = async () => {
    if (confirm('Are you sure you want to reset all database data to standard seed states?')) {
      await db.transactions.clear();
      await db.subscriptions.clear();
      await db.investments.clear();
      await db.goals.clear();
      await db.userProfile.clear();
      await seedDatabase();
      await syncProfileData();
      alert('Database restored successfully.');
      window.location.reload();
    }
  };

  return (
    <>
      <div className="noise-overlay" />
      <div className="app-layout">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="app-sidebar">
          <div 
            onClick={() => setActiveSection('dashboard')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: 'var(--space-2xl)', 
              paddingLeft: '8px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="Xpenser Pro Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, var(--text-heading), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Xpenser Pro
            </h1>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeSection === item.id ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent',
                  color: activeSection === item.id ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: activeSection === item.id ? 600 : 500,
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer with Reset & Theme */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setCommandPaletteOpen(true)}
              style={{ justifyContent: 'flex-start', padding: '8px 12px', fontSize: '0.8125rem' }}
            >
              <Search size={16} />
              <span>Command Center (⌘K)</span>
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Theme: {theme}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setTheme('light')} style={{ background: 'transparent', border: 'none', color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }} title="Light mode"><Sun size={14} /></button>
                <button onClick={() => setTheme('dark')} style={{ background: 'transparent', border: 'none', color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }} title="Dark mode"><Moon size={14} /></button>
                <button onClick={() => setTheme('amoled')} style={{ background: 'transparent', border: 'none', color: theme === 'amoled' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }} title="AMOLED mode">A</button>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN DISPLAY AREA */}
        <main className="app-main">
          
          {/* HEADER BAR */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '16px' }}>
            
            {/* Header Search Trigger */}
            <div 
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '280px',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem'
              }}
            >
              <Search size={14} />
              <span style={{ flex: 1 }}>Search Xpenser Pro...</span>
              <span style={{ fontSize: '0.6875rem', background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>⌘K</span>
            </div>

            {/* Profile Health details & actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              
              {/* Gamification Indicator */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem'
                }}
              >
                {/* Level / XP */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Lv. {level}
                    <Sparkles size={12} style={{ color: 'var(--color-warning)' }} />
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{xp % 250}/250 XP</span>
                </div>
                
                {/* Visual Progress bar */}
                <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${((xp % 250) / 250) * 100}%`, height: '100%', background: 'var(--primary)' }} />
                </div>

                {/* Streak */}
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)' }}>
                  <Flame size={16} fill="var(--color-warning)" />
                  <span style={{ fontWeight: 600 }}>{streak}d</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActiveTransactionModal('income')}
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                >
                  <Plus size={14} style={{ color: 'var(--color-success)' }} />
                  <span>Income</span>
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setActiveTransactionModal('expense')}
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                >
                  <Plus size={14} />
                  <span>Expense</span>
                </button>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="fade-in" style={{ minHeight: 'calc(100vh - 220px)' }}>
            {children}
          </div>

          {/* PAGE FOOTER */}
          <footer 
            style={{ 
              borderTop: '1px solid var(--border)', 
              marginTop: '48px', 
              paddingTop: '24px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '16px', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)' 
            }}
          >
            <span>Xpenser Pro v2.0.26 &bull; AI Financial Operating System</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Sync: Cloud Decrypted (IndexedDB Local-First)</span>
              <span>Security: Passkey Enforced</span>
            </div>
          </footer>
        </main>

        {/* MOBILE NAVIGATION BAR (PORTRAIT SCREEN BAR) */}
        <nav 
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'none', // Shown only in CSS media queries on small screens
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
          className="mobile-bottom-nav"
        >
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { id: 'history', label: 'History', icon: <History size={18} /> },
            { id: 'ai', label: 'Coach', icon: <Bot size={18} /> },
            { id: 'profile', label: 'Profile', icon: <User size={18} /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id as any);
                setIsMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'transparent',
                border: 'none',
                color: activeSection === item.id ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                width: '60px'
              }}
            >
              {item.icon}
              <span style={{ fontSize: '0.625rem', fontWeight: activeSection === item.id ? 600 : 500 }}>
                {item.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: 'transparent',
              border: 'none',
              color: isMobileMenuOpen ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              width: '60px'
            }}
          >
            <Menu size={18} />
            <span style={{ fontSize: '0.625rem', fontWeight: isMobileMenuOpen ? 600 : 500 }}>Menu</span>
          </button>
        </nav>

        {/* MOBILE SLIDE-UP DRAWER OVERLAY */}
        {isMobileMenuOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(9, 9, 11, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div 
              style={{
                width: '100%',
                maxWidth: '480px',
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '24px 20px 40px 20px',
                boxSizing: 'border-box',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>Navigation Menu</h3>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Grid of All Sections */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 8px',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: activeSection === item.id ? 'rgba(var(--primary-rgb), 0.08)' : 'var(--surface-elevated)',
                      color: activeSection === item.id ? 'var(--primary)' : 'var(--text-heading)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ color: activeSection === item.id ? 'var(--primary)' : 'var(--text-muted)' }}>{item.icon}</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Footer action */}
              <button 
                onClick={async () => {
                  setIsMobileMenuOpen(false);
                  if (confirm('Are you sure you want to sign out?')) {
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        const subscriptions = await db.subscriptions.toArray();
                        const investments = await db.investments.toArray();
                        const goals = await db.goals.toArray();
                        const profile = await db.userProfile.get('profile');
                        
                        await setDoc(doc(firestore, 'users', user.uid), {
                          subscriptions,
                          investments,
                          goals,
                          profile,
                          updatedAt: new Date().toISOString()
                        });
                      } catch (backupErr) {
                        console.warn('Auto backup skipped on logout:', backupErr);
                      }
                    }

                    // Clear local DB tables
                    await db.transactions.clear();
                    await db.subscriptions.clear();
                    await db.investments.clear();
                    await db.goals.clear();
                    await db.userProfile.clear();
                    await db.months.clear();

                    try {
                      const { signOut: firebaseSignOut } = await import('firebase/auth');
                      await firebaseSignOut(auth);
                    } catch (err) {
                      console.warn('Firebase signout bypassed:', err);
                    }
                    localStorage.removeItem('xpenser_auth');
                    localStorage.removeItem('xpenser_mpin');
                    window.location.reload();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 61, 0, 0.2)',
                  background: 'rgba(255, 61, 0, 0.05)',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.875rem'
                }}
              >
                <LogOut size={16} />
                <span>Logout Session</span>
              </button>

            </div>
          </div>
        )}

        {/* CSS rules to handle Responsive Mobile Navigation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 1024px) {
            .mobile-bottom-nav {
              display: flex !important;
            }
          }
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        ` }} />

        {/* OVERLAYS */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={(sec) => setActiveSection(sec as any)}
          onAddTransaction={(t) => setActiveTransactionModal(t)}
          onToggleTheme={(th) => setTheme(th)}
          onResetDb={handleResetDb}
        />

        <AddTransactionModal
          isOpen={activeTransactionModal !== null}
          type={activeTransactionModal}
          onClose={() => setActiveTransactionModal(null)}
        />

      </div>
    </>
  );
};
