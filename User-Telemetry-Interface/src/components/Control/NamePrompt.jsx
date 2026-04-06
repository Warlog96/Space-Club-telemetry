import React, { useState } from 'react';

const NamePrompt = ({ onNameSubmit }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onNameSubmit(name);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10
        }}>
            <h2 style={{ marginBottom: '1rem' }}>Enter Commander Name</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                        padding: '10px',
                        fontSize: '1rem',
                        borderRadius: '5px',
                        border: 'none',
                        marginRight: '10px'
                    }}
                    placeholder="Your Name"
                />
                <button
                    type="submit"
                    style={{
                        padding: '10px 20px',
                        fontSize: '1rem',
                        borderRadius: '5px',
                        border: 'none',
                        background: '#00d0ff',
                        color: 'black',
                        cursor: 'pointer'
                    }}
                >
                    Initialize
                </button>
            </form>
        </div>
    );
};

export default NamePrompt;
