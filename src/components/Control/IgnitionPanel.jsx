import React, { useState, useEffect } from 'react';
import './IgnitionPanel.css';

const IgnitionPanel = () => {
    const [ignitionOn, setIgnitionOn] = useState(false);
    const [missionTime, setMissionTime] = useState(0);
    const [activityLog, setActivityLog] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // Update real-time clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch ignition status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/ignition/status');
                if (response.ok) {
                    const data = await response.json();
                    setIgnitionOn(data.ignitionOn);
                    setMissionTime(data.missionElapsedTime || 0);
                    setActivityLog(data.activityLog || []);
                }
            } catch (error) {
                console.error('Error fetching ignition status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleIgnitionToggle = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/ignition/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ignite: !ignitionOn })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Ignition toggle:', data.message);
            } else {
                const errorData = await response.json();
                console.error('Failed to toggle ignition:', errorData);
                alert(`Failed to toggle ignition: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error toggling ignition:', error);
            alert('Network error: Could not connect to server');
        } finally {
            setLoading(false);
        }
    };

    const downloadIgnitionLog = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/ignition/log/download');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ignition_log_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading ignition log:', error);
        }
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

            {/* Main Ignition Button */}
            <div className="ignition-button-section">
                <button
                    className={`ignition-button ${ignitionOn ? 'on' : 'off'}`}
                    onClick={handleIgnitionToggle}
                    disabled={loading}
                >
                    <div className="button-icon">🚀</div>
                    <div className="button-text">
                        {loading ? 'PROCESSING...' : (ignitionOn ? 'IGNITION ON' : 'IGNITION OFF')}
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
