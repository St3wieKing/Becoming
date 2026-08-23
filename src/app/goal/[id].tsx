import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { draftSmart } from '@/ai/provider';
import { Colors, Spacing } from '@/constants/theme';
import type { GoalStatus, Task } from '@/core/types';
import { addDaysISO, todayISO } from '@/core/util';
import { CONFIDENCE_LABEL, STATUS_GLYPH } from '@/core/ui';
import {
  addCoinTx,
  addMilestone,
  addTask,
  getGoal,
  historyForGoal,
  listMilestones,
  recordCompletion,
  tasksForGoal,
  toggleMilestone,
  updateGoal,
} from '@/db/repo';
import { maybeAward } from '@/engine/achievements';
import { assessHealth } from '@/engine/health';
import { rewardFor } from '@/engine/economy';
import { useSettings } from '@/state/settings';

export default function GoalDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const mode = useSettings((s) => s.mode);
  const params = useLocalSearchParams<{ id: string }>();
  const goalId = typeof params.id === 'string' ? params.id : '';

  const [status, setStatus] = useState<GoalStatus>('healthy');
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState<
    { id: string; title: string; done: number; due_date: string | null }[]
  >([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<
    { date: string; done: boolean; reason?: string | undefined; title: string }[]
  >([]);
  const [smartOpen, setSmartOpen] = useState(false);
  const [specific, setSpecific] = useState('');
  const [measurable, setMeasurable] = useState('');
  const [achievable, setAchievable] = useState('');
  const [relevant, setRelevant] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [newTask, setNewTask] = useState('');

  const refresh = useCallback(async () => {
    const g = await getGoal(db, goalId);
    if (!g) return;
    setStatus(g.status);
    setTitle(g.title);
    setDeadline(g.deadline ?? '');
    setSpecific((prev) => (prev.length === 0 && g.smart ? g.smart.specific : prev));
    setMeasurable((prev) => (prev.length === 0 && g.smart ? g.smart.measurable : prev));
    setAchievable((prev) => (prev.length === 0 && g.smart ? g.smart.achievable : prev));
    setRelevant((prev) => (prev.length === 0 && g.smart ? g.smart.relevant : prev));
    setMilestones(await listMilestones(db, goalId));
    setTasks(await tasksForGoal(db, goalId));
    setHistory(await historyForGoal(db, goalId));
  }, [db, goalId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const health = assessHealth({
    status,
    deadline: deadline.length > 0 ? deadline : undefined,
    todayISO: todayISO(),
    completedCount: history.filter((h) => h.done).length,
    missedCount: history.filter((h) => !h.done).length,
  });

  const complete = useCallback(
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
      await refresh();
    },
    [db, mode, refresh],
  );

  const suggestSmart = useCallback(async () => {
    const result = await draftSmart({ title });
    setSpecific(result.smart.specific);
    setMeasurable(result.smart.measurable);
    setAchievable(result.smart.achievable);
    setRelevant(result.smart.relevant);
    setSmartOpen(true);
    void updateGoal(db, goalId, {
      smartSpecific: result.smart.specific,
      smartMeasurable: result.smart.measurable,
      smartAchievable: result.smart.achievable,
      smartRelevant: result.smart.relevant,
    });
    Alert.alert(
      'Draft ready',
      result.source === 'remote'
        ? 'Generated with AI — review and edit anything.'
        : 'Offline coach draft (no AI key set) — review and edit anything.',
    );
  }, [db, goalId, title]);

  const saveSmart = useCallback(async () => {
    await updateGoal(db, goalId, { smartSpecific: specific, smartMeasurable: measurable, smartAchievable: achievable, smartRelevant: relevant });
    Alert.alert('Saved', 'SMART definition updated.');
  }, [db, goalId, specific, measurable, achievable, relevant]);

  const changeStatus = useCallback(
    async (next: GoalStatus) => {
      await updateGoal(db, goalId, { status: next });
      if (next === 'completed') {
        if (mode === 'game') {
          await addCoinTx(db, 100, 'Goal completed');
        }
        const won = await maybeAward(db, todayISO());
        if (won.length > 0) {
          Alert.alert('Achievement unlocked', won.map((w) => w.title).join(', '));
        }
      }
      await refresh();
    },
    [db, goalId, mode, refresh],
  );

  const extendDeadline = useCallback(async () => {
    const base = deadline.length > 0 ? deadline : todayISO();
    const next = addDaysISO(base, 7);
    setDeadline(next);
    await updateGoal(db, goalId, { deadline: next });
    await refresh();
  }, [db, goalId, deadline, refresh]);

  const abandon = useCallback(() => {
    Alert.alert('Abandon this goal?', 'It stays in your history as a conscious decision.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: () => void changeStatus('abandoned') },
    ]);
  }, [changeStatus]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()}>
            <ThemedText type="small">‹ Back</ThemedText>
          </Pressable>

          <ThemedText type="title">
            {STATUS_GLYPH[status]} {title}
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>
              Health: {STATUS_GLYPH[health.status]} {health.status.replace('_', ' ')} · Confidence:{' '}
              {CONFIDENCE_LABEL[health.confidence]}
            </ThemedText>
            {health.reasons.map((r) => (
              <ThemedText key={r} type="small">
                · {r}
              </ThemedText>
            ))}
          </ThemedView>

          <View style={styles.row}>
            {status === 'paused' ? (
              <Pressable style={styles.button} onPress={() => void changeStatus('healthy')}>
                <ThemedText type="small">Resume</ThemedText>
              </Pressable>
            ) : (
              <Pressable style={styles.button} onPress={() => void changeStatus('paused')}>
                <ThemedText type="small">Pause</ThemedText>
              </Pressable>
            )}
            <Pressable style={styles.button} onPress={() => void extendDeadline()}>
              <ThemedText type="small">+7 days</ThemedText>
            </Pressable>
            <Pressable style={styles.button} onPress={() => void changeStatus('completed')}>
              <ThemedText type="small">Mark done</ThemedText>
            </Pressable>
            <Pressable style={styles.button} onPress={abandon}>
              <ThemedText type="small">Abandon</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="small">SMART definition</ThemedText>
          {smartOpen ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <TextInput
                style={styles.input}
                value={specific}
                onChangeText={setSpecific}
                placeholder="Specific"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
              />
              <TextInput
                style={styles.input}
                value={measurable}
                onChangeText={setMeasurable}
                placeholder="Measurable"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
              />
              <TextInput
                style={styles.input}
                value={achievable}
                onChangeText={setAchievable}
                placeholder="Achievable"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
              />
              <TextInput
                style={styles.input}
                value={relevant}
                onChangeText={setRelevant}
                placeholder="Relevant"
                placeholderTextColor={Colors.light.textSecondary}
                multiline
              />
              <View style={styles.row}>
                <Pressable style={styles.button} onPress={() => void saveSmart()}>
                  <ThemedText type="small">Save</ThemedText>
                </Pressable>
                <Pressable style={styles.button} onPress={() => void suggestSmart()}>
                  <ThemedText type="small">✨ Suggest SMART</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ) : (
            <Pressable style={styles.button} onPress={() => setSmartOpen(true)}>
              <ThemedText type="small">{smartOpen ? '' : 'Edit / ✨ Suggest SMART'}</ThemedText>
            </Pressable>
          )}

          <ThemedText type="small">Milestones</ThemedText>
          <View style={styles.card}>
            {milestones.length === 0 ? (
              <ThemedText type="small">No milestones yet.</ThemedText>
            ) : (
              milestones.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() =>
                    void toggleMilestone(db, m.id, m.done !== 1).then(refresh)
                  }>
                  <ThemedText>{m.done === 1 ? `✅ ${m.title}` : `⬜ ${m.title}`}</ThemedText>
                </Pressable>
              ))
            )}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex]}
                value={newMilestone}
                onChangeText={setNewMilestone}
                placeholder="New milestone"
                placeholderTextColor={Colors.light.textSecondary}
              />
              <Pressable
                style={styles.button}
                onPress={() => {
                  if (newMilestone.trim().length === 0) return;
                  void addMilestone(db, { goalId, title: newMilestone.trim() }).then(async () => {
                    setNewMilestone('');
                    await refresh();
                  });
                }}>
                <ThemedText type="small">Add</ThemedText>
              </Pressable>
            </View>
          </View>

          <ThemedText type="small">Actions</ThemedText>
          <View style={styles.card}>
            {tasks.map((t) => (
              <View key={t.id} style={styles.taskRow}>
                <ThemedText style={styles.flex}>
                  {t.doneAt ? `✅ ${t.title}` : t.skipReason ? `❌ ${t.title}` : `⬜ ${t.title}`}
                </ThemedText>
                {!t.doneAt && !t.skipReason ? (
                  <View style={styles.row}>
                    <Pressable style={styles.button} onPress={() => void complete(t, true)}>
                      <ThemedText type="small">Done</ThemedText>
                    </Pressable>
                    <Pressable style={styles.button} onPress={() => void complete(t, false)}>
                      <ThemedText type="small">Not yet</ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex]}
                value={newTask}
                onChangeText={setNewTask}
                placeholder="New action (scheduled today)"
                placeholderTextColor={Colors.light.textSecondary}
              />
              <Pressable
                style={styles.button}
                onPress={() => {
                  if (newTask.trim().length === 0) return;
                  void addTask(db, {
                    title: newTask.trim(),
                    goalId,
                    scheduledDate: todayISO(),
                  }).then(async () => {
                    setNewTask('');
                    await refresh();
                  });
                }}>
                <ThemedText type="small">Add</ThemedText>
              </Pressable>
            </View>
          </View>

          <ThemedText type="small">History</ThemedText>
          <View style={styles.card}>
            {history.length === 0 ? (
              <ThemedText type="small">Nothing logged yet.</ThemedText>
            ) : (
              history.map((h, i) => (
                <ThemedText key={`${h.date}-${i}`} type="small">
                  {h.date} {h.done ? '✅' : `❌${h.reason ? ` (${h.reason.replace(/_/g, ' ')})` : ''}`}{' '}
                  {h.title}
                </ThemedText>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  card: {
    gap: Spacing.one,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundElement,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', alignItems: 'center' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flex: { flexShrink: 1, flexGrow: 1 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.textSecondary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  button: {
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
});
