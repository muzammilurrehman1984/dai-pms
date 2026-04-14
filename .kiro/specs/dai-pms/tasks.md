# Implementation Plan: DAI-PMS

> Powered by: Prof. Dr. Najia Saher (Chairperson), Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur
> Developed by: Mr. Muzammil Ur Rehman (Lecturer), Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur
> © Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur, Pakistan. All rights reserved.

---

## Overview

Incremental implementation of the DAI-PMS React 18 + TypeScript + Vite SPA backed by Supabase. Each task builds on the previous, ending with full integration. All code is TypeScript; tests use Vitest + fast-check.

---

## Tasks

- [x] 1. Project scaffold and configuration
  - Initialise Vite + React 18 + TypeScript project (already bootstrapped — wire remaining config)
  - Add dependencies: `@supabase/supabase-js`, `react-router-dom`, `tailwindcss`, `lucide-react`, `fast-check`, `vitest`, `@testing-library/react`
  - Configure `tailwind.config.ts`, `postcss.config.js`, `vite.config.ts` (path aliases, test config)
  - Add `vercel.json` with SPA rewrite rule (`"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]`)
  - Create `src/types/index.ts` with all shared TypeScript interfaces and union types from the design
  - _Requirements: 18.4, 19.2_

- [x] 2. Supabase schema, RLS, and seed SQL
  - [x] 2.1 Create `supabase/schema.sql` with all CREATE TABLE statements, CHECK constraints, and UNIQUE constraints from the design
    - Tables: `profiles`, `sessions`, `semesters`, `sections`, `supervisors`, `students`, `assignments`, `submission_deadlines`, `submissions`, `submission_versions`, `meetings`, `meeting_participants`, `comments`, `messages`, `notifications`
    - _Requirements: 15.6, 19.4_
  - [x] 2.2 Add RLS policies to `supabase/schema.sql` for all tables per the RLS Policy Summary in the design
    - Department_Admin: full CRUD on all tables
    - Supervisor: scoped SELECT/INSERT/UPDATE on assigned data
    - Student: scoped SELECT/INSERT on own data
    - _Requirements: 15.1–15.6_
  - [x] 2.3 Add initial Department_Admin seed to `supabase/schema.sql`
    - Insert `admin@dai-pms.vercel.app` / `Admin@1234` into `auth.users` and `profiles` with `role = 'Department_Admin'`, `password_changed = false`
    - _Requirements: 14.7, 19.4_

- [x] 3. Supabase client and auth service
  - [x] 3.1 Create `src/services/supabase.ts` — Supabase client singleton using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
    - _Requirements: 19.1_
  - [x] 3.2 Create `src/services/auth.service.ts` — `login()`, `logout()`, `changePassword()`, `resetStudentPassword()`
    - `changePassword()` must also set `profiles.password_changed = true`
    - `resetStudentPassword()` must set `profiles.password_changed = false`
    - Map Supabase error codes to user-friendly messages
    - _Requirements: 14.1, 14.2, 14.5, 14.8, 14.9, 14.10_
  - [x] 3.3 Create `src/hooks/useAuth.ts` — exposes `{ user, role, passwordChanged, loading }`
    - Subscribes to `supabase.auth.onAuthStateChange`
    - _Requirements: 14.1, 14.3_

- [x] 4. Utility functions
  - [x] 4.1 Create `src/utils/formatters.ts` with `compareRegNumbers()`, `compareSectionNames()`, `compareSessionNames()`
    - Each function parses its input with a regex; falls back to `localeCompare` on parse failure without throwing
    - `compareRegNumbers`: sort by (year asc, S<F, program 1<2<7, M<E, serial asc)
    - `compareSectionNames`: sort by (semester number asc, section number asc, M<E)
    - `compareSessionNames`: sort by (year asc, Spring<Fall)
    - _Requirements: 21.1–21.7_
  - [ ]* 4.2 Write property tests for `compareSessionNames` (Property 4)
    - **Property 4: Session sort order**
    - **Validates: Requirements 1.5, 21.3**
  - [ ]* 4.3 Write property tests for `compareRegNumbers` (Property 32)
    - **Property 32: compareRegNumbers sort order**
    - **Validates: Requirements 21.1**
  - [ ]* 4.4 Write property tests for `compareSectionNames` (Property 33)
    - **Property 33: compareSectionNames sort order**
    - **Validates: Requirements 21.2**
  - [ ]* 4.5 Write property tests for comparator fallback on malformed input (Property 34)
    - **Property 34: Comparator fallback on malformed input**
    - **Validates: Requirements 21.5, 21.6, 21.7**
  - [x] 4.6 Create `src/utils/grading.ts` with `computeGrade()` and `computeTotal()`
    - `computeGrade(total: number): string` — grade scheme from design
    - `computeTotal(components: GradeComponents): number` — sum capped at 100
    - _Requirements: 10.1–10.5_
  - [ ]* 4.7 Write property tests for `computeGrade` (Property 24)
    - **Property 24: Grade computation from total marks**
    - **Validates: Requirements 10.4, 10.5**
  - [ ]* 4.8 Write unit tests for `computeGrade` boundary values and `computeTotal` for FYP-I and FYP-II
    - Boundary values: 49, 50, 59, 60, 69, 70, 77, 78, 84, 85, 94, 95, 100
    - _Requirements: 10.1, 10.2, 10.4_
  - [x] 4.9 Create `src/utils/csv.ts` with `parseCSV()` and `validateRow()`
    - Returns `{ successes: T[], failures: RowError[] }` — valid rows never aborted by invalid rows
    - _Requirements: 3.4, 4.4, 5.4_
  - [ ]* 4.10 Write property tests for CSV partial failure (Property 8)
    - **Property 8: CSV partial failure — valid rows succeed, invalid rows reported**
    - **Validates: Requirements 3.4, 4.4, 5.4**

- [x] 5. Checkpoint — Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Routing and auth guards
  - [x] 6.1 Create `src/components/auth/ProtectedRoute.tsx`
    - Redirects unauthenticated users to `/login`
    - Redirects users with `password_changed = false` to `/first-login`
    - Accepts `allowedRole` prop; redirects wrong-role users to `/login`
    - _Requirements: 14.3, 14.4, 15.2_
  - [ ]* 6.2 Write property tests for route guard redirect (Property 28)
    - **Property 28: Route guard blocks dashboard when password not changed**
    - **Validates: Requirements 14.3, 14.4**
  - [x] 6.3 Create `src/router.tsx` with all route groups: `/login`, `/first-login`, `/admin/*`, `/supervisor/*`, `/student/*`
    - Wrap each dashboard group in `<ProtectedRoute allowedRole="...">` 
    - _Requirements: 14.3, 14.4, 15.1_
  - [x] 6.4 Create `src/pages/LoginPage.tsx` and `src/components/auth/LoginForm.tsx`
    - Email + password form; calls `auth.service.login()`; shows descriptive error on failure
    - _Requirements: 14.1, 14.2_
  - [x] 6.5 Create `src/pages/FirstLoginPage.tsx` and `src/components/auth/FirstLoginForm.tsx`
    - New password + confirm form; calls `auth.service.changePassword()`; on success redirects to role dashboard
    - _Requirements: 14.3, 14.5_
  - [ ]* 6.6 Write property tests for password change sets `password_changed = true` (Property 29)
    - **Property 29: Password change sets password_changed to true**
    - **Validates: Requirements 14.5**

- [x] 7. Layout shell and shared UI primitives
  - [x] 7.1 Create reusable UI primitives in `src/components/ui/`: `Button`, `Input`, `Modal`, `Badge`, `Table`, `Spinner`, `Toast`
    - Tailwind-styled, mobile-first, accessible (ARIA labels, keyboard nav)
    - _Requirements: 18.1, 18.2, 18.3_
  - [x] 7.2 Create `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `Navbar.tsx`
    - Responsive sidebar (collapsible on mobile), top navbar with role label and logout
    - _Requirements: 18.1, 18.2_
  - [x] 7.3 Create `src/components/layout/NotificationBell.tsx` and `src/hooks/useNotifications.ts`
    - Displays unread count badge; subscribes to `notifications` table via Supabase Realtime
    - _Requirements: 13.3, 13.5_
  - [x] 7.4 Create `src/hooks/useRealtimeChannel.ts`
    - Generic Supabase Realtime subscription hook with exponential backoff reconnection (1s, 2s, 4s, max 30s)
    - Shows toast on disconnect
    - _Requirements: 12.2, 13.5_
  - [x] 7.5 Create `src/components/shared/SortFilterBar.tsx` and `src/components/shared/Pagination.tsx`
    - Generic `SortFilterBarProps<T>` interface; preserves sort/filter state in `sessionStorage`
    - _Requirements: 20.1, 20.4, 20.5_

- [x] 8. Session and section management (Admin)
  - [x] 8.1 Create `src/services/sessions.service.ts` — `createSession()`, `listSessions()`, `deleteSession()`
    - `createSession()` inserts into `sessions` then inserts two rows into `semesters` (7 and 8) in a transaction
    - Validates session name against `/^\d{4} (Spring|Fall)$/` before insert
    - Maps `23505` → "A session with this name already exists."
    - _Requirements: 1.1, 1.2, 1.4_
  - [ ]* 8.2 Write property tests for session name format validation (Property 1)
    - **Property 1: Session name format validation**
    - **Validates: Requirements 1.1**
  - [ ]* 8.3 Write property tests for session creation auto-creates two semesters (Property 2)
    - **Property 2: Session creation auto-creates two semesters**
    - **Validates: Requirements 1.2**
  - [ ]* 8.4 Write property tests for session name uniqueness enforcement (Property 3)
    - **Property 3: Session name uniqueness enforcement**
    - **Validates: Requirements 1.4**
  - [x] 8.5 Create `src/services/sections.service.ts` — `createSection()`, `listSections()`, `deleteSection()`
    - Maps `23505` → "A section with this name already exists in this session."
    - _Requirements: 2.1, 2.2_
  - [ ]* 8.6 Write property tests for section name uniqueness within session (Property 5)
    - **Property 5: Section name uniqueness within session**
    - **Validates: Requirements 2.1, 2.2**
  - [x] 8.7 Create `src/pages/admin/SessionsPage.tsx` and `src/components/admin/SessionForm.tsx`
    - List with `compareSessionNames` sort, year/term filter; create form with name validation
    - _Requirements: 1.1–1.5_
  - [x] 8.8 Create `src/pages/admin/SectionsPage.tsx` and `src/components/admin/SectionForm.tsx`
    - Filter by session; list with `compareSectionNames` sort; create form
    - _Requirements: 2.1–2.3_

- [x] 9. Student and supervisor management (Admin)
  - [x] 9.1 Create `src/services/students.service.ts` — `createStudent()`, `listStudents()`, `updateStudent()`, `deleteStudent()`, `resetStudentPassword()`
    - `createStudent()` calls `supabase.auth.admin.createUser()` then inserts into `students`
    - Maps `23505` on `reg_number` → "A student with this registration number already exists."
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
  - [ ]* 9.2 Write property tests for student registration number uniqueness (Property 6)
    - **Property 6: Student registration number uniqueness**
    - **Validates: Requirements 3.2**
  - [x] 9.3 Create `src/services/supervisors.service.ts` — `createSupervisor()`, `listSupervisors()`, `updateSupervisor()`, `deleteSupervisor()`
    - `createSupervisor()` calls `supabase.auth.admin.createUser()` then inserts into `supervisors`
    - Maps `23505` on `email` → "A supervisor with this email already exists."
    - _Requirements: 4.1, 4.2, 4.5, 4.6_
  - [ ]* 9.4 Write property tests for supervisor email uniqueness (Property 7)
    - **Property 7: Supervisor email uniqueness**
    - **Validates: Requirements 4.2**
  - [x] 9.5 Create `src/components/shared/CSVUploader.tsx` and wire `parseCSV()` for student and supervisor bulk import
    - Shows summary table of failed rows with row number and reason before committing successes
    - _Requirements: 3.3, 3.4, 4.3, 4.4_
  - [x] 9.6 Create `src/pages/admin/StudentsPage.tsx` and `src/components/admin/StudentForm.tsx`
    - Session → Section dropdown cascade; list with `compareRegNumbers` sort; filter by session, section, name/reg; edit and delete; password reset button
    - _Requirements: 3.1, 3.5, 3.7, 14.8_
  - [x] 9.7 Create `src/pages/admin/SupervisorsPage.tsx` and `src/components/admin/SupervisorForm.tsx`
    - List with sort by name/designation; filter by designation/expertise; edit and delete
    - _Requirements: 4.1, 4.5, 4.7_

- [x] 10. Supervisor assignment management (Admin)
  - [x] 10.1 Create `src/services/assignments.service.ts` — `createAssignment()`, `randomAllocate()`, `bulkAssignCSV()`, `listAssignments()`, `updateAssignment()`
    - `randomAllocate()` distributes all unassigned students across supervisors randomly within a session
    - `bulkAssignCSV()` resolves IDs by `reg_number`, `supervisor_email`, `section_name` within the selected session; reports unresolved rows as failures
    - Maps `23505` → "This student is already assigned to a supervisor in this session."
    - _Requirements: 5.1–5.6_
  - [ ]* 10.2 Write property tests for random allocation covers all students (Property 9)
    - **Property 9: Random allocation covers all students**
    - **Validates: Requirements 5.2**
  - [ ]* 10.3 Write property tests for assignment uniqueness per session (Property 10)
    - **Property 10: Assignment uniqueness per session**
    - **Validates: Requirements 5.5**
  - [x] 10.4 Create `src/pages/admin/AssignmentsPage.tsx` and `src/components/admin/AssignmentForm.tsx`
    - Session dropdown → student/supervisor selectors; random allocate button; CSV upload; list with filter by session/section/supervisor; edit
    - _Requirements: 5.1–5.6_

- [x] 11. Checkpoint — Ensure all admin management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Submission deadline management (Admin)
  - [x] 12.1 Create `src/services/submissions.service.ts` (deadline portion) — `listDeadlines()`, `updateDeadline()`
    - `updateDeadline()` sets `is_locked` and `deadline` for a given `semester_id` + `submission_type`
    - All deadlines default to `is_locked = true` (enforced by schema default)
    - _Requirements: 6.1, 6.2, 6.4_
  - [ ]* 12.2 Write property tests for submission deadlines start locked (Property 11)
    - **Property 11: Submission deadlines start locked**
    - **Validates: Requirements 6.1**
  - [ ]* 12.3 Write property tests for unlock/lock submission state transition (Property 12)
    - **Property 12: Unlock/lock submission state transition**
    - **Validates: Requirements 6.2, 6.4**
  - [x] 12.4 Create `src/pages/admin/DeadlinesPage.tsx` and `src/components/admin/DeadlineManager.tsx`
    - Session → semester selector; table of submission types with lock/unlock toggle and deadline date-time picker
    - _Requirements: 6.1–6.4_

- [x] 13. Document submission (Student)
  - [x] 13.1 Extend `src/services/submissions.service.ts` with `submitDocumentURL()` and `listSubmissions()`
    - `submitDocumentURL()` implements the submission gate in order: locked check → deadline check → sequence check → status check → URL format check
    - On success: upserts `submissions` with `status = 'Pending'` and inserts into `submission_versions`
    - _Requirements: 6.3, 6.5, 6.6, 7.1–7.5_
  - [ ]* 13.2 Write property tests for locked submission blocks URL submission (Property 13)
    - **Property 13: Locked submission blocks URL submission and evaluation**
    - **Validates: Requirements 6.3, 8.6**
  - [ ]* 13.3 Write property tests for submission sequence enforcement (Property 14)
    - **Property 14: Submission sequence enforcement**
    - **Validates: Requirements 6.5, 6.6**
  - [ ]* 13.4 Write property tests for URL submission sets status to Pending and creates version record (Property 15)
    - **Property 15: URL submission sets status to Pending and creates version record**
    - **Validates: Requirements 7.3**
  - [ ]* 13.5 Write property tests for Revision status allows re-submission (Property 16)
    - **Property 16: Revision status allows re-submission of new URL**
    - **Validates: Requirements 7.4**
  - [ ]* 13.6 Write property tests for past deadline blocks URL submission (Property 17)
    - **Property 17: Past deadline blocks URL submission for non-Approved submissions**
    - **Validates: Requirements 7.5**
  - [ ]* 13.7 Write property tests for version history completeness and ordering (Property 18)
    - **Property 18: Version history completeness and ordering**
    - **Validates: Requirements 7.6**
  - [x] 13.8 Create `src/pages/student/SubmissionsPage.tsx` and `src/components/student/SubmissionURLForm.tsx`
    - Shows each submission type with status badge, deadline, and URL input (enabled only when unlocked and in sequence)
    - Version history list (descending by `submitted_at`)
    - _Requirements: 7.1–7.6_

- [x] 14. Submission evaluation (Supervisor)
  - [x] 14.1 Extend `src/services/submissions.service.ts` with `evaluateSubmission()`
    - Sets `status` (Approved/Rejected/Revision) and `marks` (max for Approved, 0 for Rejected, unchanged for Revision)
    - Rejects if deadline is locked
    - Creates a notification for the student
    - _Requirements: 8.1–8.6_
  - [ ]* 14.2 Write property tests for evaluation marks assignment (Property 19)
    - **Property 19: Evaluation marks assignment**
    - **Validates: Requirements 8.3, 8.4**
  - [ ]* 14.3 Write property tests for version preserved on Revision (Property 20)
    - **Property 20: Version preserved on Revision**
    - **Validates: Requirements 8.5**
  - [x] 14.4 Create `src/pages/supervisor/SubmissionsPage.tsx` and `src/components/supervisor/SubmissionEvaluator.tsx`
    - Lists assigned students' submissions; filter by status/type/student; sort by deadline/updated
    - Clickable Document_URL (opens in new tab); status selector with marks preview; submit evaluation
    - _Requirements: 8.1–8.6, 20.2_

- [x] 15. Meeting management (Supervisor)
  - [x] 15.1 Create `src/services/meetings.service.ts` — `createMeeting()`, `updateMeeting()`, `listMeetings()`
    - `createMeeting()` enforces the 10-meeting cap per student per semester before insert
    - `updateMeeting()` awards 2 marks per participant on Approved, 0 on Rejected; updates `meeting_participants.marks`
    - _Requirements: 9.1–9.8_
  - [ ]* 15.2 Write property tests for meeting marks assignment (Property 21)
    - **Property 21: Meeting marks assignment**
    - **Validates: Requirements 9.3, 9.4**
  - [ ]* 15.3 Write property tests for meeting cap invariant (Property 22)
    - **Property 22: Meeting cap invariant**
    - **Validates: Requirements 9.6, 9.7**
  - [x] 15.4 Create `src/pages/supervisor/MeetingsPage.tsx` and `src/components/supervisor/MeetingManager.tsx`
    - Create meeting form: scope selector (Individual/Group/All), student multi-select, date-time picker
    - List with sort by date/status, filter by status/scope/student; reschedule date-time picker
    - _Requirements: 9.1–9.8, 20.1_

- [x] 16. Marks computation, grading, and reports
  - [x] 16.1 Create `src/services/grades.service.ts` — `getStudentGrades()`, `getSectionReport()`
    - `getStudentGrades()` fetches submission marks + meeting marks, calls `computeTotal()` and `computeGrade()`
    - _Requirements: 10.1–10.5_
  - [ ]* 16.2 Write property tests for total marks computation (Property 23)
    - **Property 23: Total marks computation**
    - **Validates: Requirements 10.1, 10.2**
  - [x] 16.3 Create `src/services/export.service.ts` — `exportSectionCSV()`
    - Generates CSV with columns: `Registration_Number`, `Name`, `Section`, submission marks columns, `Meeting_Marks`, `Total_Marks`, `Grade`
    - Rows sorted by `compareRegNumbers()`
    - _Requirements: 17.1, 17.2_
  - [ ]* 16.4 Write property tests for CSV export contains required columns (Property 31)
    - **Property 31: CSV export contains required columns**
    - **Validates: Requirements 17.2**
  - [x] 16.5 Create `src/pages/admin/ReportsPage.tsx` and `src/components/admin/MarksReport.tsx`
    - Session → semester → section selectors; marks table; export CSV button
    - _Requirements: 17.1, 17.2_

- [x] 17. Checkpoint — Ensure all submission, meeting, and grading tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Comments and real-time messaging
  - [x] 18.1 Create `src/services/comments.service.ts` — `addComment()`, `listComments()`
    - `addComment()` inserts comment and creates a notification for the other party
    - `listComments()` returns comments ordered ascending by `created_at`
    - _Requirements: 11.1–11.5_
  - [ ]* 18.2 Write property tests for comment record completeness (Property 25)
    - **Property 25: Comment record completeness**
    - **Validates: Requirements 11.3**
  - [ ]* 18.3 Write property tests for comment chronological ordering (Property 26)
    - **Property 26: Comment chronological ordering**
    - **Validates: Requirements 11.4**
  - [x] 18.4 Create `src/components/shared/CommentThread.tsx`
    - Displays comments ascending by `created_at`; add-comment form at bottom; subscribes to new comments via Realtime
    - _Requirements: 11.1–11.5_
  - [x] 18.5 Create `src/services/messages.service.ts` — `sendMessage()`, `listMessages()`
    - `sendMessage()` inserts message and creates a notification for the recipient
    - `listMessages()` returns messages for a conversation ordered ascending by `created_at`
    - _Requirements: 12.1–12.6_
  - [ ]* 18.6 Write property tests for message chronological ordering (Property 27)
    - **Property 27: Message chronological ordering**
    - **Validates: Requirements 12.3**
  - [x] 18.7 Create `src/components/supervisor/ChatWindow.tsx` and `src/components/student/ChatWindow.tsx`
    - Conversation list (supervisor: all assigned students; student: assigned supervisor only)
    - Message thread ordered ascending by `created_at`; real-time via `useRealtimeChannel`
    - _Requirements: 12.1–12.6_
  - [x] 18.8 Create `src/pages/supervisor/ChatPage.tsx` and `src/pages/student/ChatPage.tsx`
    - Wire `ChatWindow` into the supervisor and student route groups
    - _Requirements: 12.1, 12.5, 12.6_

- [x] 19. Notifications
  - [x] 19.1 Create `src/services/notifications.service.ts` — `listNotifications()`, `markAsRead()`, `markAllAsRead()`
    - _Requirements: 13.1–13.5_
  - [x] 19.2 Create `src/components/shared/NotificationList.tsx`
    - Dropdown panel from `NotificationBell`; lists unread first; click marks as read; real-time via `useRealtimeChannel`
    - _Requirements: 13.3, 13.4, 13.5_

- [x] 20. Supervisor and student dashboards
  - [x] 20.1 Create `src/pages/supervisor/DashboardPage.tsx` and `src/components/supervisor/SupervisorDashboard.tsx`
    - Summary table: student name, reg number, submission statuses, approved meetings count, total marks, grade
    - Highlights rows with pending submissions; real-time updates via `useRealtimeChannel`
    - _Requirements: 16.1–16.3_
  - [x] 20.2 Create `src/pages/student/DashboardPage.tsx`
    - Shows own submission statuses, meeting count, total marks, grade; links to submission and chat pages
    - _Requirements: 7.1, 10.3_
  - [x] 20.3 Create `src/pages/admin/` index dashboard
    - Summary cards: total sessions, students, supervisors, assignments; quick links to management pages
    - _Requirements: 15.3_

- [x] 21. Seed import UI
  - [x] 21.1 Create `src/services/seed.service.ts` — `importSupervisorsCSV()`, `importStudentsCSV()`
    - Processes `teachers.csv` then per-section student CSVs; session and section selected in UI
    - Reuses `parseCSV()` and the respective create service functions
    - _Requirements: 19.5, 19.6_
  - [x] 21.2 Create `src/components/admin/SeedImport.tsx` and wire into admin pages
    - Step 1: upload `teachers.csv`; Step 2: select session + section, upload student CSV; shows failure summary
    - _Requirements: 19.5, 19.6_

- [x] 22. Checkpoint — Ensure all tests pass and integration is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Final wiring and integration
  - [x] 23.1 Wire all pages into `src/router.tsx` under correct `<ProtectedRoute>` guards
    - Admin: Sessions, Sections, Students, Supervisors, Assignments, Deadlines, Reports, SeedImport
    - Supervisor: Dashboard, Submissions, Meetings, Chat
    - Student: Dashboard, Submissions, Chat
    - _Requirements: 14.3, 14.4, 15.1–15.5_
  - [x] 23.2 Wire `AppShell` with `NotificationBell`, role-appropriate sidebar links, and logout
    - _Requirements: 13.3, 18.1, 18.2_
  - [x] 23.3 Ensure `src/App.tsx` renders `<RouterProvider>` with the configured router
    - _Requirements: 18.4_
  - [x] 23.4 Add `src/index.css` Tailwind directives and Google Fonts import; verify mobile-first responsive layout at 320px, 768px, 1280px, 2560px
    - _Requirements: 18.1, 18.2, 18.3_

- [x] 24. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Properties P1–P34 from the design document each map to exactly one property-based test sub-task
- Property tests use `fc.assert(fc.property(...), { numRuns: 100 })` via fast-check
- Tag format in test comments: `// Feature: dai-pms, Property {N}: {property_text}`
- Supabase service functions map PostgreSQL error codes: `23505` (unique), `23503` (FK), `42501` (RLS)
- Session and Section are always selected via UI dropdowns — never inferred from CSV content
