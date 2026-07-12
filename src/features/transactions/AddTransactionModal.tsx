import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '../../db/db';
import { useStore } from '../../store/useStore';
import { Dialog } from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { recalculateMonthlyHistory } from '../../utils/finance';
import { auth } from '../../firebase/firebase';

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
      date: new Date().toISOString().split('T')[0],
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
        }
      }).catch(console.error);
    } else {
      setValue('type', type || 'expense');
      setValue('amount', 0);
      setValue('category', '');
      setValue('description', '');
      setValue('date', new Date().toISOString().split('T')[0]);
      setValue('familyMember', 'Self');
    }
  }, [editingTransactionId, type, setValue]);

  const handleClose = () => {
    setEditingTransactionId(null);
    reset({
      type: type || 'expense',
      amount: 0,
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      familyMember: 'Self'
    });
    onClose();
  };

  const onSubmit = async (data: any) => {
    try {
      const formattedData = {
        ...data,
        description: data.description?.trim() || '',
        status: data.familyMember === 'Self' ? 'completed' : 'pending'
      };

      const email = auth.currentUser?.email || localStorage.getItem('xpenser_remembered_email') || 'ashutosh@xpenser.io';

      if (editingTransactionId) {
        await db.transactions.update(editingTransactionId, formattedData);
        addToast(`📝 Transaction updated & receipt sent to ${email}`);
      } else {
        await db.transactions.add(formattedData);
        await addXp(25);
        addToast(`📧 Transaction recorded! Receipt sent to ${email}`);
      }

      // Re-trigger carry-forward cascade across months
      await recalculateMonthlyHistory();

      handleClose();
    } catch (e) {
      console.error('Failed to save transaction:', e);
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

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (editingTransactionId ? 'Save Changes' : 'Record Transaction')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
