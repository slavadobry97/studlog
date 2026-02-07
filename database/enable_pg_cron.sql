-- Enable the pg_cron extension
-- This extension allows scheduling jobs directly within the database.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a job to run every 2 minutes
-- The query 'SELECT 1' is very lightweight but enough to keep the connection active.
SELECT cron.schedule(
  'keep_awake_job', -- Job name
  '*/2 * * * *',    -- Cron schedule (every 2 minutes)
  $$SELECT 1$$      -- SQL query to run
);

-- Note:
-- If you need to stop this job later, you can run:
-- SELECT cron.unschedule('keep_awake_job');

-- To check active jobs:
-- SELECT * FROM cron.job;
