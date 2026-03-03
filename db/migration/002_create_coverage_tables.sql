-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE code_coverage.test_case_status AS ENUM('passed', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE code_coverage.artifact_type AS ENUM('junit', 'lcov', 'other', 'coverage-summary');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE code_coverage.artifact_type ADD VALUE IF NOT EXISTS 'coverage-summary';

-- Table ingest_api_keys
CREATE TABLE IF NOT EXISTS code_coverage.ingest_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES code_coverage.project_ingestion(projectid) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Key display name, e.g. GitHub Action Key
    key_hash VARCHAR(255) NOT NULL, -- Hashed API key, never store raw key
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE code_coverage.ingest_api_keys IS 'API keys can be rotated/revoked per project';

CREATE INDEX IF NOT EXISTS idx_ingest_api_keys_project_id ON code_coverage.ingest_api_keys(project_id);


-- Table unit_test_run
CREATE TABLE IF NOT EXISTS code_coverage.unit_test_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES code_coverage.project_ingestion(projectid) ON DELETE CASCADE,
    repo VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(64) NOT NULL,
    run_url TEXT,
    trigger VARCHAR(50), -- push | pull_request | manual | schedule
    pr_number INT,
    total INT DEFAULT 0,
    passed INT DEFAULT 0,
    failed INT DEFAULT 0,
    skipped INT DEFAULT 0,
    coverage_percent DECIMAL(5,2),
    status VARCHAR(20) NOT NULL, -- queued | running | completed | failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE code_coverage.unit_test_run IS 'One row per CI workflow execution';

CREATE INDEX IF NOT EXISTS idx_unit_test_run_project_id ON code_coverage.unit_test_run(project_id);
CREATE INDEX IF NOT EXISTS idx_unit_test_run_project_id_branch ON code_coverage.unit_test_run(project_id, branch);
CREATE INDEX IF NOT EXISTS idx_unit_test_run_commit_sha ON code_coverage.unit_test_run(commit_sha);


-- Table unit_test_cases_run
CREATE TABLE IF NOT EXISTS code_coverage.unit_test_cases_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES code_coverage.unit_test_run(id) ON DELETE CASCADE,
    suite VARCHAR(255),
    name TEXT NOT NULL,
    test_key VARCHAR(255), -- Optional unique test identifier from framework
    status code_coverage.test_case_status NOT NULL,
    duration_sec DECIMAL(10,3),
    failure_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE code_coverage.unit_test_cases_run IS 'Stores individual test case result for a CI run';

CREATE INDEX IF NOT EXISTS idx_unit_test_cases_run_run_id ON code_coverage.unit_test_cases_run(run_id);
CREATE INDEX IF NOT EXISTS idx_unit_test_cases_run_run_id_test_key ON code_coverage.unit_test_cases_run(run_id, test_key);


-- Table coverage_files
CREATE TABLE IF NOT EXISTS code_coverage.coverage_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES code_coverage.unit_test_run(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    lines_total INT NOT NULL,
    lines_covered INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE code_coverage.coverage_files IS 'Stores per-file coverage metrics parsed from LCOV';

CREATE INDEX IF NOT EXISTS idx_coverage_files_run_id ON code_coverage.coverage_files(run_id);


-- Table unit_test_ingest_artifacts
CREATE TABLE IF NOT EXISTS code_coverage.unit_test_ingest_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES code_coverage.unit_test_run(id) ON DELETE CASCADE,
    type code_coverage.artifact_type NOT NULL,
    storage_url TEXT NOT NULL, -- S3 URL or local storage path
    checksum VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE code_coverage.unit_test_ingest_artifacts IS 'Tracks uploaded artifacts for traceability and reprocessing';

CREATE INDEX IF NOT EXISTS idx_unit_test_ingest_artifacts_run_id ON code_coverage.unit_test_ingest_artifacts(run_id);
