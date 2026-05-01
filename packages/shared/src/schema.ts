import { z } from 'zod';

// ─── User ────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// ─── Phase ───────────────────────────────────────────────────────────────────

export const PhaseSchema = z.enum(['normal', 'exam', 'break']);
export type Phase = z.infer<typeof PhaseSchema>;

// ─── Schedule ────────────────────────────────────────────────────────────────

export const TimeBlockSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  category: z.string(),
  note: z.string().optional(),
});
export type TimeBlock = z.infer<typeof TimeBlockSchema>;

export const DayScheduleSchema = z.record(z.string(), z.array(TimeBlockSchema));

export const ScheduleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  phase: PhaseSchema,
  dayBlocks: DayScheduleSchema,
  updatedAt: z.coerce.date(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const UpsertScheduleInputSchema = z.object({
  phase: PhaseSchema,
  dayBlocks: DayScheduleSchema,
});
export type UpsertScheduleInput = z.infer<typeof UpsertScheduleInputSchema>;

// ─── Time Log ────────────────────────────────────────────────────────────────

export const TimeLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.string(),
  plannedStart: z.number().int(),
  plannedEnd: z.number().int(),
  actualStart: z.number().int(),
  actualEnd: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type TimeLog = z.infer<typeof TimeLogSchema>;

export const CreateTimeLogInputSchema = z.object({
  category: z.string(),
  plannedStart: z.number().int(),
  plannedEnd: z.number().int(),
  actualStart: z.number().int(),
  actualEnd: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
});
export type CreateTimeLogInput = z.infer<typeof CreateTimeLogInputSchema>;

// ─── Task ────────────────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  courseId: z.string().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedHours: z.number(),
  hoursSpent: z.number(),
  completed: z.boolean(),
  isExam: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1),
  courseId: z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedHours: z.number().min(0),
  isExam: z.boolean().default(false),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  hoursSpent: z.number().min(0).optional(),
  completed: z.boolean().optional(),
  title: z.string().min(1).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedHours: z.number().min(0).optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

// ─── Course ──────────────────────────────────────────────────────────────────

export const CourseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  importance: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(100),
  hoursTarget: z.number().min(0),
  hoursLogged: z.number().min(0),
  lastStudied: z.number().int().nullable(),
  weeklyRatings: z.array(z.object({ week: z.string(), rating: z.number(), note: z.string() })),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Course = z.infer<typeof CourseSchema>;

export const CreateCourseInputSchema = z.object({
  name: z.string().min(1),
  importance: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(100),
  hoursTarget: z.number().min(0),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

export const UpdateCourseInputSchema = z.object({
  confidence: z.number().min(0).max(100).optional(),
  hoursLogged: z.number().min(0).optional(),
  lastStudied: z.number().int().optional(),
  weeklyRatings: z.array(z.object({ week: z.string(), rating: z.number(), note: z.string() })).optional(),
});
export type UpdateCourseInput = z.infer<typeof UpdateCourseInputSchema>;

// ─── Settings ────────────────────────────────────────────────────────────────

export const SettingsSchema = z.object({
  userId: z.string(),
  darkMode: z.boolean(),
  wakeOffset: z.number().int(),
  phase: PhaseSchema,
  updatedAt: z.coerce.date(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const UpdateSettingsInputSchema = z.object({
  darkMode: z.boolean().optional(),
  wakeOffset: z.number().int().min(-60).max(60).optional(),
  phase: PhaseSchema.optional(),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInputSchema>;

// ─── Big Three ───────────────────────────────────────────────────────────────

export const BigThreeGoalSchema = z.object({
  text: z.string(),
  completed: z.boolean(),
});

export const BigThreeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goals: z.array(BigThreeGoalSchema).length(3),
  createdAt: z.coerce.date(),
});
export type BigThree = z.infer<typeof BigThreeSchema>;

export const UpsertBigThreeInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goals: z.array(BigThreeGoalSchema).length(3),
});
export type UpsertBigThreeInput = z.infer<typeof UpsertBigThreeInputSchema>;

// ─── Pomodoro Session ────────────────────────────────────────────────────────

export const PomodoroSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.string().nullable(),
  courseId: z.string().nullable(),
  durationMins: z.number().int(),
  breakMins: z.number().int(),
  completedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});
export type PomodoroSession = z.infer<typeof PomodoroSessionSchema>;

export const CreatePomodoroSessionInputSchema = z.object({
  category: z.string().optional(),
  courseId: z.string().optional(),
  durationMins: z.number().int().min(1),
  breakMins: z.number().int().min(0),
  completedAt: z.string().datetime(),
});
export type CreatePomodoroSessionInput = z.infer<typeof CreatePomodoroSessionInputSchema>;
