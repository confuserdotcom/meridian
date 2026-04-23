import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettings } from '../../hooks/useSettings';
import { usePhase } from '../../hooks/usePhase';

const phaseColors = {
  normal: { primary: '#3b82f6', secondary: '#818cf8' },
  exam: { primary: '#ef4444', secondary: '#f97316' },
  break: { primary: '#10b981', secondary: '#06b6d4' },
};

function Particles({ count = 120 }) {
  const mesh = useRef();
  const darkMode = useSettings((s) => s.darkMode);
  const phase = usePhase((s) => s.phase);
  const colors = phaseColors[phase];

  const [positions, velocities, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 3;
      vel[i * 3] = (Math.random() - 0.5) * 0.003;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
      sz[i] = Math.random() * 0.06 + 0.02;
    }
    return [pos, vel, sz];
  }, [count]);

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const c1 = new THREE.Color(colors.primary);
    const c2 = new THREE.Color(colors.secondary);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const c = c1.clone().lerp(c2, t);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count, colors]);

  useFrame((state) => {
    if (!mesh.current) return;
    const pos = mesh.current.geometry.attributes.position.array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3] + Math.sin(time * 0.3 + i) * 0.0005;
      pos[i * 3 + 1] += velocities[i * 3 + 1] + Math.cos(time * 0.2 + i) * 0.0004;
      pos[i * 3 + 2] += velocities[i * 3 + 2];

      // Wrap around
      if (pos[i * 3] > 10) pos[i * 3] = -10;
      if (pos[i * 3] < -10) pos[i * 3] = 10;
      if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = -6;
      if (pos[i * 3 + 1] < -6) pos[i * 3 + 1] = 6;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colorArray}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={darkMode ? 0.4 : 0.2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingOrb() {
  const ref = useRef();
  const phase = usePhase((s) => s.phase);
  const color = phaseColors[phase].primary;

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    ref.current.position.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.2;
    ref.current.rotation.z = state.clock.elapsedTime * 0.1;
  });

  return (
    <mesh ref={ref} position={[0, 0, -4]}>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.04} />
    </mesh>
  );
}

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.7 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Particles />
        <FloatingOrb />
      </Canvas>
    </div>
  );
}
