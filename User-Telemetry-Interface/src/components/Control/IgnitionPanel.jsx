import React, { useState, useEffect } from 'react';
import './IgnitionPanel.css';

const IgnitionPanel = ({ telemetryData }) => {
    const [ignitionEnabled, setIgnitionEnabled] = useState(false);
    const [ignitionStatus, setIgnitionStatus] = useState('SAFE'); // SAFE, ARMED, IGNITED
    const [missionTime, setMissionTime] = useState(0); // seconds since ignition
    const [countdownTime, setCountdownTime] = useState(10); // T-minus countdown
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [activityLog, setActivityLog] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update real-time clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Mission timer (T+)
    useEffect(() => {
        if (ignitionStatus === 'IGNITED') {
            const timer = setInterval(() => {
                setMissionTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [ignitionStatus]);

    // Countdown timer (T-)
    useEffect(() => {
        if (isCountingDown && countdownTime > 0) {
            const timer = setTimeout(() => {
                setCountdownTime(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (isCountingDown && countdownTime === 0) {
            handleIgnition();
        }
    }, [isCountingDown, countdownTime]);

    const addLogEntry = (message, type = 'info') => {
        const entry = {
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
            message,
            type
        };
        setActivityLog(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
    };

    const handleToggleIgnition = () => {
        if (!ignitionEnabled) {
            // Arming
            setIgnitionEnabled(true);
            setIgnitionStatus('ARMED');
            addLogEntry('Ignition system ARMED', 'warning');
        } else {
            // Disarming
            setIgnitionEnabled(false);
            setIgnitionStatus('SAFE');
            setIsCountingDown(false);
            setCountdownTime(10);
            addLogEntry('Ignition system DISARMED', 'info');
        }
    };

    const handleStartCountdown = () => {
        if (ignitionEnabled && ignitionStatus === 'ARMED') {
            setIsCountingDown(true);
            addLogEntry('Countdown sequence initiated', 'warning');
        }
    };

    const handleAbortCountdown = () => {
        setIsCountingDown(false);
        setCountdownTime(10);
        addLogEntry('Countdown ABORTED', 'error');
    };

    const handleIgnition = () => {
        setIgnitionStatus('IGNITED');
        setIsCountingDown(false);
        setMissionTime(0);
        addLogEntry('🚀 IGNITION! Liftoff confirmed', 'success');
    };

    const handleReset = () => {
        setIgnitionEnabled(false);
        setIgnitionStatus('SAFE');
        setIsCountingDown(false);
        setCountdownTime(10);
        setMissionTime(0);
        addLogEntry('System RESET', 'info');
    };

    const downloadCSV = () => {
        const headers = ['Timestamp', 'Time', 'Event', 'Type'];
        const rows = activityLog.map(entry => [
            entry.timestamp,
            entry.time,
            entry.message,
            entry.type
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ignition_log_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        addLogEntry('Activity log downloaded', 'info');
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="ignition-panel glass-panel">
            <div className="panel-header">
                <h3 className="glow-text">IGNITION CONTROL</h3>
                <div className="real-time-clock">
                    {currentTime.toLocaleTimeString()}
                </div>
            </div>

            {/* Status Indicator */}
            <div className="status-section">
                <div className={`status-indicator status-${ignitionStatus.toLowerCase()}`}>
                    <div className="status-light"></div>
                    <span className="status-text">{ignitionStatus}</span>
                </div>
            </div>

            {/* Main Controls */}
            <div className="controls-section">
                {/* Toggle Switch */}
                <div className="control-group">
                    <label>Ignition System</label>
                    <div className="toggle-container">
                        <button
                            className={`toggle-button ${ignitionEnabled ? 'enabled' : 'disabled'}`}
                            onClick={handleToggleIgnition}
                            disabled={ignitionStatus === 'IGNITED'}
                        >
                            <div className="toggle-slider"></div>
                            <span>{ignitionEnabled ? 'ARMED' : 'SAFE'}</span>
                        </button>
                    </div>
                </div>

                {/* Countdown Controls */}
                {ignitionEnabled && ignitionStatus !== 'IGNITED' && (
                    <div className="control-group">
                        <label>Launch Sequence</label>
                        <div className="countdown-controls">
                            {!isCountingDown ? (
                                <button
                                    className="action-button start-button"
                                    onClick={handleStartCountdown}
                                >
                                    START COUNTDOWN
                                </button>
                            ) : (
                                <button
                                    className="action-button abort-button"
                                    onClick={handleAbortCountdown}
                                >
                                    ABORT
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Reset Button */}
                {ignitionStatus === 'IGNITED' && (
                    <div className="control-group">
                        <button
                            className="action-button reset-button"
                            onClick={handleReset}
                        >
                            RESET SYSTEM
                        </button>
                    </div>
                )}
            </div>

            {/* Clocks Section */}
            <div className="clocks-section">
                {/* T-minus Countdown */}
                <div className="clock-display">
                    <div className="clock-label">T-MINUS</div>
                    <div className={`clock-value ${isCountingDown ? 'counting' : ''}`}>
                        {isCountingDown ? formatTime(countdownTime) : '--:--:--'}
                    </div>
                </div>

                {/* T+ Mission Time */}
                <div className="clock-display">
                    <div className="clock-label">T-PLUS</div>
                    <div className={`clock-value ${ignitionStatus === 'IGNITED' ? 'active' : ''}`}>
                        {ignitionStatus === 'IGNITED' ? formatTime(missionTime) : '--:--:--'}
                    </div>
                </div>
            </div>

            {/* Activity Log */}
            <div className="activity-log-section">
                <div className="log-header">
                    <h4>Activity Log</h4>
                    <button
                        className="download-csv-button"
                        onClick={downloadCSV}
                        disabled={activityLog.length === 0}
                    >
                        📥 DOWNLOAD CSV
                    </button>
                </div>
                <div className="log-entries">
                    {activityLog.length === 0 ? (
                        <div className="log-entry empty">No activity recorded</div>
                    ) : (
                        activityLog.map((entry, index) => (
                            <div key={index} className={`log-entry log-${entry.type}`}>
                                <span className="log-time">{entry.time}</span>
                                <span className="log-message">{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default IgnitionPanel;
