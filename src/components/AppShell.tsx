import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, Bell, BookOpen, Bot,
  ChevronRight, ClipboardList, Compass, FileBarChart2,
  Home, Map, Menu, Moon, PanelLeft, PanelLeftClose,
  PanelLeftOpen, Search, Settings2, ShieldCheck, Sun,
  TrendingUp, Users, X
} from 'lucide-react';
import { roles, useMineStore } from '../store/useMineStore';
import { roleDestinations } from '../data/routeDefaults';
import { mine } from '../data/seed';
import { OnboardingModal } from './OnboardingModal';
import { GuidedDemoModal } from './GuidedDemoModal';

type SearchResult = { title: string; detail: string; path: string; zoneId?: string; kind: string };

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('mineguard_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const role = useMineStore((state) => state.role);
  const setRole = useMineStore((state) => state.setRole);
  const darkMode = useMineStore((state) => state.darkMode);
  const setDarkMode = useMineStore((state) => state.setDarkMode);
  const zones = useMineStore((state) => state.zones);
  const sensors = useMineStore((state) => state.sensors);
  const workers = useMineStore((state) => state.workers);
  const alerts = useMineStore((state) => state.alerts);
  const inspections = useMineStore((state) => state.inspections);
  const setActiveZoneId = useMineStore((state) => state.setActiveZoneId);

  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mineguard_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  function chooseRole(value: typeof roles[number]) {
    setRole(value);
    setRoleMenuOpen(false);
    navigate(roleDestinations[value].path);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setNotificationsOpen(false);
        setRoleMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = search.trim().toLowerCase();
    const items: SearchResult[] = [
      ...zones.map((item) => ({ title: item.name, detail: `Mine sector · ${item.state}`, path: '/map', zoneId: item.id, kind: 'ZONE' })),
      ...sensors.map((item) => ({ title: item.id, detail: `${item.measure} · ${item.location} · ${item.status}`, path: '/monitoring', zoneId: item.zoneId, kind: 'SENSOR' })),
      ...workers.map((item) => ({ title: item.id, detail: `${item.team} · ${item.location} · ${item.exitStatus}`, path: '/workforce', kind: 'WORKER' })),
      ...alerts.map((item) => ({ title: item.title, detail: `${item.severity} · ${zones.find((zone) => zone.id === item.zoneId)?.name ?? item.zoneId}`, path: '/hazards', zoneId: item.zoneId, kind: 'ALERT' })),
      ...inspections.map((item) => ({ title: item.requiredVerification, detail: `${zones.find((zone) => zone.id === item.zoneId)?.name ?? item.zoneId} · ${item.status}`, path: '/incidents', zoneId: item.zoneId, kind: 'INCIDENT' })),
      { title: 'Command Center', detail: 'Primary operations overview and metrics', path: '/command', kind: 'PAGE' },
      { title: 'Live Monitoring', detail: 'Real-time atmospheric telemetry and readings', path: '/monitoring', kind: 'PAGE' },
      { title: 'Underground Map', detail: '2D/3D spatial twin and depth levels', path: '/map', kind: 'PAGE' },
      { title: 'Robotics Fleet', detail: 'Autonomous rovers and drones status', path: '/robotics', kind: 'PAGE' },
      { title: 'Hazard Detection', detail: 'Centralized safety alerts and severity queue', path: '/hazards', kind: 'PAGE' },
      { title: 'Incident Management', detail: 'Prioritized verification tasks and assignments', path: '/incidents', kind: 'PAGE' },
      { title: 'Analytics', detail: 'Safety indicators and 7d/30d trends', path: '/analytics', kind: 'PAGE' },
      { title: 'Reports', detail: 'Shift handovers and CSV/PDF export', path: '/reports', kind: 'PAGE' },
      { title: 'Settings', detail: 'Display preferences and integrations', path: '/settings', kind: 'PAGE' },
    ];
    return q
      ? items.filter((item) => `${item.title} ${item.detail} ${item.kind}`.toLowerCase().includes(q)).slice(0, 12)
      : items.filter((item) => ['PAGE', 'ALERT', 'ZONE'].includes(item.kind)).slice(0, 8);
  }, [search, zones, sensors, workers, alerts, inspections]);

  const openResult = (result: SearchResult) => {
    if (result.zoneId) setActiveZoneId(result.zoneId);
    navigate(result.path);
    setPaletteOpen(false);
    setSearch('');
    setMobileOpen(false);
  };

  const openAlerts = alerts
    .filter((alert) => alert.state !== 'resolved')
    .sort((a, b) => ({ Critical: 4, High: 3, Medium: 2, Low: 1 }[b.severity] - { Critical: 4, High: 3, Medium: 2, Low: 1 }[a.severity]));

  const breadcrumbs = getBreadcrumb(location.pathname);

  return (
    <div className={`app-frame ${darkMode ? 'theme-dark' : ''} ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* ==================================================================== */}
      {/* A. LEFT SIDEBAR                                                      */}
      {/* ==================================================================== */}
      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="brand-lockup">
          <img src="/mineguard-mark.svg" alt="MineGuard AI logo" className="brand-logo" />
          {!sidebarCollapsed && (
            <div className="brand-text">
              <span className="brand-word">MINEGUARD<span>AI</span></span>
              <span className="brand-caption">INDUSTRIAL INTELLIGENCE</span>
            </div>
          )}
          <button
            type="button"
            className="icon-button desktop-collapse-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button
            type="button"
            className="icon-button sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mine Site Status Badge */}
        {!sidebarCollapsed && (
          <div className="sidebar-mine">
            <span className="mine-state-dot" />
            <div className="sidebar-mine-info">
              <strong>{mine.name}</strong>
              <small>COAL SEAM · LEVEL -180M</small>
            </div>
          </div>
        )}

        {/* Back to Public Landing */}
        {!sidebarCollapsed && (
          <NavLink to="/" className="sidebar-product-link">
            <span>← Product Overview</span>
          </NavLink>
        )}

        {/* Navigation Categories */}
        <nav className="nav-scroll" aria-label="Main navigation categories">
          {/* 1. WORKSPACE */}
          <div className="nav-section-caption">{!sidebarCollapsed ? 'WORKSPACE' : '•••'}</div>

          <NavLink
            to="/command"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Command Center"
          >
            <Home size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Command Center</span>}
          </NavLink>

          <NavLink
            to="/monitoring"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Live Monitoring"
          >
            <Activity size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Live Monitoring</span>}
          </NavLink>

          <NavLink
            to="/map"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Underground Map"
          >
            <Map size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Underground Map</span>}
          </NavLink>

          <NavLink
            to="/robotics"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Robotics Fleet"
          >
            <Bot size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Robotics Fleet</span>}
          </NavLink>

          {/* 2. SAFETY */}
          <div className="nav-section-caption nav-section-divider">{!sidebarCollapsed ? 'SAFETY' : '•••'}</div>

          <NavLink
            to="/hazards"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Hazard Detection"
          >
            <AlertTriangle size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Hazard Detection</span>}
            {openAlerts.length > 0 && (
              <span className={`nav-count ${sidebarCollapsed ? 'nav-count-mini' : ''}`}>
                {openAlerts.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/incidents"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Incident Management"
          >
            <ClipboardList size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Incident Management</span>}
          </NavLink>

          {/* 3. INSIGHTS */}
          <div className="nav-section-caption nav-section-divider">{!sidebarCollapsed ? 'INSIGHTS' : '•••'}</div>

          <NavLink
            to="/analytics"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Analytics"
          >
            <TrendingUp size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Analytics</span>}
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Reports"
          >
            <FileBarChart2 size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Reports</span>}
          </NavLink>

          {/* 4. SYSTEM */}
          <div className="nav-section-caption nav-section-divider">{!sidebarCollapsed ? 'SYSTEM' : '•••'}</div>

          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Settings"
          >
            <Settings2 size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Settings</span>}
          </NavLink>

          <NavLink
            to="/workforce"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="Worker Safety"
          >
            <Users size={17} aria-hidden="true" />
            {!sidebarCollapsed && <span>Worker Safety</span>}
          </NavLink>
        </nav>

        {/* Secondary Links Footer */}
        <div className="nav-secondary">
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-item nav-help-link ${isActive ? 'nav-active' : ''}`}
            onClick={() => setMobileOpen(false)}
            title="About MineGuard"
          >
            <BookOpen size={16} />
            {!sidebarCollapsed && <span>About MineGuard</span>}
          </NavLink>
        </div>

        {/* Sidebar Status Footer */}
        <div className="sidebar-foot">
          <span className="offline-dot" />
          {!sidebarCollapsed && (
            <div>
              <strong>Industrial Platform</strong>
              <small>Decision support active</small>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Backdrop Scrim */}
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ==================================================================== */}
      {/* B. TOP NAVIGATION BAR                                                */}
      {/* ==================================================================== */}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            {/* Mobile Menu Button */}
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              className="icon-button desktop-sidebar-toggle"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft size={18} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span className="breadcrumb-root">MineGuard AI</span>
              <ChevronRight size={13} className="breadcrumb-separator" />
              <span className="breadcrumb-section">{breadcrumbs.category}</span>
              <ChevronRight size={13} className="breadcrumb-separator" />
              <strong className="breadcrumb-current">{breadcrumbs.title}</strong>
            </div>
          </div>

          <div className="topbar-right">
            {/* Search Input Trigger */}
            <button
              className="topbar-search-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search MineGuard"
            >
              <Search size={14} />
              <span className="search-placeholder-text">Search...</span>
              <kbd>⌘ K</kbd>
            </button>

            {/* Quick Tour Button */}
            <button
              className="button button-ghost topbar-tour-button"
              onClick={() => setOnboardingOpen(true)}
              title="Open product walkthrough"
            >
              <Compass size={14} />
              <span className="hide-on-mobile">Quick Tour</span>
            </button>

            {/* Theme Toggle (Sun/Moon) */}
            <button
              className="icon-button theme-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to Light theme' : 'Switch to Dark theme'}
              aria-label={darkMode ? 'Switch to Light theme' : 'Switch to Dark theme'}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Unresolved Alerts Notification Popover */}
            <div className="notification-wrap">
              <button
                className="icon-button notification-trigger"
                aria-label={`Open notifications, ${openAlerts.length} unresolved alerts`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={17} />
                {openAlerts.length > 0 && <span className="notification-count">{openAlerts.length}</span>}
              </button>

              {notificationsOpen && (
                <div className="notification-popover" role="dialog" aria-label="Attention Queue">
                  <div className="popover-head">
                    <strong>Attention Queue</strong>
                    <span>{openAlerts.length} unresolved</span>
                  </div>
                  {openAlerts.length ? (
                    openAlerts.slice(0, 6).map((alert) => (
                      <button
                        key={alert.id}
                        onClick={() => {
                          setActiveZoneId(alert.zoneId);
                          navigate('/hazards');
                          setNotificationsOpen(false);
                        }}
                      >
                        <span className={`severity-dot severity-${alert.severity.toLowerCase()}`} />
                        <span>
                          <strong>{alert.title}</strong>
                          <small>
                            {zones.find((zone) => zone.id === alert.zoneId)?.name ?? alert.zoneId} · {alert.time}
                          </small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p>No unresolved safety alerts.</p>
                  )}
                  <NavLink to="/hazards" onClick={() => setNotificationsOpen(false)}>
                    View All Safety Alerts →
                  </NavLink>
                </div>
              )}
            </div>

            {/* User Role Switcher */}
            <div className="role-picker">
              <button
                className="role-trigger"
                aria-expanded={roleMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setRoleMenuOpen((open) => !open)}
              >
                <span className="avatar-mark">
                  {role.split(' ').map((word) => word[0]).slice(0, 2).join('')}
                </span>
                <span className="role-label">{role}</span>
              </button>

              {roleMenuOpen && (
                <div className="role-menu" role="listbox" aria-label="Switch operator role">
                  {roles.map((item) => (
                    <button
                      role="option"
                      aria-selected={role === item}
                      key={item}
                      onClick={() => chooseRole(item)}
                    >
                      {item}
                      <small>Default: {roleDestinations[item].label}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* C. MAIN CONTENT AREA                                                 */}
        {/* ==================================================================== */}
        <main className="main-content" id="main-content">
          <Outlet />
        </main>

        <footer className="global-disclaimer">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>
            MineGuard provides decision-support intelligence. It does not replace statutory inspections, certified mine safety equipment, qualified professional judgement or approved emergency procedures.
          </span>
        </footer>
      </div>

      {/* Command Palette Modal */}
      {paletteOpen && (
        <div
          className="command-palette-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPaletteOpen(false);
          }}
        >
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search MineGuard">
            <div className="command-palette-input">
              <Search size={17} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspaces, hazards, rovers, sensors, workers…"
              />
              <kbd>ESC</kbd>
            </div>
            <div className="command-palette-results">
              {results.length ? (
                results.map((result, index) => (
                  <button key={`${result.kind}-${result.title}-${index}`} onClick={() => openResult(result)}>
                    <span className="palette-kind">{result.kind}</span>
                    <span className="palette-result-main">
                      <strong>{result.title}</strong>
                      <small>{result.detail}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <Search size={20} />
                  <strong>No matching records</strong>
                  <p>Try searching for a sector name, worker ID, sensor, or alert.</p>
                </div>
              )}
            </div>
            <div className="command-palette-foot">Search is restricted to the local verified mine dataset.</div>
          </section>
        </div>
      )}

      {/* Onboarding and Guided Tours */}
      <OnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      <GuidedDemoModal />
    </div>
  );
}

function getBreadcrumb(path: string): { category: string; title: string } {
  if (path === '/' || path === '/command') return { category: 'Workspace', title: 'Command Center' };
  if (path === '/monitoring') return { category: 'Workspace', title: 'Live Monitoring' };
  if (path === '/map') return { category: 'Workspace', title: 'Underground Map' };
  if (path === '/robotics') return { category: 'Workspace', title: 'Robotics Fleet' };
  if (path === '/hazards') return { category: 'Safety', title: 'Hazard Detection' };
  if (path === '/incidents' || path === '/inspections') return { category: 'Safety', title: 'Incident Management' };
  if (path === '/analytics') return { category: 'Insights', title: 'Analytics' };
  if (path === '/reports') return { category: 'Insights', title: 'Reports' };
  if (path === '/settings') return { category: 'System', title: 'Settings' };
  if (path === '/workforce') return { category: 'System', title: 'Worker Safety' };
  if (path === '/sources') return { category: 'Reference', title: 'Source Register' };
  if (path === '/about') return { category: 'Reference', title: 'About MineGuard' };
  return { category: 'App', title: 'MineGuard AI' };
}
