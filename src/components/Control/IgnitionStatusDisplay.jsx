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
        if (!launchTime) return { display: 'T+ --:--:--', isMinus: false };

        const diff = currentTime - launchTime;
        const absDiff = Math.abs(diff);

        const hours = Math.floor(absDiff / 3600000);
        const minutes = Math.floor((absDiff % 3600000) / 60000);
        const seconds = Math.floor((absDiff % 60000) / 1000);

        const display = `T+ ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        return { display, isMinus: false };
    };

    const { display } = getTimeDifference();

    return (
        <div className="classic-outset ignition-panel">
            <div className="panel-title-bar">
                <span>🚀 IGNITION STATUS</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', padding: '0 4px', background: 'var(--bg-color)', color: '#000000', border: '1px solid var(--border-dark)' }}>
                        READ-ONLY
                    </div>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="status-section">
                <div className="status-label" style={{ fontWeight: 'bold', marginBottom: '4px' }}>IGNITION STATUS</div>
                <div className={`classic-inset status-indicator status-${ignitionStatus ? 'ignited' : 'safe'}`}>
                    <div className="status-light"></div>
                    <span className="status-text">{ignitionStatus ? 'IGNITED' : 'SAFE'}</span>
                </div>
            </div>

            {/* Mission Clock */}
            <div className="countdown-section" style={{ margin: '8px 0', textAlign: 'center' }}>
                <div className="classic-inset countdown-display" style={{ background: '#000000', color: ignitionStatus ? '#00ff00' : '#808080', padding: '8px' }}>
                    <div className="countdown-label" style={{ fontSize: '10px', color: '#c0c0c0', marginBottom: '4px' }}>MISSION CLOCK</div>
                    <div className="countdown-time" style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                        {display}
                    </div>
                </div>
            </div>

            {/* Activity Log (Last 5 entries) */}
            <div className="activity-section">
                <div className="activity-header" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    <span>RECENT ACTIVITY</span>
                </div>
                <div className="classic-inset activity-log" style={{ maxHeight: '120px', overflowY: 'auto', background: '#ffffff', padding: '4px' }}>
                    {activityLog.length === 0 ? (
                        <div className="log-entry" style={{ color: '#808080' }}>
                            No activity recorded
                        </div>
                    ) : (
                        activityLog.slice(-5).reverse().map((entry, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', fontSize: '11px', padding: '2px 0', borderBottom: '1px solid var(--border-light-inner)' }}>
                                <span style={{ color: '#000080', fontFamily: 'var(--font-mono)' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                <span style={{ color: '#000000' }}>{entry.event}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default IgnitionStatusDisplay;
