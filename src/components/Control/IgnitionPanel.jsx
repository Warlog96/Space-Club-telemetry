import React, { useState, useEffect } from 'react';
import './IgnitionPanel.css';

const IgnitionPanel = () => {
    const [ignitionOn, setIgnitionOn] = useState(false);
    const [launchTime, setLaunchTime] = useState(null);
    const [missionTime, setMissionTime] = useState(0);
    const [activityLog, setActivityLog] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update real-time clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            if (launchTime) setMissionTime(Date.now() - launchTime);
        }, 1000);
        return () => clearInterval(timer);
    }, [launchTime]);

    const handleIgnitionToggle = () => {
        const newState = !ignitionOn;
        setIgnitionOn(newState);

        const newEntry = {
            timestamp: Date.now(),
            event: newState ? 'IGNITION ACTIVATED' : 'IGNITION DEACTIVATED',
            username: 'Admin'
        };
        setActivityLog(prev => [...prev, newEntry]);

        if (newState) {
            setLaunchTime(Date.now());
            setMissionTime(0);
        } else {
            setLaunchTime(null);
            setMissionTime(0);
        }
    };

    const downloadIgnitionLog = () => {
        if (activityLog.length === 0) return;
        const header = 'Timestamp,Event,User\n';
        const rows = activityLog.map(e =>
            `${new Date(e.timestamp).toISOString()},${e.event},${e.username}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ignition_log_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="classic-outset ignition-panel">
            <div className="panel-title-bar">
                <span>MANUAL IGNITION</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <span className="real-time-clock">{currentTime.toLocaleTimeString()}</span>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="status-section">
                <div className={`classic-inset status-indicator status-${ignitionOn ? 'ignited' : 'safe'}`}>
                    <div className="status-light"></div>
                    <span className="status-text">{ignitionOn ? 'IGNITED' : 'SAFE'}</span>
                </div>
            </div>

            {/* Mission Clock */}
            {launchTime && (
                <div style={{ textAlign: 'center', padding: '4px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#00ff00' }}>
                    T+ {formatTime(missionTime)}
                </div>
            )}

            {/* Main Ignition Button */}
            <div className="ignition-button-section">
                <button
                    className={`ignition-button ${ignitionOn ? 'on' : 'off'}`}
                    onClick={handleIgnitionToggle}
                >
                    <div className="button-icon">🚀</div>
                    <div className="button-text">
                        {ignitionOn ? 'IGNITION ON' : 'IGNITION OFF'}
                    </div>
                    <div className="button-subtext">
                        {ignitionOn ? 'Click to turn OFF' : 'Click to IGNITE'}
                    </div>
                </button>
            </div>

            {/* Activity Log */}
            <div className="activity-log-section">
                <div className="log-header">
                    <span style={{ fontWeight: 'bold' }}>Activity Log</span>
                    <button
                        onClick={downloadIgnitionLog}
                        disabled={activityLog.length === 0}
                    >
                        DOWNLOAD CSV
                    </button>
                </div>
                <div className="classic-inset log-entries">
                    {activityLog.length === 0 ? (
                        <div className="log-entry empty">No activity recorded</div>
                    ) : (
                        activityLog.slice(-10).reverse().map((entry, index) => (
                            <div key={index} className="log-entry">
                                <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                <span className="log-message">{entry.event}</span>
                                <span className="log-user">{entry.username}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default IgnitionPanel;
