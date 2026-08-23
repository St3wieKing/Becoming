import { Redirect, Tabs } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { kvGet } from '@/db/repo';
import { useSettings } from '@/state/settings';

export default function TabLayout() {
  const db = useSQLiteContext();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const mode = useSettings((s) => s.mode);
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await kvGet(db, 'settings');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { mode?: 'serious' | 'game' };
          if (parsed.mode === 'serious' || parsed.mode === 'game') {
            useSettings.getState().setMode(parsed.mode);
          }
        } catch {}
      }
      const done = await kvGet(db, 'onboarded');
      if (!cancelled) {
        setOnboarded(done === '1');
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (!ready) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      {mode === 'game' ? <Tabs.Screen name="companion" options={{ title: 'Companion' }} /> : null}
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
