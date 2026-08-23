import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { uid, todayISO, daysBetween } from '@/core/util';
import { SPECIES, SPECIES_GLYPH } from '@/core/ui';
import type { Species } from '@/core/ui';
import {
  coinBalance,
  distinctDoneDates,
  getCreature,
  saveCreature,
  unlockedAchievements,
} from '@/db/repo';
import { ACHIEVEMENTS } from '@/engine/achievements';
import { useSettings } from '@/state/settings';

type CreatureState = 'healthy' | 'tired' | 'weak' | 'dormant';

function deriveState(daysSinceActive: number): CreatureState {
  if (daysSinceActive <= 1) return 'healthy';
  if (daysSinceActive <= 3) return 'tired';
  if (daysSinceActive <= 5) return 'weak';
  return 'dormant';
}

export default function CompanionScreen() {
  const db = useSQLiteContext();
  const mode = useSettings((s) => s.mode);
  const [creature, setCreature] = useState<{
    id: string;
    name: string;
    species: string;
    revivals: number;
  } | null>(null);
  const [coins, setCoins] = useState(0);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [daysIdle, setDaysIdle] = useState(999);
  const [picked, setPicked] = useState<Species | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    const c = await getCreature(db);
    if (!c) {
      setCreature(null);
      return;
    }
    setCreature({ id: c.id, name: c.name, species: c.species, revivals: c.revivals });
    const dates = await distinctDoneDates(db);
    setDaysIdle(dates.length > 0 ? daysBetween(dates[0], todayISO()) : 999);
    setCoins(await coinBalance(db));
    setUnlocked(await unlockedAchievements(db));
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

  if (!creature) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">Choose a companion</ThemedText>
          <ThemedText type="small">
            Your companion grows when you do meaningful work. It never dies from one hard day.
          </ThemedText>
          <View style={styles.grid}>
            {SPECIES.map((s) => (
              <Pressable
                key={s}
                style={[styles.speciesCard, picked === s && styles.picked]}
                onPress={() => {
                  setPicked(s);
                  setName('');
                }}>
                <ThemedText style={styles.bigGlyph}>{SPECIES_GLYPH[s]}</ThemedText>
                <ThemedText type="small">{s}</ThemedText>
              </Pressable>
            ))}
          </View>
          {picked ? (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex]}
                value={name}
                onChangeText={setName}
                placeholder={`Name your ${picked.toLowerCase()}`}
                placeholderTextColor={Colors.light.textSecondary}
              />
              <Pressable
                style={styles.primaryButton}
                onPress={() =>
                  void saveCreature(db, {
                    id: uid(),
                    name: name.trim().length > 0 ? name.trim() : picked,
                    species: picked,
                    state: 'healthy',
                    stage: 'base',
                    revivals: 0,
                    lastActiveDate: todayISO(),
                  }).then(load)
                }>
                <ThemedText type="small">Begin</ThemedText>
              </Pressable>
            </View>
          ) : null}
          <View style={{ height: BottomTabInset }} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const state = deriveState(daysIdle);
  const canRevive = state === 'dormant' && creature.revivals < 2;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">
          {SPECIES_GLYPH[creature.species as Species] ?? '✨'} {creature.name}
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>
            {creature.species} · Base form · {state}
          </ThemedText>
          <ThemedText type="small">{coins} coins in your ledger</ThemedText>
          {state === 'dormant' ? (
            canRevive ? (
              <>
                <ThemedText type="small">
                  Neglect makes {creature.name} dormant. You can revive it — but only twice.
                </ThemedText>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() =>
                    void getCreature(db).then(async (c) => {
                      if (!c) return;
                      await saveCreature(db, {
                        ...c,
                        revivals: c.revivals + 1,
                        lastActiveDate: todayISO(),
                      });
                      await load();
                    })
                  }>
                  <ThemedText type="small">Revive</ThemedText>
                </Pressable>
              </>
            ) : (
              <ThemedText type="small">
                {creature.name} has faded into your collection history. A new companion can carry on.
              </ThemedText>
            )
          ) : (
            <ThemedText type="small">Complete meaningful work to keep {creature.name} thriving.</ThemedText>
          )}
        </ThemedView>

        <ThemedText type="small">Achievements</ThemedText>
        <View style={styles.card}>
          {ACHIEVEMENTS.map((a) => (
            <ThemedText key={a.key}>
              {unlocked.includes(a.key) ? '🏆' : '⬜'} {a.title} — {a.description}
            </ThemedText>
          ))}
        </View>
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
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  card: {
    gap: Spacing.one,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundElement,
    padding: Spacing.three,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  speciesCard: {
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    padding: Spacing.two,
    alignItems: 'center',
    minWidth: 88,
    gap: Spacing.one,
  },
  picked: { opacity: 1, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.light.text },
  bigGlyph: { fontSize: 32 },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  flex: { flexShrink: 1, flexGrow: 1 },
  input: {
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
});
