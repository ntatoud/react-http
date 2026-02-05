export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
}
