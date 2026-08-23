import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function setFrogReminder(hhmm: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    const perm = await Notifications.getPermissionsAsync();
    let ok = perm.granted;
    if (!ok && perm.canAskAgain) {
      ok = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!ok) return false;
    await Notifications.cancelScheduledNotificationAsync('frog-daily').catch(() => {});
    const parts = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    const hour = parts ? Number(parts[1]) : 8;
    const minute = parts ? Number(parts[2]) : 0;
    await Notifications.scheduleNotificationAsync({
      identifier: 'frog-daily',
      content: {
        title: "Today's Frog",
        body: 'Pick the one action that matters most and eat it.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearFrogReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync('frog-daily');
  } catch {}
}
