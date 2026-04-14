import React, { useState } from 'react';
import { Input, Button } from '../ui';
import { createSession } from '../../services/sessions.service';

const SESSION_NAME_REGEX = /^\d{4} (Spring|Fall)$/;

interface SessionFormProps {
  onSuccess: () => void;
}

const SessionForm: React.FC<SessionFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!SESSION_NAME_REGEX.test(name)) {
      setError("Format must be 'YYYY Spring' or 'YYYY Fall' (e.g. 2025 Spring).");
      return;
    }

    setLoading(true);
    try {
      await createSession(name);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="session-name"
        label="Session Name"
        placeholder="e.g. 2025 Spring"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        disabled={loading}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          Create Session
        </Button>
      </div>
    </form>
  );
};

export default SessionForm;
