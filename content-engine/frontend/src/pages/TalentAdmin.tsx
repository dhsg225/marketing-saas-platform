// [October 15, 2025] - Talent Admin Panel (Option C - Admin Tools)
// Purpose: Admin approval queue, marketplace dashboard, and controls

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface TalentProfile {
  id: string;
  business_name: string;
  display_name: string;
  email: string;
  talent_type: string;
  city: string;
  state: string;
  profile_status: string;
  is_verified: boolean;
  created_at: string;
  total_bookings: number;
  average_rating: number;
}

interface MarketplaceStats {
  totalTalent: number;
  activeTalent: number;
  pendingApproval: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  platformFees: number;
}

const TalentAdmin: React.FC = () => {
  const { token } = useUser();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'stats' | 'settings'>('pending');
  const [pendingTalent, setPendingTalent] = useState<TalentProfile[]>([]);
  const [activeTalent, setActiveTalent] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<MarketplaceStats>({
    totalTalent: 0,
    activeTalent: 0,
    pendingApproval: 0,
    totalBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    platformFees: 0
  });

  const [platformSettings, setPlatformSettings] = useState({
    commissionTier1: 15,
    commissionTier2: 12,
    commissionTier3: 10,
    tier1Max: 500,
    tier2Max: 2000
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        await loadPendingTalent();
      } else if (activeTab === 'active') {
        await loadActiveTalent();
      } else if (activeTab === 'stats') {
        await loadStats();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTalent = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/talent/profiles', {
        params: { status: 'pending' }
      });
      if (response.data.success) {
        setPendingTalent(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load pending talent:', error);
    }
  };

  const loadActiveTalent = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/talent/profiles', {
        params: { status: 'active' }
      });
      if (response.data.success) {
        setActiveTalent(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load active talent:', error);
    }
  };

  const loadStats = async () => {
    // TODO: Create dedicated admin stats endpoint
    // For now, calculate from existing data
    try {
      const [talentRes, bookingsRes] = await Promise.all([
        axios.get('http://localhost:5001/api/talent/profiles'),
        axios.get('http://localhost:5001/api/talent/bookings', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const allTalent = talentRes.data.data || [];
      const allBookings = bookingsRes.data.data || [];

      const totalRevenue = allBookings
        .filter((b: any) => b.status === 'completed')
        .reduce((sum: number, b: any) => sum + parseFloat(b.quoted_price || 0), 0);

      const platformFees = allBookings
        .filter((b: any) => b.status === 'completed')
        .reduce((sum: number, b: any) => sum + parseFloat(b.platform_fee_amount || 0), 0);

      setStats({
        totalTalent: allTalent.length,
        activeTalent: allTalent.filter((t: any) => t.profile_status === 'active').length,
        pendingApproval: allTalent.filter((t: any) => t.profile_status === 'pending').length,
        totalBookings: allBookings.length,
        completedBookings: allBookings.filter((b: any) => b.status === 'completed').length,
        totalRevenue,
        platformFees
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleApproveTalent = async (talentId: string) => {
    try {
      const response = await axios.put(
        `http://localhost:5001/api/talent/profiles/${talentId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Talent approved!');
        loadPendingTalent();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve talent');
    }
  };

  const handleSuspendTalent = async (talentId: string) => {
    const reason = prompt('Reason for suspension:');
    if (!reason) return;

    try {
      const response = await axios.put(
        `http://localhost:5001/api/talent/profiles/${talentId}/suspend`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Talent suspended');
        loadActiveTalent();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to suspend talent');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">⚙️ Talent Marketplace Admin</h1>
          <p className="text-gray-600">Manage talent approvals and marketplace settings</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          {[
            { id: 'pending', label: '⏳ Pending Approval', count: pendingTalent.length },
            { id: 'active', label: '✅ Active Talent', count: activeTalent.length },
            { id: 'stats', label: '📊 Dashboard', count: null },
            { id: 'settings', label: '⚙️ Settings', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                  : 'glass text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pending Approval Tab */}
        {activeTab === 'pending' && (
          <div>
            {pendingTalent.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <p className="text-2xl mb-4">✅</p>
                <p className="text-gray-600">No talent pending approval</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTalent.map((talent) => (
                  <div key={talent.id} className="glass rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{talent.display_name}</h3>
                        <p className="text-gray-600 mb-2">{talent.business_name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="capitalize">{talent.talent_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{talent.city}, {talent.state}</span>
                          <span>•</span>
                          <span>{talent.email}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Applied: {new Date(talent.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/talent/${talent.id}`)}
                          className="px-4 py-2 glass rounded-lg text-sm font-semibold hover:bg-gray-50"
                        >
                          👁️ View Profile
                        </button>
                        <button
                          onClick={() => handleApproveTalent(talent.id)}
                          className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-100"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleSuspendTalent(talent.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Talent Tab */}
        {activeTab === 'active' && (
          <div>
            {activeTalent.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <p className="text-2xl mb-4">👤</p>
                <p className="text-gray-600">No active talent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTalent.map((talent) => (
                  <div key={talent.id} className="glass rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{talent.display_name}</h3>
                          {talent.is_verified && (
                            <span className="text-blue-500">✓</span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{talent.business_name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className="capitalize">{talent.talent_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{talent.city}, {talent.state}</span>
                          <span>•</span>
                          <span>{talent.total_bookings} bookings</span>
                          <span>•</span>
                          <span>⭐ {talent.average_rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/talent/${talent.id}`)}
                          className="px-4 py-2 glass rounded-lg text-sm font-semibold hover:bg-gray-50"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => handleSuspendTalent(talent.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100"
                        >
                          Suspend
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats/Dashboard Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-1">Total Talent</p>
                <p className="text-4xl font-bold text-gray-900">{stats.totalTalent}</p>
                <p className="text-sm text-green-600 mt-1">{stats.activeTalent} active</p>
              </div>

              <div className="glass rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
                <p className="text-4xl font-bold text-yellow-600">{stats.pendingApproval}</p>
                {stats.pendingApproval > 0 && (
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Review now →
                  </button>
                )}
              </div>

              <div className="glass rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-4xl font-bold text-gray-900">{stats.totalBookings}</p>
                <p className="text-sm text-green-600 mt-1">{stats.completedBookings} completed</p>
              </div>

              <div className="glass rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-1">Platform Fees</p>
                <p className="text-4xl font-bold text-green-600">${stats.platformFees.toFixed(0)}</p>
                <p className="text-sm text-gray-600 mt-1">of ${stats.totalRevenue.toFixed(0)} GMV</p>
              </div>
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="glass rounded-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue Overview</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chart coming soon (Week 6)</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
              <p className="text-gray-500">Activity feed coming soon</p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="glass rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h2>

            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Rates</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tier 1: $0 - ${platformSettings.tier1Max}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={platformSettings.commissionTier1}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, commissionTier1: parseFloat(e.target.value) })}
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tier 2: ${platformSettings.tier1Max + 1} - ${platformSettings.tier2Max}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={platformSettings.commissionTier2}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, commissionTier2: parseFloat(e.target.value) })}
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tier 3: ${platformSettings.tier2Max + 1}+
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={platformSettings.commissionTier3}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, commissionTier3: parseFloat(e.target.value) })}
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-gray-600">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg">
                    💾 Save Settings
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ Changes apply to new bookings only
                  </p>
                </div>
              </div>

              {/* Other Settings */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-green-500 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Notify admin on new talent application</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-green-500 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Notify admin on new booking</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-green-500 border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Notify admin on disputes</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TalentAdmin;

