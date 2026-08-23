import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { fmtMin, parseHHMM, todayISO } from '@/core/util';
import type { EventItem } from '@/core/types';
import { addEvent, upcomingEvents } from '@/db/repo';

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const load = useCallback(async () => {
    setEvents(await upcomingEvents(db, todayISO()));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async () => {
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Calendar</ThemedText>

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
          <Pressable style={styles.primaryButton} onPress={() => void submit()}>
            <ThemedText type="small">Add to schedule</ThemedText>
          </Pressable>
        </ThemedView>

        {events.length === 0 ? (
          <ThemedText>Your schedule is empty.</ThemedText>
        ) : (
          <FlatList
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
          />
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
  card: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
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
  eventRow: { alignSelf: 'stretch', flexDirection: 'column', paddingVertical: Spacing.one, gap: 2 },
});
