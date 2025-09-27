import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FirstLogin2FASetup } from '../components/Auth/FirstLogin2FASetup';

const FirstLogin2FASetupPage: React.FC = () => {
  const { requiresFirstLogin2FA, firstLogin2FAData, completeFirstLogin2FA, resetTwoFactor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!requiresFirstLogin2FA || !firstLogin2FAData) {
      navigate('/login', { replace: true });
    }
  }, [requiresFirstLogin2FA, firstLogin2FAData, navigate]);

  if (!requiresFirstLogin2FA || !firstLogin2FAData) return null;

  return (
    <FirstLogin2FASetup
      isOpen={true}
      qrCode={firstLogin2FAData.qrCode}
      secret={firstLogin2FAData.secret}
      backupCodes={firstLogin2FAData.backupCodes}
      username={firstLogin2FAData.username}
      password={firstLogin2FAData.password}
      onComplete={(token, user) => {
        completeFirstLogin2FA(token, user);
        navigate('/', { replace: true });
      }}
      onCancel={() => {
        resetTwoFactor();
        navigate('/login', { replace: true });
      }}
    />
  );
};

export default FirstLogin2FASetupPage;
