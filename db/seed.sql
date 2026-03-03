-- Seed data for code_coverage tables

-- Insert Projects (using consistent UUIDs for referential integrity)
INSERT INTO code_coverage.project_ingestion (projectid, projectname, ingestiontoken)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Authentication Service', 'token-auth-svc-123'),
    ('b1f1c1a1-9c0b-4ef8-bb6d-6bb9bd380a22', 'Payment Gateway', 'token-payment-gw-456')
ON CONFLICT (projectid) DO NOTHING;

-- Insert Ingest API Keys
INSERT INTO code_coverage.ingest_api_keys (id, project_id, name, key_hash, expires_at)
VALUES
    ('c2f2c2a2-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'GitHub Action CI Key', 'hash1234567890abcdef', CURRENT_TIMESTAMP + INTERVAL '1 year'),
    ('d3f3c3a3-9c0b-4ef8-bb6d-6bb9bd380a44', 'b1f1c1a1-9c0b-4ef8-bb6d-6bb9bd380a22', 'GitLab Runner Key', 'hash0987654321fedcba', CURRENT_TIMESTAMP + INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- Insert Unit Test Run
INSERT INTO code_coverage.unit_test_run (id, project_id, repo, branch, commit_sha, run_url, trigger, pr_number, total, passed, failed, skipped, coverage_percent, status)
VALUES
    ('e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'github.com/org/auth-svc', 'main', 'abcdef1234567890', 'https://github.com/org/auth-svc/actions/runs/12345', 'push', NULL, 150, 148, 2, 0, 92.50, 'completed'),
    ('f5f5c5a5-9c0b-4ef8-bb6d-6bb9bd380a66', 'b1f1c1a1-9c0b-4ef8-bb6d-6bb9bd380a22', 'github.com/org/payment-gw', 'feature/stripe', '1234567890abcdef', 'https://github.com/org/payment-gw/actions/runs/67890', 'pull_request', 42, 200, 200, 0, 0, 95.00, 'completed'),
    ('68b0c8a8-9c0b-4ef8-bb6d-6bb9bd380b77', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'github.com/org/auth-svc', 'develop', '34567890abcdef12', 'https://github.com/org/auth-svc/actions/runs/12346', 'push', NULL, 150, 150, 0, 0, 94.20, 'completed')
ON CONFLICT (id) DO NOTHING;

-- Insert Unit Test Cases Run
INSERT INTO code_coverage.unit_test_cases_run (id, run_id, suite, name, test_key, status, duration_sec, failure_message)
VALUES
    ('06f6c6a6-9c0b-4ef8-bb6d-6bb9bd380a77', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'Auth Controller Suite', 'should return 401 for invalid token', 'test-1', 'passed', 0.125, NULL),
    ('17f7c7a7-9c0b-4ef8-bb6d-6bb9bd380a88', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'Auth Controller Suite', 'should refresh user token', 'test-2', 'failed', 1.050, 'Expected status 200 but received 401'),
    ('28f8c8a8-9c0b-4ef8-bb6d-6bb9bd380a99', 'f5f5c5a5-9c0b-4ef8-bb6d-6bb9bd380a66', 'Payment Service', 'should charge card successfully', 'test-3', 'passed', 2.300, NULL),
    ('29f8c8a8-9c0b-4ef8-bb6d-6bb9bd380a99', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'User Service', 'should fetch user profile', 'test-4', 'passed', 0.080, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Coverage Files
INSERT INTO code_coverage.coverage_files (id, run_id, file_path, lines_total, lines_covered)
VALUES
    ('39f9c9a9-9c0b-4ef8-bb6d-6bb9bd380aaa', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'src/controllers/auth.controller.ts', 150, 140),
    ('40f0c0a0-9c0b-4ef8-bb6d-6bb9bd380abb', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'src/services/auth.service.ts', 300, 280),
    ('51f1c1a1-9c0b-4ef8-bb6d-6bb9bd380acc', 'f5f5c5a5-9c0b-4ef8-bb6d-6bb9bd380a66', 'src/services/stripe.service.ts', 120, 115)
ON CONFLICT (id) DO NOTHING;

-- Insert Unit Test Ingest Artifacts
INSERT INTO code_coverage.unit_test_ingest_artifacts (id, run_id, type, storage_url, checksum)
VALUES
    ('62f2c2a2-9c0b-4ef8-bb6d-6bb9bd380add', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'lcov', 's3://artifacts/auth-svc/lcov-12345.info', 'md5-123456'),
    ('73f3c3a3-9c0b-4ef8-bb6d-6bb9bd380aee', 'e4f4c4a4-9c0b-4ef8-bb6d-6bb9bd380a55', 'junit', 's3://artifacts/auth-svc/junit-12345.xml', 'md5-abcdef'),
    ('84f4c4a4-9c0b-4ef8-bb6d-6bb9bd380aff', 'f5f5c5a5-9c0b-4ef8-bb6d-6bb9bd380a66', 'lcov', 's3://artifacts/payment-gw/lcov-67890.info', 'md5-987654')
ON CONFLICT (id) DO NOTHING;
