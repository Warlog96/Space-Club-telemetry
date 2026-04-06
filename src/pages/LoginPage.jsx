import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store token in localStorage
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUsername', data.username);

                // Call success callback
                onLoginSuccess(data.username);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Connection error. Please ensure the backend server is running.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background" style={{ background: 'var(--bg-color)', minHeight: '100vh' }}></div>

            <div className="classic-outset login-card">
                <div className="panel-title-bar">
                    <span>PROJECT EKLAVYA - ADMIN LOGIN</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                        <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                        <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                        <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                    </div>
                </div>

                <div className="login-header" style={{ padding: '16px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '16px', margin: '0' }}>ADMIN TELEMETRY INTERFACE</h2>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">ADMIN ID</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter Admin ID"
                            required
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">PASSWORD</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Password"
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'AUTHENTICATING...' : 'ACCESS CONTROL PANEL'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Authorized Personnel Only</p>
                    <p className="version">v1.0.0</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
