// Mock API endpoints for license management
// In production, these should be real backend endpoints

// Mock license validation endpoint
window.mockLicenseAPI = {
  async validateLicense(licenseKey, machineId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock trial license validation
    if (licenseKey && licenseKey.startsWith('TRIAL-')) {
      const trialData = JSON.parse(localStorage.getItem('nexus_trial_data') || '{}');
      const expiresAt = new Date(trialData.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      if (now > expiresAt) {
        return { valid: false, reason: 'trial_expired' };
      }
      
      const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
      return { valid: true, trialDaysLeft: daysLeft };
    }
    
    // Mock paid license validation
    if (licenseKey && licenseKey.startsWith('PAID-')) {
      return { valid: true, isPaid: true };
    }
    
    return { valid: false, reason: 'invalid_license' };
  },
  
  async startTrial(email, company, machineId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if email already used (simple mock)
    const usedEmails = JSON.parse(localStorage.getItem('nexus_used_emails') || '[]');
    if (usedEmails.includes(email)) {
      return { success: false, error: 'Email already used for trial' };
    }
    
    // Generate trial license
    const trialKey = `TRIAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Store trial data
    localStorage.setItem('nexus_trial_data', JSON.stringify({
      email,
      company,
      machineId,
      trialKey,
      expiresAt,
      startedAt: new Date().toISOString()
    }));
    
    // Mark email as used
    usedEmails.push(email);
    localStorage.setItem('nexus_used_emails', JSON.stringify(usedEmails));
    
    return {
      success: true,
      trialKey,
      expiresAt
    };
  }
};

// Override fetch for license API calls
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (url === '/api/license/validate') {
    const body = JSON.parse(options.body);
    return Promise.resolve({
      json: () => window.mockLicenseAPI.validateLicense(body.licenseKey, body.machineId)
    });
  }
  
  if (url === '/api/trial/start') {
    const body = JSON.parse(options.body);
    return Promise.resolve({
      json: () => window.mockLicenseAPI.startTrial(body.email, body.company, body.machineId)
    });
  }
  
  return originalFetch.apply(this, arguments);
};
