import React, { useState } from 'react';
import { Shield, Smartphone, Check, Copy, Download, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface FirstLogin2FASetupProps {
  isOpen: boolean;
  qrCode: string;
  secret: string;
  backupCodes: string[];
  username: string;
  password: string;
  onComplete: (token: string, user: any) => void;
  onCancel: () => void;
}

export const FirstLogin2FASetup: React.FC<FirstLogin2FASetupProps> = ({ 
  isOpen, 
  qrCode, 
  secret, 
  backupCodes, 
  username, 
  password,
  onComplete, 
  onCancel 
}) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    alert('Secret copied to clipboard!');
  };

  const downloadBackupCodes = () => {
    const content = `Payroll System - 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! You can use them to access your account if you lose your authenticator device.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payroll-2fa-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const completeFirstLogin = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/auth/complete-first-login-2fa', { 
        username, 
        password, 
        token: verificationCode 
      });

      if (response.data.token && response.data.user) {
        setStep('complete');
        // Delay completion to show success message
        setTimeout(() => {
          onComplete(response.data.token, response.data.user);
        }, 2000);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error completing first login 2FA:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Setup completion failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome! Setup Two-Factor Authentication
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Security setup is required for your first login
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={step === 'complete'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Setup Step */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-500 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Security Required</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      For your security, two-factor authentication is required for all users. Please set it up now to continue.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 1: Scan QR Code
                </h3>
                <p className="text-gray-600 mb-6">
                  Use Google Authenticator or similar app to scan this QR code
                </p>
                
                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-6">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Can't scan? Enter manually:</h4>
                <div className="flex items-center justify-between bg-white rounded border p-3">
                  <code className="text-sm font-mono text-gray-800 break-all">{secret}</code>
                  <button
                    onClick={copySecret}
                    className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                    title="Copy secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📱 Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download Google Authenticator from your app store</li>
                  <li>Open the app and tap "+" to add an account</li>
                  <li>Choose "Scan QR code" and scan the code above</li>
                  <li>Or choose "Enter setup key" and paste the secret</li>
                  <li>Your app will generate a 6-digit code</li>
                </ol>
              </div>

              {/* Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-amber-900">🔑 Backup Codes</h4>
                    <button
                      onClick={downloadBackupCodes}
                      className="text-amber-700 hover:text-amber-900 text-sm flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </div>
                  <p className="text-sm text-amber-800 mb-3">
                    Save these codes! Use them if you lose your phone.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {backupCodes.map((code, index) => (
                      <code key={index} className="text-xs bg-white p-2 rounded text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                I've Added the Account - Next Step
              </button>
            </div>
          )}

          {/* Verify Step */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <Smartphone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 2: Verify Setup
                </h3>
                <p className="text-gray-600">
                  Enter the 6-digit code from your authenticator app to complete setup
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    setError('');
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('setup')}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={completeFirstLogin}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? 'Setting up...' : 'Complete Setup & Login'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  🎉 Setup Complete!
                </h3>
                <p className="text-gray-600">
                  Two-factor authentication has been enabled. Logging you in now...
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✅ What's Next:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Your account is now secure with 2FA</li>
                  <li>• Keep your authenticator app safe</li>
                  <li>• Save your backup codes in a secure location</li>
                </ul>
              </div>

              <div className="animate-pulse">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Logging you in...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
