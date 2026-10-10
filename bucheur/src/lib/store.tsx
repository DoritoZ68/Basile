import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { SubjectColors } from '@/constants/theme';
import { cancelNotification, scheduleTimerEnd } from './notifications';
import { newId } from './stats';
import type { AppData, Exam, Session, Subject } from './types';

const STORAGE_KEY = 'bucheur:v1';

const defaultData: AppData = {
  subjects: [
    { id: 'maths', name: 'Maths', color: SubjectColors[1], weeklyGoalMin: 240 },
    { id: 'francais', name: 'Français', color: SubjectColors[0], weeklyGoalMin: 180 },
    { id: 'anglais', name: 'Anglais', color: SubjectColors[2], weeklyGoalMin: 120 },
  ],
  sessions: [],
  exams: [],
  activeTimer: null,
  settings: { dailyGoalMin: 120, focusMin: 25 },
};

type Store = {
  data: AppData;
  loaded: boolean;
  /** Dernière séance enregistrée automatiquement à la fin du minuteur. */
  justCompleted: Session | null;
  dismissCompleted: () => void;
  startTimer: (subjectId: string, durationMin: number) => Promise<void>;
  /** Arrête le minuteur ; si `save`, enregistre le temps déjà passé. */
  stopTimer: (save: boolean) => Promise<void>;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, changes: Partial<Omit<Subject, 'id'>>) => void;
  removeSubject: (id: string) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  removeExam: (id: string) => void;
  removeSession: (id: string) => void;
  updateSettings: (changes: Partial<AppData['settings']>) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [justCompleted, setJustCompleted] = useState<Session | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Partial<AppData>;
          setData({ ...defaultData, ...saved, settings: { ...defaultData.settings, ...saved.settings } });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  // Enregistre la séance dès que le minuteur arrive à zéro, même si l'app a été fermée entre-temps.
  const timer = data.activeTimer;
  useEffect(() => {
    if (!loaded || !timer) return;
    const complete = () => {
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
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    };
    const remaining = timer.startedAt + timer.durationMin * 60_000 - Date.now();
    if (remaining <= 0) {
      complete();
      return;
    }
    const id = setTimeout(complete, remaining);
    return () => clearTimeout(id);
  }, [loaded, timer]);

  const store: Store = {
    data,
    loaded,
    justCompleted,
    dismissCompleted: () => setJustCompleted(null),

    async startTimer(subjectId, durationMin) {
      const subject = data.subjects.find((s) => s.id === subjectId);
      const startedAt = Date.now();
      setJustCompleted(null);
      setData((d) => ({ ...d, activeTimer: { subjectId, startedAt, durationMin } }));
      const notificationId = await scheduleTimerEnd(durationMin * 60, subject?.name ?? 'révision');
      if (notificationId) {
        setData((d) =>
          d.activeTimer?.startedAt === startedAt
            ? { ...d, activeTimer: { ...d.activeTimer, notificationId } }
            : d,
        );
      }
    },

    async stopTimer(save) {
      const t = data.activeTimer;
      if (!t) return;
      await cancelNotification(t.notificationId);
      const elapsedMin = Math.floor((Date.now() - t.startedAt) / 60_000);
      setData((d) => ({
        ...d,
        activeTimer: null,
        sessions:
          save && elapsedMin >= 1
            ? [
                ...d.sessions,
                { id: newId(), subjectId: t.subjectId, startedAt: t.startedAt, durationMin: elapsedMin },
              ]
            : d.sessions,
      }));
    },

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
    removeExam(id) {
      setData((d) => ({ ...d, exams: d.exams.filter((e) => e.id !== id) }));
    },
    removeSession(id) {
      setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
    },
    updateSettings(changes) {
      setData((d) => ({ ...d, settings: { ...d.settings, ...changes } }));
    },
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}
