import { StyleSheet } from 'react-native';
import type { MarkdownStyle } from 'react-native-enriched-markdown';

import { Fonts, type Theme } from '@/constants/theme';

export function createMarkdownStyle(colors: Theme): MarkdownStyle {
  return {
    paragraph: {
      color: colors.textSecondary,
      fontFamily: Fonts.sans,
      fontSize: 17,
      fontWeight: '400',
      lineHeight: 27,
      marginBottom: 16,
      marginTop: 0,
    },
    strong: {
      color: colors.text,
    },
    code: {
      backgroundColor: colors.inlineCodeBackground,
      borderColor: colors.inlineCodeBackground,
      color: colors.text,
      fontFamily: Fonts.mono,
      fontSize: 15,
    },
    codeBlock: {
      backgroundColor: colors.codeBackground,
      borderColor: colors.line,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      color: colors.text,
      fontFamily: Fonts.mono,
      fontSize: 13,
      lineHeight: 21,
      marginBottom: 20,
      marginTop: 4,
      padding: 16,
      syntaxColors: {
        comment: colors.textSubtle,
        function: colors.accent,
        keyword: colors.syntaxKeyword,
        number: colors.syntaxNumber,
        operator: colors.textSecondary,
        punctuation: colors.textSecondary,
        string: colors.syntaxString,
        type: colors.syntaxType,
        variable: colors.text,
      },
    },
    math: {
      backgroundColor: colors.transparent,
      color: colors.text,
      fontSize: 20,
      marginBottom: 20,
      marginTop: 4,
      padding: 16,
      textAlign: 'center',
    },
    inlineMath: {
      color: colors.text,
    },
    link: {
      color: colors.accent,
      underline: true,
    },
  };
}

export function createInterviewMarkdownStyle(colors: Theme): MarkdownStyle {
  const baseStyle = createMarkdownStyle(colors);

  return {
    ...baseStyle,
    paragraph: {
      ...baseStyle.paragraph,
      color: colors.text,
    },
    h2: {
      color: colors.text,
      fontFamily: Fonts.sans,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 28,
      marginBottom: 12,
      marginTop: 42,
    },
  };
}

export function createBackgroundMarkdownStyle(colors: Theme): MarkdownStyle {
  const baseStyle = createMarkdownStyle(colors);

  return {
    ...baseStyle,
    h2: {
      color: colors.text,
      fontFamily: Fonts.sans,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 28,
      marginBottom: 12,
      marginTop: 52,
    },
  };
}
