import type { GradeComponents } from '../types/index';

export function computeGrade(total: number): string {
  if (total < 50) return 'F';
  if (total < 60) return 'D';
  if (total < 70) return 'C';
  if (total < 78) return 'B';
  if (total < 85) return 'B+';
  if (total < 95) return 'A';
  return 'A+';
}

export function computeTotal(components: GradeComponents): number {
  let total: number;

  if (components.semesterNumber === 7) {
    total =
      (components.projectApproval ?? 0) +
      (components.srs ?? 0) +
      (components.sdd ?? 0) +
      components.meetingMarks;
  } else {
    total =
      (components.finalDocumentation ?? 0) +
      (components.finalProjectCode ?? 0) +
      components.meetingMarks;
  }

  return Math.min(total, 100);
}
