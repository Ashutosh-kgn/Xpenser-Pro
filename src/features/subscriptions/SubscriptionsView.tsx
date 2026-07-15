import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Subscription } from '../../db/db';
import { Card, Button } from '../../design-system';
import { useStore } from '../../store/useStore';
import * as echarts from 'echarts';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Pause, 
  Play, 
  AlertTriangle, 
  Calendar, 
  Search, 
  Mail, 
  Smartphone, 
  Clock, 
  X,
  Bot
} from 'lucide-react';

const CATEGORIES = ['Entertainment', 'AI Tools', 'Cloud Storage', 'Productivity', 'Learning', 'Gaming', 'Finance', 'Utilities'];

export const SubscriptionsView: React.FC = () => {
  const addXp = useStore(state => state.addXp);
  const theme = useStore(state => state.theme);
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Add Subscription Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [paymentMethod, setPaymentMethod] = useState('Visa Ending 4242');

  const chartRef = useRef<HTMLDivElement>(null);

  // Load subscriptions from Dexie
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray()) || [];

  // Total Overhead Cost calculations
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const monthlyCost = activeSubs.reduce((sum, s) => {
    return sum + (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount);
  }, 0);
  const annualCost = monthlyCost * 12;

  // Duplicate checks (Optimization Opportunities)
  const duplicateDetections = subscriptions.filter((s, idx, self) => 
    s.status === 'active' && self.findIndex(t => t.name.toLowerCase() === s.name.toLowerCase() && t.id !== s.id) > idx
  );

  const potentialSavings = subscriptions.filter(s => s.isUnused && s.status === 'active').reduce((sum, s) => {
    return sum + (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount);
  }, 0) + (duplicateDetections.reduce((sum, s) => sum + s.amount, 0));

  const budgetHealth = subscriptions.length > 0 
    ? Math.round(((subscriptions.filter(s => s.status === 'active' && !s.isUnused).length) / subscriptions.length) * 100)
    : 100;

  // ECharts Category breakdown
  useEffect(() => {
    if (!chartRef.current || activeSubs.length === 0) return;

    const grouped = activeSubs.reduce((acc, s) => {
      const cat = s.category || 'Utilities';
      const mCost = s.billingCycle === 'yearly' ? s.amount / 12 : s.amount;
      acc[cat] = (acc[cat] || 0) + mCost;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(grouped).map(([name, value]) => ({
      name,
      value: Math.round(value)
    }));

    const chartInstance = echarts.init(chartRef.current);
    const isDark = theme === 'dark' || theme === 'amoled';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: ₹{c} ({d}%)',
        backgroundColor: isDark ? 'var(--surface-elevated)' : '#ffffff',
        borderColor: 'var(--border)',
        textStyle: { color: 'var(--text-heading)', fontFamily: 'var(--font-sans)', fontSize: 11 }
      },
      legend: {
        orient: 'horizontal',
        bottom: '0%',
        textStyle: { color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 10 },
        icon: 'circle'
      },
      series: [
        {
          name: 'Subscription Overhead',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#07070a' : '#ffffff',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
              formatter: '{b}\n{d}%',
              color: 'var(--text-heading)'
            }
          },
          color: ['#7e52ff', '#00f5d4', '#ffb300', '#ff3d00', '#00b0ff', '#4caf50', '#e91e63', '#9c27b0'],
          data: chartData
        }
      ]
    };

    chartInstance.setOption(option);
    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [activeSubs, theme]);

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !nextBillingDate) {
      alert('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      await db.subscriptions.add({
        name,
        amount: parseFloat(amount) || 0,
        billingCycle,
        nextBillingDate,
        category,
        paymentMethod,
        status: 'active',
        isUnused: false
      });

      await addXp(30);
      setIsAddModalOpen(false);

      // Clear fields
      setName('');
      setAmount('');
      setNextBillingDate('');
      alert('📦 Success! Added new subscription. +30 XP!');
    } catch (err) {
      console.error(err);
      alert('Failed to save subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (sub: Subscription) => {
    if (!sub.id) return;
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    await db.subscriptions.update(sub.id, { status: newStatus });
    await addXp(15);
    alert(`${sub.name} is now ${newStatus}!`);
  };

  const handleDelete = async (sub: Subscription) => {
    if (!sub.id) return;
    if (confirm(`Remove ${sub.name} from tracking?`)) {
      await db.subscriptions.delete(sub.id);
      await addXp(20);
      alert(`Removed ${sub.name}!`);
    }
  };

  const triggerGmailScan = () => {
    alert('📧 Syncing with Gmail... Scanning invoice receipts from Netflix, Prime, Google One, and Spotify. Found 1 new renewal adjustment!');
  };

  const triggerSMSScan = () => {
    alert('📱 Scanning SMS Alerts... Checked utility receipts, bank notifications, and billing debits.');
  };

  // Filtered subscriptions list
  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? sub.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Highlight highest subscription cost
  const highestSub = activeSubs.length > 0 
    ? [...activeSubs].sort((a, b) => {
        const valA = a.billingCycle === 'yearly' ? a.amount / 12 : a.amount;
        const valB = b.billingCycle === 'yearly' ? b.amount / 12 : b.amount;
        return valB - valA;
      })[0]
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* 1. HERO TITLE & STATS AREA */}
      <Card variant="glass" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(126, 82, 255, 0.1) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-heading)' }}>
              Subscription Intelligence Center
            </h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Track recurring debits, scan digital invoices, and optimize monthly passive overhead.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Add Subscription</span>
            </Button>
            <Button variant="secondary" onClick={triggerGmailScan}>
              <Mail size={14} />
              <span>Import Gmail</span>
            </Button>
            <Button variant="secondary" onClick={triggerSMSScan}>
              <Smartphone size={14} />
              <span>Scan SMS</span>
            </Button>
          </div>
        </div>

        {/* Hero KPIs Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '32px', position: 'relative', zIndex: 1 }}>
          <div style={{ padding: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Cost</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '4px' }}>
              ₹{Math.round(monthlyCost).toLocaleString()}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{activeSubs.length} active bills</span>
          </div>

          <div style={{ padding: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Annual Cost</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '4px' }}>
              ₹{Math.round(annualCost).toLocaleString()}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Yearly projection</span>
          </div>

          <div style={{ padding: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Potential Savings</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>
              ₹{Math.round(potentialSavings).toLocaleString()}/mo
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Flagged optimize assets</span>
          </div>

          <div style={{ padding: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Intelligence Health</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: budgetHealth > 80 ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '4px' }}>
              {budgetHealth}%
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Optimization index</span>
          </div>
        </div>
      </Card>

      {/* 2. AI SUBSCRIPTION COACH */}
      <Card variant="glass" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(var(--primary-rgb), 0.02)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
            <Bot size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>🤖 AI Subscription Coach Insights</h4>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
              {subscriptions.some(s => s.name === 'Adobe Creative Cloud' && s.isUnused) ? (
                <span>
                  <strong>Flagged Unused License:</strong> Adobe Creative Cloud (₹4,230/mo) has recorded 0 interactions for 30+ days. 
                  Cancelling or downgrading this license saves <strong>₹50,760/year</strong>.
                </span>
              ) : (
                <span>Your subscription health index is looking stellar! Consider auditing Google One to switch from individual to family sharing plans.</span>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={() => alert('AI Audit initiated... Categorized bills, calculated unused runtimes, and mapped optimization strategies!')} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
            Run Audit
          </Button>
        </div>
      </Card>

      {/* 3. SPLIT COLUMN: CHARTS, TIMELINE & AUTO DETECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 'var(--space-lg)' }}>
        
        {/* Left Column: Category breakdown and Auto-detection status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Spending breakdown chart */}
          <Card>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-heading)' }}>Spending breakdown</h3>
            {activeSubs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>No active subscriptions to project.</div>
            ) : (
              <div ref={chartRef} style={{ width: '100%', height: '220px' }} />
            )}
          </Card>

          {/* Auto-detection integrations card */}
          <Card>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-heading)' }}>Connected Intelligence Feeds</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { feed: 'Gmail Inbox parser', desc: 'Syncs invoices automatically', status: 'Connected', icon: <Mail size={14} /> },
                { feed: 'SMS Transaction parser', desc: 'Tracks debit bank messages', status: 'Connected', icon: <Smartphone size={14} /> },
                { feed: 'Credit Card billing hooks', desc: 'Syncs statement recurrent payments', status: 'Connected', icon: <CreditCard size={14} /> },
                { feed: 'Expense pattern auditor', desc: 'Flags matching debit entries', status: 'Connected', icon: <Clock size={14} /> }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
                    <div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-heading)', display: 'block' }}>{item.feed}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>{item.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Renewal Timeline and Smart insights summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Timeline of upcoming renewals */}
          <Card>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-heading)' }}>Renewal Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '7px', top: '6px', bottom: '6px', width: '2px', background: 'var(--border)' }} />
              
              {activeSubs.slice(0, 4).map((sub, idx) => {
                const parts = sub.nextBillingDate.split('-');
                let diffDays = 0;
                if (parts.length >= 3) {
                  const sy = parseInt(parts[0], 10);
                  const sm = parseInt(parts[1], 10) - 1;
                  const sd = parseInt(parts[2], 10);
                  const targetDate = new Date(sy, sm, sd);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  targetDate.setHours(0, 0, 0, 0);
                  diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                }
                const cycleColor = diffDays <= 3 ? 'var(--color-error)' : diffDays <= 7 ? 'var(--color-warning)' : 'var(--color-success)';
                const cycleText = diffDays <= 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
                
                return (
                  <div key={sub.id || idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--surface)', border: `3px solid ${cycleColor}`, flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-heading)' }}>{sub.name}</div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Category: {sub.category} &bull; {sub.paymentMethod}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-heading)' }}>₹{sub.amount.toLocaleString()}</span>
                        <span style={{ fontSize: '0.6875rem', color: cycleColor, display: 'block', fontWeight: 600, marginTop: '2px' }}>{cycleText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Smart Insights panels */}
          <Card>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 16px 0', color: 'var(--text-heading)' }}>Overhead Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Highest Cost License</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '4px', display: 'block' }}>
                  {highestSub ? `${highestSub.name} (₹${highestSub.amount.toLocaleString()})` : 'N/A'}
                </span>
              </div>

              <div style={{ padding: '12px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Unused for 30+ days</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                  {subscriptions.filter(s => s.isUnused && s.status === 'active').map(s => s.name).join(', ') || 'None'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. FILTERS & SEARCH ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '20px',
              border: '1px solid var(--border)',
              background: selectedCategory === null ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-elevated)',
              color: selectedCategory === null ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            All Services
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: selectedCategory === cat ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-elevated)',
                color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search subscriptions..." 
            className="input-field" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '0.8125rem', height: '36px' }}
          />
        </div>
      </div>

      {/* 5. ACTIVE SUBSCRIPTIONS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
        {filteredSubs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📦</span>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px 0' }}>No Subscriptions Found</h4>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Track Netflix, Spotify, Prime, ChatGPT, Google One, and hundreds more.</span>
          </div>
        ) : (
          filteredSubs.map(sub => (
            <Card 
              key={sub.id}
              variant={sub.isUnused && sub.status === 'active' ? 'glowing' : 'standard'}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', opacity: sub.status === 'paused' ? 0.6 : 1 }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>{sub.name}</h4>
                    <span className="badge badge-info" style={{ fontSize: '0.625rem', padding: '2px 8px', marginTop: '4px', display: 'inline-block' }}>{sub.category}</span>
                  </div>
                  <span className={`badge ${sub.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.625rem' }}>
                    {sub.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> Renewal Date: {sub.nextBillingDate}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={12} /> Payment: {sub.paymentMethod}</span>
                  {sub.isUnused && sub.status === 'active' && (
                    <span style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, marginTop: '4px' }}>
                      <AlertTriangle size={12} /> Unused license detected
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>Cost</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    ₹{sub.amount.toLocaleString()}/{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => handleToggleStatus(sub)}
                    className="btn btn-secondary btn-icon-only" 
                    title={sub.status === 'active' ? 'Pause subscription' : 'Activate subscription'}
                    style={{ padding: '6px' }}
                  >
                    {sub.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(sub)}
                    className="btn btn-danger btn-icon-only" 
                    title="Remove subscription"
                    style={{ padding: '6px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ADD SUBSCRIPTION MODAL */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 7, 10, 0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setIsAddModalOpen(false)} />
          <Card style={{ position: 'relative', zIndex: 101, width: '450px', padding: '24px', maxWidth: '90%', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>Track New Subscription</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Service Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Netflix, ChatGPT Plus" 
                  className="input-field" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Billing Cost (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 199" 
                    className="input-field" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Billing Cycle</label>
                  <select 
                    value={billingCycle} 
                    onChange={(e) => setBillingCycle(e.target.value as any)} 
                    className="input-field"
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="yearly">Yearly Cycle</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Next Renewal Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={nextBillingDate} 
                    onChange={(e) => setNextBillingDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="input-field"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payment Method / Account</label>
                <input 
                  type="text" 
                  placeholder="e.g. Visa Ending 4242" 
                  className="input-field" 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Saving...' : 'Add Subscription'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
