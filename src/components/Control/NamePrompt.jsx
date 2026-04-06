import React, { useState } from 'react';

const NamePrompt = ({ onNameSubmit }) => {
    const [name, setName] = useState('');
    const [exiting, setExiting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            setExiting(true);
            setTimeout(() => {
                onNameSubmit(name);
            }, 800); // Wait for animation
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                transition: 'opacity 0.8s ease',
                opacity: exiting ? 0 : 1,
                pointerEvents: exiting ? 'none' : 'auto',
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '40px',
                    background: 'rgba(20, 30, 50, 0.6)',
                    border: '1px solid rgba(100, 200, 255, 0.3)',
                    borderRadius: '15px',
                    boxShadow: '0 0 30px rgba(0, 150, 255, 0.2)',
                    transform: exiting ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.8s ease',
                }}
            >
                <h2 style={{
                    color: '#00d0ff',
                    fontFamily: '"Segoe UI", sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    margin: 0,
                    textShadow: '0 0 10px rgba(0, 208, 255, 0.5)'
                }}>
                    Identify Yourself
                </h2>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ENTER DESIGNATION"
                    autoFocus
                    style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: 'none',
                        borderBottom: '2px solid rgba(0, 208, 255, 0.5)',
                        padding: '10px 20px',
                        color: 'white',
                        fontSize: '1.2rem',
                        textAlign: 'center',
                        outline: 'none',
                        width: '300px',
                        letterSpacing: '1px'
                    }}
                />

                <button
                    type="submit"
                    style={{
                        padding: '10px 30px',
                        background: 'rgba(0, 208, 255, 0.1)',
                        border: '1px solid rgba(0, 208, 255, 0.5)',
                        color: '#00d0ff',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseOver={(e) => {
                        e.target.style.background = 'rgba(0, 208, 255, 0.3)';
                        e.target.style.boxShadow = '0 0 15px rgba(0, 208, 255, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.background = 'rgba(0, 208, 255, 0.1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    Initialize
                </button>
            </form>
        </div>
    );
};

export default NamePrompt;
