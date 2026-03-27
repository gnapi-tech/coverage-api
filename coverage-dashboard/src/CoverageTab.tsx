import React, { useState, useEffect } from 'react';
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
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { GitHubIcon } from './assets/GitHubIcon';
import { GitBranchIcon } from './assets/GitBranchIcon';
import { GitCommitLineIcon } from './assets/GitCommitIcon';

interface TestRun {
  id: string;
  branch: string;
  commit_sha: string;
  repo: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage_percent: string;
  status: string;
  created_at: string;
  pr_number?: string;
}

interface CoverageTabProps {
  /** The Coverage API project ID (UUID) */
  projectId: string;
  /** Base URL of the coverage API e.g. "/api" or "http://localhost:3500" */
  apiBaseUrl?: string;
}

export const CoverageTab: React.FC<CoverageTabProps> = ({
  projectId,
  apiBaseUrl = '/api',
}) => {
  type FetchAction =
    | { type: 'FETCH_SUCCESS'; data: TestRun[] }
    | { type: 'FETCH_ERROR'; message: string };

  type FetchState = { testRuns: TestRun[]; loading: boolean; error: string };

  function fetchReducer(state: FetchState, action: FetchAction): FetchState {
    switch (action.type) {
      case 'FETCH_SUCCESS':
        return { testRuns: action.data, loading: false, error: '' };
      case 'FETCH_ERROR':
        return { testRuns: [], loading: false, error: action.message };
      default:
        return state;
    }
  }

  const [{ testRuns, loading, error }, dispatch] = React.useReducer(
    fetchReducer,
    { testRuns: [], loading: !!projectId, error: '' },
  );
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (!projectId) return;

    const controller = new AbortController();

    fetch(`${apiBaseUrl}/projects/${projectId}/test-runs`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error fetching test runs');
        }
        return res.json();
      })
      .then((data: TestRun[]) => {
        dispatch({ type: 'FETCH_SUCCESS', data });
        setCurrentPage(1);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          dispatch({ type: 'FETCH_ERROR', message: err.message });
        }
      });

    return () => {
      controller.abort();
    };
  }, [projectId, apiBaseUrl]);

  if (loading) {
    return <div className="loader" style={{ margin: '4rem auto' }} />;
  }

  if (error) {
    return (
      <div
        style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}
      >
        <p>{error}</p>
      </div>
    );
  }

  if (testRuns.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          margin: '1.5rem 0',
        }}
      >
        <h3>No Test Runs Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Use the Katalyst GitHub Action to ingest test coverage data.
        </p>
      </div>
    );
  }

  const latestRun = testRuns[0];
  const overallCoverage =
    testRuns.reduce((sum, run) => sum + parseFloat(run.coverage_percent), 0) /
    testRuns.length;
  const totalTests = testRuns.reduce((sum, run) => sum + run.total, 0);
  const totalPassed = testRuns.reduce((sum, run) => sum + run.passed, 0);
  const totalFailed = testRuns.reduce((sum, run) => sum + run.failed, 0);

  const chartData = [...testRuns].reverse().map((run) => ({
    name: run.commit_sha.substring(0, 7),
    passed: run.passed,
    failed: run.failed,
    skipped: run.skipped,
    coverage: parseFloat(run.coverage_percent),
  }));

  const totalPages = Math.max(1, Math.ceil(testRuns.length / rowsPerPage));
  const paginatedRuns = testRuns.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Repo link */}
      {latestRun?.repo && (
        <p
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#45474C',
            marginBottom: '1.5rem',
          }}
        >
          <GitHubIcon width={20} height={20} />
          <a
            href={`https://github.com/${latestRun.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#45474C', textDecoration: 'none' }}
            onMouseOver={(e) =>
              (e.currentTarget.style.textDecoration = 'underline')
            }
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {latestRun.repo}
          </a>
        </p>
      )}

      {/* KPI Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <div className="stat-label">Code Coverage</div>
          <div
            className="stat-value"
            style={{
              color:
                overallCoverage >= 80
                  ? '#13C31C'
                  : overallCoverage >= 50
                    ? '#FF9800'
                    : '#EF4545',
            }}
          >
            {overallCoverage.toFixed(1)}%
          </div>
        </div>
        <div className="glass-card">
          <div className="stat-label">Total Tests</div>
          <div className="stat-value">{totalTests}</div>
        </div>
        <div className="glass-card">
          <div className="stat-label">Passed</div>
          <div className="stat-value" style={{ color: '#13C31C' }}>
            {totalPassed}
          </div>
        </div>
        <div className="glass-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value" style={{ color: '#EF4545' }}>
            {totalFailed}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-cols-2" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', color: '#45474C' }}>
            Coverage Trend
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
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
                  domain={[0, 100]}
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glass)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="coverage"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', color: '#45474C' }}>
            Test Results
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
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
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-glass)',
                  }}
                />
                <Legend />
                <Bar dataKey="passed" stackId="a" fill="#13C31C" />
                <Bar dataKey="failed" stackId="a" fill="#EF4545" />
                <Bar dataKey="skipped" stackId="a" fill="#FF9800" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1.5rem', color: '#45474C' }}>
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
                          (e.currentTarget.style.textDecoration = 'underline')
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
                          color: '#13C31C',
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
                          color: '#EF4545',
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
                    <span style={{ color: '#13C31C', fontWeight: 600 }}>
                      {run.passed}
                    </span>{' '}
                    /&nbsp;
                    <span style={{ color: '#EF4545', fontWeight: 600 }}>
                      {run.failed}
                    </span>{' '}
                    /&nbsp;
                    <span style={{ color: '#FF9800', fontWeight: 600 }}>
                      {run.skipped}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span
              style={{ color: '#45474C', fontSize: '0.875rem' }}
            >
              Page{' '}
              <strong style={{ color: '#45474C' }}>
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
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
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
    </div>
  );
};
