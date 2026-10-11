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
  /** Ce qui a été révisé, noté à la fin de la séance. */
  note?: string;
  /** Concentration ressentie : 1 difficile, 2 correcte, 3 excellente. */
  focus?: 1 | 2 | 3;
};

export type Exam = {
  id: string;
  name: string;
  /** Jour de l'examen au format YYYY-MM-DD (heure locale). */
  date: string;
  /** Matière concernée, facultative. */
  subjectId?: string;
};

/** Une chose à réviser : chapitre, exercice, fiche à relire… */
export type Task = {
  id: string;
  title: string;
  subjectId?: string;
  /** Échéance facultative (YYYY-MM-DD). */
  due?: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
};

/** Fiche de révision recto / verso, révisée selon la méthode Leitner (boîtes 1 à 5). */
export type Card = {
  id: string;
  front: string;
  back: string;
  subjectId?: string;
  box: number;
  /** Prochain jour de révision (YYYY-MM-DD). */
  due: string;
  createdAt: number;
  /** Nombre total de révisions, et de bonnes réponses. */
  reviews?: number;
  correct?: number;
};

/** Ambiance sonore pendant les séances (version web). */
export type SoundId = 'none' | 'pluie' | 'brun' | 'blanc';

/** Minuteur en cours : basé sur des timestamps pour survivre à la mise en arrière-plan. */
export type ActiveTimer = {
  /** `break` : pause entre deux séances, non comptée dans les stats. Absent = `focus`. */
  kind?: 'focus' | 'break';
  subjectId: string;
  startedAt: number;
  durationMin: number;
  notificationId?: string;
  /** Début de la pause en cours, si le minuteur est en pause. */
  pausedAt?: number;
  /** Temps total déjà passé en pause, en ms (non compté dans la séance). */
  pausedMs?: number;
};

export type EssenceId = 'sauge' | 'chene' | 'erable' | 'nuit';

export type Appearance = 'auto' | 'light' | 'dark';

export type Settings = {
  dailyGoalMin: number;
  focusMin: number;
  /** Couleur d'accent (Bûcheur Pro). Absent = sauge. */
  essence?: EssenceId;
  /** Thème : suit l'iPhone (`auto`), ou toujours clair / sombre. */
  appearance?: Appearance;
  /** Durée de la pause proposée après une séance, en minutes. */
  breakMin?: number;
  /** Proposer une pause à la fin de chaque séance. */
  breaks?: boolean;
  /** Notification à la fin d'une séance ou d'une pause. */
  notifications?: boolean;
  /** Vibrations au début et à la fin d'une séance. */
  haptics?: boolean;
  /** Empêcher l'écran de se mettre en veille pendant une séance. */
  keepAwake?: boolean;
  /** Afficher une phrase d'encouragement pendant la séance. */
  quotes?: boolean;
  /** Prénom affiché dans le message d'accueil. */
  name?: string;
  /** Une pause longue toutes les N séances (cycle Pomodoro). 0 = jamais. */
  longBreakEvery?: number;
  /** Durée de la pause longue, en minutes. */
  longBreakMin?: number;
  /** Ambiance sonore pendant les séances. */
  sound?: SoundId;
  /** Volume de l'ambiance, de 0 à 1. */
  soundVolume?: number;
  /** Petit carillon à la fin d'une séance ou d'une pause. */
  chime?: boolean;
};

export type AppData = {
  subjects: Subject[];
  sessions: Session[];
  exams: Exam[];
  tasks: Task[];
  cards: Card[];
  activeTimer: ActiveTimer | null;
  settings: Settings;
};
