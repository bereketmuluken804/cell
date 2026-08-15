import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'pink' | 'orange';

export type Theme = {
  mode: ThemeMode;
  bg: string;
  card: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  levels: readonly string[];
  tabBg: string;
};

export const darkTheme: Theme = {
  mode: 'dark',
  bg: '#0D1117',
  card: '#161B22',
  surface: '#1C2128',
  text: '#FFFFFF',
  textSecondary: '#9DA7B3',
  textMuted: '#8B949E',
  border: '#30363D',
  accent: '#2E7CF6',
  levels: ['#161B22', '#173426', '#1B452C', '#1F5733', '#236A3A', '#287E42', '#2C934B'],
  tabBg: '#161B22',
};

export const lightTheme: Theme = {
  mode: 'light',
  bg: '#F6F6F4',
  card: '#EDEAE6',
  surface: '#E4E1DC',
  text: '#1A1A18',
  textSecondary: '#6E6E66',
  textMuted: '#9A968C',
  border: '#D6D3CD',
  accent: '#1F6FEB',
  levels: ['#DBDBD6', '#E2EAE1', '#C5E0C9', '#A3D2AE', '#7DBE8D', '#53A76C', '#2E8E4F'],
  tabBg: '#EDEAE6',
};

export const pinkTheme: Theme = {
  mode: 'pink',
  bg: '#FFF5F7',
  card: '#FBE9EE',
  surface: '#F6DDE6',
  text: '#4A1F2B',
  textSecondary: '#8A5B69',
  textMuted: '#B98A96',
  border: '#E9C9D3',
  accent: '#E6457E',
  levels: ['#FBEAF2', '#F9D5E9', '#F8C0E1', '#F6AAD8', '#F595CF', '#F380C6', '#F26BBE'],
  tabBg: '#FBE9EE',
};

export const orangeTheme: Theme = {
  mode: 'orange',
  bg: '#1A140E',
  card: '#221A12',
  surface: '#2B2116',
  text: '#F0E2D2',
  textSecondary: '#C6B298',
  textMuted: '#948170',
  border: '#463829',
  accent: '#FE7F2D',
  levels: ['#2A1F14', '#4D2F18', '#713F1C', '#944F21', '#B75F25', '#DB6F29', '#FE7F2D'],
  tabBg: '#221A12',
};

export const fontFamily = Platform.select({ android: 'sans-serif', default: undefined });
export const fontFamilyMedium = Platform.select({ android: 'sans-serif-medium', default: undefined });
