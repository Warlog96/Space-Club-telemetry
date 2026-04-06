import React, { useState } from 'react';
import ParallaxBackground from './components/Visuals/ParallaxBackground';
import NamePrompt from './components/Control/NamePrompt';
import Dashboard from '../../src/pages/Dashboard';
import { TelemetryProvider } from '../../src/context/TelemetryContext';

function App() {
    const [userName, setUserName] = useState('');
    const [isNameEntered, setIsNameEntered] = useState(false);

    const handleNameSubmit = (name) => {
        setUserName(name);
        setIsNameEntered(true);
    };

    // Show name entry screen with parallax background
    if (!isNameEntered) {
        return (
            <>
                <ParallaxBackground />
                <NamePrompt onNameSubmit={handleNameSubmit} />
            </>
        );
    }

    // Show dashboard with telemetry context
    return (
        <TelemetryProvider>
            <Dashboard isPublicView={true} commanderName={userName} />
        </TelemetryProvider>
    );
}

export default App;
