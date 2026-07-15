import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { db, seedDatabase } from './db/db';
import { Layout } from './design-system/Layout';
import { LoginView } from './features/auth/LoginView';
import { MpinView } from './features/auth/MpinView';
import { DashboardView } from './features/dashboard/DashboardView';
import { InvestmentsView } from './features/investments/InvestmentsView';
import { SubscriptionsView } from './features/subscriptions/SubscriptionsView';
import { BudgetView } from './features/budget/BudgetView';
import { FamilyView } from './features/family/FamilyView';
import { AICoachView } from './features/assistant/AICoachView';
import { GamificationView } from './features/gamification/GamificationView';
import { SettingsView } from './features/settings/SettingsView';
import { HistoryView } from './features/history/HistoryView';
import { ProfileView } from './features/profile/ProfileView';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from './firebase/firebase';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';

function App() {
  const activeSection = useStore(state => state.activeSection);
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const setIsAuthenticated = useStore(state => state.setIsAuthenticated);
  const setFirebaseUser = useStore(state => state.setFirebaseUser);
  const syncProfileData = useStore(state => state.syncProfileData);
  const toasts = useStore(state => state.toasts);
  const removeToast = useStore(state => state.removeToast);
  
  const [dbReady, setDbReady] = useState(false);
  const [isMpinUnlocked, setIsMpinUnlocked] = useState(false);

  // Clear lock states if authenticated drops
  useEffect(() => {
    if (!isAuthenticated) {
      setIsMpinUnlocked(false);
      localStorage.removeItem('xpenser_mpin');
    }
  }, [isAuthenticated]);

  // Auto-backup profile data and wipe DB on logout
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout? Your latest profile will be backed up to the cloud.')) {
      // 1. Silent cloud auto-backup of profile parameters to users/{uid}
      const user = auth.currentUser;
      if (user) {
        try {
          const subscriptions = await db.subscriptions.toArray();
          const investments = await db.investments.toArray();
          const goals = await db.goals.toArray();
          const profile = await db.userProfile.get('profile');

          await setDoc(doc(firestore, 'users', user.uid), {
            subscriptions,
            investments,
            goals,
            profile,
            updatedAt: new Date().toISOString()
          });
        } catch (backupErr) {
          console.warn('Auto backup skipped on logout:', backupErr);
        }
      }

      // 2. Clear IndexedDB for user privacy & session isolation
      await db.transactions.clear();
      await db.subscriptions.clear();
      await db.investments.clear();
      await db.goals.clear();
      await db.userProfile.clear();
      await db.months.clear();

      try {
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Firebase signout bypassed:', err);
      }
      localStorage.removeItem('xpenser_auth');
      localStorage.removeItem('xpenser_mpin');
      setIsAuthenticated(false);
      setIsMpinUnlocked(false);
      window.location.reload();
    }
  };

  // Subscribe to Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setFirebaseUser({
          uid: user.uid,
          email: user.email
        });

        // 3. Auto-restore cloud data if IndexedDB is currently empty (e.g. login on new device/fresh signin)
        try {
          const txCount = await db.transactions.count();
          if (txCount === 0) {
            const docSnap = await getDoc(doc(firestore, 'users', user.uid));
            
            // Fetch transactions collection
            const txsSnap = await getDocs(collection(firestore, 'users', user.uid, 'transactions'));
            const txsData: any[] = [];
            txsSnap.forEach(d => {
              txsData.push({ id: d.id, ...d.data() });
            });

            // Fetch months collection
            const monthsSnap = await getDocs(collection(firestore, 'users', user.uid, 'months'));
            const monthsData: any[] = [];
            monthsSnap.forEach(d => {
              monthsData.push({ yearMonth: d.id, ...d.data() });
            });

            await db.transactions.clear();
            await db.subscriptions.clear();
            await db.investments.clear();
            await db.goals.clear();
            await db.userProfile.clear();
            await db.months.clear();
            
            if (txsData.length > 0) await db.transactions.bulkAdd(txsData);
            if (monthsData.length > 0) await db.months.bulkPut(monthsData);

            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.subscriptions) await db.subscriptions.bulkAdd(data.subscriptions);
              if (data.investments) await db.investments.bulkAdd(data.investments);
              if (data.goals) await db.goals.bulkAdd(data.goals);
              if (data.profile) await db.userProfile.put(data.profile);
            }

            // Recalculate monthly history locally to ensure carry-forwards are updated
            const { recalculateMonthlyHistory } = await import('./utils/finance');
            await recalculateMonthlyHistory();
            
            await syncProfileData();
            console.log('☁️ Auto-restored user workspace data from Firestore cloud.');
          }
        } catch (restoreErr) {
          console.warn('Auto-restore skipped:', restoreErr);
        }
      } else {
        const localAuth = localStorage.getItem('xpenser_auth') === 'true';
        if (!localAuth) {
          setIsAuthenticated(false);
          setFirebaseUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, [setIsAuthenticated, setFirebaseUser, syncProfileData]);

  useEffect(() => {
    const initializeDb = async () => {
      try {
        await seedDatabase();
        setDbReady(true);
      } catch (e) {
        console.error('Database initialization failed:', e);
        setDbReady(true);
      }
    };
    initializeDb();
  }, []);

  if (!dbReady) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#07070a',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          gap: '16px'
        }}
      >
        <div 
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#7e52ff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <span style={{ fontSize: '0.875rem', color: '#868c98' }}>Booting Xpenser Pro...</span>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        ` }} />
      </div>
    );
  }

  // Auth Gate
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // MPIN Lock Gate
  if (!isMpinUnlocked) {
    return (
      <MpinView 
        onUnlock={() => setIsMpinUnlocked(true)} 
        onLogout={handleLogout} 
      />
    );
  }

  const renderView = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'investments':
        return <InvestmentsView />;
      case 'subscriptions':
        return <SubscriptionsView />;
      case 'budgets':
        return <BudgetView />;
      case 'family':
        return <FamilyView />;
      case 'ai':
        return <AICoachView />;
      case 'gamification':
        return <GamificationView />;
      case 'settings':
        return <SettingsView />;
      case 'history':
        return <HistoryView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <Layout>
      {renderView()}
      
      {/* Toast notifications container */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(20, 20, 25, 0.95)',
              border: toast.type === 'error' ? '1px solid var(--color-error)' : '1px solid var(--border)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
              maxWidth: '350px'
            }}
          >
            {toast.message}
          </div>
        ))}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes toast-slide-in {
            from { transform: translateY(16px) scale(0.95); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        ` }} />
      </div>
    </Layout>
  );
}

export default App;
