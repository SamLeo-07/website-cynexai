import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../hooks/useTheme';
import './ThreeBackground.css';

// ─── Constants & Utils ────────────────────────────────────────────────────────
const PARTICLE_COUNT = 300; // Much lower for a clean network
const NETWORK_RADIUS = 25;

// ─── Ambient Glows (Soft Background Gradients) ──────────────────────────────
const AmbientGlows = () => {
    const { isDarkMode } = useTheme();
    const groupRef = useRef<THREE.Group>(null!);
    
    // Create large, soft glowing spheres
    const glows = useMemo(() => [
        { color: isDarkMode ? '#8b5cf6' : '#005bea', pos: [-15, 5, -20], scale: 25, speed: 0.1 },
        { color: isDarkMode ? '#41c8df' : '#00c6fb', pos: [15, -5, -25], scale: 30, speed: -0.05 },
        { color: isDarkMode ? '#ec4899' : '#ff0844', pos: [0, 10, -30], scale: 20, speed: 0.08 }
    ], [isDarkMode]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.children.forEach((child, i) => {
            const glow = glows[i];
            child.position.y = glow.pos[1] + Math.sin(t * glow.speed) * 5;
            child.position.x = glow.pos[0] + Math.cos(t * glow.speed) * 3;
        });
    });

    return (
        <group ref={groupRef}>
            {glows.map((glow, i) => (
                <mesh key={i} position={new THREE.Vector3(...glow.pos)}>
                    <sphereGeometry args={[glow.scale, 32, 32]} />
                    <meshBasicMaterial 
                        color={glow.color} 
                        transparent 
                        opacity={isDarkMode ? 0.15 : 0.08} 
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
};

// ─── Floating Glass Shapes (Modern 3D Elements) ─────────────────────────────
const FloatingGlassShapes = () => {
    const { isDarkMode } = useTheme();
    const groupRef = useRef<THREE.Group>(null!);
    const { pointer, size } = useThree();

    const shapes = useMemo(() => {
        const items = [];
        for (let i = 0; i < 15; i++) {
            items.push({
                type: Math.floor(Math.random() * 3), // 0: Icosahedron, 1: Torus, 2: Sphere
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 40,
                    (Math.random() - 0.5) * 30 - 10
                ),
                rotation: new THREE.Euler(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                ),
                scale: 0.5 + Math.random() * 1.5,
                speed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                )
            });
        }
        return items;
    }, []);

    useFrame((state) => {
        if (!groupRef.current) return;
        
        const mouseX = (pointer.x * size.width) / 100;
        const mouseY = (pointer.y * size.height) / 100;

        groupRef.current.children.forEach((child, i) => {
            const shape = shapes[i];
            child.rotation.x += shape.speed.x;
            child.rotation.y += shape.speed.y;
            
            // Gentle floating
            child.position.y += Math.sin(state.clock.getElapsedTime() + i) * 0.01;
            
            // Slight mouse parallax
            child.position.x += (mouseX * 0.01 - child.position.x * 0.001) * 0.5;
            child.position.y += (mouseY * 0.01 - child.position.y * 0.001) * 0.5;
        });
    });

    // Glass material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: isDarkMode ? '#ffffff' : '#41c8df',
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.9, // glass effect
        ior: 1.5,
        transparent: true,
        opacity: isDarkMode ? 0.4 : 0.6,
        wireframe: false,
    });

    return (
        <group ref={groupRef}>
            {shapes.map((s, i) => (
                <mesh key={i} position={s.position} rotation={s.rotation} scale={new THREE.Vector3(s.scale, s.scale, s.scale)} material={glassMaterial}>
                    {s.type === 0 && <icosahedronGeometry args={[1, 0]} />}
                    {s.type === 1 && <torusGeometry args={[0.8, 0.3, 16, 32]} />}
                    {s.type === 2 && <sphereGeometry args={[1, 32, 32]} />}
                </mesh>
            ))}
        </group>
    );
};

// ─── Clean Interactive Network (Connecting Nodes) ───────────────────────────
const CleanNetwork = () => {
    const { isDarkMode } = useTheme();
    const groupRef = useRef<THREE.Group>(null!);
    const { pointer, size } = useThree();

    const { positions, initialPositions } = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const initPos = new Float32Array(PARTICLE_COUNT * 3);
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Distribute in a wide sphere
            const r = Math.random() * NETWORK_RADIUS;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;
            
            initPos[i * 3] = x;
            initPos[i * 3 + 1] = y;
            initPos[i * 3 + 2] = z;
        }
        return { positions: pos, initialPositions: initPos };
    }, []);

    const pointsRef = useRef<THREE.Points>(null!);
    const linesRef = useRef<THREE.LineSegments>(null!);
    
    // Store lines geometry state
    const [lineGeometry, setLineGeometry] = useState<THREE.BufferGeometry | null>(null);

    useEffect(() => {
        const geo = new THREE.BufferGeometry();
        // Initial empty array, max possible connections
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 3), 3));
        setLineGeometry(geo);
    }, []);

    useFrame((state) => {
        if (!groupRef.current || !pointsRef.current || !lineGeometry) return;
        
        const t = state.clock.getElapsedTime();
        const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
        
        // Mouse interaction in world space
        const mouseX = (pointer.x * size.width) / 50; 
        const mouseY = (pointer.y * size.height) / 50;
        const mouseVec = new THREE.Vector3(mouseX, mouseY, 0);

        // 1. Move Particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            // Gentle floating drift
            pos[ix] = initialPositions[ix] + Math.sin(t * 0.2 + i) * 2;
            pos[iy] = initialPositions[iy] + Math.cos(t * 0.3 + i) * 2;
            
            // Magnetic effect towards mouse
            const pVec = new THREE.Vector3(pos[ix], pos[iy], pos[iz]);
            const dist = pVec.distanceTo(mouseVec);
            
            if (dist < 10) {
                // Pull slightly towards mouse
                const dir = mouseVec.clone().sub(pVec).normalize();
                const force = (10 - dist) * 0.02;
                pos[ix] += dir.x * force;
                pos[iy] += dir.y * force;
            } else {
                // Return to base gently if pulled
                pos[ix] += (initialPositions[ix] - pos[ix]) * 0.01;
                pos[iy] += (initialPositions[iy] - pos[iy]) * 0.01;
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;

        // 2. Draw Connections
        let vertexIndex = 0;
        const linePos = lineGeometry.attributes.position.array as Float32Array;
        
        const connectDistance = 6;
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            for (let j = i + 1; j < PARTICLE_COUNT; j++) {
                const dx = pos[i * 3] - pos[j * 3];
                const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
                const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < connectDistance * connectDistance) {
                    linePos[vertexIndex++] = pos[i * 3];
                    linePos[vertexIndex++] = pos[i * 3 + 1];
                    linePos[vertexIndex++] = pos[i * 3 + 2];
                    
                    linePos[vertexIndex++] = pos[j * 3];
                    linePos[vertexIndex++] = pos[j * 3 + 1];
                    linePos[vertexIndex++] = pos[j * 3 + 2];
                }
            }
        }
        
        lineGeometry.setDrawRange(0, vertexIndex / 3);
        lineGeometry.attributes.position.needsUpdate = true;
        
        // Slow rotation of entire network
        groupRef.current.rotation.y = t * 0.02;
    });

    return (
        <group ref={groupRef}>
            <Points ref={pointsRef} positions={positions} stride={3}>
                <PointMaterial 
                    transparent 
                    color={isDarkMode ? '#00f2fe' : '#41c8df'} 
                    size={0.15} 
                    sizeAttenuation 
                    depthWrite={false} 
                    opacity={0.8} 
                    blending={THREE.AdditiveBlending}
                />
            </Points>
            {lineGeometry && (
                <lineSegments ref={linesRef} geometry={lineGeometry}>
                    <lineBasicMaterial 
                        color={isDarkMode ? '#4facfe' : '#41c8df'} 
                        transparent 
                        opacity={0.15} 
                        blending={THREE.AdditiveBlending} 
                    />
                </lineSegments>
            )}
        </group>
    );
};

// ─── Interactive Click Ripples ────────────────────────────────────────────────
interface Ripple {
    id: number;
    position: THREE.Vector3;
    startTime: number;
}

const InteractiveRipples = () => {
    const groupRef = useRef<THREE.Group>(null!);
    const { camera } = useThree();
    const isDark = useTheme().isDarkMode;
    const [ripples, setRipples] = useState<Ripple[]>([]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const vec = new THREE.Vector3();
            const pos = new THREE.Vector3();

            vec.set(
                (e.clientX / window.innerWidth) * 2 - 1,
                -(e.clientY / window.innerHeight) * 2 + 1,
                0.5
            );
            vec.unproject(camera);
            vec.sub(camera.position).normalize();

            const distance = -camera.position.z / vec.z;
            pos.copy(camera.position).add(vec.multiplyScalar(distance));
            pos.z = Math.max(-10, Math.min(pos.z, 5));

            const newId = Date.now() + Math.random();
            setRipples((prev) => [...prev, { id: newId, position: pos, startTime: Date.now() }]);

            setTimeout(() => {
                setRipples((prev) => prev.filter(r => r.id !== newId));
            }, 2000);
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [camera]);

    return (
        <group ref={groupRef}>
            {ripples.map(r => (
                <RippleEffect key={r.id} position={r.position} startTime={r.startTime} isDarkMode={isDark} />
            ))}
        </group>
    );
};

const RippleEffect = ({ position, startTime, isDarkMode }: { position: THREE.Vector3, startTime: number, isDarkMode: boolean }) => {
    const ringRef = useRef<THREE.Mesh>(null!);

    useFrame(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const maxLife = 1.5;

        if (elapsed > maxLife) return;

        const progress = Math.min(1, elapsed / maxLife);

        if (ringRef.current) {
            const ringScale = 1 + progress * 15;
            ringRef.current.scale.set(ringScale, ringScale, ringScale);
            (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - Math.pow(progress, 0.5)) * 0.4;
        }
    });

    return (
        <mesh ref={ringRef} position={position}>
            <ringGeometry args={[0.9, 1, 32]} />
            <meshBasicMaterial
                color={isDarkMode ? '#00f2fe' : '#41c8df'}
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};


// ─── Smooth Camera Controller ───────────────────────────────────────────────
const CameraController = () => {
    const { camera, mouse, size } = useThree();
    const vec = new THREE.Vector3();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const scrollY = window.scrollY;
        // Check if body exists to prevent errors
        const maxScroll = document.documentElement.scrollHeight > 0 ? document.documentElement.scrollHeight - window.innerHeight : 1;
        const scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;

        // Smooth translation on scroll
        const targetZ = 35 - scrollProgress * 15;
        const targetY = 5 - scrollProgress * 5; 

        // Mouse Parallax 
        const mouseX = (mouse.x * size.width) / 100;
        const mouseY = (mouse.y * size.height) / 100;

        vec.set(mouseX * 0.1, targetY + mouseY * 0.1 + Math.sin(t * 0.5) * 0.5, targetZ);
        camera.position.lerp(vec, 0.05);

        camera.lookAt(0, 0, 0);
    });

    return null;
};

// ─── Main Background Component ────────────────────────────────────────────────
const ThreeBackground = () => {
    const { isDarkMode } = useTheme();

    return (
        <div className={`fixed inset-0 z-[-1] pointer-events-none transition-colors duration-1000 three-background ${isDarkMode ? 'dark' : ''}`}>
            <Canvas
                camera={{ position: [0, 5, 35], fov: 60 }}
                gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
                dpr={Math.min(window.devicePixelRatio, 1.5)}
            >
                <CameraController />
                <fog attach="fog" args={[isDarkMode ? '#050510' : '#f0f4f8', 15, 60]} />

                {/* Lighting for the glass shapes */}
                <ambientLight intensity={isDarkMode ? 0.3 : 0.8} />
                <directionalLight position={[10, 10, 5]} intensity={isDarkMode ? 1 : 1.5} color="#ffffff" />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color="#41c8df" />

                {/* Modern Scene Elements */}
                <AmbientGlows />
                <CleanNetwork />
                <FloatingGlassShapes />
                <InteractiveRipples />

            </Canvas>
        </div>
    );
};

export default ThreeBackground;
