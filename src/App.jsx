import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import { TelemetryProvider } from './context/TelemetryContext';
import ParallaxBackground from './components/Visuals/ParallaxBackground';
import NamePrompt from './components/Control/NamePrompt';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [pilot, setPilot] = useState('Commander');
  const [username, setUsername] = useState('');

  // Check if accessing public view
  const isPublicView = window.location.search.includes('public') || window.location.hash.includes('public');

  // Check for existing token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('adminToken');
      const savedUsername = localStorage.getItem('adminUsername');

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
          setUsername(savedUsername || 'Admin');
        } else {
          // Token invalid, clear storage
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const handleLoginSuccess = (user) => {
    setUsername(user);
    setIsAuthenticated(true);
    setView('dashboard');
    setPilot(user || 'Commander');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    setIsAuthenticated(false);
    setView('landing');
    setPilot('');
  };

  const handleProceed = (name) => {
    setPilot(name);
    setView('dashboard');
  };



  // If accessing public view, show it without authentication
  if (isPublicView) {
    return (
      <TelemetryProvider>
        {!pilot ? (
          <>
            <ParallaxBackground />
            <NamePrompt onNameSubmit={(name) => setPilot(name)} />
          </>
        ) : (
          <Dashboard isPublicView={true} commanderName={pilot} />
        )}
      </TelemetryProvider>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--highlight)'
      }}>
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚀</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <ParallaxBackground />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  // Show landing page or dashboard based on view
  return (
    <>
      {view === 'landing' && <ParallaxBackground />}

      {view === 'landing' && (
        <LandingPage
          onProceed={handleProceed}
          username={username}
          onLogout={handleLogout}
        />
      )}
      {view === 'dashboard' && (
        <TelemetryProvider>
          <Dashboard
            pilot={pilot}
            username={username}
            onLogout={handleLogout}
            isPublicView={false}
          />
        </TelemetryProvider>
      )}
    </>
  );
}

export default App;
