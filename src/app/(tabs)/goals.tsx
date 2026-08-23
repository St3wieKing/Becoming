import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Difficulty, Goal, Priority } from '@/core/types';
import { STATUS_GLYPH } from '@/core/ui';
import { todayISO } from '@/core/util';
import { addTask, createGoal, listGoals } from '@/db/repo';

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'someday'];
const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'hard', 'extreme'];

export default function GoalsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [firstAction, setFirstAction] = useState('');
  const [priorityIdx, setPriorityIdx] = useState(2);
  const [difficultyIdx, setDifficultyIdx] = useState(1);

  const load = useCallback(async () => {
    setGoals(await listGoals(db));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async () => {
    if (title.trim().length === 0) return;
    const goalId = await createGoal(db, {
      title: title.trim(),
      priority: PRIORITIES[priorityIdx] ?? 'medium',
      difficulty: DIFFICULTIES[difficultyIdx] ?? 'moderate',
      deadline: deadline.trim().length > 0 ? deadline.trim() : undefined,
    });
    if (firstAction.trim().length > 0) {
      await addTask(db, {
        title: firstAction.trim(),
        goalId,
        scheduledDate: todayISO(),
      });
    }
    setTitle('');
    setDeadline('');
    setFirstAction('');
    await load();
  }, [db, title, deadline, firstAction, priorityIdx, difficultyIdx, load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          ListHeaderComponent={
            <View style={styles.gap}>
              <ThemedText type="title">Goals</ThemedText>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText>New goal</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="What do you want to achieve?"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
                <View style={styles.row}>
                  <Pressable
                    style={styles.chip}
                    onPress={() => setPriorityIdx((i) => (i + 1) % PRIORITIES.length)}>
                    <ThemedText type="small">Priority: {PRIORITIES[priorityIdx]}</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.chip}
                    onPress={() => setDifficultyIdx((i) => (i + 1) % DIFFICULTIES.length)}>
                    <ThemedText type="small">Difficulty: {DIFFICULTIES[difficultyIdx]}</ThemedText>
                  </Pressable>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Deadline YYYY-MM-DD (optional)"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={deadline}
                  onChangeText={setDeadline}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="First action today (optional)"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={firstAction}
                  onChangeText={setFirstAction}
                />
                <Pressable style={styles.primaryButton} onPress={() => void submit()}>
                  <ThemedText type="small">Create goal</ThemedText>
                </Pressable>
              </ThemedView>

              <ThemedText type="small">Your goals</ThemedText>
            </View>
          }
          data={goals}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/goal/${item.id}`)}>
              <View style={styles.goalRow}>
                <ThemedText>
                  {STATUS_GLYPH[item.status]} {item.title}
                </ThemedText>
                <ThemedText type="small">
                  {item.priority}
                  {item.deadline ? ` · by ${item.deadline}` : ''}
                </ThemedText>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.content}
          ListEmptyComponent={<ThemedText>You haven&apos;t created a goal yet.</ThemedText>}
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
  gap: { gap: Spacing.two },
  card: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundElement,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', alignItems: 'center' },
  chip: {
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.textSecondary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  goalRow: { alignSelf: 'stretch', flexDirection: 'column', paddingVertical: Spacing.one, gap: 2 },
});
