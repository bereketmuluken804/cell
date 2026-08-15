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
const TEXT = '#F0F6FC';
const MUTED = '#8B949E';
const ACCENT = '#2E7CF6';
const DOT_INACTIVE = '#3A434D';

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

  const imageArea = clamp(height * 0.48, 220, 430);
  const titleSize = clamp(width * 0.072, 24, 32);
  const subtitleSize = clamp(width * 0.042, 14, 17);

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
    <View
      style={{
        width,
        paddingHorizontal: 28,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: width - 40,
          height: imageArea,
          justifyContent: 'center',
        }}
      >
        <Image
          source={item.image}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      <Text
        style={{
          color: TEXT,
          fontSize: titleSize,
          lineHeight: Math.round(titleSize * 1.25),
          fontFamily: fontFamilyMedium,
          textAlign: 'center',
          marginTop: 18,
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          color: MUTED,
          fontSize: subtitleSize,
          lineHeight: Math.round(subtitleSize * 1.45),
          fontFamily: fontFamily,
          textAlign: 'center',
          marginTop: 10,
          paddingHorizontal: 8,
        }}
      >
        {item.subtitle}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BG,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <Pressable
        testID="onb_skip"
        onPress={onFinish}
        hitSlop={12}
        style={({ pressed }) => [
          {
            position: 'absolute',
            top: insets.top + 4,
            right: 24,
            paddingVertical: 8,
            paddingHorizontal: 10,
            zIndex: 10,
            opacity: pressed ? 0.55 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: MUTED,
            fontSize: 14,
            fontFamily: fontFamilyMedium,
          }}
        >
          Skip
        </Text>
      </Pressable>

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

      <View
        style={{
          alignItems: 'center',
          paddingBottom: 8,
        }}
      >
        <View testID="onb_dots" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}>
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
