// [October 15, 2025] - Talent Profile View Page
// Purpose: Detailed view of a talent's profile, portfolio, and services

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface TalentProfile {
  id: string;
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
  average_rating: number;
  total_reviews: number;
  total_bookings: number;
  completed_bookings: number;
  is_verified: boolean;
  is_accepting_bookings: boolean;
  portfolio: any[];
  services: any[];
}

const TalentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useUser();
  const navigate = useNavigate();

  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'portfolio' | 'services' | 'reviews'>('about');

  useEffect(() => {
    if (id) {
      loadTalentProfile();
    }
  }, [id]);

  const loadTalentProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/talent/profiles/${id}`);
      
      if (response.data.success) {
        console.log('Talent profile loaded:', response.data.data);
        console.log('Portfolio items:', response.data.data.portfolio);
        setTalent(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load talent profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`text-2xl ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  const handleBookNow = () => {
    if (!token) {
      alert('Please log in to book talent');
      navigate('/login');
      return;
    }
    navigate(`/talent/${id}/book`);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">😕</p>
          <p className="text-gray-600 mb-4">Talent profile not found</p>
          <button
            onClick={() => navigate('/talent')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Browse All Talent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Cover Image */}
      <div className="h-64 bg-gradient-to-r from-green-400 to-blue-500 relative">
        {talent.cover_image_url && (
          <img src={talent.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-24 relative">
        {/* Profile Header Card */}
        <div className="glass rounded-xl p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              {/* Profile Image */}
              <div className="relative">
                {talent.profile_image_url ? (
                  <img
                    src={talent.profile_image_url}
                    alt={talent.display_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                    {talent.display_name.charAt(0)}
                  </div>
                )}
                {talent.is_verified && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2 border-2 border-white">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{talent.display_name}</h1>
                <p className="text-xl text-gray-600 mb-2">{talent.business_name}</p>
                {talent.tagline && (
                  <p className="text-gray-700 italic mb-3">"{talent.tagline}"</p>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center">
                    {renderStars(talent.average_rating)}
                    <span className="ml-2 text-sm text-gray-600">
                      ({talent.total_reviews} reviews)
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {talent.completed_bookings} completed bookings
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600 capitalize">
                    {talent.talent_type.replace('_', ' ')}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="mr-1">📍</span>
                    {talent.city}, {talent.state}
                    {talent.service_radius_miles && (
                      <span className="ml-2">• {talent.service_radius_miles} mile radius</span>
                    )}
                  </div>
                  {talent.years_experience > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{talent.years_experience} years experience</span>
                    </>
                  )}
                </div>

                {/* Social Links */}
                {(talent.website_url || talent.instagram_handle || talent.facebook_url || talent.linkedin_url) && (
                  <div className="flex items-center space-x-3 mt-3">
                    {talent.website_url && (
                      <a href={talent.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        🌐
                      </a>
                    )}
                    {talent.instagram_handle && (
                      <a href={`https://instagram.com/${talent.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-700">
                        📷
                      </a>
                    )}
                    {talent.facebook_url && (
                      <a href={talent.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        📘
                      </a>
                    )}
                    {talent.linkedin_url && (
                      <a href={talent.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900">
                        💼
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Book Now Card */}
            <div className="glass rounded-lg p-6 w-80">
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm mb-1">Starting from</p>
                <p className="text-4xl font-bold text-green-600 mb-1">
                  ${talent.hourly_rate}
                  <span className="text-lg text-gray-600">/hr</span>
                </p>
                <p className="text-xs text-gray-500">
                  Minimum {talent.minimum_booking_hours} hours
                </p>
              </div>

              {talent.is_accepting_bookings ? (
                <button
                  onClick={handleBookNow}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all mb-3"
                >
                  📅 Book Now
                </button>
              ) : (
                <div className="w-full px-6 py-3 bg-gray-200 text-gray-600 rounded-lg font-semibold text-center mb-3">
                  Not Accepting Bookings
                </div>
              )}

              <button className="w-full px-6 py-3 glass rounded-lg font-semibold hover:bg-gray-50 transition-all">
                💬 Send Message
              </button>

              {talent.phone && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Contact</p>
                  <p className="text-sm font-semibold text-gray-700">{talent.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          {['about', 'portfolio', 'services', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                  : 'glass text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="glass rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
              {talent.bio ? (
                <p className="text-gray-700 whitespace-pre-line">{talent.bio}</p>
              ) : (
                <p className="text-gray-500 italic">No bio provided yet</p>
              )}
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div>
              {talent.portfolio && talent.portfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {talent.portfolio.map((item: any) => (
                    <div key={item.id} className="glass rounded-xl overflow-hidden">
                      {item.media_type === 'image' && (
                        <div className="relative">
                          <img
                            src={item.media_url}
                            alt={item.title}
                            className="w-full h-64 object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', item.media_url);
                              e.currentTarget.style.display = 'none';
                              // Show fallback
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                            onLoad={() => console.log('Image loaded:', item.media_url)}
                          />
                          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-500" style={{display: 'none'}}>
                            <div className="text-center">
                              <div className="text-4xl mb-2">📷</div>
                              <div className="text-sm">{item.title}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {item.media_type === 'video' && (
                        <video
                          src={item.media_url}
                          controls
                          className="w-full h-64 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-12 text-center">
                  <p className="text-2xl mb-4">🎨</p>
                  <p className="text-gray-600">No portfolio items yet</p>
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              {talent.services && talent.services.length > 0 ? (
                <div className="space-y-4">
                  {talent.services.map((service: any) => (
                    <div key={service.id} className="glass rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{service.service_name}</h3>
                          {service.description && (
                            <p className="text-gray-700 mb-3">{service.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="capitalize">{service.pricing_model} pricing</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${service.base_price}
                          </p>
                          <p className="text-xs text-gray-500">starting price</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-12 text-center">
                  <p className="text-2xl mb-4">📋</p>
                  <p className="text-gray-600">No services listed yet</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-2xl mb-4">⭐</p>
              <p className="text-gray-600">Reviews coming soon (Week 4)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;

