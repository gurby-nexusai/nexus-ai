import React, { useState } from 'react';

const TrialModal = ({ onTrialStart, onClose, reason = 'no_license' }) => {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await onTrialStart(email, company);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to start trial. Please try again.');
    }
    
    setLoading(false);
  };

  const getTitle = () => {
    switch (reason) {
      case 'trial_expired':
        return 'Trial Expired';
      case 'invalid_license':
        return 'Invalid License';
      case 'offline_expired':
        return 'License Verification Required';
      default:
        return 'Start Your Free Trial';
    }
  };

  const getMessage = () => {
    switch (reason) {
      case 'trial_expired':
        return 'Your 7-day trial has expired. Purchase a license to continue using Nexus AI.';
      case 'invalid_license':
        return 'Your license is invalid or expired. Please start a new trial or purchase a license.';
      case 'offline_expired':
        return 'Unable to verify your license. Please connect to the internet or start a new trial.';
      default:
        return 'Get instant access to 20+ AI-powered business applications. No credit card required.';
    }
  };

  const showTrialForm = reason !== 'trial_expired';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{getTitle()}</h2>
          <p className="text-gray-600">{getMessage()}</p>
        </div>

        {showTrialForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company (Optional)
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Starting Trial...' : 'Start 7-Day Free Trial'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By starting your trial, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => window.open('https://sageaios.com/pricing', '_blank')}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium text-lg"
            >
              Purchase License - Starting at $500/month
            </button>
            
            <button
              onClick={() => {
                setError('');
                // Allow starting a new trial if previous expired
                window.location.reload();
              }}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 font-medium"
            >
              Start New Trial
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Questions? Contact us at{' '}
            <a href="mailto:support@sageaios.com" className="text-blue-600 hover:underline">
              support@sageaios.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialModal;
