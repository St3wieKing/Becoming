import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { greeting, todayISO } from '@/core/util';
import type { Task } from '@/core/types';
import { coinBalance, recordCompletion, tasksForDate } from '@/db/repo';
import { rewardFor } from '@/engine/economy';
import { frogWhy, pickFrog } from '@/engine/frog';
import { useSettings } from '@/state/settings';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const mode = useSettings((s) => s.mode);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [coins, setCoins] = useState(0);
  const [justAte, setJustAte] = useState<number | null>(null);

  const load = useCallback(async () => {
    setTasks(await tasksForDate(db, todayISO()));
    setCoins(await coinBalance(db));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const frog = useMemo(() => pickFrog(tasks), [tasks]);
  const rest = tasks.filter((t) => !frog || t.id !== frog.id);

  const eatFrog = useCallback(async () => {
    if (!frog) return;
    const reward = rewardFor({ difficulty: frog.difficulty, isFrog: true });
    await recordCompletion(db, {
      taskId: frog.id,
      dateISO: todayISO(),
      done: true,
      earnCoins: mode === 'game',
      reward,
    });
    setJustAte(reward);
    await load();
  }, [db, frog, mode, load]);

  const completeTask = useCallback(
    async (task: Task, done: boolean) => {
      const reward = done ? rewardFor({ difficulty: task.difficulty, isFrog: false }) : 0;
      await recordCompletion(db, {
        taskId: task.id,
        dateISO: todayISO(),
        done,
        reason: done ? undefined : 'other',
        earnCoins: done && mode === 'game',
        reward,
      });
      await load();
    },
    [db, mode, load],
  );

  const renderTask = useCallback(
    ({ item }: { item: Task }) => (
      <View style={styles.taskRow}>
        <ThemedText style={styles.taskTitle}>{item.title}</ThemedText>
        <View style={styles.row}>
          <Pressable style={styles.smallButton} onPress={() => void completeTask(item, true)}>
            <ThemedText type="small">Done</ThemedText>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={() => void completeTask(item, false)}>
            <ThemedText type="small">Not yet</ThemedText>
          </Pressable>
        </View>
      </View>
    ),
    [completeTask],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <ThemedText type="title">{greeting()}</ThemedText>
          {mode === 'game' ? (
            <ThemedView type="backgroundElement" style={styles.coinChip}>
              <ThemedText type="small">{coins} coins</ThemedText>
            </ThemedView>
          ) : null}
        </View>

        <ThemedText type="small">Today&apos;s Frog</ThemedText>
        {justAte !== null && !frog ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="title">FROG EATEN</ThemedText>
            <ThemedText>
              {mode === 'game' ? `+${justAte} coins earned.` : 'Progress logged.'}
            </ThemedText>
            <ThemedText type="small">
              That was the most important thing today. Everything else is easier now.
            </ThemedText>
          </ThemedView>
        ) : frog ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>{frog.title}</ThemedText>
            <ThemedText type="small">{frogWhy(frog)}</ThemedText>
            <View style={styles.row}>
              <Pressable style={styles.primaryButton} onPress={() => void eatFrog()}>
                <ThemedText type="small">Eat the Frog</ThemedText>
              </Pressable>
              <Pressable style={styles.smallButton} onPress={() => void completeTask(frog, false)}>
                <ThemedText type="small">Didn&apos;t finish</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>No tasks for today yet.</ThemedText>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/goals')}>
              <ThemedText type="small">Add a goal</ThemedText>
            </Pressable>
          </ThemedView>
        )}

        <ThemedText type="small">Rest of today</ThemedText>
        {rest.length === 0 ? (
          <ThemedText type="small">Nothing else scheduled.</ThemedText>
        ) : (
          <FlatList data={rest} keyExtractor={(t) => t.id} renderItem={renderTask} />
        )}
        <View style={{ height: BottomTabInset }} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coinChip: { borderRadius: Spacing.four, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  card: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  taskRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  taskTitle: { flexShrink: 1 },
  primaryButton: {
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  smallButton: {
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
