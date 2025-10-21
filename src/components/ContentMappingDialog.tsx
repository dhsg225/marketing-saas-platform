import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface ContentItem {
  title: string;
  description: string;
  format: string;
  date: string;
  platform: string;
  type: string;
  hashtags: string[];
}

interface SystemField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'textarea';
  options?: string[];
  required: boolean;
}

interface ContentMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentItems: ContentItem[];
  projectId: string;
  onImportComplete: (importedCount: number) => void;
}

const ContentMappingDialog: React.FC<ContentMappingDialogProps> = ({
  isOpen,
  onClose,
  contentItems,
  projectId,
  onImportComplete
}) => {
  const { token } = useUser();
  const [mappedItems, setMappedItems] = useState<ContentItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [postTypes, setPostTypes] = useState<any[]>([]);
  const [platforms] = useState(['Instagram', 'Facebook', 'TikTok', 'Twitter', 'LinkedIn']);
  const [formats] = useState(['Feed post', 'Story', 'Reel', 'Carousel', 'Video', 'Photo']);
  
  // System fields for content_ideas table
  const systemFields: SystemField[] = [
    { id: 'title', name: 'Content Title', type: 'text', required: true },
    { id: 'description', name: 'Content Description', type: 'textarea', required: true },
    { id: 'suggested_date', name: 'Suggested Date', type: 'date', required: false },
    { id: 'platform', name: 'Platform', type: 'select', options: ['Instagram', 'Facebook', 'TikTok', 'Twitter', 'LinkedIn'], required: true },
    { id: 'format', name: 'Content Format', type: 'multiselect', options: ['Feed post', 'Story', 'Reel', 'Carousel', 'Video', 'Photo'], required: true },
    { id: 'image_type', name: 'Image Type', type: 'select', options: ['Real', 'Midjourney', 'DALL-E', 'Stable Diffusion', 'Stock Photo', 'Custom Design', 'User Generated'], required: false },
    { id: 'status', name: 'Status', type: 'select', options: ['draft', 'review', 'approved', 'scheduled'], required: true },
    { id: 'post_type_id', name: 'Post Type', type: 'select', options: [], required: false },
    { id: 'hashtags', name: 'Hashtags', type: 'text', required: false }
  ];

  useEffect(() => {
    if (isOpen && contentItems) {
      // Initialize mapped items with AI suggestions and auto-populate fields
      const mappedItems = contentItems.map(item => {
        // Smart format mapping - handle AI suggestions like "Feed carousel" by splitting into multiple formats
        let formatValue = item.format || 'Feed post';
        if (formatValue.toLowerCase().includes('carousel')) {
          formatValue = 'Feed post,Carousel'; // Split into multiple formats
        } else if (formatValue.toLowerCase().includes('reel')) {
          formatValue = 'Feed post,Reel'; // Split into multiple formats
        } else if (formatValue.toLowerCase().includes('story')) {
          formatValue = 'Story'; // Single format
        } else if (formatValue.toLowerCase().includes('video')) {
          formatValue = 'Video'; // Single format
        } else if (formatValue.toLowerCase().includes('photo')) {
          formatValue = 'Photo'; // Single format
        }
        
        return {
          ...item,
          status: 'draft', // Auto-set status to draft
          suggested_date: item.date ? new Date(item.date).toISOString().split('T')[0] : '', // Convert date format
          platform: item.platform || 'Instagram', // Default platform
          format: formatValue // Smart format mapping
        };
      });
      
      setMappedItems(mappedItems);
      // Select all items by default
      setSelectedItems(new Set(contentItems.map((_, index) => index)));
    }
  }, [isOpen, contentItems]);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchPostTypes();
    }
  }, [isOpen, projectId]);

  const fetchPostTypes = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/playbook/recipes/${projectId}`);
      if (response.data.success) {
        setPostTypes(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch post types:', error);
    }
  };

  const handleItemChange = (index: number, field: keyof ContentItem, value: string | string[]) => {
    const updatedItems = [...mappedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setMappedItems(updatedItems);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === mappedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(mappedItems.map((_, index) => index)));
    }
  };

  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) return;

    setImporting(true);
    try {
      const itemsToImport = Array.from(selectedItems).map(index => mappedItems[index]);
      
      const response = await axios.post(
        `http://localhost:5001/api/content-mapping/${projectId}/import-content`,
        {
          contentItems: itemsToImport,
          sourceDocument: 'AI Document Review'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      if (response.data.success) {
        onImportComplete(response.data.data.importedCount);
        onClose();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Failed to import content: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Mapping Review</h2>
            <p className="text-gray-600 mt-1">
              Review and edit AI-suggested content mappings before importing
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="font-medium text-gray-900">{mappedItems.length}</span>
              <span className="text-gray-600"> total items</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-blue-600">{selectedItems.size}</span>
              <span className="text-gray-600"> selected for import</span>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedItems.size === mappedItems.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Content Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {mappedItems.map((item, index) => (
              <div
                key={index}
                className={`border rounded-lg p-6 ${
                  selectedItems.has(index) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={() => handleSelectItem(index)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />

                  {/* Content Details */}
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Content Item {index + 1}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {selectedItems.has(index) ? 'Selected for import' : 'Not selected'}
                      </div>
                    </div>

                    {/* AI Extracted Fields (Read-only) */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">🤖 AI Extracted Data</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium">Title:</span> {item.title}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {item.date}
                        </div>
                        <div>
                          <span className="font-medium">Platform:</span> {item.platform}
                        </div>
                        <div>
                          <span className="font-medium">Format:</span> {item.format}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {item.type}
                        </div>
                        <div>
                          <span className="font-medium">Hashtags:</span> {item.hashtags.join(', ') || 'None'}
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="font-medium">Description:</span>
                        <p className="text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>

                    {/* System Fields Mapping */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">📋 Map to Your System Fields</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {systemFields.map((field) => (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.name} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={item[field.id as keyof ContentItem] as string || ''}
                                onChange={(e) => handleItemChange(index, field.id as keyof ContentItem, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                            {field.type === 'textarea' && (
                              <textarea
                                value={item[field.id as keyof ContentItem] as string || ''}
                                onChange={(e) => handleItemChange(index, field.id as keyof ContentItem, e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                            {field.type === 'date' && (
                              <input
                                type="date"
                                value={item[field.id as keyof ContentItem] as string || ''}
                                onChange={(e) => handleItemChange(index, field.id as keyof ContentItem, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                            {field.type === 'select' && (
                              <select
                                value={item[field.id as keyof ContentItem] as string || ''}
                                onChange={(e) => handleItemChange(index, field.id as keyof ContentItem, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select {field.name}</option>
                                {field.options?.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            )}
                            {field.type === 'multiselect' && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {field.options?.map(option => {
                                    const selectedFormats = (item[field.id as keyof ContentItem] as string || '').split(',').filter(Boolean);
                                    const isSelected = selectedFormats.includes(option);
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                          const currentFormats = (item[field.id as keyof ContentItem] as string || '').split(',').filter(Boolean);
                                          const newFormats = isSelected 
                                            ? currentFormats.filter(f => f !== option)
                                            : [...currentFormats, option];
                                          handleItemChange(index, field.id as keyof ContentItem, newFormats.join(','));
                                        }}
                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                          isSelected 
                                            ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Selected: {(item[field.id as keyof ContentItem] as string || '').split(',').filter(Boolean).join(', ') || 'None'}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedItems.size} of {mappedItems.length} items selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedItems.size === 0 || importing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${selectedItems.size} Items`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentMappingDialog;
