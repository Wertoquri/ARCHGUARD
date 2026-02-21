-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(255),
  version VARCHAR(64),
  description TEXT,
  triggers JSON,
  steps JSON,
  createdAt BIGINT,
  updatedAt BIGINT
);
