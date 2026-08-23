import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { addDaysISO, todayISO } from '@/core/util';
import {
  distinctDoneDates,
  kvGet,
  primaryVision,
  totalDoneCount,
  weeklyStats,
} from '@/db/repo';
import { streakFromDates } from '@/engine/achievements';

export default function InsightsScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState({ completed: 0, missed: 0, frogsDone: 0 });
  const [streak, setStreak] = useState(0);
  const [totalDone, setTotalDone] = useState(0);
  const [visionTitle, setVisionTitle] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState('off');

  const load = useCallback(async () => {
    const today = todayISO();
    const weekStats = await weeklyStats(db, addDaysISO(today, -6), today);
    setStats(weekStats);
    setStreak(streakFromDates(await distinctDoneDates(db), today));
    setTotalDone(await totalDoneCount(db));
    const v = await primaryVision(db);
    setVisionTitle(v?.title ?? null);
    const raw = await kvGet(db, 'settings');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { mode?: string };
        if (parsed.mode) setAiMode(parsed.mode);
      } catch {}
    }
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const attempts = stats.completed + stats.missed;
  const rate = attempts > 0 ? Math.round((stats.completed / attempts) * 100) : -1;

  const advice: string[] = [];
  if (attempts === 0) {
    advice.push('No check-ins this week yet. One small action starts the record.');
  } else {
    if (rate >= 0 && rate < 50) {
      advice.push(
        `You complete about ${rate}% of planned actions. Try shorter sessions — plan what you actually finish, not what sounds right.`,
      );
    }
    if (stats.frogsDone === 0 && stats.completed > 0) {
      advice.push('You finished things but never ate the Frog. Pick the hardest important thing first tomorrow.');
    }
    if (rate >= 80) {
      advice.push(`Strong week — ${rate}% completion. Consider raising your targets.`);
    }
    if (streak >= 3) {
      advice.push(`${streak}-day action streak going.`);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          ListHeaderComponent={
            <View style={styles.gap}>
              <ThemedText type="title">Your Week</ThemedText>
              {visionTitle ? (
                <ThemedText type="small">Future Me: {visionTitle}</ThemedText>
              ) : (
                <ThemedText type="small">No Future Me yet — set one in onboarding.</ThemedText>
              )}
            </View>
          }
          data={[
            { key: 'stats', line: `${stats.completed} completed · ${stats.missed} not completed · ${stats.frogsDone} Frogs eaten` },
            { key: 'streak', line: streak > 0 ? `Current streak: ${streak} day(s)` : 'No active streak' },
            { key: 'total', line: `${totalDone} actions completed all-time` },
            { key: 'mode', line: `Experience mode: ${aiMode}` },
            ...advice.map((a, i) => ({ key: `advice-${i}`, line: `· ${a}` })),
          ]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <ThemedText style={styles.line}>{item.line}</ThemedText>
          )}
          contentContainerStyle={styles.content}
        />
        <View style={{ height: BottomTabInset }} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  content: { gap: Spacing.two, paddingBottom: Spacing.three },
  gap: { gap: Spacing.one },
  line: { paddingVertical: Spacing.one },
});
