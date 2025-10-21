// [October 15, 2025] - Talent Marketplace Browse Page
// Purpose: Search and browse talent profiles with filters

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface TalentProfile {
  id: string;
  business_name: string;
  display_name: string;
  talent_type: string;
  city: string;
  state: string;
  hourly_rate: number;
  average_rating: number;
  total_reviews: number;
  profile_image_url: string;
  tagline: string;
  years_experience: number;
  is_verified: boolean;
  review_count: number;
  portfolio_count: number;
  services_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TalentMarketplace: React.FC = () => {
  const { token } = useUser();
  const navigate = useNavigate();
  
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    talent_type: '',
    city: '',
    state: '',
    min_rating: '',
    max_hourly_rate: '',
    is_verified: false,
    sort_by: 'average_rating',
    sort_order: 'DESC'
  });

  useEffect(() => {
    loadTalents();
  }, [pagination.page, filters.sort_by, filters.sort_order]);

  const loadTalents = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v !== false)
        )
      };

      const response = await axios.get('http://localhost:5001/api/talent/profiles', {
        params
      });

      if (response.data.success) {
        setTalents(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load talents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    loadTalents();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      talent_type: '',
      city: '',
      state: '',
      min_rating: '',
      max_hourly_rate: '',
      is_verified: false,
      sort_by: 'average_rating',
      sort_order: 'DESC'
    });
    setPagination({ ...pagination, page: 1 });
    loadTalents();
  };

  const getTalentTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      photographer: '📷',
      videographer: '🎥',
      copywriter: '✍️',
      graphic_designer: '🎨',
      social_media_manager: '📱',
      other: '⭐'
    };
    return icons[type] || '⭐';
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">🎯 Talent Marketplace</h1>
          <p className="text-gray-600">Find and book local creative professionals</p>
        </div>

        {/* Search & Filters */}
        <div className="glass rounded-xl p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Bar */}
            <div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name, business, or keywords..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.talent_type}
                onChange={(e) => handleFilterChange('talent_type', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Types</option>
                <option value="photographer">📷 Photographer</option>
                <option value="videographer">🎥 Videographer</option>
                <option value="copywriter">✍️ Copywriter</option>
                <option value="graphic_designer">🎨 Graphic Designer</option>
                <option value="social_media_manager">📱 Social Media Manager</option>
                <option value="other">⭐ Other</option>
              </select>

              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                placeholder="City"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />

              <input
                type="text"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                placeholder="State"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />

              <input
                type="number"
                value={filters.max_hourly_rate}
                onChange={(e) => handleFilterChange('max_hourly_rate', e.target.value)}
                placeholder="Max $/hour"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Additional Filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.is_verified}
                    onChange={(e) => handleFilterChange('is_verified', e.target.checked)}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">✓ Verified Only</span>
                </label>

                <select
                  value={filters.min_rating}
                  onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                </select>

                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="average_rating">Rating</option>
                  <option value="total_bookings">Most Booked</option>
                  <option value="hourly_rate">Price</option>
                  <option value="created_at">Newest</option>
                </select>

                <select
                  value={filters.sort_order}
                  onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="DESC">High to Low</option>
                  <option value="ASC">Low to High</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 glass rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  🔍 Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          {pagination.total > 0 && (
            <p>Found {pagination.total} talent{pagination.total !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Talent Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            <p className="mt-4 text-gray-600">Loading talent...</p>
          </div>
        ) : talents.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-2xl mb-4">🔍</p>
            <p className="text-gray-600 mb-4">No talent found matching your criteria</p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {talents.map((talent) => (
                <div
                  key={talent.id}
                  onClick={() => navigate(`/talent/${talent.id}`)}
                  className="glass rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all"
                >
                  {/* Profile Image */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="relative">
                      {talent.profile_image_url ? (
                        <img
                          src={talent.profile_image_url}
                          alt={talent.display_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                          {talent.display_name.charAt(0)}
                        </div>
                      )}
                      {talent.is_verified && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{talent.display_name}</h3>
                      <p className="text-sm text-gray-600">{talent.business_name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-lg">{getTalentTypeIcon(talent.talent_type)}</span>
                        <span className="text-xs text-gray-500 capitalize">{talent.talent_type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tagline */}
                  {talent.tagline && (
                    <p className="text-sm text-gray-700 mb-3 italic">"{talent.tagline}"</p>
                  )}

                  {/* Location */}
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <span className="mr-1">📍</span>
                    {talent.city}, {talent.state}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="glass rounded p-2">
                      <p className="text-xs text-gray-500">Rating</p>
                      <div className="flex justify-center">
                        {renderStars(talent.average_rating)}
                      </div>
                      <p className="text-xs text-gray-600">({talent.review_count})</p>
                    </div>
                    <div className="glass rounded p-2">
                      <p className="text-xs text-gray-500">Portfolio</p>
                      <p className="text-lg font-bold text-gray-900">{talent.portfolio_count}</p>
                    </div>
                    <div className="glass rounded p-2">
                      <p className="text-xs text-gray-500">Experience</p>
                      <p className="text-lg font-bold text-gray-900">{talent.years_experience || 0}y</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Hourly Rate</p>
                      <p className="text-xl font-bold text-green-600">
                        ${talent.hourly_rate}/hr
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 glass rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  ← Previous
                </button>

                <span className="text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 glass rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Call to Action for Talent */}
        <div className="mt-12 glass rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Are you a creative professional?</h2>
          <p className="text-gray-600 mb-4">Join our marketplace and connect with agencies looking for talent</p>
          <button
            onClick={() => navigate('/talent/create-profile')}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            ✨ Create Talent Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default TalentMarketplace;

