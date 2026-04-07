import React from 'react';
import { useNavigate } from 'react-router-dom';

const PLATFORM_STATS = [
  { value: '770', label: 'Rooms managed' },
  { value: '2,310', label: 'Beds tracked live' },
  { value: '5', label: 'Hostel blocks connected' },
  { value: '24/7', label: 'Admin visibility' },
];

const FEATURE_COLUMNS = [
  {
    eyebrow: 'Operations',
    title: 'Keep occupancy, room health, and allocations moving in one control center.',
    description:
      'Monitor availability, maintenance flags, room types, and occupancy without bouncing between spreadsheets and manual registers.',
    items: [
      'Live room status with availability and capacity visibility',
      'Fast allocation workflows for wardens and admins',
      'Centralized room inventory across buildings and floors',
    ],
  },
  {
    eyebrow: 'Student experience',
    title: 'Give students a portal that feels modern instead of bureaucratic.',
    description:
      'Students can register, choose rooms, review profile details, and stay on top of fees from a clean self-service experience.',
    items: [
      'Student login and onboarding in one flow',
      'Room discovery with filters and availability insights',
      'Fee status and profile updates without admin back-and-forth',
    ],
  },
];

const FEATURE_CARDS = [
  {
    badge: 'Allocation',
    title: 'Room orchestration',
    copy: 'See open, occupied, reserved, and maintenance rooms at a glance before assigning beds.',
  },
  {
    badge: 'Students',
    title: 'Student records',
    copy: 'Track profiles, guardian contacts, course data, and fee status from a single dashboard.',
  },
  {
    badge: 'Insights',
    title: 'Operational analytics',
    copy: 'Understand block usage, occupancy pressure, and pending payments with dashboard charts.',
  },
  {
    badge: 'Support',
    title: 'Built-in assistant',
    copy: 'Use the AI chatbot to answer common admin questions about rooms, students, and hostel activity.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="marketing-page">
      <div className="marketing-backdrop" />

      <header className="marketing-header">
        <div className="marketing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="marketing-brand-icon">H</div>
          <div>
            <div className="marketing-brand-name">HostelFlow</div>
            <div className="marketing-brand-tag">Smart hostel operations</div>
          </div>
        </div>

        <nav className="marketing-nav">
          <a href="#platform">Platform</a>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-pill">Hostel management platform for modern campuses</div>
            <h1>
              Run your hostel like a
              <span> well-built product</span>
            </h1>
            <p>
              A cleaner frontend for room operations, student records, fee tracking, and allocations inspired by the
              polished product-marketing feel of ScrewFast.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate('/login')}>
                Open dashboard
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore the platform
              </button>
            </div>
            <div className="hero-proof">
              <div className="hero-proof-avatars" aria-hidden="true">
                <span>A</span>
                <span>W</span>
                <span>S</span>
              </div>
              <p>Designed for wardens, administrators, and students sharing the same system.</p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-card hero-visual-main">
              <div className="hero-visual-header">
                <span className="eyebrow">Live occupancy board</span>
                <span className="hero-dot" />
              </div>
              <div className="hero-grid-stats">
                {PLATFORM_STATS.map((stat) => (
                  <div key={stat.label} className="hero-grid-stat">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className="hero-visual-chart">
                <div>
                  <span>Occupancy</span>
                  <strong>89%</strong>
                </div>
                <div className="hero-bars" aria-hidden="true">
                  <span style={{ height: '72%' }} />
                  <span style={{ height: '48%' }} />
                  <span style={{ height: '88%' }} />
                  <span style={{ height: '58%' }} />
                  <span style={{ height: '94%' }} />
                </div>
              </div>
            </div>

            <div className="hero-visual-card hero-visual-side">
              <span className="eyebrow">Allocation pulse</span>
              <h3>From vacancy to assignment in a few clicks</h3>
              <ul>
                <li>Open rooms surfaced instantly</li>
                <li>Student profiles linked to allocations</li>
                <li>Maintenance and reserved states respected</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="platform" className="marketing-section marketing-section-split">
          {FEATURE_COLUMNS.map((column) => (
            <article key={column.eyebrow} className="marketing-story-card">
              <span className="eyebrow">{column.eyebrow}</span>
              <h2>{column.title}</h2>
              <p>{column.description}</p>
              <div className="story-list">
                {column.items.map((item) => (
                  <div key={item} className="story-list-item">
                    <span className="story-list-mark" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section id="features" className="marketing-section">
          <div className="section-heading">
            <span className="eyebrow">Core features</span>
            <h2>Everything your hostel team needs, without the clutter.</h2>
            <p>
              The updated frontend leans into cleaner spacing, warmer contrast, and stronger hierarchy while keeping
              your current React flows intact.
            </p>
          </div>

          <div className="feature-card-grid">
            {FEATURE_CARDS.map((card) => (
              <article key={card.title} className="feature-card">
                <span className="feature-badge">{card.badge}</span>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="marketing-section workflow-panel">
          <div className="section-heading">
            <span className="eyebrow">Workflow</span>
            <h2>A clearer path from registration to room settlement.</h2>
          </div>

          <div className="workflow-steps">
            <div className="workflow-step">
              <strong>01</strong>
              <h3>Students register</h3>
              <p>Collect identity, guardian, academic, and contact details in one place.</p>
            </div>
            <div className="workflow-step">
              <strong>02</strong>
              <h3>Admins review capacity</h3>
              <p>Watch availability, block load, and maintenance constraints before assigning rooms.</p>
            </div>
            <div className="workflow-step">
              <strong>03</strong>
              <h3>Operations stay visible</h3>
              <p>Track occupancy, fees, and room changes through the dashboard and student portal.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
