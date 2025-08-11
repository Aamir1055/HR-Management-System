import React, { useEffect, useState } from 'react';

const TokenChecker: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<{
    hasToken: boolean;
    tokenPreview: string;
    tokenLength: number;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setTokenInfo({
        hasToken: true,
        tokenPreview: token.substring(0, 20) + '...',
        tokenLength: token.length
      });
    } else {
      setTokenInfo({
        hasToken: false,
        tokenPreview: 'No token found',
        tokenLength: 0
      });
    }
  }, []);

  const testAPI = async () => {
    const token = localStorage.getItem('token');
    console.log('Token being sent:', token ? `${token.substring(0, 20)}...` : 'No token');
    
    try {
      const response = await fetch('/api/advance-salary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.status === 401) {
        alert('Authentication failed - token might be invalid or expired');
      } else if (response.ok) {
        alert('API call successful!');
      } else {
        alert(`API call failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('API call error:', error);
      alert('Network error during API call');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid red', 
      padding: '10px',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <h3>Debug: Token Status</h3>
      {tokenInfo && (
        <div>
          <p><strong>Has Token:</strong> {tokenInfo.hasToken ? 'Yes' : 'No'}</p>
          <p><strong>Token Preview:</strong> {tokenInfo.tokenPreview}</p>
          <p><strong>Token Length:</strong> {tokenInfo.tokenLength}</p>
        </div>
      )}
      <button 
        onClick={testAPI}
        style={{
          background: 'blue',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Test API Call
      </button>
    </div>
  );
};

export default TokenChecker;
