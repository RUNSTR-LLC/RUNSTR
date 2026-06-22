/**
 * RewardBoltToast
 * The reward notification itself — a lightning bolt that drops in from the top,
 * flickers like a real strike, sends out a shockwave ring on impact, and glows,
 * with the reward amount counting up beneath it. No card, no box: just the bolt
 * and the text on a transparent background.
 *
 * Brand-safe: orange bolt on transparent, theme palette only, no confetti.
 */

import { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { theme } from '../../styles/theme';

// Classic "flash" bolt silhouette, viewBox 0 0 24 24.
const BOLT_PATH = 'M7 2v11h3v9l7-12h-4l4-8z';
const BOLT_SIZE = 72;

// Feathered dark halo behind the bolt — darkens bright backgrounds with no
// hard edge, and is effectively invisible on the dark workout/summary screens.
const HALO_W = 300;
const HALO_H = 210;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface RewardBoltToastProps {
  text1?: string;
  text2?: string;
  /** Changes on every show() so the animation replays even when the toast
   *  component instance is reused by the toast library. */
  nonce?: number;
}

// Pull a leading number out of "50 earned" so we can count it up.
const parseAmount = (text?: string): { target: number; suffix: string } | null => {
  const match = (text || '').match(/^(\d[\d,]*)\s*(.*)$/);
  if (!match) return null;
  return { target: parseInt(match[1].replace(/,/g, ''), 10), suffix: match[2] };
};

export const RewardBoltToast = ({ text1, text2, nonce }: RewardBoltToastProps) => {
  const translateY = useSharedValue(-50);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const shock = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textShift = useSharedValue(14);
  const count = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  const parsed = parseAmount(text1);

  useEffect(() => {
    // Reset to the pre-animation state so a reused instance replays cleanly.
    translateY.value = -50;
    scale.value = 0.4;
    opacity.value = 0;
    glow.value = 0;
    shock.value = 0;
    textOpacity.value = 0;
    textShift.value = 14;
    count.value = 0;
    scrimOpacity.value = 0;

    // Dark scrim fades in fast so the bolt reads on any background.
    scrimOpacity.value = withTiming(1, { duration: 150 });

    // Bolt drops in: fall with a bounce, scale up and settle.
    translateY.value = withSequence(
      withTiming(10, { duration: 340, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 200, easing: Easing.inOut(Easing.quad) })
    );
    scale.value = withSequence(
      withTiming(1.2, { duration: 340, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 })
    );
    // Lightning flicker: blink in rather than a smooth fade.
    opacity.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0.3, { duration: 50 }),
      withTiming(1, { duration: 60 }),
      withTiming(0.5, { duration: 50 }),
      withTiming(1, { duration: 90 })
    );
    // Shockwave ring expands outward as the bolt lands, twice.
    shock.value = withDelay(
      300,
      withRepeat(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), 2, false)
    );
    // Glow pulses a few times then rests.
    glow.value = withDelay(
      340,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420 }),
          withTiming(0.2, { duration: 420 })
        ),
        3,
        false
      )
    );
    // Amount fades up and counts up just after the bolt lands.
    textOpacity.value = withDelay(320, withTiming(1, { duration: 300 }));
    textShift.value = withDelay(
      320,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) })
    );
    if (parsed) {
      count.value = withDelay(
        320,
        withTiming(parsed.target, { duration: 750, easing: Easing.out(Easing.cubic) })
      );
    }
    // Replay whenever a new show() arrives (nonce changes), not just on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const boltStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.4,
    transform: [{ scale: 1 + glow.value * 0.6 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - shock.value) * 0.5,
    transform: [{ scale: 0.5 + shock.value * 1.8 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textShift.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value * 0.85,
  }));

  const countProps = useAnimatedProps(() => ({
    text: `${Math.round(count.value)} ${parsed?.suffix ?? ''}`,
    // defaultValue keeps types happy; text drives the actual content.
    defaultValue: '',
  })) as any;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.content}>
        <Animated.View style={[styles.halo, scrimStyle]} pointerEvents="none">
          <Svg width={HALO_W} height={HALO_H}>
            <Defs>
              <RadialGradient id="rewardHalo" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.8" />
                <Stop offset="0.5" stopColor="#000000" stopOpacity="0.4" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width={HALO_W} height={HALO_H} fill="url(#rewardHalo)" />
          </Svg>
        </Animated.View>

        <View style={styles.boltWrap}>
          <Animated.View
            style={[
              styles.ring,
              ringStyle,
              { width: BOLT_SIZE, height: BOLT_SIZE, borderRadius: BOLT_SIZE / 2 },
            ]}
          />
          <Animated.View
            style={[
              styles.glow,
              glowStyle,
              { width: BOLT_SIZE, height: BOLT_SIZE, borderRadius: BOLT_SIZE / 2 },
            ]}
          />
          <Animated.View style={boltStyle}>
            <Svg width={BOLT_SIZE} height={BOLT_SIZE} viewBox="0 0 24 24">
              <Path d={BOLT_PATH} fill={theme.colors.orangeDeep} />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View style={[styles.textWrap, textStyle]}>
          {parsed ? (
            <AnimatedTextInput
              style={styles.amount}
              editable={false}
              underlineColorAndroid="transparent"
              animatedProps={countProps}
            />
          ) : (
            !!text1 && <Text style={styles.amount}>{text1}</Text>
          )}
          {!!text2 && <Text style={styles.sub}>{text2}</Text>}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 18,
    paddingBottom: 16,
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltWrap: {
    width: BOLT_SIZE,
    height: BOLT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: theme.colors.orangeDeep,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.orangeBright,
    backgroundColor: 'transparent',
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  amount: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    minWidth: 200,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

export default RewardBoltToast;
