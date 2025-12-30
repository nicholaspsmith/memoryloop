-- Background Jobs Queue Table
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  result JSONB,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  next_retry_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient job retrieval
CREATE INDEX IF NOT EXISTS idx_background_jobs_pending 
  ON background_jobs(status, next_retry_at, priority DESC) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_background_jobs_user 
  ON background_jobs(user_id, type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status 
  ON background_jobs(status);

-- Job Rate Limits Table
CREATE TABLE IF NOT EXISTS job_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL,
  window_start TIMESTAMP NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_job_rate_limits_lookup 
  ON job_rate_limits(user_id, job_type, window_start);
