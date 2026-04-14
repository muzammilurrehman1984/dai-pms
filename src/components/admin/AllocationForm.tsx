import React, { useEffect, useState } from 'react';
import { Button } from '../ui';
import { listStudents } from '../../services/students.service';
import { listSupervisors } from '../../services/supervisors.service';
import { listSections } from '../../services/sections.service';
import { createAllocation, listAllocations } from '../../services/allocations.service';
import { ShieldAlert } from 'lucide-react';
import type { Student, Supervisor, Section } from '../../types';

interface AllocationFormProps {
  sessionId: string;
  onSuccess: () => void;
}

const AllocationForm: React.FC<AllocationFormProps> = ({ sessionId, onSuccess }) => {
  const [allStudents, setAllStudents]     = useState<Student[]>([]);
  const [unallocated, setUnallocated]     = useState<Student[]>([]);
  const [supervisors, setSupervisors]     = useState<Supervisor[]>([]);
  const [sections, setSections]           = useState<Section[]>([]);

  const [studentId, setStudentId]         = useState('');
  const [supervisorId, setSupervisorId]   = useState('');
  const [sectionId, setSectionId]         = useState('');
  const [forceOverwrite, setForceOverwrite] = useState(false);

  const [loading, setLoading]             = useState(false);
  const [fetchLoading, setFetchLoading]   = useState(true);
  const [error, setError]                 = useState('');

  useEffect(() => {
    const load = async () => {
      setFetchLoading(true);
      try {
        const [allSections, allSups, existingAllocations] = await Promise.all([
          listSections(sessionId),
          listSupervisors(),
          listAllocations({ sessionId }),
        ]);

        const allocatedIds = new Set(existingAllocations.map(a => a.student_id));
        const sectionIds = allSections.map((s: Section) => s.id);
        const students = sectionIds.length > 0
          ? (await Promise.all(sectionIds.map((sid: string) => listStudents({ sectionId: sid })))).flat()
          : [];

        setSections(allSections);
        setSupervisors(allSups);
        setAllStudents(students);
        setUnallocated(students.filter((s: Student) => !allocatedIds.has(s.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, [sessionId]);

  // Auto-populate section from selected student
  useEffect(() => {
    if (!studentId) { setSectionId(''); return; }
    const student = (forceOverwrite ? allStudents : unallocated).find(s => s.id === studentId);
    if (student) setSectionId(student.section_id);
  }, [studentId, allStudents, unallocated, forceOverwrite]);

  // Clear student selection when toggling overwrite (list changes)
  useEffect(() => { setStudentId(''); }, [forceOverwrite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!studentId || !supervisorId || !sectionId) {
      setError('Please select a student and a supervisor.');
      return;
    }
    setLoading(true);
    try {
      await createAllocation(
        { session_id: sessionId, supervisor_id: supervisorId, student_id: studentId, section_id: sectionId },
        forceOverwrite
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create allocation.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <p className="text-sm text-ink-muted">Loading…</p>;

  const students = forceOverwrite ? allStudents : unallocated;
  const selectedSection = sections.find(s => s.id === sectionId);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Force overwrite toggle */}
      <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-border cursor-pointer hover:bg-surface transition-colors">
        <input type="checkbox" checked={forceOverwrite} onChange={e => setForceOverwrite(e.target.checked)}
          className="w-4 h-4 accent-danger" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <ShieldAlert size={14} className="text-danger flex-shrink-0" />
            Force Overwrite Supervisor
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Show all students (including already allocated) and replace their existing supervisor.
          </p>
        </div>
      </label>

      {forceOverwrite && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger-dark flex items-start gap-2">
          <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
          Existing allocation for the selected student will be replaced.
        </div>
      )}

      <div>
        <label className="form-label">
          Student
          {forceOverwrite
            ? <span className="ml-1 text-xs text-ink-muted font-normal">(all {allStudents.length})</span>
            : <span className="ml-1 text-xs text-ink-muted font-normal">({unallocated.length} unallocated)</span>}
        </label>
        <select className="form-input" value={studentId} onChange={e => setStudentId(e.target.value)} disabled={loading}>
          <option value="">Select a student…</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.reg_number} — {s.student_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label">Supervisor</label>
        <select className="form-input" value={supervisorId} onChange={e => setSupervisorId(e.target.value)} disabled={loading}>
          <option value="">Select a supervisor…</option>
          {supervisors.map(sv => (
            <option key={sv.id} value={sv.id}>{sv.teacher_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label">Section</label>
        <input type="text" readOnly value={selectedSection?.section_name ?? ''}
          placeholder="Auto-populated from student"
          className="form-input bg-surface text-ink-muted" />
      </div>

      {error && <p className="form-error text-sm">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={loading} variant={forceOverwrite ? 'danger' : 'primary'}>
          {forceOverwrite ? 'Overwrite Allocation' : 'Add Allocation'}
        </Button>
      </div>
    </form>
  );
};

export default AllocationForm;
