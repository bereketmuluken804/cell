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
const PANEL = '#DFF3E6';
const TITLE = '#0F2E1D';
const SUBTITLE = '#3F5E4A';
const BUTTON_BG = '#1FA658';
const DOT_ACTIVE = '#1FA658';
const DOT_INACTIVE = 'rgba(15,46,29,0.22)';

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
  const pageAnim = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const compact = height < 720;

  const titleSize = compact ? clamp(width * 0.07, 22, 26) : clamp(width * 0.075, 26, 30);
  const subtitleSize = compact ? clamp(width * 0.04, 12, 14) : clamp(width * 0.043, 14, 16);
  const textGap = compact ? 8 : 12;
  const dotsGap = compact ? 14 : 18;
  const ctaGap = compact ? 14 : 18;
  const btnHeight = compact ? 46 : 52;
  const btnWidth = Math.min(width - 48, 320);
  const panelPad = insets.bottom + (compact ? 12 : clamp(height * 0.02, 16, 22));

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
    const imgOpacity = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    const imgScale = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1] });
    const titleOpacity = pageAnim.interpolate({ inputRange: [0, 0.55], outputRange: [0, 1] });
    const titleTrans = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
    const subOpacity = pageAnim.interpolate({ inputRange: [0.2, 0.9], outputRange: [0, 1] });
    const subTrans = pageAnim.interpolate({ inputRange: [0.2, 1], outputRange: [10, 0] });

    return (
      <View style={{ width, height, backgroundColor: BG }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top + 8,
            paddingBottom: 4,
          }}
        >
          <Animated.Image
            source={item.image}
            resizeMode="contain"
            style={{
              flex: 1,
              width: '100%',
              opacity: imgOpacity,
              transform: [{ scale: imgScale }],
            }}
          />
        </View>
        <View
          style={{
            backgroundColor: PANEL,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: compact ? 18 : 22,
            paddingBottom: panelPad,
            alignItems: 'center',
          }}
        >
          <Animated.Text
            style={{
              color: TITLE,
              fontSize: titleSize,
              lineHeight: Math.round(titleSize * 1.2),
              fontFamily: fontFamilyMedium,
              textAlign: 'center',
              maxWidth: Math.min(width * 0.88, 340),
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
              lineHeight: Math.round(subtitleSize * 1.5),
              fontFamily: fontFamily,
              textAlign: 'center',
              maxWidth: Math.min(width * 0.86, 320),
              marginTop: textGap,
              opacity: subOpacity,
              transform: [{ translateY: subTrans }],
            }}
          >
            {item.subtitle}
          </Animated.Text>
          <View
            testID="onb_dots"
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: dotsGap }}
          >
            {SLIDES.map((s, i) => (
              <Animated.View
                key={s.key}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginHorizontal: 5,
                  backgroundColor: i === page ? DOT_ACTIVE : DOT_INACTIVE,
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
                backgroundColor: BUTTON_BG,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: ctaGap,
              },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
            ]}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: fontFamilyMedium,
              }}
            >
              {page === SLIDES.length - 1 ? 'Get started' : 'Next →'}
            </Text>
          </Pressable>
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
    </View>
  );
}
