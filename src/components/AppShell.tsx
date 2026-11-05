import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Bell, ChevronDown, ChevronRight, Compass,
  FileBarChart2, Home, Layers3, Map, Menu,
  Search, ShieldCheck, Users, X, ClipboardList, BookOpen, Settings2,
} from 'lucide-react';
import { roles, useMineStore } from '../store/useMineStore';
import { roleDestinations } from '../data/routeDefaults';
import { mine } from '../data/seed';

const navSections = [
  {
    id: 'tools', label: 'More tools', description: 'Additional workflows', icon: Layers3,
    items: [
      { label: 'Reports', path: '/reports', icon: FileBarChart2, hint: 'Review and export demo reports' },
      { label: 'Settings', path: '/settings', icon: Settings2, hint: 'Manage demo preferences' },
    ],
  },
];

type SearchResult = { title: string; detail: string; path: string; zoneId?: string; kind: string };

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const role = useMineStore((state) => state.role);
  const setRole = useMineStore((state) => state.setRole);
  const darkMode = useMineStore((state) => state.darkMode);
  const zones = useMineStore((state) => state.zones);
  const sensors = useMineStore((state) => state.sensors);
  const workers = useMineStore((state) => state.workers);
  const alerts = useMineStore((state) => state.alerts);
  const inspections = useMineStore((state) => state.inspections);
  const setActiveZoneId = useMineStore((state) => state.setActiveZoneId);
  const setTourOpen = useMineStore((state) => state.setTourOpen);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const activeSection = navSections.find((section) => section.items.some((item) => item.path === location.pathname));
    if (activeSection) setExpandedSection(activeSection.id);
  }, [location.pathname]);

  function chooseRole(value: typeof roles[number]) {
    setRole(value);
    setRoleMenuOpen(false);
    navigate(roleDestinations[value].path);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setPaletteOpen(true);
      }
      if (event.key === 'Escape') { setPaletteOpen(false); setNotificationsOpen(false); setRoleMenuOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = search.trim().toLowerCase();
    const items: SearchResult[] = [
      ...zones.map((item) => ({ title: item.name, detail: `Mine zone · ${item.state}`, path: '/map', zoneId: item.id, kind: 'ZONE' })),
      ...sensors.map((item) => ({ title: item.id, detail: `${item.measure} · ${item.location} · ${item.status}`, path: '/monitoring', zoneId: item.zoneId, kind: 'SENSOR' })),
      ...workers.map((item) => ({ title: item.id, detail: `${item.team} · ${item.location} · ${item.exitStatus}`, path: '/workforce', kind: 'WORKER' })),
      ...alerts.map((item) => ({ title: item.title, detail: `${item.severity} · ${zones.find((zone) => zone.id === item.zoneId)?.name ?? item.zoneId}`, path: '/monitoring', zoneId: item.zoneId, kind: 'ALERT' })),
      ...inspections.map((item) => ({ title: item.requiredVerification, detail: `${zones.find((zone) => zone.id === item.zoneId)?.name ?? item.zoneId} · ${item.status}`, path: '/inspections', zoneId: item.zoneId, kind: 'INSPECTION' })),
    ];
    return q ? items.filter((item) => `${item.title} ${item.detail} ${item.kind}`.toLowerCase().includes(q)).slice(0, 12) : items.filter((item) => ['ZONE', 'ALERT'].includes(item.kind)).slice(0, 8);
  }, [search, zones, sensors, workers, alerts, inspections]);

  const openResult = (result: SearchResult) => {
    if (result.zoneId) setActiveZoneId(result.zoneId);
    navigate(result.path);
    setPaletteOpen(false); setSearch(''); setMobileOpen(false);
  };
  const openDemo = () => { navigate('/command'); setTourOpen(true); };
  const openAlerts = alerts.filter((alert) => alert.state !== 'resolved').sort((a, b) => ({ Critical: 4, High: 3, Medium: 2, Low: 1 }[b.severity] - { Critical: 4, High: 3, Medium: 2, Low: 1 }[a.severity]));

  return <div className={`app-frame ${darkMode ? 'theme-dark' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="brand-lockup"><img src="/mineguard-mark.svg" alt=""/><div><span className="brand-word">MINEGUARD<span>AI</span></span><span className="brand-caption">UNDERGROUND INTELLIGENCE</span></div><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <div className="sidebar-mine"><span className="mine-state-dot"/><div><strong>{mine.name}</strong><small>DEMO MINE</small></div></div>
      <NavLink to="/" className="sidebar-product-link">
        <span>← Product Overview</span>
      </NavLink>
      <nav className="nav-scroll" aria-label="Main workspaces">
        <div className="nav-section-caption">MINE OPERATIONS</div>
        <NavLink to="/command" end className={({ isActive }) => `nav-item nav-command ${isActive ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><Home size={17} aria-hidden="true"/><span>Command Centre</span></NavLink>
        <NavLink to="/monitoring" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><Activity size={17} aria-hidden="true"/><span>Live Monitoring</span></NavLink>
        <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><Map size={17} aria-hidden="true"/><span>Mine Map</span></NavLink>
        <NavLink to="/inspections" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><ClipboardList size={17} aria-hidden="true"/><span>Inspections</span></NavLink>
        <NavLink to="/workforce" className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><Users size={17} aria-hidden="true"/><span>Worker Safety</span></NavLink>
        <div className="nav-section-caption nav-tools-caption">ADDITIONAL TOOLS</div>
        <div className="nav-section-list">
          {navSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isSectionActive = section.items.some((item) => item.path === location.pathname); 
            return <section className={`nav-accordion ${isExpanded ? 'nav-accordion-open' : ''} ${isSectionActive ? 'nav-accordion-active' : ''}`} key={section.id}>
              <button type="button" className="nav-section-toggle" aria-expanded={isExpanded} onClick={() => setExpandedSection((current) => current === section.id ? null : section.id)}>
                <Icon size={18} aria-hidden="true"/>
                <span className="nav-section-copy"><strong>{section.label}</strong><small>{section.description}</small></span>
                <ChevronDown className="nav-section-chevron" size={15}/>
              </button>
              {isExpanded && <div className="nav-subitems">
                {section.items.map(({ label, path, icon: ItemIcon, hint }) => <NavLink key={path} to={path} className={({ isActive }) => `nav-subitem ${isActive ? 'nav-subitem-active' : ''}`} onClick={() => setMobileOpen(false)} title={hint}>
                  <ItemIcon size={15} aria-hidden="true"/><span>{label}</span>
                </NavLink>)}
              </div>}
            </section>;
          })}
        </div>
      </nav>
      <div className="nav-secondary">
        <NavLink to="/about" className={({ isActive }) => `nav-item nav-help-link ${isActive || location.pathname === '/sources' ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}>
          <BookOpen size={16}/><span>About MineGuard</span>
        </NavLink>
        <NavLink to="/sources" className={({ isActive }) => `nav-item nav-help-link ${isActive ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}><FileBarChart2 size={16}/><span>Source register</span></NavLink>
      </div>
      <div className="sidebar-foot"><span className="offline-dot"/><div><strong>Offline prototype</strong><small>Sample data only</small></div></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close menu overlay" onClick={() => setMobileOpen(false)}/>}
    <div className="workspace">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
        <div className="breadcrumb"><span>MineGuard AI</span><ChevronRight size={14}/><strong>{currentTitle(location.pathname)}</strong></div>
        <div className="topbar-right">
          <button className="topbar-search-trigger" onClick={() => setPaletteOpen(true)}><Search size={14}/><span>Search MineGuard</span><kbd>⌘ K</kbd></button>
          <div className="notification-wrap"><button className="icon-button notification-trigger" aria-label={`Open notifications, ${openAlerts.length} unresolved alerts`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18}/>{openAlerts.length > 0 && <span className="notification-count">{openAlerts.length}</span>}</button>{notificationsOpen && <div className="notification-popover"><div className="popover-head"><strong>Attention queue</strong><span>{openAlerts.length} open</span></div>{openAlerts.length ? openAlerts.slice(0, 6).map((alert) => <button key={alert.id} onClick={() => { setActiveZoneId(alert.zoneId); navigate('/map'); setNotificationsOpen(false); }}><span className={`severity-dot severity-${alert.severity.toLowerCase()}`}/><span><strong>{alert.title}</strong><small>{zones.find((zone) => zone.id === alert.zoneId)?.name ?? alert.zoneId} · {alert.time}</small></span></button>) : <p>No unresolved demo alerts.</p>}<NavLink to="/monitoring" onClick={() => setNotificationsOpen(false)}>Open monitoring workspace</NavLink></div>}</div>
          <div className="shift-pill"><span className="live-dot"/>DEMO MODE</div>
          <div className="role-picker"><button className="role-trigger" aria-expanded={roleMenuOpen} aria-haspopup="listbox" onClick={() => setRoleMenuOpen((open) => !open)}><span className="avatar-mark">{role.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><span className="role-label">{role}</span><ChevronDown size={14}/></button>{roleMenuOpen && <div className="role-menu" role="listbox" aria-label="Switch user role">{roles.map((item) => <button role="option" aria-selected={role === item} key={item} onClick={() => chooseRole(item)}>{item}<small>Default: {roleDestinations[item].label}</small></button>)}</div>}</div>
          <button className="button button-primary topbar-demo-button" onClick={openDemo}><Compass size={14}/>Guided Demo</button>
        </div>
      </header>
      <main className="main-content" id="main-content"><Outlet/></main>
      <footer className="global-disclaimer"><ShieldCheck size={14} aria-hidden="true"/><span>MineGuard provides decision-support intelligence. It does not replace statutory inspections, certified mine safety equipment, qualified professional judgement or approved emergency procedures.</span></footer>
    </div>
    {paletteOpen && <div className="command-palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Search MineGuard"><div className="command-palette-input"><Search size={17}/><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search zones, sensors, workers, alerts, tasks, vendors…"/><kbd>ESC</kbd></div><div className="command-palette-results">{results.length ? results.map((result, index) => <button key={`${result.kind}-${result.title}-${index}`} onClick={() => openResult(result)}><span className="palette-kind">{result.kind}</span><span className="palette-result-main"><strong>{result.title}</strong><small>{result.detail}</small></span><ArrowUpRightIcon/></button>) : <div className="empty-state"><Search size={20}/><strong>No matching records</strong><p>Try a zone name, worker ID, sensor or vendor.</p></div>}</div><div className="command-palette-foot">Search is limited to the local fictional demo dataset.</div></section></div>}
  </div>;
}

function ArrowUpRightIcon() { return <span aria-hidden="true">↗</span>; }

function currentTitle(path: string) {
  if (path === '/') return 'Command Centre';
  if (path === '/monitoring') return 'Live Monitoring';
  if (path === '/map') return 'Mine Map';
  if (path === '/inspections') return 'Inspections';
  if (path === '/workforce') return 'Worker Safety';
  for (const section of navSections) {
    const match = section.items.find((item) => item.path === path);
    if (match) return match.label;
  }
  if (path === '/sources') return 'Source Register';
  if (path === '/about') return 'Help & Sources';
  return 'MineGuard AI';
}
