export class Project {
  projectid: string;
  projectname: string;
  ingestiontoken: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_hash: string;
  expires_at?: Date;
  revoked_at?: Date;
  created_at: Date;
}

export interface TestRun {
  id: string;
  project_id: string;
  repo: string;
  branch: string;
  commit_sha: string;
  run_url?: string;
  trigger?: string;
  pr_number?: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage_percent?: number | string;
  status: string;
  created_at: Date;

  test_cases?: TestCase[];
  coverage_files?: CoverageFile[];
  artifacts?: Artifact[];
}

export interface TestCase {
  id: string;
  run_id: string;
  suite?: string;
  name: string;
  test_key?: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_sec?: number | string;
  failure_message?: string;
  stack_trace?: string;
  created_at: Date;
}

export interface CoverageFile {
  id: string;
  run_id: string;
  file_path: string;
  lines_total: number;
  lines_covered: number;
  created_at: Date;
}

export interface Artifact {
  id: string;
  run_id: string;
  type: 'junit' | 'lcov' | 'other' | 'coverage-summary';
  storage_url: string;
  checksum?: string;
  uploaded_at: Date;
}
