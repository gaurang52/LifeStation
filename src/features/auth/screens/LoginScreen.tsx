import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, AppText, Button, Input } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing, colors } from '@shared/theme';
import { ErrorHandler } from '@core/utils/errorHandler';

const LoginScreen: React.FC = () => {
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      const msg = ErrorHandler.getErrorMessage(err);
      setError(msg);
    }
  };

  return (
    <Screen>
      <AppText variant="h2" style={styles.title}>
        Welcome Back
      </AppText>
      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Password"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? (
          <AppText variant="caption" color={colors.error} style={styles.error}>
            {error}
          </AppText>
        ) : null}
        <Button label="Sign In" onPress={onSubmit} loading={isLoading} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  form: { gap: spacing.md },
  error: { marginTop: -spacing.sm },
});

export default LoginScreen;
