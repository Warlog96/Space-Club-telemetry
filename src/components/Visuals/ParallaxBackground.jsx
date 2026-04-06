import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';

function StarField({ mouseX, mouseY }) {
    const meshRef = useRef();

    useFrame((state) => {
        if (!meshRef.current) return;

        // Smooth camera movement based on mouse position
        // Lerp towards target position for "heavy/smooth" feel
        const targetX = mouseX.get() * 0.5; // Reduced intensity for 3D
        const targetY = mouseY.get() * 0.5;

        state.camera.position.x += (targetX - state.camera.position.x) * 0.05;
        state.camera.position.y += (targetY - state.camera.position.y) * 0.05;
        state.camera.lookAt(0, 0, 0);
    });

    return (
        <group ref={meshRef}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Float speed={1} rotationIntensity={1} floatIntensity={2}>
                <points>
                    <sphereGeometry args={[10, 32, 32]} />
                    <pointsMaterial size={0.02} color="#00d0ff" opacity={0.5} transparent />
                </points>
            </Float>
        </group>
    );
}

const ImageLayer = ({ src, speed, x, y, scale = 1, opacity = 1 }) => {
    const moveX = useTransform(x, [-1, 1], [speed * 50, -speed * 50]);
    const moveY = useTransform(y, [-1, 1], [speed * 30, -speed * 30]);

    return (
        <motion.div
            style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                x: moveX,
                y: moveY,
                scale: scale,
                opacity: opacity,
                zIndex: 1
            }}
        />
    );
}

const ParallaxBackground = () => {
    // Mouse motion values for smooth interpolation
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring animation for the mouse values
    const springConfig = { damping: 25, stiffness: 150 };
    const smoothX = useSpring(mouseX, springConfig);
    const smoothY = useSpring(mouseY, springConfig);

    const handleMouseMove = (e) => {
        // Normalize -1 to 1
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1; // Not inverted for R3F logic consistency check

        mouseX.set(x);
        // Invert Y for visual feel (up is up)
        mouseY.set(y);
    };

    // Configuration for Optional Image Layers
    // These will look for public/backgrounds/layer1.png etc
    // If files are missing, they simply won't show (transparent), 
    // leaving the cool StarField visible.
    const imageLayers = [
        { id: 1, src: '/backgrounds/layer1.png', speed: 1.5, scale: 1.1, opacity: 0.8 }, // Back
        { id: 2, src: '/backgrounds/layer2.png', speed: 3.0, scale: 1.2, opacity: 0.9 }, // Mid
        { id: 3, src: '/backgrounds/layer3.png', speed: 4.5, scale: 1.3, opacity: 1.0 }, // Front
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            background: '#05070a',
            overflow: 'hidden'
        }} onMouseMove={handleMouseMove}>

            {/* 3D Starfield Layer (Base) */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                    <color attach="background" args={['#05070a']} />
                    <ambientLight intensity={0.5} />
                    {/* Pass simple motion values or just let R3F handle its own lerp if preferred. 
                        Here passing smoothX/Y for consistency if we want. 
                        But our StarField uses ref-based lerp internally which is fine. 
                        Let's pass the MotionValues so it can read .get() */}
                    <StarField mouseX={smoothX} mouseY={smoothY} />
                </Canvas>
            </div>

            {/* Image Parallax Layers (Overlay) */}
            {imageLayers.map((layer) => (
                <ImageLayer
                    key={layer.id}
                    src={layer.src}
                    speed={layer.speed}
                    x={smoothX}
                    y={smoothY}
                    scale={layer.scale}
                    opacity={layer.opacity}
                />
            ))}

            {/* Vignette Overlay */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'radial-gradient(circle at center, transparent 0%, #000 120%)',
                zIndex: 2,
                pointerEvents: 'none'
            }} />
        </div>
    );
};

export default ParallaxBackground;
