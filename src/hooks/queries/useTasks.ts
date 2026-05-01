import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@meridian/shared/schema';

// ─── Query ────────────────────────────────────────────────────────────────────

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<{ data: Task[] }>('/tasks').then((r) => r.data),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: CreateTaskInput) => api.post<{ data: Task }>('/tasks', task),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(),
          userId: '',
          title: item.title,
          courseId: item.courseId ?? null,
          deadline: item.deadline,
          estimatedHours: item.estimatedHours,
          hoursSpent: 0,
          completed: false,
          isExam: item.isExam ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskInput }) =>
      api.patch<{ data: Task }>(`/tasks/${id}`, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) => old.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch<{ data: Task }>(`/tasks/${id}`, { completed }),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, completed } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useLogTaskHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hoursSpent }: { id: string; hoursSpent: number }) =>
      api.patch<{ data: Task }>(`/tasks/${id}`, { hoursSpent }),
    onMutate: async ({ id, hoursSpent }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, hoursSpent } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['tasks'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Computed helpers (pure functions, no store) ─────────────────────────────

export function getActiveTasks(tasks: Task[]) {
  return tasks.filter((t) => !t.completed);
}

export function getUrgencyScore(task: Task): number {
  if (task.completed) return 0;
  const now = Date.now();
  const deadline = new Date(task.deadline).getTime();
  const hoursLeft = Math.max(0, (deadline - now) / (1000 * 60 * 60));
  const hoursNeeded = Math.max(0, task.estimatedHours - task.hoursSpent);
  const progress = task.estimatedHours > 0 ? task.hoursSpent / task.estimatedHours : 0;
  const examMultiplier = task.isExam ? 1.5 : 1;

  if (hoursLeft <= 0) return 100;
  if (hoursLeft <= 24 && progress < 0.5) return 95 * examMultiplier;
  if (hoursLeft <= 48 && progress < 0.5) return 85 * examMultiplier;

  const timeRatio = hoursNeeded / Math.max(1, hoursLeft / 24);
  return Math.min(100, Math.round(timeRatio * 40 * examMultiplier));
}

export function getAtRiskTasks(tasks: Task[]) {
  return tasks
    .filter((t) => !t.completed)
    .map((t) => ({ ...t, urgency: getUrgencyScore(t) }))
    .filter((t) => t.urgency >= 60)
    .sort((a, b) => b.urgency - a.urgency);
}

export function isRescueMode(tasks: Task[]) {
  return getAtRiskTasks(tasks).length >= 3;
}
