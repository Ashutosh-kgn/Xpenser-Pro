import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, Button } from '../../design-system';
import { useStore } from '../../store/useStore';
import * as echarts from 'echarts';
import { TrendingUp, TrendingDown, Sparkles, Plus, X, Trash2 } from 'lucide-react';

export const InvestmentsView: React.FC = () => {
  const theme = useStore(state => state.theme);
  const addXp = useStore(state => state.addXp);
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Add Asset modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetType, setAssetType] = useState<'stock' | 'etf' | 'crypto' | 'mutual_fund' | 'gold' | 'real_estate' | 'bonds' | 'fd' | 'ppf' | 'commodities'>('mutual_fund');
  const [amountInvested, setAmountInvested] = useState('');
  const [currentValueInput, setCurrentValueInput] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sipAmountInput, setSipAmountInput] = useState('');

  // Load investments from Dexie
  const investments = useLiveQuery(() => db.investments.toArray()) || [];

  // Metrics calculations
  const totalInvested = investments.reduce((acc, inv) => acc + inv.amountInvested, 0);
  const currentValue = investments.reduce((acc, inv) => acc + inv.currentValue, 0);
  const netGain = currentValue - totalInvested;
  const gainPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;
  const totalSip = investments.reduce((acc, inv) => acc + inv.sipAmount, 0);

  // Initialize ECharts for portfolio allocations
  useEffect(() => {
    if (!chartRef.current || investments.length === 0) return;

    // Group values by type
    const grouped = investments.reduce((acc, inv) => {
      const typeLabel = inv.type.toUpperCase().replace('_', ' ');
      acc[typeLabel] = (acc[typeLabel] || 0) + inv.currentValue;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(grouped).map(([name, value]) => ({
      name,
      value
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
        textStyle: {
          color: 'var(--text-heading)',
          fontFamily: 'var(--font-sans)'
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        textStyle: {
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-sans)',
          fontSize: 11
        },
        icon: 'circle'
      },
      series: [
        {
          name: 'Portfolio Allocation',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: isDark ? '#0f1016' : '#ffffff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              formatter: '{b}\n{d}%',
              color: 'var(--text-heading)'
            }
          },
          labelLine: {
            show: false
          },
          color: ['#7e52ff', '#00f5d4', '#ffb300', '#00b0ff', '#4caf50'],
          data: chartData
        }
      ]
    };

    chartInstance.setOption(option);

    // Responsive resize
    const handleResize = () => {
      chartInstance.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [investments, theme]);

  const handleCreateSip = async () => {
    setLoading(true);
    // Simulate updating SIP
    await new Promise(resolve => setTimeout(resolve, 800));
    await addXp(40);
    alert('SIP automation triggered! Added ₹5,000 auto-investment limit. +40 XP awarded.');
    setLoading(false);
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetSymbol || !amountInvested || !currentValueInput || !quantity) {
      alert('Please fill out all required fields.');
      return;
    }
    
    setLoading(true);
    try {
      await db.investments.add({
        name: assetName,
        symbol: assetSymbol.toUpperCase(),
        type: assetType,
        amountInvested: parseFloat(amountInvested) || 0,
        currentValue: parseFloat(currentValueInput) || 0,
        quantity: parseFloat(quantity) || 0,
        sipAmount: parseFloat(sipAmountInput) || 0
      });
      
      await addXp(25);
      setIsAddModalOpen(false);
      
      // Clear fields
      setAssetName('');
      setAssetSymbol('');
      setAmountInvested('');
      setCurrentValueInput('');
      setQuantity('');
      setSipAmountInput('');
      alert('📈 Success! New asset added to your portfolio. Earned +25 XP!');
    } catch (err) {
      console.error(err);
      alert('Failed to save asset: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestment = async (id?: number) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this investment from your portfolio?')) {
      try {
        await db.investments.delete(id);
      } catch (err) {
        console.error('Failed to delete investment:', err);
        alert('Failed to delete investment: ' + String(err));
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Investment Hub</h2>
          <span className="page-subtitle">Track, analyze, and automate your wealth portfolios</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>Add Asset</span>
          </Button>
          <Button variant="primary" onClick={handleCreateSip} disabled={loading}>
            <Sparkles size={16} />
            <span>{loading ? 'Automating...' : 'Set Active SIP'}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Portfolio Value</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0', color: 'var(--text-heading)' }}>
            ₹{currentValue.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invested: ₹{totalInvested.toLocaleString()}</span>
        </Card>

        <Card>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Earnings / Gain</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0', color: netGain >= 0 ? 'var(--color-success)' : 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>₹{netGain.toLocaleString()}</span>
            {netGain >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <span style={{ fontSize: '0.75rem', color: netGain >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {netGain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}% absolute return
          </span>
        </Card>

        <Card>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Auto SIPs</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0', color: 'var(--primary)' }}>
            ₹{totalSip.toLocaleString()}/mo
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next debit on 25th July</span>
        </Card>
      </div>

      {/* Grid: Chart and Asset List */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 'var(--space-lg)' }}>
        
        {/* Allocation Donut Chart */}
        <Card variant="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, width: '100%', marginBottom: '16px', textAlign: 'left' }}>Asset Allocation</h3>
          {investments.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={24} style={{ opacity: 0.4 }} />
              <span>Add holdings to visualize asset allocation charts.</span>
            </div>
          ) : (
            <div ref={chartRef} style={{ width: '100%', height: '240px' }} />
          )}
        </Card>

        {/* Holdings list */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Portfolio Asset Assets</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '300px' }}>
            {investments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '32px 0' }}>
                No active asset holdings. Click "Add Asset" to start tracking your portfolio.
              </div>
            ) : (
              investments.map((inv) => {
                const gain = inv.currentValue - inv.amountInvested;
                const pGain = inv.amountInvested > 0 ? (gain / inv.amountInvested) * 100 : 0;
                return (
                  <div 
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)' }}>{inv.name}</span>
                        <span className="badge badge-info" style={{ fontSize: '0.625rem', padding: '1px 6px' }}>{inv.symbol}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Qty: {inv.quantity} &bull; SIP: {inv.sipAmount > 0 ? `₹${inv.sipAmount.toLocaleString()}/mo` : 'Inactive'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                          ₹{inv.currentValue.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: gain >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500, marginTop: '2px' }}>
                          {gain >= 0 ? '+' : ''}{pGain.toFixed(1)}%
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteInvestment(inv.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-error)';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Delete Investment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 7, 10, 0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setIsAddModalOpen(false)} />
          <Card style={{ position: 'relative', zIndex: 101, width: '460px', padding: '24px', maxWidth: '90%', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>Add Investment Asset</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Asset Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Reliance Industries, Bitcoin" 
                  className="input-field" 
                  value={assetName} 
                  onChange={(e) => setAssetName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ticker Symbol</label>
                  <input 
                    type="text" 
                    placeholder="e.g. RELIANCE, BTC" 
                    className="input-field" 
                    value={assetSymbol} 
                    onChange={(e) => setAssetSymbol(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Asset Type</label>
                  <select 
                    value={assetType} 
                    onChange={(e) => setAssetType(e.target.value as any)} 
                    className="input-field"
                  >
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="stock">Stock Equity</option>
                    <option value="etf">ETF</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="gold">Digital Gold</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="bonds">Bonds (Fixed Income)</option>
                    <option value="fd">Fixed Deposit (FD)</option>
                    <option value="ppf">Provident Fund (PPF)</option>
                    <option value="commodities">Commodities</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount Invested (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 50000" 
                    className="input-field" 
                    value={amountInvested} 
                    onChange={(e) => setAmountInvested(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Current Value (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 58000" 
                    className="input-field" 
                    value={currentValueInput} 
                    onChange={(e) => setCurrentValueInput(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="e.g. 10.5" 
                    className="input-field" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Monthly SIP (₹, Optional)</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="input-field" 
                    value={sipAmountInput} 
                    onChange={(e) => setSipAmountInput(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Adding...' : 'Add Holding'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
