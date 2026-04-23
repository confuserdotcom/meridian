import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DECAY_THRESHOLD_DAYS = 5;
const DECAY_RATE = 2; // % per day after threshold
const DECAY_CAP = 20; // max total decay %

export const useCourses = create(
  persist(
    (set, get) => ({
      courses: [],

      addCourse: (course) =>
        set((s) => ({
          courses: [
            ...s.courses,
            {
              id: Date.now().toString(),
              name: course.name,
              importance: course.importance || 3,
              confidence: course.confidence || 50,
              baseConfidence: course.confidence || 50,
              hoursTarget: course.hoursTarget || 5,
              hoursLogged: 0,
              lastStudied: null,
              weeklyRatings: [],
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateCourse: (id, updates) =>
        set((s) => ({
          courses: s.courses.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeCourse: (id) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),

      logStudyTime: (id, hours) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id
              ? {
                  ...c,
                  hoursLogged: Math.round((c.hoursLogged + hours) * 10) / 10,
                  lastStudied: new Date().toISOString(),
                }
              : c
          ),
        })),

      submitWeeklyRating: (id, rating, note) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id
              ? {
                  ...c,
                  confidence: rating * 20,
                  baseConfidence: rating * 20,
                  weeklyRatings: [
                    ...c.weeklyRatings.slice(-11),
                    { rating, note, date: new Date().toISOString() },
                  ],
                }
              : c
          ),
        })),

      resetWeeklyHours: () =>
        set((s) => ({
          courses: s.courses.map((c) => ({ ...c, hoursLogged: 0 })),
        })),

      getDecayInfo: (course) => {
        if (!course.lastStudied) return { decayed: false, daysSince: null, decayAmount: 0 };
        const daysSince = Math.floor(
          (Date.now() - new Date(course.lastStudied).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= DECAY_THRESHOLD_DAYS) return { decayed: false, daysSince, decayAmount: 0 };
        const decayDays = daysSince - DECAY_THRESHOLD_DAYS;
        const decayAmount = Math.min(decayDays * DECAY_RATE, DECAY_CAP);
        return { decayed: true, daysSince, decayAmount };
      },

      getEffectiveConfidence: (course) => {
        const { decayAmount } = get().getDecayInfo(course);
        return Math.max(0, course.confidence - decayAmount);
      },
    }),
    { name: 'lcc-courses' }
  )
);
