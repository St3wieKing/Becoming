import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { createVision, kvSet } from '@/db/repo';
import { useSettings } from '@/state/settings';
import type { Mode } from '@/core/types';

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const setMode = useSettings((s) => s.setMode);
  const [vision, setVision] = useState('');
  const [who, setWho] = useState('');
  const [puttingOff, setPuttingOff] = useState('');

  const finish = useCallback(
    async (mode: Mode) => {
      if (vision.trim().length > 0) {
        await createVision(db, {
          title: vision.trim(),
          notes: [who.trim(), puttingOff.trim()].filter((s) => s.length > 0).join('\n'),
        });
      }
      setMode(mode);
      await kvSet(db, 'settings', JSON.stringify({ mode }));
      await kvSet(db, 'onboarded', '1');
      router.replace('/(tabs)');
    },
    [db, vision, who, puttingOff, setMode, router],
  );

  const inputStyle = [styles.input];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <ThemedText type="title">What could your life look like?</ThemedText>
            <ThemedText>
              Imagine you actually accomplished the things you have been putting off. Describe it —
              this becomes your Future Me. It is a draft; you can change it anytime.
            </ThemedText>

            <ThemedText type="small">What do you want your life to look like in 5 years?</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Financially free and running my own studio…"
              placeholderTextColor={Colors.light.textSecondary}
              value={vision}
              onChangeText={setVision}
              multiline
            />
            <ThemedText type="small">Who do you want to become?</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Someone who keeps promises to themselves"
              placeholderTextColor={Colors.light.textSecondary}
              value={who}
              onChangeText={setWho}
              multiline
            />
            <ThemedText type="small">What have you been putting off?</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Getting fit, learning Spanish, finishing my book…"
              placeholderTextColor={Colors.light.textSecondary}
              value={puttingOff}
              onChangeText={setPuttingOff}
              multiline
            />

            <ThemedText type="small">How do you want your Becoming experience?</ThemedText>
            <View style={styles.row}>
              <Pressable style={[styles.modeButton, styles.flex]} onPress={() => void finish('serious')}>
                <ThemedText>Serious</ThemedText>
                <ThemedText type="small">Pure focus. No game elements.</ThemedText>
              </Pressable>
              <Pressable style={[styles.modeButton, styles.flex]} onPress={() => void finish('game')}>
                <ThemedText>Adventure</ThemedText>
                <ThemedText type="small">Add a companion and rewards.</ThemedText>
              </Pressable>
            </View>
            <Pressable onPress={() => void finish(useSettings.getState().mode)}>
              <ThemedText type="small">Skip for now</ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.two },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.textSecondary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  modeButton: {
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
