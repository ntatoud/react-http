import { useState } from 'react';
import type { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim() && editTitle !== todo.title) {
      await onUpdate(todo.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <li className="todo-item editing">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleCancel}
            onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
            autoFocus
            data-testid="edit-input"
          />
        </form>
      </li>
    );
  }

  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        data-testid="todo-checkbox"
      />
      <span
        className="todo-title"
        onDoubleClick={() => setIsEditing(true)}
        data-testid="todo-title"
      >
        {todo.title}
      </span>
      <button
        className="delete-btn"
        onClick={() => onDelete(todo.id)}
        aria-label="Delete todo"
        data-testid="delete-btn"
      >
        ×
      </button>
    </li>
  );
}
