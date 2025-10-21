// [October 16, 2025] - Manual Payment Component
// Purpose: Handle manual payments with escrow system
// Features: Payment verification, escrow tracking, payout management

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useParams, useNavigate } from 'react-router-dom';

interface PaymentBreakdown {
  totalAmount: number;
  platformFee: number;
  stripeFee: number;
  talentPayout: number;
  platformFeePercentage: number;
  stripeFeePercentage: number;
}

interface PaymentData {
  id: string;
  booking_id: string;
  amount: number;
  platform_fee: number;
  stripe_fee: number;
  talent_payout: number;
  payment_status: string;
  payment_method: string;
  client_notes: string;
  escrow_release_date: string;
  created_at: string;
}

const ManualPayment: React.FC = () => {
  const { user } = useUser();
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [breakdown, setBreakdown] = useState<PaymentBreakdown | null>(null);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [clientNotes, setClientNotes] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadPaymentStatus();
    }
  }, [bookingId]);

  const loadPaymentStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/payments/booking/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        setPaymentData(response.data.data);
        setShowPaymentForm(false);
      } else {
        setShowPaymentForm(true);
      }
    } catch (error) {
      console.error('Error loading payment status:', error);
      setShowPaymentForm(true);
    }
  };

  const calculateBreakdown = (amount: number): PaymentBreakdown => {
    const platformFeePercentage = 0.12; // 12%
    const stripeFeePercentage = 0.029; // 2.9%
    
    const platformFee = amount * platformFeePercentage;
    const stripeFee = (amount * stripeFeePercentage) + 0.30;
    const talentPayout = amount - platformFee - stripeFee;

    return {
      totalAmount: parseFloat(amount.toFixed(2)),
      platformFee: parseFloat(platformFee.toFixed(2)),
      stripeFee: parseFloat(stripeFee.toFixed(2)),
      talentPayout: parseFloat(talentPayout.toFixed(2)),
      platformFeePercentage,
      stripeFeePercentage
    };
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (value) {
      const calculated = calculateBreakdown(parseFloat(value));
      setBreakdown(calculated);
    }
  };

  const handleCreatePayment = async () => {
    if (!amount || !paymentMethod) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/payments/manual',
        {
          bookingId,
          amount: parseFloat(amount),
          paymentMethod,
          clientNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Payment created successfully! Awaiting verification.');
        setPaymentData(response.data.data);
        setBreakdown(response.data.breakdown);
        setShowPaymentForm(false);
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error.response?.data?.error || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_verification': return 'text-yellow-600 bg-yellow-100';
      case 'verified': return 'text-blue-600 bg-blue-100';
      case 'released': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_verification': return 'Pending Verification';
      case 'verified': return 'Verified (In Escrow)';
      case 'released': return 'Released to Talent';
      case 'failed': return 'Payment Failed';
      default: return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <button
            onClick={() => navigate('/bookings')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back to Bookings
          </button>
        </div>

        {showPaymentForm ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Create Manual Payment</h2>
              <p className="text-blue-700">
                Submit payment details for verification. Payment will be held in escrow until delivery is confirmed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Notes (Optional)
                  </label>
                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add any notes about the payment..."
                  />
                </div>
              </div>

              {breakdown && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-semibold">${breakdown.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Platform Fee ({breakdown.platformFeePercentage * 100}%):</span>
                      <span>-${breakdown.platformFee}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Processing Fee ({breakdown.stripeFeePercentage * 100}% + $0.30):</span>
                      <span>-${breakdown.stripeFee}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-semibold text-green-600">
                      <span>Talent Payout:</span>
                      <span>${breakdown.talentPayout}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => navigate('/bookings')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePayment}
                disabled={loading || !amount}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Payment'}
              </button>
            </div>
          </div>
        ) : paymentData ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-green-900">Payment Created</h2>
                  <p className="text-green-700">
                    Payment has been submitted and is awaiting verification.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentData.payment_status)}`}>
                  {getStatusText(paymentData.payment_status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">${paymentData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="capitalize">{paymentData.payment_method.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Talent Payout:</span>
                    <span className="font-semibold text-green-600">${paymentData.talent_payout}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee:</span>
                    <span className="text-gray-500">${paymentData.platform_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Fee:</span>
                    <span className="text-gray-500">${paymentData.stripe_fee}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Escrow Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(paymentData.payment_status)}`}>
                      {getStatusText(paymentData.payment_status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Escrow Release:</span>
                    <span className="text-sm">
                      {new Date(paymentData.escrow_release_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-sm">
                      {new Date(paymentData.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {paymentData.client_notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Payment Notes</h3>
                <p className="text-blue-700">{paymentData.client_notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading payment information...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualPayment;
