import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Card, Button } from '../../design-system';
import { Flame, CheckCircle, Lock, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export const GamificationView: React.FC = () => {
  const { xp, level, streak, addXp } = useStore();
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClaimChallenge = async () => {
    if (claimed) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Confetti effect!
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#7e52ff', '#00f5d4', '#ffb300']
    });

    await addXp(100);
    setClaimed(true);
    alert('Challenge completed! You earned +100 XP and accelerated your savings! Streak extended.');
    setLoading(false);
  };

  const achievements = [
    { name: 'Savings Sentinel', desc: 'Save > 20% of your income for 3 consecutive months', unlocked: true, points: '150 XP' },
    { name: 'Portfolio Master', desc: 'Diversify investments across 3 separate asset classes', unlocked: true, points: '200 XP' },
    { name: 'Subscription Slayer', desc: 'Deactivate or consolidate at least 1 duplicate subscription license', unlocked: true, points: '120 XP' },
    { name: 'Centurion Wealth', desc: 'Accumulate ₹10,00,000 total portfolio valuation', unlocked: false, points: '500 XP' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Financial Gamification</h2>
          <span className="page-subtitle">Complete quests, elevate your financial rank, and unlock rewards</span>
        </div>
      </div>

      {/* Main rank summary card */}
      <Card variant="glowing" style={{ padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Rank Title</span>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Level {level} Elite Saver</span>
              <Trophy size={24} style={{ color: 'var(--color-warning)' }} />
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Accumulated experience points: {xp} XP</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 179, 0, 0.05)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', color: 'var(--color-warning)' }}>
            <Flame size={24} fill="var(--color-warning)" />
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{streak} Days</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Active Savings Streak</div>
            </div>
          </div>
        </div>

        {/* Level bar progress */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span>Level Progress</span>
            <span>{xp % 250} / 250 XP</span>
          </div>
          <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${((xp % 250) / 250) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </Card>

      {/* Grid: Challenges and Achievements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        
        {/* Active quests */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Savings Quests</h3>
          
          <div 
            style={{ 
              padding: '16px', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--surface-elevated)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-success" style={{ fontSize: '0.55rem', marginBottom: '8px' }}>Weekly Quest</span>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)' }}>No Spend Weekend Challenge</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Complete 48 hours without any non-essential restaurant or retail transactions.
                </p>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>+100 XP</span>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: <strong>{claimed ? 'Completed & Claimed' : '2/2 days completed'}</strong></span>
              <Button 
                variant={claimed ? 'secondary' : 'primary'} 
                onClick={handleClaimChallenge} 
                disabled={claimed || loading}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                {claimed ? 'Claimed ✓' : loading ? 'Claiming...' : 'Claim 100 XP'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Achievements list */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Unlocked Badges</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {achievements.map((ach, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: ach.unlocked ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: ach.unlocked ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                    {ach.unlocked ? <CheckCircle size={18} /> : <Lock size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: ach.unlocked ? 'var(--text-heading)' : 'var(--text-muted)' }}>{ach.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>{ach.desc}</div>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ach.unlocked ? 'var(--primary)' : 'var(--text-muted)' }}>{ach.points}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

    </div>
  );
};
