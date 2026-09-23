/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1D1D1F',
    background: '#F5F5F7',
    backgroundElement: '#F0F0F3',
    textSecondary: '#6E6E73',
    textSubtle: '#86868B',
    line: '#E5E5EA',
    codeBackground: '#F3F4F6',
    inlineCodeBackground: '#ECEEF1',
    accent: '#007AFF',
    syntaxKeyword: '#C2418F',
    syntaxNumber: '#B35C00',
    syntaxString: '#198754',
    syntaxType: '#7C4DFF',
    transparent: 'transparent',
  },
  dark: {
    text: '#F5F5F7',
    background: '#1D1D1F',
    backgroundElement: '#212225',
    textSecondary: '#A1A1A6',
    textSubtle: '#A1A1A6',
    line: '#38383A',
    codeBackground: '#18181A',
    inlineCodeBackground: '#29292C',
    accent: '#0A84FF',
    syntaxKeyword: '#C2418F',
    syntaxNumber: '#B35C00',
    syntaxString: '#198754',
    syntaxType: '#7C4DFF',
    transparent: 'transparent',
  },
} as const;

export type Theme = (typeof Colors)[keyof typeof Colors];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  two: 8,
  four: 24,
  five: 32,
  six: 64,
} as const;
