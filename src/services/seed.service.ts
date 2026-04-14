import { parseCSV, validateRow } from '../utils/csv';
import { createSupervisor } from './supervisors.service';
import { createStudent } from './students.service';
import type { RowError } from '../types';

const SUPERVISOR_COLUMNS = ['teacher_name', 'designation', 'expertise', 'mobile_number', 'email', 'password'];
const STUDENT_COLUMNS = ['reg_number', 'student_name', 'father_name', 'mobile_number', 'email', 'password'];

export async function importSupervisorsCSV(
  csvText: string
): Promise<{ successes: number; failures: RowError[] }> {
  const parsed = parseCSV(csvText, SUPERVISOR_COLUMNS, (row, rowIndex) => {
    validateRow(row, SUPERVISOR_COLUMNS);
    return { row: rowIndex, data: row };
  });

  let successes = 0;
  const failures: RowError[] = [...parsed.failures];

  for (const item of parsed.successes) {
    try {
      await createSupervisor({
        teacher_name: item.data.teacher_name,
        designation: item.data.designation,
        expertise: item.data.expertise || undefined,
        mobile_number: item.data.mobile_number || undefined,
        email: item.data.email,
        password: item.data.password,
      });
      successes++;
    } catch (err) {
      failures.push({
        row: item.row,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { successes, failures };
}

export async function importStudentsCSV(
  csvText: string,
  sectionId: string
): Promise<{ successes: number; failures: RowError[] }> {
  const parsed = parseCSV(csvText, STUDENT_COLUMNS, (row, rowIndex) => {
    validateRow(row, STUDENT_COLUMNS);
    return { row: rowIndex, data: row };
  });

  let successes = 0;
  const failures: RowError[] = [...parsed.failures];

  for (const item of parsed.successes) {
    try {
      await createStudent({
        reg_number: item.data.reg_number,
        student_name: item.data.student_name,
        father_name: item.data.father_name || undefined,
        mobile_number: item.data.mobile_number || undefined,
        email: item.data.email,
        password: item.data.password,
        section_id: sectionId,
      });
      successes++;
    } catch (err) {
      failures.push({
        row: item.row,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { successes, failures };
}
