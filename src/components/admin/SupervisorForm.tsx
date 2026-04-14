import React, { useState } from 'react';
import { Input, Button } from '../ui';
import { createSupervisor } from '../../services/supervisors.service';

interface SupervisorFormProps {
  onSuccess: () => void;
}

const SupervisorForm: React.FC<SupervisorFormProps> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    teacher_name: '',
    designation: '',
    expertise: '',
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

    if (!form.teacher_name.trim() || !form.designation.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, designation, email, and password are required.');
      return;
    }

    setLoading(true);
    try {
      await createSupervisor({
        teacher_name: form.teacher_name.trim(),
        designation: form.designation.trim(),
        expertise: form.expertise.trim() || undefined,
        mobile_number: form.mobile_number.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create supervisor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="teacher-name" label="Teacher Name" placeholder="Full name"
        value={form.teacher_name} onChange={set('teacher_name')} disabled={loading} />
      <Input id="designation" label="Designation" placeholder="e.g. Assistant Professor"
        value={form.designation} onChange={set('designation')} disabled={loading} />
      <Input id="expertise" label="Expertise (optional)" placeholder="e.g. Machine Learning"
        value={form.expertise} onChange={set('expertise')} disabled={loading} />
      <Input id="mobile-number" label="Mobile Number (optional)" placeholder="+92…"
        value={form.mobile_number} onChange={set('mobile_number')} disabled={loading} />
      <Input id="email" label="Email" type="email" placeholder="supervisor@example.com"
        value={form.email} onChange={set('email')} disabled={loading} />
      <Input id="password" label="Password" type="password" placeholder="Initial password"
        value={form.password} onChange={set('password')} disabled={loading} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>Add Supervisor</Button>
      </div>
    </form>
  );
};

export default SupervisorForm;
