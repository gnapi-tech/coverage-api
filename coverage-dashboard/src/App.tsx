import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  ShieldCheck,
  Server,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { GitHubIcon } from './assets/GitHubIcon';
import { GitBranchIcon } from './assets/GitBranchIcon';
import { GitCommitLineIcon } from './assets/GitCommitIcon';

interface Project {
  projectid: string;
  projectname: string;
  repo: string;
  created_at: string;
}

interface TestRun {
  id: string;
  branch: string;
  commit_sha: string;
  pr_number: number | null;
  total: number;
  repo: string;
  passed: number;
  failed: number;
  skipped: number;
  coverage_percent: string;
  status: string;
  created_at: string;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // 1. Fetch Projects on initial load
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch projects. Is the API running?');
        setLoading(false);
      });
  }, []);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentPage(1);
    setLoading(true);
    setError('');

    fetch(`/api/projects/${project.projectid}/test-runs`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error fetching test runs');
        }
        return res.json();
      })
      .then((data) => {
        // Sort descending by created_at natively from DB or here
        setTestRuns(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const goBack = () => {
    setSelectedProject(null);
    setTestRuns([]);
    setCurrentPage(1);
    setError('');
  };

  if (loading && !selectedProject) {
    return (
      <div className="app-container">
        <h1
          className="header-title"
          style={{ textAlign: 'center', marginTop: '10vh' }}
        >
          Katalyst Coverage
        </h1>
        <div className="loader"></div>
      </div>
    );
  }

  // View 1: Project List
  if (!selectedProject) {
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
          {projects.map((p) => (
            <div
              key={p.projectid}
              className="glass-card project-card"
              onClick={() => handleSelectProject(p)}
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
          {projects.length === 0 && !loading && (
            <p className="text-muted">
              No projects found. Add one in Katalyst main dashboard.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Stats Calculations for Dashboard Display (Overall across all runs)
  const latestRun = testRuns[0];
  const coverageDataLatest =
    testRuns.length > 0
      ? testRuns.reduce(
          (sum, run) => sum + parseFloat(run.coverage_percent),
          0,
        ) / testRuns.length
      : 0;

  const totalTests = testRuns.reduce((sum, run) => sum + run.total, 0);
  const totalPassed = testRuns.reduce((sum, run) => sum + run.passed, 0);
  const totalFailed = testRuns.reduce((sum, run) => sum + run.failed, 0);

  // Format for Recharts
  const chartData = [...testRuns].reverse().map((run) => ({
    name: run.commit_sha.substring(0, 7),
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    coverage: parseFloat(run.coverage_percent),
  }));

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(testRuns.length / rowsPerPage));
  const paginatedRuns = testRuns.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  // View 3: Project Dashboard
  return (
    <div className="app-container">
      <header className="header">
        <div>
          <button
            onClick={goBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="header-title">{selectedProject.projectname}</h1>
          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)',
            }}
          >
            <GitHubIcon width={24} height={24} />
            {latestRun?.repo ? (
              <a
                href={`https://github.com/${latestRun.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.textDecoration = 'underline')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.textDecoration = 'none')
                }
              >
                {latestRun.repo}
              </a>
            ) : (
              'unknown'
            )}
          </p>
        </div>
      </header>

      {testRuns.length === 0 ? (
        <div
          className="glass-card"
          style={{ textAlign: 'center', padding: '4rem 2rem' }}
        >
          <h3>No Test Runs Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Use the Katalyst GitHub Action to ingest test coverage data.
          </p>
        </div>
      ) : (
        <>
          {/* Top KPIs */}
          <div className="grid-cols-4">
            <div className="glass-card">
              <div className="stat-label">Code Coverage</div>
              <div
                className="stat-value"
                style={{
                  color:
                    coverageDataLatest >= 80
                      ? 'var(--success)'
                      : coverageDataLatest >= 50
                        ? 'var(--warning)'
                        : 'var(--danger)',
                }}
              >
                {coverageDataLatest.toFixed(1)}%
              </div>
            </div>
            <div className="glass-card">
              <div className="stat-label">Total Tests</div>
              <div className="stat-value">{totalTests}</div>
            </div>
            <div className="glass-card">
              <div className="stat-label">Passed</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {totalPassed}
              </div>
            </div>
            <div className="glass-card">
              <div className="stat-label">Failed</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {totalFailed}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-cols-2">
            <div className="glass-card">
              <h3
                style={{
                  marginBottom: '1.5rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Coverage Trend
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-glass)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-glass)',
                      }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="coverage"
                      stroke="var(--accent-primary)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card">
              <h3
                style={{
                  marginBottom: '1.5rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Test Results History
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-glass)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-glass)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="passed" stackId="a" fill="var(--success)" />
                    <Bar dataKey="failed" stackId="a" fill="var(--danger)" />
                    <Bar dataKey="skipped" stackId="a" fill="var(--warning)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="glass-card">
            <h3
              style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}
            >
              Recent Commits
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Commit</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Coverage</th>
                    <th>Tests (P/F/S)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRuns.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: 500 }}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <GitBranchIcon width={20} height={20} />
                          <a
                            href={`https://github.com/${run.repo}/tree/${run.branch}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.textDecoration =
                                'underline')
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.textDecoration = 'none')
                            }
                          >
                            {run.branch}
                          </a>
                          {run.pr_number && ` (#${run.pr_number})`}
                        </span>
                      </td>
                      <td
                        style={{
                          fontFamily: 'monospace',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <GitCommitLineIcon style={{ color: '#8b949e' }} />
                        <a
                          href={`https://github.com/${run.repo}/commit/${run.commit_sha}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.textDecoration = 'underline')
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.textDecoration = 'none')
                          }
                        >
                          {run.commit_sha.substring(0, 7)}
                        </a>
                      </td>
                      <td>{new Date(run.created_at).toLocaleString()}</td>
                      <td>
                        {run.status === 'completed' && run.failed === 0 ? (
                          <span
                            className="badge badge-success"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <CheckCircle2 size={12} /> Passed
                          </span>
                        ) : run.failed > 0 ? (
                          <span
                            className="badge badge-danger"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <XCircle size={12} /> Failed
                          </span>
                        ) : (
                          <span
                            className="badge badge-warning"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <MinusCircle size={12} /> {run.status}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {parseFloat(run.coverage_percent).toFixed(1)}%
                      </td>
                      <td>
                        <span
                          style={{ color: 'var(--success)', fontWeight: 600 }}
                        >
                          {run.passed}
                        </span>{' '}
                        /&nbsp;
                        <span
                          style={{ color: 'var(--danger)', fontWeight: 600 }}
                        >
                          {run.failed}
                        </span>{' '}
                        /&nbsp;
                        <span
                          style={{ color: 'var(--warning)', fontWeight: 600 }}
                        >
                          {run.skipped}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  padding: '0 0.5rem',
                }}
              >
                <button
                  className="btn-pagination"
                  style={{
                    width: 'auto',
                    padding: '0.5rem 1rem',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  Page{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {currentPage}
                  </strong>{' '}
                  of {totalPages}
                </span>
                <button
                  className="btn-pagination"
                  style={{
                    width: 'auto',
                    padding: '0.5rem 1rem',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor:
                      currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
