import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, fontFamilyMedium } from './theme';

const BG = '#0D1117';
const TITLE = '#FFD98A';
const SUBTITLE = '#FFF3DC';
const ACCENT = '#2E7CF6';
const DOT_INACTIVE = 'rgba(255,255,255,0.5)';
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};

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

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const titleSize = clamp(width * 0.062, 22, 30);
  const subtitleSize = clamp(width * 0.041, 13, 16);
  const textGap = clamp(height * 0.012, 8, 14);
  const controlsBar = insets.bottom + 140;

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
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={{ width, height }}>
      <Image source={item.image} resizeMode="cover" style={{ width, height }} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: controlsBar,
          paddingHorizontal: 32,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: TITLE,
            fontSize: titleSize,
            lineHeight: Math.round(titleSize * 1.22),
            fontFamily: fontFamilyMedium,
            textAlign: 'center',
            ...TEXT_SHADOW,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            color: SUBTITLE,
            fontSize: subtitleSize,
            lineHeight: Math.round(subtitleSize * 1.4),
            fontFamily: fontFamily,
            textAlign: 'center',
            marginTop: textGap,
            ...TEXT_SHADOW,
          }}
        >
          {item.subtitle}
        </Text>
      </View>
    </View>
  );

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
          bottom: 0,
          paddingBottom: insets.bottom + 6,
          alignItems: 'center',
        }}
      >
        <View testID="onb_dots" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
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
              minWidth: 180,
              paddingVertical: 15,
              paddingHorizontal: 36,
              borderRadius: 28,
              backgroundColor: ACCENT,
              alignItems: 'center',
              marginBottom: 6,
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
