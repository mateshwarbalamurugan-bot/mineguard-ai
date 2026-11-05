import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { RotateCcw, Compass, Info, Check, TriangleAlert, CircleHelp, CircleX } from 'lucide-react';
import type { Zone } from '../models/types';
import { useMineStore } from '../store/useMineStore';

interface Mine3DSceneProps {
  zones: Zone[];
  selectedZoneId?: string | null;
  onSelect: (zoneId: string) => void;
  height?: number | string;
  className?: string;
  showControls?: boolean;
  layers?: {
    sensors?: boolean;
    hazards?: boolean;
    checkpoints?: boolean;
    unknown?: boolean;
  };
}

// 3D coordinates for the fictional Kestrel Ridge underground network
export interface Zone3DPosition {
  id: string;
  name: string;
  pos: [number, number, number];
  depthMeters: number;
  level: string;
  description: string;
}

export const ZONE_COORDINATES: Record<string, Zone3DPosition> = {
  shaft: {
    id: 'shaft',
    name: 'Main Shaft',
    pos: [0, -2, 0],
    depthMeters: 120,
    level: 'Surface to Level 3',
    description: 'Vertical hoisting and intake airway column',
  },
  'tunnel-a': {
    id: 'tunnel-a',
    name: 'Tunnel A',
    pos: [-11, -4, 7],
    depthMeters: 160,
    level: 'Level 1 North Drift',
    description: 'Intake ventilation and active haulage route',
  },
  'tunnel-b': {
    id: 'tunnel-b',
    name: 'Tunnel B',
    pos: [14, -8, 5],
    depthMeters: 240,
    level: 'Level 2 East Working',
    description: 'Longwall development and telemetry junction',
  },
  'tunnel-c': {
    id: 'tunnel-c',
    name: 'Tunnel C',
    pos: [5, -15, -11],
    depthMeters: 360,
    level: 'Level 3 Deep Workings',
    description: 'Legacy drift with partial scan coverage',
  },
  pump: {
    id: 'pump',
    name: 'Pumping Station',
    pos: [22, -10, 8],
    depthMeters: 280,
    level: 'Level 2 Low Sump',
    description: 'Main dewatering sump and pump banks',
  },
  exit: {
    id: 'exit',
    name: 'Emergency Exit',
    pos: [16, -3, -9],
    depthMeters: 140,
    level: 'Secondary Adit Escapement',
    description: 'Overland escape way and return air crosscut',
  },
};

const STATE_COLORS: Record<string, number> = {
  KNOWN: 0x10b981,     // Emerald
  UNCERTAIN: 0xf59e0b, // Amber
  UNKNOWN: 0x8b5cf6,   // Indeterminate slate/purple
  ALERT: 0xef4444,     // Crimson
};

export function Mine3DScene({
  zones,
  selectedZoneId,
  onSelect,
  height = '100%',
  className = '',
  showControls = true,
  layers = { sensors: true, hazards: true, checkpoints: true, unknown: true },
}: Mine3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredZone, setHoveredZone] = useState<Zone3DPosition | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [viewPreset, setViewPreset] = useState<'isometric' | 'depth' | 'plan'>('isometric');

  const reducedMotion = useMineStore((state) => state.reducedMotion);
  const scenario = useMineStore((state) => state.scenario);

  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  // Keep ref to avoid stale closures inside animation loop
  const stateRef = useRef({
    selectedZoneId,
    hoveredZoneId: null as string | null,
    reducedMotion,
    scenario,
    layers,
    isDragging: false,
    prevPointer: { x: 0, y: 0 },
    cameraRotation: { theta: 0.78, phi: 1.05, radius: 46 },
    target: new THREE.Vector3(3, -7, 0),
  });

  useEffect(() => {
    stateRef.current.selectedZoneId = selectedZoneId;
    stateRef.current.reducedMotion = reducedMotion;
    stateRef.current.scenario = scenario;
    stateRef.current.layers = layers;
  }, [selectedZoneId, reducedMotion, scenario, layers]);

  const setCameraView = useCallback((preset: 'isometric' | 'depth' | 'plan') => {
    setViewPreset(preset);
    if (preset === 'isometric') {
      stateRef.current.cameraRotation = { theta: 0.82, phi: 1.05, radius: 46 };
      stateRef.current.target.set(3, -7, 0);
    } else if (preset === 'depth') {
      stateRef.current.cameraRotation = { theta: 0.05, phi: 1.48, radius: 48 };
      stateRef.current.target.set(3, -8, 0);
    } else if (preset === 'plan') {
      stateRef.current.cameraRotation = { theta: 0.0, phi: 0.15, radius: 52 };
      stateRef.current.target.set(3, -6, 0);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Verify WebGL availability
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 600;
    const heightPx = container.clientHeight || 420;

    // Setup Three.js Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a101b, 0.016);

    const camera = new THREE.PerspectiveCamera(42, width / heightPx, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0a101b, 0.0);

    // Subtle Lighting for subterranean environment
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight.position.set(15, 30, 20);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x475569, 1.2);
    fillLight.position.set(-20, -10, -20);
    scene.add(fillLight);

    // Surface reference plane (wireframe grid indicating ground level)
    const gridHelper = new THREE.GridHelper(50, 25, 0x0284c7, 0x1e293b);
    gridHelper.position.y = 2;
    scene.add(gridHelper);

    // Underground Depth reference rings / datum levels
    const depthLevels = [
      { y: 2, label: 'Surface (0m)' },
      { y: -4, label: 'Level 1 (-120m)' },
      { y: -10, label: 'Level 2 (-240m)' },
      { y: -16, label: 'Level 3 (-360m)' },
    ];

    const datumGroup = new THREE.Group();
    depthLevels.forEach((level) => {
      const ringGeo = new THREE.RingGeometry(22, 22.08, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = level.y;
      datumGroup.add(ring);
    });
    scene.add(datumGroup);

    // Main Vertical Shaft Structure
    const shaftGroup = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(1.6, 1.6, 22, 16, 8, true);
    shaftGeo.translate(0, -9, 0);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftGroup.add(shaftMesh);

    // Shaft elevator cage / guide wires
    const cageGeo = new THREE.BoxGeometry(1.8, 2.2, 1.8);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    cageMesh.position.set(0, -6, 0);
    shaftGroup.add(cageMesh);
    scene.add(shaftGroup);

    // 3D Tunnels between zones
    const tunnelCurves = [
      // Shaft to Tunnel A
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -2, 0),
        new THREE.Vector3(-4, -3, 3),
        new THREE.Vector3(-8, -3.5, 5),
        new THREE.Vector3(-11, -4, 7),
      ]),
      // Shaft to Tunnel B
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -6, 0),
        new THREE.Vector3(5, -7, 2),
        new THREE.Vector3(10, -7.5, 3),
        new THREE.Vector3(14, -8, 5),
      ]),
      // Tunnel B to Pumping Station
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(14, -8, 5),
        new THREE.Vector3(18, -9, 6.5),
        new THREE.Vector3(22, -10, 8),
      ]),
      // Shaft to Tunnel C (Deep Unknown workings)
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -10, 0),
        new THREE.Vector3(2, -12, -4),
        new THREE.Vector3(4, -14, -8),
        new THREE.Vector3(5, -15, -11),
      ]),
      // Tunnel C to Emergency Exit Adit
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(5, -15, -11),
        new THREE.Vector3(10, -10, -11),
        new THREE.Vector3(14, -6, -10),
        new THREE.Vector3(16, -3, -9),
      ]),
      // Bypass: Shaft to Emergency Exit Adit
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -2, 0),
        new THREE.Vector3(8, -2.5, -4),
        new THREE.Vector3(16, -3, -9),
      ]),
    ];

    const tunnelMeshes: THREE.Mesh[] = [];
    tunnelCurves.forEach((curve, index) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.95, 8, false);
      const isTunnelC = index === 3 || index === 4;
      const tubeMat = new THREE.MeshStandardMaterial({
        color: isTunnelC ? 0x2e1065 : 0x0f2438,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: isTunnelC ? 0.45 : 0.65,
        wireframe: false,
      });
      const mesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(mesh);
      tunnelMeshes.push(mesh);

      // Tunnel ribbing / structural wireframe
      const wireMat = new THREE.MeshBasicMaterial({
        color: isTunnelC ? 0x6b21a8 : 0x0284c7,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const wireMesh = new THREE.Mesh(tubeGeo, wireMat);
      scene.add(wireMesh);
    });

    // Subterranean Telemetry Flow Particles
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleProgress: number[] = [];
    const particleCurves: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      const curveIdx = Math.floor(Math.random() * tunnelCurves.length);
      const t = Math.random();
      particleCurves.push(curveIdx);
      particleProgress.push(t);
      const pt = tunnelCurves[curveIdx].getPoint(t);
      particlePositions[i * 3] = pt.x;
      particlePositions[i * 3 + 1] = pt.y;
      particlePositions[i * 3 + 2] = pt.z;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.65,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Zone Interactive Nodes (Mesh collection for Raycasting)
    const zoneMeshGroup = new THREE.Group();
    const zoneObjects: { id: string; coreMesh: THREE.Mesh; haloMesh: THREE.Mesh; beaconLine?: THREE.Line }[] = [];

    Object.values(ZONE_COORDINATES).forEach((coord) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...coord.pos);

      // Zone central core
      const coreGeo = new THREE.IcosahedronGeometry(1.2, 2);
      const coreMat = new THREE.MeshStandardMaterial({
        color: STATE_COLORS.KNOWN,
        emissive: STATE_COLORS.KNOWN,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.4,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.userData = { zoneId: coord.id };
      nodeGroup.add(coreMesh);

      // Pulsing orbital halo ring
      const haloGeo = new THREE.RingGeometry(1.6, 1.85, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: STATE_COLORS.KNOWN,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotateX(Math.PI / 2);
      nodeGroup.add(haloMesh);

      // Vertical depth plumb line from surface down to zone
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 2 - coord.pos[1], 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x334155,
        dashSize: 0.5,
        gapSize: 0.3,
        transparent: true,
        opacity: 0.4,
      });
      const plumbLine = new THREE.Line(lineGeo, lineMat);
      plumbLine.computeLineDistances();
      nodeGroup.add(plumbLine);

      // Selection beacon beam rising to surface
      const beaconGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 15, 0),
      ]);
      const beaconMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
      });
      const beaconLine = new THREE.Line(beaconGeo, beaconMat);
      nodeGroup.add(beaconLine);

      zoneMeshGroup.add(nodeGroup);
      zoneObjects.push({ id: coord.id, coreMesh, haloMesh, beaconLine });
    });
    scene.add(zoneMeshGroup);

    // Raycaster for user pointer interactions
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // Mouse & Touch drag handling for orbiting
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      stateRef.current.isDragging = true;
      stateRef.current.prevPointer = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (stateRef.current.isDragging) {
        const deltaX = clientX - stateRef.current.prevPointer.x;
        const deltaY = clientY - stateRef.current.prevPointer.y;

        stateRef.current.cameraRotation.theta -= deltaX * 0.007;
        stateRef.current.cameraRotation.phi = Math.max(
          0.1,
          Math.min(Math.PI / 2 - 0.05, stateRef.current.cameraRotation.phi - deltaY * 0.007)
        );

        stateRef.current.prevPointer = { x: clientX, y: clientY };
      }

      // Check hover hit
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const meshesToTest = zoneObjects.map((z) => z.coreMesh);
      const intersects = raycaster.intersectObjects(meshesToTest, false);

      if (intersects.length > 0) {
        const hitZoneId = intersects[0].object.userData.zoneId as string;
        stateRef.current.hoveredZoneId = hitZoneId;
        const info = ZONE_COORDINATES[hitZoneId];
        setHoveredZone(info || null);
        canvas.style.cursor = 'pointer';
      } else {
        stateRef.current.hoveredZoneId = null;
        setHoveredZone(null);
        canvas.style.cursor = stateRef.current.isDragging ? 'grabbing' : 'grab';
      }
    };

    const handlePointerUp = () => {
      stateRef.current.isDragging = false;
      canvas.style.cursor = 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const meshesToTest = zoneObjects.map((z) => z.coreMesh);
      const intersects = raycaster.intersectObjects(meshesToTest, false);

      if (intersects.length > 0) {
        const hitZoneId = intersects[0].object.userData.zoneId as string;
        onSelect(hitZoneId);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      stateRef.current.cameraRotation.radius = Math.max(
        18,
        Math.min(85, stateRef.current.cameraRotation.radius + e.deltaY * 0.04)
      );
    };

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    resizeObserver.observe(container);

    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const isMotionReduced = stateRef.current.reducedMotion;

      // Update camera position from spherical coords
      const { theta, phi, radius } = stateRef.current.cameraRotation;
      const target = stateRef.current.target;

      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);

      // Subtle idle orbit if not dragging and motion is permitted
      if (!stateRef.current.isDragging && !isMotionReduced) {
        stateRef.current.cameraRotation.theta += 0.0012;
      }

      // Cage hoist slow motion
      if (!isMotionReduced) {
        cageMesh.position.y = -6 + Math.sin(elapsedTime * 0.4) * 3.5;
      }

      // Update telemetry particles along tunnels
      const positions = particleGeo.attributes.position.array as Float32Array;
      const isSensorFailure = stateRef.current.scenario === 'sensor-failure';

      for (let i = 0; i < particleCount; i++) {
        const curveIdx = particleCurves[i];
        // If sensor failure, Tunnel B (curve index 1) data flow is stalled
        const speed = isMotionReduced ? 0 : (isSensorFailure && curveIdx === 1 ? 0.0002 : 0.0035);
        particleProgress[i] = (particleProgress[i] + speed) % 1;
        const pt = tunnelCurves[curveIdx].getPoint(particleProgress[i]);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Update Zone nodes colors, scales, and selection glow
      zoneObjects.forEach((item) => {
        const zoneData = zonesById.get(item.id);
        const state = zoneData?.state || 'KNOWN';
        const baseColor = STATE_COLORS[state] || STATE_COLORS.KNOWN;
        const isSelected = stateRef.current.selectedZoneId === item.id;
        const isHovered = stateRef.current.hoveredZoneId === item.id;

        const coreMat = item.coreMesh.material as THREE.MeshStandardMaterial;
        const haloMat = item.haloMesh.material as THREE.MeshBasicMaterial;

        coreMat.color.setHex(isSelected ? 0x38bdf8 : baseColor);
        coreMat.emissive.setHex(isSelected ? 0x0284c7 : baseColor);
        coreMat.emissiveIntensity = isSelected ? 0.75 : isHovered ? 0.6 : 0.3;

        haloMat.color.setHex(isSelected ? 0x38bdf8 : baseColor);

        // Pulse effect
        if (!isMotionReduced) {
          const pulse = (Math.sin(elapsedTime * (state === 'ALERT' ? 5 : 2.5)) + 1) * 0.5;
          const scale = isSelected ? 1.35 + pulse * 0.15 : isHovered ? 1.25 : 1.0 + (state === 'ALERT' ? pulse * 0.2 : 0);
          item.coreMesh.scale.set(scale, scale, scale);

          const haloScale = isSelected ? 1.5 + pulse * 0.25 : 1.0 + pulse * 0.18;
          item.haloMesh.scale.set(haloScale, haloScale, haloScale);
          haloMat.opacity = isSelected ? 0.85 : 0.4 + pulse * 0.35;
          item.haloMesh.rotation.z = elapsedTime * 0.8;
        } else {
          item.coreMesh.scale.set(isSelected ? 1.3 : 1.0, isSelected ? 1.3 : 1.0, isSelected ? 1.3 : 1.0);
          haloMat.opacity = isSelected ? 0.8 : 0.4;
        }

        // Selection beacon beam
        if (item.beaconLine) {
          const lineMat = item.beaconLine.material as THREE.LineBasicMaterial;
          lineMat.opacity = isSelected ? 0.75 : 0.0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      renderer.dispose();
      scene.clear();
    };
  }, [zonesById, onSelect, setCameraView]);

  return (
    <div
      ref={containerRef}
      className={`mine-3d-container ${className}`}
      style={{ height, position: 'relative', overflow: 'hidden', minHeight: 340 }}
      aria-label="Interactive 3D Underground Mine Visualization"
    >
      {webglSupported ? (
        <canvas
          ref={canvasRef}
          className="mine-3d-canvas"
          style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
          tabIndex={0}
          aria-label="Interactive 3D mine model: click a zone marker to view details or use keyboard controls"
        />
      ) : (
        <div className="mine-3d-fallback" role="region" aria-label="Accessible 2D Mine Status Fallback">
          <div className="fallback-header">
            <Info size={16} />
            <span>WebGL unavailable · Showing accessible tabular mine network view</span>
          </div>
          <div className="fallback-grid">
            {Object.values(ZONE_COORDINATES).map((pos) => {
              const zone = zonesById.get(pos.id);
              const state = zone?.state || 'KNOWN';
              return (
                <button
                  key={pos.id}
                  className={`fallback-zone-card fallback-${state.toLowerCase()}`}
                  onClick={() => onSelect(pos.id)}
                >
                  <div className="fallback-zone-title">
                    <strong>{pos.name}</strong>
                    <span className="fallback-depth">{pos.depthMeters}m depth</span>
                  </div>
                  <div className="fallback-zone-meta">
                    <span className="fallback-level">{pos.level}</span>
                    <span className={`fallback-badge state-${state.toLowerCase()}`}>{state}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Floating Controls Overlay */}
      {showControls && (
        <div className="mine-3d-controls-bar">
          <div className="controls-group">
            <span className="controls-label">
              <Compass size={13} aria-hidden="true" />
              <span>PERSPECTIVE:</span>
            </span>
            <button
              type="button"
              className={`control-pill ${viewPreset === 'isometric' ? 'active' : ''}`}
              onClick={() => setCameraView('isometric')}
              title="Isometric 3D perspective"
            >
              Isometric
            </button>
            <button
              type="button"
              className={`control-pill ${viewPreset === 'depth' ? 'active' : ''}`}
              onClick={() => setCameraView('depth')}
              title="Cross-sectional vertical depth profile"
            >
              Profile
            </button>
            <button
              type="button"
              className={`control-pill ${viewPreset === 'plan' ? 'active' : ''}`}
              onClick={() => setCameraView('plan')}
              title="Top-down plan view"
            >
              Plan
            </button>
            <button
              type="button"
              className="control-pill icon-only"
              onClick={() => setCameraView('isometric')}
              title="Reset camera viewpoint"
              aria-label="Reset camera"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <div className="controls-status">
            <span className="live-sim-chip">
              <span className="pulse-dot" />
              <span>3D MINE TWIN · SIMULATED</span>
            </span>
          </div>
        </div>
      )}

      {/* Depth Strata Indicators along left side */}
      <div className="mine-depth-strata" aria-hidden="true">
        <div className="stratum-tick tick-surface">
          <span className="tick-line" />
          <span className="tick-text">0m Ground</span>
        </div>
        <div className="stratum-tick tick-l1">
          <span className="tick-line" />
          <span className="tick-text">-120m L1</span>
        </div>
        <div className="stratum-tick tick-l2">
          <span className="tick-line" />
          <span className="tick-text">-240m L2</span>
        </div>
        <div className="stratum-tick tick-l3">
          <span className="tick-line" />
          <span className="tick-text">-360m L3</span>
        </div>
      </div>

      {/* Interactive Hover HUD Tooltip */}
      {hoveredZone && (
        <div className="mine-3d-hover-hud" role="tooltip">
          <div className="hover-hud-head">
            <strong>{hoveredZone.name}</strong>
            <span className={`hud-badge hud-${zonesById.get(hoveredZone.id)?.state.toLowerCase() || 'known'}`}>
              {zonesById.get(hoveredZone.id)?.state || 'KNOWN'}
            </span>
          </div>
          <div className="hover-hud-detail">
            <span>{hoveredZone.level}</span>
            <span className="mono">Depth: -{hoveredZone.depthMeters}m</span>
          </div>
          <p className="hover-hud-desc">{hoveredZone.description}</p>
          <div className="hover-hud-hint">Click zone node to open operational dossier ↗</div>
        </div>
      )}

      {/* Bottom Zone Quick Selection Bar */}
      <nav className="mine-3d-zone-strip" aria-label="Underground zones">
        {Object.values(ZONE_COORDINATES).map((item) => {
          const zone = zonesById.get(item.id);
          const state = zone?.state || 'KNOWN';
          const isSelected = selectedZoneId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`zone-pill-btn ${isSelected ? 'selected' : ''} state-${state.toLowerCase()}`}
              onClick={() => onSelect(item.id)}
              aria-pressed={isSelected}
              title={`${item.name} (-${item.depthMeters}m): ${state}`}
            >
              <span className="zone-pill-indicator" aria-hidden="true">
                {state === 'KNOWN' && <Check size={10} />}
                {state === 'UNCERTAIN' && <TriangleAlert size={10} />}
                {state === 'UNKNOWN' && <CircleHelp size={10} />}
                {state === 'ALERT' && <CircleX size={10} />}
              </span>
              <span className="zone-pill-name">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Accessible Screen-reader summary */}
      <div className="sr-only">
        Fictional Kestrel Ridge underground 3D mine representation showing 6 zones:
        {zones.map((z) => `${z.name} (status ${z.state})`).join(', ')}.
        Select a zone button to inspect its telemetry, inspections and sample hazard records.
      </div>
    </div>
  );
}
