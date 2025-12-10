/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls, Environment, SoftShadows, Instance, Instances, Float, useTexture, Outlines, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { Grid, BuildingType, TileData, WeatherType } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';

// Fix for TypeScript not recognizing R3F elements in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      instancedMesh: any;
      boxGeometry: any;
      planeGeometry: any;
      circleGeometry: any;
      ringGeometry: any;
      cylinderGeometry: any;
      sphereGeometry: any;
      ambientLight: any;
      directionalLight: any;
      fog: any;
      torusGeometry: any;
      orthographicCamera: any;
      color: any;
    }
  }
}

// Augment React's JSX namespace for environments where JSX is resolved from React
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      instancedMesh: any;
      boxGeometry: any;
      planeGeometry: any;
      circleGeometry: any;
      ringGeometry: any;
      cylinderGeometry: any;
      sphereGeometry: any;
      ambientLight: any;
      directionalLight: any;
      fog: any;
      torusGeometry: any;
      orthographicCamera: any;
      color: any;
    }
  }
}

// --- Constants & Helpers ---
const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number) => [x - WORLD_OFFSET, 0, y - WORLD_OFFSET] as [number, number, number];

// Deterministic random based on coordinates
const getHash = (x: number, y: number) => Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
const getRandomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Shared Geometries
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const coneGeo = new THREE.ConeGeometry(1, 1, 16);
const sphereGeo = new THREE.SphereGeometry(1, 8, 8);
const torusGeo = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
const circleGeo = new THREE.CircleGeometry(1, 32);

// --- 1. Advanced Procedural Buildings ---

// FIX: Wrap component in React.memo to ensure TypeScript recognizes it as a component that accepts a 'key' prop.
const WindowBlock = React.memo(({ position, scale, color = "#bfdbfe" }: { position: [number, number, number], scale: [number, number, number], color?: string }) => (
  <mesh geometry={boxGeo} position={position} scale={scale}>
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.1} metalness={0.8} />
  </mesh>
));

const SmokeStack = ({ position, color = "#d1d5db" }: { position: [number, number, number], color?: string }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const cloud = child as THREE.Mesh;
        cloud.position.y += 0.01 + i * 0.005;
        cloud.scale.addScalar(0.005);
        
        const material = cloud.material as THREE.MeshStandardMaterial;
        if (material) {
          material.opacity -= 0.005;
          if (cloud.position.y > 1.5) {
            cloud.position.y = 0;
            cloud.scale.setScalar(0.1 + Math.random() * 0.1);
            material.opacity = 0.6;
          }
        }
      });
    }
  });

  return (
    <group position={position}>
      <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0, 0.5, 0]} scale={[0.2, 1, 0.2]}>
        <meshStandardMaterial color={color} />
      </mesh>
      <group ref={ref} position={[0, 1, 0]}>
         {[0,1,2].map(i => (
            <mesh key={i} geometry={sphereGeo} position={[0, i*0.4, 0]} scale={[0.2,0.2,0.2]}>
                <meshStandardMaterial color="white" transparent opacity={0.6} />
            </mesh>
         ))}
      </group>
    </group>
  );
};

const SirenLight = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.2;
      // Oscillate intensity
      const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity * 2;
    }
  });
  return (
    <mesh ref={ref} geometry={boxGeo} position={position} scale={[0.15, 0.15, 0.15]}>
      <meshStandardMaterial color="red" emissive="red" emissiveIntensity={1} />
    </mesh>
  );
};

const FireEffect = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const part = child as THREE.Mesh;
        part.position.y += 0.02 + Math.random() * 0.01;
        part.scale.subScalar(0.01);
        
        if (part.scale.x <= 0) {
            part.scale.setScalar(0.2 + Math.random() * 0.3);
            part.position.y = Math.random() * 0.2;
            part.position.x = (Math.random() - 0.5) * 0.5;
            part.position.z = (Math.random() - 0.5) * 0.5;
        }
      });
    }
  });

  return (
    <group ref={ref} position={[0, 0.2, 0]}>
      {[...Array(5)].map((_, i) => (
         <mesh key={i} geometry={boxGeo} position={[(Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5]}>
            <meshBasicMaterial color={Math.random() > 0.5 ? '#ef4444' : '#f97316'} transparent opacity={0.8} />
         </mesh>
      ))}
      {[...Array(3)].map((_, i) => (
         <mesh key={`smoke-${i}`} geometry={sphereGeo} position={[(Math.random()-0.5)*0.5, 0.5 + Math.random(), (Math.random()-0.5)*0.5]}>
            <meshStandardMaterial color="#4b5563" transparent opacity={0.6} />
         </mesh>
      ))}
    </group>
  );
};

const Rubble = () => {
    return (
        <group>
            <mesh geometry={boxGeo} position={[0, 0.05, 0]} scale={[0.8, 0.1, 0.8]} receiveShadow>
                <meshStandardMaterial color="#57534e" />
            </mesh>
            <mesh geometry={boxGeo} position={[0.2, 0.15, 0.1]} scale={[0.3, 0.2, 0.3]} rotation={[0.2, 0.3, 0]}>
                <meshStandardMaterial color="#44403c" />
            </mesh>
            <mesh geometry={boxGeo} position={[-0.2, 0.1, -0.2]} scale={[0.4, 0.15, 0.4]} rotation={[-0.1, 0, 0.2]}>
                <meshStandardMaterial color="#57534e" />
            </mesh>
             <mesh geometry={boxGeo} position={[0, 0.1, 0.3]} scale={[0.2, 0.1, 0.2]} rotation={[0, 0.5, 0]}>
                <meshStandardMaterial color="#292524" />
            </mesh>
        </group>
    )
}

const ConstructionScaffold = () => {
  const craneRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (craneRef.current) {
      // Gentle swaying of the crane
      craneRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5 + 0.5;
    }
  });

  return (
    <group>
      {/* Concrete Foundation Slab */}
      <mesh position={[0, 0.05, 0]} scale={[0.95, 0.1, 0.95]} receiveShadow geometry={boxGeo}>
         <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* Wireframe Box indicating construction zone */}
      <mesh position={[0, 0.6, 0]} scale={[1.1, 1.2, 1.1]} geometry={boxGeo}>
        <meshBasicMaterial color="#facc15" wireframe transparent opacity={0.3} />
      </mesh>
      
      {/* Corner Posts */}
      <mesh position={[0.55, 0.6, 0.55]} scale={[0.05, 1.2, 0.05]} geometry={boxGeo}>
         <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[-0.55, 0.6, 0.55]} scale={[0.05, 1.2, 0.05]} geometry={boxGeo}>
         <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[0.55, 0.6, -0.55]} scale={[0.05, 1.2, 0.05]} geometry={boxGeo}>
         <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[-0.55, 0.6, -0.55]} scale={[0.05, 1.2, 0.05]} geometry={boxGeo}>
         <meshStandardMaterial color="#fbbf24" />
      </mesh>

      {/* Crane */}
      <group ref={craneRef} position={[0.6, 0, 0.6]}>
        {/* Mast */}
        <mesh position={[0, 1.25, 0]} scale={[0.05, 2.5, 0.05]} castShadow geometry={boxGeo}>
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Jib (Arm) */}
        <mesh position={[-0.4, 2.4, 0]} scale={[0.8, 0.05, 0.05]} castShadow geometry={boxGeo}>
           <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Counter Jib */}
        <mesh position={[0.2, 2.4, 0]} scale={[0.4, 0.05, 0.05]} geometry={boxGeo}>
           <meshStandardMaterial color="#f59e0b" />
        </mesh>
        {/* Counterweight */}
        <mesh position={[0.3, 2.35, 0]} scale={[0.15, 0.1, 0.1]} geometry={boxGeo}>
            <meshStandardMaterial color="#78350f" />
        </mesh>
        {/* Cable */}
        <mesh position={[-0.7, 2.1, 0]} scale={[0.01, 0.6, 0.01]} geometry={boxGeo}>
            <meshBasicMaterial color="black" />
        </mesh>
        {/* Hook/Load */}
        <mesh position={[-0.7, 1.8, 0]} scale={[0.1, 0.1, 0.1]} geometry={boxGeo}>
             <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
};

const ProceduralBuilding = React.memo(({ type, variant, x, y, happiness, health = 100 }: { type: BuildingType, variant: number, x: number, y: number, happiness: number, health?: number }) => {
  const buildingRef = useRef<THREE.Group>(null);
  const hash = getHash(x, y);

  // Construction State
  const [isBuilt, setIsBuilt] = useState(false);
  const progress = useRef(0);

  // Slum or Luxury Appearance based on happiness
  const isSlum = happiness < 40;
  const isLuxury = happiness > 80;

  const isDamaged = health < 90;
  const isRuined = health <= 0;
  const showFire = health < 50 && health > 0;

  // Animation for construction and placement
  useFrame((state, delta) => {
    if (!isBuilt) {
      // Build over ~1.5 seconds
      progress.current += delta * 0.7;
      if (progress.current >= 1) {
        progress.current = 1;
        setIsBuilt(true);
      }

      if (buildingRef.current) {
        // Grow from ground
        buildingRef.current.scale.y = progress.current;
      }
    }
  });

  const content = useMemo(() => {
    if (isRuined) return <Rubble />;

    const matColor = (baseColor: string) => isDamaged ? new THREE.Color(baseColor).multiplyScalar(0.4).getStyle() : baseColor;

    switch (type) {
      case BuildingType.Residential:
        if (isSlum) {
             // Slum: Small, crowded shacks, muted colors
             return (
                <group>
                  <mesh geometry={boxGeo} castShadow receiveShadow position={[0.2, 0.3, 0.2]} scale={[0.4, 0.6, 0.4]}>
                    <meshStandardMaterial color={matColor("#8f7868")} roughness={0.9} />
                  </mesh>
                  <mesh geometry={boxGeo} castShadow receiveShadow position={[-0.2, 0.2, -0.2]} scale={[0.4, 0.4, 0.4]}>
                    <meshStandardMaterial color={matColor("#756458")} roughness={0.9} />
                  </mesh>
                  {/* Corrugated Roofs */}
                  <mesh geometry={coneGeo} position={[0.2, 0.65, 0.2]} scale={[0.35, 0.15, 0.35]} rotation={[0, Math.PI/4, 0]}>
                      <meshStandardMaterial color={matColor("#5c4d44")} />
                  </mesh>
                </group>
             );
        } else if (isLuxury) {
             // Luxury: Modern, glass, taller, pool?
             return (
                <group>
                  <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.6, 0]} scale={[0.7, 1.2, 0.7]}>
                     <meshStandardMaterial color={matColor("#f0fdfa")} metalness={0.2} roughness={0.1} />
                  </mesh>
                   {/* Glass Balconies */}
                   <WindowBlock position={[0, 0.5, 0.36]} scale={[0.6, 0.2, 0.05]} color="#22d3ee" />
                   <WindowBlock position={[0, 0.9, 0.36]} scale={[0.6, 0.2, 0.05]} color="#22d3ee" />
                   {/* Penthouse Roof */}
                   <mesh geometry={boxGeo} position={[0, 1.25, 0]} scale={[0.5, 0.1, 0.5]}>
                       <meshStandardMaterial color={matColor("#334155")} />
                   </mesh>
                </group>
             )
        } else {
             // Standard Suburban Houses
             const styles = [
                // Style 1: L-shape
                <group key="1">
                    <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.3, 0]} scale={[0.8, 0.6, 0.6]}>
                      <meshStandardMaterial color={matColor("#fca5a5")} />
                    </mesh>
                    <mesh geometry={coneGeo} position={[0, 0.8, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]}>
                       <meshStandardMaterial color={matColor("#7f1d1d")} />
                    </mesh>
                    <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.2, 0.2, 0.05]} />
                    <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.2, 0.2, 0.05]} />
                </group>,
                // Style 2: Two story box
                <group key="2">
                   <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.5, 0]} scale={[0.6, 1, 0.6]}>
                      <meshStandardMaterial color={matColor("#fdba74")} />
                    </mesh>
                    <mesh geometry={coneGeo} position={[0, 1.1, 0]} scale={[0.5, 0.3, 0.5]}>
                        <meshStandardMaterial color={matColor("#9a3412")} />
                    </mesh>
                    <WindowBlock position={[0, 0.3, 0.31]} scale={[0.2, 0.2, 0.05]} />
                    <WindowBlock position={[0, 0.7, 0.31]} scale={[0.2, 0.2, 0.05]} />
                </group>
             ];
             return styles[Math.floor(hash * styles.length)];
        }

      case BuildingType.MixedUse:
          // Apartment with shop below
          return (
            <group>
                {/* Commercial Base */}
                <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.9]}>
                    <meshStandardMaterial color={matColor("#a78bfa")} />
                </mesh>
                {/* Shop Window */}
                <WindowBlock position={[0, 0.2, 0.46]} scale={[0.8, 0.3, 0.05]} color="#fdf4ff" />
                
                {/* Residential Top */}
                <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.9, 0]} scale={[0.7, 0.6, 0.7]}>
                    <meshStandardMaterial color={matColor("#ddd6fe")} />
                </mesh>
                {/* Windows */}
                <WindowBlock position={[0.2, 0.9, 0.36]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[-0.2, 0.9, 0.36]} scale={[0.15, 0.2, 0.05]} />
                <WindowBlock position={[0.36, 0.9, 0]} scale={[0.05, 0.2, 0.15]} />
                
                {/* Roof details */}
                <mesh geometry={boxGeo} position={[0, 1.25, 0]} scale={[0.6, 0.1, 0.6]}>
                     <meshStandardMaterial color={matColor("#5b21b6")} />
                </mesh>
            </group>
          );

      case BuildingType.Commercial:
        if (hash > 0.5) {
            // Modern Office Block
             return (
                <group>
                  <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.75, 0]} scale={[0.8, 1.5, 0.8]}>
                    <meshStandardMaterial color={matColor("#93c5fd")} metalness={0.4} roughness={0.2} />
                  </mesh>
                  {/* Vertical Strips */}
                  <mesh geometry={boxGeo} position={[0.41, 0.75, 0.2]} scale={[0.05, 1.5, 0.1]}>
                      <meshStandardMaterial color={matColor("#1e3a8a")} />
                  </mesh>
                  <mesh geometry={boxGeo} position={[0.41, 0.75, -0.2]} scale={[0.05, 1.5, 0.1]}>
                      <meshStandardMaterial color={matColor("#1e3a8a")} />
                  </mesh>
                   {/* Roof AC */}
                  <mesh geometry={boxGeo} position={[0, 1.55, 0]} scale={[0.4, 0.1, 0.4]}>
                      <meshStandardMaterial color={matColor("#64748b")} />
                  </mesh>
                </group>
              );
        } else {
             // Department Store / Low Rise
             return (
                <group>
                  <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.9]}>
                    <meshStandardMaterial color={matColor("#60a5fa")} />
                  </mesh>
                  {/* Large Sign Board */}
                  <mesh geometry={boxGeo} position={[0, 0.9, 0.46]} scale={[0.7, 0.2, 0.05]}>
                      <meshStandardMaterial color={matColor("#1d4ed8")} />
                  </mesh>
                  {/* Glass Front */}
                  <WindowBlock position={[0, 0.3, 0.46]} scale={[0.8, 0.4, 0.05]} color="#dbeafe" />
                </group>
             );
        }

      case BuildingType.Industrial:
         if (hash > 0.6) {
             // Refinery
             return (
                <group>
                    <mesh geometry={boxGeo} castShadow receiveShadow position={[-0.2, 0.4, -0.2]} scale={[0.5, 0.8, 0.5]}>
                         <meshStandardMaterial color={matColor("#eab308")} />
                    </mesh>
                    {/* Pipes */}
                     <mesh geometry={torusGeo} position={[-0.2, 0.4, 0.1]} scale={[0.3,0.3,0.3]} rotation={[0,Math.PI/2,0]}>
                         <meshStandardMaterial color={matColor("#a16207")} />
                    </mesh>
                    <SmokeStack position={[0.3, 0, 0.3]} color="#713f12" />
                </group>
             )
         } else {
            // Warehouse / Factory Hall
            return (
              <group>
                <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.35, 0]} scale={[0.9, 0.7, 0.9]}>
                  <meshStandardMaterial color={matColor("#facc15")} />
                </mesh>
                {/* Sawtooth Roof */}
                <group position={[0, 0.7, 0]}>
                   <mesh geometry={coneGeo} position={[-0.25, 0, 0]} scale={[0.4, 0.3, 0.9]} rotation={[0, 0, Math.PI/4]}>
                      <meshStandardMaterial color={matColor("#854d0e")} />
                   </mesh>
                    <mesh geometry={coneGeo} position={[0.25, 0, 0]} scale={[0.4, 0.3, 0.9]} rotation={[0, 0, Math.PI/4]}>
                      <meshStandardMaterial color={matColor("#854d0e")} />
                   </mesh>
                </group>
                <SmokeStack position={[0.35, 0, -0.35]} />
              </group>
            );
         }
      
      case BuildingType.PowerPlant:
        return (
          <group>
            {/* Main reactor building */}
            <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.4, 0]} scale={[0.8, 0.8, 0.8]}>
              <meshStandardMaterial color={matColor("#c2410c")} />
            </mesh>
            {/* Cooling Tower 1 */}
            <SmokeStack position={[-0.3, 0, -0.3]} color="#9a3412" />
            {/* Cooling Tower 2 */}
            <SmokeStack position={[0.3, 0, 0.3]} color="#9a3412" />
             {/* Hazard Stripes */}
            <mesh geometry={boxGeo} position={[0, 0.81, 0]} scale={[0.6, 0.05, 0.6]}>
                <meshStandardMaterial color={matColor("#fbbf24")} />
            </mesh>
          </group>
        );

      case BuildingType.WaterPump:
        return (
           <group>
             {/* Pump House */}
             <mesh geometry={boxGeo} castShadow receiveShadow position={[-0.2, 0.3, 0]} scale={[0.4, 0.6, 0.6]}>
               <meshStandardMaterial color={matColor("#0284c7")} />
             </mesh>
             {/* Water Tank */}
             <mesh geometry={cylinderGeo} castShadow receiveShadow position={[0.3, 0.4, 0]} scale={[0.35, 0.8, 0.35]}>
                <meshStandardMaterial color={matColor("#bae6fd")} metalness={0.3} roughness={0.2} opacity={0.9} transparent />
             </mesh>
             {/* Pipe */}
             <mesh geometry={cylinderGeo} position={[0.05, 0.2, 0]} rotation={[0, 0, Math.PI/2]} scale={[0.05, 0.4, 0.05]}>
                <meshStandardMaterial color={matColor("#075985")} />
             </mesh>
           </group>
        );
      
      case BuildingType.School:
          return (
             <group>
                {/* Main Building Brick */}
                <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.6]}>
                    <meshStandardMaterial color={matColor("#d97706")} roughness={0.9} /> {/* Amber-600 */}
                </mesh>
                {/* Entrance */}
                <mesh geometry={boxGeo} position={[0, 0.3, 0.35]} scale={[0.3, 0.4, 0.2]}>
                    <meshStandardMaterial color={matColor("#b45309")} />
                </mesh>
                {/* Clock Tower */}
                <mesh geometry={boxGeo} castShadow position={[0.3, 0.8, 0]} scale={[0.25, 0.6, 0.25]}>
                    <meshStandardMaterial color={matColor("#92400e")} />
                </mesh>
                {/* Clock Face */}
                 <mesh geometry={circleGeo} position={[0.3, 1, 0.13]} scale={[0.08, 0.08, 1]}>
                    <meshBasicMaterial color="white" />
                </mesh>
             </group>
          );

      case BuildingType.Hospital:
          return (
             <group>
                {/* Main Wings */}
                <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.5, 0]} scale={[0.9, 1, 0.4]}>
                    <meshStandardMaterial color={matColor("#f8fafc")} /> {/* Slate-50 */}
                </mesh>
                <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.5, 0]} scale={[0.3, 1, 0.9]}>
                    <meshStandardMaterial color={matColor("#f8fafc")} />
                </mesh>
                {/* Red Cross */}
                <group position={[0, 0.8, 0.46]} scale={[0.15, 0.15, 1]}>
                    <mesh geometry={boxGeo} scale={[1, 0.3, 0.05]}>
                        <meshBasicMaterial color="#ef4444" />
                    </mesh>
                     <mesh geometry={boxGeo} scale={[0.3, 1, 0.05]}>
                        <meshBasicMaterial color="#ef4444" />
                    </mesh>
                </group>
                {/* Helipad on roof */}
                 <mesh geometry={circleGeo} position={[0, 1.01, 0]} rotation={[-Math.PI/2, 0, 0]} scale={[0.2, 0.2, 1]}>
                     <meshBasicMaterial color={matColor("#cbd5e1")} />
                 </mesh>
                 <mesh geometry={boxGeo} position={[0, 1.02, 0]} scale={[0.15, 0.02, 0.15]}>
                     <meshBasicMaterial color="#ef4444" />
                 </mesh>
             </group>
          );
      
      case BuildingType.PoliceStation:
          return (
            <group>
               {/* Base Building */}
               <mesh geometry={boxGeo} castShadow receiveShadow position={[0, 0.4, 0]} scale={[0.8, 0.8, 0.8]}>
                   <meshStandardMaterial color={matColor("#eff6ff")} /> {/* Blue-50 */}
               </mesh>
               {/* Blue Band */}
               <mesh geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.81, 0.2, 0.81]}>
                   <meshStandardMaterial color={matColor("#2563eb")} /> {/* Blue-600 */}
               </mesh>
               {/* Roof Structure */}
               <mesh geometry={boxGeo} position={[0, 0.85, 0]} scale={[0.6, 0.1, 0.6]}>
                   <meshStandardMaterial color={matColor("#1e3a8a")} /> {/* Blue-900 */}
               </mesh>
               {/* Siren */}
               <SirenLight position={[0, 0.95, 0]} />
            </group>
          );

      case BuildingType.Park:
        return (
          <group>
            <mesh geometry={boxGeo} receiveShadow position={[0, 0.05, 0]} scale={[0.95, 0.1, 0.95]}>
               <meshStandardMaterial color={matColor("#86efac")} />
            </mesh>
             {/* Trees */}
            <group position={[-0.25, 0, -0.25]}>
                <mesh geometry={cylinderGeo} position={[0, 0.3, 0]} scale={[0.1, 0.4, 0.1]}>
                    <meshStandardMaterial color={matColor("#78350f")} />
                </mesh>
                <mesh geometry={coneGeo} position={[0, 0.6, 0]} scale={[0.3, 0.5, 0.3]}>
                    <meshStandardMaterial color={matColor("#166534")} />
                </mesh>
            </group>
            <group position={[0.25, 0, 0.25]}>
                <mesh geometry={cylinderGeo} position={[0, 0.2, 0]} scale={[0.08, 0.3, 0.08]}>
                    <meshStandardMaterial color={matColor("#78350f")} />
                </mesh>
                <mesh geometry={coneGeo} position={[0, 0.5, 0]} scale={[0.25, 0.4, 0.25]}>
                    <meshStandardMaterial color={matColor("#15803d")} />
                </mesh>
            </group>
             {/* Fountain Water */}
             <mesh geometry={cylinderGeo} position={[0, 0.15, 0]} scale={[0.3, 0.1, 0.3]}>
                 <meshStandardMaterial color={matColor("#bae6fd")} />
             </mesh>
          </group>
        );

      default:
        return null;
    }
  }, [type, hash, isSlum, isLuxury, isDamaged, isRuined]);

  return (
    <group>
      <group ref={buildingRef} position={[0, 0, 0]} scale={[1, 0, 1]}>
        {content}
        {showFire && <FireEffect />}
      </group>
      {!isBuilt && <ConstructionScaffold />}
    </group>
  );
});

// --- 2. Road System (Enhanced with Bridges/Tunnels) ---

const ELEVATION_HEIGHT = 0.5;

// Helper to determine road level: 0=Ground, 1=Bridge, 2=Both
const getRoadLevel = (tile: TileData) => {
    if (tile.buildingType !== BuildingType.Road) return -1;
    const v = tile.variant || 0;
    if (v === 0) return 0; // Ground
    if (v === 1) return 1; // Elevated
    return 2; // Overpass (Both)
};

const GroundRoadSegment = ({ x, y, grid, overrideVertical = false, overrideHorizontal = false }: { x: number, y: number, grid: Grid, overrideVertical?: boolean, overrideHorizontal?: boolean }) => {
    // Check neighbors for ground connection
    const n = y > 0 && getRoadLevel(grid[y-1][x]) !== 1; // 0 or 2 connects
    const s = y < GRID_SIZE-1 && getRoadLevel(grid[y+1][x]) !== 1;
    const e = x < GRID_SIZE-1 && getRoadLevel(grid[y][x+1]) !== 1;
    const w = x > 0 && getRoadLevel(grid[y][x-1]) !== 1;
    
    // For intersection overpasses, force straight connection
    const connectN = overrideVertical ? true : overrideHorizontal ? false : n;
    const connectS = overrideVertical ? true : overrideHorizontal ? false : s;
    const connectE = overrideHorizontal ? true : overrideVertical ? false : e;
    const connectW = overrideHorizontal ? true : overrideVertical ? false : w;

    const neighborCount = (connectN?1:0) + (connectS?1:0) + (connectE?1:0) + (connectW?1:0);
    const isIntersection = neighborCount > 2;

    return (
        <group position={[0, 0.01, 0]}>
             {/* Asphalt Base */}
             <mesh rotation={[-Math.PI/2, 0, 0]} scale={[0.98, 0.98, 1]}>
                 <planeGeometry />
                 <meshStandardMaterial color="#374151" roughness={0.9} />
             </mesh>

             {/* Yellow Lines */}
             {!isIntersection && (
                <>
                   {(connectN || connectS) && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0]} scale={[0.05, 1, 1]}><planeGeometry /><meshBasicMaterial color="#fbbf24" /></mesh>}
                   {(connectE || connectW) && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0]} scale={[1, 0.05, 1]}><planeGeometry /><meshBasicMaterial color="#fbbf24" /></mesh>}
                </>
             )}

             {/* White Stop Lines */}
             {isIntersection && (
                 <>
                    {connectN && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, -0.35]} scale={[0.8, 0.1, 1]}><planeGeometry /><meshBasicMaterial color="white" /></mesh>}
                    {connectS && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, 0.35]} scale={[0.8, 0.1, 1]}><planeGeometry /><meshBasicMaterial color="white" /></mesh>}
                    {connectE && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0.35, 0.005, 0]} scale={[0.1, 0.8, 1]}><planeGeometry /><meshBasicMaterial color="white" /></mesh>}
                    {connectW && <mesh rotation={[-Math.PI/2, 0, 0]} position={[-0.35, 0.005, 0]} scale={[0.1, 0.8, 1]}><planeGeometry /><meshBasicMaterial color="white" /></mesh>}
                    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.002, 0]} scale={[0.4, 0.4, 1]}><planeGeometry /><meshBasicMaterial color="#1f2937" transparent opacity={0.5} /></mesh>
                 </>
             )}
        </group>
    );
};

const BridgeRoadSegment = ({ x, y, grid, isOverpass }: { x: number, y: number, grid: Grid, isOverpass: boolean }) => {
    // Check neighbors for bridge connection
    const n = y > 0 && getRoadLevel(grid[y-1][x]) > 0;
    const s = y < GRID_SIZE-1 && getRoadLevel(grid[y+1][x]) > 0;
    const e = x < GRID_SIZE-1 && getRoadLevel(grid[y][x+1]) > 0;
    const w = x > 0 && getRoadLevel(grid[y][x-1]) > 0;

    // Check neighbors for ramps (if they are Ground Road Only)
    const rampN = y > 0 && getRoadLevel(grid[y-1][x]) === 0;
    const rampS = y < GRID_SIZE-1 && getRoadLevel(grid[y+1][x]) === 0;
    const rampE = x < GRID_SIZE-1 && getRoadLevel(grid[y][x+1]) === 0;
    const rampW = x > 0 && getRoadLevel(grid[y][x-1]) === 0;
    
    return (
        <group position={[0, 0, 0]}>
             {/* Central Deck */}
             <mesh position={[0, ELEVATION_HEIGHT, 0]} scale={[1, 0.1, 1]} castShadow receiveShadow>
                <boxGeometry />
                <meshStandardMaterial color="#94a3b8" /> {/* Concrete Side */}
             </mesh>
             {/* Asphalt Top */}
             <mesh position={[0, ELEVATION_HEIGHT + 0.051, 0]} rotation={[-Math.PI/2, 0, 0]} scale={[0.9, 0.9, 1]}>
                 <planeGeometry />
                 <meshStandardMaterial color="#334155" roughness={0.8} />
             </mesh>

             {/* Connections */}
             {/* Ramp N */}
             {rampN && (
                 <group position={[0, ELEVATION_HEIGHT/2, -0.75]} rotation={[0.4, 0, 0]}>
                     <mesh position={[0, 0, 0]} scale={[1, 0.1, 0.8]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#334155" />
                     </mesh>
                 </group>
             )}
             {/* Ramp S */}
             {rampS && (
                 <group position={[0, ELEVATION_HEIGHT/2, 0.75]} rotation={[-0.4, 0, 0]}>
                     <mesh position={[0, 0, 0]} scale={[1, 0.1, 0.8]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#334155" />
                     </mesh>
                 </group>
             )}
              {/* Ramp E */}
             {rampE && (
                 <group position={[0.75, ELEVATION_HEIGHT/2, 0]} rotation={[0, 0, -0.4]}>
                     <mesh position={[0, 0, 0]} scale={[0.8, 0.1, 1]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#334155" />
                     </mesh>
                 </group>
             )}
             {/* Ramp W */}
             {rampW && (
                 <group position={[-0.75, ELEVATION_HEIGHT/2, 0]} rotation={[0, 0, 0.4]}>
                     <mesh position={[0, 0, 0]} scale={[0.8, 0.1, 1]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#334155" />
                     </mesh>
                 </group>
             )}

             {/* Railings */}
             {!n && !rampN && <mesh position={[0, ELEVATION_HEIGHT + 0.15, -0.45]} scale={[1, 0.2, 0.1]}><boxGeometry /><meshStandardMaterial color="#cbd5e1" /></mesh>}
             {!s && !rampS && <mesh position={[0, ELEVATION_HEIGHT + 0.15, 0.45]} scale={[1, 0.2, 0.1]}><boxGeometry /><meshStandardMaterial color="#cbd5e1" /></mesh>}
             {!e && !rampE && <mesh position={[0.45, ELEVATION_HEIGHT + 0.15, 0]} scale={[0.1, 0.2, 1]}><boxGeometry /><meshStandardMaterial color="#cbd5e1" /></mesh>}
             {!w && !rampW && <mesh position={[-0.45, ELEVATION_HEIGHT + 0.15, 0]} scale={[0.1, 0.2, 1]}><boxGeometry /><meshStandardMaterial color="#cbd5e1" /></mesh>}

             {/* Pillars */}
             {!isOverpass && (
                 <>
                    <mesh position={[0.4, ELEVATION_HEIGHT/2, 0.4]} scale={[0.1, ELEVATION_HEIGHT, 0.1]} castShadow>
                        <cylinderGeometry />
                        <meshStandardMaterial color="#64748b" />
                    </mesh>
                    <mesh position={[-0.4, ELEVATION_HEIGHT/2, 0.4]} scale={[0.1, ELEVATION_HEIGHT, 0.1]} castShadow>
                        <cylinderGeometry />
                        <meshStandardMaterial color="#64748b" />
                    </mesh>
                    <mesh position={[0.4, ELEVATION_HEIGHT/2, -0.4]} scale={[0.1, ELEVATION_HEIGHT, 0.1]} castShadow>
                        <cylinderGeometry />
                        <meshStandardMaterial color="#64748b" />
                    </mesh>
                    <mesh position={[-0.4, ELEVATION_HEIGHT/2, -0.4]} scale={[0.1, ELEVATION_HEIGHT, 0.1]} castShadow>
                        <cylinderGeometry />
                        <meshStandardMaterial color="#64748b" />
                    </mesh>
                 </>
             )}
             
             {/* Center Pillar for standard bridge if no road below */}
             {!isOverpass && !rampN && !rampS && !rampE && !rampW && (
                  <mesh position={[0, ELEVATION_HEIGHT/2, 0]} scale={[0.3, ELEVATION_HEIGHT, 0.3]} castShadow>
                        <cylinderGeometry />
                        <meshStandardMaterial color="#64748b" />
                  </mesh>
             )}

        </group>
    );
}

const RoadSystem = React.memo(({ x, y, grid }: { x: number, y: number, grid: Grid }) => {
    const tile = grid[y][x];
    const v = tile.variant || 0;
    
    const isGround = v === 0 || v === 2 || v === 3;
    const isBridge = v === 1 || v === 2 || v === 3;
    const isOverpass = v === 2 || v === 3;

    // For Overpasses, we force the ground direction
    const overrideVertical = v === 2; // Ground goes N-S
    const overrideHorizontal = v === 3; // Ground goes E-W

    return (
        <group>
            {isGround && <GroundRoadSegment x={x} y={y} grid={grid} overrideVertical={overrideVertical} overrideHorizontal={overrideHorizontal} />}
            {isBridge && <BridgeRoadSegment x={x} y={y} grid={grid} isOverpass={isOverpass} />}
        </group>
    );
});


// --- 3. Traffic System ---

const TrafficLight = ({ position, state }: { position: [number, number, number], state: 'green' | 'red' }) => {
    return (
        <group position={position}>
            {/* Pole */}
            <mesh position={[0, 0.5, 0]} scale={[0.05, 1, 0.05]}>
                <cylinderGeometry />
                <meshStandardMaterial color="#475569" />
            </mesh>
            {/* Box */}
            <mesh position={[0, 0.9, 0]} scale={[0.15, 0.3, 0.15]}>
                <boxGeometry />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Light */}
            <mesh position={[0, 0.9, 0.08]} scale={[0.1, 0.1, 0.05]}>
                <sphereGeometry />
                <meshBasicMaterial color={state === 'green' ? '#22c55e' : '#ef4444'} />
            </mesh>
        </group>
    );
};

type VehicleType = 'car' | 'truck' | 'bus' | 'police';

// Simple Agent Logic
interface CarAgent {
    id: number;
    x: number;
    y: number;
    // Current world position (for smooth animation)
    wx: number;
    wy: number;
    // Target world position
    tx: number;
    ty: number;
    
    speed: number;
    color: string;
    type: VehicleType;
    
    // Direction: 0=N, 1=E, 2=S, 3=W
    heading: number;
    
    // Waiting for light?
    waiting: boolean;
}

const TrafficSystem = ({ grid, congestion }: { grid: Grid, congestion: number }) => {
    const [cars, setCars] = useState<CarAgent[]>([]);
    const carsRef = useRef<CarAgent[]>([]);
    const trafficLightTimer = useRef(0);
    const [lightState, setLightState] = useState<'NS' | 'EW'>('NS'); // NS = NS Green, EW Red
    
    const instanceRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Color palette for cars
    const carColors = useMemo(() => ["#ef4444", "#3b82f6", "#eab308", "#ffffff", "#000000", "#10b981"], []);

    // Initialize/Update Cars based on Congestion
    useEffect(() => {
        // Count road tiles
        let roadTiles: {x: number, y: number}[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.Road && (tile.variant === 0 || tile.variant === 2 || tile.variant === 3)) {
                roadTiles.push({x, y});
            }
        }));

        if (roadTiles.length === 0) return;

        // Desired car count: 1 car per 2 road tiles at max congestion? 
        // Let's say max 50 cars for performance, scaled by congestion.
        // Or simply: Congestion % of max capacity.
        const maxCapacity = Math.min(50, roadTiles.length);
        const desiredCount = Math.floor(maxCapacity * (congestion / 100));

        // Adjust array size
        const currentCount = carsRef.current.length;
        if (desiredCount > currentCount) {
             // Add cars
             const toAdd = desiredCount - currentCount;
             for (let i=0; i<toAdd; i++) {
                 const tile = roadTiles[Math.floor(Math.random() * roadTiles.length)];
                 const [wx, wy, wz] = gridToWorld(tile.x, tile.y);
                 
                 const typeRoll = Math.random();
                 let vType: VehicleType = 'car';
                 let color = carColors[Math.floor(Math.random() * carColors.length)];
                 let speed = getRandomRange(0.02, 0.05);

                 if (typeRoll > 0.96) {
                     vType = 'police';
                     color = '#ffffff'; 
                     speed = 0.08; // Fast
                 } else if (typeRoll > 0.85) {
                     vType = 'bus';
                     color = Math.random() > 0.5 ? '#f59e0b' : '#3b82f6'; // Amber or Blue
                     speed = 0.02; // Slow
                 } else if (typeRoll > 0.70) {
                     vType = 'truck';
                     color = '#78716c'; // Grey/Brown
                     speed = 0.015; // Slow
                 }

                 carsRef.current.push({
                     id: Math.random(),
                     x: tile.x,
                     y: tile.y,
                     wx: wx,
                     wy: wz,
                     tx: wx, // Start stationary-ish
                     ty: wz,
                     speed: speed,
                     color: color,
                     type: vType,
                     heading: Math.floor(Math.random() * 4),
                     waiting: false
                 });
             }
        } else if (desiredCount < currentCount) {
             // Remove random cars
             carsRef.current = carsRef.current.slice(0, desiredCount);
        }
        
    }, [congestion, grid, carColors]);

    // Traffic Logic Loop
    useFrame((state, delta) => {
        // Toggle Lights
        trafficLightTimer.current += delta;
        if (trafficLightTimer.current > 5) { // Switch every 5 seconds
            setLightState(prev => prev === 'NS' ? 'EW' : 'NS');
            trafficLightTimer.current = 0;
        }

        // Move Cars
        carsRef.current.forEach(car => {
            const dx = car.tx - car.wx;
            const dy = car.ty - car.wy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Check for traffic light stop
            // Logic: If close to center of tile (dist < 0.4) and tile is intersection and light is red for heading
            // Simple approach: Intersection is tile with > 2 neighbors.
            
            let shouldWait = false;
            
            if (dist < 0.05) {
                // Arrived at target (center of a tile)
                // Pick next tile
                car.wx = car.tx;
                car.wy = car.ty;
                
                // Current Tile Coords
                const gx = Math.round(car.wx + WORLD_OFFSET);
                const gy = Math.round(car.wy + WORLD_OFFSET);
                
                // Find neighbors
                const neighbors = [
                    { x: gx, y: gy - 1, h: 0 }, // N
                    { x: gx + 1, y: gy, h: 1 }, // E
                    { x: gx, y: gy + 1, h: 2 }, // S
                    { x: gx - 1, y: gy, h: 3 }  // W
                ].filter(n => {
                    if (n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE) return false;
                    const tile = grid[n.y][n.x];
                    // Only ground roads for now
                    return tile.buildingType === BuildingType.Road && (tile.variant === 0 || tile.variant === 2 || tile.variant === 3);
                });

                // Intersection Check for Light
                const isIntersection = neighbors.length > 2;

                if (isIntersection) {
                     // Check light
                     // If moving NS (heading 0 or 2) and light is EW
                     const isNS = car.heading === 0 || car.heading === 2;
                     if ((isNS && lightState === 'EW') || (!isNS && lightState === 'NS')) {
                         shouldWait = true;
                     }
                }
                
                if (!shouldWait) {
                    // Filter out reverse direction unless dead end
                    const validMoves = neighbors.filter(n => Math.abs(n.h - car.heading) !== 2);
                    const nextMove = validMoves.length > 0 
                        ? validMoves[Math.floor(Math.random() * validMoves.length)] 
                        : neighbors[0]; // Dead end, turn back
                    
                    if (nextMove) {
                        const [nx, ny, nz] = gridToWorld(nextMove.x, nextMove.y);
                        car.tx = nx;
                        car.ty = nz;
                        car.heading = nextMove.h;
                    }
                }
            } else {
                 // Move towards target
                 if (!car.waiting) {
                    const move = Math.min(dist, car.speed);
                    car.wx += (dx / dist) * move;
                    car.wy += (dy / dist) * move;
                 }
            }
            
            car.waiting = shouldWait;
        });

        // Update Instances
        if (instanceRef.current) {
             carsRef.current.forEach((car, i) => {
                 // Offset for lane (Right hand drive)
                 // Headings: 0=N (z-), 1=E (x+), 2=S (z+), 3=W (x-)
                 let laneOffsetX = 0;
                 let laneOffsetY = 0;
                 const laneWidth = 0.15;
                 
                 if (car.heading === 0) laneOffsetX = laneWidth;
                 if (car.heading === 1) laneOffsetY = laneWidth;
                 if (car.heading === 2) laneOffsetX = -laneWidth;
                 if (car.heading === 3) laneOffsetY = -laneWidth;

                 dummy.position.set(car.wx + laneOffsetX, 0.1, car.wy + laneOffsetY);
                 
                 // Rotation
                 let rot = 0;
                 if (car.heading === 0) rot = Math.PI;
                 if (car.heading === 1) rot = Math.PI/2;
                 if (car.heading === 2) rot = 0;
                 if (car.heading === 3) rot = -Math.PI/2;
                 dummy.rotation.set(0, rot, 0);
                 
                 // Scale based on type
                 let sx = 0.2, sy = 0.15, sz = 0.35;
                 if (car.type === 'truck') { sx = 0.22; sy = 0.25; sz = 0.55; }
                 if (car.type === 'bus') { sx = 0.22; sy = 0.22; sz = 0.65; }
                 if (car.type === 'police') { sx = 0.2; sy = 0.15; sz = 0.35; }

                 dummy.scale.set(sx, sy, sz);
                 
                 dummy.updateMatrix();
                 instanceRef.current!.setMatrixAt(i, dummy.matrix);
                 
                 let c = new THREE.Color(car.color);
                 if (car.type === 'police') {
                     // Flash blue/red
                     const time = state.clock.elapsedTime * 10;
                     if (Math.sin(time) > 0) c.set('#ef4444');
                     else c.set('#3b82f6');
                 }
                 instanceRef.current!.setColorAt(i, c);
             });
             instanceRef.current.instanceMatrix.needsUpdate = true;
             if (instanceRef.current.instanceColor) instanceRef.current.instanceColor.needsUpdate = true;
             instanceRef.current.count = carsRef.current.length;
        }

    });

    return (
        <group>
            {/* Cars */}
            <instancedMesh ref={instanceRef} args={[undefined, undefined, 50]} castShadow>
                <boxGeometry />
                <meshStandardMaterial />
            </instancedMesh>
            
            {/* Traffic Lights */}
            {grid.map((row, y) => row.map((tile, x) => {
                if (tile.buildingType !== BuildingType.Road) return null;
                // Identify intersection
                 const n = y > 0 && getRoadLevel(grid[y-1][x]) !== -1;
                 const s = y < GRID_SIZE-1 && getRoadLevel(grid[y+1][x]) !== -1;
                 const e = x < GRID_SIZE-1 && getRoadLevel(grid[y][x+1]) !== -1;
                 const w = x > 0 && getRoadLevel(grid[y][x-1]) !== -1;
                 if ((n?1:0) + (s?1:0) + (e?1:0) + (w?1:0) > 2) {
                     const [wx, wy, wz] = gridToWorld(x, y);
                     return (
                         <group key={`light-${x}-${y}`} position={[wx, 0, wz]}>
                            {/* Render light based on state. 
                                NS Green = Green light facing N/S traffic.
                             */}
                             <TrafficLight position={[0.4, 0, 0.4]} state={lightState === 'NS' ? 'green' : 'red'} />
                             <TrafficLight position={[-0.4, 0, -0.4]} state={lightState === 'NS' ? 'green' : 'red'} />
                             <TrafficLight position={[-0.4, 0, 0.4]} state={lightState === 'EW' ? 'green' : 'red'} />
                             <TrafficLight position={[0.4, 0, -0.4]} state={lightState === 'EW' ? 'green' : 'red'} />
                         </group>
                     );
                 }
                 return null;
            }))}
        </group>
    );
};


// --- 3. Weather & Environment ---

const WeatherSystem = ({ weather }: { weather: WeatherType }) => {
    const rainCount = 1000;
    const snowCount = 1000;
    
    // Rain Geometry
    const rainRef = useRef<THREE.InstancedMesh>(null);
    useFrame(() => {
        if (rainRef.current && weather === 'rainy') {
            for (let i = 0; i < rainCount; i++) {
                // Get current position
                const matrix = new THREE.Matrix4();
                rainRef.current.getMatrixAt(i, matrix);
                const pos = new THREE.Vector3();
                matrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
                
                pos.y -= 0.5;
                if (pos.y < 0) pos.y = 20;
                
                matrix.setPosition(pos);
                rainRef.current.setMatrixAt(i, matrix);
            }
            rainRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    // Initialize Rain
    useEffect(() => {
        if (rainRef.current) {
            const temp = new THREE.Object3D();
            for (let i = 0; i < rainCount; i++) {
                temp.position.set(getRandomRange(-20, 20), getRandomRange(0, 20), getRandomRange(-20, 20));
                temp.scale.set(0.05, 0.5, 0.05);
                temp.updateMatrix();
                rainRef.current.setMatrixAt(i, temp.matrix);
            }
            rainRef.current.instanceMatrix.needsUpdate = true;
        }
    }, []);

    // Snow System could be similar, simplified for now
    
    if (weather !== 'rainy') return null;

    return (
        <instancedMesh ref={rainRef} args={[undefined, undefined, rainCount]}>
            <boxGeometry />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} />
        </instancedMesh>
    );
};

const EnvironmentEffects = ({ weather }: { weather: WeatherType }) => {
    return (
        <>
            <ambientLight intensity={weather === 'rainy' ? 0.3 : weather === 'snowy' ? 0.8 : 0.6} />
            <directionalLight 
                position={[10, 20, 10]} 
                intensity={weather === 'sunny' ? 1.5 : 0.5} 
                castShadow 
                shadow-mapSize={[1024, 1024]} 
            >
                <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
            </directionalLight>
            
            {/* Fog for atmosphere */}
            <fog attach="fog" args={[
                weather === 'rainy' ? '#1e293b' : weather === 'snowy' ? '#e2e8f0' : '#sky-900', // Fog color
                5, // Near
                weather === 'sunny' ? 50 : 30 // Far
            ]} />
        </>
    );
}

// --- 4. Main Scene ---

interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  population: number;
  weather: WeatherType;
  happiness: number;
  congestion: number;
}

const IsoMap: React.FC<IsoMapProps> = ({ grid, onTileClick, hoveredTool, population, weather, happiness, congestion }) => {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  // Background color based on weather
  const bgColor = weather === 'sunny' ? '#0c4a6e' : weather === 'rainy' ? '#0f172a' : '#cbd5e1';

  return (
    <Canvas shadows dpr={[1, 2]} className="w-full h-full">
      <color attach="background" args={[bgColor]} />
      
      <EnvironmentEffects weather={weather} />
      <WeatherSystem weather={weather} />
      
      <MapControls 
        enableDamping 
        dampingFactor={0.05} 
        minZoom={10} 
        maxZoom={50} 
        maxPolarAngle={Math.PI / 2.5} // Prevent going below ground
      />
      
      <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={20} near={-50} far={200} />

      <group position={[0, -1, 0]}> {/* Lower slightly to center */}
        {grid.map((row, y) =>
          row.map((tile, x) => {
            const [wx, wy, wz] = gridToWorld(x, y);
            const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
            
            // Highlight color
            let highlightColor = "white";
            if (isHovered) {
                if (hoveredTool === BuildingType.None) highlightColor = "#fca5a5"; // Red for bulldoze
                else highlightColor = "#86efac"; // Green for build
            }

            return (
              <group key={`${x}-${y}`} position={[wx, 0, wz]}>
                
                {/* Ground Tile */}
                <mesh 
                  receiveShadow 
                  position={[0, -0.1, 0]} 
                  scale={[0.98, 0.2, 0.98]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTileClick(x, y);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredTile({x, y});
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoveredTile(null);
                    document.body.style.cursor = 'auto';
                  }}
                >
                  <boxGeometry />
                  <meshStandardMaterial 
                    color={isHovered ? highlightColor : "#10b981"} // Base grass color
                    roughness={1}
                  />
                  {/* Selection Outline */}
                  {isHovered && <Outlines thickness={0.05} color="white" />}
                </mesh>

                {/* Building or Road */}
                {tile.buildingType !== BuildingType.None && (
                   tile.buildingType === BuildingType.Road ? (
                       <RoadSystem x={x} y={y} grid={grid} />
                   ) : (
                       <ProceduralBuilding 
                          type={tile.buildingType} 
                          variant={tile.variant || 0} 
                          x={x} y={y} 
                          happiness={happiness}
                          health={tile.health ?? 100}
                        />
                   )
                )}

                {/* Ghost Preview */}
                {isHovered && hoveredTool !== BuildingType.None && tile.buildingType === BuildingType.None && (
                     <mesh position={[0, 0.2, 0]} scale={[0.5, 0.5, 0.5]}>
                         <boxGeometry />
                         <meshStandardMaterial color={BUILDINGS[hoveredTool].color} transparent opacity={0.5} />
                     </mesh>
                )}

              </group>
            );
          })
        )}
      </group>
      
      <TrafficSystem grid={grid} congestion={congestion} />

      {/* Grid Base for aesthetics */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]} receiveShadow>
        <planeGeometry args={[GRID_SIZE + 2, GRID_SIZE + 2]} />
        <meshStandardMaterial color="#064e3b" />
      </mesh>

    </Canvas>
  );
};

export default IsoMap;