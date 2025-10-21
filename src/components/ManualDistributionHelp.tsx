import React from 'react';

const ManualDistributionHelp: React.FC = () => {
  return (
    <div className="prose prose-lg max-w-none">
      <h1>📢 Manual Distribution Management - Complete Guide</h1>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">What is Manual Distribution?</h3>
            <p className="mt-1 text-sm text-blue-700">
              Manual Distribution helps you manage sharing content to platforms like Facebook Groups, LinkedIn Groups, and other communities that don't allow automated posting. It provides organized workflows, rotation schedules, and tracking for manual content distribution.
            </p>
          </div>
        </div>
      </div>

      <h2>🎯 Key Benefits</h2>
      <ul>
        <li><strong>Organized Workflows:</strong> Keep track of all your target groups and communities</li>
        <li><strong>Rotation Schedules:</strong> Ensure even distribution across multiple groups</li>
        <li><strong>Platform Compliance:</strong> Stay within platform rules while maximizing reach</li>
        <li><strong>Performance Tracking:</strong> Monitor which groups perform best</li>
        <li><strong>Time Management:</strong> Schedule optimal posting times for each group</li>
      </ul>

      <h2>📋 Supported Platforms</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">📘</div>
          <h4 className="font-medium">Facebook Groups</h4>
          <p className="text-sm text-gray-600">Local communities, interest groups</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">💼</div>
          <h4 className="font-medium">LinkedIn Groups</h4>
          <p className="text-sm text-gray-600">Professional networks, industry groups</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">🔴</div>
          <h4 className="font-medium">Reddit</h4>
          <p className="text-sm text-gray-600">Subreddits, community discussions</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">💬</div>
          <h4 className="font-medium">Discord</h4>
          <p className="text-sm text-gray-600">Community servers, gaming groups</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">✈️</div>
          <h4 className="font-medium">Telegram</h4>
          <p className="text-sm text-gray-600">Messaging channels, groups</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">💚</div>
          <h4 className="font-medium">WhatsApp</h4>
          <p className="text-sm text-gray-600">Business groups, community chats</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">📧</div>
          <h4 className="font-medium">Email Lists</h4>
          <p className="text-sm text-gray-600">Newsletter subscribers, lists</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-2xl mb-2">📋</div>
          <h4 className="font-medium">Other</h4>
          <p className="text-sm text-gray-600">Custom platforms, forums</p>
        </div>
      </div>

      <h2>🚀 Getting Started</h2>

      <h3>Step 1: Create a Distribution List</h3>
      <ol>
        <li>Go to <strong>Playbook Manager</strong> → <strong>📢 Manual Distribution</strong></li>
        <li>Click <strong>"Create Distribution List"</strong></li>
        <li>Choose your target platform (e.g., Facebook Groups)</li>
        <li>Give your list a descriptive name (e.g., "Local Food Groups")</li>
        <li>Add a brief description of the list's purpose</li>
      </ol>

      <h3>Step 2: Add Target Groups</h3>
      <ol>
        <li>Select your distribution list</li>
        <li>Click <strong>"Add Group"</strong></li>
        <li>Fill in the group details:
          <ul>
            <li><strong>Group Name:</strong> Clear, identifiable name</li>
            <li><strong>Group URL:</strong> Direct link to the group</li>
            <li><strong>Target Audience:</strong> Who this group is for</li>
            <li><strong>Group Instructions:</strong> Specific posting guidelines</li>
          </ul>
        </li>
        <li>Set posting preferences:
          <ul>
            <li><strong>Frequency:</strong> How often to post (daily, weekly, etc.)</li>
            <li><strong>Preferred Days:</strong> Which days work best</li>
            <li><strong>Preferred Times:</strong> Optimal posting times</li>
            <li><strong>Max Posts/Day:</strong> Limit to avoid spam</li>
          </ul>
        </li>
      </ol>

      <h3>Step 3: Organize Your Workflow</h3>
      <ol>
        <li>Review your target groups regularly</li>
        <li>Update group instructions based on platform changes</li>
        <li>Monitor posting frequency to avoid over-posting</li>
        <li>Use the logs to track what's been shared where</li>
      </ol>

      <h2>📊 Best Practices</h2>

      <h3>✅ Do</h3>
      <ul>
        <li><strong>Follow Group Rules:</strong> Always read and respect each group's posting guidelines</li>
        <li><strong>Engage Authentically:</strong> Don't just drop links - participate in discussions</li>
        <li><strong>Vary Your Content:</strong> Don't post the same content to every group</li>
        <li><strong>Time Your Posts:</strong> Post when your target audience is most active</li>
        <li><strong>Track Performance:</strong> Use the logs to see which groups perform best</li>
        <li><strong>Build Relationships:</strong> Engage with other members before promoting</li>
        <li><strong>Provide Value:</strong> Share useful content, not just promotional material</li>
      </ul>

      <h3>❌ Don't</h3>
      <ul>
        <li><strong>Spam Groups:</strong> Avoid posting too frequently or irrelevant content</li>
        <li><strong>Ignore Guidelines:</strong> Each group has its own rules - follow them</li>
        <li><strong>Post Identical Content:</strong> Customize your message for each group</li>
        <li><strong>Ignore Engagement:</strong> Respond to comments and questions</li>
        <li><strong>Over-Promote:</strong> Balance promotional content with valuable information</li>
        <li><strong>Skip Research:</strong> Understand each group's culture before posting</li>
      </ul>

      <h2>🎯 Platform-Specific Tips</h2>

      <h3>Facebook Groups</h3>
      <ul>
        <li>Join groups as a person, not a business page</li>
        <li>Participate in discussions before promoting</li>
        <li>Use native Facebook features (polls, events)</li>
        <li>Share behind-the-scenes content</li>
      </ul>

      <h3>LinkedIn Groups</h3>
      <ul>
        <li>Focus on professional value and insights</li>
        <li>Share industry news and thought leadership</li>
        <li>Participate in professional discussions</li>
        <li>Connect with other professionals</li>
      </ul>

      <h3>Reddit</h3>
      <ul>
        <li>Follow the "10:1 rule" (10 valuable posts for every promotional post)</li>
        <li>Read subreddit rules carefully</li>
        <li>Use appropriate subreddits for your content</li>
        <li>Engage in discussions genuinely</li>
      </ul>

      <h2>📈 Tracking and Analytics</h2>

      <h3>Distribution Logs</h3>
      <p>Use the <strong>"View Logs"</strong> feature to track:</p>
      <ul>
        <li>What content was shared where</li>
        <li>When posts were made</li>
        <li>Success/failure status</li>
        <li>Notes about performance</li>
        <li>Which team member shared content</li>
      </ul>

      <h3>Performance Metrics</h3>
      <p>Track these key metrics:</p>
      <ul>
        <li><strong>Engagement Rate:</strong> Comments, likes, shares per post</li>
        <li><strong>Reach:</strong> How many people saw your content</li>
        <li><strong>Click-Through Rate:</strong> Links clicked vs. posts made</li>
        <li><strong>Conversion Rate:</strong> Leads generated from group posts</li>
        <li><strong>Best Performing Groups:</strong> Which groups drive the most engagement</li>
      </ul>

      <h2>🔄 Rotation Strategies</h2>

      <h3>Round Robin</h3>
      <p>Post to groups in a rotating order to ensure even distribution.</p>

      <h3>Frequency-Based</h3>
      <p>Post more frequently to high-performing groups, less to others.</p>

      <h3>Time-Based</h3>
      <p>Schedule posts based on when each group is most active.</p>

      <h3>Content-Based</h3>
      <p>Match content type to group interests and guidelines.</p>

      <h2>⚠️ Important Considerations</h2>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Platform Compliance</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Always check each platform's terms of service and group rules. Some platforms have strict policies about promotional content. Manual distribution helps you stay compliant while maximizing your reach.
            </p>
          </div>
        </div>
      </div>

      <h3>Legal and Ethical Guidelines</h3>
      <ul>
        <li><strong>Respect Privacy:</strong> Don't share personal information from groups</li>
        <li><strong>Follow Platform Rules:</strong> Each platform has its own terms of service</li>
        <li><strong>Be Transparent:</strong> Clearly identify when content is promotional</li>
        <li><strong>Respect Group Culture:</strong> Adapt your approach to each community</li>
        <li><strong>Quality Over Quantity:</strong> Better to post less frequently with high-quality content</li>
      </ul>

      <h2>🛠️ Troubleshooting</h2>

      <h3>Common Issues</h3>
      <ul>
        <li><strong>Posts Getting Rejected:</strong> Check group rules and posting guidelines</li>
        <li><strong>Low Engagement:</strong> Try different content types or posting times</li>
        <li><strong>Group Access Issues:</strong> Ensure you're following group rules</li>
        <li><strong>Content Not Relevant:</strong> Customize content for each group's audience</li>
      </ul>

      <h3>Getting Help</h3>
      <p>If you encounter issues:</p>
      <ul>
        <li>Check the distribution logs for error details</li>
        <li>Review group rules and guidelines</li>
        <li>Test with a small group first</li>
        <li>Adjust your content strategy based on feedback</li>
      </ul>

      <h2>🚀 Advanced Features</h2>

      <h3>Bulk Operations</h3>
      <p>Plan to add features for:</p>
      <ul>
        <li>Bulk group creation from spreadsheets</li>
        <li>Template-based content customization</li>
        <li>Automated rotation scheduling</li>
        <li>Performance analytics dashboard</li>
      </ul>

      <h3>Integration Opportunities</h3>
      <ul>
        <li>Connect with your content calendar</li>
        <li>Link to social media management tools</li>
        <li>Integrate with CRM systems</li>
        <li>Sync with analytics platforms</li>
      </ul>

      <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">🎉</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Ready to Get Started?</h3>
            <p className="mt-1 text-sm text-green-700">
              Manual Distribution Management helps you build authentic relationships with communities while staying compliant with platform rules. Start with a few groups, learn their culture, and gradually expand your reach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualDistributionHelp;
