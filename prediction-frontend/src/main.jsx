// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// Use named import for the provider
import { RoundProvider } from './contexts/RoundContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RoundProvider> {/* Use the imported named provider */}
      <App />
    </RoundProvider>
  </React.StrictMode>,
);