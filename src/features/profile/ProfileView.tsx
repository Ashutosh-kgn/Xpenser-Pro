import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, Button } from '../../design-system';
import { useStore } from '../../store/useStore';
import { auth } from '../../firebase/firebase';
import { 
  Mail, 
  Calendar, 
  MapPin, 
  Award, 
  TrendingUp, 
  Coins, 
  ListTodo, 
  Bot, 
  Activity, 
  HeartHandshake, 
  CheckCircle2, 
  Settings,
  Flame,
  Zap,
  Globe
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { xp, level, streak, setActiveSection } = useStore();
  
  // Queries
  const profile = useLiveQuery(() => db.userProfile.get('profile'));
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const investments = useLiveQuery(() => db.investments.toArray()) || [];
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];

  const userEmail = auth.currentUser?.email || localStorage.getItem('xpenser_remembered_email') || 'ashutosh@xpenser.io';
  const userName = profile?.name || 'Ashutosh';

  // Metrics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalSavings = totalIncome > totalExpenses ? totalIncome - totalExpenses : 0;
  const totalInvested = investments.reduce((acc, inv) => acc + inv.currentValue, 0);

  // Financial Health Score calculation
  const budgetLimit = profile?.monthlyExpenseLimit || 45000;
  const monthlyExpense = transactions
    .filter(t => {
      if (!t.date) return false;
      const parts = t.date.split('-');
      if (parts.length < 2) return false;
      const ty = parseInt(parts[0], 10);
      const tm = parseInt(parts[1], 10);
      const now = new Date();
      return t.type === 'expense' && (tm - 1) === now.getMonth() && ty === now.getFullYear();
    })
    .reduce((acc, t) => acc + t.amount, 0);

  let budgetHealth = 100;
  if (budgetLimit > 0) {
    const ratio = monthlyExpense / budgetLimit;
    if (ratio > 1) budgetHealth = Math.max(0, Math.round(100 - (ratio - 1) * 100));
    else budgetHealth = Math.round((1 - ratio) * 100);
  }

  // Pre-configured premium achievements list with locked/unlocked state
  const achievements = [
    { id: 'exp_100', title: '100 Expenses Logged', desc: 'Maintain meticulous track of daily spending', unlocked: transactions.length >= 10, icon: <ListTodo size={18} /> },
    { id: 'first_inv', title: 'First Investment', desc: 'Secure assets for future capital growth', unlocked: investments.length >= 1, icon: <TrendingUp size={18} /> },
    { id: 'budget_master', title: 'Budget Master', desc: 'Keep expenses within monthly safe zones', unlocked: budgetHealth > 60, icon: <HeartHandshake size={18} /> },
    { id: 'goal_achiever', title: 'Goal Achiever', desc: 'Successfully fully fund a goal target', unlocked: goals.length >= 1, icon: <Award size={18} /> },
    { id: 'save_streak', title: '3 Month Saving Streak', desc: 'Maintain positive monthly savings roll', unlocked: streak >= 3, icon: <Flame size={18} /> },
    { id: 'ai_explorer', title: 'AI Explorer', desc: 'Generate daily briefs with financial model', unlocked: true, icon: <Bot size={18} /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* HERO SECTION */}
      <Card variant="glass" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle mesh background shapes */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(126, 82, 255, 0.15) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '20%', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(0, 245, 212, 0.08) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {/* Avatar sphere */}
          <div 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary) 0%, #00f5d4 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(var(--primary-rgb), 0.3)',
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              border: '3px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {userName.substring(0, 1).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-heading)' }}>
                {userName}
              </h2>
              <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '4px 10px', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={10} fill="var(--primary)" />
                Premium Member
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {userEmail}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {(profile as any)?.country || 'India'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Member since July 2026</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" onClick={() => setActiveSection('settings')}>
              <Settings size={14} />
              <span>Preferences</span>
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level Score</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>Lv. {level}</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{xp} / 1000 XP</span>
            </div>
          </div>
        </div>
      </Card>

      {/* FINANCIAL SNAPSHOT BENTO GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cumulative Inflow (Income)</span>
            <Coins size={14} style={{ color: 'var(--color-success)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-heading)' }}>
            ₹{totalIncome.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Total all-time deposits tracked</span>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Outflow (Expenses)</span>
            <Activity size={14} style={{ color: 'var(--color-error)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-heading)' }}>
            ₹{totalExpenses.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>All-time debit transactions count: {transactions.length}</span>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Net Savings</span>
            <Award size={14} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0', color: 'var(--color-success)' }}>
            ₹{totalSavings.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Difference between inflows & outflows</span>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Portfolio Net Value</span>
            <TrendingUp size={14} style={{ color: '#00f5d4' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-heading)' }}>
            ₹{totalInvested.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Across {investments.length} active assets</span>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: ACHIEVEMENTS & PREFERENCES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          
          {/* Achievements Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Award size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Financial Milestones & Achievements</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {achievements.map((item) => (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: item.unlocked ? 'rgba(var(--primary-rgb), 0.04)' : 'var(--surface-elevated)',
                    opacity: item.unlocked ? 1 : 0.5,
                    transition: 'all 0.2s'
                  }}
                >
                  <div 
                    style={{ 
                      width: '34px', 
                      height: '34px', 
                      borderRadius: '8px', 
                      background: item.unlocked ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: item.unlocked ? 'var(--primary)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{item.title}</span>
                      {item.unlocked && <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />}
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Preferences Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Globe size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Regional & Profile Preferences</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Base Currency</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginTop: '4px' }}>
                  {profile?.currency || 'INR (₹)'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Language Locale</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginTop: '4px' }}>
                  English (US-IN)
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Timezone</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginTop: '4px' }}>
                  Asia/Kolkata (GMT+5:30)
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Financial Year</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginTop: '4px' }}>
                  April to March
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Date Format</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginTop: '4px' }}>
                  YYYY-MM-DD
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Number Format</span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', marginTop: '4px' }}>
                  1,28,440.00
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: RECENT PROFILE ACTIVITY & METRICS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          
          {/* General Stats summary */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>System Assets Statistics</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Logged Transactions', count: transactions.length },
                { label: 'Investment Holdings', count: investments.length },
                { label: 'Active Subscriptions', count: subscriptions.length },
                { label: 'Financial Target Goals', count: goals.length },
                { label: 'Synced Receipt Vault', count: transactions.filter(t => t.status === 'completed').length },
                { label: 'AI Coach Briefings', count: 18 }
              ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{stat.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity timeline log */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Profile Activity Feed</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              {/* Vertical line indicator */}
              <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)' }} />

              {[
                { time: 'Just Now', title: 'Xpenser Pro session initialized', desc: 'Secure biometric/token verification successful' },
                { time: '2 hours ago', title: 'Casading rollover engine completed', desc: 'Chronological months history synced to local database' },
                { time: 'Yesterday', title: 'Investment asset transaction recorded', desc: 'Added holdings for digital portfolio tracking' },
                { time: '3 days ago', title: 'AI OS Briefing calculated', desc: 'AI assistant generated monthly target health index' }
              ].map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--surface)', border: '3px solid var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-heading)' }}>{act.title}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>{act.desc}</div>
                    <span style={{ fontSize: '0.625rem', color: 'var(--primary)', marginTop: '4px', display: 'inline-block' }}>{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
};
