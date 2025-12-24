
import React, { useRef } from 'react';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Polaroids } from './Polaroids';
import { TreeStar } from './TreeStar';
import { TreeMode } from '../types';

interface ExperienceProps {
  mode: TreeMode;
  handPosition: { x: number; y: number; detected: boolean };
  uploadedPhotos: string[];
  twoHandsDetected: boolean;
  onClosestPhotoChange?: (photoUrl: string | null) => void;
  cameraMove?: 'forward' | 'backward' | null;
  showSnow?: boolean;
}

// Snow particle component
const SnowParticles: React.FC<{ count?: number }> = ({ count = 500 }) => {
  const meshRef = useRef<any>(null);
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;     // x: spread horizontally
      pos[i * 3 + 1] = Math.random() * 30;         // y: height
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40; // z: spread depth
    }
    return pos;
  }, [count]);
  
  const velocities = React.useMemo(() => {
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      vel[i] = 0.5 + Math.random() * 1.5; // Fall speed
    }
    return vel;
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const posArray = meshRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
      // Move down
      posArray[i * 3 + 1] -= velocities[i] * delta * 3;
      
      // Add slight horizontal drift
      posArray[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.01;
      
      // Reset to top if below ground
      if (posArray[i * 3 + 1] < -5) {
        posArray[i * 3 + 1] = 25;
        posArray[i * 3] = (Math.random() - 0.5) * 40;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

export const Experience: React.FC<ExperienceProps> = ({ 
  mode, 
  handPosition, 
  uploadedPhotos, 
  twoHandsDetected, 
  onClosestPhotoChange,
  cameraMove,
  showSnow 
}) => {
  const controlsRef = useRef<any>(null);

  // Update camera based on hand position and camera move
  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    
    // Handle Camera Move (Thumbs Up/Down)
    if (cameraMove) {
      const moveSpeed = 5;
      const currentDistance = controls.getDistance();
      
      if (cameraMove === 'forward' && currentDistance > controls.minDistance) {
        const newDistance = Math.max(controls.minDistance, currentDistance - moveSpeed * delta);
        const direction = controls.object.position.clone().sub(controls.target).normalize();
        controls.object.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
        controls.update();
      } else if (cameraMove === 'backward' && currentDistance < controls.maxDistance) {
        const newDistance = Math.min(controls.maxDistance, currentDistance + moveSpeed * delta);
        const direction = controls.object.position.clone().sub(controls.target).normalize();
        controls.object.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
        controls.update();
      }
    }
    
    // Handle hand position for rotation (only when not moving)
    if (handPosition.detected && !cameraMove) {
      // Map hand position to spherical coordinates
      const targetAzimuth = (handPosition.x - 0.5) * Math.PI * 3;
      
      const adjustedY = (handPosition.y - 0.2) * 2.0;
      const clampedY = Math.max(0, Math.min(1, adjustedY));
      
      const minPolar = Math.PI / 4;
      const maxPolar = Math.PI / 1.8;
      const targetPolar = minPolar + clampedY * (maxPolar - minPolar);
      
      const currentAzimuth = controls.getAzimuthalAngle();
      const currentPolar = controls.getPolarAngle();
      
      let azimuthDiff = targetAzimuth - currentAzimuth;
      if (azimuthDiff > Math.PI) azimuthDiff -= Math.PI * 2;
      if (azimuthDiff < -Math.PI) azimuthDiff += Math.PI * 2;
      
      const lerpSpeed = 8;
      const newAzimuth = currentAzimuth + azimuthDiff * delta * lerpSpeed;
      const newPolar = currentPolar + (targetPolar - currentPolar) * delta * lerpSpeed;
      
      const radius = controls.getDistance();
      const targetY = 4;
      
      const x = radius * Math.sin(newPolar) * Math.sin(newAzimuth);
      const y = targetY + radius * Math.cos(newPolar);
      const z = radius * Math.sin(newPolar) * Math.cos(newAzimuth);
      
      controls.object.position.set(x, y, z);
      controls.target.set(0, targetY, 0);
      controls.update();
    }
  });
  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={30}
        enableDamping
        dampingFactor={0.05}
        enabled={true}
      />

      {/* Lighting Setup for Maximum Luxury */}
      <Environment preset="lobby" background={false} blur={0.8} />
      
      <ambientLight intensity={0.2} color="#004422" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.2} 
        penumbra={1} 
        intensity={2} 
        color="#fff5cc" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#D4AF37" />

      <group position={[0, -5, 0]}>
        <Foliage mode={mode} count={12000} />
        <Ornaments mode={mode} count={600} />
        <Polaroids mode={mode} uploadedPhotos={uploadedPhotos} twoHandsDetected={twoHandsDetected} onClosestPhotoChange={onClosestPhotoChange} />
        <TreeStar mode={mode} />
        
        {/* Snow Effect */}
        {showSnow && <SnowParticles count={800} />}
        
        {/* Floor Reflections */}
        <ContactShadows 
          opacity={0.7} 
          scale={30} 
          blur={2} 
          far={4.5} 
          color="#000000" 
        />
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};
