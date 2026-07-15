import React, { useState, useEffect } from 'react';
import { Card } from '../../design-system';
import { Zap, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface MpinViewProps {
  onUnlock: () => void;
  onLogout: () => void;
}

export const MpinView: React.FC<MpinViewProps> = ({ onUnlock, onLogout }) => {
  const addToast = useStore(state => state.addToast);
  const storedMpin = localStorage.getItem('xpenser_mpin');
  
  const [isSetupMode] = useState(!storedMpin);
  const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1 = Enter new PIN, 2 = Confirm new PIN
  const [tempPin, setTempPin] = useState('');
  
  const [inputVal, setInputVal] = useState('');
  const [shake, setShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (errorMessage) setErrorMessage('');
      
      if (e.key >= '0' && e.key <= '9') {
        if (inputVal.length < 4) {
          setInputVal(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setInputVal(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setInputVal('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputVal, errorMessage]);

  // Handle PIN logic when input reaches 4 digits
  useEffect(() => {
    if (inputVal.length === 4) {
      // Process PIN entry after a micro-delay to let the dot highlight
      const timer = setTimeout(() => {
        handlePinSubmit(inputVal);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [inputVal]);

  const handlePinSubmit = (pin: string) => {
    if (isSetupMode) {
      if (setupStep === 1) {
        // Storing first setup attempt
        setTempPin(pin);
        setSetupStep(2);
        setInputVal('');
        setErrorMessage('');
      } else {
        // Confirming setup PIN
        if (pin === tempPin) {
          localStorage.setItem('xpenser_mpin', pin);
          addToast('🔒 Session MPIN successfully configured!', 'success');
          onUnlock();
        } else {
          setShake(true);
          setErrorMessage('PINs do not match. Please try again.');
          setInputVal('');
          setSetupStep(1);
          setTempPin('');
          setTimeout(() => setShake(false), 500);
        }
      }
    } else {
      // Unlock Mode
      if (pin === storedMpin) {
        onUnlock();
      } else {
        setShake(true);
        setErrorMessage('Incorrect MPIN. Please try again.');
        setInputVal('');
        setTimeout(() => setShake(false), 500);
      }
    }
  };

  const handleKeypadPress = (num: string) => {
    if (errorMessage) setErrorMessage('');
    if (inputVal.length < 4) {
      setInputVal(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setInputVal(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputVal('');
    setErrorMessage('');
  };

  return (
    <div className="mpin-lock-container">
      <div className={`mpin-card-wrapper ${shake ? 'error-shake' : ''}`}>
        
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
          <div className="logo-sparkle-badge" style={{ marginBottom: '8px' }}>
            <Zap size={22} fill="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>XPENSER PRO</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Financial Operating System</span>
        </div>

        <Card variant="glass" style={{ padding: 'var(--space-xl)', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ background: isSetupMode ? 'rgba(0, 245, 212, 0.1)' : 'rgba(126, 82, 255, 0.1)', padding: '12px', borderRadius: '50%', color: isSetupMode ? 'var(--color-success)' : 'var(--primary)' }}>
              {isSetupMode ? <ShieldCheck size={28} /> : <Lock size={28} />}
            </div>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-heading)' }}>
            {isSetupMode 
              ? (setupStep === 1 ? 'Configure Security MPIN' : 'Confirm Security MPIN')
              : 'Security Verification Required'
            }
          </h3>
          
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 24px 0', lineHeight: 1.4 }}>
            {isSetupMode 
              ? (setupStep === 1 
                  ? 'Set a 4-digit security PIN to restrict local-first profile access.' 
                  : 'Please re-enter your 4-digit PIN to confirm accuracy.')
              : 'Enter your 4-digit MPIN to unlock your financial workspace.'
            }
          </p>

          {/* PIN Indicators (Dots) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '28px' }}>
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid var(--border)',
                  background: inputVal.length > idx 
                    ? (isSetupMode ? 'var(--color-success)' : 'var(--primary)') 
                    : 'transparent',
                  borderColor: inputVal.length > idx 
                    ? (isSetupMode ? 'var(--color-success)' : 'var(--primary)') 
                    : 'var(--border)',
                  boxShadow: inputVal.length > idx 
                    ? `0 0 10px ${isSetupMode ? 'rgba(0, 245, 212, 0.4)' : 'rgba(126, 82, 255, 0.4)'}` 
                    : 'none',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            ))}
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div 
              style={{ 
                fontSize: '0.8125rem', 
                color: 'var(--color-error)', 
                background: 'rgba(255, 61, 0, 0.08)',
                border: '1px solid rgba(255, 61, 0, 0.15)',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Virtual Numeric Keypad */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px', 
              maxWidth: '240px', 
              margin: '0 auto 24px auto' 
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num)}
                className="mpin-key-btn"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="mpin-key-btn mpin-action-btn"
              style={{ fontSize: '0.75rem' }}
            >
              Clear
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              className="mpin-key-btn"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="mpin-key-btn mpin-action-btn"
              style={{ fontSize: '0.75rem' }}
            >
              Del
            </button>
          </div>

          {/* Switch Account / Sign Out option */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button 
              onClick={onLogout}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-muted)', 
                fontSize: '0.75rem', 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500
              }}
            >
              <RefreshCw size={12} />
              <span>Logout & Switch Account</span>
            </button>
          </div>

        </Card>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .mpin-lock-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: url('/login-bg.png') no-repeat center center / cover;
          width: 100%;
          padding: 24px 16px;
          box-sizing: border-box;
          font-family: var(--font-sans);
        }

        .mpin-card-wrapper {
          width: 100%;
          max-width: 380px;
        }

        .logo-sparkle-badge {
          background: var(--primary);
          padding: 8px;
          border-radius: 10px;
          color: #ffffff;
          display: flex;
          box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
        }

        .mpin-key-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface-elevated);
          color: var(--text-heading);
          font-size: 1.25rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          outline: none;
          user-select: none;
          margin: 0 auto;
        }
        .mpin-key-btn:hover {
          background: var(--border);
          transform: scale(1.05);
          border-color: var(--primary);
        }
        .mpin-key-btn:active {
          transform: scale(0.95);
        }
        .mpin-action-btn {
          color: var(--text-muted);
          border-style: dashed;
        }

        .error-shake {
          animation: shakeMpin 0.5s ease;
        }
        @keyframes shakeMpin {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      ` }} />
    </div>
  );
};
