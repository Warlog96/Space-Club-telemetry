import React, { useRef, useMemo, useEffect, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

// ─── Error Boundary to catch Three.js / GLB crashes ──────────────────────────
class Model3DErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[RocketVisualizer] 3D Render Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: '#1a0000', color: '#ff4444',
                    fontFamily: 'monospace', fontSize: '0.85rem',
                    textAlign: 'center', padding: '1rem'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>3D Renderer Error</div>
                    <div style={{ color: '#ff8888', fontSize: '0.75rem', maxWidth: '90%', wordBreak: 'break-word' }}>
                        {this.state.error?.message || 'Unknown error loading 3D model'}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: '0.75rem', padding: '4px 12px',
                            background: '#333', color: '#fff', border: '1px solid #666',
                            cursor: 'pointer', fontSize: '0.75rem'
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── Loading fallback for Suspense ────────────────────────────────────────────
const LoadingFallback = () => (
    <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0f1419', color: '#66fcf1',
        fontFamily: 'monospace', fontSize: '0.85rem'
    }}>
        <div style={{
            width: '40px', height: '40px', border: '3px solid #333',
            borderTopColor: '#66fcf1', borderRadius: '50%',
            animation: 'spin 1s linear infinite', marginBottom: '0.75rem'
        }} />
        <div>Loading 3D Model...</div>
        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.3rem' }}>/models/rocket.glb</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// GLB Rocket Model — uses useGLTF hook at component level (valid), mutates via useFrame (no re-render)
function RealisticRocket({ pitch, roll, yaw }) {
    const groupRef = useRef();
    const { scene } = useGLTF('/models/rocket.glb');

    // useFrame mutates the ref directly — zero React re-render cost at 60fps
    useFrame((state, delta) => {
        if (groupRef.current) {
            // Apply Linear Interpolation (LERP) to gracefully glide between network batched frames.
            // This totally hides any 3 Hz Firebase stuttering, making it look incredibly smooth!
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, pitch, delta * 12.0);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, yaw, delta * 12.0);
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, roll, delta * 12.0);
        }
    });

    return (
        <group ref={groupRef}>
            <Center>
                <primitive object={scene} scale={4.5} rotation={[0, 0, -Math.PI / 2]} />
            </Center>
        </group>
    );
}


// 6-Axis Coordinate System — static, never changes: memoize completely
const CoordinateAxes = React.memo(() => {
    const axisLength = 10;
    const axisRadius = 0.05;
    const arrowLength = 0.6;
    const arrowRadius = 0.15;
    const labelDistance = axisLength + 0.8;

    const createAxis = (direction, color, label, isDimmed = false) => {
        const opacity = isDimmed ? 0.4 : 0.85;
        const position = direction.map(d => d * (axisLength / 2));
        const arrowPosition = direction.map(d => d * (axisLength + arrowLength / 2));
        const labelPosition = direction.map(d => d * labelDistance);

        let rotation = [0, 0, 0];
        if (direction[0] !== 0) rotation = [0, 0, Math.PI / 2];
        if (direction[2] !== 0) rotation = [Math.PI / 2, 0, 0];

        return (
            <group key={label}>
                <mesh position={position} rotation={rotation}>
                    <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={opacity} />
                </mesh>
                <mesh position={arrowPosition} rotation={rotation}>
                    <coneGeometry args={[arrowRadius, arrowLength, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={opacity} />
                </mesh>
                <Text
                    position={labelPosition}
                    fontSize={0.6}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                >
                    {label}
                </Text>
            </group>
        );
    };

    return (
        <group>
            {createAxis([1, 0, 0], '#ff3333', '+X', false)}
            {createAxis([-1, 0, 0], '#ff3333', '-X', true)}
            {createAxis([0, 1, 0], '#33ff33', '+Y', false)}
            {createAxis([0, -1, 0], '#33ff33', '-Y', true)}
            {createAxis([0, 0, 1], '#3333ff', '+Z', false)}
            {createAxis([0, 0, -1], '#3333ff', '-Z', true)}
        </group>
    );
});
CoordinateAxes.displayName = 'CoordinateAxes';


// Particle system for thrust effects
function ThrustParticles({ isActive }) {
    const particlesRef = useRef();
    const particleCount = 250;

    const particles = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.35;
            positions[i * 3 + 1] = -5.1;  // Adjusted for recentered rocket
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;

            velocities[i * 3] = (Math.random() - 0.5) * 1.5;
            velocities[i * 3 + 1] = -3.0 - Math.random() * 3.0;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

            lifetimes[i] = Math.random();
        }

        return { positions, velocities, lifetimes };
    }, []);

    useFrame((state, delta) => {
        if (!particlesRef.current || !isActive) return;

        const positions = particlesRef.current.geometry.attributes.position.array;
        const velocities = particles.velocities;
        const lifetimes = particles.lifetimes;

        for (let i = 0; i < particleCount; i++) {
            lifetimes[i] -= delta * 1.8;

            if (lifetimes[i] <= 0) {
                positions[i * 3] = (Math.random() - 0.5) * 0.35;
                positions[i * 3 + 1] = -5.1;  // Adjusted for recentered rocket
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
                lifetimes[i] = 1;
            } else {
                positions[i * 3] += velocities[i * 3] * delta;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
            }
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    if (!isActive) return null;

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={particles.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.28}
                color="#ff6600"
                transparent
                opacity={0.92}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}

// Dynamic background — updates scene.background inside the render loop, no React re-renders
const DynamicBackground = React.memo(({ altitude }) => {
    const { scene } = useThree();
    const altBucket = useRef(-1);

    useFrame(() => {
        const bucket = Math.floor(altitude / 100);
        if (bucket === altBucket.current) return; // skip if same bucket
        altBucket.current = bucket;

        const t = Math.min(altitude / 3000, 1);
        const skyColor = new THREE.Color();
        if (t < 0.33) {
            skyColor.lerpColors(new THREE.Color(0x0f1419), new THREE.Color(0x0a0e14), t * 3);
        } else if (t < 0.67) {
            skyColor.lerpColors(new THREE.Color(0x0a0e14), new THREE.Color(0x050508), (t - 0.33) * 3);
        } else {
            skyColor.lerpColors(new THREE.Color(0x050508), new THREE.Color(0x000000), (t - 0.67) * 3);
        }
        scene.background = skyColor;
    });

    return null;
});
DynamicBackground.displayName = 'DynamicBackground';

// Stars — memoized, only re-renders when opacity bucket changes
const Stars = React.memo(({ altitude }) => {
    const starCount = 1500; // reduced from 2500, imperceptible visually
    const starPositions = useMemo(() => {
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 250;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
        }
        return positions;
    }, []);

    const starOpacity = Math.max(0, Math.min(1, (altitude - 1000) / 2000));
    if (starOpacity === 0) return null;

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={starCount}
                    array={starPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.5}
                color="#ffffff"
                transparent
                opacity={starOpacity}
                sizeAttenuation={true}
            />
        </points>
    );
});
Stars.displayName = 'Stars';

// Main 3D scene — uses server-computed orientation directly (no client-side gyro integration lag)
function Scene({ telemetryData }) {
    // Server already computed roll/pitch/yaw via atan2 — use them directly
    const pitch = (telemetryData?.imu?.pitch || 0) * (Math.PI / 180);
    const roll = (telemetryData?.imu?.roll || 0) * (Math.PI / 180);
    const yaw = (telemetryData?.imu?.yaw || 0) * (Math.PI / 180);

    // Use server's canonical altitude_m (prefers BMP280, falls back to GPS)
    const altitude = telemetryData?.altitude_m ?? telemetryData?.bmp280?.altitude_m ?? 0;
    const isThrusting = telemetryData?.ignition?.status !== 'SAFE';

    return (
        <>
            <DynamicBackground altitude={altitude} />
            <Stars altitude={altitude} />

            {/* Simplified lighting — no shadow maps = significant GPU saving */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[25, 30, 20]} intensity={2.0} />
            <pointLight position={[-18, 10, -12]} intensity={0.6} color="#005fb8" />
            <hemisphereLight args={['#87ceeb', '#2c3e50', 0.5]} />
            <pointLight position={[0, 0, -15]} intensity={0.4} color="#4a90e2" />

            <CoordinateAxes />

            {/* RealisticRocket handles useGLTF + useFrame internally */}
            <RealisticRocket pitch={pitch} roll={roll} yaw={yaw} />

            <ThrustParticles isActive={isThrusting} />

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={false}
                minDistance={15}
                maxDistance={50}
                target={[0, 0, 0]}
            />
            <PerspectiveCamera makeDefault position={[20, 12, 20]} fov={45} />
        </>
    );
}

// Altitude HUD
function AltitudeHUD({ altitude, gpsAlt }) {
    return (
        <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            fontFamily: 'var(--font-main)',
            fontSize: '0.85rem',
            background: '#ffffff',
            padding: '0.8rem 1rem',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
            <div style={{ marginBottom: '0.3rem', color: '#005fb8', fontWeight: '600', letterSpacing: '1px', fontSize: '0.75rem' }}>
                ALTITUDE
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', fontFamily: 'var(--font-mono)' }}>
                GPS: {gpsAlt.toFixed(1)}m
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                BMP: {altitude.toFixed(1)}m
            </div>
        </div>
    );
}

// Main component
const RocketVisualizer = ({ data }) => {
    const altitude = data?.altitude_m ?? data?.bmp280?.altitude_m ?? 0;
    const gpsAlt = data?.gps?.altitude_m || 0;

    return (
        <div className="glass-panel" style={{
            width: '100%', height: '100%',
            padding: 0, overflow: 'hidden', position: 'relative'
        }}>
            <Model3DErrorBoundary>
                <Canvas
                    shadows={false}          // no shadow maps = big GPU win
                    dpr={[1, 1.5]}           // was [1,2]: saves ~25% GPU on hi-DPI screens
                    gl={{
                        antialias: true,
                        alpha: false,
                        powerPreference: 'high-performance',
                        failIfMajorPerformanceCaveat: false,
                        stencil: false,      // not needed, saves GPU memory
                        depth: true,
                    }}
                    frameloop="always"      // particles need a continuous render loop — demand caused glitching
                >
                    <React.Suspense fallback={null}>
                        <Scene telemetryData={data} />
                    </React.Suspense>
                </Canvas>
            </Model3DErrorBoundary>
            <AltitudeHUD altitude={altitude} gpsAlt={gpsAlt} />
        </div>
    );
};

export default RocketVisualizer;

// Preload the GLB using a standard browser preload (no hook required)
if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = '/models/rocket.glb';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
}
