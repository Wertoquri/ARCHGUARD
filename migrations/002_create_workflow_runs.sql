-- Create workflow_runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
  id VARCHAR(191) PRIMARY KEY,
  workflow_id VARCHAR(191),
  status VARCHAR(32),
  startedAt BIGINT NULL,
  finishedAt BIGINT NULL,
  currentStepId VARCHAR(191) NULL,
  log JSON,
  meta JSON,
  createdAt BIGINT,
  updatedAt BIGINT,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL
);
