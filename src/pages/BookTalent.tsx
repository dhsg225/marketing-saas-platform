// [October 15, 2025] - Book Talent Page (Option B - Booking System)
// Purpose: Booking request form with date selection and pricing calculator

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';

interface TalentProfile {
  id: string;
  display_name: string;
  business_name: string;
  hourly_rate: number;
  minimum_booking_hours: number;
  profile_image_url: string;
  services: any[];
}

interface Project {
  id: string;
  name: string;
}

const BookTalent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useUser();
  const navigate = useNavigate();

  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const [bookingData, setBookingData] = useState({
    project_id: '',
    service_id: '',
    title: '',
    description: '',
    requested_date: '',
    start_time: '',
    end_time: '',
    duration_hours: 2,
    location_address: '',
    location_city: '',
    location_state: '',
    is_remote: false,
    quoted_price: 0,
    special_requirements: '',
    deliverable_format: '',
    usage_rights: 'commercial'
  });

  const [calculatedFees, setCalculatedFees] = useState({
    bookingAmount: 0,
    platformFeePercentage: 0,
    platformFeeAmount: 0,
    stripeFeeAmount: 0,
    talentPayoutAmount: 0
  });

  useEffect(() => {
    if (id) {
      loadTalent();
      loadProjects();
    }
  }, [id]);

  useEffect(() => {
    calculateFees();
  }, [bookingData.quoted_price]);

  const loadTalent = async () => {
    try {
      const response = await axios.get(api.getUrl(`talent/profiles/${id}`));
      if (response.data.success) {
        const talentData = response.data.data;
        setTalent(talentData);
        
        // Set default pricing
        setBookingData(prev => ({
          ...prev,
          quoted_price: talentData.hourly_rate * talentData.minimum_booking_hours,
          duration_hours: talentData.minimum_booking_hours
        }));
      }
    } catch (error) {
      console.error('Failed to load talent:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await axios.get(api.getUrl('playbook/projects'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setProjects(response.data.data);
        if (response.data.data.length > 0) {
          setBookingData(prev => ({ ...prev, project_id: response.data.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const calculateFees = () => {
    const amount = parseFloat(bookingData.quoted_price.toString()) || 0;
    
    let feePercentage;
    if (amount <= 500) feePercentage = 15.0;
    else if (amount <= 2000) feePercentage = 12.0;
    else feePercentage = 10.0;

    const feeAmount = (amount * feePercentage) / 100;
    const stripeFee = (amount * 0.029) + 0.30;
    const talentPayout = amount - feeAmount - stripeFee;

    setCalculatedFees({
      bookingAmount: amount,
      platformFeePercentage: feePercentage,
      platformFeeAmount: parseFloat(feeAmount.toFixed(2)),
      stripeFeeAmount: parseFloat(stripeFee.toFixed(2)),
      talentPayoutAmount: parseFloat(talentPayout.toFixed(2))
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingData.project_id) {
      alert('Please select a project');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        api.getUrl('talent/bookings'),
        {
          ...bookingData,
          talent_id: id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Booking request sent! Waiting for talent to accept.');
        navigate('/bookings');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      alert(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!talent) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/talent/${id}`)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            ← Back to Profile
          </button>
          <h1 className="text-4xl font-bold gradient-text mb-2">📅 Book {talent.display_name}</h1>
          <p className="text-gray-600">{talent.business_name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="glass rounded-xl p-8 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Details</h2>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project *
                </label>
                <select
                  required
                  value={bookingData.project_id}
                  onChange={(e) => setBookingData({ ...bookingData, project_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              {talent.services && talent.services.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service (optional)
                  </label>
                  <select
                    value={bookingData.service_id}
                    onChange={(e) => {
                      const service = talent.services.find((s: any) => s.id === e.target.value);
                      setBookingData({ 
                        ...bookingData, 
                        service_id: e.target.value,
                        quoted_price: service?.base_price || bookingData.quoted_price
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select Service --</option>
                    {talent.services.map((service: any) => (
                      <option key={service.id} value={service.id}>
                        {service.service_name} - ${service.base_price}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Booking Title *
                </label>
                <input
                  type="text"
                  required
                  value={bookingData.title}
                  onChange={(e) => setBookingData({ ...bookingData, title: e.target.value })}
                  placeholder="e.g., Product Photography Session"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingData.requested_date}
                    onChange={(e) => setBookingData({ ...bookingData, requested_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={bookingData.start_time}
                    onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    min={talent.minimum_booking_hours}
                    step="0.5"
                    value={bookingData.duration_hours}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value);
                      setBookingData({ 
                        ...bookingData, 
                        duration_hours: hours,
                        quoted_price: talent.hourly_rate * hours
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={bookingData.is_remote}
                    onChange={(e) => setBookingData({ ...bookingData, is_remote: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Remote/Virtual Session</span>
                </label>
              </div>

              {!bookingData.is_remote && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location Address
                    </label>
                    <input
                      type="text"
                      value={bookingData.location_address}
                      onChange={(e) => setBookingData({ ...bookingData, location_address: e.target.value })}
                      placeholder="Street address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={bookingData.location_city}
                        onChange={(e) => setBookingData({ ...bookingData, location_city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={bookingData.location_state}
                        onChange={(e) => setBookingData({ ...bookingData, location_state: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Description
                </label>
                <textarea
                  value={bookingData.description}
                  onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                  rows={4}
                  placeholder="Describe what you need, the vision, any specific requirements..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Special Requirements
                </label>
                <textarea
                  value={bookingData.special_requirements}
                  onChange={(e) => setBookingData({ ...bookingData, special_requirements: e.target.value })}
                  rows={3}
                  placeholder="Equipment needs, specific shots, timeline constraints..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Deliverable Format */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deliverable Format
                  </label>
                  <input
                    type="text"
                    value={bookingData.deliverable_format}
                    onChange={(e) => setBookingData({ ...bookingData, deliverable_format: e.target.value })}
                    placeholder="e.g., RAW + JPEG, 4K Video"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Usage Rights
                  </label>
                  <select
                    value={bookingData.usage_rights}
                    onChange={(e) => setBookingData({ ...bookingData, usage_rights: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="commercial">Full Commercial Rights</option>
                    <option value="social_media">Social Media Only</option>
                    <option value="web">Web Use Only</option>
                    <option value="print">Print Only</option>
                    <option value="limited">Limited Use</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending Request...' : '📤 Send Booking Request'}
                </button>
              </div>
            </form>
          </div>

          {/* Pricing Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-6 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pricing Summary</h3>

              {/* Talent Info */}
              <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-gray-200">
                {talent.profile_image_url ? (
                  <img
                    src={talent.profile_image_url}
                    alt={talent.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-lg font-bold">
                    {talent.display_name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{talent.display_name}</p>
                  <p className="text-sm text-gray-600">{talent.business_name}</p>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Rate:</span>
                  <span className="font-semibold">${talent.hourly_rate}/hr</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-semibold">{bookingData.duration_hours} hours</span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-semibold">Subtotal:</span>
                    <span className="font-bold text-gray-900">${bookingData.quoted_price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <span>Platform Fee ({calculatedFees.platformFeePercentage}%):</span>
                  <span>${calculatedFees.platformFeeAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <span>Processing Fee:</span>
                  <span>${calculatedFees.stripeFeeAmount.toFixed(2)}</span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-900 font-bold">Total:</span>
                    <span className="font-bold text-green-600">${bookingData.quoted_price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  💡 Talent receives ${calculatedFees.talentPayoutAmount.toFixed(2)} after fees
                </div>
              </div>

              {/* Manual Payment Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900 font-semibold mb-1">💳 Manual Payment Mode</p>
                <p className="text-xs text-yellow-800">
                  Payment will be handled offline. Stripe integration coming in Week 3.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookTalent;

