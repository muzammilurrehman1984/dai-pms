-- DAI-PMS Supabase Schema
-- Department of Artificial Intelligence Project Management System
-- © Department of Artificial Intelligence, Faculty of Computing,
--   The Islamia University of Bahawalpur, Pakistan. All rights reserved.

-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('Department_Admin','Supervisor','Student')),
  password_changed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semesters (auto-created: 7 and 8 per session)
CREATE TABLE semesters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  semester_number INT  NOT NULL CHECK (semester_number IN (7, 8)),
  UNIQUE (session_id, semester_number)
);

-- Sections
CREATE TABLE sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  UNIQUE (session_id, section_name)
);

-- Supervisors
CREATE TABLE supervisors (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name  TEXT NOT NULL,
  designation   TEXT NOT NULL,
  expertise     TEXT,
  mobile_number TEXT,
  email         TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reg_number    TEXT NOT NULL UNIQUE,
  student_name  TEXT NOT NULL,
  father_name   TEXT,
  mobile_number TEXT,
  email         TEXT NOT NULL UNIQUE,
  section_id    UUID NOT NULL REFERENCES sections(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supervisor Assignments (per session)
CREATE TABLE assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES supervisors(id),
  student_id    UUID NOT NULL REFERENCES students(id),
  section_id    UUID NOT NULL REFERENCES sections(id),
  UNIQUE (session_id, student_id)
);

-- Submission Deadlines (per semester, per submission type)
CREATE TABLE submission_deadlines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id     UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL CHECK (submission_type IN (
                    'Project Approval','SRS','SDD',
                    'Final Documentation','Final Project Code')),
  is_locked       BOOLEAN NOT NULL DEFAULT TRUE,
  deadline        TIMESTAMPTZ,
  UNIQUE (semester_id, submission_type)
);

-- Submissions (one per student per submission_type per semester)
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id),
  semester_id     UUID NOT NULL REFERENCES semesters(id),
  submission_type TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending','Approved','Rejected','Revision')),
  marks           INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, semester_id, submission_type)
);

-- Submission Versions (full URL history)
CREATE TABLE submission_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  document_url  TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings
CREATE TABLE meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES supervisors(id),
  semester_id   UUID NOT NULL REFERENCES semesters(id),
  scope         TEXT NOT NULL CHECK (scope IN ('Individual','Group','All')),
  status        TEXT NOT NULL DEFAULT 'Approved'
                  CHECK (status IN ('Approved','Rejected','Re-scheduled')),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting Participants
CREATE TABLE meeting_participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  marks      INT  NOT NULL DEFAULT 0,
  UNIQUE (meeting_id, student_id)
);

-- Comments
CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  type       TEXT NOT NULL,
  payload    JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- Requirements: 15.1–15.6
-- ============================================================

-- Helper function: get the current user's role from profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_deadlines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- Department_Admin: full CRUD
-- Supervisor: SELECT + UPDATE (own)
-- Student: SELECT + UPDATE (own)
-- ============================================================
CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('Supervisor', 'Student'));

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid() AND get_my_role() IN ('Supervisor', 'Student'));

-- ============================================================
-- sessions
-- Department_Admin: full CRUD
-- Supervisor: SELECT
-- Student: SELECT
-- ============================================================
CREATE POLICY "sessions_admin_all"
  ON sessions FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "sessions_select_all"
  ON sessions FOR SELECT
  USING (get_my_role() IN ('Supervisor', 'Student'));

-- ============================================================
-- semesters
-- Department_Admin: full CRUD
-- Supervisor: SELECT
-- Student: SELECT
-- ============================================================
CREATE POLICY "semesters_admin_all"
  ON semesters FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "semesters_select_all"
  ON semesters FOR SELECT
  USING (get_my_role() IN ('Supervisor', 'Student'));

-- ============================================================
-- sections
-- Department_Admin: full CRUD
-- Supervisor: SELECT
-- Student: SELECT
-- ============================================================
CREATE POLICY "sections_admin_all"
  ON sections FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "sections_select_all"
  ON sections FOR SELECT
  USING (get_my_role() IN ('Supervisor', 'Student'));

-- ============================================================
-- supervisors
-- Department_Admin: full CRUD
-- Supervisor: SELECT (assigned — supervisors who share an assignment with the current user)
-- Student: SELECT (self)
-- ============================================================
CREATE POLICY "supervisors_admin_all"
  ON supervisors FOR ALL
  USING (get_my_role() = 'Department_Admin');

-- Supervisor can see themselves and other supervisors assigned to the same students
CREATE POLICY "supervisors_select_supervisor"
  ON supervisors FOR SELECT
  USING (
    get_my_role() = 'Supervisor'
    AND (
      id = auth.uid()
      OR id IN (
        SELECT supervisor_id FROM assignments
        WHERE student_id IN (
          SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
        )
      )
    )
  );

-- Student can see their own supervisor
CREATE POLICY "supervisors_select_student"
  ON supervisors FOR SELECT
  USING (
    get_my_role() = 'Student'
    AND id IN (
      SELECT supervisor_id FROM assignments WHERE student_id = auth.uid()
    )
  );

-- ============================================================
-- students
-- Department_Admin: full CRUD
-- Supervisor: SELECT (assigned students)
-- Student: SELECT (self)
-- ============================================================
CREATE POLICY "students_admin_all"
  ON students FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "students_select_supervisor"
  ON students FOR SELECT
  USING (
    get_my_role() = 'Supervisor'
    AND id IN (
      SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "students_select_self"
  ON students FOR SELECT
  USING (get_my_role() = 'Student' AND id = auth.uid());

-- ============================================================
-- assignments
-- Department_Admin: full CRUD
-- Supervisor: SELECT (own — where supervisor_id = auth.uid())
-- Student: SELECT (self — where student_id = auth.uid())
-- ============================================================
CREATE POLICY "assignments_admin_all"
  ON assignments FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "assignments_select_supervisor"
  ON assignments FOR SELECT
  USING (get_my_role() = 'Supervisor' AND supervisor_id = auth.uid());

CREATE POLICY "assignments_select_student"
  ON assignments FOR SELECT
  USING (get_my_role() = 'Student' AND student_id = auth.uid());

-- ============================================================
-- submission_deadlines
-- Department_Admin: full CRUD
-- Supervisor: SELECT
-- Student: SELECT
-- ============================================================
CREATE POLICY "submission_deadlines_admin_all"
  ON submission_deadlines FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "submission_deadlines_select_all"
  ON submission_deadlines FOR SELECT
  USING (get_my_role() IN ('Supervisor', 'Student'));

-- ============================================================
-- submissions
-- Department_Admin: full CRUD
-- Supervisor: SELECT + UPDATE (assigned students)
-- Student: SELECT + INSERT (own)
-- ============================================================
CREATE POLICY "submissions_admin_all"
  ON submissions FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "submissions_select_supervisor"
  ON submissions FOR SELECT
  USING (
    get_my_role() = 'Supervisor'
    AND student_id IN (
      SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "submissions_update_supervisor"
  ON submissions FOR UPDATE
  USING (
    get_my_role() = 'Supervisor'
    AND student_id IN (
      SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "submissions_select_student"
  ON submissions FOR SELECT
  USING (get_my_role() = 'Student' AND student_id = auth.uid());

CREATE POLICY "submissions_insert_student"
  ON submissions FOR INSERT
  WITH CHECK (get_my_role() = 'Student' AND student_id = auth.uid());

-- ============================================================
-- submission_versions
-- Department_Admin: full CRUD
-- Supervisor: SELECT + UPDATE (assigned students' submissions)
-- Student: SELECT + INSERT (own submissions)
-- ============================================================
CREATE POLICY "submission_versions_admin_all"
  ON submission_versions FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "submission_versions_select_supervisor"
  ON submission_versions FOR SELECT
  USING (
    get_my_role() = 'Supervisor'
    AND submission_id IN (
      SELECT id FROM submissions
      WHERE student_id IN (
        SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
      )
    )
  );

CREATE POLICY "submission_versions_update_supervisor"
  ON submission_versions FOR UPDATE
  USING (
    get_my_role() = 'Supervisor'
    AND submission_id IN (
      SELECT id FROM submissions
      WHERE student_id IN (
        SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
      )
    )
  );

CREATE POLICY "submission_versions_select_student"
  ON submission_versions FOR SELECT
  USING (
    get_my_role() = 'Student'
    AND submission_id IN (
      SELECT id FROM submissions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "submission_versions_insert_student"
  ON submission_versions FOR INSERT
  WITH CHECK (
    get_my_role() = 'Student'
    AND submission_id IN (
      SELECT id FROM submissions WHERE student_id = auth.uid()
    )
  );

-- ============================================================
-- meetings
-- Department_Admin: full CRUD
-- Supervisor: full CRUD (own — where supervisor_id = auth.uid())
-- Student: SELECT (own — meetings they participate in)
-- ============================================================
CREATE POLICY "meetings_admin_all"
  ON meetings FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "meetings_all_supervisor"
  ON meetings FOR ALL
  USING (get_my_role() = 'Supervisor' AND supervisor_id = auth.uid());

CREATE POLICY "meetings_select_student"
  ON meetings FOR SELECT
  USING (
    get_my_role() = 'Student'
    AND id IN (
      SELECT meeting_id FROM meeting_participants WHERE student_id = auth.uid()
    )
  );

-- ============================================================
-- meeting_participants
-- Department_Admin: full CRUD
-- Supervisor: full CRUD (own meetings)
-- Student: SELECT (own)
-- ============================================================
CREATE POLICY "meeting_participants_admin_all"
  ON meeting_participants FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "meeting_participants_all_supervisor"
  ON meeting_participants FOR ALL
  USING (
    get_my_role() = 'Supervisor'
    AND meeting_id IN (
      SELECT id FROM meetings WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "meeting_participants_select_student"
  ON meeting_participants FOR SELECT
  USING (get_my_role() = 'Student' AND student_id = auth.uid());

-- ============================================================
-- comments
-- Department_Admin: full CRUD
-- Supervisor: INSERT + SELECT (assigned students' submissions)
-- Student: INSERT + SELECT (own submissions)
-- ============================================================
CREATE POLICY "comments_admin_all"
  ON comments FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "comments_select_supervisor"
  ON comments FOR SELECT
  USING (
    get_my_role() = 'Supervisor'
    AND submission_id IN (
      SELECT id FROM submissions
      WHERE student_id IN (
        SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
      )
    )
  );

CREATE POLICY "comments_insert_supervisor"
  ON comments FOR INSERT
  WITH CHECK (
    get_my_role() = 'Supervisor'
    AND author_id = auth.uid()
    AND submission_id IN (
      SELECT id FROM submissions
      WHERE student_id IN (
        SELECT student_id FROM assignments WHERE supervisor_id = auth.uid()
      )
    )
  );

CREATE POLICY "comments_select_student"
  ON comments FOR SELECT
  USING (
    get_my_role() = 'Student'
    AND submission_id IN (
      SELECT id FROM submissions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "comments_insert_student"
  ON comments FOR INSERT
  WITH CHECK (
    get_my_role() = 'Student'
    AND author_id = auth.uid()
    AND submission_id IN (
      SELECT id FROM submissions WHERE student_id = auth.uid()
    )
  );

-- ============================================================
-- messages
-- Department_Admin: full CRUD
-- Supervisor: INSERT + SELECT (own conversations)
-- Student: INSERT + SELECT (own conversations)
-- ============================================================
CREATE POLICY "messages_admin_all"
  ON messages FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "messages_select_supervisor"
  ON messages FOR SELECT
  USING (
    get_my_role() = 'Supervisor'
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );

CREATE POLICY "messages_insert_supervisor"
  ON messages FOR INSERT
  WITH CHECK (
    get_my_role() = 'Supervisor'
    AND sender_id = auth.uid()
  );

CREATE POLICY "messages_select_student"
  ON messages FOR SELECT
  USING (
    get_my_role() = 'Student'
    AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );

CREATE POLICY "messages_insert_student"
  ON messages FOR INSERT
  WITH CHECK (
    get_my_role() = 'Student'
    AND sender_id = auth.uid()
  );

-- ============================================================
-- notifications
-- Department_Admin: full CRUD
-- Supervisor: SELECT + UPDATE (own)
-- Student: SELECT + UPDATE (own)
-- ============================================================
CREATE POLICY "notifications_admin_all"
  ON notifications FOR ALL
  USING (get_my_role() = 'Department_Admin');

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (
    get_my_role() IN ('Supervisor', 'Student')
    AND user_id = auth.uid()
  );

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (
    get_my_role() IN ('Supervisor', 'Student')
    AND user_id = auth.uid()
  );

-- ============================================================
-- Initial Department_Admin Seed
-- Requirements: 14.7, 19.4
-- ============================================================
DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@dai-pms.vercel.app') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role
    ) VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@dai-pms.vercel.app',
      crypt('Admin@1234', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      FALSE,
      'authenticated'
    );
  END IF;

  -- Insert into profiles if not exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id) THEN
    INSERT INTO profiles (id, role, password_changed)
    VALUES (admin_id, 'Department_Admin', FALSE);
  END IF;
END $$;
