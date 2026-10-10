import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { SubjectColors } from '@/constants/theme';
import { cancelNotification, scheduleTimerEnd } from './notifications';
import { newId } from './stats';
import type { ActiveTimer, AppData, Exam, Session, Settings, Subject } from './types';

const STORAGE_KEY = 'bucheur:v1';

const defaultSettings: Required<Omit<Settings, 'essence'>> & Pick<Settings, 'essence'> = {
  dailyGoalMin: 120,
  focusMin: 25,
  appearance: 'auto',
  breakMin: 5,
  breaks: true,
  notifications: true,
  haptics: true,
  keepAwake: true,
  quotes: true,
};

const defaultData: AppData = {
  subjects: [
    { id: 'maths', name: 'Maths', color: SubjectColors[0], weeklyGoalMin: 240 },
    { id: 'francais', name: 'Français', color: SubjectColors[1], weeklyGoalMin: 180 },
    { id: 'anglais', name: 'Anglais', color: SubjectColors[2], weeklyGoalMin: 120 },
  ],
  sessions: [],
  exams: [],
  activeTimer: null,
  settings: defaultSettings,
};

/** Moment où le minuteur arrivera à zéro, pauses comprises. */
export function timerEndsAt(t: ActiveTimer): number {
  return t.startedAt + t.durationMin * 60_000 + (t.pausedMs ?? 0);
}

/** Temps de séance réellement écoulé (hors pauses), en ms. */
export function timerElapsed(t: ActiveTimer, now: number): number {
  return (t.pausedAt ?? now) - t.startedAt - (t.pausedMs ?? 0);
}

type Store = {
  data: AppData;
  /** Réglages complétés par leurs valeurs par défaut. */
  settings: typeof defaultSettings;
  loaded: boolean;
  /** Dernière séance enregistrée automatiquement à la fin du minuteur. */
  justCompleted: Session | null;
  dismissCompleted: () => void;
  startTimer: (subjectId: string, durationMin: number) => Promise<void>;
  /** Pause après une séance : elle n'est pas comptée dans les statistiques. */
  startBreak: (durationMin: number) => Promise<void>;
  /** Arrête le minuteur ; si `save`, enregistre le temps déjà passé. */
  stopTimer: (save: boolean) => Promise<void>;
  /** Met le minuteur en pause ; le temps de pause ne compte pas dans la séance. */
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  /** Prolonge la séance en cours. */
  extendTimer: (minutes: number) => Promise<void>;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, changes: Partial<Omit<Subject, 'id'>>) => void;
  removeSubject: (id: string) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  updateExam: (id: string, changes: Partial<Omit<Exam, 'id'>>) => void;
  removeExam: (id: string) => void;
  updateSession: (id: string, changes: Partial<Pick<Session, 'note' | 'focus'>>) => void;
  removeSession: (id: string) => void;
  updateSettings: (changes: Partial<Settings>) => void;
  /** Efface toutes les données et revient à l'état de la première ouverture. */
  resetAll: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

/** Comme `useStore`, mais renvoie `null` hors du <StoreProvider> au lieu de lever une erreur. */
export function useOptionalStore(): Store | null {
  return use(StoreContext);
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [justCompleted, setJustCompleted] = useState<Session | null>(null);
  const settings = { ...defaultSettings, ...data.settings };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Partial<AppData>;
          setData({
            ...defaultData,
            ...saved,
            settings: { ...defaultSettings, ...saved.settings },
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  const vibrate = (kind: 'start' | 'success') => {
    if (Platform.OS === 'web' || !settings.haptics) return;
    const done =
      kind === 'start'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    done.catch(() => {});
  };

  // Enregistre la séance dès que le minuteur arrive à zéro, même si l'app a été fermée entre-temps.
  const timer = data.activeTimer;
  useEffect(() => {
    if (!loaded || !timer || timer.pausedAt) return;
    const complete = () => {
      if (timer.kind === 'break') {
        setData((d) =>
          d.activeTimer?.startedAt === timer.startedAt ? { ...d, activeTimer: null } : d,
        );
        return;
      }
      const session: Session = {
        id: newId(),
        subjectId: timer.subjectId,
        startedAt: timer.startedAt,
        durationMin: timer.durationMin,
      };
      setData((d) =>
        d.activeTimer?.startedAt === timer.startedAt
          ? { ...d, activeTimer: null, sessions: [...d.sessions, session] }
          : d,
      );
      setJustCompleted(session);
      vibrate('success');
    };
    const remaining = timerEndsAt(timer) - Date.now();
    if (remaining <= 0) {
      complete();
      return;
    }
    const id = setTimeout(complete, remaining);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, timer]);

  /** Message de la notification de fin, selon le type de minuteur. */
  const endMessage = (t: ActiveTimer): [string, string] => {
    if (t.kind === 'break') return ['La pause est finie', 'Prêt pour la séance suivante ?'];
    const subject = data.subjects.find((s) => s.id === t.subjectId)?.name ?? 'révision';
    return ['Séance terminée', `${t.durationMin} min de ${subject} enregistrées. Bien joué.`];
  };

  /** (Re)programme la notification de fin du minuteur, si l'utilisateur les a activées. */
  async function schedule(t: ActiveTimer) {
    await cancelNotification(t.notificationId);
    setData((d) =>
      d.activeTimer?.startedAt === t.startedAt
        ? { ...d, activeTimer: { ...d.activeTimer, notificationId: undefined } }
        : d,
    );
    if (!settings.notifications || t.pausedAt) return;
    const [title, body] = endMessage(t);
    const notificationId = await scheduleTimerEnd(
      (timerEndsAt(t) - Date.now()) / 1000,
      title,
      body,
    );
    if (notificationId) {
      setData((d) =>
        d.activeTimer?.startedAt === t.startedAt
          ? { ...d, activeTimer: { ...d.activeTimer, notificationId } }
          : d,
      );
    }
  }

  async function launch(t: ActiveTimer) {
    setData((d) => ({ ...d, activeTimer: t }));
    await schedule(t);
  }

  /** Applique une modification au minuteur en cours puis reprogramme sa notification. */
  async function changeTimer(change: (t: ActiveTimer) => ActiveTimer) {
    const t = data.activeTimer;
    if (!t) return;
    const next = change(t);
    setData((d) => (d.activeTimer?.startedAt === t.startedAt ? { ...d, activeTimer: next } : d));
    await schedule(next);
  }

  const store: Store = {
    data,
    settings,
    loaded,
    justCompleted,
    dismissCompleted: () => setJustCompleted(null),

    async startTimer(subjectId, durationMin) {
      setJustCompleted(null);
      vibrate('start');
      await launch({ kind: 'focus', subjectId, startedAt: Date.now(), durationMin });
    },

    async startBreak(durationMin) {
      const subjectId = justCompleted?.subjectId ?? '';
      setJustCompleted(null);
      await launch({ kind: 'break', subjectId, startedAt: Date.now(), durationMin });
    },

    async stopTimer(save) {
      const t = data.activeTimer;
      if (!t) return;
      await cancelNotification(t.notificationId);
      const elapsedMin = Math.floor(timerElapsed(t, Date.now()) / 60_000);
      setData((d) => ({
        ...d,
        activeTimer: null,
        sessions:
          save && t.kind !== 'break' && elapsedMin >= 1
            ? [
                ...d.sessions,
                {
                  id: newId(),
                  subjectId: t.subjectId,
                  startedAt: t.startedAt,
                  durationMin: elapsedMin,
                },
              ]
            : d.sessions,
      }));
    },

    pauseTimer: () => changeTimer((t) => (t.pausedAt ? t : { ...t, pausedAt: Date.now() })),
    resumeTimer: () =>
      changeTimer((t) =>
        t.pausedAt
          ? { ...t, pausedAt: undefined, pausedMs: (t.pausedMs ?? 0) + Date.now() - t.pausedAt }
          : t,
      ),
    extendTimer: (minutes) =>
      changeTimer((t) => ({ ...t, durationMin: Math.min(240, t.durationMin + minutes) })),

    addSubject(subject) {
      setData((d) => ({ ...d, subjects: [...d.subjects, { ...subject, id: newId() }] }));
    },
    updateSubject(id, changes) {
      setData((d) => ({
        ...d,
        subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...changes } : s)),
      }));
    },
    removeSubject(id) {
      // Les séances passées sont conservées pour ne pas fausser l'historique et la série.
      setData((d) => ({ ...d, subjects: d.subjects.filter((s) => s.id !== id) }));
    },
    addExam(exam) {
      setData((d) => ({ ...d, exams: [...d.exams, { ...exam, id: newId() }] }));
    },
    updateExam(id, changes) {
      setData((d) => ({
        ...d,
        exams: d.exams.map((e) => (e.id === id ? { ...e, ...changes } : e)),
      }));
    },
    removeExam(id) {
      setData((d) => ({ ...d, exams: d.exams.filter((e) => e.id !== id) }));
    },
    updateSession(id, changes) {
      setData((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...changes } : s)),
      }));
      setJustCompleted((s) => (s?.id === id ? { ...s, ...changes } : s));
    },
    removeSession(id) {
      setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
    },
    updateSettings(changes) {
      setData((d) => ({ ...d, settings: { ...d.settings, ...changes } }));
    },
    async resetAll() {
      await cancelNotification(data.activeTimer?.notificationId);
      setJustCompleted(null);
      setData(defaultData);
    },
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}
