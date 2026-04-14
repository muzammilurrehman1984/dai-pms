import React, { useState } from 'react';
import { Button } from '../ui';
import { createSection } from '../../services/sections.service';

interface SectionFormProps {
  sessionId: string;
  onSuccess: () => void;
}

const SectionForm: React.FC<SectionFormProps> = ({ sessionId, onSuccess }) => {
  const [name, setName]                   = useState('');
  const [semesterNumber, setSemesterNumber] = useState<7 | 8>(7);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Section name is required.'); return; }
    setLoading(true);
    try {
      await createSection(sessionId, name.trim(), semesterNumber);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="form-label">Section Name <span className="text-danger">*</span></label>
        <input className="form-input" placeholder="e.g. BSARIN-7TH-1M"
          value={name} onChange={e => setName(e.target.value)} disabled={loading} autoFocus />
      </div>
      <div>
        <label className="form-label">Semester <span className="text-danger">*</span></label>
        <select className="form-input" value={semesterNumber}
          onChange={e => setSemesterNumber(Number(e.target.value) as 7 | 8)} disabled={loading}>
          <option value={7}>7th Semester (FYP-I)</option>
          <option value={8}>8th Semester (FYP-II)</option>
        </select>
        <p className="text-xs text-ink-muted mt-1">
          Determines which submission phases students in this section see.
        </p>
      </div>
      {error && <p className="form-error text-sm">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>Create Section</Button>
      </div>
    </form>
  );
};

export default SectionForm;
