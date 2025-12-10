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
      ambientLight: any;
      directionalLight: any;
      fog: any;
      torusGeometry: any;
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
      ambientLight: any;
      directionalLight: any;
      fog: any;
      torusGeometry: any;
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
        {[0, 1, 2].map(i => (
          <mesh key={i} geometry={sphereGeo} position={[Math.random()*0.1, i*0.4, Math.random()*0.1]} scale={0.2}>
            <meshStandardMaterial color="#f3f4f6" transparent opacity={0.6} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

interface BuildingMeshProps {
  type: BuildingType;
  baseColor: string;
  x: number;
  y: number;
  opacity?: number;
  transparent?: boolean;
  happiness?: number;
}

const ProceduralBuilding = React.memo(({ type, baseColor, x, y, opacity = 1, transparent = false, happiness = 100 }: BuildingMeshProps) => {
  const hash = getHash(x, y);
  const variant = Math.floor(hash * 100); // 0-99
  const rotation = Math.floor(hash * 4) * (Math.PI / 2);
  
  // Socio-economic visual states
  const isSlum = happiness < 40;
  const isLuxury = happiness > 80;

  // Color variation
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    // Shift hue and lightness slightly based on hash
    c.offsetHSL(hash * 0.1 - 0.05, 0, hash * 0.2 - 0.1);
    
    if (isSlum && type === BuildingType.Residential) {
      c.multiplyScalar(0.7); // Darker, grungier
      c.offsetHSL(0, -0.2, -0.1);
    } else if (isLuxury && type === BuildingType.Residential) {
      c.offsetHSL(0, 0.2, 0.1); // Brighter, cleaner
    }
    
    return c;
  }, [baseColor, hash, isSlum, isLuxury, type]);

  const mainMat = useMemo(() => new THREE.MeshStandardMaterial({ color, flatShading: true, opacity, transparent, roughness: isLuxury ? 0.2 : 0.8 }), [color, opacity, transparent, isLuxury]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), flatShading: true, opacity, transparent }), [color, opacity, transparent]);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5).offsetHSL(0,0,-0.1), flatShading: true, opacity, transparent }), [color, opacity, transparent]);

  const commonProps = { castShadow: true, receiveShadow: true };
  const yOffset = -0.3;

  return (
    <group rotation={[0, rotation, 0]} position={[0, yOffset, 0]}>
      {(() => {
        switch (type) {
          case BuildingType.Residential:
            // --- SLUM / LOW DESIRABILITY VARIANT ---
            if (isSlum) {
                return (
                    <>
                        <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.2, 0]} scale={[0.8, 0.4, 0.8]} />
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#57534e'})} geometry={boxGeo} position={[0.1, 0.45, 0.1]} scale={[0.5, 0.3, 0.5]} />
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#44403c'})} geometry={boxGeo} position={[-0.2, 0.4, -0.2]} scale={[0.3, 0.2, 0.3]} />
                        {/* Debris */}
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#292524'})} geometry={boxGeo} position={[0.3, 0.1, 0.3]} scale={[0.2, 0.1, 0.2]} rotation={[0, 0.3, 0]} />
                    </>
                );
            }

            // --- LUXURY VARIANT ---
            if (isLuxury) {
                 return (
                    <>
                        {/* Modern Glass Home */}
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#e2e8f0'})} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.7]} />
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#93c5fd', roughness: 0.1, metalness: 0.5})} geometry={boxGeo} position={[0, 0.4, 0.2]} scale={[0.7, 0.4, 0.4]} />
                        <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#1e293b'})} geometry={boxGeo} position={[-0.2, 0.7, 0]} scale={[0.4, 0.2, 0.5]} />
                        {/* Pool */}
                        <mesh material={new THREE.MeshStandardMaterial({color: '#0ea5e9'})} geometry={boxGeo} position={[0.3, 0.05, 0.3]} scale={[0.25, 0.05, 0.3]} />
                    </>
                 );
            }

            // --- STANDARD VARIANTS ---
            if (variant < 33) {
              // Cozy Cottage
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.6]} />
                  <mesh {...commonProps} material={roofMat} geometry={coneGeo} position={[0, 0.75, 0]} scale={[0.6, 0.4, 0.6]} rotation={[0, Math.PI/4, 0]} />
                  <WindowBlock position={[0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <WindowBlock position={[-0.2, 0.3, 0.31]} scale={[0.15, 0.2, 0.05]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.1, 0.32]} scale={[0.15, 0.2, 0.05]} />
                </>
              );
            } else if (variant < 66) {
              // Townhouse
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.5, 0]} scale={[0.5, 1, 0.6]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 1.05, 0]} scale={[0.55, 0.1, 0.65]} />
                  <WindowBlock position={[0, 0.7, 0.31]} scale={[0.3, 0.2, 0.05]} />
                  <WindowBlock position={[0, 0.3, 0.31]} scale={[0.3, 0.2, 0.05]} />
                </>
              );
            } else {
              // Apartments
              return (
                <>
                  <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.6, 0]} scale={[0.8, 1.2, 0.8]} />
                  <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0, 1.25, 0]} scale={[0.7, 0.1, 0.7]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.4, 0.45]} scale={[0.6, 0.05, 0.1]} />
                  <mesh {...commonProps} material={accentMat} geometry={boxGeo} position={[0, 0.8, 0.45]} scale={[0.6, 0.05, 0.1]} />
                  <WindowBlock position={[0.15, 0.6, 0.41]} scale={[0.2, 0.25, 0.05]} />
                  <WindowBlock position={[-0.15, 0.6, 0.41]} scale={[0.2, 0.25, 0.05]} />
                  <WindowBlock position={[0.15, 1.0, 0.41]} scale={[0.2, 0.25, 0.05]} />
                  <WindowBlock position={[-0.15, 1.0, 0.41]} scale={[0.2, 0.25, 0.05]} />
                </>
              );
            }

          case BuildingType.MixedUse:
             // Residential on top of Commercial
             return (
                 <>
                   {/* Commercial Base */}
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#4f46e5'})} geometry={boxGeo} position={[0, 0.25, 0]} scale={[0.9, 0.5, 0.9]} />
                   <WindowBlock position={[0, 0.25, 0.46]} scale={[0.8, 0.3, 0.05]} color="#fbbf24" /> {/* Shop window */}
                   
                   {/* Residential Tower */}
                   <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[-0.1, 0.85, -0.1]} scale={[0.6, 0.7, 0.6]} />
                   <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.1, 1.2, -0.1]} scale={[0.65, 0.05, 0.65]} />
                   
                   <WindowBlock position={[-0.1, 0.8, 0.21]} scale={[0.4, 0.15, 0.05]} />
                   <WindowBlock position={[-0.1, 1.0, 0.21]} scale={[0.4, 0.15, 0.05]} />
                   
                   {/* Rooftop Garden */}
                   <mesh material={new THREE.MeshStandardMaterial({color: '#22c55e'})} geometry={boxGeo} position={[0.3, 0.55, 0.3]} scale={[0.25, 0.1, 0.25]} />
                 </>
             )

          case BuildingType.Commercial:
            // Standard Shop
            return (
              <>
                <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                <WindowBlock position={[0, 0.3, 0.41]} scale={[0.8, 0.4, 0.05]} color="#93c5fd" />
                {/* Awning */}
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({ color: hash > 0.5 ? '#ef4444' : '#3b82f6' })} geometry={boxGeo} position={[0, 0.55, 0.5]} scale={[0.9, 0.1, 0.2]} rotation={[Math.PI/6, 0, 0]} />
                {/* HVAC on roof */}
                <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#6b7280'})} geometry={boxGeo} position={[0.2, 0.85, -0.2]} scale={[0.2, 0.1, 0.2]} />
              </>
            );

          case BuildingType.Industrial:
            // Factory
            return (
              <>
                <mesh {...commonProps} material={mainMat} geometry={boxGeo} position={[0, 0.4, 0]} scale={[0.9, 0.8, 0.8]} />
                <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[-0.2, 0.9, 0]} scale={[0.4, 0.2, 0.8]} rotation={[0,0,Math.PI/4]} />
                <mesh {...commonProps} material={roofMat} geometry={boxGeo} position={[0.2, 0.9, 0]} scale={[0.4, 0.2, 0.8]} rotation={[0,0,Math.PI/4]} />
                <SmokeStack position={[0.3, 0.4, 0.3]} />
              </>
            );
            
          case BuildingType.PowerPlant:
            // Big industrial complex with cooling tower
            return (
                <>
                  {/* Main Reactor Building */}
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#475569'})} geometry={boxGeo} position={[-0.2, 0.5, -0.1]} scale={[0.5, 1.0, 0.6]} />
                   {/* Red Stripes on Chimney */}
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#dc2626'})} geometry={cylinderGeo} position={[-0.2, 1.1, -0.1]} scale={[0.08, 0.4, 0.08]} />
                   
                   {/* Cooling Tower (Truncated Cone) */}
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#cbd5e1'})} geometry={cylinderGeo} position={[0.25, 0.6, 0.2]} scale={[0.3, 1.2, 0.3]} />
                   
                   {/* Electrical Substation things */}
                   <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#94a3b8'})} geometry={boxGeo} position={[0.2, 0.2, -0.3]} scale={[0.3, 0.4, 0.3]} />
                   
                   <SmokeStack position={[0.25, 1.2, 0.2]} color="#ffffff" />
                </>
            );

          case BuildingType.WaterPump:
             // Water Tower visuals
             return (
                 <>
                    {/* Legs */}
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#64748b'})} geometry={cylinderGeo} position={[-0.2, 0.4, -0.2]} scale={[0.05, 0.8, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#64748b'})} geometry={cylinderGeo} position={[0.2, 0.4, -0.2]} scale={[0.05, 0.8, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#64748b'})} geometry={cylinderGeo} position={[-0.2, 0.4, 0.2]} scale={[0.05, 0.8, 0.05]} />
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#64748b'})} geometry={cylinderGeo} position={[0.2, 0.4, 0.2]} scale={[0.05, 0.8, 0.05]} />
                    
                    {/* Tank */}
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#38bdf8', roughness: 0.3, metalness: 0.2})} geometry={sphereGeo} position={[0, 1.0, 0]} scale={[0.5, 0.4, 0.5]} />
                    
                    {/* Pipe */}
                    <mesh {...commonProps} material={new THREE.MeshStandardMaterial({color: '#475569'})} geometry={cylinderGeo} position={[0, 0.4, 0]} scale={[0.1, 0.8, 0.1]} />
                 </>
             )

          case BuildingType.Park:
            const treeCount = 1 + Math.floor(hash * 3);
            const positions = [[-0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [0.2, -0.2]];
            
            return (
              <group position={[0, -yOffset - 0.29, 0]}> 
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <planeGeometry args={[0.9, 0.9]} />
                    <meshStandardMaterial color="#86efac" />
                </mesh>
                
                {variant < 30 && (
                    <group position={[0,0.05,0]}>
                        <mesh material={new THREE.MeshStandardMaterial({color: '#cbd5e1'})} geometry={cylinderGeo} scale={[0.4, 0.1, 0.4]} castShadow receiveShadow />
                        <mesh material={new THREE.MeshStandardMaterial({color: '#3b82f6', roughness: 0.1})} geometry={cylinderGeo} position={[0, 0.06, 0]} scale={[0.3, 0.05, 0.3]} />
                    </group>
                )}

                {Array.from({length: treeCount}).map((_, i) => {
                    const pos = positions[i % positions.length];
                    const scale = 0.5 + getHash(x+i, y-i) * 0.5;
                    const treeColor = new THREE.Color("#166534").offsetHSL(0, 0, getHash(x,y+i)*0.2);
                    return (
                    <group key={i} position={[pos[0], 0, pos[1]]} scale={scale} rotation={[0, getHash(i,x)*Math.PI, 0]}>
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: '#78350f' })} geometry={cylinderGeo} position={[0, 0.15, 0]} scale={[0.1, 0.3, 0.1]} />
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: treeColor, flatShading: true })} geometry={coneGeo} position={[0, 0.4, 0]} scale={[0.4, 0.5, 0.4]} />
                        <mesh castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: treeColor, flatShading: true })} geometry={coneGeo} position={[0, 0.65, 0]} scale={[0.3, 0.4, 0.3]} />
                    </group>
                    )
                })}
              </group>
            );
          case BuildingType.Road:
             return null;
          default:
            return null;
        }
      })()}
    </group>
  );
});

// --- 2. Dynamic Systems (Traffic, Citizens, Environment) ---

const carColors = ['#ef4444', '#3b82f6', '#eab308', '#ffffff', '#1f2937', '#f97316'];

const TrafficSystem = ({ grid }: { grid: Grid }) => {
  const roadTiles = useMemo(() => {
    const roads: {x: number, y: number}[] = [];
    grid.forEach(row => row.forEach(tile => {
      if (tile.buildingType === BuildingType.Road) roads.push({x: tile.x, y: tile.y});
    }));
    return roads;
  }, [grid]);

  const carCount = Math.min(roadTiles.length, 30);
  const carsRef = useRef<THREE.InstancedMesh>(null);
  const carsState = useRef<Float32Array>(new Float32Array(0)); 
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => new Float32Array(0), []);

  useEffect(() => {
    if (roadTiles.length < 2) return;
    carsState.current = new Float32Array(carCount * 6);
    const newColors = new Float32Array(carCount * 3);

    for (let i = 0; i < carCount; i++) {
      const startNode = roadTiles[Math.floor(Math.random() * roadTiles.length)];
      carsState.current[i*6 + 0] = startNode.x;
      carsState.current[i*6 + 1] = startNode.y;
      carsState.current[i*6 + 2] = startNode.x;
      carsState.current[i*6 + 3] = startNode.y;
      carsState.current[i*6 + 4] = 1; // force pick new target
      carsState.current[i*6 + 5] = getRandomRange(0.01, 0.03); // speed

      const color = new THREE.Color(carColors[Math.floor(Math.random() * carColors.length)]);
      newColors[i*3] = color.r; newColors[i*3+1] = color.g; newColors[i*3+2] = color.b;
    }

    if (carsRef.current) {
        carsRef.current.instanceColor = new THREE.InstancedBufferAttribute(newColors, 3);
    }
  }, [roadTiles, carCount]);

  useFrame(() => {
    if (!carsRef.current || roadTiles.length < 2 || carsState.current.length === 0) return;

    for (let i = 0; i < carCount; i++) {
      const idx = i * 6;
      let curX = carsState.current[idx];
      let curY = carsState.current[idx+1];
      let tarX = carsState.current[idx+2];
      let tarY = carsState.current[idx+3];
      let progress = carsState.current[idx+4];
      const speed = carsState.current[idx+5];

      progress += speed;

      if (progress >= 1) {
        curX = tarX;
        curY = tarY;
        progress = 0;
        
        const neighbors = roadTiles.filter(t => 
          (Math.abs(t.x - curX) === 1 && t.y === curY) || 
          (Math.abs(t.y - curY) === 1 && t.x === curX)
        );

        if (neighbors.length > 0) {
            // Simple pathfinding: avoid going back immediately
            const valid = neighbors.length > 1 
                ? neighbors.filter(n => Math.abs(n.x - carsState.current[idx]) > 0.1 || Math.abs(n.y - carsState.current[idx+1]) > 0.1)
                : neighbors;
            
            const next = valid.length > 0 
                ? valid[Math.floor(Math.random() * valid.length)]
                : neighbors[0];
            
            tarX = next.x;
            tarY = next.y;
        } else {
            const rnd = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            curX = rnd.x; curY = rnd.y; tarX = rnd.x; tarY = rnd.y;
        }
      }

      carsState.current[idx] = curX;
      carsState.current[idx+1] = curY;
      carsState.current[idx+2] = tarX;
      carsState.current[idx+3] = tarY;
      carsState.current[idx+4] = progress;

      // Interpolate position
      const gx = MathUtils.lerp(curX, tarX, progress);
      const gy = MathUtils.lerp(curY, tarY, progress);

      // Determine driving side offset
      const dx = tarX - curX;
      const dy = tarY - curY;
      const angle = Math.atan2(dy, dx);
      
      // Offset to right side relative to movement
      const offsetAmt = 0.15;
      // Normals: (-dy, dx)
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const offX = (-dy/len) * offsetAmt;
      const offY = (dx/len) * offsetAmt;

      const [wx, _, wz] = gridToWorld(gx + offX, gy + offY);

      // Road surface is approx -0.3. Car height 0.15.
      dummy.position.set(wx, -0.3 + 0.075, wz);
      dummy.rotation.set(0, -angle, 0);
      // Car dimensions (Length(X), Height(Y), Width(Z) assuming 0 rotation aligns with X)
      dummy.scale.set(0.5, 0.15, 0.3); 
      
      dummy.updateMatrix();
      carsRef.current.setMatrixAt(i, dummy.matrix);
    }
    carsRef.current.instanceMatrix.needsUpdate = true;
  });

  if (roadTiles.length < 2) return null;

  return (
    <instancedMesh ref={carsRef} args={[boxGeo, undefined, carCount]} castShadow>
      <meshStandardMaterial roughness={0.5} metalness={0.3} />
    </instancedMesh>
  );
};

const clothesColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

const PopulationSystem = ({ population, grid }: { population: number, grid: Grid }) => {
    const agentCount = Math.min(Math.floor(population / 2), 300); 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    // Find tiles where people can walk (Roads, Parks, empty ground)
    const walkableTiles = useMemo(() => {
        const tiles: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
          if (tile.buildingType === BuildingType.Road || tile.buildingType === BuildingType.Park || tile.buildingType === BuildingType.None) {
            tiles.push({x: tile.x, y: tile.y});
          }
        }));
        return tiles;
    }, [grid]);
    
    const agentsState = useRef<Float32Array>(new Float32Array(0));
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    useEffect(() => {
        if (agentCount === 0 || walkableTiles.length === 0) return;
        agentsState.current = new Float32Array(agentCount * 6);
        const newColors = new Float32Array(agentCount * 3);

        for(let i=0; i<agentCount; i++) {
            const t = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            // Spawn with random offset in tile
            const x = t.x + getRandomRange(-0.4, 0.4);
            const y = t.y + getRandomRange(-0.4, 0.4);

            agentsState.current[i*6+0] = x;
            agentsState.current[i*6+1] = y;
            
            // Initial target
            const tt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            agentsState.current[i*6+2] = tt.x + getRandomRange(-0.4, 0.4);
            agentsState.current[i*6+3] = tt.y + getRandomRange(-0.4, 0.4);
            
            agentsState.current[i*6+4] = getRandomRange(0.005, 0.015); // speed
            agentsState.current[i*6+5] = Math.random() * Math.PI * 2; // anim

            const c = new THREE.Color(clothesColors[Math.floor(Math.random() * clothesColors.length)]);
            newColors[i*3] = c.r; newColors[i*3+1] = c.g; newColors[i*3+2] = c.b;
        }

        if (meshRef.current) {
            meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(newColors, 3);
        }
    }, [agentCount, walkableTiles]);

    useFrame((state) => {
        if (!meshRef.current || agentCount === 0 || agentsState.current.length === 0) return;
        const time = state.clock.elapsedTime;

        for(let i=0; i<agentCount; i++) {
            const idx = i*6;
            let x = agentsState.current[idx];
            let y = agentsState.current[idx+1];
            let tx = agentsState.current[idx+2];
            let ty = agentsState.current[idx+3];
            const speed = agentsState.current[idx+4];
            const animOffset = agentsState.current[idx+5];

            const dx = tx - x;
            const dy = ty - y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 0.1) {
                // Pick new random target from walkable
                if (walkableTiles.length > 0) {
                    const tt = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
                    tx = tt.x + getRandomRange(-0.4, 0.4);
                    ty = tt.y + getRandomRange(-0.4, 0.4);
                    agentsState.current[idx+2] = tx;
                    agentsState.current[idx+3] = ty;
                }
            } else {
                x += (dx/dist) * speed;
                y += (dy/dist) * speed;
                agentsState.current[idx] = x;
                agentsState.current[idx+1] = y;
            }

            const [wx, _, wz] = gridToWorld(x, y);

            // Walking bounce
            const bounce = Math.abs(Math.sin(time * 10 + animOffset)) * 0.03;

            // Person dimensions
            const height = 0.2;
            const width = 0.08;
            // Ground level approx -0.3 to -0.4
            const groundY = -0.35; 

            dummy.position.set(wx, groundY + height/2 + bounce, wz);
            dummy.rotation.set(0, -Math.atan2(dy, dx), 0);
            dummy.scale.set(width, height, width);
            
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (agentCount === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[boxGeo, undefined, agentCount]} castShadow>
            <meshStandardMaterial roughness={0.8} />
        </instancedMesh>
    )
};

// --- Weather System ---

const WeatherSystem = ({ weather }: { weather: WeatherType }) => {
  const particleCount = weather === 'sunny' ? 0 : weather === 'rainy' ? 1000 : 500;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Initialize particles in a large box above the city
  const particles = useMemo(() => {
    return Array.from({ length: 1000 }).map(() => ({
      x: getRandomRange(-20, 20),
      y: getRandomRange(0, 20),
      z: getRandomRange(-20, 20),
      speed: getRandomRange(0.2, 0.5)
    }));
  }, []);

  useFrame(() => {
    if (!meshRef.current || weather === 'sunny') return;
    
    particles.forEach((p, i) => {
      if (i >= particleCount) return;
      
      // Fall down
      p.y -= p.speed;
      if (weather === 'snowy') {
        p.x += Math.sin(Date.now() * 0.001 + i) * 0.01; // Drift
        p.y -= p.speed * 0.1; // Fall slower
      }

      // Reset
      if (p.y < -1) {
        p.y = 20;
        p.x = getRandomRange(-20, 20);
        p.z = getRandomRange(-20, 20);
      }
      
      dummy.position.set(p.x, p.y, p.z);
      
      if (weather === 'rainy') {
        dummy.scale.set(0.02, 0.4, 0.02);
      } else {
        dummy.scale.set(0.1, 0.1, 0.1);
      }
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (weather === 'sunny') return null;

  const mat = weather === 'rainy' 
    ? new THREE.MeshBasicMaterial({ color: '#a1a1aa', transparent: true, opacity: 0.6 })
    : new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });

  const geo = weather === 'rainy' ? boxGeo : sphereGeo;

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, particleCount]} />
  );
};

// Clouds & Birds (Modified for weather)
const Cloud = ({ position, scale, speed, color }: { position: [number, number, number], scale: number, speed: number, color: string }) => {
    const group = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (group.current) {
            group.current.position.x += speed * delta;
            if (group.current.position.x > GRID_SIZE * 1.5) group.current.position.x = -GRID_SIZE * 1.5;
        }
    });

    const bubbles = useMemo(() => Array.from({length: 5 + Math.random() * 5}).map(() => ({
        pos: [getRandomRange(-1,1), getRandomRange(-0.5, 0.5), getRandomRange(-1,1)] as [number, number, number],
        scale: getRandomRange(0.5, 1.2)
    })), []);

    return (
        <group ref={group} position={position} scale={scale}>
            {bubbles.map((b, i) => (
                <mesh key={i} geometry={sphereGeo} position={b.pos} scale={b.scale} castShadow>
                    <meshStandardMaterial color={color} flatShading opacity={0.9} transparent />
                </mesh>
            ))}
        </group>
    )
}

const Bird = ({ position, speed, offset }: { position: [number, number, number], speed: number, offset: number }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
            const time = state.clock.elapsedTime + offset;
            ref.current.position.x = position[0] + Math.sin(time * speed) * GRID_SIZE;
            ref.current.position.z = position[1] + Math.cos(time * speed) * GRID_SIZE/2;
            ref.current.rotation.y = -time * speed + Math.PI;
            ref.current.scale.y = 1 + Math.sin(time * 15) * 0.3;
        }
    });

    return (
        <group ref={ref} position={[position[0], position[2], position[1]]}>
            <mesh geometry={boxGeo} scale={[0.2, 0.05, 0.05]} position={[0.1,0,0]} rotation={[0, Math.PI/4, 0]}><meshBasicMaterial color="#333" /></mesh>
            <mesh geometry={boxGeo} scale={[0.2, 0.05, 0.05]} position={[-0.1,0,0]} rotation={[0, -Math.PI/4, 0]}><meshBasicMaterial color="#333" /></mesh>
        </group>
    )
}

const EnvironmentEffects = ({ weather }: { weather: WeatherType }) => {
    const cloudColor = weather === 'sunny' ? 'white' : '#64748b'; // Gray for rain/snow
    const birdVisible = weather !== 'rainy';

    return (
        <group raycast={() => null}>
             {/* Clouds */}
            <Cloud position={[-12, 8, 4]} scale={1.5} speed={0.3} color={cloudColor} />
            <Cloud position={[5, 9, -8]} scale={1.2} speed={0.5} color={cloudColor} />
            <Cloud position={[15, 7, 10]} scale={1.8} speed={0.2} color={cloudColor} />
            
            {/* Birds - hide in rain */}
            {birdVisible && (
              <group position={[0, 0, 0]} scale={0.8}>
                  <Bird position={[0, 0, 10]} speed={0.6} offset={0} />
                  <Bird position={[0, 0, 10]} speed={0.6} offset={1.2} />
                  <Bird position={[0, 0, 10]} speed={0.6} offset={2.5} />
              </group>
            )}

            {/* Water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                <planeGeometry args={[GRID_SIZE * 4, GRID_SIZE * 4]} />
                <meshStandardMaterial color={weather === 'rainy' ? '#1e3a8a' : '#3b82f6'} roughness={0.1} metalness={0.5} opacity={0.8} transparent />
            </mesh>
            
            {/* Fog based on weather */}
            {weather === 'rainy' && <fog attach="fog" args={['#374151', 10, 50]} />}
            {weather === 'snowy' && <fog attach="fog" args={['#e0f2fe', 10, 40]} />}
        </group>
    )
};


// --- 3. Main Map Component ---

const RoadMarkings = React.memo(({ x, y, grid, yOffset }: { x: number; y: number; grid: Grid; yOffset: number }) => {
  const lineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.8 }), []);
  const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), []);
  const trackMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.15 }), []);
  
  // Geometries
  const straightGeo = useMemo(() => new THREE.PlaneGeometry(0.12, 1), []);
  const curveGeo = useMemo(() => new THREE.RingGeometry(0.44, 0.56, 24, 1, Math.PI, Math.PI/2), []);
  
  // Tracks
  const trackStraightGeo = useMemo(() => new THREE.PlaneGeometry(0.1, 1), []);
  const trackPatchGeo = useMemo(() => new THREE.CircleGeometry(0.35, 12), []); // Intersection dirt

  // Sidewalks
  const sidewalkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.8 }), []);
  const sidewalkGeo = useMemo(() => new THREE.PlaneGeometry(1, 0.15), []); // Long strip (horizontal relative to texture)
  
  const curbCornerGeo = useMemo(() => {
    const size = 0.25; 
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(size, 0);
    shape.lineTo(size, size);
    shape.lineTo(0, size);
    shape.lineTo(0, 0);
    
    // Create hole for the rounded road part
    const hole = new THREE.Path();
    hole.moveTo(size, 0);
    // Draw arc from (size,0) to (0,size) with center at (size,size)
    hole.absarc(size, size, size, Math.PI * 1.5, Math.PI, true);
    shape.holes.push(hole);
    
    return new THREE.ShapeGeometry(shape);
  }, []);

  // Zebra Crosswalk
  const zebraGeo = useMemo(() => new THREE.PlaneGeometry(0.06, 0.3), []);

  // Helpers
  const isRoad = (gx: number, gy: number) => {
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return false;
    return grid[gy][gx].buildingType === BuildingType.Road;
  };

  const u = isRoad(x, y - 1);
  const d = isRoad(x, y + 1);
  const l = isRoad(x - 1, y);
  const r = isRoad(x + 1, y);

  const neighbors = (u?8:0) + (d?4:0) + (l?2:0) + (r?1:0);
  const neighborCount = (u?1:0) + (d?1:0) + (l?1:0) + (r?1:0);
  
  const hash = getHash(x, y);
  const showManhole = hash > 0.9 && neighborCount <= 2; 

  const renderCrosswalk = (rotation: number, offsetX: number, offsetY: number) => {
     return (
       <group position={[offsetX, offsetY, 0.006]} rotation={[0,0,rotation]}>
         {[-0.1, 0, 0.1].map((off, i) => (
            <mesh key={i} position={[off, 0, 0]} geometry={zebraGeo} material={whiteMat} />
         ))}
       </group>
     )
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
      {/* 1. Tracks/Dirt Layer (Lowest) */}
      {(neighbors === 12 || neighbors === 3 || neighborCount === 1) && (
        <>
           {(neighbors & 12) === 12 && ( // Vertical
             <>
               <mesh position={[-0.2, 0, 0.001]} geometry={trackStraightGeo} material={trackMat} />
               <mesh position={[0.2, 0, 0.001]} geometry={trackStraightGeo} material={trackMat} />
             </>
           )}
           {(neighbors & 3) === 3 && ( // Horizontal
             <>
               <mesh position={[0, -0.2, 0.001]} rotation={[0,0,Math.PI/2]} geometry={trackStraightGeo} material={trackMat} />
               <mesh position={[0, 0.2, 0.001]} rotation={[0,0,Math.PI/2]} geometry={trackStraightGeo} material={trackMat} />
             </>
           )}
        </>
      )}
      
      {neighborCount > 2 && (
        <mesh position={[0, 0, 0.001]} geometry={trackPatchGeo} material={trackMat} opacity={0.3} />
      )}

      {/* 2. Sidewalks (Raised Curb) */}
      {!u && <mesh position={[0, 0.425, 0.02]} geometry={sidewalkGeo} material={sidewalkMat} />}
      {!d && <mesh position={[0, -0.425, 0.02]} geometry={sidewalkGeo} material={sidewalkMat} />}
      {!l && <mesh position={[-0.425, 0, 0.02]} rotation={[0,0,Math.PI/2]} geometry={sidewalkGeo} material={sidewalkMat} />}
      {!r && <mesh position={[0.425, 0, 0.02]} rotation={[0,0,Math.PI/2]} geometry={sidewalkGeo} material={sidewalkMat} />}

      {/* 3. Intersection Corner Curbs (Round the inner corners of intersections) */}
      {u && l && <mesh position={[-0.5, 0.5, 0.02]} rotation={[0,0,-Math.PI/2]} geometry={curbCornerGeo} material={sidewalkMat} />}
      {u && r && <mesh position={[0.5, 0.5, 0.02]} rotation={[0,0,Math.PI]} geometry={curbCornerGeo} material={sidewalkMat} />}
      {d && l && <mesh position={[-0.5, -0.5, 0.02]} rotation={[0,0,0]} geometry={curbCornerGeo} material={sidewalkMat} />}
      {d && r && <mesh position={[0.5, -0.5, 0.02]} rotation={[0,0,Math.PI/2]} geometry={curbCornerGeo} material={sidewalkMat} />}

      {/* 4. Yellow Lines */}
      {/* Straight Vertical */}
      {neighbors === 12 && <mesh position={[0, 0, 0.005]} geometry={straightGeo} material={lineMat} />}
      {/* Straight Horizontal */}
      {neighbors === 3 && <mesh position={[0, 0, 0.005]} rotation={[0,0,Math.PI/2]} geometry={straightGeo} material={lineMat} />}

      {/* Corners */}
      {neighbors === 9 && <mesh position={[0.5, 0.5, 0.005]} geometry={curveGeo} material={lineMat} />}
      {neighbors === 10 && <mesh position={[-0.5, 0.5, 0.005]} rotation={[0,0,Math.PI/2]} geometry={curveGeo} material={lineMat} />}
      {neighbors === 6 && <mesh position={[-0.5, -0.5, 0.005]} rotation={[0,0,Math.PI]} geometry={curveGeo} material={lineMat} />}
      {neighbors === 5 && <mesh position={[0.5, -0.5, 0.005]} rotation={[0,0,-Math.PI/2]} geometry={curveGeo} material={lineMat} />}

      {/* 5. Crosswalks (Intersections & T-Junctions) */}
      {(neighborCount > 2) && (
         <>
            {u && renderCrosswalk(0, 0, 0.35)}
            {d && renderCrosswalk(0, 0, -0.35)}
            {l && renderCrosswalk(Math.PI/2, -0.35, 0)}
            {r && renderCrosswalk(Math.PI/2, 0.35, 0)}
         </>
      )}

      {/* Manhole */}
      {showManhole && (
          <group position={[0, 0, 0.006]}>
             <mesh>
                <circleGeometry args={[0.12, 12]} />
                <meshStandardMaterial color="#4b5563" roughness={0.8} metalness={0.6} />
             </mesh>
             <mesh position={[0,0,0.001]}>
                <ringGeometry args={[0.08, 0.09, 12]} />
                <meshBasicMaterial color="#374151" />
             </mesh>
          </group>
      )}
    </group>
  );
});

interface GroundTileProps {
    type: BuildingType;
    x: number;
    y: number;
    grid: Grid;
    onHover: (x: number, y: number) => void;
    onLeave: () => void;
    onClick: (x: number, y: number) => void;
}

// Ground Tile: Handles pointer events and forms base terrain
const GroundTile = React.memo(({ type, x, y, grid, onHover, onLeave, onClick }: GroundTileProps) => {
  const [wx, _, wz] = gridToWorld(x, y);
  
  let color = '#10b981';
  // Base level for tiles, slightly varying
  let topY = -0.3; 
  let thickness = 0.5;
  
  if (type === BuildingType.None) {
    const noise = getHash(x, y);
    color = noise > 0.7 ? '#059669' : noise > 0.3 ? '#10b981' : '#34d399';
    topY = -0.3 - noise * 0.1; // Slight height variation for grass
  } else if (type === BuildingType.Road) {
    color = '#374151';
    topY = -0.29; // slightly higher
  } else {
    color = '#d1d5db'; // concrete base
    topY = -0.28;
  }

  const centerY = topY - thickness/2;

  return (
    <mesh 
        position={[wx, centerY, wz]} 
        receiveShadow castShadow
        onPointerEnter={(e) => { e.stopPropagation(); onHover(x, y); }}
        onPointerOut={(e) => { e.stopPropagation(); onLeave(); }}
        onPointerDown={(e) => {
            e.stopPropagation();
            if (e.button === 0) onClick(x, y);
        }}
    >
      <boxGeometry args={[1, thickness, 1]} />
      <meshStandardMaterial color={color} flatShading roughness={1} />
      {type === BuildingType.Road && <RoadMarkings x={x} y={y} grid={grid} yOffset={thickness / 2 + 0.001} />}
    </mesh>
  );
});

// Selection/Hover Cursor
const Cursor = ({ x, y, color }: { x: number, y: number, color: string }) => {
  const [wx, _, wz] = gridToWorld(x, y);
  return (
    <mesh position={[wx, -0.25, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthTest={false} />
      <Outlines thickness={0.05} color="white" />
    </mesh>
  );
};


interface IsoMapProps {
  grid: Grid;
  onTileClick: (x: number, y: number) => void;
  hoveredTool: BuildingType;
  population: number;
  weather: WeatherType;
  happiness: number;
}

const IsoMap: React.FC<IsoMapProps> = ({ grid, onTileClick, hoveredTool, population, weather, happiness }) => {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  const handleHover = useCallback((x: number, y: number) => {
    setHoveredTile({ x, y });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredTile(null);
  }, []);

  // Preview Logic
  const showPreview = hoveredTile && grid[hoveredTile.y][hoveredTile.x].buildingType === BuildingType.None && hoveredTool !== BuildingType.None;
  const previewColor = showPreview ? BUILDINGS[hoveredTool].color : 'white';
  const isBulldoze = hoveredTool === BuildingType.None;
  
  const previewPos = hoveredTile ? gridToWorld(hoveredTile.x, hoveredTile.y) : [0,0,0];

  // Dynamic Lighting props
  const lightIntensity = weather === 'sunny' ? 2 : weather === 'rainy' ? 0.5 : 1;
  const lightColor = weather === 'sunny' ? '#fffbeb' : weather === 'rainy' ? '#e2e8f0' : '#f0f9ff';
  const ambientIntensity = weather === 'sunny' ? 0.5 : 0.8;
  const bgClass = weather === 'sunny' ? 'bg-sky-900' : weather === 'rainy' ? 'bg-slate-900' : 'bg-slate-800';

  return (
    <div className={`absolute inset-0 touch-none transition-colors duration-1000 ${bgClass}`}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <OrthographicCamera makeDefault zoom={45} position={[20, 20, 20]} near={-100} far={200} />
        
        <MapControls 
          enableRotate={true}
          enableZoom={true}
          minZoom={20}
          maxZoom={120}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={0.1}
          target={[0,-0.5,0]}
        />

        <ambientLight intensity={ambientIntensity} color="#cceeff" />
        <directionalLight
          castShadow
          position={[15, 20, 10]}
          intensity={lightIntensity}
          color={lightColor}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15} shadow-camera-right={15}
          shadow-camera-top={15} shadow-camera-bottom={-15}
        >
        </directionalLight>
        <Environment preset={weather === 'sunny' ? 'city' : 'park'} />

        <EnvironmentEffects weather={weather} />
        <WeatherSystem weather={weather} />

        <group>
          {grid.map((row, y) =>
            row.map((tile, x) => {
              // Calculate world position once per tile
              const [wx, _, wz] = gridToWorld(x, y);
              
              return (
              <React.Fragment key={`${x}-${y}`}>
                <GroundTile 
                    type={tile.buildingType} 
                    x={x} y={y} 
                    grid={grid}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    onClick={onTileClick}
                />
                
                {/* Building visual - apply world position to group to align with ground tile */}
                <group position={[wx, 0, wz]} raycast={() => null}>
                    {tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Road && (
                      <ProceduralBuilding 
                        type={tile.buildingType} 
                        baseColor={BUILDINGS[tile.buildingType].color} 
                        x={x} y={y}
                        happiness={happiness}
                      />
                    )}
                </group>
              </React.Fragment>
            )})
          )}

          {/* Visual Elements - disable pointer events */}
          <group raycast={() => null}>
            <TrafficSystem grid={grid} />
            <PopulationSystem population={population} grid={grid} />

            {/* Placement Preview */}
            {showPreview && hoveredTile && (
              <group position={[previewPos[0], 0, previewPos[2]]}>
                <Float speed={3} rotationIntensity={0} floatIntensity={0.1} floatingRange={[0, 0.1]}>
                  <ProceduralBuilding 
                    type={hoveredTool} 
                    baseColor={previewColor} 
                    x={hoveredTile.x} 
                    y={hoveredTile.y} 
                    transparent 
                    opacity={0.7}
                    happiness={100} 
                  />
                </Float>
              </group>
            )}

            {/* Highlight */}
            {hoveredTile && (
              <Cursor 
                x={hoveredTile.x} 
                y={hoveredTile.y} 
                color={isBulldoze ? '#ef4444' : (showPreview ? '#ffffff' : '#000000')} 
              />
            )}
          </group>
        </group>
        
        <SoftShadows size={10} samples={8} />
      </Canvas>
    </div>
  );
};

export default IsoMap;
