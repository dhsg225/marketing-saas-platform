import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { SettingsProvider } from './contexts/SettingsContext';
import AppContent from './components/AppContent';
import './App.css';

function App() {
  return (
    <UserProvider>
      <SettingsProvider>
        <Router>
          <AppContent />
        </Router>
      </SettingsProvider>
    </UserProvider>
  );
}

export default App;// Trigger deployment - 1761187510
