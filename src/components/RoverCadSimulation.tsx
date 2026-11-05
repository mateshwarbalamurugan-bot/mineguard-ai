import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw, Sliders, Box, Cpu, Eye, EyeOff, Volume2, VolumeX, Wrench
} from 'lucide-react';

/***************************************************************************
 * 1. WEB AUDIO API SCI-FI / JARVIS SOUND SYNTHESIZER
 ***************************************************************************/
class StarkAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.065);
    } catch {}
  }

  playExplodeSweep(expanding = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(expanding ? 180 : 580, now);
      osc.frequency.exponentialRampToValueAtTime(expanding ? 620 : 160, now + 0.38);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {}
  }
}

export const sfx = new StarkAudioEngine();

/***************************************************************************
 * 2. SPECIFIC HARDWARE COMPONENTS DATABASE
 ***************************************************************************/
export interface RoverComponent {
  id: string;
  name: string;
  category: string;
  cost: string;
  description: string;
  assembledPos: { x: number; y: number; z: number };
  explodeOffset: { x: number; y: number; z: number };
}

export const ROVER_COMPONENTS: RoverComponent[] = [
  {
    id: 'nano',
    name: 'Arduino Nano',
    category: 'Controller',
    cost: '₹300–450',
    description: 'Embedded 8-bit ATmega328P MCU managing real-time sensor loops and I2C telemetry communications.',
    assembledPos: { x: -0.35, y: 0.45, z: 0.1 },
    explodeOffset: { x: -1.35, y: 0.95, z: 0.45 },
  },
  {
    id: 'servos',
    name: '4x Metal-Gear Servos',
    category: 'Movement actuators',
    cost: '₹1,200–1,800',
    description: 'High-torque brass/metal geartrain actuators providing all-terrain articulated suspension and steering.',
    assembledPos: { x: 0, y: -0.1, z: 0 },
    explodeOffset: { x: 0, y: -0.35, z: 0 },
  },
  {
    id: 'pca9685',
    name: 'PCA9685 Module',
    category: 'Servo controller',
    cost: '₹315–410',
    description: '16-channel 12-bit PWM I2C servo expander maintaining pulse-width stability during motor spikes.',
    assembledPos: { x: 0.35, y: 0.42, z: 0.1 },
    explodeOffset: { x: 1.4, y: 0.85, z: 0.45 },
  },
  {
    id: 'mpu6050',
    name: 'MPU6050 Module',
    category: 'Orientation sensor',
    cost: '₹150–420',
    description: '6-axis MEMS accelerometer & gyroscope tracking chassis pitch, roll, rollover hazards, and incline.',
    assembledPos: { x: 0, y: 0.48, z: 0.55 },
    explodeOffset: { x: 0, y: 1.05, z: 1.45 },
  },
  {
    id: 'lidar',
    name: 'LiDAR',
    category: '360° Laser Scanner',
    cost: '₹700–1,000',
    description: 'High-speed spinning optical turret capturing real-time tunnel cross-sections and obstacle distances.',
    assembledPos: { x: 0, y: 1.58, z: -0.1 },
    explodeOffset: { x: 0, y: 2.1, z: -0.1 },
  },
  {
    id: 'heat_sensor',
    name: 'Heat Sensor',
    category: 'Thermal / IR Array',
    cost: 'Included',
    description: 'Long-wave infrared thermal sensor detecting machinery overheating, spontaneous combustion, and hot spots.',
    assembledPos: { x: 0, y: 1.05, z: 1.35 },
    explodeOffset: { x: 0, y: 1.25, z: 2.35 },
  },
  {
    id: 'body',
    name: 'Acrylic / 3D-Printed Parts',
    category: 'Prototype body',
    cost: '₹1,500–3,000',
    description: 'Impact-resistant reinforced chassis, sealed protective equipment tub, and 4 high-traction rubber wheels.',
    assembledPos: { x: 0, y: 0.72, z: -0.05 },
    explodeOffset: { x: 0, y: 1.35, z: -1.05 },
  },
  {
    id: 'power',
    name: 'Regulated Power Supply',
    category: 'Power equipment',
    cost: '₹800–1,500',
    description: 'Flameproof dual-rail battery regulator with low-voltage cut-off and surge isolation for mining safety.',
    assembledPos: { x: 0, y: -0.58, z: 0 },
    explodeOffset: { x: 0, y: -1.85, z: 0 },
  },
  {
    id: 'wiring',
    name: 'Wiring & Connectors',
    category: 'Basic electronics accessories',
    cost: '₹500–800',
    description: 'Shielded silicone cabling, gold-plated DuPont headers, and XT60 high-current interconnects.',
    assembledPos: { x: 0, y: 0.18, z: -0.15 },
    explodeOffset: { x: 0, y: -0.45, z: -1.25 },
  },
];

interface RoverCadSimulationProps {
  height?: number | string;
  className?: string;
  onSelectComponent?: (comp: RoverComponent) => void;
  cleanMode?: boolean;
}

export function RoverCadSimulation({
  height = 540,
  className = '',
  onSelectComponent,
  cleanMode = false,
}: RoverCadSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  const [explodeFactor, setExplodeFactor] = useState(0.85);
  const [selectedPartId, setSelectedPartId] = useState<string>('nano');
  const [isolateMode, setIsolateMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);

  // Sync audio toggle with sound engine
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  const selectedComp = ROVER_COMPONENTS.find((c) => c.id === selectedPartId) || ROVER_COMPONENTS[0];

  // Ref to hold state variables inside animation frame
  const animStateRef = useRef({
    explodeFactor: 0.85,
    targetExplode: 0.85,
    selectedPartId: 'nano',
    hoveredPartId: null as string | null,
    isolateMode: false,
    autoRotate: true,
    camSpherical: { radius: 7.6, phi: 1.18, theta: 0.68 },
    targetSpherical: { radius: 7.6, phi: 1.18, theta: 0.68 },
    camTarget: new THREE.Vector3(0, 0.15, 0),
    desiredCamTarget: new THREE.Vector3(0, 0.15, 0),
    isDragging: false,
    prevPointer: { x: 0, y: 0 },
    pointerDownPos: { x: 0, y: 0 },
  });

  // Keep animStateRef up to date with React state
  useEffect(() => {
    animStateRef.current.targetExplode = explodeFactor;
  }, [explodeFactor]);

  useEffect(() => {
    animStateRef.current.selectedPartId = selectedPartId;
  }, [selectedPartId]);

  useEffect(() => {
    animStateRef.current.isolateMode = isolateMode;
  }, [isolateMode]);

  useEffect(() => {
    animStateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // Method to select a component and focus camera
  const handleSelect = useCallback(
    (partId: string, autoExpand = false) => {
      sfx.playClick();
      setSelectedPartId(partId);
      animStateRef.current.selectedPartId = partId;

      if (autoExpand && animStateRef.current.targetExplode < 0.45) {
        setExplodeFactor(0.85);
        animStateRef.current.targetExplode = 0.85;
      }

      const comp = ROVER_COMPONENTS.find((c) => c.id === partId);
      if (comp) {
        animStateRef.current.desiredCamTarget.set(
          comp.assembledPos.x,
          comp.assembledPos.y,
          comp.assembledPos.z
        );
        animStateRef.current.targetSpherical.radius = 5.6;
        if (onSelectComponent) onSelectComponent(comp);
      } else {
        animStateRef.current.desiredCamTarget.set(0, 0.15, 0);
        animStateRef.current.targetSpherical.radius = 7.6;
      }
    },
    [onSelectComponent]
  );

  const handleToggleExplode = () => {
    const expanding = explodeFactor < 0.5;
    sfx.playExplodeSweep(expanding);
    const target = expanding ? 1.0 : 0.0;
    setExplodeFactor(target);
    animStateRef.current.targetExplode = target;
  };

  const handleResetCamera = () => {
    sfx.playClick();
    setIsolateMode(false);
    animStateRef.current.isolateMode = false;
    animStateRef.current.targetSpherical = { radius: 7.6, phi: 1.18, theta: 0.68 };
    animStateRef.current.desiredCamTarget.set(0, 0.15, 0);
  };

  // Main Three.js Lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const labelsContainer = labelsContainerRef.current;
    if (!canvas || !container || !labelsContainer) return;

    const width = container.clientWidth || 800;
    const heightPx = container.clientHeight || 540;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030914, 0.042);

    const camera = new THREE.PerspectiveCamera(42, width / heightPx, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x88ccff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 10, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const cyanRimLight = new THREE.PointLight(0x00f3ff, 2.2, 16);
    cyanRimLight.position.set(-5, 3, -5);
    scene.add(cyanRimLight);

    const orangeFillLight = new THREE.PointLight(0xff7b00, 1.5, 14);
    orangeFillLight.position.set(5, 1.5, 4);
    scene.add(orangeFillLight);

    // 3. Brand Decal Generator
    function createBrandDecalTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 180;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#121822';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = '#2d3b4e';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
        ctx.font = '900 40px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('MINEGUARD ', 230, 110);
        ctx.fillStyle = '#00f3ff';
        ctx.fillText('AI', 392, 110);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    // 4. Materials
    const mats = {
      orangeArmor: new THREE.MeshStandardMaterial({ color: 0xff7b00, metalness: 0.45, roughness: 0.28 }),
      darkGunmetal: new THREE.MeshStandardMaterial({ color: 0x1b222c, metalness: 0.78, roughness: 0.32 }),
      deepBlack: new THREE.MeshStandardMaterial({ color: 0x0e131a, metalness: 0.55, roughness: 0.45 }),
      chromeSilver: new THREE.MeshStandardMaterial({ color: 0xb8c7d9, metalness: 0.9, roughness: 0.18 }),
      tireRubber: new THREE.MeshStandardMaterial({ color: 0x15191f, metalness: 0.15, roughness: 0.82 }),
      nanoBlue: new THREE.MeshStandardMaterial({ color: 0x005c99, metalness: 0.35, roughness: 0.35 }),
      pcaBlue: new THREE.MeshStandardMaterial({ color: 0x0a3d62, metalness: 0.4, roughness: 0.35 }),
      mpuGreen: new THREE.MeshStandardMaterial({ color: 0x0b6e4f, metalness: 0.35, roughness: 0.35 }),
      goldPin: new THREE.MeshStandardMaterial({ color: 0xf5b014, metalness: 0.9, roughness: 0.2 }),
      thermalLens: new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff4500,
        emissiveIntensity: 1.2,
        metalness: 0.85,
        roughness: 0.1,
      }),
      cyanGlow: new THREE.MeshStandardMaterial({
        color: 0x00f3ff,
        emissive: 0x00f3ff,
        emissiveIntensity: 1.6,
        roughness: 0.1,
      }),
      whiteLedGlow: new THREE.MeshStandardMaterial({
        color: 0xe0ffff,
        emissive: 0x99f6ff,
        emissiveIntensity: 2.0,
        roughness: 0.1,
      }),
      brandPlate: new THREE.MeshStandardMaterial({
        map: createBrandDecalTexture(),
        metalness: 0.5,
        roughness: 0.35,
      }),
      ghostFade: new THREE.MeshStandardMaterial({
        color: 0x005577,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      }),
      hoverHighlight: new THREE.MeshStandardMaterial({
        color: 0x00f3ff,
        emissive: 0x00f3ff,
        emissiveIntensity: 0.85,
        metalness: 0.5,
        roughness: 0.2,
      }),
    };

    // 5. Holographic Stage Ground
    const stageGroup = new THREE.Group();
    stageGroup.position.y = -2.25;
    scene.add(stageGroup);

    const gridHelper = new THREE.GridHelper(26, 26, 0x00f3ff, 0x0a2e46);
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((m) => { m.transparent = true; m.opacity = 0.22; });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.22;
    }
    stageGroup.add(gridHelper);

    [2.4, 3.6, 5.0].forEach((r, idx) => {
      const geo = new THREE.RingGeometry(r, r + 0.035, 64);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0xff7b00 : 0x00f3ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35 - idx * 0.06,
      });
      stageGroup.add(new THREE.Mesh(geo, mat));
    });

    // 6. Targeting Reticle
    const targetReticle = new THREE.Group();
    const rGeo = new THREE.TorusGeometry(0.75, 0.016, 12, 64);
    rGeo.rotateX(Math.PI / 2);
    const rMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.85 });
    targetReticle.add(new THREE.Mesh(rGeo, rMat));
    targetReticle.visible = false;
    scene.add(targetReticle);

    // 7. Rover Parts Assembly
    const roverRoot = new THREE.Group();
    scene.add(roverRoot);

    const componentGroups: Record<string, THREE.Group> = {};
    const pickableMeshes: THREE.Mesh[] = [];
    const subExplodeItems: { mesh: THREE.Object3D; basePos: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    const tetherLines: { id: string; line: THREE.Line; group: THREE.Group }[] = [];

    function registerComponentGroup(compData: RoverComponent) {
      const group = new THREE.Group();
      group.position.set(compData.assembledPos.x, compData.assembledPos.y, compData.assembledPos.z);
      group.userData = { partId: compData.id, compData };
      roverRoot.add(group);
      componentGroups[compData.id] = group;

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.3, 0),
        new THREE.Vector3(compData.assembledPos.x, compData.assembledPos.y, compData.assembledPos.z),
      ]);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x00f3ff,
        dashSize: 0.12,
        gapSize: 0.08,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      roverRoot.add(line);
      tetherLines.push({ id: compData.id, line, group });

      return group;
    }

    function tagPickable(rootObj: THREE.Object3D, partId: string) {
      rootObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.userData.partId = partId;
          mesh.userData.origMaterial = mesh.material;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          pickableMeshes.push(mesh);
        }
      });
    }

    // 1. Arduino Nano (Controller)
    const nanoData = ROVER_COMPONENTS.find((c) => c.id === 'nano')!;
    const nanoGrp = registerComponentGroup(nanoData);
    nanoGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 1.05), mats.nanoBlue));
    const usb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.24), mats.chromeSilver);
    usb.position.set(0, 0.06, 0.45);
    nanoGrp.add(usb);
    const mcu = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.2), mats.deepBlack);
    mcu.rotation.y = Math.PI / 4;
    mcu.position.set(0, 0.05, -0.05);
    nanoGrp.add(mcu);
    const resetBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), mats.orangeArmor);
    resetBtn.position.set(0, 0.05, -0.32);
    nanoGrp.add(resetBtn);
    [-0.19, 0.19].forEach((px) => {
      const pinStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.92), mats.goldPin);
      pinStrip.position.set(px, 0.02, -0.02);
      nanoGrp.add(pinStrip);
    });
    tagPickable(nanoGrp, 'nano');

    // 2. PCA9685 Module
    const pcaData = ROVER_COMPONENTS.find((c) => c.id === 'pca9685')!;
    const pcaGrp = registerComponentGroup(pcaData);
    pcaGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 1.25), mats.pcaBlue));
    const term = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.22), mats.mpuGreen);
    term.position.set(0, 0.1, 0.48);
    pcaGrp.add(term);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), mats.chromeSilver);
    cap.position.set(-0.14, 0.12, 0.2);
    pcaGrp.add(cap);
    [-0.35, -0.1, 0.15, 0.38].forEach((bz) => {
      const pinBlock = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.16), mats.goldPin);
      pinBlock.position.set(0.05, 0.08, -bz);
      pcaGrp.add(pinBlock);
    });
    tagPickable(pcaGrp, 'pca9685');

    // 3. MPU6050 Module
    const mpuData = ROVER_COMPONENTS.find((c) => c.id === 'mpu6050')!;
    const mpuGrp = registerComponentGroup(mpuData);
    mpuGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.055, 0.42), mats.mpuGreen));
    const sensorIc = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.16), mats.deepBlack);
    sensorIc.position.set(0, 0.05, 0);
    mpuGrp.add(sensorIc);
    const axisRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 10, 24), mats.cyanGlow);
    axisRing.rotation.x = Math.PI / 2;
    axisRing.position.y = 0.06;
    mpuGrp.add(axisRing);
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.05), mats.goldPin);
    header.position.set(0, 0.03, 0.16);
    mpuGrp.add(header);
    tagPickable(mpuGrp, 'mpu6050');

    // 4. 4x Metal-Gear Servos
    const servoData = ROVER_COMPONENTS.find((c) => c.id === 'servos')!;
    const servoGrp = registerComponentGroup(servoData);
    const corners = [
      { sx: -1, sz: 1 },
      { sx: 1, sz: 1 },
      { sx: -1, sz: -1 },
      { sx: 1, sz: -1 },
    ];
    corners.forEach(({ sx, sz }) => {
      const servoUnit = new THREE.Group();
      const basePos = new THREE.Vector3(sx * 0.92, 0, sz * 0.88);
      servoUnit.position.copy(basePos);
      servoUnit.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.48), mats.deepBlack));
      const flange = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.52), mats.darkGunmetal);
      flange.position.y = 0.08;
      servoUnit.add(flange);
      const brassShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16), mats.goldPin);
      brassShaft.rotation.z = Math.PI / 2;
      brassShaft.position.set(sx * 0.25, 0.06, sz * 0.1);
      servoUnit.add(brassShaft);
      const armBar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.16), mats.chromeSilver);
      armBar.position.set(sx * 0.38, -0.04, sz * 0.18);
      armBar.rotation.y = -sx * sz * 0.32;
      servoUnit.add(armBar);
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 14), mats.orangeArmor);
      spring.position.set(sx * 0.12, -0.05, -sz * 0.22);
      servoUnit.add(spring);
      servoGrp.add(servoUnit);
      subExplodeItems.push({
        mesh: servoUnit,
        basePos: basePos.clone(),
        dir: new THREE.Vector3(sx * 0.85, 0, sz * 0.65),
      });
    });
    tagPickable(servoGrp, 'servos');

    // 5. LiDAR Turret
    const lidarData = ROVER_COMPONENTS.find((c) => c.id === 'lidar')!;
    const lidarGrp = registerComponentGroup(lidarData);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.52, 36), mats.deepBlack);
    drum.position.y = 0.22;
    lidarGrp.add(drum);
    const lidarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.56, 0.06, 36), mats.chromeSilver);
    lidarCap.position.y = 0.49;
    lidarGrp.add(lidarCap);
    const upperNeon = new THREE.Mesh(new THREE.TorusGeometry(0.565, 0.024, 16, 48), mats.cyanGlow);
    upperNeon.rotation.x = Math.PI / 2;
    upperNeon.position.y = 0.38;
    lidarGrp.add(upperNeon);
    const lowerNeon = new THREE.Mesh(new THREE.TorusGeometry(0.565, 0.032, 16, 48), mats.cyanGlow);
    lowerNeon.rotation.x = Math.PI / 2;
    lowerNeon.position.y = 0.08;
    lidarGrp.add(lowerNeon);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.24, 24), mats.darkGunmetal);
    neck.position.y = -0.12;
    lidarGrp.add(neck);
    const lidarScannerInternal = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.18), mats.cyanGlow);
    lidarScannerInternal.position.y = 0.22;
    lidarGrp.add(lidarScannerInternal);
    tagPickable(lidarGrp, 'lidar');

    // 6. Heat Sensor
    const heatData = ROVER_COMPONENTS.find((c) => c.id === 'heat_sensor')!;
    const heatGrp = registerComponentGroup(heatData);
    heatGrp.add(new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.42), mats.darkGunmetal));
    const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 24), mats.deepBlack);
    lensBarrel.rotation.x = Math.PI / 2;
    lensBarrel.position.z = 0.18;
    heatGrp.add(lensBarrel);
    const irGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 24), mats.thermalLens);
    irGlass.rotation.x = Math.PI / 2;
    irGlass.position.z = 0.25;
    heatGrp.add(irGlass);
    [-0.36, 0.36].forEach((sideX) => {
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.08), mats.deepBlack);
      bezel.position.set(sideX, 0, 0.19);
      heatGrp.add(bezel);
      [-0.07, 0.07].forEach((lx) => {
        [-0.05, 0.05].forEach((ly) => {
          const led = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), mats.whiteLedGlow);
          led.position.set(sideX + lx, ly, 0.23);
          heatGrp.add(led);
        });
      });
    });
    tagPickable(heatGrp, 'heat_sensor');

    // 7. Body & Wheels
    const bodyData = ROVER_COMPONENTS.find((c) => c.id === 'body')!;
    const bodyGrp = registerComponentGroup(bodyData);
    const shellSub = new THREE.Group();
    shellSub.add(new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.56, 2.75), mats.darkGunmetal));
    [-0.86, 0.86].forEach((sx) => {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 2.55), mats.orangeArmor);
      shoulder.position.set(sx, 0.02, -0.05);
      shellSub.add(shoulder);
    });
    [-1.03, 1.03].forEach((sx, idx) => {
      const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 1.68), mats.brandPlate);
      sidePlate.position.set(sx, 0.0, 0.05);
      if (idx === 0) sidePlate.rotation.y = Math.PI;
      shellSub.add(sidePlate);
    });
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.25, 16), mats.chromeSilver);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, -0.02, 1.55);
    shellSub.add(topBar);
    bodyGrp.add(shellSub);

    corners.forEach(({ sx, sz }) => {
      const wheelUnit = new THREE.Group();
      const basePos = new THREE.Vector3(sx * 1.62, -0.87, sz * 1.23);
      wheelUnit.position.copy(basePos);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.56, 32), mats.tireRubber);
      tire.rotation.z = Math.PI / 2;
      wheelUnit.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.58, 24), mats.darkGunmetal);
      rim.rotation.z = Math.PI / 2;
      wheelUnit.add(rim);
      const neonRim = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.022, 14, 36), mats.cyanGlow);
      neonRim.rotation.y = Math.PI / 2;
      neonRim.position.x = sx * 0.29;
      wheelUnit.add(neonRim);
      bodyGrp.add(wheelUnit);
      subExplodeItems.push({
        mesh: wheelUnit,
        basePos: basePos.clone(),
        dir: new THREE.Vector3(sx * 1.35, -1.35, sz * 1.65),
      });
    });
    tagPickable(bodyGrp, 'body');

    // 8. Regulated Power Supply
    const powerData = ROVER_COMPONENTS.find((c) => c.id === 'power')!;
    const powerGrp = registerComponentGroup(powerData);
    for (let r = 0; r < 3; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.56 - r * 0.02, 0.075, 14, 32), mats.deepBlack);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = 0.25 - r * 0.13;
      powerGrp.add(rib);
    }
    const coneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.96, 0.24, 36), mats.darkGunmetal);
    coneBase.position.y = -0.12;
    powerGrp.add(coneBase);
    const bottomPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.08, 36), mats.chromeSilver);
    bottomPlate.position.y = -0.26;
    powerGrp.add(bottomPlate);
    const baseGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.042, 16, 48), mats.cyanGlow);
    baseGlowRing.rotation.x = Math.PI / 2;
    baseGlowRing.position.y = -0.28;
    powerGrp.add(baseGlowRing);
    tagPickable(powerGrp, 'power');

    // 9. Wiring & Connectors
    const wiringData = ROVER_COMPONENTS.find((c) => c.id === 'wiring')!;
    const wiringGrp = registerComponentGroup(wiringData);
    wiringGrp.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.3), mats.darkGunmetal));
    const wireColors = [0xff3b30, 0x00f3ff, 0xff9500, 0xf5b014, 0x34c759];
    wireColors.forEach((hex, idx) => {
      const wireMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4 });
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 10), wireMat);
      wire.rotation.x = Math.PI / 2;
      wire.position.set(-0.28 + idx * 0.14, 0.06, 0);
      wiringGrp.add(wire);
    });
    [-0.55, 0.55].forEach((cz) => {
      const plug = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.16), mats.deepBlack);
      plug.position.set(0, 0.06, cz);
      wiringGrp.add(plug);
    });
    tagPickable(wiringGrp, 'wiring');

    // 8. 3D Floating DOM Callout Elements
    const domLabelElements: Record<string, HTMLDivElement> = {};
    labelsContainer.innerHTML = '';
    if (!cleanMode) {
      ROVER_COMPONENTS.forEach((comp) => {
        const pin = document.createElement('div');
        pin.className = 'cad-hud-pin';
        pin.innerHTML = `
          <div class="cad-hud-box">
            <span class="cad-pin-dot"></span>
            <span class="cad-pin-text">${comp.name}</span>
          </div>
        `;
        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          handleSelect(comp.id, true);
        });
        labelsContainer.appendChild(pin);
        domLabelElements[comp.id] = pin;
      });
    }

    // 9. Mouse and Touch Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      animStateRef.current.isDragging = true;
      animStateRef.current.pointerDownPos = { x: clientX, y: clientY };
      animStateRef.current.prevPointer = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (animStateRef.current.isDragging) {
        const dx = clientX - animStateRef.current.prevPointer.x;
        const dy = clientY - animStateRef.current.prevPointer.y;
        animStateRef.current.prevPointer = { x: clientX, y: clientY };
        animStateRef.current.targetSpherical.theta -= dx * 0.0075;
        animStateRef.current.targetSpherical.phi = Math.max(
          0.25,
          Math.min(Math.PI * 0.48, animStateRef.current.targetSpherical.phi - dy * 0.0065)
        );
        return;
      }

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickableMeshes, false);
      const hitId = hits.length > 0 ? (hits[0].object.userData.partId as string) : null;

      if (hitId !== animStateRef.current.hoveredPartId) {
        animStateRef.current.hoveredPartId = hitId;
        canvas.style.cursor = hitId ? 'pointer' : 'grab';
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      if (!animStateRef.current.isDragging) return;
      animStateRef.current.isDragging = false;
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
      const dist = Math.hypot(
        clientX - animStateRef.current.pointerDownPos.x,
        clientY - animStateRef.current.pointerDownPos.y
      );

      if (dist < 8) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickableMeshes, false);
        if (hits.length > 0) {
          const hitId = hits[0].object.userData.partId as string;
          handleSelect(hitId, false);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      animStateRef.current.targetSpherical.radius = Math.max(
        3.6,
        Math.min(13.5, animStateRef.current.targetSpherical.radius + e.deltaY * 0.005)
      );
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    // 10. Resize
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

    // 11. Animation Loop
    let animId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Lerp explode factor
      animStateRef.current.explodeFactor +=
        (animStateRef.current.targetExplode - animStateRef.current.explodeFactor) * 0.085;
      const ef = animStateRef.current.explodeFactor;

      // Position components along explode vectors
      ROVER_COMPONENTS.forEach((comp) => {
        const grp = componentGroups[comp.id];
        grp.position.set(
          comp.assembledPos.x + comp.explodeOffset.x * ef,
          comp.assembledPos.y + comp.explodeOffset.y * ef,
          comp.assembledPos.z + comp.explodeOffset.z * ef
        );
      });

      // Sub-explode wheels & servo units
      subExplodeItems.forEach((item) => {
        item.mesh.position.set(
          item.basePos.x + item.dir.x * ef,
          item.basePos.y + item.dir.y * ef,
          item.basePos.z + item.dir.z * ef
        );
      });

      // Tether lines opacity and endpoints
      tetherLines.forEach(({ line, group }) => {
        const positions = line.geometry.attributes.position.array as Float32Array;
        positions[3] = group.position.x;
        positions[4] = group.position.y;
        positions[5] = group.position.z;
        line.geometry.attributes.position.needsUpdate = true;
        line.computeLineDistances();
        const lineMat = line.material as THREE.LineDashedMaterial;
        lineMat.opacity = ef * 0.6;
      });

      // Spinning LiDAR laser inside turret
      if (lidarScannerInternal) {
        lidarScannerInternal.rotation.y += 0.08;
      }

      // Target reticle
      const selId = animStateRef.current.selectedPartId;
      if (selId && componentGroups[selId]) {
        targetReticle.visible = true;
        targetReticle.position.copy(componentGroups[selId].position);
        targetReticle.rotation.y += 0.025;
      } else {
        targetReticle.visible = false;
      }

      // Auto-rotation
      if (animStateRef.current.autoRotate && !animStateRef.current.isDragging) {
        animStateRef.current.targetSpherical.theta += 0.0028;
      }

      // Lerp camera
      const camS = animStateRef.current.camSpherical;
      const targetS = animStateRef.current.targetSpherical;
      camS.radius += (targetS.radius - camS.radius) * 0.09;
      camS.phi += (targetS.phi - camS.phi) * 0.09;
      camS.theta += (targetS.theta - camS.theta) * 0.09;

      const camT = animStateRef.current.camTarget;
      camT.lerp(animStateRef.current.desiredCamTarget, 0.09);

      camera.position.x = camT.x + camS.radius * Math.sin(camS.phi) * Math.sin(camS.theta);
      camera.position.y = camT.y + camS.radius * Math.cos(camS.phi);
      camera.position.z = camT.z + camS.radius * Math.sin(camS.phi) * Math.cos(camS.theta);
      camera.lookAt(camT);

      // Material highlighting & isolation
      const isIso = animStateRef.current.isolateMode;
      const hovId = animStateRef.current.hoveredPartId;

      pickableMeshes.forEach((mesh) => {
        const pid = mesh.userData.partId;
        const isSelected = selId === pid;
        const isHovered = hovId === pid;

        if (isIso && selId && !isSelected) {
          mesh.material = mats.ghostFade;
        } else if (isHovered) {
          mesh.material = mats.hoverHighlight;
        } else {
          mesh.material = mesh.userData.origMaterial;
        }
      });

      // Project 3D positions to 2D screen DOM callout pins
      if (!cleanMode) {
        const rect = container.getBoundingClientRect();
        ROVER_COMPONENTS.forEach((comp) => {
          const pin = domLabelElements[comp.id];
          const grp = componentGroups[comp.id];
          if (!pin || !grp) return;

          tempVec.copy(grp.position);
          if (comp.id === 'servos') {
            tempVec.set(-0.92 - 0.85 * ef, grp.position.y + 0.2, 0.88 + 0.65 * ef);
          }

          tempVec.project(camera);
          const x = (tempVec.x * 0.5 + 0.5) * rect.width;
          const y = (-(tempVec.y * 0.5) + 0.5) * rect.height;

          if (tempVec.z < 1 && x > 25 && x < rect.width - 25 && y > 35 && y < rect.height - 35) {
            pin.style.left = `${x}px`;
            pin.style.top = `${y}px`;
            pin.style.opacity = isIso && selId && selId !== comp.id ? '0.15' : '1';
            pin.style.display = 'block';

            if (selId === comp.id) {
              pin.classList.add('active');
            } else {
              pin.classList.remove('active');
            }
          } else {
            pin.style.display = 'none';
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      renderer.dispose();
      scene.clear();
    };
  }, [handleSelect]);

  return (
    <div
      ref={containerRef}
      className={`rover-cad-simulation ${className}`}
      style={{ height, position: 'relative', overflow: 'hidden' }}
      aria-label="Autonomous Inspection Rover Hardware Simulation"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="rover-cad-canvas"
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
        tabIndex={0}
      />

      {/* 3D Projected Floating Callout Pins */}
      <div
        ref={labelsContainerRef}
        className="cad-labels-container"
        style={{ display: cleanMode ? 'none' : 'block' }}
        aria-hidden="true"
      />

      {/* Scanline & Holographic Overlays */}
      <div className="cad-scanlines" aria-hidden="true" />
      <div className="cad-laser-line" aria-hidden="true" />

      {/* Top Header Badge */}
      {!cleanMode && (
        <div className="cad-top-bar">
          <div className="cad-brand-badge">
            <Wrench size={14} className="text-cyan" />
            <div>
              <strong>AUTONOMOUS INSPECTION ROVER</strong>
              <small>HARDWARE DIGITAL TWIN · EXPLODED CAD VIEW</small>
            </div>
          </div>

          <div className="cad-top-actions">
            <button
              type="button"
              className={`cad-icon-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled((v) => !v)}
              title={soundEnabled ? 'Mute audio' : 'Enable audio feedback'}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            <button
              type="button"
              className={`cad-icon-btn ${autoRotate ? 'active' : ''}`}
              onClick={() => setAutoRotate((v) => !v)}
              title="Toggle orbit rotation"
            >
              <RotateCcw size={13} />
            </button>
            <span className="cad-status-chip">
              <span className="cad-dot" />
              <span>SIMULATED HARDWARE</span>
            </span>
          </div>
        </div>
      )}

      {/* Left Inspector Card */}
      {!cleanMode && (
        <aside className="cad-inspector-panel" aria-label="Component Inspector">
          <div className="inspector-head">
            <div className="inspector-icon-box">
              <Cpu size={18} />
            </div>
            <div className="inspector-titles">
              <span className="inspector-category">{selectedComp.category}</span>
              <h3 className="inspector-name">{selectedComp.name}</h3>
              <span className="inspector-cost">{selectedComp.cost}</span>
            </div>
          </div>
          <p className="inspector-desc">{selectedComp.description}</p>
          <div className="inspector-actions">
            <button
              type="button"
              className={`cad-action-btn ${isolateMode ? 'active' : ''}`}
              onClick={() => {
                sfx.playClick();
                setIsolateMode((v) => !v);
              }}
            >
              {isolateMode ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{isolateMode ? 'Show Full Assembly' : 'Isolate Component'}</span>
            </button>
          </div>
        </aside>
      )}

      {/* Right Component Quick List */}
      {!cleanMode && (
        <aside className="cad-component-list-panel" aria-label="Hardware BOM List">
          <div className="component-list-head">
            <span>9 ROVER SUBSYSTEMS</span>
            <small>EST. COST</small>
          </div>
          <div className="component-list-scroll">
            {ROVER_COMPONENTS.map((comp) => {
              const isSelected = comp.id === selectedPartId;
              return (
                <button
                  key={comp.id}
                  type="button"
                  className={`component-list-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(comp.id, true)}
                >
                  <span className="comp-row-name">{comp.name}</span>
                  <span className="comp-row-cost">{comp.cost}</span>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* Bottom Floating Control Bar */}
      {!cleanMode && (
        <footer className="cad-bottom-bar" aria-label="Exploded View Controls">
          <button
            type="button"
            className="cad-explode-btn"
            onClick={handleToggleExplode}
          >
            <Box size={13} />
            <span>{explodeFactor > 0.5 ? 'ASSEMBLE' : 'EXPLODE'}</span>
          </button>

          <div className="cad-slider-wrap">
            <Sliders size={13} className="text-muted" />
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(explodeFactor * 100)}
              onChange={(e) => {
                const val = Number(e.target.value) / 100;
                setExplodeFactor(val);
                animStateRef.current.targetExplode = val;
              }}
              className="cad-range-slider"
              aria-label="Explode Percentage"
            />
            <span className="cad-pct-label">{Math.round(explodeFactor * 100)}%</span>
          </div>

          <button
            type="button"
            className="cad-reset-btn"
            onClick={handleResetCamera}
            title="Reset Viewpoint"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </footer>
      )}
    </div>
  );
}
