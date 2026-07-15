import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Card, Button, ProgressRing } from '../../design-system';
import { useStore } from '../../store/useStore';
import * as echarts from 'echarts';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Bot, 
  ArrowRightLeft,
  Home,
  Plane,
  Heart,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign
} from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { recalculateMonthlyHistory } from '../../utils/finance';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DashboardView: React.FC = () => {
  const { budgetMode, setActiveSection, setActiveTransactionModal } = useStore();
  const selectedMonth = useStore(state => state.selectedMonth);
  const selectedYear = useStore(state => state.selectedYear);
  const isMonthLoading = useStore(state => state.isMonthLoading);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // Live queries from Dexie.js
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const investments = useLiveQuery(() => db.investments.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  const profile = useLiveQuery(() => db.userProfile.get('profile'));
  
  // Calculate dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const greeting = getGreeting();
  const userName = profile?.name || 'Ashutosh';
  
  // Retrieve the month summary for the active selected month
  const selectedYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthSummary = useLiveQuery(() => db.months.get(selectedYearMonth), [selectedYearMonth]);

  // Retrieve the summary for the previous month to check carryForward statuses
  const prevMonthNum = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevYearMonth = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}`;
  const prevMonthSummary = useLiveQuery(() => db.months.get(prevYearMonth), [prevYearMonth]);

  // Calculate dynamic stats
  const [metrics, setMetrics] = useState({
    netWorth: 0,
    totalIncome: 0,
    totalExpense: 0,
    openingBalance: 0,
    availableBalance: 0,
    savings: 0,
    carryForward: 0,
    budgetLimit: 0,
    yesterdaySpend: 0,
    aiScore: 82
  });

  // Recalculate and fetch metrics when selected month or transactions change
  useEffect(() => {
    const fetchMetrics = async () => {
      // Fetch total investments values
      const totalInvest = investments.reduce((acc, inv) => acc + inv.currentValue, 0);

      // Extract details for current month
      const income = monthSummary ? monthSummary.income : 0;
      const expense = monthSummary ? monthSummary.expenses : 0;
      const opening = monthSummary ? monthSummary.openingBalance : 0;
      const carry = monthSummary ? monthSummary.carryForward : 0;
      const budget = monthSummary ? monthSummary.budget : 0;
      
      const available = opening + income - expense;
      const savings = income - expense;

      // Calculate Net Worth: Cash available (All Incomes - All Expenses) + Investments
      const allTxs = await db.transactions.toArray();
      const allIncome = allTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const allExpense = allTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const allCash = allIncome - allExpense;
      const net = allCash + totalInvest;

      // Calculate yesterday's spend
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const ySpend = allTxs
        .filter(t => t.type === 'expense' && t.date === yesterdayStr)
        .reduce((acc, t) => acc + t.amount, 0);

      // AI Health Score calculations
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      let score = 70;
      if (savingsRate > 50) score = 95;
      else if (savingsRate > 30) score = 88;
      else if (savingsRate > 15) score = 82;
      else if (savingsRate > 0) score = 75;
      else score = 45;

      setMetrics({
        netWorth: net,
        totalIncome: income,
        totalExpense: expense,
        openingBalance: opening,
        availableBalance: available,
        savings,
        carryForward: carry,
        budgetLimit: budget,
        yesterdaySpend: ySpend,
        aiScore: score
      });
    };

    fetchMetrics();
  }, [transactions, investments, monthSummary]);

  // Initial trigger calculation on mount
  useEffect(() => {
    recalculateMonthlyHistory();
  }, [transactions.length]);

  // Update ECharts line chart for selected month
  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    chartInstance.current = echarts.init(chartRef.current);

    const dates: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    // Calculate days in the selected month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(`${day} ${MONTHS[selectedMonth - 1].substring(0, 3)}`);
      
      const dayTxs = transactions.filter(t => {
        if (!t.date) return false;
        const parts = t.date.split('-');
        if (parts.length < 3) return false;
        const ty = parseInt(parts[0], 10);
        const tm = parseInt(parts[1], 10);
        const td = parseInt(parts[2], 10);
        return ty === selectedYear && tm === selectedMonth && td === day;
      });
      const inc = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const exp = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      
      incomeData.push(inc);
      expenseData.push(exp);
    }

    const isAMOLED = document.documentElement.getAttribute('data-theme') === 'amoled';
    const primaryColor = '#7e52ff';
    const textColor = isAMOLED ? '#868c98' : '#64748b';
    const borderGridColor = isAMOLED ? '#1e1e24' : '#e2e8f0';

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isAMOLED ? '#0f0f15' : '#ffffff',
        borderColor: isAMOLED ? '#22222a' : '#e2e8f0',
        textStyle: { color: isAMOLED ? '#f1f5f9' : '#0f172a' }
      },
      legend: {
        data: ['Inflow (Income)', 'Outflow (Expenses)'],
        textStyle: { color: textColor },
        bottom: 0,
        icon: 'circle'
      },
      grid: {
        top: '8%',
        left: '2%',
        right: '2%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: borderGridColor } },
        axisLabel: { color: textColor, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: borderGridColor, type: 'dashed' } },
        axisLabel: { color: textColor, fontSize: 10 }
      },
      series: [
        {
          name: 'Inflow (Income)',
          type: 'line',
          smooth: true,
          data: incomeData,
          symbol: 'none',
          lineStyle: { width: 3, color: primaryColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(126, 82, 255, 0.25)' },
              { offset: 1, color: 'rgba(126, 82, 255, 0)' }
            ])
          }
        },
        {
          name: 'Outflow (Expenses)',
          type: 'line',
          smooth: true,
          data: expenseData,
          symbol: 'none',
          lineStyle: { width: 2, type: 'dashed', color: '#ff3d00' }
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [transactions, selectedMonth, selectedYear]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  const getGoalIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('home') || lowerName.includes('house')) return <Home size={18} style={{ color: 'var(--primary)' }} />;
    if (lowerName.includes('escape') || lowerName.includes('vacation') || lowerName.includes('trip') || lowerName.includes('tokyo')) return <Plane size={18} style={{ color: 'var(--primary)' }} />;
    return <Heart size={18} style={{ color: 'var(--primary)' }} />;
  };

  const getTimelineDateLabel = (dateStr: string) => {
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter transactions for the selected month timeline
  const monthTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const parts = t.date.split('-');
    if (parts.length < 2) return false;
    const ty = parseInt(parts[0], 10);
    const tm = parseInt(parts[1], 10);
    return ty === selectedYear && tm === selectedMonth;
  });
  const sortedTransactions = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  let lastDateLabel = '';

  // Carry Forward details
  const prevMonthName = prevMonthNum === 1 ? 'January' : MONTHS[prevMonthNum - 1];
  const nextMonthName = selectedMonth === 12 ? 'January' : MONTHS[selectedMonth];
  const isPrevExceeded = prevMonthSummary && prevMonthSummary.remaining < 0;

  // Budget calculations
  const budgetConsumedPercent = metrics.budgetLimit > 0 
    ? Math.min(100, Math.round((metrics.totalExpense / metrics.budgetLimit) * 100)) 
    : 0;

  // Month Progress calculations
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const currentDay = new Date().getMonth() + 1 === selectedMonth && new Date().getFullYear() === selectedYear 
    ? new Date().getDate() 
    : daysInCurrentMonth;
  const monthPercentCompleted = Math.round((currentDay / daysInCurrentMonth) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      
      {/* Welcome Header and Month selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-heading)' }}>
            {greeting}, {userName} 👋
          </h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Here is your financial operating snapshot for the month.
          </span>
        </div>
        <MonthSelector />
      </div>

      {/* 1. HERO LEDGERS ROW */}
      <div className="stitch-hero-grid" style={{ marginBottom: 0 }}>
        
        {/* Available Balance snapshot */}
        <div className="stitch-hero-left card card-glowing" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              Available Balance
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', margin: '16px 0 24px 0' }}>
              <h2 style={{ fontSize: '2.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                ₹{isMonthLoading ? '000,000' : metrics.availableBalance.toLocaleString()}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                (Total Inflows - Total Expenses)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Opening Bal</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                  ₹{isMonthLoading ? '0,000' : metrics.openingBalance.toLocaleString()}
                </p>
              </div>
              <div style={{ borderLeft: '2px solid var(--color-success)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Month Income</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                  ₹{isMonthLoading ? '0,000' : metrics.totalIncome.toLocaleString()}
                </p>
              </div>
              <div style={{ borderLeft: '2px solid var(--color-error)', paddingLeft: '12px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Month Expense</span>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                  ₹{isMonthLoading ? '0,000' : metrics.totalExpense.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Briefing Panel */}
        <div className="stitch-hero-right card card-glass" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <Bot size={18} style={{ margin: 'auto' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>AI OS Briefing</h4>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Selected month analysis</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-heading)', lineHeight: '1.4', display: 'block' }}>
                  {metrics.totalExpense > metrics.budgetLimit && metrics.budgetLimit > 0 ? (
                    <strong style={{ color: 'var(--color-error)' }}>Alert: You have exceeded this month's budget target.</strong>
                  ) : (
                    <span>Operating savings for this month: <strong style={{ color: 'var(--color-success)' }}>₹{metrics.savings.toLocaleString()}</strong>.</span>
                  )}
                </span>
              </div>
              <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-heading)', lineHeight: '1.4', display: 'block' }}>
                  AI Health Index sits at <strong>{metrics.aiScore}/100</strong> under <strong>{budgetMode.toUpperCase()}</strong> limits.
                </span>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => setActiveSection('ai')} 
            style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '0.8125rem' }}
          >
            <span>Ask AI Assistant</span>
            <ChevronRight size={14} />
          </Button>
        </div>

      </div>

      {/* 2. ROLLOVER BENTO CARDS DECK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        
        {/* Opening Balance Card */}
        <Card style={{ padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opening Balance</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 2px 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                ₹{isMonthLoading ? '0,000' : metrics.openingBalance.toLocaleString()}
              </h4>
            </div>
            <div style={{ color: 'var(--primary)', opacity: 0.8 }}><ArrowDownLeft size={20} /></div>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            {isPrevExceeded ? (
              <span style={{ color: 'var(--color-error)' }}>Previous month exceeded budget.</span>
            ) : (
              <span>Carried from {prevMonthName}</span>
            )}
          </span>
        </Card>

        {/* Monthly Savings Card */}
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Savings</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 2px 0', color: metrics.savings >= 0 ? 'var(--color-success)' : 'var(--color-error)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                {metrics.savings >= 0 ? '+' : ''}₹{isMonthLoading ? '0,000' : metrics.savings.toLocaleString()}
              </h4>
            </div>
            <div style={{ color: metrics.savings >= 0 ? 'var(--color-success)' : 'var(--color-error)', opacity: 0.8 }}><DollarSign size={20} /></div>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Savings Rate: {metrics.totalIncome > 0 ? ((metrics.savings / metrics.totalIncome) * 100).toFixed(1) : '0'}%
          </span>
        </Card>

        {/* Carry Forward Card */}
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Carry Forward</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 2px 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                ₹{isMonthLoading ? '0,000' : metrics.carryForward.toLocaleString()}
              </h4>
            </div>
            <div style={{ color: 'var(--primary)', opacity: 0.8 }}><ArrowUpRight size={20} /></div>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
            Rollover target to {nextMonthName}
          </span>
        </Card>

        {/* Budget Health Card */}
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Budget Health</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 2px 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                {budgetConsumedPercent}%
              </h4>
            </div>
            <span className={`badge ${budgetConsumedPercent > 100 ? 'badge-error' : budgetConsumedPercent > 80 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.55rem' }}>
              {budgetConsumedPercent > 100 ? 'Over' : 'Safe'}
            </span>
          </div>
          
          <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
            <div 
              style={{ 
                width: `${budgetConsumedPercent}%`, 
                height: '100%', 
                background: budgetConsumedPercent > 100 ? 'var(--color-error)' : 'var(--primary)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
        </Card>

        {/* Monthly Progress Card */}
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Progress</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 2px 0', color: 'var(--text-heading)' }} className={isMonthLoading ? 'skeleton-loading' : ''}>
                {monthPercentCompleted}%
              </h4>
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Day {currentDay}/{daysInCurrentMonth}
            </span>
          </div>

          <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
            <div 
              style={{ 
                width: `${monthPercentCompleted}%`, 
                height: '100%', 
                background: 'var(--primary)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
        </Card>

      </div>

      {/* 3. MAIN FORECASTS, BENTO GOALS, TIMELINE GRID */}
      <div className="stitch-content-grid">
        
        {/* Left Column (Forecast & Goals) */}
        <div className="stitch-content-left" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          {/* Forecast Area Line Chart */}
          <Card style={{ padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Cash Flow Forecast</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily transactions chart</span>
              </div>
              <span className="badge badge-info" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            {/* ECharts ref container */}
            <div ref={chartRef} style={{ height: '260px', width: '100%', position: 'relative' }} />
          </Card>

          {/* Goals (Bento style row) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
            {goals.slice(0, 3).map((g, idx) => {
              const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
              return (
                <div 
                  key={g.id || idx} 
                  onClick={() => setActiveSection('budgets')}
                  className="card card-hover-elevate"
                  style={{ 
                    padding: 'var(--space-md)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    borderRadius: '20px'
                  }}
                >
                  <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '12px' }}>
                    <ProgressRing progress={percent} size={72} strokeWidth={6} color="var(--primary)" backgroundColor="var(--border)">
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
                        <div style={{ margin: 'auto', display: 'flex' }}>
                          {getGoalIcon(g.name)}
                        </div>
                      </div>
                    </ProgressRing>
                  </div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', margin: '4px 0 0 0' }}>{g.name}</h4>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', margin: '4px 0 0 0', fontFamily: 'monospace' }}>{percent}%</p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column (Timeline Thread) */}
        <div className="stitch-content-right card card-glass" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', maxHeight: '550px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Timeline</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Month audit trail</span>
            </div>
            <Button variant="ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveTransactionModal('expense')}>
              <Plus size={14} />
              <span>Add</span>
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', position: 'relative' }} className="timeline-scroll">
            
            {/* Thread timeline line */}
            <div 
              style={{ 
                position: 'absolute', 
                left: '19px', 
                top: '12px', 
                bottom: '12px', 
                width: '1px', 
                background: 'var(--border)', 
                zIndex: 0 
              }} 
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 1 }}>
              {sortedTransactions.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transactions recorded this month.
                </div>
              ) : (
                sortedTransactions.map((t, idx) => {
                  const dateLabel = getTimelineDateLabel(t.date);
                  const showHeader = dateLabel !== lastDateLabel;
                  if (showHeader) {
                    lastDateLabel = dateLabel;
                  }

                  return (
                    <div key={t.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {showHeader && (
                        <span 
                          style={{ 
                            fontSize: '0.6875rem', 
                            fontWeight: 700, 
                            color: 'var(--text-muted)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em',
                            background: 'var(--surface-elevated)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            alignSelf: 'flex-start',
                            border: '1px solid var(--border)',
                            margin: '4px 0 2px 0'
                          }}
                        >
                          {dateLabel}
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        {/* Icon Circle */}
                        <div 
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '50%', 
                            background: t.type === 'income' ? 'rgba(0, 230, 118, 0.1)' : t.type === 'expense' ? 'rgba(255, 61, 0, 0.1)' : 'rgba(var(--primary-rgb), 0.1)', 
                            border: '2px solid var(--surface)', 
                            color: t.type === 'income' ? 'var(--color-success)' : t.type === 'expense' ? 'var(--color-error)' : 'var(--primary)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexShrink: 0,
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          {t.type === 'income' ? <TrendingUp size={14} /> : t.type === 'expense' ? <TrendingDown size={14} /> : <ArrowRightLeft size={14} />}
                        </div>

                        {/* Content details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                              {t.description}
                            </span>
                            <span 
                              style={{ 
                                fontSize: '0.8125rem', 
                                fontWeight: 700, 
                                color: t.type === 'income' ? 'var(--color-success)' : t.type === 'expense' ? 'var(--color-error)' : 'var(--text-heading)' 
                              }}
                            >
                              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}₹{t.amount.toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {t.category} {t.status === 'pending' && <span className="badge badge-warning" style={{ fontSize: '0.5rem', padding: '0px 4px', marginLeft: '6px' }}>Pending</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Skeleton loading styles injected */}
      <style dangerouslySetInnerHTML={{ __html: `
        .skeleton-loading {
          animation: skeleton-blink 1.2s infinite ease-in-out;
          background: var(--border);
          color: transparent !important;
          border-radius: 4px;
        }
        @keyframes skeleton-blink {
          50% { opacity: 0.4; }
        }
      ` }} />

    </div>
  );
};
