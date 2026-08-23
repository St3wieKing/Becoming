import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import type { AIControlMode } from '@/core/types';
import { clearFrogReminder, setFrogReminder } from '@/core/notifs';
import { cloud, cloudConfigured } from '@/backend/cloud';
import { createVision, kvGet, kvSet, primaryVision, updateVision } from '@/db/repo';
import { useSettings } from '@/state/settings';

const AI_MODES: AIControlMode[] = ['manual', 'assisted', 'autopilot'];

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const mode = useSettings((s) => s.mode);
  const aiControl = useSettings((s) => s.aiControl);
  const showLeaderboards = useSettings((s) => s.showLeaderboards);
  const setMode = useSettings((s) => s.setMode);
  const setAIControl = useSettings((s) => s.setAIControl);
  const setShowLeaderboards = useSettings((s) => s.setShowLeaderboards);

  const [visionId, setVisionId] = useState<string | null>(null);
  const [vTitle, setVTitle] = useState('');
  const [vNotes, setVNotes] = useState('');
  const [frogReminderOn, setFrogReminderOn] = useState(false);
  const [remTime, setRemTime] = useState('08:00');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    const v = await primaryVision(db);
    if (v) {
      setVisionId(v.id);
      setVTitle(v.title);
      setVNotes(v.notes ?? '');
    }
    setFrogReminderOn((await kvGet(db, 'notif_frog')) === '1');
    setRemTime((await kvGet(db, 'notif_time')) ?? '08:00');
    const supabase = cloud();
    if (supabase) {
      try {
        const session = await supabase.auth.getSession();
        setSessionEmail(session.data.session?.user.email ?? null);
      } catch {}
    }
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistMode = useCallback(
    async (next: ReturnType<typeof useSettings.getState>['mode']) => {
      setMode(next);
      await kvSet(db, 'settings', JSON.stringify({ mode: next }));
    },
    [db, setMode],
  );

  const saveVision = useCallback(async () => {
    if (vTitle.trim().length === 0 && visionId === null) return;
    if (visionId) {
      await updateVision(db, visionId, { title: vTitle.trim(), notes: vNotes });
    } else {
      const id = await createVision(db, { title: vTitle.trim(), notes: vNotes });
      setVisionId(id);
    }
    Alert.alert('Saved', 'Future Me updated.');
  }, [db, visionId, vTitle, vNotes]);

  const toggleReminder = useCallback(
    async (on: boolean) => {
      if (on) {
        const ok = await setFrogReminder(remTime);
        if (!ok) {
          Alert.alert('Permission needed', 'Enable notifications for Becoming in system settings.');
          return;
        }
        await kvSet(db, 'notif_frog', '1');
        await kvSet(db, 'notif_time', remTime);
        setFrogReminderOn(true);
      } else {
        await clearFrogReminder();
        await kvSet(db, 'notif_frog', '0');
        setFrogReminderOn(false);
      }
    },
    [db, remTime],
  );

  const authAction = useCallback(
    async (kind: 'in' | 'up' | 'out') => {
      const supabase = cloud();
      if (!supabase) return;
      try {
        if (kind === 'out') {
          await supabase.auth.signOut();
          setSessionEmail(null);
          return;
        }
        const creds = { email: email.trim(), password };
        const res =
          kind === 'in'
            ? await supabase.auth.signInWithPassword(creds)
            : await supabase.auth.signUp(creds);
        if (res.error) {
          Alert.alert('Auth error', res.error.message);
          return;
        }
        setSessionEmail(res.data.session?.user.email ?? email.trim());
        Alert.alert(kind === 'up' ? 'Account created' : 'Signed in');
      } catch (e) {
        Alert.alert('Auth failed', String(e));
      }
    },
    [email, password],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Profile</ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>Future Me</ThemedText>
            <TextInput
              style={styles.input}
              value={vTitle}
              onChangeText={setVTitle}
              placeholder="Who are you becoming?"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={vNotes}
              onChangeText={setVNotes}
              placeholder="Notes — what matters most right now?"
              placeholderTextColor={Colors.light.textSecondary}
              multiline
            />
            <Pressable style={styles.primaryButton} onPress={() => void saveVision()}>
              <ThemedText type="small">Save Future Me</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.rowBetween}>
              <ThemedText>Game Mode</ThemedText>
              <Switch value={mode === 'game'} onValueChange={(v) => void persistMode(v ? 'game' : 'serious')} />
            </View>
            <ThemedText type="small">
              In Serious Mode creatures, coins and game notifications are hidden.
            </ThemedText>
          </ThemedView>

          {mode === 'game' ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.rowBetween}>
                <ThemedText>Show leaderboards</ThemedText>
                <Switch
                  value={showLeaderboards}
                  onValueChange={(v) => {
                    setShowLeaderboards(v);
                    void kvSet(db, 'settings', JSON.stringify({ mode: useSettings.getState().mode }));
                  }}
                />
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
            <View style={styles.rowBetween}>
              <ThemedText>Daily Frog reminder</ThemedText>
              <Switch value={frogReminderOn} onValueChange={(v) => void toggleReminder(v)} />
            </View>
            {frogReminderOn ? (
              <>
                <TextInput
                  style={styles.input}
                  value={remTime}
                  onChangeText={(t) => {
                    setRemTime(t);
                    void kvSet(db, 'notif_time', t);
                  }}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.light.textSecondary}
                  autoCapitalize="none"
                />
                <ThemedText type="small">Change the time, then toggle off/on to reschedule.</ThemedText>
              </>
            ) : null}
            <ThemedText type="small">Quiet hours and adaptive timing come with the polish phase.</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>Cloud &amp; Groups</ThemedText>
            {!cloudConfigured() ? (
              <ThemedText type="small">
                Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then run the SQL in
                supabase/schema.sql inside your Supabase project to enable accounts and groups.
              </ThemedText>
            ) : sessionEmail ? (
              <>
                <ThemedText type="small">Signed in as {sessionEmail}</ThemedText>
                <Pressable style={styles.primaryButton} onPress={() => void authAction('out')}>
                  <ThemedText type="small">Sign out</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.light.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={Colors.light.textSecondary}
                  secureTextEntry
                />
                <View style={styles.row}>
                  <Pressable style={styles.primaryButton} onPress={() => void authAction('in')}>
                    <ThemedText type="small">Sign in</ThemedText>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={() => void authAction('up')}>
                    <ThemedText type="small">Create account</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText>About</ThemedText>
            <ThemedText type="small">
              Becoming v0.3 — local-first by design. Your goals live on this device unless you connect a
              cloud account above.
            </ThemedText>
          </ThemedView>
          <View style={{ height: BottomTabInset }} />
        </ScrollView>
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
  },
  content: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  card: {
    gap: Spacing.one,
    alignSelf: 'stretch',
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundElement,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    opacity: 0.6,
  },
  chipActive: { opacity: 1 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.textSecondary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
