/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Onboarding from '../src/Onboarding';

const TITLES = [
  'Turn habits into a calendar of color.',
  'Log hours. Fill the grid.',
  'Your progress, right on your home screen.',
  'Build streaks. Keep going.',
];

async function render(onFinish: () => void) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 640 },
          insets: { top: 24, left: 0, right: 0, bottom: 24 },
        }}
      >
        <Onboarding onFinish={onFinish} />
      </SafeAreaProvider>,
    );
  });
  return renderer;
}

function press(root: ReactTestRenderer.ReactTestRenderer, testID: string) {
  const node = root.root.findByProps({ testID });
  ReactTestRenderer.act(() => {
    node.props.onPress();
  });
}

async function unmount(root: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => {
    root.unmount();
  });
}

function label(root: ReactTestRenderer.ReactTestRenderer): string {
  const btn = root.root.findByProps({ testID: 'onb_next' });
  const text = btn.findAllByType(Text);
  return text.length ? text[0].props.children : '';
}

test('renders all four slides with the exact copy', async () => {
  const root = await render(() => {});
  for (const title of TITLES) {
    const found = root.root.findAllByProps({ children: title });
    expect(found.length).toBeGreaterThan(0);
  }
  expect(root.root.findAllByProps({ testID: 'onb_dots' }).length).toBeGreaterThan(0);
  await unmount(root);
});

test('tapping Skip finishes onboarding immediately', async () => {
  const finish = jest.fn();
  const root = await render(finish);
  press(root, 'onb_skip');
  expect(finish).toHaveBeenCalledTimes(1);
  await unmount(root);
});

test('Next advances to Get started, then finishes', async () => {
  const finish = jest.fn();
  const root = await render(finish);
  expect(label(root)).toBe('Next →');
  for (let i = 0; i < 3; i++) {
    press(root, 'onb_next');
  }
  expect(label(root)).toBe('Get started');
  press(root, 'onb_next');
  expect(finish).toHaveBeenCalledTimes(1);
  await unmount(root);
});
