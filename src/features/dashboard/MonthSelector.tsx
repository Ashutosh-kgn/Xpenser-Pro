import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { recalculateMonthlyHistory } from '../../utils/finance';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthSelector: React.FC = () => {
  const selectedMonth = useStore(state => state.selectedMonth);
  const selectedYear = useStore(state => state.selectedYear);
  const setSelectedMonth = useStore(state => state.setSelectedMonth);
  const setSelectedYear = useStore(state => state.setSelectedYear);
  const setIsMonthLoading = useStore(state => state.setIsMonthLoading);

  // Year list option range from 2024 up to 2030
  const years = Array.from({ length: 2030 - 2024 + 1 }, (_, i) => 2024 + i);

  // Maximum allowed navigation date: December 2030
  const maxNavDate = new Date(2030, 11, 31);

  const handlePrevMonth = async () => {
    setIsMonthLoading(true);
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    
    await recalculateMonthlyHistory();
    setIsMonthLoading(false);
  };

  const handleNextMonth = async () => {
    // Check if next month exceeds max allowed navigation date
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    const nextDate = new Date(newYear, newMonth - 1, 1);
    if (nextDate > maxNavDate) return; // Future month not allowed

    setIsMonthLoading(true);
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);

    await recalculateMonthlyHistory();
    setIsMonthLoading(false);
  };

  // Keyboard Navigation shortcuts (← previous, → next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in form inputs
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isTyping) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevMonth();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMonth, selectedYear]);

  // Dropdown manual selections
  const onMonthChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsMonthLoading(true);
    const newMonth = parseInt(e.target.value);
    setSelectedMonth(newMonth);
    await recalculateMonthlyHistory();
    setIsMonthLoading(false);
  };

  const onYearChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsMonthLoading(true);
    const newYear = parseInt(e.target.value);
    setSelectedYear(newYear);
    await recalculateMonthlyHistory();
    setIsMonthLoading(false);
  };

  // Check if next month is disabled
  const checkNextDisabled = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const nextDate = new Date(newYear, newMonth - 1, 1);
    return nextDate > maxNavDate;
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        background: 'var(--surface-elevated)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-sm)', 
        padding: '4px 8px'
      }}
    >
      <button 
        onClick={handlePrevMonth}
        className="btn-prev"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s'
        }}
        title="Previous Month (ArrowLeft)"
      >
        <ArrowLeft size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px', color: 'var(--text-heading)', fontSize: '0.875rem', fontWeight: 600 }}>
        <Calendar size={14} style={{ color: 'var(--primary)', marginRight: '4px' }} />
        
        {/* Month Selector Dropdown */}
        <select
          value={selectedMonth}
          onChange={onMonthChange}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-heading)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            paddingRight: '4px'
          }}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1} style={{ background: 'var(--surface-elevated)', color: 'var(--text-heading)' }}>
              {name}
            </option>
          ))}
        </select>

        {/* Year Selector Dropdown */}
        <select
          value={selectedYear}
          onChange={onYearChange}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-heading)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {years.map(y => (
            <option key={y} value={y} style={{ background: 'var(--surface-elevated)', color: 'var(--text-heading)' }}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleNextMonth}
        disabled={checkNextDisabled()}
        style={{
          background: 'transparent',
          border: 'none',
          color: checkNextDisabled() ? 'var(--border)' : 'var(--text-muted)',
          cursor: checkNextDisabled() ? 'not-allowed' : 'pointer',
          padding: '6px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s'
        }}
        title="Next Month (ArrowRight)"
      >
        <ArrowRight size={16} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .btn-prev:hover {
          background: rgba(var(--primary-rgb), 0.1);
          color: var(--primary);
        }
      ` }} />
    </div>
  );
};
