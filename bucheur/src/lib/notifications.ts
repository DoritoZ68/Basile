import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Les notifications locales ne sont pas disponibles sur le web.
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Programme la notification de fin de séance. Renvoie son identifiant si elle a pu être programmée. */
export async function scheduleTimerEnd(
  seconds: number,
  title: string,
  body: string,
): Promise<string | undefined> {
  if (!supported) return undefined;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return undefined;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
      },
    });
  } catch {
    return undefined;
  }
}

export async function cancelNotification(id?: string) {
  if (!supported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // La notification a peut-être déjà été délivrée.
  }
}
