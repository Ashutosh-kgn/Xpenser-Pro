import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '../../db/db';
import { useStore } from '../../store/useStore';
import { Dialog } from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { recalculateMonthlyHistory } from '../../utils/finance';
import { auth, firestore, storage } from '../../firebase/firebase';
import { doc, collection, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  familyMember: z.enum(['Self', 'Partner', 'Child'])
});

interface AddTransactionModalProps {
  isOpen: boolean;
  type: 'income' | 'expense' | null;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  type,
  onClose
}) => {
  const addXp = useStore(state => state.addXp);
  const editingTransactionId = useStore(state => state.editingTransactionId);
  const setEditingTransactionId = useStore(state => state.setEditingTransactionId);
  const addToast = useStore(state => state.addToast);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [uploadedBillName, setUploadedBillName] = useState<string>('');
  const [uploadedBillUrl, setUploadedBillUrl] = useState<string>('');
  const [fileUploading, setFileUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: type || 'expense',
      amount: 0,
      category: '',
      description: '',
      date: getLocalTodayString(),
      familyMember: 'Self'
    }
  });

  const currentType = type || watch('type') || 'expense';
  const categories = currentType === 'income' 
    ? ['Salary', 'Freelance', 'Dividends', 'Refund', 'Other']
    : ['🍔 Food & Dining', '🚗 Transport', '🏠 Housing', '🎬 Entertainment', '🛒 Grocery', '🩺 Health', '💡 Utilities', '📦 Other'];

  // Handle edit prepopulating or clear defaults
  useEffect(() => {
    if (editingTransactionId) {
      db.transactions.get(editingTransactionId).then(tx => {
        if (tx) {
          setValue('type', tx.type);
          setValue('amount', tx.amount);
          setValue('category', tx.category);
          setValue('description', tx.description || '');
          setValue('date', tx.date);
          setValue('familyMember', tx.familyMember || 'Self');
          setUploadedBillName(tx.billName || '');
          setUploadedBillUrl(tx.billUrl || '');
        }
      }).catch(console.error);
    } else {
      setValue('type', type || 'expense');
      setValue('amount', 0);
      setValue('category', '');
      setValue('description', '');
      setValue('date', getLocalTodayString());
      setValue('familyMember', 'Self');
      setUploadedBillName('');
      setUploadedBillUrl('');
      setSelectedFile(null);
      setFileBase64('');
    }
  }, [editingTransactionId, type, setValue]);

  const handleClose = () => {
    setEditingTransactionId(null);
    reset({
      type: type || 'expense',
      amount: 0,
      category: '',
      description: '',
      date: getLocalTodayString(),
      familyMember: 'Self'
    });
    setUploadedBillName('');
    setUploadedBillUrl('');
    setSelectedFile(null);
    setFileBase64('');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setUploadedBillName(file.name);
    
    // Read file as Base64 for local database storage
    const reader = new FileReader();
    setFileUploading(true);
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setFileUploading(false);
    };
    reader.onerror = (err) => {
      console.error("File reading failed:", err);
      setFileUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: any) => {
    try {
      const user = auth.currentUser;
      const email = user?.email || localStorage.getItem('xpenser_remembered_email') || 'ashutosh@xpenser.io';
      
      const dateParts = data.date.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);

      // Determine transaction ID beforehand
      let txId = editingTransactionId;
      let newDocRef = null;
      
      if (!txId) {
        newDocRef = user 
          ? doc(collection(firestore, 'users', user.uid, 'transactions'))
          : null;
        txId = newDocRef ? newDocRef.id : Math.random().toString(36).substring(2, 15);
      }

      let billUrl = uploadedBillUrl;
      let billName = uploadedBillName;

      // Handle cloud file upload if a new file is specified
      if (selectedFile) {
        if (user) {
          try {
            const storageRef = ref(storage, `users/${user.uid}/receipts/${txId}`);
            await uploadBytes(storageRef, selectedFile);
            billUrl = await getDownloadURL(storageRef);
          } catch (uploadErr) {
            console.error("Firebase Storage upload failed, using local base64:", uploadErr);
            billUrl = fileBase64;
          }
        } else {
          billUrl = fileBase64;
        }
      }

      const formattedData = {
        ...data,
        description: data.description?.trim() || '',
        status: data.familyMember === 'Self' ? 'completed' : 'pending',
        month,
        year,
        billUrl,
        billName
      };

      if (editingTransactionId) {
        // Update local Dexie DB
        await db.transactions.put({ id: editingTransactionId, ...formattedData });
        
        // Sync with Firestore subcollection (omitting raw base64 to avoid size limits)
        if (user) {
          const firestoreData = { ...formattedData };
          if (firestoreData.billUrl && firestoreData.billUrl.startsWith('data:')) {
            firestoreData.billUrl = 'local_attachment';
          }
          await setDoc(doc(firestore, 'users', user.uid, 'transactions', editingTransactionId), {
            ...firestoreData,
            updatedAt: new Date().toISOString()
          });
        }
        
        addToast(`📝 Transaction updated & receipt sent to ${email}`);
      } else {
        // Add to local Dexie DB
        await db.transactions.put({ id: txId, ...formattedData });
        
        // Sync with Firestore subcollection (omitting raw base64 to avoid size limits)
        if (user && newDocRef) {
          const firestoreData = { ...formattedData };
          if (firestoreData.billUrl && firestoreData.billUrl.startsWith('data:')) {
            firestoreData.billUrl = 'local_attachment';
          }
          await setDoc(newDocRef, {
            ...firestoreData,
            timestamp: new Date().toISOString()
          });
        }
        
        await addXp(25);
        addToast(`📧 Transaction recorded! Receipt sent to ${email}`);
      }

      // Re-trigger carry-forward cascade across months
      await recalculateMonthlyHistory();

      handleClose();
    } catch (e) {
      console.error('Failed to save transaction:', e);
      addToast('❌ Failed to save transaction', 'error');
    }
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editingTransactionId ? 'Modify Transaction Details' : (type === 'income' ? 'Add Income Inflow' : 'Record Expense Outflow')}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {!type && !editingTransactionId && (
          <div className="form-group">
            <label className="form-label">Type</label>
            <select 
              {...register('type')} 
              className="input-field"
              style={{ appearance: 'none', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="expense">Expense Outflow</option>
              <option value="income">Income Inflow</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Amount (₹)</label>
          <input 
            type="number" 
            step="any"
            placeholder="0.00" 
            className="input-field" 
            {...register('amount')} 
          />
          {errors.amount?.message && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{String(errors.amount.message)}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select {...register('category')} className="input-field">
            <option value="">Select Category...</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category?.message && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{String(errors.category.message)}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Starbucks Mocha, Freelance invoice" 
            className="input-field" 
            {...register('description')} 
          />
          {errors.description?.message && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{String(errors.description.message)}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="input-field" {...register('date')} />
          {errors.date?.message && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{String(errors.date.message)}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Paid By / Member</label>
          <select {...register('familyMember')} className="input-field">
            <option value="Self">Self (Ashutosh)</option>
            <option value="Partner">Partner (Simulated)</option>
            <option value="Child">Child (Simulated)</option>
          </select>
        </div>

        {currentType === 'expense' && (
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Upload Receipt/Bill (Optional)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="input-field" 
                onChange={handleFileChange}
                style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
              />
              {fileUploading && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>
                  ⏳ Processing file...
                </span>
              )}
              {uploadedBillName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
                  <span>📎 Attached: {uploadedBillName}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedFile(null);
                      setFileBase64('');
                      setUploadedBillName('');
                      setUploadedBillUrl('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                  >
                    (Remove)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting || fileUploading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || fileUploading}>
            {fileUploading ? 'Reading file...' : (isSubmitting ? 'Saving...' : (editingTransactionId ? 'Save Changes' : 'Record Transaction'))}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
