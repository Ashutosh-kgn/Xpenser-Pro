import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Transaction } from '../../db/db';
import { Card } from '../../design-system';
import { useStore } from '../../store/useStore';
import { Check, X, ShieldAlert, Award } from 'lucide-react';

export const FamilyView: React.FC = () => {
  const addXp = useStore(state => state.addXp);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Live queries from Dexie DB
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  
  // Filter pending items
  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  const handleApprove = async (tx: Transaction) => {
    if (!tx.id) return;
    setProcessingId(tx.id);
    
    // Simulate approval lag
    await new Promise(resolve => setTimeout(resolve, 600));
    
    await db.transactions.update(tx.id, { status: 'completed' });
    await addXp(35);
    alert(`Approved ₹${tx.amount.toLocaleString()} for ${tx.description} (${tx.familyMember})! Awarded +35 XP.`);
    setProcessingId(null);
  };

  const handleDecline = async (txId: number) => {
    if (confirm('Are you sure you want to decline this request?')) {
      setProcessingId(txId);
      await new Promise(resolve => setTimeout(resolve, 500));
      await db.transactions.delete(txId);
      alert('Request declined and removed.');
      setProcessingId(null);
    }
  };

  const familyMembers = [
    { name: 'Ashutosh (Self)', role: 'Owner', limit: '₹120,000/mo', spent: '₹18,500' },
    { name: 'Simulated Partner', role: 'Co-owner', limit: '₹50,000/mo', spent: '₹12,000' },
    { name: 'Simulated Child', role: 'Member (Restricted)', limit: '₹5,000/mo', spent: '₹1,428' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Family Space</h2>
          <span className="page-subtitle">Collaborate with family members, manage shared wallets, and approve budgets</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {familyMembers.map((member, idx) => (
          <Card key={idx} variant={member.role.includes('Owner') ? 'glowing' : 'standard'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-heading)' }}>{member.name}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.role}</span>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>Active</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Limit: {member.limit}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Spent: {member.spent}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Grid: Pending Approvals & Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--space-lg)' }}>
        
        {/* Approvals list */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(255, 179, 0, 0.1)', color: 'var(--color-warning)', padding: '6px', borderRadius: '6px' }}>
              <ShieldAlert size={18} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Expense Approval Queue</h3>
          </div>

          {pendingTransactions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              🎉 All clear! No pending family approval requests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingTransactions.map((tx) => {
                const isLoader = processingId === tx.id;
                return (
                  <div 
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)' }}>{tx.description}</span>
                        <span className="badge badge-warning" style={{ fontSize: '0.55rem', padding: '1px 6px' }}>{tx.familyMember}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Amount: <strong>₹{tx.amount.toLocaleString()}</strong> &bull; Category: {tx.category}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn btn-secondary btn-icon-only" 
                        onClick={() => tx.id && handleDecline(tx.id)}
                        disabled={isLoader}
                        style={{ color: 'var(--color-error)' }}
                        title="Decline request"
                      >
                        <X size={14} />
                      </button>
                      <button 
                        className="btn btn-primary btn-icon-only" 
                        onClick={() => handleApprove(tx)}
                        disabled={isLoader}
                        style={{ background: 'var(--color-success)' }}
                        title="Approve request"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Info card */}
        <Card variant="glass" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: 'var(--color-warning)' }} />
            <span>Co-op Financial Rewards</span>
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Collaborating with family members helps you unlock compound financial achievements. Every time you review expenses, approve kids' school budgets, or establish saving milestones together, you secure:
          </p>
          <ul style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '12px 0 0 16px', lineHeight: '1.6' }}>
            <li><strong>+35 XP</strong> for expense approval activities</li>
            <li>Unlock "Collaborator" rank achievements</li>
            <li>Double streak multipliers when saving targets are met collectively</li>
          </ul>
        </Card>
      </div>

    </div>
  );
};
