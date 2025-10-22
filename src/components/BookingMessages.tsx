// [October 15, 2025] - Booking Messages Component (Option D - Messaging)
// Purpose: In-platform chat for booking communication

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';

interface Message {
  id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  has_attachments: boolean;
  attachment_urls: string[];
  is_read: boolean;
  created_at: string;
}

interface BookingMessagesProps {
  bookingId: string;
}

const BookingMessages: React.FC<BookingMessagesProps> = ({ bookingId }) => {
  const { token, user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(
        api.getUrl(`talent/bookings/${bookingId}/messages`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessages(response.data.data);
        
        // Mark unread messages as read
        response.data.data.forEach((msg: Message) => {
          if (!msg.is_read && msg.sender_user_id !== user?.id) {
            markAsRead(msg.id);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await axios.put(
        api.getUrl(`talent/messages/${messageId}/read`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        api.getUrl(`talent/bookings/${bookingId}/messages`),
        { message_text: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setNewMessage('');
        loadMessages();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'client' 
      ? 'bg-blue-100 text-blue-800' 
      : role === 'talent' 
      ? 'bg-purple-100 text-purple-800'
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="glass rounded-xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">💬 Messages</h3>
        <p className="text-sm text-gray-600">Chat with {messages[0]?.sender_role === 'client' ? 'talent' : 'client'}</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender_user_id === user?.id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-semibold text-gray-600">
                      {message.sender_name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRoleBadgeClass(message.sender_role)}`}>
                      {message.sender_role}
                    </span>
                  </div>
                  
                  <div
                    className={`rounded-lg p-3 ${
                      isMe
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.message_text}</p>
                    
                    {message.has_attachments && message.attachment_urls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachment_urls.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block text-xs ${isMe ? 'text-white' : 'text-blue-600'} hover:underline`}
                          >
                            📎 Attachment {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {loading ? '...' : '📤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingMessages;

