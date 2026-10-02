-- Create a dedicated replication user.
-- This user can ONLY replicate, not read/write data (least privilege).
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';