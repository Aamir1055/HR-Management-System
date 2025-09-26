// React application entry point for PayRoll Management System
// Initializes the root React component with StrictMode for development checks
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
