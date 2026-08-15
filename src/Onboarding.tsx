import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, fontFamilyMedium } from './theme';

const BG = '#0D1117';
const TITLE = '#FFFFFF';
const SUBTITLE = '#C9D1D9';
const ACCENT = '#2E7CF6';
const DOT_INACTIVE = 'rgba(255,255,255,0.4)';
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.9)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 8,
};

const FADE_BANDS = 7;

const imgHome = require('../assets/onboarding_home.jpg');
const imgLog = require('../assets/onboarding_log.jpg');
const imgWidget = require('../assets/onboarding_widget.jpg');
const imgStreaks = require('../assets/onboarding_streaks.jpg');

type Slide = { key: string; image: number; title: string; subtitle: string };

const SLIDES: Slide[] = [
  {
    key: 'home',
    image: imgHome,
    title: 'Turn habits into a calendar of color.',
    subtitle: 'See your consistency at a glance.',
  },
  {
    key: 'log',
    image: imgLog,
    title: 'Log hours. Fill the grid.',
    subtitle: 'Every hour makes your progress visible.',
  },
  {
    key: 'widget',
    image: imgWidget,
    title: 'Your progress, right on your home screen.',
    subtitle: 'Track without opening the app.',
  },
  {
    key: 'streaks',
    image: imgStreaks,
    title: 'Build streaks. Keep going.',
    subtitle: 'See how far your consistency can take you.',
  },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function Fade({ height, fromBottom, maxOpacity }: { height: number; fromBottom: boolean; maxOpacity: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...(fromBottom ? { bottom: 0 } : { top: 0 }),
        height,
      }}
    >
      {Array.from({ length: FADE_BANDS }, (_, i) => {
        const t = fromBottom ? i : FADE_BANDS - 1 - i;
        const opacity = Math.pow(t / (FADE_BANDS - 1), 1.9) * maxOpacity;
        return (
          <View
            key={i}
            style={{ flex: 1, backgroundColor: `rgba(13,17,23,${opacity.toFixed(3)})` }}
          />
        );
      })}
    </View>
  );
}

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pageAnim = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const compact = height < 720;

  const titleSize = compact ? clamp(width * 0.075, 24, 28) : clamp(width * 0.082, 30, 36);
  const subtitleSize = compact ? clamp(width * 0.042, 13, 15) : clamp(width * 0.046, 15, 17);
  const textGap = compact ? 8 : clamp(height * 0.016, 10, 14);
  const dotsCtaGap = compact ? 14 : 18;
  const btnHeight = compact ? 48 : clamp(height * 0.07, 52, 56);
  const btnWidth = Math.min(width - 48, 340);
  const bottomPad = insets.bottom + (compact ? 12 : clamp(height * 0.03, 18, 28));
  const dotsAboveCta = 8 + dotsCtaGap;
  const textBlockBottom = bottomPad + btnHeight + dotsAboveCta + 6;
  const titleBlock = titleSize * 1.18;
  const subtitleBlock = subtitleSize * 1.55;
  const fadeHeight = textBlockBottom + titleBlock + textGap + subtitleBlock + 18;
  const topFadeHeight = insets.top + 90;

  useEffect(() => {
    pageAnim.setValue(0);
    Animated.timing(pageAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [page, pageAnim]);

  const goTo = (index: number) => {
    setPage(index);
    try {
      listRef.current?.scrollToIndex({ index, animated: true });
    } catch {
      // ignore layout errors on very first render
    }
  };

  const next = () => {
    if (page >= SLIDES.length - 1) {
      onFinish();
    } else {
      goTo(page + 1);
    }
  };

  const dotScale = (i: number) =>
    scrollX.interpolate({
      inputRange: [width * (i - 1), width * i, width * (i + 1)],
      outputRange: [1, 1.35, 1],
      extrapolate: 'clamp',
    });

  const dotOpacity = (i: number) =>
    scrollX.interpolate({
      inputRange: [width * (i - 1), width * i, width * (i + 1)],
      outputRange: [0.45, 1, 0.45],
      extrapolate: 'clamp',
    });

  const renderSlide = ({ item }: { item: Slide }) => {
    const imgOpacity = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    const imgScale = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] });
    const titleOpacity = pageAnim.interpolate({ inputRange: [0, 0.55], outputRange: [0, 1] });
    const titleTrans = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
    const subOpacity = pageAnim.interpolate({ inputRange: [0.2, 0.9], outputRange: [0, 1] });
    const subTrans = pageAnim.interpolate({ inputRange: [0.2, 1], outputRange: [12, 0] });

    return (
      <View style={{ width, height, backgroundColor: BG }}>
        <Animated.Image
          source={item.image}
          resizeMode="cover"
          style={{
            width,
            height,
            opacity: imgOpacity,
            transform: [{ scale: imgScale }],
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: textBlockBottom,
            alignItems: 'center',
          }}
        >
          <Animated.Text
            style={{
              color: TITLE,
              fontSize: titleSize,
              lineHeight: Math.round(titleSize * 1.18),
              fontFamily: fontFamilyMedium,
              textAlign: 'center',
              maxWidth: Math.min(width * 0.9, 360),
              ...SHADOW,
              opacity: titleOpacity,
              transform: [{ translateY: titleTrans }],
            }}
          >
            {item.title}
          </Animated.Text>
          <Animated.Text
            style={{
              color: SUBTITLE,
              fontSize: subtitleSize,
              lineHeight: Math.round(subtitleSize * 1.55),
              fontFamily: fontFamily,
              textAlign: 'center',
              maxWidth: Math.min(width * 0.86, 320),
              marginTop: textGap,
              ...SHADOW,
              opacity: subOpacity,
              transform: [{ translateY: subTrans }],
            }}
          >
            {item.subtitle}
          </Animated.Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        initialNumToRender={4}
        windowSize={5}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={e =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        style={{ flex: 1 }}
      />

      <Fade height={topFadeHeight} fromBottom={false} maxOpacity={0.4} />
      <Fade height={fadeHeight} fromBottom maxOpacity={0.96} />

      <Pressable
        testID="onb_skip"
        onPress={onFinish}
        hitSlop={12}
        style={({ pressed }) => [
          {
            position: 'absolute',
            top: insets.top + 6,
            right: 24,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 14,
            backgroundColor: 'rgba(13,17,23,0.5)',
            zIndex: 10,
            opacity: pressed ? 0.55 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: '#F0F6FC',
            fontSize: 14,
            fontFamily: fontFamilyMedium,
          }}
        >
          Skip
        </Text>
      </Pressable>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomPad,
          alignItems: 'center',
        }}
      >
        <View
          testID="onb_dots"
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: dotsCtaGap }}
        >
          {SLIDES.map((s, i) => (
            <Animated.View
              key={s.key}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 5,
                backgroundColor: i === page ? ACCENT : DOT_INACTIVE,
                opacity: dotOpacity(i),
                transform: [{ scale: dotScale(i) }],
              }}
            />
          ))}
        </View>
        <Pressable
          testID="onb_next"
          onPress={next}
          style={({ pressed }) => [
            {
              width: btnWidth,
              height: btnHeight,
              borderRadius: 16,
              backgroundColor: ACCENT,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
          ]}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 17,
              fontFamily: fontFamilyMedium,
            }}
          >
            {page === SLIDES.length - 1 ? 'Get started' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
