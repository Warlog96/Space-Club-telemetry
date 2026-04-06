import React from 'react';
import Dashboard from './pages/Dashboard';
import { TelemetryProvider } from './context/TelemetryContext';

function App() {
  return (
    <TelemetryProvider>
      <Dashboard
        pilot="Commander"
        username="Admin"
        isPublicView={false}
      />
    </TelemetryProvider>
  );
}

export default App;
