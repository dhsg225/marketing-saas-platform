// [October 15, 2025] - My Bookings Page (Option B - Booking System)
// Purpose: Dashboard for managing bookings (client view and talent view)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  booking_number: string;
  title: string;
  talent_name: string;
  talent_image: string;
  project_name: string;
  requested_date: string;
  start_time: string;
  duration_hours: number;
  quoted_price: number;
  status: string;
  created_at: string;
  accepted_at: string;
  completed_at: string;
}

const MyBookings: React.FC = () => {
  const { token } = useUser();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'client' | 'talent'>('client');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadBookings();
  }, [viewMode, filterStatus]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5001/api/talent/bookings', {
        params: {
          role: viewMode,
          ...(filterStatus && { status: filterStatus })
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId: string) => {
    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/bookings/${bookingId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Booking accepted! Client will be notified.');
        loadBookings();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to accept booking');
    }
  };

  const handleDecline = async (bookingId: string) => {
    const reason = prompt('Please provide a reason for declining:');
    if (!reason) return;

    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/bookings/${bookingId}/decline`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Booking declined.');
        loadBookings();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to decline booking');
    }
  };

  const handleComplete = async (bookingId: string) => {
    if (!window.confirm('Mark this booking as complete? Client will be asked to review deliverables.')) return;

    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/bookings/${bookingId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Booking marked complete! Waiting for client approval.');
        loadBookings();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to mark complete');
    }
  };

  const handleApprove = async (bookingId: string) => {
    if (!window.confirm('Approve deliverables? Talent will receive payment.')) return;

    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/bookings/${bookingId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Booking approved! Talent payment will be processed.');
        loadBookings();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve booking');
    }
  };

  const handleCancel = async (bookingId: string) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/bookings/${bookingId}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Booking cancelled.');
        loadBookings();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      in_progress: 'bg-purple-100 text-purple-800',
      review_pending: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      declined: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">📋 My Bookings</h1>
          <p className="text-gray-600">Manage your talent bookings</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('client')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === 'client'
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                  : 'glass text-gray-700 hover:bg-gray-50'
              }`}
            >
              👤 As Client
            </button>
            <button
              onClick={() => setViewMode('talent')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === 'talent'
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                  : 'glass text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⭐ As Talent
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 glass rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="paid">Paid</option>
            <option value="in_progress">In Progress</option>
            <option value="review_pending">Review Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-2xl mb-4">📋</p>
            <p className="text-gray-600 mb-4">
              {viewMode === 'client' 
                ? 'You haven\'t made any bookings yet' 
                : 'You haven\'t received any booking requests yet'}
            </p>
            {viewMode === 'client' && (
              <button
                onClick={() => navigate('/talent')}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Browse Talent
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="glass rounded-xl p-6">
                <div className="flex items-start justify-between">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{booking.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(booking.status)}`}>
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <p><strong>Booking #:</strong> {booking.booking_number}</p>
                        <p><strong>{viewMode === 'client' ? 'Talent' : 'Client'}:</strong> {booking.talent_name}</p>
                        <p><strong>Project:</strong> {booking.project_name}</p>
                      </div>
                      <div>
                        <p><strong>Date:</strong> {new Date(booking.requested_date).toLocaleDateString()}</p>
                        {booking.start_time && <p><strong>Time:</strong> {booking.start_time}</p>}
                        <p><strong>Duration:</strong> {booking.duration_hours} hours</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                        className="px-4 py-2 glass rounded-lg text-sm font-semibold hover:bg-gray-50"
                      >
                        👁️ View Details
                      </button>

                      {/* Talent Actions */}
                      {viewMode === 'talent' && booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(booking.id)}
                            className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-100"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => handleDecline(booking.id)}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100"
                          >
                            ✕ Decline
                          </button>
                        </>
                      )}

                      {viewMode === 'talent' && booking.status === 'in_progress' && (
                        <button
                          onClick={() => handleComplete(booking.id)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100"
                        >
                          ✓ Mark Complete
                        </button>
                      )}

                      {/* Client Actions */}
                      {viewMode === 'client' && booking.status === 'review_pending' && (
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-100"
                        >
                          ✓ Approve & Complete
                        </button>
                      )}

                      {/* Payment Actions */}
                      {viewMode === 'client' && booking.status === 'accepted' && (
                        <button
                          onClick={() => navigate(`/payment/${booking.id}`)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100"
                        >
                          💳 Make Payment
                        </button>
                      )}

                      {viewMode === 'talent' && (
                        <button
                          onClick={() => navigate('/earnings')}
                          className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-100"
                        >
                          💰 View Earnings
                        </button>
                      )}

                      {/* Cancel for both */}
                      {!['completed', 'cancelled', 'declined'].includes(booking.status) && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${booking.quoted_price}</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;

