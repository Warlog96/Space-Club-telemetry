import React, { useEffect, useRef } from 'react';

const Custom3DViewer = ({ data }) => {
    const iframeRef = useRef(null);

    // Extract orientation data (roll, pitch, yaw are now calculated by backend)
    // These are already in degrees, no conversion needed
    const roll = data?.imu?.roll || 0;
    const pitch = data?.imu?.pitch || 0;
    const yaw = data?.imu?.yaw || 0;

    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            // Send message to Iframe
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_TELEM',
                payload: { roll, pitch, yaw }
            }, '*');
        }
    }, [roll, pitch, yaw]);

    return (
        <div className="glass-panel" style={{ width: '100%', height: '100%', padding: 0, overflow: 'hidden', position: 'relative' }}>
            <iframe
                ref={iframeRef}
                src="/rocket_viewer.html"
                title="3D Rocket"
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
            />
            {/* Overlay Data for debugging */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, pointerEvents: 'none', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                IFRAME LINKED
            </div>
        </div>
    );
};

export default Custom3DViewer;
