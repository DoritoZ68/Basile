export type Subject = {
  id: string;
  name: string;
  color: string;
  /** Objectif de révision hebdomadaire, en minutes. */
  weeklyGoalMin: number;
};

export type Session = {
  id: string;
  subjectId: string;
  /** Début de la séance (timestamp en ms). */
  startedAt: number;
  durationMin: number;
};

export type Exam = {
  id: string;
  name: string;
  /** Jour de l'examen au format YYYY-MM-DD (heure locale). */
  date: string;
};

/** Minuteur en cours : basé sur des timestamps pour survivre à la mise en arrière-plan. */
export type ActiveTimer = {
  /** `break` : pause entre deux séances, non comptée dans les stats. Absent = `focus`. */
  kind?: 'focus' | 'break';
  subjectId: string;
  startedAt: number;
  durationMin: number;
  notificationId?: string;
};

export type Settings = {
  dailyGoalMin: number;
  focusMin: number;
};

export type AppData = {
  subjects: Subject[];
  sessions: Session[];
  exams: Exam[];
  activeTimer: ActiveTimer | null;
  settings: Settings;
};
