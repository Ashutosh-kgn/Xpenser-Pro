import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { useStore } from '../../store/useStore';
import { Sliders, ShieldAlert, Sparkles, Umbrella, Library, Gift, Wallet } from 'lucide-react';
import { syncProfileToCloud } from '../../utils/finance';

export const BudgetView: React.FC = () => {
  const { addXp } = useStore();
  const [expenseLimit, setExpenseLimit] = useState(45000);
  const [tempLimit, setTempLimit] = useState('45000');
  const [loading, setLoading] = useState(false);

  // Load profile from DB
  const profile = useLiveQuery(() => db.userProfile.get('profile'));
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  // Calculate current monthly expenses
  const totalExpense = transactions
    .filter(t => t.type === 'expense' && t.status !== 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  useEffect(() => {
    if (profile) {
      setExpenseLimit(profile.monthlyExpenseLimit ?? 45000);
      setTempLimit(String(profile.monthlyExpenseLimit ?? 45000));
    }
  }, [profile]);

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = Number(tempLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      alert('Please enter a valid positive limit');
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    await db.userProfile.update('profile', { monthlyExpenseLimit: limitNum });
    await syncProfileToCloud();
    setExpenseLimit(limitNum);
    await addXp(25);
    alert('Smart Expense Limit updated! Awarded +25 XP.');
    setLoading(false);
  };

  const handleModeChange = async (mode: 'salary' | 'vacation' | 'emergency' | 'festival' | 'student' | 'ai') => {
    let newLimit = 45000;
    if (mode === 'vacation') newLimit = 80000;
    else if (mode === 'emergency') newLimit = 15000;
    else if (mode === 'festival') newLimit = 65000;
    else if (mode === 'student') newLimit = 20000;
    else if (mode === 'ai') newLimit = 38000;

    await db.userProfile.update('profile', { 
      budgetMode: mode,
      monthlyExpenseLimit: newLimit
    });
    await syncProfileToCloud();
    
    useStore.setState({ budgetMode: mode });
    setExpenseLimit(newLimit);
    setTempLimit(String(newLimit));
    await addXp(30);
    alert(`Switched to ${mode.toUpperCase()} mode! Monthly expense limit adjusted to ₹${newLimit.toLocaleString()}. +30 XP awarded.`);
  };

  const budgetUsagePercent = Math.min(100, Math.round((totalExpense / expenseLimit) * 100));

  const budgetModes = [
    { id: 'ai', label: 'AI Adaptive', icon: <Sparkles size={16} />, desc: 'AI adjusts limits based on historical models' },
    { id: 'salary', label: 'Standard Salary', icon: <Wallet size={16} />, desc: 'Standard savings and allocations' },
    { id: 'vacation', label: 'Vacation Mode', icon: <Umbrella size={16} />, desc: 'Raises limits for restaurants and travel' },
    { id: 'emergency', label: 'Emergency Core', icon: <ShieldAlert size={16} />, desc: 'Restricts non-essential spending categories' },
    { id: 'festival', label: 'Festival Season', icon: <Gift size={16} />, desc: 'Allocates extra space for shopping and gifts' },
    { id: 'student', label: 'Student Mode', icon: <Library size={16} />, desc: 'Tight focus on books, dining, and transit' }
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Smart Budget</h2>
          <span className="page-subtitle">Configure adaptive limit models to keep your finances optimized</span>
        </div>
      </div>

      {/* Usage card */}
      <Card variant="glowing">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget Consumption</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>
              ₹{totalExpense.toLocaleString()} / ₹{expenseLimit.toLocaleString()}
            </h2>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: budgetUsagePercent > 85 ? 'var(--color-error)' : 'var(--primary)' }}>
            {budgetUsagePercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div 
            style={{ 
              width: `${budgetUsagePercent}%`, 
              height: '100%', 
              background: budgetUsagePercent > 85 ? 'var(--color-error)' : 'var(--primary)',
              transition: 'width 0.5s ease'
            }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Spent so far</span>
          <span>{expenseLimit - totalExpense > 0 ? `₹${(expenseLimit - totalExpense).toLocaleString()} available` : 'Budget exceeded!'}</span>
        </div>
      </Card>

      {/* Two Column details */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--space-lg)' }}>
        
        {/* Budget modes */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Adaptive Budget Modes</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {budgetModes.map((mode) => {
              const isActive = profile?.budgetMode === mode.id;
              return (
                <div 
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: isActive ? 'rgba(var(--primary-rgb), 0.06)' : 'var(--surface-elevated)',
                    cursor: 'pointer',
                    borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {mode.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? 'var(--primary)' : 'var(--text-heading)' }}>
                        {mode.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {mode.desc}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>Active</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Change manual limits card */}
        <Card variant="glass" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Adjust Core Limit</h3>
          <form onSubmit={handleUpdateLimit}>
            <div className="form-group">
              <label className="form-label">Monthly Expense Cap (₹)</label>
              <input 
                type="number" 
                className="input-field"
                value={tempLimit}
                onChange={(e) => setTempLimit(e.target.value)} 
              />
            </div>
            <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
              <Sliders size={16} />
              <span>{loading ? 'Saving limits...' : 'Update Expense Cap'}</span>
            </Button>
          </form>
        </Card>
      </div>

    </div>
  );
};
