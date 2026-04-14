// components/PaymentForm.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PaymentFormProps {
  sessionId: string;
  sourceType: 'SUPPLIER_PAYMENT' | 'EXPENSE' | 'SALARY' | 'ADVANCE_ISSUE';
  sourceId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentForm({ sessionId, sourceType, sourceId, onSuccess, onError }: PaymentFormProps) {
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [accountProvider, setAccountProvider] = useState<'MTN' | 'AIRTEL'>('MTN');
  const [narrative, setNarrative] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const externalReference = `${sourceType.substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          account,
          accountProviderCode: accountProvider,
          narrative,
          externalReference,
          sourceType,
          sourceId,
          sessionId,
          description: description || narrative,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Reset form
      setAmount('');
      setAccount('');
      setNarrative('');
      setDescription('');
      
      onSuccess?.();
    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (UGX)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          required
          min="0.01"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Method
        </label>
        <select
          value={accountProvider}
          onChange={(e) => setAccountProvider(e.target.value as 'MTN' | 'AIRTEL')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
        >
          <option value="MTN">MTN Mobile Money</option>
          <option value="AIRTEL">Airtel Money</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="256XXXXXXXXX"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Narrative
        </label>
        <input
          type="text"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-2 rounded-lg font-medium hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {loading ? 'Processing...' : 'Process Payment'}
      </button>
    </form>
  );
}