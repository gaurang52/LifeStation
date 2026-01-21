import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, spacing } from '@shared/theme';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
};

type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <AppText variant="h3" style={styles.title}>
            Something went wrong
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.message}>
            Please try again.
          </AppText>
          <Button label="Try again" onPress={this.handleRetry} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { marginBottom: spacing.sm, textAlign: 'center' },
  message: { marginBottom: spacing.lg, textAlign: 'center' },
});
