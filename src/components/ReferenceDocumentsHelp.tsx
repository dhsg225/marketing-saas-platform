import React from 'react';

const ReferenceDocumentsHelp: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center mb-6">
          <span className="text-4xl mr-4">📄</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Reference Documents</h1>
            <p className="text-gray-600 mt-2">Centralized repository for all your client business documents and reference materials</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <p className="text-blue-800 font-medium">
              <strong>💡 Pro Tip:</strong> Upload your client's key business documents here to give our AI context for generating more accurate, brand-aligned content.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">🎯 What Are Reference Documents?</h2>
          <p className="text-gray-700 mb-4">
            Reference Documents are essential business materials that provide context for AI-generated content. Think of them as your client's "knowledge base" that helps our AI understand:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
            <li><strong>Brand Voice & Guidelines</strong> - How your client wants to communicate</li>
            <li><strong>Products & Services</strong> - What they offer and how to describe them</li>
            <li><strong>Target Audience</strong> - Who they're speaking to</li>
            <li><strong>Business Operations</strong> - How they work and what makes them unique</li>
            <li><strong>Industry Context</strong> - Sector-specific terminology and best practices</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">📁 Document Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🍽️ Menu / Product List</h3>
              <p className="text-gray-600 text-sm">Restaurant menus, product catalogs, service offerings, pricing lists</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🎨 Brand Guidelines</h3>
              <p className="text-gray-600 text-sm">Logo usage, color palettes, typography, brand voice guidelines</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">📈 Marketing Materials</h3>
              <p className="text-gray-600 text-sm">Campaign briefs, promotional content, marketing strategies</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">⚙️ Operational Guidelines</h3>
              <p className="text-gray-600 text-sm">Business procedures, policies, operational standards</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">📋 Legal Documents</h3>
              <p className="text-gray-600 text-sm">Terms of service, privacy policies, compliance information</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">💰 Price List</h3>
              <p className="text-gray-600 text-sm">Detailed pricing, packages, service costs, rate cards</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🖼️ Reference Images</h3>
              <p className="text-gray-600 text-sm">Visual assets, brand imagery, style references</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">📄 General</h3>
              <p className="text-gray-600 text-sm">Any other relevant business documents</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">🤖 How AI Uses Your Documents</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Automatic AI Integration</h3>
            <p className="text-green-700 mb-3">
              Our AI automatically accesses your reference documents when generating content. You don't need to manually specify which documents to use each time.
            </p>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✅</span>
                <div>
                  <strong className="text-green-800">Smart Context Selection</strong>
                  <p className="text-green-700 text-sm">AI automatically chooses relevant documents based on content type and category</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✅</span>
                <div>
                  <strong className="text-green-800">Brand-Aware Content</strong>
                  <p className="text-green-700 text-sm">Generated content matches your client's brand voice and guidelines</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✅</span>
                <div>
                  <strong className="text-green-800">Accurate Information</strong>
                  <p className="text-green-700 text-sm">Content includes correct product details, pricing, and business information</p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">🔧 Key Features</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">📤 Upload & Organize</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li><strong>Drag & Drop Upload</strong> - Simply drag files from your computer</li>
            <li><strong>Multiple File Types</strong> - Supports PDF, Word, Excel, images, and text files</li>
            <li><strong>Automatic Categorization</strong> - Smart suggestions for document categories</li>
            <li><strong>Custom Descriptions</strong> - Add detailed descriptions for better AI understanding</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">🤖 AI Description Generation</h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-purple-700 mb-2">
              <strong>Auto-Generate Descriptions:</strong> Click the "🤖 AI Generate" button next to any document's description field to automatically create a smart description.
            </p>
            <p className="text-purple-600 text-sm">
              The AI analyzes the document content and creates context-aware descriptions that help with future content generation.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">🔒 Access Control</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li><strong>AI Accessibility Toggle</strong> - Control which documents AI can access</li>
            <li><strong>Project-Specific</strong> - Documents are organized by project</li>
            <li><strong>User Permissions</strong> - Only authorized team members can upload/edit</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">📱 Document Management</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li><strong>Edit Metadata</strong> - Update names, descriptions, and categories</li>
            <li><strong>Download Files</strong> - Access original documents anytime</li>
            <li><strong>Delete Documents</strong> - Remove outdated materials</li>
            <li><strong>Search & Filter</strong> - Find documents quickly by category or name</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">📋 Best Practices</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">✅ Do</h3>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Upload complete brand guidelines</li>
                <li>• Include current menus and pricing</li>
                <li>• Add detailed product descriptions</li>
                <li>• Keep documents up-to-date</li>
                <li>• Use descriptive file names</li>
                <li>• Enable AI access for relevant docs</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">❌ Don't</h3>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• Upload outdated information</li>
                <li>• Include sensitive personal data</li>
                <li>• Upload large files unnecessarily</li>
                <li>• Use vague document names</li>
                <li>• Disable AI access for key docs</li>
                <li>• Upload duplicate documents</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">🚀 Getting Started</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Quick Setup Guide</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-2">
              <li><strong>Upload Brand Guidelines</strong> - Start with your client's brand document</li>
              <li><strong>Add Product Information</strong> - Include menus, catalogs, or service lists</li>
              <li><strong>Include Marketing Materials</strong> - Upload any existing promotional content</li>
              <li><strong>Set AI Access</strong> - Enable AI access for documents you want to influence content</li>
              <li><strong>Generate Descriptions</strong> - Use the AI button to create smart descriptions</li>
              <li><strong>Test Content Generation</strong> - Create some content to see how AI uses your documents</li>
            </ol>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">🔍 Troubleshooting</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">AI Not Using My Documents?</h3>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• Check that "Allow AI to access" is enabled</li>
                <li>• Ensure documents are properly categorized</li>
                <li>• Verify descriptions are detailed and accurate</li>
                <li>• Make sure documents are relevant to content type</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Upload Issues?</h3>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• Check file size (max 10MB recommended)</li>
                <li>• Ensure file format is supported</li>
                <li>• Try refreshing the page and uploading again</li>
                <li>• Contact support for large file uploads</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mt-8">
            <h2 className="text-2xl font-bold mb-3">💡 Pro Tips</h2>
            <ul className="space-y-2">
              <li>• <strong>Regular Updates:</strong> Keep documents current to ensure AI generates accurate content</li>
              <li>• <strong>Rich Descriptions:</strong> Detailed descriptions help AI better understand document context</li>
              <li>• <strong>Strategic Categorization:</strong> Proper categories ensure AI selects the right documents</li>
              <li>• <strong>Quality Over Quantity:</strong> Focus on uploading high-quality, relevant documents</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceDocumentsHelp;
