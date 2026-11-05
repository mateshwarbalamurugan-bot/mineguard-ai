import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Box, Cpu, Menu, Volume2, VolumeX, X
} from 'lucide-react';
import { sfx } from './RoverCadSimulation';

export function RoboticsNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.enabled = next;
    if (next) sfx.playClick();
  };

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Technology', href: '#technology' },
    { label: 'Exploded CAD', href: '#exploded-view' },
    { label: 'Components & Budget', href: '#budget' },
    { label: 'Capabilities', href: '#capabilities' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        sfx.playClick();
        target.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
      }
    }
  };

  return (
    <header className={`robotics-nav-header ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-container">
        {/* Brand Lockup */}
        <div className="brand-group">
          <Link to="/" className="brand-link" onClick={() => sfx.playClick()}>
            <div className="brand-symbol">
              <img src="/mineguard-mark.svg" alt="MineGuard Icon" className="brand-logo-img" />
              <span className="symbol-pulse-ring" />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">
                MINEGUARD<span className="brand-ai-badge">AI</span>
              </span>
              <span className="brand-subline">
                <span className="subline-dot" />
                ROBOTICS // MK-IV AUTONOMOUS
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Section Links */}
        <nav className="desktop-nav-menu" aria-label="Product navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-anchor"
              onClick={(e) => handleLinkClick(e, link.href)}
            >
              <span className="anchor-dot" />
              <span>{link.label}</span>
            </a>
          ))}
        </nav>

        {/* Right Action Cluster */}
        <div className="nav-actions-cluster">
          {/* Audio FX Toggle */}
          <button
            type="button"
            className={`icon-hud-btn sound-toggle ${soundOn ? 'sound-active' : ''}`}
            onClick={toggleSound}
            title={soundOn ? 'Sound Effects Active' : 'Sound Muted'}
            aria-label="Toggle Cyber Sound Effects"
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="sr-only">Toggle SFX</span>
          </button>

          {/* 3D Mine Map Link */}
          <Link to="/map" className="nav-secondary-btn" onClick={() => sfx.playClick()}>
            <Box size={14} aria-hidden="true" />
            <span>3D Map</span>
          </Link>

          {/* Operations Command Centre CTA Button */}
          <Link to="/command" className="nav-primary-cta" onClick={() => sfx.playClick()}>
            <span className="cta-glimmer" />
            <Activity size={14} aria-hidden="true" />
            <span>Operations Console</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Mobile Navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <div className="mobile-drawer-content">
            <div className="mobile-links-list">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="mobile-nav-anchor"
                  onClick={(e) => handleLinkClick(e, link.href)}
                >
                  <Cpu size={14} className="mobile-link-icon" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>

            <div className="mobile-drawer-actions">
              <Link
                to="/command"
                className="button button-primary full-width-cta"
                onClick={() => {
                  sfx.playClick();
                  setMobileMenuOpen(false);
                }}
              >
                <Activity size={16} />
                <span>Launch Operations Command</span>
              </Link>
              <Link
                to="/map"
                className="button button-secondary full-width-cta"
                onClick={() => {
                  sfx.playClick();
                  setMobileMenuOpen(false);
                }}
              >
                <Box size={16} />
                <span>Subterranean 3D Map</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
