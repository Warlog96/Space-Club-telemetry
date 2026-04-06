import React, { useState, useEffect } from 'react';
import './IgnitionPanel.css';

const IgnitionStatusDisplay = () => {
    const [ignitionStatus, setIgnitionStatus] = useState(false);
    const [launchTime, setLaunchTime] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activityLog, setActivityLog] = useState([]);

    // Fetch ignition status from backend
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/ignition/status');
                if (response.ok) {
                    const data = await response.json();
                    setIgnitionStatus(data.ignitionOn);
                    setLaunchTime(data.launchTime);
                    setActivityLog(data.activityLog || []);
                }
            } catch (error) {
                console.error('Error fetching ignition status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 1000); // Update every second

        return () => clearInterval(interval);
    }, []);

    // Update current time every 100ms for smooth countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 100);

        return () => clearInterval(timer);
    }, []);

    // Calculate time difference
    const getTimeDifference = () => {
        if (!launchTime) return { display: 'T-00:00:00.0', isMinus: true };

        const diff = currentTime - launchTime;
        const absDiff = Math.abs(diff);
        const isMinus = diff < 0;

        const hours = Math.floor(absDiff / 3600000);
        const minutes = Math.floor((absDiff % 3600000) / 60000);
        const seconds = Math.floor((absDiff % 60000) / 1000);
        const tenths = Math.floor((absDiff % 1000) / 100);

        const display = `${isMinus ? 'T-' : 'T+'}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;

        return { display, isMinus };
    };

    const { display, isMinus } = getTimeDifference();

    return (
        <div className="ignition-panel glass-panel" style={{ opacity: 0.9 }}>
            <div className="panel-header">
                <h2 className="glow-text">🚀 IGNITION STATUS</h2>
                <div className="status-badge" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                    READ-ONLY
                </div>
            </div>

            {/* Status Indicator */}
            <div className="status-section">
                <div className="status-label">IGNITION STATUS</div>
                <div className={`status-indicator ${ignitionStatus ? 'active' : 'inactive'}`}>
                    <div className="status-light"></div>
                    <span className="status-text">{ignitionStatus ? 'ARMED' : 'SAFE'}</span>
                </div>
            </div>

            {/* Countdown Clocks */}
            <div className="countdown-section">
                <div className="countdown-display">
                    <div className="countdown-label">MISSION CLOCK</div>
                    <div className={`countdown-time ${isMinus ? 'countdown' : 'countup'}`}>
                        {display}
                    </div>
                </div>
            </div>

            {/* Activity Log (Last 5 entries) */}
            <div className="activity-section">
                <div className="activity-header">
                    <span>RECENT ACTIVITY</span>
                </div>
                <div className="activity-log" style={{ maxHeight: '120px' }}>
                    {activityLog.length === 0 ? (
                        <div className="log-entry" style={{ opacity: 0.5 }}>
                            No activity recorded
                        </div>
                    ) : (
                        activityLog.slice(-5).reverse().map((entry, index) => (
                            <div key={index} className="log-entry">
                                <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                <span className="log-message">{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default IgnitionStatusDisplay;
