import { useState } from 'react';

interface TodoFormProps {
  onSubmit: (title: string) => Promise<void>;
}

export function TodoForm({ onSubmit }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim());
      setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit} data-testid="todo-form">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        disabled={submitting}
        data-testid="todo-input"
      />
      <button type="submit" disabled={submitting || !title.trim()} data-testid="submit-btn">
        Add
      </button>
    </form>
  );
}
