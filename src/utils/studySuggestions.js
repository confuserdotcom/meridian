/**
 * Smart Study Suggestion Engine
 *
 * Scores each course on a 0-100 urgency scale considering:
 *  1. Deadline proximity (homework + exam)
 *  2. How far behind (hours logged vs target)
 *  3. Course importance weight (1-5)
 *  4. Confidence decay
 *  5. Time since last studied
 *  6. Energy level matching
 */

export function generateStudySuggestions({ courses, tasks, checkin, getDecayInfo, getEffectiveConfidence }) {
  if (courses.length === 0) return [];

  const now = Date.now();
  const energy = checkin?.energy || 'medium';

  const scored = courses.map((course) => {
    let score = 0;
    const reasons = [];

    // === 1. DEADLINE PRESSURE (0-35 points) ===
    const courseTasks = tasks.filter((t) => t.courseId === course.id && !t.completed);
    const exams = courseTasks.filter((t) => t.isExam);
    const homework = courseTasks.filter((t) => !t.isExam);

    let closestDeadlineDays = Infinity;
    let mostUrgentTask = null;

    courseTasks.forEach((t) => {
      const daysLeft = Math.max(0, (new Date(t.deadline).getTime() - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < closestDeadlineDays) {
        closestDeadlineDays = daysLeft;
        mostUrgentTask = t;
      }
    });

    if (closestDeadlineDays <= 1) {
      score += 35;
      reasons.push(`Due TOMORROW — ${mostUrgentTask?.title}`);
    } else if (closestDeadlineDays <= 2) {
      score += 30;
      reasons.push(`Due in ${Math.ceil(closestDeadlineDays)} days — ${mostUrgentTask?.title}`);
    } else if (closestDeadlineDays <= 4) {
      score += 22;
      reasons.push(`Deadline in ${Math.ceil(closestDeadlineDays)} days`);
    } else if (closestDeadlineDays <= 7) {
      score += 12;
      reasons.push(`Deadline this week`);
    } else if (closestDeadlineDays < Infinity) {
      score += 5;
    }

    // Exam multiplier
    if (exams.length > 0) {
      const closestExam = exams.reduce((min, e) => {
        const d = (new Date(e.deadline).getTime() - now) / (1000 * 60 * 60 * 24);
        return d < min.days ? { days: d, task: e } : min;
      }, { days: Infinity, task: null });

      if (closestExam.days <= 7) {
        score += 15;
        reasons.push(`EXAM in ${Math.ceil(closestExam.days)} days!`);
      } else if (closestExam.days <= 14) {
        score += 8;
        reasons.push(`Exam in ${Math.ceil(closestExam.days)} days`);
      }
    }

    // === 2. BEHIND ON HOURS (0-20 points) ===
    const hoursRatio = course.hoursTarget > 0 ? course.hoursLogged / course.hoursTarget : 1;
    if (hoursRatio < 0.25) {
      score += 20;
      reasons.push(`Only ${Math.round(hoursRatio * 100)}% of weekly hours done`);
    } else if (hoursRatio < 0.5) {
      score += 14;
      reasons.push(`${Math.round(hoursRatio * 100)}% of weekly target logged`);
    } else if (hoursRatio < 0.75) {
      score += 7;
    }

    // Task progress (hours spent vs estimated)
    const totalNeeded = courseTasks.reduce((s, t) => s + Math.max(0, t.estimatedHours - t.hoursSpent), 0);
    if (totalNeeded > 4) {
      score += 5;
      reasons.push(`${totalNeeded.toFixed(1)}h of work remaining`);
    }

    // === 3. IMPORTANCE WEIGHT (0-15 points) ===
    score += course.importance * 3;
    if (course.importance >= 4) {
      reasons.push(`High importance (${course.importance}/5)`);
    }

    // === 4. CONFIDENCE / DECAY (0-20 points) ===
    const effective = getEffectiveConfidence(course);
    const decay = getDecayInfo(course);

    if (effective < 30) {
      score += 20;
      reasons.push(`Understanding critically low (${effective}%)`);
    } else if (effective < 50) {
      score += 14;
      reasons.push(`Understanding weak (${effective}%)`);
    } else if (effective < 70) {
      score += 6;
    }

    if (decay.decayed) {
      score += Math.min(10, decay.decayAmount);
      reasons.push(`Decaying — ${decay.daysSince} days untouched`);
    }

    // === 5. TIME SINCE LAST STUDIED (0-10 points) ===
    if (!course.lastStudied) {
      score += 10;
      reasons.push('Never studied yet');
    } else {
      const daysSince = Math.floor((now - new Date(course.lastStudied).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 5) {
        score += 8;
      } else if (daysSince >= 3) {
        score += 4;
      }
    }

    // === 6. ENERGY MATCHING ===
    let energyNote = null;
    if (energy === 'low' && course.importance >= 4) {
      energyNote = 'Hard course — consider lighter review today';
    } else if (energy === 'high' && course.importance >= 4) {
      energyNote = 'High energy — perfect time for deep work';
      score += 3;
    }

    // Generate recommendation type
    let type = 'review';
    let action = 'Review notes';
    if (closestDeadlineDays <= 2 && totalNeeded > 0) {
      type = 'critical';
      action = `Complete ${mostUrgentTask?.title || 'assignment'}`;
    } else if (exams.length > 0 && exams.some((e) => (new Date(e.deadline).getTime() - now) / (1000 * 60 * 60 * 24) <= 7)) {
      type = 'exam-prep';
      action = 'Exam prep — practice problems + active recall';
    } else if (effective < 50) {
      type = 'catch-up';
      action = 'Deep review — rebuild understanding';
    } else if (hoursRatio < 0.5) {
      type = 'behind';
      action = 'Catch up on weekly hours';
    }

    // Suggested study duration
    let suggestedMinutes = 45;
    if (energy === 'high') suggestedMinutes = 60;
    if (energy === 'low') suggestedMinutes = 30;
    if (type === 'critical') suggestedMinutes = 90;
    if (type === 'exam-prep') suggestedMinutes = 75;

    return {
      course,
      score: Math.min(100, Math.round(score)),
      reasons: reasons.slice(0, 3),
      type,
      action,
      suggestedMinutes,
      energyNote,
      totalNeeded,
      closestDeadlineDays: closestDeadlineDays === Infinity ? null : Math.ceil(closestDeadlineDays),
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export function getSuggestionColor(type) {
  switch (type) {
    case 'critical':
      return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-500' };
    case 'exam-prep':
      return { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-500' };
    case 'catch-up':
      return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-500' };
    case 'behind':
      return { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-500' };
    default:
      return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500' };
  }
}
