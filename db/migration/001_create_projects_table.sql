CREATE SCHEMA IF NOT EXISTS code_coverage;

CREATE TABLE IF NOT EXISTS code_coverage.project_ingestion (
    projectid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projectname VARCHAR(255) NOT NULL,
    ingestiontoken VARCHAR(255) NOT NULL UNIQUE
);
