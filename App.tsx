import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type SentencePuzzle = {
  id: number;
  text: string;
  incorrectWord: string;
  issue: 'Comma Splice' | 'SVA Error';
};

const PUZZLES: SentencePuzzle[] = [
  {
    id: 1,
    text: 'Libraries plays a vital role in modern education.',
    incorrectWord: 'plays',
    issue: 'SVA Error',
  },
  {
    id: 2,
    text: 'The research was compelling, it changed policy nationwide.',
    incorrectWord: 'it',
    issue: 'Comma Splice',
  },
  {
    id: 3,
    text: 'Social media create anxiety among teenagers.',
    incorrectWord: 'create',
    issue: 'SVA Error',
  },
  {
    id: 4,
    text: 'Urbanization is rapid, many forests are disappearing.',
    incorrectWord: 'many',
    issue: 'Comma Splice',
  },
  {
    id: 5,
    text: 'The government protects innovation through funding grants.',
    incorrectWord: 'protects',
    issue: 'SVA Error',
  },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DROP_START_Y = -120;
const DROP_END_Y = SCREEN_HEIGHT * 0.34;

const normalize = (word: string) => word.replace(/[^a-zA-Z]/g, '').toLowerCase();

const App = () => {
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [combo, setCombo] = useState(0);
  const [smashWord, setSmashWord] = useState<string | null>(null);

  const dropY = useSharedValue(DROP_START_Y);
  const cardScale = useSharedValue(1);
  const screenShake = useSharedValue(0);

  const currentPuzzle = useMemo(() => PUZZLES[index % PUZZLES.length], [index]);

  useEffect(() => {
    setSmashWord(null);
    dropY.value = DROP_START_Y;
    cardScale.value = 0.96;
    dropY.value = withSpring(DROP_END_Y, {
      damping: 14,
      stiffness: 90,
      mass: 0.8,
    });
    cardScale.value = withSpring(1, {
      damping: 12,
      stiffness: 130,
    });
  }, [cardScale, dropY, index]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dropY.value }, { scale: cardScale.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenShake.value }],
  }));

  const goNext = useCallback(() => {
    setTimeout(() => {
      setIndex((prev) => prev + 1);
      setCombo(0);
    }, 280);
  }, []);

  const handleWrongTap = useCallback(async () => {
    setStreak(0);
    setCombo(0);
    cardScale.value = withSequence(
      withTiming(0.96, { duration: 70 }),
      withSpring(1, { damping: 9, stiffness: 160 }),
    );

    screenShake.value = withSequence(
      withTiming(-11, { duration: 40 }),
      withTiming(11, { duration: 40 }),
      withTiming(-8, { duration: 35 }),
      withTiming(8, { duration: 35 }),
      withTiming(0, { duration: 35 }),
    );

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [cardScale, screenShake]);

  const handleCorrectTap = useCallback(
    async (word: string) => {
      setSmashWord(word);
      setStreak((prev) => prev + 1);
      setCombo((prev) => prev + 10);

      cardScale.value = withSequence(
        withTiming(1.07, { duration: 90 }),
        withSpring(0.85, { damping: 11, stiffness: 180 }),
        withTiming(0, { duration: 170 }),
      );

      screenShake.value = withSequence(
        withTiming(-16, { duration: 35 }),
        withTiming(16, { duration: 35 }),
        withTiming(-10, { duration: 30 }),
        withTiming(10, { duration: 30 }),
        withTiming(0, { duration: 30 }),
      );

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      goNext();
    },
    [cardScale, goNext, screenShake],
  );

  const words = useMemo(() => currentPuzzle.text.split(' '), [currentPuzzle.text]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.screen, shakeStyle]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Syntax Smasher</Text>
          <Text style={styles.label}>Streak: {streak}</Text>
        </View>

        <Text style={styles.subLabel}>Issue: {currentPuzzle.issue}</Text>
        <Text style={styles.help}>Tap the broken grammar joint before it lands.</Text>

        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.sentenceWrap}>
            {words.map((word, idx) => {
              const cleanWord = normalize(word);
              const isTarget = cleanWord === normalize(currentPuzzle.incorrectWord);
              const wasSmashed = smashWord && normalize(smashWord) === cleanWord;

              return (
                <Animated.View
                  key={`${word}-${idx}`}
                  entering={FadeInDown.duration(120)}
                  exiting={FadeOut.duration(120)}
                >
                  <Pressable
                    style={[styles.wordChip, wasSmashed ? styles.smashedChip : undefined]}
                    onPress={() => (isTarget ? handleCorrectTap(word) : handleWrongTap())}
                  >
                    <Text style={[styles.wordText, wasSmashed ? styles.smashedText : undefined]}>
                      {word}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(200)} style={styles.footer}>
          <Text style={styles.comboText}>+{combo} Combo</Text>
          {streak >= 5 ? <Text style={styles.fireMode}>🔥 FIRE MODE ACTIVATED 🔥</Text> : null}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080B16',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#F7FAFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  label: {
    color: '#9AF9CF',
    fontWeight: '700',
    fontSize: 16,
  },
  subLabel: {
    color: '#F6B26B',
    fontSize: 15,
    marginTop: 12,
    fontWeight: '700',
  },
  help: {
    color: '#A9B2C5',
    marginTop: 6,
    fontSize: 14,
  },
  card: {
    marginTop: 24,
    backgroundColor: '#151A2D',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2F3B5D',
    minHeight: 180,
    padding: 16,
    shadowColor: '#7ED9FF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  sentenceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    backgroundColor: '#232C4A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4C5E93',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  wordText: {
    color: '#F7FAFF',
    fontWeight: '600',
  },
  smashedChip: {
    backgroundColor: '#2F111A',
    borderColor: '#FF5363',
  },
  smashedText: {
    color: '#FFAFB6',
    textDecorationLine: 'line-through',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 28,
    alignItems: 'center',
  },
  comboText: {
    color: '#7ED9FF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fireMode: {
    color: '#FF6A00',
    marginTop: 8,
    fontSize: 17,
    fontWeight: '900',
  },
});

export default App;
