import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { coinBalance } from '@/db/repo';
import { useSettings } from '@/state/settings';

export default function CompanionScreen() {
  const db = useSQLiteContext();
  const mode = useSettings((s) => s.mode);
  const [coins, setCoins] = useState(0);

  const load = useCallback(async () => {
    setCoins(await coinBalance(db));
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  if (mode !== 'game') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">Companion</ThemedText>
          <ThemedText>Game Mode is off. Enable it in Profile to meet your companion.</ThemedText>
          <View style={{ height: BottomTabInset }} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Ember</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="title">🐲</ThemedText>
          <ThemedText>Dragon · Base form</ThemedText>
          <ThemedText type="small">State: Healthy</ThemedText>
          <ThemedText type="small">{coins} coins in your ledger</ThemedText>
          <ThemedText type="small">
            Ember grows as you complete meaningful work. Evolution comes from milestones, not
            grinding.
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
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  card: {
    gap: Spacing.one,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
});
