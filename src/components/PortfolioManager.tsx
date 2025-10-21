// [October 15, 2025] - Portfolio Manager Component
// Purpose: Upload and manage talent portfolio items (images/videos)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  project_type: string;
  tags: string[];
  display_order: number;
  is_featured: boolean;
  is_public: boolean;
}

interface PortfolioManagerProps {
  talentId: string;
  isOwner: boolean;
}

const PortfolioManager: React.FC<PortfolioManagerProps> = ({ talentId, isOwner }) => {
  const { token } = useUser();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    media_type: 'image',
    media_url: '',
    thumbnail_url: '',
    project_type: '',
    tags: [] as string[],
    is_featured: false,
    is_public: true
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadPortfolio();
  }, [talentId]);

  const loadPortfolio = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/talent/profiles/${talentId}/portfolio`
      );
      
      if (response.data.success) {
        setPortfolio(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      // Upload to Bunny.net via existing upload endpoint
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        'http://localhost:5001/api/uploads/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100)
            );
            setUploadProgress(percentCompleted);
          }
        }
      );

      if (response.data.success) {
        const mediaUrl = response.data.url;
        setNewItem({ ...newItem, media_url: mediaUrl, thumbnail_url: mediaUrl });
        alert('File uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `http://localhost:5001/api/talent/profiles/${talentId}/portfolio`,
        newItem,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Portfolio item added!');
        setShowAddModal(false);
        setNewItem({
          title: '',
          description: '',
          media_type: 'image',
          media_url: '',
          thumbnail_url: '',
          project_type: '',
          tags: [],
          is_featured: false,
          is_public: true
        });
        loadPortfolio();
      }
    } catch (error: any) {
      console.error('Failed to add item:', error);
      alert(error.response?.data?.error || 'Failed to add portfolio item');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setLoading(true);
    try {
      const response = await axios.put(
        `http://localhost:5001/api/talent/portfolio/${editingItem.id}`,
        editingItem,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Portfolio item updated!');
        setEditingItem(null);
        loadPortfolio();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update portfolio item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;

    try {
      const response = await axios.delete(
        `http://localhost:5001/api/talent/portfolio/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Portfolio item deleted!');
        loadPortfolio();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete portfolio item');
    }
  };

  const handleReorder = async (items: PortfolioItem[]) => {
    try {
      const reorderedItems = items.map((item, index) => ({
        id: item.id,
        display_order: index
      }));

      const response = await axios.put(
        `http://localhost:5001/api/talent/profiles/${talentId}/portfolio/reorder`,
        { items: reorderedItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        loadPortfolio();
      }
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
  };

  if (!isOwner) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolio.filter(item => item.is_public).map((item) => (
          <div key={item.id} className="glass rounded-xl overflow-hidden">
            {item.media_type === 'image' && (
              <img src={item.media_url} alt={item.title} className="w-full h-64 object-cover" />
            )}
            {item.media_type === 'video' && (
              <video src={item.media_url} controls className="w-full h-64 object-cover" />
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
            ➕ Add Portfolio Item
          </button>
        </div>
      )}

      {/* Portfolio Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolio.map((item) => (
          <div key={item.id} className="glass rounded-xl overflow-hidden relative group">
            {item.media_type === 'image' && (
              <img src={item.media_url} alt={item.title} className="w-full h-64 object-cover" />
            )}
            {item.media_type === 'video' && (
              <video src={item.media_url} controls className="w-full h-64 object-cover" />
            )}
            
            {item.is_featured && (
              <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
                ⭐ Featured
              </div>
            )}

            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              )}
              
              {isOwner && (
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="flex-1 px-3 py-2 glass rounded-lg text-sm font-semibold hover:bg-gray-50"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add Portfolio Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Image/Video
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                {uploadingFile && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                )}
                {newItem.media_url && (
                  <p className="text-sm text-green-600 mt-2">✓ File uploaded successfully</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Type
                </label>
                <input
                  type="text"
                  value={newItem.project_type}
                  onChange={(e) => setNewItem({ ...newItem, project_type: e.target.value })}
                  placeholder="e.g., Wedding, Corporate Event, Product Photography"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newItem.is_featured}
                    onChange={(e) => setNewItem({ ...newItem, is_featured: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Featured</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newItem.is_public}
                    onChange={(e) => setNewItem({ ...newItem, is_public: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Public</span>
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
                  disabled={loading || !newItem.media_url}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Portfolio Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_featured}
                    onChange={(e) => setEditingItem({ ...editingItem, is_featured: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Featured</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_public}
                    onChange={(e) => setEditingItem({ ...editingItem, is_public: e.target.checked })}
                    className="w-5 h-5 text-green-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Public</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-6 py-3 glass rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;

