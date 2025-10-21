import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ManualDistributionHelp from '../components/ManualDistributionHelp';

// Help article data structure
interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  lastUpdated: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
  featured?: boolean;
}

// Help articles data
const helpArticles: HelpArticle[] = [
  {
    id: 'tone-profiler-guide',
    title: '🎨 Advanced Tone & Style Profiler',
    category: 'features',
    content: `
# 🎨 Advanced Tone & Style Profiler - Complete Guide

## What is the Tone & Style Profiler?

The Tone Profiler is a **brand voice template system** that automatically influences how AI generates content throughout your entire project. It's like setting the "personality" for all your AI-generated content - ensuring everything sounds like it's coming from the same "person" with consistent brand voice.

## How It Works

### Core Concept
- **Tone Profiles** = Brand voice templates with detailed AI instructions
- **System Instructions** = The exact text sent to AI models as their "personality guide"
- **Project-Wide Influence** = These profiles automatically apply across all content generation

### Real-World Example
**Without Tone Profile:**
\`\`\`
AI Prompt: "Write a post about our new coffee blend"
Result: "Introducing our new premium coffee blend, crafted with care..."
\`\`\`

**With "Australian Ocker" Tone Profile:**
\`\`\`
AI Prompt: "Write a post about our new coffee blend" 
+ System Instruction: "You are a helpful but no-nonsense Australian content writer..."
Result: "Right, mate! We've got a ripper new coffee blend that'll knock your socks off. No fancy marketing speak here - just great coffee that actually tastes good. She's a beauty, trust me!"
\`\`\`

## How to Use

### Step 1: Access the Feature
1. Navigate to **Manage → Tone Profiler**
2. Or go directly to \`/tone-profiler\` route

### Step 2: Create New Tone Profile
1. Click **"➕ Create New Tone Profile"**
2. Fill in required fields:
   - **Name:** Descriptive name (e.g., "Brand Voice: Professional")
   - **Description:** Brief purpose description
   - **System Instruction:** The detailed AI personality guide
   - **Public/Private:** Share with organization or keep private

### Step 3: Use AI Suggestion Feature
1. Fill in **Industry/Niche** (e.g., "SaaS Marketing")
2. Fill in **Style Keywords** (e.g., "professional, witty, empathetic")
3. Click **"✨ Suggest System Instruction"**
4. AI generates a starting point for your system instruction
5. Edit and refine as needed

## Tone Profile Examples

### Professional & Authoritative
\`\`\`
System Instruction: "You are an industry expert writing authoritative content. Use data-driven insights, professional language, and establish credibility. Be informative but approachable. Support claims with evidence and maintain a confident but not arrogant tone."
\`\`\`

### Friendly & Conversational
\`\`\`
System Instruction: "You are a helpful friend sharing tips. Use casual language, ask questions, share personal insights. Be warm and encouraging. Write as if you're talking to a friend over coffee - genuine, caring, and supportive."
\`\`\`

### Australian Casual
\`\`\`
System Instruction: "You are a helpful but no-nonsense Australian content writer. Use casual Aussie slang, be direct and practical, but always friendly. Drop in terms like 'mate', 'no worries', 'she'll be right'. Keep it conversational but informative."
\`\`\`

## Business Benefits

### Brand Consistency
- ✅ All content sounds like it's coming from the same "person"
- ✅ Maintains brand personality across all platforms
- ✅ Reduces need to constantly re-explain brand voice
- ✅ Professional, cohesive brand experience

### Time & Cost Savings
- ✅ No need to rewrite style instructions every time
- ✅ AI automatically applies brand voice
- ✅ Consistent results without manual editing
- ✅ Faster content creation workflow

## Best Practices

### Writing Effective System Instructions
1. **Be Specific:** "Use casual language" vs "Write like you're talking to a friend"
2. **Provide Examples:** "Use phrases like 'no worries' and 'she'll be right'"
3. **Set Boundaries:** "Don't use technical jargon" or "Keep it under 200 words"
4. **Include Context:** "For B2B audiences" or "For social media posts"
5. **Test and Iterate:** Try different instructions and see what works

### Managing Multiple Tones
1. **Name Clearly:** "B2B Professional" vs "Consumer Casual"
2. **Document Purpose:** When to use each tone
3. **Train Team:** Ensure everyone understands tone differences
4. **Regular Review:** Update tones based on performance and feedback

## Troubleshooting

### Issue: Tone Not Being Applied
**Problem:** Tone profile not selected in content generation
**Solution:** Ensure tone profile is selected in Content Generator interface

### Issue: AI Ignoring Tone Instructions
**Problem:** System instruction too vague or contradictory
**Solution:** Be more specific, provide clear examples, avoid conflicting directives

### Issue: System Instruction Too Long
**Problem:** AI models have token limits for system instructions
**Solution:** Keep instructions under 500 words, focus on key personality traits
`,
    lastUpdated: '2025-10-12',
    tags: ['ai', 'content', 'branding', 'tone', 'voice'],
    difficulty: 'intermediate',
    estimatedReadTime: '8 minutes',
    featured: true
  },
  {
    id: 'reference-documents-guide',
    title: '📄 Reference Documents',
    category: 'features',
    content: `
# 📄 Reference Documents - Complete Guide

## What Are Reference Documents?

Reference Documents are essential business materials that provide context for AI-generated content. Think of them as your client's "knowledge base" that helps our AI understand:

- **Brand Voice & Guidelines** - How your client wants to communicate
- **Products & Services** - What they offer and how to describe them  
- **Target Audience** - Who they're speaking to
- **Business Operations** - How they work and what makes them unique
- **Industry Context** - Sector-specific terminology and best practices

## Document Categories

### 🍽️ Menu / Product List
Restaurant menus, product catalogs, service offerings, pricing lists

### 🎨 Brand Guidelines  
Logo usage, color palettes, typography, brand voice guidelines

### 📈 Marketing Materials
Campaign briefs, promotional content, marketing strategies

### ⚙️ Operational Guidelines
Business procedures, policies, operational standards

### 📋 Legal Documents
Terms of service, privacy policies, compliance information

### 💰 Price List
Detailed pricing, packages, service costs, rate cards

### 🖼️ Reference Images
Visual assets, brand imagery, style references

### 📄 General
Any other relevant business documents

## How AI Uses Your Documents

### Automatic AI Integration
Our AI automatically accesses your reference documents when generating content. You don't need to manually specify which documents to use each time.

**Smart Context Selection:**
- AI automatically chooses relevant documents based on content type and category
- Generated content matches your client's brand voice and guidelines
- Content includes correct product details, pricing, and business information

## Key Features

### 📤 Upload & Organize
- **Drag & Drop Upload** - Simply drag files from your computer
- **Multiple File Types** - Supports PDF, Word, Excel, images, and text files
- **Automatic Categorization** - Smart suggestions for document categories
- **Custom Descriptions** - Add detailed descriptions for better AI understanding

### 🤖 AI Description Generation
**Auto-Generate Descriptions:** Click the "🤖 AI Generate" button next to any document's description field to automatically create a smart description.

The AI analyzes the document content and creates context-aware descriptions that help with future content generation.

### 🔒 Access Control
- **AI Accessibility Toggle** - Control which documents AI can access
- **Project-Specific** - Documents are organized by project
- **User Permissions** - Only authorized team members can upload/edit

### 📱 Document Management
- **Edit Metadata** - Update names, descriptions, and categories
- **Download Files** - Access original documents anytime
- **Delete Documents** - Remove outdated materials
- **Search & Filter** - Find documents quickly by category or name

## Best Practices

### ✅ Do
- Upload complete brand guidelines
- Include current menus and pricing
- Add detailed product descriptions
- Keep documents up-to-date
- Use descriptive file names
- Enable AI access for relevant docs

### ❌ Don't
- Upload outdated information
- Include sensitive personal data
- Upload large files unnecessarily
- Use vague document names
- Disable AI access for key docs
- Upload duplicate documents

## Getting Started

### Quick Setup Guide
1. **Upload Brand Guidelines** - Start with your client's brand document
2. **Add Product Information** - Include menus, catalogs, or service lists
3. **Include Marketing Materials** - Upload any existing promotional content
4. **Set AI Access** - Enable AI access for documents you want to influence content
5. **Generate Descriptions** - Use the AI button to create smart descriptions
6. **Test Content Generation** - Create some content to see how AI uses your documents

## Troubleshooting

### AI Not Using My Documents?
- Check that "Allow AI to access" is enabled
- Ensure documents are properly categorized
- Verify descriptions are detailed and accurate
- Make sure documents are relevant to content type

### Upload Issues?
- Check file size (max 10MB recommended)
- Ensure file format is supported
- Try refreshing the page and uploading again
- Contact support for large file uploads

## Pro Tips
- **Regular Updates:** Keep documents current to ensure AI generates accurate content
- **Rich Descriptions:** Detailed descriptions help AI better understand document context
- **Strategic Categorization:** Proper categories ensure AI selects the right documents
- **Quality Over Quantity:** Focus on uploading high-quality, relevant documents
`,
    lastUpdated: '2025-10-12',
    tags: ['documents', 'ai', 'content', 'organization', 'brand'],
    difficulty: 'beginner',
    estimatedReadTime: '6 minutes'
  },
  {
    id: 'manual-distribution-guide',
    title: '📢 Manual Distribution Management',
    category: 'features',
    content: 'manual-distribution-help',
    lastUpdated: '2025-10-12',
    tags: ['distribution', 'manual', 'groups', 'social', 'workflow'],
    difficulty: 'intermediate',
    estimatedReadTime: '10 minutes'
  },
  {
    id: 'getting-started-welcome',
    title: '👋 Welcome to Your Marketing SaaS Platform',
    category: 'getting-started',
    content: `
# 👋 Welcome to Your Marketing SaaS Platform

Welcome to your comprehensive marketing content creation and management platform! This guide will help you get started and make the most of all available features.

## What You Can Do

### Content Creation
- **AI-Powered Content Generation** - Create engaging content with AI assistance
- **Tone & Style Management** - Maintain consistent brand voice across all content
- **Image Generation & Management** - Create and organize visual assets
- **Social Media Publishing** - Schedule and publish content across platforms

### Project Management
- **Client & Project Organization** - Manage multiple clients and projects
- **Content Calendar** - Plan and schedule your content strategy
- **Playbook Management** - Create reusable content templates and strategies
- **Analytics & Reporting** - Track performance and optimize your content

## Quick Start Guide

### 1. Set Up Your First Project
1. Go to **Manage → Clients** to create your first client
2. Create a new project for that client
3. Set up your project details and preferences

### 2. Create Your Brand Voice
1. Navigate to **Manage → Tone Profiler**
2. Create your first tone profile
3. Define how you want your content to sound

### 3. Generate Your First Content
1. Go to **Generate** in the main navigation
2. Select your project and tone profile
3. Create your first AI-generated content

### 4. Schedule Your Content
1. Use the **Calendar** to plan your content schedule
2. Set up social media connections
3. Publish your content automatically

## Key Features Overview

### 🎨 Tone Profiler
Define and manage your brand voice to ensure consistent content generation across all platforms.

### 📋 Playbook Manager
Create reusable content templates, post types, and content strategies for efficient content creation.

### 📅 Calendar View
Plan, schedule, and manage your content calendar with drag-and-drop functionality.

### 🖼️ Image Management
Generate, upload, and organize visual assets with AI-powered image creation.

### 📱 Social Publishing
Connect your social media accounts and publish content directly from the platform.

### 📊 Analytics
Track content performance and gain insights to optimize your marketing strategy.

## Getting Help

- **Help System:** Use the Help menu to find detailed guides
- **Feature Documentation:** Each major feature has comprehensive documentation
- **Best Practices:** Learn tips and tricks for optimal usage
- **Troubleshooting:** Common issues and solutions

## Next Steps

1. **Explore Features:** Try out different features to see what works for your workflow
2. **Set Up Integrations:** Connect your social media accounts and other tools
3. **Create Content:** Start generating content with AI assistance
4. **Optimize Workflow:** Refine your processes based on your needs

Welcome aboard! We're excited to help you create amazing content and grow your business.
`,
    lastUpdated: '2025-10-12',
    tags: ['welcome', 'getting-started', 'overview', 'quick-start'],
    difficulty: 'beginner',
    estimatedReadTime: '5 minutes'
  }
];

// Category definitions
const categories = {
  'getting-started': {
    name: 'Getting Started',
    icon: '📚',
    description: 'Learn the basics and get up and running quickly'
  },
  'features': {
    name: 'Features',
    icon: '💡',
    description: 'Detailed guides for each platform feature'
  },
  'troubleshooting': {
    name: 'Troubleshooting',
    icon: '🔧',
    description: 'Common issues and how to solve them'
  },
  'best-practices': {
    name: 'Best Practices',
    icon: '❓',
    description: 'Tips and tricks for optimal usage'
  }
};

const Help: React.FC = () => {
  const { category, articleId } = useParams<{ category?: string; articleId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');

  // Filter articles based on search and category
  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get current article
  const currentArticle = articleId ? helpArticles.find(article => article.id === articleId) : null;

  // Get featured articles
  const featuredArticles = helpArticles.filter(article => article.featured);

  // Render article content
  const renderArticleContent = (content: string) => {
    // Handle special component content
    if (content === 'manual-distribution-help') {
      return <ManualDistributionHelp />;
    }
    
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-gray-900 mb-6">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-gray-800 mb-4 mt-8">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-gray-700 mb-3 mt-6">{line.substring(4)}</h3>;
      } else if (line.startsWith('```')) {
        return null; // Skip code block markers for now
      } else if (line.startsWith('- ')) {
        return <li key={index} className="ml-6 mb-2">{line.substring(2)}</li>;
      } else if (line.startsWith('✅ ')) {
        return <div key={index} className="flex items-center mb-2"><span className="text-green-500 mr-2">✅</span><span>{line.substring(3)}</span></div>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else if (line.trim()) {
        return <p key={index} className="mb-4 text-gray-700 leading-relaxed">{line}</p>;
      }
      return null;
    });
  };

  // Article list view
  if (!articleId) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold gradient-text mb-4">📚 Help Center</h1>
          <p className="text-lg text-gray-700">Find answers, learn features, and get the most out of your platform.</p>
        </div>

        {/* Search Bar */}
        <div className="glass rounded-xl p-6 mb-8">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Articles
            </button>
            {Object.entries(categories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  selectedCategory === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Articles */}
        {selectedCategory === 'all' && featuredArticles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">⭐ Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/help/${article.category}/${article.id}`}
                  className="glass rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{article.title}</h3>
                  <p className="text-gray-600 mb-4">{categories[article.category as keyof typeof categories]?.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{article.estimatedReadTime}</span>
                    <span>{categories[article.category as keyof typeof categories]?.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Articles */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {selectedCategory === 'all' ? 'All Articles' : categories[selectedCategory as keyof typeof categories]?.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                to={`/help/${article.category}/${article.id}`}
                className="glass rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{categories[article.category as keyof typeof categories]?.icon}</span>
                  <span className="text-sm text-blue-600 font-medium">
                    {categories[article.category as keyof typeof categories]?.name}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{article.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{article.estimatedReadTime}</span>
                  <span className="capitalize">{article.difficulty}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mx-auto mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No articles found</h3>
            <p className="text-gray-500">Try adjusting your search terms or category filter.</p>
          </div>
        )}
      </div>
    );
  }

  // Article detail view
  if (currentArticle) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 text-sm text-gray-600">
          <Link to="/help" className="hover:text-blue-600 flex items-center gap-1">
            <span>🏠</span>
            Help Center
          </Link>
          <span>›</span>
          <Link to={`/help?category=${currentArticle.category}`} className="hover:text-blue-600">
            {categories[currentArticle.category as keyof typeof categories]?.name}
          </Link>
          <span>›</span>
          <span className="text-gray-900">{currentArticle.title}</span>
        </nav>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span>{categories[currentArticle.category as keyof typeof categories]?.icon}</span>
            <span className="text-blue-600 font-medium">
              {categories[currentArticle.category as keyof typeof categories]?.name}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold gradient-text mb-4">{currentArticle.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{currentArticle.estimatedReadTime}</span>
            <span className="capitalize">{currentArticle.difficulty}</span>
            <span>Updated {new Date(currentArticle.lastUpdated).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Article Content */}
        <div className="glass rounded-xl p-8 mb-8">
          <div className="prose max-w-none">
            {renderArticleContent(currentArticle.content)}
          </div>
        </div>

        {/* Article Footer */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Was this helpful?</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  👍 Yes
                </button>
                <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                  👎 No
                </button>
              </div>
            </div>
            <Link
              to="/help"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>⬅️</span>
              Back to Help Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-600 mb-4">Article not found</h2>
      <Link to="/help" className="text-blue-600 hover:underline">
        Return to Help Center
      </Link>
    </div>
  );
};

export default Help;
