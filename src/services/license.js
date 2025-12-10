class LicenseManager {
  constructor() {
    this.licenseKey = localStorage.getItem('nexus_license_key');
    this.trialExpires = localStorage.getItem('nexus_trial_expires');
    this.lastCheck = localStorage.getItem('nexus_last_check');
  }

  async validateLicense() {
    // Check every 24 hours or on startup
    const now = Date.now();
    const lastCheck = parseInt(this.lastCheck) || 0;
    const dayInMs = 24 * 60 * 60 * 1000;

    if (now - lastCheck < dayInMs && this.licenseKey) {
      return this.isTrialValid();
    }

    if (!this.licenseKey) {
      return { valid: false, reason: 'no_license' };
    }

    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: this.licenseKey,
          machineId: this.getMachineId(),
          appVersion: '1.0.0'
        })
      });

      const result = await response.json();
      localStorage.setItem('nexus_last_check', now.toString());

      if (result.valid) {
        if (result.trialDaysLeft !== undefined) {
          const expiresAt = new Date(Date.now() + (result.trialDaysLeft * dayInMs));
          localStorage.setItem('nexus_trial_expires', expiresAt.toISOString());
        }
        return { valid: true, ...result };
      } else {
        return { valid: false, reason: 'invalid_license' };
      }
    } catch (error) {
      console.warn('License validation failed, checking offline grace period');
      return this.checkOfflineGrace();
    }
  }

  async startTrial(email, company = '') {
    try {
      const response = await fetch('/api/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company,
          machineId: this.getMachineId()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('nexus_license_key', result.trialKey);
        localStorage.setItem('nexus_trial_expires', result.expiresAt);
        localStorage.setItem('nexus_last_check', Date.now().toString());
        
        this.licenseKey = result.trialKey;
        this.trialExpires = result.expiresAt;
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  isTrialValid() {
    if (!this.trialExpires) {
      return { valid: false, reason: 'no_trial' };
    }

    const expiresAt = new Date(this.trialExpires);
    const now = new Date();
    
    if (now > expiresAt) {
      return { valid: false, reason: 'trial_expired' };
    }

    const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    return { valid: true, trialDaysLeft: daysLeft };
  }

  checkOfflineGrace() {
    // Allow 48 hours offline grace period
    const lastCheck = parseInt(this.lastCheck) || 0;
    const graceHours = 48;
    const gracePeriod = graceHours * 60 * 60 * 1000;
    
    if (Date.now() - lastCheck < gracePeriod) {
      return this.isTrialValid();
    }
    
    return { valid: false, reason: 'offline_expired' };
  }

  getMachineId() {
    let machineId = localStorage.getItem('nexus_machine_id');
    
    if (!machineId) {
      // Create browser fingerprint
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Nexus AI fingerprint', 2, 2);
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');
      
      machineId = btoa(fingerprint).substring(0, 32);
      localStorage.setItem('nexus_machine_id', machineId);
    }
    
    return machineId;
  }

  getTrialDaysLeft() {
    const result = this.isTrialValid();
    return result.valid ? result.trialDaysLeft : 0;
  }

  clearLicense() {
    localStorage.removeItem('nexus_license_key');
    localStorage.removeItem('nexus_trial_expires');
    localStorage.removeItem('nexus_last_check');
    this.licenseKey = null;
    this.trialExpires = null;
  }
}

export default LicenseManager;
