import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import type { EventItem } from '@/core/types';
import { describeSlot, eventsAsBusy, findSlots, parsePattern } from '@/core/schedule';
import { fmtMin, parseHHMM, todayISO } from '@/core/util';
import { addAvailability, addEvent, listAvailability, removeAvailability, upcomingEvents } from '@/db/repo';

const DURATIONS = [15, 30, 45, 60];

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [windows, setWindows] = useState<{ id: string; label: string }[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [pattern, setPattern] = useState('');
  const [duration, setDuration] = useState(30);

  const load = useCallback(async () => {
    setEvents(await upcomingEvents(db, todayISO()));
    setWindows(await listAvailability(db));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitEvent = useCallback(async () => {
    const startMin = parseHHMM(start);
    const endMin = parseHHMM(end);
    if (title.trim().length === 0 || startMin === null || endMin === null || endMin <= startMin) {
      return;
    }
    await addEvent(db, { title: title.trim(), date: date.trim() || todayISO(), startMin, endMin });
    setTitle('');
    setStart('');
    setEnd('');
    await load();
  }, [db, title, date, start, end, load]);

  const submitPattern = useCallback(async () => {
    const parsed = parsePattern(pattern);
    if (!parsed) {
      Alert.alert('Try a pattern', 'Examples: "mon-fri 18:00-21:00", "weekends 09:00-12:00", "daily 07:00-08:00"');
      return;
    }
    await addAvailability(db, {
      label: pattern.trim(),
      days: parsed.days,
      startMin: parsed.startMin,
      endMin: parsed.endMin,
    });
    setPattern('');
    await load();
  }, [db, pattern, load]);

  const suggestSlot = useCallback(
    async (durationMin: number) => {
      const dow = new Date().getDay();
      const today = todayISO();
      const todaysWindows = (await listAvailability(db))
        .filter((w) => w.days.includes(dow))
        .map((w) => ({ startMin: w.startMin, endMin: w.endMin }));
      if (todaysWindows.length === 0) {
        Alert.alert('No availability yet', 'Add an availability window first, like "mon-fri 18:00-21:00".');
        return;
      }
      const busyToday = eventsAsBusy((await upcomingEvents(db, today)).filter((e) => e.date === today));
      const slots = findSlots(todaysWindows, busyToday, durationMin).slice(0, 3);
      if (slots.length === 0) {
        Alert.alert('No opening today', 'Every free block is shorter than the session. Try tomorrow or shorten it.');
        return;
      }
      const slot = slots[0];
      await addEvent(db, { title: 'Focus time', date: today, startMin: slot.startMin, endMin: slot.endMin });
      await load();
      Alert.alert('Scheduled', `Focus time added at ${describeSlot(slot)}.`);
    },
    [db, load],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          ListHeaderComponent={
            <View style={styles.gap}>
              <ThemedText type="title">Calendar</ThemedText>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText>Find time for focus</ThemedText>
                <View style={styles.row}>
                  {DURATIONS.map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.chip, duration === d && styles.chipActive]}
                      onPress={() => setDuration(d)}>
                      <ThemedText type="small">{d} min</ThemedText>
                    </Pressable>
                  ))}
                  <Pressable style={styles.primaryButton} onPress={() => void suggestSlot(duration)}>
                    <ThemedText type="small">Find slot</ThemedText>
                  </Pressable>
                </View>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText>Add event</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Title"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.light.textSecondary}
                    value={date}
                    onChangeText={setDate}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={[styles.input, styles.flex]}
                    placeholder="Start HH:MM"
                    placeholderTextColor={Colors.light.textSecondary}
                    value={start}
                    onChangeText={setStart}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={[styles.input, styles.flex]}
                    placeholder="End HH:MM"
                    placeholderTextColor={Colors.light.textSecondary}
                    value={end}
                    onChangeText={setEnd}
                    autoCapitalize="none"
                  />
                </View>
                <Pressable style={styles.primaryButton} onPress={() => void submitEvent()}>
                  <ThemedText type="small">Add to schedule</ThemedText>
                </Pressable>
              </ThemedView>

              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText>When are you usually free?</ThemedText>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.flex]}
                    placeholder='e.g. "mon-fri 18:00-21:00"'
                    placeholderTextColor={Colors.light.textSecondary}
                    value={pattern}
                    onChangeText={setPattern}
                    autoCapitalize="none"
                  />
                  <Pressable style={styles.primaryButton} onPress={() => void submitPattern()}>
                    <ThemedText type="small">Save</ThemedText>
                  </Pressable>
                </View>
                {windows.map((w) => (
                  <Pressable key={w.id} onPress={() => void removeAvailability(db, w.id).then(load)}>
                    <ThemedText type="small">🗑 {w.label}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>

              <ThemedText type="small">Upcoming</ThemedText>
            </View>
          }
          data={events}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <View style={styles.eventRow}>
              <ThemedText>{item.title}</ThemedText>
              <ThemedText type="small">
                {item.date} · {fmtMin(item.startMin)}–{fmtMin(item.endMin)}
              </ThemedText>
            </View>
          )}
          contentContainerStyle={styles.content}
          ListEmptyComponent={<ThemedText>Your schedule is empty.</ThemedText>}
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
  flex: { flexShrink: 1, flexGrow: 1 },
  chip: {
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    opacity: 0.6,
  },
  chipActive: { opacity: 1 },
  input: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.textSecondary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  primaryButton: {
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  eventRow: { alignSelf: 'stretch', flexDirection: 'column', paddingVertical: Spacing.one, gap: 2 },
});
