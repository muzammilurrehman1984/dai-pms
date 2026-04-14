# Requirements Document

## Introduction

**DAI-PMS** (Department of Artificial Intelligence – Project Management System) is a full-stack Single Page Application (SPA) for the Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur, Pakistan. It manages the Final Year Project (FYP) lifecycle for BS students across two semesters: FYP-I (7th semester, 3 credit hours) and FYP-II (8th semester, 3 credit hours), totalling 6 credit hours.

The system supports three roles — Department_Admin, Supervisor, and Student — and handles session/semester management, student and supervisor records, supervisor assignments, document submissions, meeting tracking, grade computation, real-time messaging/chat, submission comments, and notifications.

The application is built as a React SPA with Vite, deployed on Vercel, using Supabase for the database, authentication, real-time features, and Row Level Security (RLS) policies.

---

## Credits

- Powered by: Prof. Dr. Najia Saher (Chairperson), Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur
- Developed by: Mr. Muzammil Ur Rehman (Lecturer), Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur
- © Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur, Pakistan. All rights reserved.

---

## Glossary

- **System**: The DAI-PMS (Department of Artificial Intelligence – Project Management System) application.
- **Department_Admin**: The administrative user representing the Department of AI who manages all data and configuration. The initial admin account uses email `admin@dai-pms.vercel.app`.
- **Supervisor**: A faculty member assigned to supervise one or more Students.
- **Student**: A BS AI student enrolled in a Section who must complete FYP-I and FYP-II.
- **Session**: An academic period identified by a Year and a Term (Spring or Fall), e.g. "2026 Spring", "2026 Fall", "2027 Spring". Spring always precedes Fall within the same year. Sessions are sorted chronologically: older year first, Spring before Fall within the same year. A Session is distinct from a Semester_Number.
- **Session_Name**: The human-readable name of a Session in the format `[YYYY] [Spring|Fall]` — e.g. `2026 Spring`, `2026 Fall`, `2027 Spring`.
- **Semester_Number**: The academic semester number within a student's degree programme — either 7 (FYP-I) or 8 (FYP-II). This is distinct from the Session Term (Spring/Fall).
- **Section**: A named group of Students within a Session (unique name per Session), following the Section_Name_Pattern e.g. `BSARIN-7TH-1M`.
- **Registration_Number**: A unique identifier assigned to each Student.
- **Submission**: A document URL submitted by a Student for evaluation by a Supervisor (Project Approval, SRS, SDD, Final Documentation, Final Project Code). Students host their own files on external platforms (e.g. Google Drive, GitHub) and provide a publicly accessible URL.
- **Document_URL**: A publicly accessible URL provided by a Student pointing to their hosted submission document. The System stores the URL; file hosting is the student's responsibility.
- **Submission_Status**: The evaluation state of a Submission — Pending, Approved, Rejected, or Revision.
- **Meeting**: A scheduled interaction between a Supervisor and one or more Students, tracked for attendance and marks.
- **Meeting_Scope**: The scope of a Meeting — Individual (one Student), Group (a selected set of Students), or All (all Students assigned to the Supervisor in the Semester).
- **Meeting_Status**: The state of a Meeting — Approved, Rejected, or Re-scheduled.
- **Grade**: The letter grade computed from a Student's total marks using the defined grading scheme.
- **Notification**: An in-app alert delivered to a user when a relevant event occurs.
- **Message**: A real-time chat message exchanged between a Supervisor and a Student.
- **Comment**: A threaded remark attached to a specific Submission, visible to the submitting Student and their Supervisor.
- **CSV**: Comma-Separated Values file used for bulk data upload.
- **Supabase**: The backend-as-a-service platform used for the database, authentication, real-time subscriptions, and RLS policies.
- **Vercel**: The deployment platform used to host the application.
- **RLS**: Row Level Security — Supabase database policies that enforce access control at the data layer.
- **First_Login**: The first time a user authenticates after their account is created by the Department_Admin.
- **Reg_Number_Pattern**: IUB registration number format `[S|F][YY][Campus][Dept][Program][Shift][Prefix][Serial]` — e.g. `S23BARIN1M01037`. Segments: S/F = Spring/Fall; YY = admission year; Campus+Dept = e.g. BARIN (Bahawalpur, AI); Program = 1 (BS Morning), 2 (BS Evening), 7 (ADP); Shift = M/E; Prefix = 2-digit program prefix; Serial = 3-digit student serial.
- **Section_Name_Pattern**: IUB section name format `BSARIN-[N]TH-[Num][Shift]` — e.g. `BSARIN-7TH-1M`. Segments: BSARIN = fixed department prefix; NTH = semester number; Num = section number within semester; Shift = M (Morning) / E (Evening).
- **compareRegNumbers()**: Utility function in `src/utils/formatters.ts` that sorts students by Reg_Number_Pattern ascending: (1) year oldest-first, (2) Spring before Fall within same year, (3) program 1→2→7, (4) Morning before Evening, (5) serial number.
- **compareSectionNames()**: Utility function in `src/utils/formatters.ts` that sorts sections by Section_Name_Pattern ascending: (1) semester number, (2) section number, (3) Morning before Evening.
- **compareSessionNames()**: Utility function in `src/utils/formatters.ts` that sorts sessions by Session_Name chronologically ascending: (1) year (older first), (2) term within same year: Spring (0) before Fall (1).

---

## Requirements

### Requirement 1: Session Management

**User Story:** As a Department_Admin, I want to create and manage academic sessions, so that FYP activities are organised by academic period.

#### Acceptance Criteria

1. THE Department_Admin SHALL be able to create a Session with a unique Session_Name in the format `[YYYY] [Spring|Fall]` (e.g. "2026 Spring", "2026 Fall", "2027 Spring").
2. WHEN a Session is created, THE System SHALL automatically associate a 7th Semester (FYP-I) and an 8th Semester (FYP-II) with that Session.
3. THE Department_Admin SHALL be able to view a list of all Sessions with sort-by (Session_Name chronologically: older year first, Spring before Fall) and filter-by (year, term) controls.
4. WHEN a Session_Name already exists, THE System SHALL reject the creation request and return a descriptive error message.
5. THE System SHALL sort Sessions chronologically by default: ascending by year, then Spring before Fall within the same year.

---

### Requirement 2: Section Management

**User Story:** As a Department_Admin, I want to create and manage sections within a session, so that students can be organised into groups.

#### Acceptance Criteria

1. THE Department_Admin SHALL be able to create one or more Sections within a Session, each with a unique name within that Session.
2. WHEN a Section name is duplicated within the same Session, THE System SHALL reject the creation request and return a descriptive error message.
3. THE Department_Admin SHALL be able to view all Sections belonging to a given Session with sort-by (name) and filter-by (Session) controls.

---

### Requirement 3: Student Management

**User Story:** As a Department_Admin, I want to add and manage student records, so that each student's identity and section membership is tracked.

#### Acceptance Criteria

1. THE Department_Admin SHALL be able to add a Student record via a form by selecting a Session from a dropdown, then selecting a Section within that Session, and providing: Registration_Number, Name, Father Name, Mobile Number, Email.
2. WHEN a Registration_Number already exists in the System, THE System SHALL reject the record and return a descriptive error message.
3. THE Department_Admin SHALL be able to upload a CSV file to bulk-create Student records; BEFORE uploading, THE Department_Admin SHALL select the target Session and Section from dropdowns in the UI; CSV columns SHALL be: `reg_number`, `student_name`, `father_name`, `mobile_number`, `email`, `password` (session and section are taken from the UI selection, not the CSV); WHEN a non-mandatory field such as `father_name` or `mobile_number` is unavailable, the CSV SHALL use `N/A` as a placeholder value and THE System SHALL store it as-is without validation errors.
4. WHEN a CSV file is uploaded, THE System SHALL validate each row and report all rows that fail validation without aborting valid rows.
5. THE Department_Admin SHALL be able to view, edit, and remove Student records.
6. WHEN a Student record is created, THE System SHALL create a corresponding Supabase Auth account for the Student using the provided Email.
7. THE System SHALL provide sort-by and filter-by controls on the Student listing, supporting filtering by Session, Section, and search by name or Registration_Number, and sorting by name, Registration_Number, or Section.

---

### Requirement 4: Supervisor Management

**User Story:** As a Department_Admin, I want to add and manage supervisor records, so that faculty members can be assigned to student groups.

#### Acceptance Criteria

1. THE Department_Admin SHALL be able to add a Supervisor record containing: Name, Designation, Expertise, Email, and Mobile Number.
2. WHEN a Supervisor Email already exists in the System, THE System SHALL reject the record and return a descriptive error message.
3. THE Department_Admin SHALL be able to upload a CSV file to bulk-create Supervisor records; CSV columns SHALL be: `teacher_name`, `designation`, `expertise`, `mobile_number`, `email`, `password`; WHEN a non-mandatory field such as `mobile_number` or `expertise` is unavailable, the CSV SHALL use `N/A` as a placeholder value and THE System SHALL store it as-is without validation errors.
4. WHEN a CSV file is uploaded, THE System SHALL validate each row and report all rows that fail validation without aborting valid rows.
5. THE Department_Admin SHALL be able to view, edit, and remove Supervisor records.
6. WHEN a Supervisor record is created, THE System SHALL create a corresponding Supabase Auth account for the Supervisor using the provided Email.
7. THE System SHALL provide sort-by and filter-by controls on the Supervisor listing, supporting filtering by Designation or Expertise, and sorting by name or Designation.

---

### Requirement 5: Supervisor Assignment

**User Story:** As a Department_Admin, I want to assign students to supervisors, so that each student has a designated supervisor for their FYP.

#### Acceptance Criteria

1. THE Department_Admin SHALL be able to assign one or more Students to a Supervisor within a Session manually via a form, by first selecting a Session from a dropdown, then selecting Students and a Supervisor.
2. WHEN the Department_Admin triggers a random allocation, THE System SHALL distribute Students across available Supervisors randomly within the selected Session.
3. THE Department_Admin SHALL be able to bulk-assign Students to Supervisors by uploading a CSV file; BEFORE uploading, THE Department_Admin SHALL select the target Session from a dropdown in the UI; CSV columns SHALL be: `reg_number`, `supervisor_email`, `section_name`; THE System SHALL resolve Student and Supervisor IDs by looking up `reg_number` and `supervisor_email`, and Section ID by looking up `section_name`, all within the selected Session.
4. WHEN a CSV row references a `reg_number`, `supervisor_email`, or `section_name` that does not exist within the selected Session, THE System SHALL report that row as failed without aborting valid rows.
5. WHEN a Student is already assigned to a Supervisor in the same Session, THE System SHALL prevent duplicate assignment and return a descriptive error message.
6. THE Department_Admin SHALL be able to view and modify existing Supervisor assignments.

---

### Requirement 6: Submission Deadline Management

**User Story:** As a Department_Admin, I want to control submission deadlines and lock/unlock submissions, so that students can only submit documents during the designated window.

#### Acceptance Criteria

1. THE System SHALL keep all Submissions locked by default until the Department_Admin explicitly enables a Submission and sets a deadline.
2. WHEN the Department_Admin enables a Submission and sets a deadline, THE System SHALL unlock that Submission for the relevant Students and Supervisors.
3. WHILE a Submission is locked, THE System SHALL prevent Students from submitting Document_URLs and Supervisors from evaluating submissions for that Submission type.
4. WHEN a Submission deadline has passed, THE Department_Admin SHALL be able to lock that Submission and enable the next Submission in sequence.
5. THE System SHALL enforce sequential ordering of Submissions: Project Approval → SRS → SDD for FYP-I, and Final Documentation → Final Project Code for FYP-II.
6. WHEN a Student attempts to submit a Document_URL for a Submission that is not the next in sequence, THE System SHALL reject the submission and return a descriptive error message.

---

### Requirement 7: Document Submission (Student)

**User Story:** As a Student, I want to submit a document URL for each submission type, so that my supervisor can review and evaluate my FYP progress.

#### Acceptance Criteria

1. WHEN a Submission is unlocked and the deadline has not passed, THE Student SHALL be able to submit a Document_URL for that Submission type.
2. THE Student SHALL host their document on an external platform of their choice (e.g. Google Drive, GitHub, OneDrive) and provide a publicly accessible URL; THE System SHALL store the URL without uploading or storing the file itself.
3. WHEN a Student submits a Document_URL, THE System SHALL record the submission timestamp and set the Submission_Status to "Pending".
4. WHEN a Submission_Status is "Revision", THE Student SHALL be able to submit a new Document_URL for that Submission.
5. WHEN a Submission deadline has passed and the Submission_Status is not "Approved", THE System SHALL prevent further URL submissions for that Submission.
6. THE System SHALL maintain a full version history of all submitted Document_URLs and revisions for each Submission, displayed in descending order by submission timestamp (most recent first).

---

### Requirement 8: Submission Evaluation (Supervisor)

**User Story:** As a Supervisor, I want to evaluate student submissions, so that I can provide feedback and assign marks.

#### Acceptance Criteria

1. WHEN a Student submits a Document_URL, THE Supervisor SHALL be able to view and open the Document_URL to review the document.
2. THE Supervisor SHALL be able to set the Submission_Status to one of: Approved, Rejected, or Revision.
3. WHEN the Supervisor sets Submission_Status to "Approved", THE System SHALL record the full marks allocated to that Submission for the Student.
4. WHEN the Supervisor sets Submission_Status to "Rejected", THE System SHALL record zero marks for that Submission for the Student.
5. WHEN the Supervisor sets Submission_Status to "Revision", THE System SHALL notify the Student that a revised document URL is required and preserve the previous submission URL in the version history.
6. WHILE a Submission is locked, THE Supervisor SHALL NOT be able to evaluate documents for that Submission.

---

### Requirement 9: Meeting Management

**User Story:** As a Supervisor, I want to schedule and manage meetings with students at individual, group, or full-cohort level, so that progress can be tracked and meeting marks can be awarded.

#### Acceptance Criteria

1. THE Supervisor SHALL be able to create a Meeting with a date, time, and a Meeting_Scope of: Individual (one Student), Group (a selected subset of assigned Students), or All (all Students assigned to the Supervisor in the Semester).
2. THE Supervisor SHALL be able to set the Meeting_Status to one of: Approved, Rejected, or Re-scheduled.
3. WHEN the Supervisor sets Meeting_Status to "Approved", THE System SHALL award 2 marks to each Student included in that Meeting.
4. WHEN the Supervisor sets Meeting_Status to "Rejected", THE System SHALL record zero marks for that Meeting for the included Students.
5. WHEN the Supervisor sets Meeting_Status to "Re-scheduled", THE Supervisor SHALL be able to update the Meeting date and time.
6. THE System SHALL allow a maximum of 10 Approved Meetings per Student per Semester, contributing a maximum of 20 marks.
7. WHEN a Student has reached 10 Approved Meetings in a Semester, THE System SHALL prevent the Supervisor from adding further Meetings that include that Student in that Semester.
8. THE System SHALL provide sort-by (date, status) and filter-by (Meeting_Status, Meeting_Scope, Student) controls on the Meeting listing.

---

### Requirement 10: Marks Computation and Grading

**User Story:** As a Department_Admin and Supervisor, I want the system to automatically compute total marks and grades, so that academic results are accurate and up to date.

#### Acceptance Criteria

1. THE System SHALL compute a Student's FYP-I total as the sum of: Project Approval marks (max 20) + SRS marks (max 30) + SDD marks (max 30) + Meeting marks (max 20), with a maximum total of 100.
2. THE System SHALL compute a Student's FYP-II total as the sum of: Final Documentation marks (max 40) + Final Project Code marks (max 40) + Meeting marks (max 20), with a maximum total of 100.
3. WHEN a Student's marks are updated, THE System SHALL recompute and update the Student's Grade immediately.
4. THE System SHALL assign Grades according to the following scheme:
   - 0 to < 50 → F
   - 50 to < 60 → D
   - 60 to < 70 → C
   - 70 to < 78 → B
   - 78 to < 85 → B+
   - 85 to < 95 → A
   - 95 to 100 → A+
5. WHEN a Student's total marks are below 50, THE System SHALL mark the Student as having failed the Semester.

---

### Requirement 11: Submission Comments

**User Story:** As a Supervisor and Student, I want to add comments on a submission, so that we can collaborate and communicate feedback directly on the document.

#### Acceptance Criteria

1. THE Supervisor SHALL be able to add a Comment to any Submission belonging to an assigned Student.
2. THE Student SHALL be able to add a Comment to their own Submission.
3. WHEN a Comment is added, THE System SHALL record the author, timestamp, and comment text.
4. THE System SHALL display Comments in chronological order on the Submission detail view.
5. WHEN a new Comment is added to a Submission, THE System SHALL deliver a Notification to the other party (Supervisor or Student).

---

### Requirement 12: Real-Time Messaging

**User Story:** As a Supervisor and Student, I want to send and receive real-time messages, so that we can communicate outside of formal submission comments.

#### Acceptance Criteria

1. THE System SHALL provide a direct messaging interface between a Supervisor and each assigned Student.
2. WHEN a user sends a Message, THE System SHALL deliver the Message to the recipient in real time using Supabase real-time subscriptions.
3. THE System SHALL display Messages in chronological order within the conversation thread.
4. WHEN a new Message is received, THE System SHALL deliver a Notification to the recipient.
5. THE Student SHALL only be able to message their assigned Supervisor.
6. THE Supervisor SHALL only be able to message Students assigned to them.

---

### Requirement 13: Notifications

**User Story:** As a user, I want to receive in-app notifications for relevant events, so that I stay informed without checking every section manually.

#### Acceptance Criteria

1. THE System SHALL deliver an in-app Notification to a Student when: a Submission is evaluated (Approved, Rejected, or Revision), a Meeting is scheduled or its status changes, or a new Comment or Message is received.
2. THE System SHALL deliver an in-app Notification to a Supervisor when: a Student submits or re-submits a Document_URL for a Submission, or a new Comment or Message is received.
3. THE System SHALL display unread Notification count in the navigation interface.
4. WHEN a user views a Notification, THE System SHALL mark it as read.
5. THE System SHALL deliver Notifications in real time using Supabase real-time subscriptions.

---

### Requirement 14: Authentication and Password Management

**User Story:** As a user, I want to log in securely and be required to change my password on first login, so that my account is protected from the default credentials.

#### Acceptance Criteria

1. THE System SHALL authenticate all users via email and password using Supabase Auth.
2. WHEN a user provides invalid credentials, THE System SHALL return a descriptive error message and deny access.
3. WHEN a user authenticates for the First_Login, THE System SHALL redirect the user to a mandatory password change screen before granting access to their dashboard.
4. WHILE a user has not completed the First_Login password change, THE System SHALL block access to all dashboard routes and redirect to the password change screen.
5. WHEN a user completes the First_Login password change, THE System SHALL mark the account as password-changed and grant access to the appropriate dashboard.
6. WHEN a session token expires, THE System SHALL require the user to re-authenticate.
7. THE Department_Admin initial account SHALL use email `admin@dai-pms.vercel.app` and password `Admin@1234`, and SHALL be required to change the password on first login.
8. THE Department_Admin SHALL be able to reset the password of any Student account in the System.
9. THE Supervisor SHALL be able to reset the password of any Student account assigned to them within their Sessions and Sections.
10. WHEN a password is reset by an admin or supervisor, THE System SHALL set a new temporary password and flag the Student account for a mandatory password change on next login.
11. THE System SHALL NOT provide a self-service forgot-password email flow for Students; password recovery is handled exclusively by Department_Admin or the assigned Supervisor.

---

### Requirement 15: Role-Based Access Control and RLS Policies

**User Story:** As a system operator, I want role-based access control enforced at both the application and database layers, so that users can only access data appropriate to their role.

#### Acceptance Criteria

1. THE System SHALL support three roles: Department_Admin, Supervisor, and Student.
2. WHEN a user attempts to access a resource outside their role's permissions, THE System SHALL deny the request and return an appropriate error response.
3. THE Department_Admin SHALL have full access to session, section, student, supervisor, assignment, and deadline management.
4. THE Supervisor SHALL have read and write access only to Submissions, Meetings, Comments, and Messages belonging to their assigned Students.
5. THE Student SHALL have read and write access only to their own Submissions, Comments, and Messages.
6. THE System SHALL implement Supabase RLS policies on all tables to enforce the above access rules at the database layer.

---

### Requirement 16: Supervisor Dashboard

**User Story:** As a Supervisor, I want a dashboard showing overall progress across all my assigned students, so that I can monitor FYP status at a glance.

#### Acceptance Criteria

1. THE Supervisor dashboard SHALL display a summary of all assigned Students, including: current Submission_Status for each active Submission, number of Approved Meetings, and current total marks and Grade.
2. THE Supervisor dashboard SHALL highlight Students with pending Submissions awaiting evaluation.
3. WHEN a Student's Submission_Status or marks change, THE System SHALL update the Supervisor dashboard summary in real time.

---

### Requirement 17: Data Export and Reporting

**User Story:** As a Department_Admin, I want to view and export student marks and grades, so that I can generate semester reports.

#### Acceptance Criteria

1. THE Department_Admin SHALL be able to view a marks summary for all Students in a Section for a given Semester.
2. THE Department_Admin SHALL be able to export the marks summary as a CSV file containing: Registration_Number, Name, Section, Submission marks, Meeting marks, Total marks, and Grade.

---

### Requirement 18: Responsive and Accessible UI

**User Story:** As a user, I want to access the system on any device with a professional and visually appealing interface, so that the experience is consistent and pleasant on desktop, tablet, and mobile.

#### Acceptance Criteria

1. THE System SHALL render a fully functional interface on screen widths from 320px to 2560px using a mobile-first responsive layout.
2. THE System SHALL adapt layout and navigation for mobile, tablet, and desktop viewports without loss of functionality.
3. THE System SHALL use a vibrant, professional academic colour scheme with free web fonts (e.g., Google Fonts) and free icon sets (e.g., Lucide or Heroicons).
4. THE System SHALL use React with Vite as the SPA framework and build tool.

---

### Requirement 19: Deployment and Infrastructure

**User Story:** As a Department_Admin, I want the system deployed on reliable free-tier infrastructure, so that it is accessible without incurring hosting costs.

#### Acceptance Criteria

1. THE System SHALL use Supabase as the database, authentication, and real-time provider. Supabase Storage is NOT required as document files are hosted externally by students.
2. THE System SHALL be deployed on Vercel.
3. WHEN the application is deployed, THE System SHALL be accessible via a public URL.
4. THE System SHALL include a `seed.sql` file for initialising the Supabase database schema, RLS policies, and the initial Department_Admin account.
5. THE repository SHALL include a `seed/` folder containing CSV files for bulk-loading initial data:
   - `seed/teachers.csv` — Supervisor records with columns: `teacher_name`, `designation`, `expertise`, `mobile_number`, `email`, `password`
   - `seed/BSARIN-[N]TH-[Num][Shift].csv` — Student records per section with columns: `reg_number`, `student_name`, `father_name`, `mobile_number`, `email`, `password`
6. THE System SHALL provide a seed import UI or script that processes the `seed/` CSV files in order: Supervisors first, then Students per section; the target Session and Section SHALL be selected by the Department_Admin in the UI before each CSV upload, not inferred from the CSV content.

---

### Requirement 20: Sort and Filter on All Listings

**User Story:** As any user, I want to sort and filter all data listings in the system, so that I can quickly find the records I need.

#### Acceptance Criteria

1. THE System SHALL provide sort-by and filter-by controls on every listing page, including: Sessions, Sections, Students, Supervisors, Supervisor Assignments, Submissions, Meetings, and Notifications.
2. THE Submission listing SHALL support filter-by Submission_Status (Pending, Approved, Rejected, Revision), Submission type, and Student; and sort-by submission deadline or last updated timestamp.
3. THE Supervisor Assignment listing SHALL support filter-by Session, Section, and Supervisor; and sort-by Student name or Supervisor name.
4. WHEN a filter or sort is applied, THE System SHALL update the listing immediately without a full page reload.
5. THE System SHALL preserve the last applied sort and filter state within the same browser session.

---

### Requirement 21: Student, Section, and Session Sorting Logic

**User Story:** As any user, I want student, section, and session lists sorted in a meaningful academic order, so that records are easy to navigate without manual searching.

#### Acceptance Criteria

1. THE System SHALL sort all Student listings using `compareRegNumbers()` defined in `src/utils/formatters.ts`, applying the following ascending priority against the IUB Reg_Number_Pattern:
   - Year of admission (older batches first)
   - Semester within the same year: Spring (S) before Fall (F)
   - Program: 1 (BS Morning) → 2 (BS Evening) → 7 (ADP)
   - Shift: Morning (M) before Evening (E)
   - Serial number (ascending)
2. THE System SHALL sort all Section listings using `compareSectionNames()` defined in `src/utils/formatters.ts`, applying the following ascending priority against the IUB Section_Name_Pattern:
   - Semester number (7TH < 8TH < 9TH …)
   - Section number within the semester (1 < 2 < 3 …)
   - Shift: Morning (M) before Evening (E)
3. THE System SHALL sort all Session listings using `compareSessionNames()` defined in `src/utils/formatters.ts`, applying the following ascending priority against the Session_Name format `[YYYY] [Spring|Fall]`:
   - Year (older first)
   - Term within the same year: Spring before Fall
4. THE `compareRegNumbers()`, `compareSectionNames()`, and `compareSessionNames()` functions SHALL be the single source of truth for all student, section, and session ordering throughout the application, including listings, dropdowns, CSV exports, and dashboard summaries.
5. WHEN a Reg_Number does not match the expected Reg_Number_Pattern, THE System SHALL fall back to standard lexicographic ordering for that record and SHALL NOT throw an error.
6. WHEN a Section_Name does not match the expected Section_Name_Pattern, THE System SHALL fall back to standard lexicographic ordering for that record and SHALL NOT throw an error.
7. WHEN a Session_Name does not match the expected `[YYYY] [Spring|Fall]` format, THE System SHALL fall back to standard lexicographic ordering for that record and SHALL NOT throw an error.
