import React, { useState } from 'react';

const LandingPage = ({ onProceed, username, onLogout }) => {
    const [name, setName] = useState('');

    const handleProceed = (e) => {
        e.preventDefault();
        if (name.trim()) {
            localStorage.setItem('project_eklavya_pilot', name);
            onProceed(name);
        }
    };

    return (
        <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="classic-outset" style={{ width: '400px' }}>
                <div className="panel-title-bar">
                    <span>PROJECT EKLAVYA - TELEMETRY INTERFACE</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                        <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                        <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                        <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                    </div>
                </div>

                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <div>Logged in as: <strong>{username}</strong></div>
                        <button onClick={onLogout} style={{ color: '#ff0000', fontWeight: 'bold' }}>Logout</button>
                    </div>

                    <div className="classic-inset" style={{ padding: '16px', background: '#ffffff', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                            <div style={{ fontSize: '32px' }}>🖥️</div>
                            <div>
                                <h1 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>Welcome to Project Eklavya</h1>
                                <p style={{ fontSize: '12px', margin: '0' }}>Please enter your name to initiate the mission control sequence.</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleProceed} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px' }}>Mission Controller Name:</label>
                            <input
                                type="text"
                                className="classic-inset"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: '100%', padding: '4px', background: '#ffffff', color: '#000000' }}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                            <button type="button" onClick={onLogout} style={{ minWidth: '80px' }}>Cancel</button>
                            <button type="submit" disabled={!name.trim()} style={{ minWidth: '80px', fontWeight: 'bold' }}>OK</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
