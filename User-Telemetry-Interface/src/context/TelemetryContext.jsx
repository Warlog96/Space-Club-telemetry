import React, { createContext, useContext, useEffect, useState } from 'react';
import hybridDataService from '../services/HybridDataService';

const TelemetryContext = createContext();

export const TelemetryProvider = ({ children }) => {
    const [packet, setPacket] = useState(null);
    const [history, setHistory] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState({
        websocket: false,
        firebase: false,
        isConnected: false,
        dataSource: 'Connecting...'
    });

    useEffect(() => {
        // Initialize the hybrid data service
        hybridDataService.initialize();

        // Subscribe to data updates
        const unsubscribe = hybridDataService.subscribe((update) => {
            setPacket(update.packet);
            setHistory(update.history);
            setConnectionStatus(update.status);
        });

        // Cleanup on unmount
        return () => {
            unsubscribe();
            hybridDataService.destroy();
        };
    }, []);

    const value = {
        packet: packet || {},
        history,
        isConnected: connectionStatus.isConnected,
        connectionStatus
    };

    return (
        <TelemetryContext.Provider value={value}>
            {children}
        </TelemetryContext.Provider>
    );
};

export const useTelemetry = () => {
    const context = useContext(TelemetryContext);
    if (!context) {
        throw new Error('useTelemetry must be used within TelemetryProvider');
    }
    return context;
};
