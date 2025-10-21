// [October 15, 2025] - Create/Edit Talent Profile Form
// Purpose: Multi-step form for talent to create their marketplace profile

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface ProfileData {
  business_name: string;
  display_name: string;
  email: string;
  phone: string;
  talent_type: string;
  bio: string;
  tagline: string;
  years_experience: number;
  city: string;
  state: string;
  country: string;
  service_radius_miles: number;
  willing_to_travel: boolean;
  hourly_rate: number;
  minimum_booking_hours: number;
  base_rate: number;
  profile_image_url: string;
  cover_image_url: string;
  website_url: string;
  instagram_handle: string;
  facebook_url: string;
  linkedin_url: string;
}

const CreateTalentProfile: React.FC = () => {
  const { token, user } = useUser();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    business_name: '',
    display_name: user?.name || '',
    email: user?.email || '',
    phone: '',
    talent_type: 'photographer',
    bio: '',
    tagline: '',
    years_experience: 0,
    city: '',
    state: '',
    country: 'USA',
    service_radius_miles: 25,
    willing_to_travel: false,
    hourly_rate: 100,
    minimum_booking_hours: 2,
    base_rate: 0,
    profile_image_url: '',
    cover_image_url: '',
    website_url: '',
    instagram_handle: '',
    facebook_url: '',
    linkedin_url: ''
  });

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/talent/profiles/my/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setHasProfile(true);
        alert('You already have a talent profile. Redirecting to view...');
        navigate(`/talent/${response.data.data.id}`);
      }
    } catch (error: any) {
      // No profile exists - continue with creation
      if (error.response?.status === 404) {
        setHasProfile(false);
      }
    }
  };

  const handleChange = (field: keyof ProfileData, value: any) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5001/api/talent/profiles',
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Profile created successfully! Waiting for admin approval.');
        navigate(`/talent/${response.data.data.id}`);
      }
    } catch (error: any) {
      console.error('Create profile error:', error);
      alert(error.response?.data?.error || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">✨ Create Talent Profile</h1>
          <p className="text-gray-600">Join our marketplace and start getting booked by agencies</p>
        </div>

        {/* Progress Steps */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Professional Details' },
              { num: 3, label: 'Pricing & Availability' },
              { num: 4, label: 'Social Links' }
            ].map((s, index) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      step >= s.num
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s.num}
                  </div>
                  <p className="text-xs mt-2 text-gray-600">{s.label}</p>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="glass rounded-xl p-8 mb-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Smith Photography Studio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={profileData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Talent Type *
                  </label>
                  <select
                    required
                    value={profileData.talent_type}
                    onChange={(e) => handleChange('talent_type', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="photographer">📷 Photographer</option>
                    <option value="videographer">🎥 Videographer</option>
                    <option value="copywriter">✍️ Copywriter</option>
                    <option value="graphic_designer">🎨 Graphic Designer</option>
                    <option value="social_media_manager">📱 Social Media Manager</option>
                    <option value="other">⭐ Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Professional Details */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Professional Details</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={profileData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Capturing your moments in stunning detail"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Tell clients about your experience, style, and what makes you unique..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Years Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={profileData.years_experience}
                      onChange={(e) => handleChange('years_experience', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., CA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Service Radius (miles)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={profileData.service_radius_miles}
                      onChange={(e) => handleChange('service_radius_miles', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center space-x-2 h-full pb-3">
                      <input
                        type="checkbox"
                        checked={profileData.willing_to_travel}
                        onChange={(e) => handleChange('willing_to_travel', e.target.checked)}
                        className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Willing to travel</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Pricing & Availability</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Hourly Rate ($) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={profileData.hourly_rate}
                      onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Minimum Booking Hours
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={profileData.minimum_booking_hours}
                      onChange={(e) => handleChange('minimum_booking_hours', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Rate ($) (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={profileData.base_rate}
                    onChange={(e) => handleChange('base_rate', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Flat rate for common services"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Your hourly rate will be visible to clients. You can create custom packages in the Services section after creating your profile.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Social Links */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Social Links & Portfolio</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={profileData.website_url}
                    onChange={(e) => handleChange('website_url', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={profileData.instagram_handle}
                    onChange={(e) => handleChange('instagram_handle', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="@yourhandle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    value={profileData.facebook_url}
                    onChange={(e) => handleChange('facebook_url', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={profileData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✨ <strong>Almost done!</strong> After creating your profile, you can add portfolio images and create service packages.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 glass rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                ← Previous
              </button>
            )}

            <div className="flex-1"></div>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Creating...' : '✨ Create Profile'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTalentProfile;

