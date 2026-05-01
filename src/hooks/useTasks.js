import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

export const useTasks = create(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (task) => {
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id: Date.now().toString(),
              title: task.title,
              courseId: task.courseId || null,
              deadline: task.deadline,
              estimatedHours: task.estimatedHours || 2,
              hoursSpent: 0,
              isExam: task.isExam || false,
              completed: false,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        if (isAuthenticated()) {
          api.post('/tasks', {
            title: task.title,
            courseId: task.courseId || null,
            deadline: task.deadline,
            estimatedHours: task.estimatedHours || 2,
            isExam: task.isExam || false,
          }).catch(err => console.warn('sync failed:', err));
        }
      },

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        if (isAuthenticated()) {
          api.delete(`/tasks/${id}`).catch(err => console.warn('sync failed:', err));
        }
      },

      toggleComplete: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
        }));
        if (isAuthenticated() && task) {
          api.patch(`/tasks/${id}`, { completed: !task.completed })
            .catch(err => console.warn('sync failed:', err));
        }
      },

      logHours: (id, hours) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, hoursSpent: Math.round((t.hoursSpent + hours) * 10) / 10 }
              : t
          ),
        })),

      getActiveTasks: () => get().tasks.filter((t) => !t.completed),

      getUrgencyScore: (task) => {
        if (task.completed) return 0;
        const now = Date.now();
        const deadline = new Date(task.deadline).getTime();
        const hoursLeft = Math.max(0, (deadline - now) / (1000 * 60 * 60));
        const hoursNeeded = Math.max(0, task.estimatedHours - task.hoursSpent);
        const progress = task.estimatedHours > 0
          ? task.hoursSpent / task.estimatedHours
          : 0;
        const examMultiplier = task.isExam ? 1.5 : 1;

        if (hoursLeft <= 0) return 100;
        if (hoursLeft <= 24 && progress < 0.5) return 95 * examMultiplier;
        if (hoursLeft <= 48 && progress < 0.5) return 85 * examMultiplier;

        const timeRatio = hoursNeeded / Math.max(1, hoursLeft / 24);
        return Math.min(100, Math.round(timeRatio * 40 * examMultiplier));
      },

      getAtRiskTasks: () => {
        const { tasks, getUrgencyScore } = get();
        return tasks
          .filter((t) => !t.completed)
          .map((t) => ({ ...t, urgency: getUrgencyScore(t) }))
          .filter((t) => t.urgency >= 60)
          .sort((a, b) => b.urgency - a.urgency);
      },

      isRescueMode: () => {
        const atRisk = get().getAtRiskTasks();
        return atRisk.length >= 3;
      },
    }),
    { name: 'lcc-tasks' }
  )
);
