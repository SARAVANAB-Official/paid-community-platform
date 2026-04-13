import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { initDb } from './db';
import './index.css';

// Initialize the database, but render the app regardless
// If Firebase fails to init, the app still loads and shows errors in UI
initDb().catch((err) => {
  console.error('⚠️ Firebase init error:', err);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
