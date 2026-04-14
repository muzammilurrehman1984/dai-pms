import { supabase } from './supabase';
import { getSectionReport } from './grades.service';

export async function exportSectionCSV(
  sectionId: string,
  semesterId: string,
  sectionName: string
): Promise<void> {
  // Fetch semester number
  const { data: semesterData, error: semesterError } = await supabase
    .from('semesters')
    .select('semester_number')
    .eq('id', semesterId)
    .single();

  if (semesterError) throw new Error(semesterError.message);

  const semesterNumber = (semesterData as { semester_number: 7 | 8 }).semester_number;

  // Fetch section report (already sorted by reg_number)
  const rows = await getSectionReport(sectionId, semesterId);

  // Build CSV header based on semester
  const isFYP1 = semesterNumber === 7;
  const headers = [
    'Registration_Number',
    'Name',
    'Section',
    ...(isFYP1
      ? ['Project_Approval_Marks', 'SRS_Marks', 'SDD_Marks']
      : ['Final_Documentation_Marks', 'Final_Project_Code_Marks']),
    'Meeting_Marks',
    'Total_Marks',
    'Grade',
  ];

  const csvLines: string[] = [headers.join(',')];

  for (const row of rows) {
    const { student, components, total, grade } = row;

    const specificCols = isFYP1
      ? [
          components.projectApproval ?? 0,
          components.srs ?? 0,
          components.sdd ?? 0,
        ]
      : [
          components.finalDocumentation ?? 0,
          components.finalProjectCode ?? 0,
        ];

    const values = [
      student.reg_number,
      `"${student.student_name}"`,
      sectionName,
      ...specificCols,
      components.meetingMarks,
      total,
      grade,
    ];

    csvLines.push(values.join(','));
  }

  const csvContent = csvLines.join('\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sectionName}_grades.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
