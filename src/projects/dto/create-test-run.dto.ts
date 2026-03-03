export class CreateTestRunDto {
  repo?: string;
  branch?: string;
  commit_sha?: string;
  run_url?: string;
  trigger?: string;
  pr_number?: number;
  total?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  coverage_percent?: number | string;
  status?: string;

  test_cases?: {
    suite?: string;
    name: string;
    test_key?: string;
    status: 'passed' | 'failed' | 'skipped';
    duration_sec?: number | string;
    failure_message?: string;
    stack_trace?: string;
  }[];

  coverage_files?: {
    file_path: string;
    lines_total: number;
    lines_covered: number;
  }[];

  artifacts?: {
    type: 'junit' | 'lcov' | 'other' | 'coverage-summary';
    storage_url: string;
    checksum?: string;
  }[];
}
