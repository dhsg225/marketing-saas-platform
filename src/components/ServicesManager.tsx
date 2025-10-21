// [October 15, 2025] - Services Manager Component  
// Purpose: Manage talent services and pricing packages

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface Service {
  id: string;
  service_name: string;
  description: string;
  service_type: string;
  pricing_model: string;
  base_price: number;
  min_price: number;
  max_price: number;
  package_includes: any;
  typical_turnaround_days: number;
  rush_available: boolean;
  rush_fee_percentage: number;
  is_active: boolean;
}

interface ServicesManagerProps {
  talentId: string;
  isOwner: boolean;
}

const ServicesManager: React.FC<ServicesManagerProps> = ({ talentId, isOwner }) => {
  const { token } = useUser();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [newService, setNewService] = useState({
    service_name: '',
    description: '',
    service_type: '',
    pricing_model: 'fixed',
    base_price: 0,
    min_price: 0,
    max_price: 0,
    package_includes: {},
    typical_turnaround_days: 7,
    rush_available: false,
    rush_fee_percentage: 50,
    is_active: true
  });

  useEffect(() => {
    loadServices();
  }, [talentId]);

  const loadServices = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/talent/profiles/${talentId}/services?is_active=true`
      );
      
      if (response.data.success) {
        setServices(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/profiles/${talentId}/services`,
        newService,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Service added successfully!');
        setShowAddModal(false);
        setNewService({
          service_name: '',
          description: '',
          service_type: '',
          pricing_model: 'fixed',
          base_price: 0,
          min_price: 0,
          max_price: 0,
          package_includes: {},
          typical_turnaround_days: 7,
          rush_available: false,
          rush_fee_percentage: 50,
          is_active: true
        });
        loadServices();
      }
    } catch (error: any) {
      console.error('Failed to add service:', error);
      alert(error.response?.data?.error || 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    setLoading(true);
    try {
      const response = await axios.put(
        `http://localhost:5001/api/talent/services/${editingService.id}`,
        editingService,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Service updated!');
        setEditingService(null);
        loadServices();
      }
    } catch (error) {
      console.error('Failed to update service:', error);
      alert('Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await axios.delete(
        `http://localhost:5001/api/talent/services/${serviceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Service deleted!');
        loadServices();
      }
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert('Failed to delete service');
    }
  };

  const getPricingModelLabel = (model: string) => {
    const labels: Record<string, string> = {
      hourly: 'Hourly Rate',
      fixed: 'Fixed Price',
      package: 'Package Deal',
      custom: 'Custom Quote'
    };
    return labels[model] || model;
  };

  if (!isOwner) {
    return (
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="glass rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.service_name}</h3>
                {service.description && (
                  <p className="text-gray-700 mb-3">{service.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="capitalize">{getPricingModelLabel(service.pricing_model)}</span>
                  {service.typical_turnaround_days && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{service.typical_turnaround_days} day turnaround</span>
                    </>
                  )}
                  {service.rush_available && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-green-600">⚡ Rush available</span>
                    </>
                  )}
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
    );
  }

  return (
    <div>
      {/* Add Button */}
      {isOwner && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            ➕ Add Service
          </button>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="glass rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.service_name}</h3>
                {service.description && (
                  <p className="text-gray-700 mb-3">{service.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="capitalize">{getPricingModelLabel(service.pricing_model)}</span>
                  {service.typical_turnaround_days && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{service.typical_turnaround_days} day turnaround</span>
                    </>
                  )}
                  {service.rush_available && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-green-600">⚡ Rush available (+{service.rush_fee_percentage}%)</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  ${service.base_price}
                </p>
                <p className="text-xs text-gray-500">
                  {service.pricing_model === 'custom' ? 'custom quote' : 'starting price'}
                </p>
              </div>
            </div>

            {isOwner && (
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setEditingService(service)}
                  className="flex-1 px-4 py-2 glass rounded-lg font-semibold hover:bg-gray-50"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add Service</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={newService.service_name}
                  onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                  placeholder="e.g., 4-Hour Photography Session"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  rows={3}
                  placeholder="Describe what's included in this service..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Type
                  </label>
                  <input
                    type="text"
                    value={newService.service_type}
                    onChange={(e) => setNewService({ ...newService, service_type: e.target.value })}
                    placeholder="e.g., Event Photography"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pricing Model *
                  </label>
                  <select
                    required
                    value={newService.pricing_model}
                    onChange={(e) => setNewService({ ...newService, pricing_model: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Rate</option>
                    <option value="package">Package Deal</option>
                    <option value="custom">Custom Quote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newService.base_price}
                    onChange={(e) => setNewService({ ...newService, base_price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newService.min_price}
                    onChange={(e) => setNewService({ ...newService, min_price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newService.max_price}
                    onChange={(e) => setNewService({ ...newService, max_price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Turnaround (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newService.typical_turnaround_days}
                    onChange={(e) => setNewService({ ...newService, typical_turnaround_days: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rush Fee (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newService.rush_fee_percentage}
                    onChange={(e) => setNewService({ ...newService, rush_fee_percentage: parseFloat(e.target.value) })}
                    disabled={!newService.rush_available}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newService.rush_available}
                    onChange={(e) => setNewService({ ...newService, rush_available: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Rush Available</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newService.is_active}
                    onChange={(e) => setNewService({ ...newService, is_active: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 glass rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar structure, reusing form */}
      {editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Service</h3>
              <button
                onClick={() => setEditingService(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingService.service_name}
                  onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Base Price ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={editingService.base_price}
                  onChange={(e) => setEditingService({ ...editingService, base_price: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingService.is_active}
                    onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 px-6 py-3 glass rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManager;

