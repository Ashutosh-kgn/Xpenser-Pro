import React, { useState, useEffect, useRef } from 'react';
import { Search, Compass, Palette, Plus, RefreshCw, X, Zap, History } from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'Settings';
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
  onAddTransaction: (type: 'income' | 'expense') => void;
  onToggleTheme: (theme: 'dark' | 'light' | 'amoled') => void;
  onResetDb: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onAddTransaction,
  onToggleTheme,
  onResetDb
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'Jump to financial snapshot & briefings',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('dashboard'); onClose(); }
    },
    {
      id: 'nav-history',
      title: 'Go to History Logs',
      description: 'View and export transaction audit spreadsheets',
      category: 'Navigation',
      icon: <History size={16} />,
      action: () => { onNavigate('history'); onClose(); }
    },
    {
      id: 'nav-investments',
      title: 'Go to Investment Hub',
      description: 'View portfolio performance & SIPs',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('investments'); onClose(); }
    },
    {
      id: 'nav-subscriptions',
      title: 'Go to Subscription Center',
      description: 'Manage active subscriptions & duplicates',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('subscriptions'); onClose(); }
    },
    {
      id: 'nav-budgets',
      title: 'Go to Smart Budget',
      description: 'Adjust adaptive budgets & vacation modes',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('budgets'); onClose(); }
    },
    {
      id: 'nav-family',
      title: 'Go to Family Space',
      description: 'Manage shared wallets & child approval queue',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('family'); onClose(); }
    },
    {
      id: 'nav-ai',
      title: 'Go to AI Coach',
      description: 'Ask questions or check financial forecasts',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('ai'); onClose(); }
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Configure profile, themes, and backups',
      category: 'Navigation',
      icon: <Compass size={16} />,
      action: () => { onNavigate('settings'); onClose(); }
    },
    {
      id: 'action-expense',
      title: 'Add Expense',
      description: 'Record a new cash outflow',
      category: 'Actions',
      icon: <Plus size={16} style={{ color: 'var(--color-error)' }} />,
      action: () => { onAddTransaction('expense'); onClose(); }
    },
    {
      id: 'action-income',
      title: 'Add Income',
      description: 'Record a new salary or credit inflow',
      category: 'Actions',
      icon: <Plus size={16} style={{ color: 'var(--color-success)' }} />,
      action: () => { onAddTransaction('income'); onClose(); }
    },
    {
      id: 'theme-dark',
      title: 'Theme: Soft Dark',
      description: 'Switch to glowing soft dark minimalism',
      category: 'Settings',
      icon: <Palette size={16} />,
      action: () => { onToggleTheme('dark'); onClose(); }
    },
    {
      id: 'theme-light',
      title: 'Theme: Stripe Light',
      description: 'Switch to sleek ambient light theme',
      category: 'Settings',
      icon: <Palette size={16} />,
      action: () => { onToggleTheme('light'); onClose(); }
    },
    {
      id: 'theme-amoled',
      title: 'Theme: Pure AMOLED Black',
      description: 'Switch to high-contrast deep black layout',
      category: 'Settings',
      icon: <Palette size={16} />,
      action: () => { onToggleTheme('amoled'); onClose(); }
    },
    {
      id: 'action-reset',
      title: 'Reset DB to Seed Data',
      description: 'Restore initial transactions and settings',
      category: 'Settings',
      icon: <RefreshCw size={16} />,
      action: () => { onResetDb(); onClose(); }
    }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const activeEl = containerRef.current?.querySelector('.command-item-active');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'var(--blur-md)',
        WebkitBackdropFilter: 'var(--blur-md)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 2000,
        animation: 'backdropFadeIn 150ms ease-out forwards'
      }}
      onClick={onClose}
    >
      <div 
        ref={containerRef}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          width: '90%',
          maxWidth: '600px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '450px',
          animation: 'modalSlideUp 200ms var(--ease-spring) forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '10px' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search sections..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.9375rem',
              color: 'var(--text-heading)'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.6875rem', background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>ESC</span>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Command list items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No commands matching "{search}"
            </div>
          ) : (
            // Group by category
            Object.entries(
              filteredCommands.reduce((acc, cmd) => {
                if (!acc[cmd.category]) acc[cmd.category] = [];
                acc[cmd.category].push(cmd);
                return acc;
              }, {} as Record<string, CommandItem[]>)
            ).map(([category, items]) => (
              <div key={category}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {category}
                </div>
                {items.map((cmd) => {
                  const absoluteIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                  const isActive = absoluteIndex === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      className={isActive ? 'command-item-active' : ''}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-xs)',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent',
                        transition: 'background var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {cmd.icon}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: isActive ? 'var(--primary)' : 'var(--text-heading)' }}>
                            {cmd.title}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {cmd.description}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', gap: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                          <span>Run</span>
                          <Zap size={10} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
