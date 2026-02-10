import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Platform } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@shared/theme';
import { AppText } from './AppText';

/** Extra right padding (px) when input has a right-side icon (e.g. password visibility). */
export const INPUT_RIGHT_ICON_PADDING = 48;

/** Width reserved for left icon area so label/input row layout is consistent. */
export const INPUT_LEFT_ICON_WIDTH = 48;

type Props = TextInputProps & {
  label?: string;
  error?: string;
  /** When true, adds right padding so placeholder and text do not overlap a right-side icon (e.g. eye). */
  hasRightIcon?: boolean;
  /** Left icon (e.g. person, email). Rendered in the same row as the input so it stays aligned. */
  leftIcon?: React.ReactNode;
  /** Right icon (e.g. password visibility toggle). Rendered in the same row as the input. */
  rightIcon?: React.ReactNode;
};

export const Input: React.FC<Props> = ({
  label,
  error,
  hasRightIcon,
  leftIcon,
  rightIcon,
  style,
  multiline,
  ...rest
}) => {
  const hasLeftIcon = leftIcon != null;
  const hasRightIconNode = rightIcon != null;

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputRow,
          error ? styles.inputRowError : null,
          multiline && styles.inputRowMultiline,
        ]}>
        {hasLeftIcon ? (
          <View style={styles.leftIconBox} pointerEvents="none">
            {leftIcon}
          </View>
        ) : null}
        {/* Wrapper gives fixed height; do not set height on TextInput (causes text cut-off on RN) */}
        <View style={[styles.inputWrapper, multiline && styles.inputWrapperMultiline]}>
          <TextInput
            style={[
              styles.input,
              hasLeftIcon && styles.inputWithLeftIcon,
              (hasRightIcon || hasRightIconNode) && styles.inputRightIcon,
              multiline && styles.inputMultiline,
              style,
            ]}
            placeholderTextColor={colors.textSecondary}
            textAlignVertical={
              Platform.OS === 'android' ? (multiline ? 'top' : 'center') : undefined
            }
            multiline={multiline}
            {...rest}
          />
        </View>
        {hasRightIconNode ? <View style={styles.rightIconBox}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

// Single-line input: fixed lineHeight so placeholder and typed text align; enough room so top isn't cropped
const BODY_FONT_SIZE = typography.body.fontSize; // 16
const INPUT_LINE_HEIGHT = 20; // Slightly > fontSize so ascenders aren't clipped; keeps placeholder/text aligned
const INPUT_ROW_HEIGHT = 68;
const INPUT_PADDING_VERTICAL = (INPUT_ROW_HEIGHT - INPUT_LINE_HEIGHT) / 2; // 24 top & bottom

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: {
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: INPUT_ROW_HEIGHT,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.lightGray,
    overflow: 'hidden',
  },
  inputRowError: {
    borderColor: colors.error,
  },
  inputRowMultiline: {
    height: undefined,
    minHeight: INPUT_ROW_HEIGHT,
    alignItems: 'flex-start',
  },
  // Fixed-height wrapper so we never set height on TextInput (RN clips text when height is set)
  inputWrapper: {
    flex: 1,
    height: INPUT_ROW_HEIGHT,
    justifyContent: 'center',
  },
  inputWrapperMultiline: {
    height: undefined,
    minHeight: INPUT_ROW_HEIGHT,
    justifyContent: 'flex-start',
  },
  leftIconBox: {
    width: INPUT_LEFT_ICON_WIDTH,
    height: INPUT_ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconBox: {
    width: INPUT_RIGHT_ICON_PADDING,
    height: INPUT_ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // lineHeight = fontSize so placeholder and typed text align on same line; symmetric padding
  input: {
    flex: 1,
    paddingVertical: INPUT_PADDING_VERTICAL,
    paddingHorizontal: spacing.md,
    fontSize: BODY_FONT_SIZE,
    fontWeight: typography.body.fontWeight,
    lineHeight: INPUT_LINE_HEIGHT,
    color: colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    margin: 0,
    minHeight: INPUT_LINE_HEIGHT,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputRightIcon: {
    paddingRight: spacing.sm,
  },
  inputMultiline: {
    minHeight: INPUT_ROW_HEIGHT,
    paddingTop: INPUT_PADDING_VERTICAL,
    paddingBottom: INPUT_PADDING_VERTICAL,
    lineHeight: typography.body.lineHeight,
  },
  error: { color: colors.error },
});
