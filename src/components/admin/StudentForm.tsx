import React, { useState } from 'react';
import { Input, Button } from '../ui';
import { createStudent } from '../../services/students.service';

interface StudentFormProps {
  sessionId: string;
  sectionId: string;
  onSuccess: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ sectionId, onSuccess }) => {
  const [form, setForm] = useState({
    reg_number: '',
    student_name: '',
    father_name: '',
    mobile_number: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.reg_number.trim() || !form.student_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Registration number, name, email, and password are required.');
      return;
    }

    setLoading(true);
    try {
      await createStudent({
        reg_number: form.reg_number.trim(),
        student_name: form.student_name.trim(),
        father_name: form.father_name.trim() || undefined,
        mobile_number: form.mobile_number.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        section_id: sectionId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create student.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="reg-number" label="Registration Number" placeholder="e.g. S23BARIN1M01037"
        value={form.reg_number} onChange={set('reg_number')} disabled={loading} />
      <Input id="student-name" label="Student Name" placeholder="Full name"
        value={form.student_name} onChange={set('student_name')} disabled={loading} />
      <Input id="father-name" label="Father Name (optional)" placeholder="Father's name"
        value={form.father_name} onChange={set('father_name')} disabled={loading} />
      <Input id="mobile-number" label="Mobile Number (optional)" placeholder="+92…"
        value={form.mobile_number} onChange={set('mobile_number')} disabled={loading} />
      <Input id="email" label="Email" type="email" placeholder="student@example.com"
        value={form.email} onChange={set('email')} disabled={loading} />
      <Input id="password" label="Password" type="password" placeholder="Initial password"
        value={form.password} onChange={set('password')} disabled={loading} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>Add Student</Button>
      </div>
    </form>
  );
};

export default StudentForm;
