<script setup>
import { inject } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { theme, toggleTheme } = inject('theme');

function goToApp() {
  router.push('/app');
}
</script>

<template>
  <div class="landing-page">
    <!-- Navbar -->
    <header class="landing-nav">
      <div class="nav-container">
        <div class="brand">
          <svg class="brand-icon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm3 2v2h12V6H6zm0 4v2h12v-2H6zm0 4v2h8v-2H6z"/>
          </svg>
          <span class="brand-title">NotesBoard</span>
        </div>
        <nav class="nav-links">
          <a href="#features" class="nav-link">Features</a>
          <a href="#how-it-works" class="nav-link">How it Works</a>
          <button class="ghost sm theme-toggle" @click="toggleTheme" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            {{ theme === 'dark' ? '☀️ Light' : '🌙 Dark' }}
          </button>
          <button class="primary sm" @click="goToApp">Launch App →</button>
        </nav>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <span class="hero-badge">✨ Next-Gen Personal Workspace</span>
        <h1 class="hero-title">Your thoughts, refined with <span class="gradient-text">intelligent AI</span></h1>
        <p class="hero-subtitle">
          A minimalist Notion-style notes workspace. Encrypt secrets with PIN locks, dictate on the go, generate summaries with local AI, and share seamlessly.
        </p>
        <div class="hero-actions">
          <button class="primary hero-btn" @click="goToApp">Get Started Free</button>
          <a href="#features" class="btn ghost hero-btn">Explore Features ↓</a>
        </div>
      </div>

      <!-- CSS-Built Interactive App Mockup -->
      <div class="mockup-wrapper">
        <div class="mockup-window">
          <div class="mockup-header">
            <div class="window-controls">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="mockup-address">https://notesboard.internal/app</div>
          </div>
          <div class="mockup-body">
            <div class="mockup-sidebar">
              <div class="sidebar-item active">📝 All Notes <span class="count">14</span></div>
              <div class="sidebar-item">📁 Work Projects <span class="count">5</span></div>
              <div class="sidebar-item">💡 Startup Ideas <span class="count">6</span></div>
              <div class="sidebar-item">🔒 Vault <span class="count">3</span></div>
              <div class="sidebar-item muted">🗑️ Trash</div>
            </div>
            <div class="mockup-main">
              <div class="mockup-toolbar">
                <div class="mockup-search">🔍 Search notes or ask AI... (Ctrl+K)</div>
                <div class="mockup-tag-chips">
                  <span class="mockup-tag">#strategy</span>
                  <span class="mockup-tag">#ai</span>
                  <span class="mockup-tag">#todos</span>
                </div>
              </div>
              <div class="mockup-grid">
                <div class="mockup-card yellow-tint">
                  <div class="card-top">
                    <h4>Q4 Product Architecture</h4>
                    <span class="pin-icon">📌</span>
                  </div>
                  <p>Migrate storage to embedded SQLite, integrate Gemini API for summarization, enforce ownership checks.</p>
                  <div class="card-tags">
                    <span class="tag-pill">#architecture</span>
                    <span class="tag-pill">#sqlite</span>
                  </div>
                </div>
                <div class="mockup-card blue-tint">
                  <div class="card-top">
                    <h4>Encrypted Master Key</h4>
                    <span class="lock-badge">🔒 PIN Locked</span>
                  </div>
                  <p class="locked-body">Content protected by 4-8 digit PIN encryption. Click to reveal.</p>
                  <div class="card-tags">
                    <span class="tag-pill">#vault</span>
                  </div>
                </div>
                <div class="mockup-card mint-tint ai-highlight">
                  <div class="card-top">
                    <h4>✨ AI Summary</h4>
                    <span class="ai-badge">Instant</span>
                  </div>
                  <p>“All requirements met with sub-second response times, zero external runtime deps, and 100% test coverage.”</p>
                  <div class="card-tags">
                    <span class="tag-pill">#ai</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Grid -->
    <section id="features" class="features-section">
      <div class="section-header">
        <h2 class="section-title">Built for Speed, Privacy, and Focus</h2>
        <p class="section-desc">Everything you need to capture, structure, and retrieve your knowledge effortlessly.</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Local AI Writing Assistant</h3>
          <p>Instant summaries, auto-tag suggestions, grammar refinement, and a conversational "Ask Your Notes" command palette query tool.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>PIN-Locked Privacy Vault</h3>
          <p>Secure sensitive notes with custom 4-8 digit PINs hashed with bcrypt. Enforces a 5-minute lockout after 5 incorrect attempts.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🎙️</div>
          <h3>Voice-to-Text Transcription</h3>
          <p>Dictate meeting minutes and quick thoughts on the go using the Web Speech API directly inside the note editor.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">⏰</div>
          <h3>Smart Timely Reminders</h3>
          <p>Schedule reminder dates with visual bell alerts, overdue badges, background polling, and native browser notifications.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🌐</div>
          <h3>Secure 32-Byte Public Sharing</h3>
          <p>Share clean read-only links with zero owner information leaks. Includes visitor commenting and owner moderation.</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">📦</div>
          <h3>Universal Import & Export</h3>
          <p>Export notes to Markdown, Plain Text, or styled PDF via PDFKit. Full JSON backup and conflict-free restore with summary reports.</p>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="how-section">
      <div class="section-header">
        <h2 class="section-title">How It Works</h2>
        <p class="section-desc">Three simple steps to an uncluttered mind.</p>
      </div>

      <div class="steps-row">
        <div class="step-card">
          <div class="step-number">01</div>
          <h3>Capture Instantly</h3>
          <p>Type text or checklists, dictate via speech-to-text, or attach images in seconds.</p>
        </div>
        <div class="step-card">
          <div class="step-number">02</div>
          <h3>Refine & Organize</h3>
          <p>Let AI summarize and suggest tags. Categorize into folders and color-code your notes.</p>
        </div>
        <div class="step-card">
          <div class="step-number">03</div>
          <h3>Protect & Retrieve</h3>
          <p>Lock confidential notes with a PIN. Query everything at lightning speed via Ctrl+K.</p>
        </div>
      </div>
    </section>

    <!-- Bottom CTA -->
    <section class="cta-section">
      <div class="cta-box">
        <h2>Take control of your knowledge today</h2>
        <p>No credit card required. Lightweight, responsive, and available in dark and light modes.</p>
        <button class="primary hero-btn" @click="goToApp">Launch NotesBoard Now →</button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-container">
        <div class="footer-brand">
          <strong>NotesBoard Workspace</strong> &copy; 2026. Fast, private, open.
        </div>
        <div class="footer-badges">
          <span class="tech-badge">Vue 3</span>
          <span class="tech-badge">Vite</span>
          <span class="tech-badge">Express</span>
          <span class="tech-badge">SQLite</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Nav */
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg);
  border-bottom: 1px solid var(--card-border);
  backdrop-filter: blur(8px);
}

.nav-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.15s ease;
}

.nav-link:hover {
  color: var(--text);
}

/* Hero */
.hero-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 72px 20px 48px;
  text-align: center;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  background: var(--surface);
  border: 1px solid var(--card-border);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--primary);
}

.hero-title {
  font-size: 3.2rem;
  line-height: 1.15;
  margin-bottom: 18px;
  letter-spacing: -0.03em;
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--text-muted);
  max-width: 680px;
  margin: 0 auto 28px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 48px;
}

.hero-btn {
  padding: 12px 24px;
  font-size: 1rem;
}

/* Mockup */
.mockup-wrapper {
  max-width: 860px;
  margin: 0 auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  text-align: left;
}

.mockup-window {
  background: var(--surface);
  display: flex;
  flex-direction: column;
}

.mockup-header {
  background: var(--input-bg);
  padding: 10px 16px;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  gap: 16px;
}

.window-controls {
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.mockup-address {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--surface);
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid var(--card-border);
  flex-grow: 1;
  max-width: 320px;
}

.mockup-body {
  display: flex;
  min-height: 280px;
}

.mockup-sidebar {
  width: 180px;
  border-right: 1px solid var(--card-border);
  padding: 16px 10px;
  background: var(--input-bg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-item {
  font-size: 0.8rem;
  padding: 6px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
}

.sidebar-item.active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.sidebar-item .count {
  font-size: 0.7rem;
  background: var(--card-border);
  padding: 1px 5px;
  border-radius: 9999px;
}

.mockup-main {
  flex-grow: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mockup-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.mockup-search {
  font-size: 0.8rem;
  padding: 6px 12px;
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  color: var(--text-muted);
  flex-grow: 1;
}

.mockup-tag-chips {
  display: flex;
  gap: 6px;
}

.mockup-tag {
  font-size: 0.7rem;
  font-family: monospace;
  padding: 2px 6px;
  border: 1px solid var(--primary);
  color: var(--primary);
  border-radius: 4px;
}

.mockup-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.mockup-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mockup-card h4 {
  font-size: 0.85rem;
}

.mockup-card p {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.yellow-tint { background: var(--note-yellow); border-color: var(--note-border-yellow); }
.blue-tint { background: var(--note-blue); border-color: var(--note-border-blue); }
.mint-tint { background: var(--note-mint); border-color: var(--note-border-mint); }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lock-badge {
  font-size: 0.65rem;
  padding: 2px 4px;
  background: #fef08a;
  color: #854d0e;
  border-radius: 3px;
  font-weight: bold;
}

.ai-badge {
  font-size: 0.65rem;
  padding: 2px 4px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 3px;
  font-weight: bold;
}

.card-tags {
  margin-top: auto;
  display: flex;
  gap: 4px;
}

.tag-pill {
  font-size: 0.65rem;
  font-family: monospace;
  color: var(--text-muted);
}

/* Features */
.features-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  font-size: 2.2rem;
  margin-bottom: 12px;
}

.section-desc {
  font-size: 1.05rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.feature-card {
  background: var(--surface);
  border: 1px solid var(--card-border);
  padding: 24px;
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.feature-icon {
  font-size: 1.8rem;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 1.15rem;
  margin-bottom: 8px;
}

.feature-card p {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

/* How Section */
.how-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}

.steps-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.step-card {
  background: var(--surface);
  border: 1px solid var(--card-border);
  padding: 24px;
  border-radius: 12px;
}

.step-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
  margin-bottom: 12px;
}

.step-card h3 {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.step-card p {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

/* CTA */
.cta-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px 80px;
}

.cta-box {
  background: var(--surface);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  box-shadow: var(--shadow);
}

.cta-box h2 {
  font-size: 2rem;
  margin-bottom: 12px;
}

.cta-box p {
  font-size: 1.05rem;
  color: var(--text-muted);
  margin-bottom: 24px;
}

/* Footer */
.landing-footer {
  border-top: 1px solid var(--card-border);
  padding: 24px 20px;
  background: var(--surface);
}

.footer-container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.footer-badges {
  display: flex;
  gap: 8px;
}

.tech-badge {
  background: var(--input-bg);
  border: 1px solid var(--card-border);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
}

@media (max-width: 768px) {
  .hero-title { font-size: 2.2rem; }
  .mockup-body { flex-direction: column; }
  .mockup-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--card-border); }
  .mockup-grid { grid-template-columns: 1fr; }
  .mockup-toolbar { flex-direction: column; align-items: flex-start; }
}
</style>
