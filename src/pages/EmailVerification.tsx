// Email Verification Page
// [Oct 24, 2025] - Email verification success/pending page
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';
import api from '../services/api';

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useUser();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'pending'>('pending');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus('verifying');
    
    try {
      const response = await axios.post(api.getUrl('auth/verify-email'), {
        token: verificationToken
      });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        
        // Auto-login the user
        if (response.data.token) {
          localStorage.setItem('auth_token', response.data.token);
          
          // Redirect based on onboarding status
          setTimeout(() => {
            if (response.data.nextStep === 'onboarding') {
              navigate('/onboarding');
            } else {
              navigate('/');
            }
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('❌ Verification failed:', error);
      setStatus('error');
      setMessage(
        error.response?.data?.error || 
        'Verification failed. The link may be expired or invalid.'
      );
    }
  };

  const resendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(api.getUrl('auth/resend-verification'), {
        email: email
      });

      if (response.data.success) {
        alert('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to resend email');
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [resendError, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        
        {/* Verifying */}
        {status === 'verifying' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Email...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your account
            </p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                Redirecting you to onboarding...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verification Failed
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{message}</p>
            </div>
            
            {/* Resend Section */}
            <div className="space-y-4">
              <p className="text-gray-600">
                Enter your email to receive a new verification link:
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modern-input w-full"
                placeholder="you@company.com"
                disabled={loading}
              />
              <button
                onClick={resendVerification}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending...' : '📧 Resend Verification Email'}
              </button>
            </div>

            <div className="mt-6">
              <Link to="/login" className="text-sm text-purple-600 hover:text-purple-800 underline">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Pending (No Token) */}
        {status === 'pending' && !token && (
          <div className="text-center">
            <div className="text-6xl mb-6">📧</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification email to:
            </p>
            {email && (
              <p className="text-lg font-medium text-purple-600 mb-6">
                {email}
              </p>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Didn't receive the email?</strong>
              </p>
              <ul className="text-xs text-blue-800 text-left space-y-1">
                <li>• Check your spam/junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a few minutes and check again</li>
              </ul>
            </div>

            {/* Resend */}
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modern-input w-full"
                placeholder="you@company.com"
                disabled={loading}
              />
              <button
                onClick={resendVerification}
                disabled={loading || !email}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending...' : '📧 Resend Verification Email'}
              </button>
            </div>

            <div className="mt-6">
              <Link to="/login" className="text-sm text-purple-600 hover:text-purple-800 underline">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmailVerification;

