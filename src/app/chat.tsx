import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { askCoach } from '@/engine/chatbrain';

interface Msg {
  role: 'user' | 'coach';
  text: string;
  source?: 'offline-coach' | 'ai';
}

export default function ChatScreen() {
  const db = useSQLiteContext();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'coach',
      text: 'Ask me about your Frog, at-risk goals, free time today, or your coins.',
      source: 'offline-coach',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (text.length === 0 || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const reply = await askCoach(db, text);
      setMessages((m) => [...m, { role: 'coach', text: reply.text, source: reply.source }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'coach', text: 'Something went wrong on my side. Try again?', source: 'offline-coach' },
      ]);
    } finally {
      setBusy(false);
    }
  }, [db, input, busy]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ThemedText type="title">Ask Becoming</ThemedText>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
            {messages.map((m, i) => (
              <ThemedView
                key={`${i}`}
                type={m.role === 'user' ? 'backgroundElement' : undefined}
                style={[styles.bubble, m.role === 'user' && styles.userBubble]}>
                <ThemedText>{m.text}</ThemedText>
                {m.role === 'coach' && m.source === 'offline-coach' ? (
                  <ThemedText type="small">offline coach — add an AI key in .env for full coaching</ThemedText>
                ) : null}
              </ThemedView>
            ))}
          </ScrollView>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={input}
              onChangeText={setInput}
              placeholder="What should my Frog be?"
              placeholderTextColor={Colors.light.textSecondary}
              onSubmitEditing={() => void send()}
            />
            <Pressable style={styles.primaryButton} onPress={() => void send()}>
              <ThemedText type="small">{busy ? '…' : 'Send'}</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  grow: { flexShrink: 1, flexGrow: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.two },
  bubble: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  userBubble: { backgroundColor: Colors.dark.backgroundSelected },
  row: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, alignItems: 'center' },
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
