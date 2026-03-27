import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server } from 'lucide-react';
import { GitHubIcon } from './assets/GitHubIcon';
import { CoverageTab } from './CoverageTab';

interface Project {
  projectid: string;
  projectname: string;
  repo: string;
  created_at: string;
}

export const App: React.FC = () => {
  // Detect if we are embedded via iframe at /project/:projectId
  const urlProjectId = (() => {
    const match = window.location.pathname.match(/^\/project\/([^/]+)/);
    return match ? match[1] : null;
  })();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // In embedded/iframe mode, urlProjectId is known synchronously, so no loading needed
  const [loading, setLoading] = useState(!urlProjectId);
  const [error, setError] = useState('');

  // Fetch project list on initial load (standalone mode only)
  useEffect(() => {
    if (urlProjectId) {
      // Embedded/iframe mode: project list is not needed, skip fetching
      return;
    }

    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[]) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch projects. Is the API running?');
        setLoading(false);
      });
  }, [urlProjectId]);

  // ── Embedded/iframe mode ───────────────────────────────────────────────────
  if (urlProjectId) {
    return (
      <div className="app-container">
        <CoverageTab projectId={urlProjectId} apiBaseUrl="/api" />
      </div>
    );
  }

  // ── Standalone mode: loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-container">
        <h1
          className="header-title"
          style={{ textAlign: 'center', marginTop: '10vh' }}
        >
          Katalyst Coverage
        </h1>
        <div className="loader" />
      </div>
    );
  }

  // ── Standalone mode: project detail ──────────────────────────────────────
  if (selectedProject) {
    return (
      <div className="app-container">
        <header className="header">
          <div>
            <button
              onClick={() => setSelectedProject(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              ← Back to Projects
            </button>
            <h1 className="header-title">{selectedProject.projectname}</h1>
          </div>
        </header>
        <CoverageTab projectId={selectedProject.projectid} apiBaseUrl="/api" />
      </div>
    );
  }

  // ── Standalone mode: project list ─────────────────────────────────────────
  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldCheck size={40} color="var(--accent-primary)" />
          <h1 className="header-title">Code Coverage Dashboard</h1>
        </div>
      </header>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="grid-cols-2">
        {projects.length === 0 && !error && (
          <p style={{ color: 'var(--text-secondary)' }}>
            No projects found. Add one in Katalyst main dashboard.
          </p>
        )}
        {projects.map((p) => (
          <div
            key={p.projectid}
            className="glass-card project-card"
            onClick={() => setSelectedProject(p)}
          >
            <div>
              <h3>{p.projectname}</h3>
              <p
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                <GitHubIcon width={24} height={24} />
                {p.repo || 'Unknown Repository'}
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                ID: {p.projectid.split('-')[0]}...
              </p>
            </div>
            <Server size={32} color="var(--text-secondary)" />
          </div>    
        ))}
      </div>
    </div>
  );
};

export default App;
