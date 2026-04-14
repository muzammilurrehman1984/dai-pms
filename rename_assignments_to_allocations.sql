-- ============================================================
-- Migration: Rename assignments → allocations
-- Run this in Supabase SQL Editor (or psql)
-- ============================================================

-- 1. Rename the table
ALTER TABLE assignments RENAME TO allocations;

-- 2. Rename primary key index (IF EXISTS is valid for ALTER INDEX)
ALTER INDEX IF EXISTS assignments_pkey RENAME TO allocations_pkey;

-- 3. Rename foreign key constraints
--    RENAME CONSTRAINT does not support IF EXISTS — use DO blocks to skip safely
DO $$ BEGIN
  ALTER TABLE allocations RENAME CONSTRAINT assignments_session_id_fkey TO allocations_session_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE allocations RENAME CONSTRAINT assignments_supervisor_id_fkey TO allocations_supervisor_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE allocations RENAME CONSTRAINT assignments_student_id_fkey TO allocations_student_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE allocations RENAME CONSTRAINT assignments_section_id_fkey TO allocations_section_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 4. Rename unique constraint (if any)
DO $$ BEGIN
  ALTER TABLE allocations RENAME CONSTRAINT assignments_student_id_session_id_key TO allocations_student_id_session_id_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 5. Rename indexes (IF EXISTS is valid here)
ALTER INDEX IF EXISTS idx_assignments_session    RENAME TO idx_allocations_session;
ALTER INDEX IF EXISTS idx_assignments_supervisor RENAME TO idx_allocations_supervisor;
ALTER INDEX IF EXISTS idx_assignments_student    RENAME TO idx_allocations_student;
ALTER INDEX IF EXISTS idx_assignments_section    RENAME TO idx_allocations_section;

-- 6. Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'allocations';
