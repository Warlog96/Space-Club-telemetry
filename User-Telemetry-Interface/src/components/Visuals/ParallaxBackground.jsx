import React from 'react';

const ParallaxBackground = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(to bottom, #000000, #0a0a20)',
            zIndex: -1
        }}>
            {/* Simple star effect or just background */}
        </div>
    );
};

export default ParallaxBackground;
