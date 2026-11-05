import '../landing.css';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, Box, ChevronDown, ChevronRight,
  Cpu, Eye, Layers, Radio, Shield, ShieldCheck, Target, Zap,
  Volume2, VolumeX, Wrench, RotateCcw, Menu, X
} from 'lucide-react';
import { RoverCadSimulation, ROVER_COMPONENTS, sfx } from '../components/RoverCadSimulation';
import { TunnelSimulationSection } from '../components/TunnelSimulationSection';

/* ─── Smooth-scroll helper ─── */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ─── Single "count-up" hook ─── */
function useCountUp(target: number, trigger: boolean, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.round(start));
      if (start >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [trigger, target, duration]);
  return val;
}

/* ─── Intersection observer hook ─── */
function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

/* ─────────────────────────────────────────────────────────────────
   LANDING PAGE ROOT
──────────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const [soundOn, setSoundOn] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.enabled = next;
    if (next) sfx.playClick();
  };

  const navLinks = [
    { label: 'About', id: 'about' },
    { label: 'Technology', id: 'technology' },
    { label: 'CAD View', id: 'exploded-view' },
    { label: 'Components', id: 'budget' },
    { label: 'Capabilities', id: 'capabilities' },
  ];

  return (
    <div className="land-root">
      {/* ══════════════════════ STICKY NAV ══════════════════════ */}
      <header className={`land-nav ${scrolled ? 'land-nav-glass' : ''}`}>
        <div className="land-nav-inner">
          <Link to="/" className="land-brand" onClick={() => sfx.playClick()}>
            <div className="land-brand-icon">
              <img src="/mineguard-mark.svg" alt="MineGuard" className="land-logo-img" />
              <span className="land-logo-pulse" />
            </div>
            <div>
              <span className="land-brand-name">MINEGUARD<span className="land-brand-ai">AI</span></span>
              <span className="land-brand-sub">UNDERGROUND ROBOTICS</span>
            </div>
          </Link>

          <nav className="land-desktop-nav" aria-label="Landing navigation">
            {navLinks.map(l => (
              <button key={l.id} type="button" className="land-nav-link"
                onClick={() => { sfx.playClick(); scrollTo(l.id); }}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="land-nav-actions">
            <button type="button" className={`land-sound-btn ${soundOn ? 'active' : ''}`}
              onClick={toggleSound} aria-label="Toggle sound effects">
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <Link to="/command" className="land-nav-console-btn" onClick={() => sfx.playClick()}>
              <Activity size={14} />
              <span>Operations Console</span>
              <ArrowRight size={13} />
            </Link>
            <button type="button" className="land-mobile-menu-btn"
              onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="land-mobile-drawer">
            {navLinks.map(l => (
              <button key={l.id} type="button" className="land-mobile-link"
                onClick={() => { sfx.playClick(); scrollTo(l.id); setMobileOpen(false); }}>
                <Cpu size={14} />
                <span>{l.label}</span>
              </button>
            ))}
            <div className="land-mobile-ctas">
              <Link to="/command" className="land-cta-btn-primary full-w"
                onClick={() => { sfx.playClick(); setMobileOpen(false); }}>
                <Activity size={16} /> Operations Console
              </Link>
              <Link to="/map" className="land-cta-btn-secondary full-w"
                onClick={() => { sfx.playClick(); setMobileOpen(false); }}>
                <Box size={16} /> 3D Mine Map
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════ SECTION 1 — HERO ══════════════════════ */}
      <HeroSection />

      {/* ══════════════════════ SECTION 1.5 — 3D TECHNICAL SIMULATION ══════════════════════ */}
      <TunnelSimulationSection />

      {/* ══════════════════════ SECTION 2 — ABOUT ══════════════════════ */}
      <AboutSection />

      {/* ══════════════════════ SECTION 3 — TECHNOLOGY ══════════════════ */}
      <TechnologySection />

      {/* ══════════════════════ SECTION 4 — EXPLODED CAD VIEW ═══════════ */}
      <ExplodedViewSection />

      {/* ══════════════════════ SECTION 5 — COMPONENTS & BUDGET ═════════ */}
      <BudgetSection />

      {/* ══════════════════════ SECTION 6 — CAPABILITIES ════════════════ */}
      <CapabilitiesSection />

      {/* ══════════════════════ FOOTER ═══════════════════════════════════ */}
      <LandingFooter />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION 1 — HERO
──────────────────────────────────────────────────────────────────── */
function HeroSection() {
  const [tick, setTick] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  const headlines = [
    'Navigate the Depths.',
    'Guard Every Tunnel.',
    'Sense. Decide. Protect.',
  ];

  return (
    <section className="hero-section" onMouseMove={handleMouseMove}>
      {/* Background grid */}
      <div className="hero-grid-bg" />
      {/* Scanline overlay */}
      <div className="hero-scanlines" />
      {/* Vignette */}
      <div className="hero-vignette" />

      {/* Floating HUD corner marks */}
      <span className="hud-corner hud-tl" />
      <span className="hud-corner hud-tr" />
      <span className="hud-corner hud-bl" />
      <span className="hud-corner hud-br" />

      {/* STATUS bar top */}
      <div className="hero-status-bar">
        <span className="hero-status-dot" /><span>SYSTEM ONLINE</span>
        <span className="hero-status-sep">|</span>
        <span>UNIT: MK-IV-ALPHA</span>
        <span className="hero-status-sep">|</span>
        <span className="hero-status-label">PROTOTYPE DEMONSTRATION</span>
      </div>

      <div className="hero-content-layout">
        {/* LEFT — text column */}
        <div className="hero-text-col"
          style={{
            transform: `translate(${mousePos.x * -12}px, ${mousePos.y * -6}px)`,
            transition: 'transform 0.4s ease-out',
          }}>
          <div className="hero-eyebrow">
            <span className="hero-eye-dot" />
            <span>UNDERGROUND AUTONOMOUS RECONNAISSANCE ROVER</span>
          </div>

          <h1 className="hero-headline">
            <span className="hero-h1-static">MINEGUARD</span>
            <span className="hero-h1-ai">AI</span>
          </h1>

          <p className="hero-rotating-sub" key={tick}>
            {headlines[tick % headlines.length]}
          </p>

          <p className="hero-desc">
            A proof-of-concept autonomous inspection rover built to operate in
            hazardous underground environments—detecting gas levels, mapping
            tunnel cross-sections, and streaming real-time telemetry to surface
            control rooms. <span className="hero-disclaimer">Prototype demonstration · simulated data · no live mine connection.</span>
          </p>

          <div className="hero-cta-row">
            <Link to="/command" className="land-cta-btn-primary hero-cta-main"
              onClick={() => sfx.playClick()}>
              <span className="cta-glow" />
              <Activity size={18} />
              <span>Launch Operations Console</span>
              <ArrowRight size={16} />
            </Link>
            <button type="button" className="land-cta-btn-secondary hero-cta-sec"
              onClick={() => { sfx.playClick(); scrollTo('exploded-view'); }}>
              <Layers size={16} />
              <span>Explore Rover CAD</span>
            </button>
          </div>

          {/* Quick stats */}
          <div className="hero-quick-stats">
            <div className="hero-stat">
              <span className="stat-num">9</span>
              <span className="stat-label">Subsystems</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="stat-num">360°</span>
              <span className="stat-label">LiDAR Coverage</span>
            </div>
            <div className="hero-stat-sep" />
            <div className="hero-stat">
              <span className="stat-num">6-Axis</span>
              <span className="stat-label">IMU Telemetry</span>
            </div>
          </div>
        </div>

        {/* RIGHT — 3D rover */}
        <div className="hero-rover-col"
          style={{
            transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 5}px)`,
            transition: 'transform 0.4s ease-out',
          }}>
          <div className="hero-rover-frame">
            <div className="rover-frame-corner rover-frame-tl" />
            <div className="rover-frame-corner rover-frame-tr" />
            <div className="rover-frame-corner rover-frame-bl" />
            <div className="rover-frame-corner rover-frame-br" />
            <RoverCadSimulation height={520} cleanMode={true} />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <button type="button" className="hero-scroll-cue"
        onClick={() => { sfx.playClick(); scrollTo('about'); }}>
        <ChevronDown size={22} />
        <span>Scroll to explore</span>
      </button>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION 2 — ABOUT
──────────────────────────────────────────────────────────────────── */
function AboutSection() {
  const { ref, vis } = useVisible();

  const cards = [
    {
      icon: <Shield size={28} />,
      title: 'Safety-First Design',
      body: 'Built to operate where humans cannot safely go—hazardous gas environments, structurally compromised tunnels, and post-blast assessment zones.',
    },
    {
      icon: <Eye size={28} />,
      title: 'Real-Time Awareness',
      body: 'Continuous LiDAR scanning paired with thermal IR detection streams live obstacle maps and thermal anomalies to surface operators.',
    },
    {
      icon: <Cpu size={28} />,
      title: 'Embedded Intelligence',
      body: 'On-board ATmega328P MCU and 6-axis IMU provide immediate pitch/roll/heading data to prevent rollover incidents in steep tunnels.',
    },
    {
      icon: <Activity size={28} />,
      title: 'Decision Support',
      body: 'All telemetry feeds the MineGuard operations console—a human-driven decision-support prototype, never an autonomous safety authority.',
    },
  ];

  return (
    <section id="about" ref={ref as React.RefObject<HTMLElement>} className="land-section about-section">
      <div className="section-container">
        <div className={`section-header ${vis ? 'vis-in' : 'vis-out'}`}>
          <span className="section-eyebrow"><span className="eye-rule" />ABOUT THE ROVER<span className="eye-rule" /></span>
          <h2 className="section-h2">Autonomous Underground<br /><span className="h2-accent">Reconnaissance Platform</span></h2>
          <p className="section-lead">
            MineGuard AI is a university-level robotics prototype demonstrating how low-cost,
            purpose-built autonomous rovers can extend the perceptual range of mine safety
            teams—without replacing human judgment or certified instruments.
          </p>
        </div>

        <div className={`about-cards-grid ${vis ? 'vis-in' : 'vis-out'}`}>
          {cards.map((c, i) => (
            <div key={c.title} className="about-card" style={{ animationDelay: `${i * 0.12}s` }}>
              <div className="about-card-icon">{c.icon}</div>
              <h3 className="about-card-title">{c.title}</h3>
              <p className="about-card-body">{c.body}</p>
              <div className="about-card-corner-tl" /><div className="about-card-corner-br" />
            </div>
          ))}
        </div>

        <div className={`about-mission-block ${vis ? 'vis-in' : 'vis-out'}`}>
          <div className="mission-panel">
            <span className="mission-label">MISSION</span>
            <p>Extend the perceptual range of mine safety officers through autonomous telemetry,
              enabling faster, more informed inspection decisions—while keeping every critical
              action in the hands of qualified humans.</p>
          </div>
          <div className="mission-panel">
            <span className="mission-label">VISION</span>
            <p>A future where no miner enters an unvalidated space without prior robotic
              reconnaissance—reducing first-contact risk and improving real-time situational
              intelligence across underground operations.</p>
          </div>
          <div className="mission-panel">
            <span className="mission-label">DISCLAIMER</span>
            <p className="disclaimer-text">This is a demonstration prototype using simulated data.
              It does not constitute a certified safety instrument, regulatory approval, or
              live mine integration. All sensor thresholds are illustrative.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION 3 — TECHNOLOGY
──────────────────────────────────────────────────────────────────── */
function TechnologySection() {
  const { ref, vis } = useVisible();
  const [active, setActive] = useState(0);

  const techs = [
    {
      id: 'lidar',
      icon: <Radio size={32} />,
      name: 'LiDAR Navigation',
      sub: '360° Laser Ranging',
      color: '#00f3ff',
      specs: ['High-speed spinning optical turret', '360° horizontal sweep', 'Real-time tunnel cross-section capture', 'Obstacle distance measurement', 'Point-cloud data streaming'],
      desc: 'The LiDAR module acts as the rover\'s primary spatial sense—spinning continuously to build a real-time map of the surrounding tunnel geometry. Distance readings feed directly into the navigation system to avoid collisions and map new passages.',
    },
    {
      id: 'camera',
      icon: <Eye size={32} />,
      name: 'AI Vision Camera',
      sub: 'Optical + Thermal Imaging',
      color: '#ff7b00',
      specs: ['Long-wave infrared thermal detection', 'Spontaneous combustion identification', 'Machinery overheat monitoring', 'Hot-spot localization', 'Integrated with MPU orientation data'],
      desc: 'The heat sensor provides a thermal layer on top of optical navigation—identifying anomalous temperature signatures that indicate fire risk, equipment overheating, or geological thermal activity before they escalate.',
    },
    {
      id: 'processor',
      icon: <Cpu size={32} />,
      name: 'Central AI Processor',
      sub: 'ATmega328P MCU + I2C Bus',
      color: '#00f3ff',
      specs: ['Arduino Nano (ATmega328P)', 'Real-time sensor loop management', 'I2C telemetry communications', 'PCA9685 16-channel PWM expander', '8-bit processing at 16MHz'],
      desc: 'The Arduino Nano serves as the central processing hub—running tight real-time loops to poll all sensors, compute navigation decisions, and relay telemetry. The PCA9685 PWM expander allows precise simultaneous control of all servo actuators.',
    },
    {
      id: 'armor',
      icon: <Shield size={32} />,
      name: 'Adaptive Armor',
      sub: 'Acrylic / 3D-Printed Chassis',
      color: '#ff7b00',
      specs: ['Impact-resistant reinforced chassis', 'Sealed equipment tub', 'Dust and moisture barrier', 'Modular panel design', 'Lightweight structural frame'],
      desc: 'The rover body combines laser-cut acrylic sheets with 3D-printed structural brackets to create a lightweight but resilient chassis. The sealed equipment tub protects electronics from coal dust, humidity, and minor impact events.',
    },
    {
      id: 'wheels',
      icon: <RotateCcw size={32} />,
      name: 'All-Terrain Wheels',
      sub: 'High-Traction Rubber Treads',
      color: '#00f3ff',
      specs: ['High-traction rubber compound', '4× metal-gear servo drive', 'Independent wheel articulation', 'Low-slip tunnel floor grip', 'Operates on gravel, mud, rails'],
      desc: 'Four rubber-compound wheels driven by high-torque metal-gear servos provide reliable traction on the uneven, often wet surfaces of underground mine workings. The independent drive configuration allows precise differential steering.',
    },
    {
      id: 'suspension',
      icon: <Layers size={32} />,
      name: 'Advanced Suspension',
      sub: 'Metal-Gear Servo Articulation',
      color: '#ff7b00',
      specs: ['4× MG996R high-torque servos', 'Brass/metal geartrain', 'Articulated suspension geometry', 'Incline stability to ±30°', 'Real-time MPU6050 rollover detection'],
      desc: 'The suspension system uses precision metal-gear servos with an articulated geometry that keeps all four wheels in contact with uneven tunnel floors. The MPU6050 continuously monitors chassis pitch and roll to prevent tip-overs on steep inclines.',
    },
    {
      id: 'stability',
      icon: <Target size={32} />,
      name: 'Stability Base',
      sub: 'MPU6050 6-Axis IMU',
      color: '#00f3ff',
      specs: ['6-axis MEMS accelerometer', 'MEMS gyroscope', 'Pitch and roll telemetry', 'Rollover hazard detection', '100Hz sensor update rate'],
      desc: 'The MPU6050 inertial measurement unit provides continuous orientation data at 100Hz—detecting sudden tilts, chassis vibrations from loose ground, and incline angles to trigger corrective steering or alert operators to hazardous terrain.',
    },
  ];

  const t = techs[active];

  return (
    <section id="technology" ref={ref as React.RefObject<HTMLElement>} className="land-section tech-section">
      <div className="tech-bg-grid" />
      <div className="section-container">
        <div className={`section-header ${vis ? 'vis-in' : 'vis-out'}`}>
          <span className="section-eyebrow"><span className="eye-rule" />TECHNICAL SUBSYSTEMS<span className="eye-rule" /></span>
          <h2 className="section-h2">Engineering Stack</h2>
          <p className="section-lead">Seven integrated subsystems working in concert to deliver autonomous underground reconnaissance capability.</p>
        </div>

        <div className={`tech-layout ${vis ? 'vis-in' : 'vis-out'}`}>
          {/* Left: tab list */}
          <div className="tech-tab-list">
            {techs.map((tech, i) => (
              <button key={tech.id} type="button"
                className={`tech-tab ${active === i ? 'tech-tab-active' : ''}`}
                onClick={() => { setActive(i); sfx.playClick(); }}
                style={{ '--tab-color': tech.color } as React.CSSProperties}>
                <div className="tech-tab-icon">{tech.icon}</div>
                <div className="tech-tab-text">
                  <strong>{tech.name}</strong>
                  <span>{tech.sub}</span>
                </div>
                <ChevronRight size={16} className="tech-tab-arrow" />
              </button>
            ))}
          </div>

          {/* Right: detail panel */}
          <div className="tech-detail-panel" key={active}
            style={{ '--tab-color': t.color } as React.CSSProperties}>
            <div className="tech-detail-header">
              <div className="tech-detail-icon-wrap">{t.icon}</div>
              <div>
                <h3 className="tech-detail-name">{t.name}</h3>
                <span className="tech-detail-sub">{t.sub}</span>
              </div>
            </div>
            <p className="tech-detail-desc">{t.desc}</p>
            <div className="tech-specs-grid">
              {t.specs.map(s => (
                <div key={s} className="tech-spec-row">
                  <span className="spec-bullet" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="tech-detail-footer">
              <button type="button" className="tech-view-cad-btn"
                onClick={() => { sfx.playClick(); scrollTo('exploded-view'); }}>
                <Layers size={14} />
                <span>View in CAD Exploded View</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="tech-corner-tl" /><div className="tech-corner-br" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION 4 — EXPLODED CAD VIEW
──────────────────────────────────────────────────────────────────── */
function ExplodedViewSection() {
  const { ref, vis } = useVisible(0.05);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedComp = ROVER_COMPONENTS.find(c => c.id === selectedId);

  return (
    <section id="exploded-view" ref={ref as React.RefObject<HTMLElement>} className="land-section cad-section">
      <div className="cad-bg-grid" />
      <div className="section-container cad-section-container">
        <div className={`section-header ${vis ? 'vis-in' : 'vis-out'}`}>
          <span className="section-eyebrow"><span className="eye-rule" />ASSEMBLY ANATOMY<span className="eye-rule" /></span>
          <h2 className="section-h2">Holographic Exploded<br /><span className="h2-accent">CAD View</span></h2>
          <p className="section-lead">
            Interact with the 3D rover assembly below. Click any subsystem component to isolate it,
            drag to orbit, and use the explode slider to inspect internal architecture.
          </p>
        </div>

        <div className={`cad-layout ${vis ? 'vis-in' : 'vis-out'}`}>
          {/* Main 3D canvas */}
          <div className="cad-canvas-wrap">
            <div className="cad-frame-corners">
              <span className="cfc tl" /><span className="cfc tr" />
              <span className="cfc bl" /><span className="cfc br" />
            </div>
            <div className="cad-top-bar">
              <span className="cad-top-label"><span className="dot-active" />HOLOGRAPHIC CAD ENGINE</span>
              <span className="cad-top-hint">Drag · Scroll · Click component to inspect</span>
            </div>
            <RoverCadSimulation
              height={560}
              cleanMode={true}
              onSelectComponent={(comp) => setSelectedId(comp.id)}
            />
          </div>

          {/* Hotspot list sidebar */}
          <div className="cad-hotspot-sidebar">
            <div className="hotspot-header">
              <span className="hotspot-header-label">COMPONENT MANIFEST</span>
              <span className="hotspot-count">{ROVER_COMPONENTS.length} PARTS</span>
            </div>
            <div className="hotspot-list">
              {ROVER_COMPONENTS.map(comp => (
                <button key={comp.id} type="button"
                  className={`hotspot-item ${selectedId === comp.id ? 'hotspot-active' : ''}`}
                  onClick={() => { sfx.playClick(); setSelectedId(comp.id === selectedId ? null : comp.id); }}>
                  <div className="hotspot-item-left">
                    <span className="hotspot-dot" />
                    <div>
                      <strong>{comp.name}</strong>
                      <small>{comp.category}</small>
                    </div>
                  </div>
                  <span className="hotspot-cost">{comp.cost}</span>
                </button>
              ))}
            </div>

            {/* Inspection panel */}
            {selectedComp && (
              <div className="hotspot-inspector">
                <div className="inspector-header">
                  <Wrench size={14} />
                  <span>{selectedComp.name}</span>
                </div>
                <p className="inspector-category">{selectedComp.category}</p>
                <p className="inspector-desc">{selectedComp.description}</p>
                <div className="inspector-cost-row">
                  <span>Est. Cost</span>
                  <span className="inspector-cost-val">{selectedComp.cost}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION 5 — COMPONENTS & BUDGET
──────────────────────────────────────────────────────────────────── */
function BudgetSection() {
  const { ref, vis } = useVisible();

  const components = ROVER_COMPONENTS.map((c, i) => ({
    no: i + 1,
    name: c.name,
    category: c.category,
    cost: c.cost,
    desc: c.description,
  }));

  const totalNote = '₹5,265 – ₹8,980 (prototype estimate)';

  return (
    <section id="budget" ref={ref as React.RefObject<HTMLElement>} className="land-section budget-section">
      <div className="section-container">
        <div className={`section-header ${vis ? 'vis-in' : 'vis-out'}`}>
          <span className="section-eyebrow"><span className="eye-rule" />BILL OF MATERIALS<span className="eye-rule" /></span>
          <h2 className="section-h2">Components &amp;<br /><span className="h2-accent">Budget Breakdown</span></h2>
          <p className="section-lead">
            All component costs are real-market estimates in Indian Rupees for prototype-quantity
            purchasing. No prices have been invented or guaranteed.
          </p>
        </div>

        <div className={`budget-table-wrap ${vis ? 'vis-in' : 'vis-out'}`}>
          <table className="budget-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Component</th>
                <th>Category</th>
                <th>Estimated Cost</th>
                <th>Function</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={c.name} className="budget-row" style={{ animationDelay: `${i * 0.06}s` }}>
                  <td className="budget-num">{String(c.no).padStart(2, '0')}</td>
                  <td className="budget-name">{c.name}</td>
                  <td><span className="budget-category">{c.category}</span></td>
                  <td className="budget-cost">{c.cost}</td>
                  <td className="budget-desc">{c.desc}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="budget-total-row">
                <td colSpan={3}><strong>TOTAL ESTIMATED PROTOTYPE COST</strong></td>
                <td colSpan={2} className="budget-total-val">{totalNote}</td>
              </tr>
            </tfoot>
          </table>
          <div className="budget-note">
            <AlertTriangle size={13} />
            <span>
              These are market-survey estimates for prototype quantities, not production costs or
              guaranteed prices. Actual costs vary by supplier, region, and quantity.
            </span>
          </div>
        </div>

        {/* Summary cards */}
        <div className={`budget-summary-row ${vis ? 'vis-in' : 'vis-out'}`}>
          {[
            { label: 'Total Components', val: '9', note: 'Hardware subsystems' },
            { label: 'Controller', val: 'Arduino Nano', note: 'ATmega328P MCU' },
            { label: 'Sensor Suite', val: 'LiDAR + IR', note: '360° + thermal' },
            { label: 'Drive System', val: '4× Servo', note: 'Metal-gear actuators' },
          ].map(s => (
            <div key={s.label} className="budget-sum-card">
              <span className="bsc-val">{s.val}</span>
              <span className="bsc-label">{s.label}</span>
              <span className="bsc-note">{s.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SECTION 6 — CAPABILITIES
──────────────────────────────────────────────────────────────────── */
function CapabilitiesSection() {
  const { ref, vis } = useVisible();
  const statsTrigger = vis;
  const c1 = useCountUp(360, statsTrigger);
  const c2 = useCountUp(100, statsTrigger);
  const c3 = useCountUp(15, statsTrigger);
  const c4 = useCountUp(6, statsTrigger);

  const caps = [
    {
      icon: <ShieldCheck size={36} />,
      title: 'Smart Safety',
      color: '#00f3ff',
      points: [
        'Automated thermal hazard detection',
        'Spontaneous combustion alerting',
        'Real-time gas and dust monitoring integration',
        'Rollover prevention via IMU telemetry',
      ],
    },
    {
      icon: <Eye size={36} />,
      title: 'AI-Powered Detection',
      color: '#ff7b00',
      points: [
        '360° LiDAR obstacle mapping',
        'Thermal IR anomaly identification',
        'Structural profile cross-section capture',
        'Sensor fusion across camera + IMU + LiDAR',
      ],
    },
    {
      icon: <Target size={36} />,
      title: 'Precision Mobility',
      color: '#00f3ff',
      points: [
        'Differential steering on rough terrain',
        'Metal-gear servo drive articulation',
        'All-terrain high-traction rubber wheels',
        'Incline operation up to ±30° gradient',
      ],
    },
    {
      icon: <Zap size={36} />,
      title: 'Long Endurance',
      color: '#ff7b00',
      points: [
        'Regulated dual-rail power supply',
        'Low-voltage battery cut-off protection',
        'Surge isolation for mining environments',
        'Hot-swap battery architecture (planned)',
      ],
    },
  ];

  return (
    <section id="capabilities" ref={ref as React.RefObject<HTMLElement>} className="land-section capabilities-section">
      <div className="cap-bg-radial" />
      <div className="section-container">
        <div className={`section-header ${vis ? 'vis-in' : 'vis-out'}`}>
          <span className="section-eyebrow"><span className="eye-rule" />OPERATIONAL CAPABILITIES<span className="eye-rule" /></span>
          <h2 className="section-h2">What MineGuard<br /><span className="h2-accent">Can Do</span></h2>
          <p className="section-lead">
            Four core capability domains make the MineGuard rover a versatile
            first-responder tool for underground reconnaissance missions.
          </p>
        </div>

        {/* Live counters */}
        <div className={`cap-stats-row ${vis ? 'vis-in' : 'vis-out'}`}>
          <div className="cap-stat">
            <span className="cap-stat-num">{c1}°</span>
            <span className="cap-stat-label">LiDAR Coverage</span>
          </div>
          <div className="cap-stat">
            <span className="cap-stat-num">{c2}Hz</span>
            <span className="cap-stat-label">IMU Update Rate</span>
          </div>
          <div className="cap-stat">
            <span className="cap-stat-num">{c3}m</span>
            <span className="cap-stat-label">Scan Range</span>
          </div>
          <div className="cap-stat">
            <span className="cap-stat-num">{c4}-Axis</span>
            <span className="cap-stat-label">Motion Tracking</span>
          </div>
        </div>

        {/* Capability cards */}
        <div className={`cap-cards-grid ${vis ? 'vis-in' : 'vis-out'}`}>
          {caps.map((cap, i) => (
            <div key={cap.title} className="cap-card"
              style={{ '--cap-color': cap.color, animationDelay: `${i * 0.1}s` } as React.CSSProperties}>
              <div className="cap-card-icon-wrap">{cap.icon}</div>
              <h3 className="cap-card-title">{cap.title}</h3>
              <ul className="cap-card-list">
                {cap.points.map(p => (
                  <li key={p}>
                    <span className="cap-bullet" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="cap-card-glow" />
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className={`cap-cta-row ${vis ? 'vis-in' : 'vis-out'}`}>
          <Link to="/command" className="land-cta-btn-primary cap-cta-main"
            onClick={() => sfx.playClick()}>
            <Activity size={18} />
            <span>Open Operations Console</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/map" className="land-cta-btn-secondary"
            onClick={() => sfx.playClick()}>
            <Box size={16} />
            <span>Subterranean 3D Mine Map</span>
          </Link>
          <Link to="/monitoring" className="land-cta-btn-secondary"
            onClick={() => sfx.playClick()}>
            <Radio size={16} />
            <span>Live Monitoring Dashboard</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FOOTER
──────────────────────────────────────────────────────────────────── */
function LandingFooter() {
  const appLinks = [
    { label: 'Command Centre', to: '/command' },
    { label: 'Live Monitoring', to: '/monitoring' },
    { label: 'Mine Map (3D)', to: '/map' },
    { label: 'Inspections Queue', to: '/inspections' },
    { label: 'Worker Safety', to: '/workforce' },
    { label: 'About MineGuard', to: '/about' },
  ];

  return (
    <footer className="land-footer">
      <div className="footer-grid-bg" />
      <div className="footer-inner">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <img src="/mineguard-mark.svg" alt="MineGuard" className="footer-logo" />
            <div>
              <span className="footer-brand-name">MINEGUARD<span>AI</span></span>
              <span className="footer-brand-sub">UNDERGROUND ROBOTICS &amp; SAFETY INTELLIGENCE</span>
            </div>
          </div>
          <p className="footer-brand-desc">
            A proof-of-concept autonomous reconnaissance rover and decision-support
            prototype. All data shown is simulated. No live mine connection.
          </p>
          <div className="footer-tags">
            <span>Prototype Demonstration</span>
            <span>Simulated Data</span>
            <span>No Live Connection</span>
          </div>
        </div>

        <div className="footer-links-col">
          <span className="footer-col-heading">APPLICATION MODULES</span>
          <ul className="footer-link-list">
            {appLinks.map(l => (
              <li key={l.to}>
                <Link to={l.to} className="footer-link" onClick={() => sfx.playClick()}>
                  <ChevronRight size={12} />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links-col">
          <span className="footer-col-heading">ROVER SUBSYSTEMS</span>
          <ul className="footer-link-list">
            {ROVER_COMPONENTS.map(c => (
              <li key={c.id}>
                <button type="button" className="footer-link footer-btn-link"
                  onClick={() => { sfx.playClick(); scrollTo('exploded-view'); }}>
                  <ChevronRight size={12} />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links-col">
          <span className="footer-col-heading">PROJECT INFO</span>
          <div className="footer-info-block">
            <div className="footer-info-row">
              <span className="info-label">Platform</span>
              <span>React 19 + TypeScript + Vite</span>
            </div>
            <div className="footer-info-row">
              <span className="info-label">3D Engine</span>
              <span>Three.js r181</span>
            </div>
            <div className="footer-info-row">
              <span className="info-label">State</span>
              <span>Zustand 5</span>
            </div>
            <div className="footer-info-row">
              <span className="info-label">Rover MCU</span>
              <span>ATmega328P (Arduino Nano)</span>
            </div>
            <div className="footer-info-row">
              <span className="info-label">Status</span>
              <span className="info-prototype">Prototype Demo</span>
            </div>
          </div>
          <Link to="/about" className="footer-about-link" onClick={() => sfx.playClick()}>
            <ShieldCheck size={14} />
            <span>System Boundaries &amp; Disclaimer</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 MINEGUARD AI — Robotics Prototype. All demonstration data is fictional and simulated.</span>
        <span className="footer-bottom-right">
          <span className="footer-bottom-dot" />OFFLINE PROTOTYPE · NO LIVE DATA
        </span>
      </div>
    </footer>
  );
}
