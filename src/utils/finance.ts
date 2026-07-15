import { db } from '../db/db';
import { auth, firestore } from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Recalculates monthly summaries sequentially starting from the earliest transaction
 * up to the current date + 2 months, cascading the carryForward balance to the next month's openingBalance.
 */
export async function recalculateMonthlyHistory(): Promise<void> {
  try {
    const transactions = await db.transactions.toArray();
    
    // Determine the start date and range (timezone-neutral)
    let startYear = new Date().getFullYear();
    let startMonth = new Date().getMonth(); // 0-indexed
    
    if (transactions.length > 0) {
      let earliestYear = startYear;
      let earliestMonth = startMonth;
      let earliestTime = Infinity;
      
      for (const t of transactions) {
        if (!t.date) continue;
        const parts = t.date.split('-');
        if (parts.length >= 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1; // 0-indexed
          const d = parseInt(parts[2], 10);
          const time = new Date(y, m, d).getTime();
          if (!isNaN(time) && time < earliestTime) {
            earliestTime = time;
            earliestYear = y;
            earliestMonth = m;
          }
        }
      }
      startYear = earliestYear;
      startMonth = earliestMonth;
    }
    
    // We want to calculate up to today + 2 months
    const today = new Date();
    const endYear = today.getFullYear();
    const endMonth = today.getMonth() + 2; // 0-indexed plus buffer
    
    let currentOpeningBalance = 0;
    
    // Generate chronological list of year-months to process
    let y = startYear;
    let m = startMonth;
    
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const yearStr = String(y);
      const monthStr = String(m + 1).padStart(2, '0');
      const yearMonth = `${yearStr}-${monthStr}`;
      
      // Calculate month metrics (timezone-neutral)
      const monthTxs = transactions.filter(t => {
        if (!t.date) return false;
        const parts = t.date.split('-');
        if (parts.length < 2) return false;
        const ty = parseInt(parts[0], 10);
        const tm = parseInt(parts[1], 10);
        return ty === y && tm === (m + 1);
      });
      
      const income = monthTxs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expenses = monthTxs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      // Fetch budget limit from profile
      const profile = await db.userProfile.get('profile');
      const budget = profile?.monthlyExpenseLimit ?? 40000;
      
      // Carry Forward Logic
      const remaining = currentOpeningBalance + income - expenses;
      const carryForward = remaining > 0 ? remaining : 0;
      
      const monthSummary = {
        yearMonth,
        income,
        expenses,
        budget,
        remaining,
        carryForward,
        openingBalance: currentOpeningBalance
      };
      
      // Save locally to Dexie
      await db.months.put(monthSummary);
      
      // Sync with Firebase Firestore in the background (non-blocking)
      const user = auth.currentUser;
      if (user) {
        setDoc(doc(firestore, 'users', user.uid, 'months', yearMonth), {
          ...monthSummary,
          updatedAt: new Date().toISOString()
        }).catch(fbErr => {
          console.warn(`Firestore sync skipped for ${yearMonth}:`, fbErr);
        });
      }
      
      // Cascade carryForward to next month's openingBalance
      currentOpeningBalance = carryForward;
      
      // Advance to next month
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
  } catch (err) {
    console.error('Error running cascading carry-forward engine:', err);
  }
}

/**
 * Synchronizes the local user profile database properties directly to the cloud user document in Firestore.
 */
export async function syncProfileToCloud(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const profile = await db.userProfile.get('profile');
    if (!profile) return;

    const userDocRef = doc(firestore, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};

    await setDoc(userDocRef, {
      ...existingData,
      profile,
      updatedAt: new Date().toISOString()
    });
    console.log("☁️ Synchronized user profile settings with Firestore.");
  } catch (err) {
    console.warn("Failed to synchronize user profile with cloud Firestore:", err);
  }
}
