import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import type { AIControlMode } from '@/core/types';
import { useSettings } from '@/state/settings';

const AI_MODES: AIControlMode[] = ['manual', 'assisted', 'autopilot'];

export default function ProfileScreen() {
  const mode = useSettings((s) => s.mode);
  const aiControl = useSettings((s) => s.aiControl);
  const showLeaderboards = useSettings((s) => s.showLeaderboards);
  const setMode = useSettings((s) => s.setMode);
  const setAIControl = useSettings((s) => s.setAIControl);
  const setShowLeaderboards = useSettings((s) => s.setShowLeaderboards);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Profile</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.rowBetween}>
            <ThemedText>Game Mode</ThemedText>
            <Switch value={mode === 'game'} onValueChange={(v) => setMode(v ? 'game' : 'serious')} />
          </View>
          <ThemedText type="small">
            In Serious Mode creatures, coins and game notifications are hidden.
          </ThemedText>
        </ThemedView>

        {mode === 'game' ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.rowBetween}>
              <ThemedText>Show leaderboards</ThemedText>
              <Switch value={showLeaderboards} onValueChange={setShowLeaderboards} />
            </View>
          </ThemedView>
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>AI Control</ThemedText>
          <View style={styles.row}>
            {AI_MODES.map((m) => (
              <Pressable
                key={m}
                style={[styles.chip, aiControl === m && styles.chipActive]}
                onPress={() => setAIControl(m)}>
                <ThemedText type="small">{m}</ThemedText>
              </Pressable>
            ))}
          </View>
          <ThemedText type="small">
            Manual: AI only suggests. Assisted: AI proposes changes you approve. Autopilot: AI may
            reschedule within your rules.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>About</ThemedText>
          <ThemedText type="small">
            Becoming v0.1.0 — local-first build. All data currently lives on this device only.
          </ThemedText>
        </ThemedView>
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
    gap: Spacing.one,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipActive: { opacity: 1 },
});
