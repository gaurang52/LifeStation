import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Input } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing, colors, borderRadius } from '@shared/theme';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<AuthStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError('Invalid email format');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const onSubmit = async () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!validateEmail(email) || !validatePassword(password)) {
      return;
    }

    try {
      await login(email.toLowerCase().trim(), password);
    } catch (err: unknown) {
      // API client returns { message: string, statusCode: number, originalError: AxiosError }
      const errorMessage =
        (err as { message?: string })?.message ||
        ErrorHandler.getErrorMessage(err) ||
        'Login failed. Please try again.';
      setError(errorMessage);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <AppText variant="h1" style={styles.title}>
              Welcome Back
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Sign in to continue
            </AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                error={emailError || undefined}
                onBlur={() => validateEmail(email)}
                style={styles.input}
              />
              <View style={styles.inputIconContainer}>
                <MaterialIcons name="email" size={20} color={colors.textSecondary} />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                }}
                error={passwordError || undefined}
                onBlur={() => validatePassword(password)}
                style={styles.input}
              />
              <View style={styles.inputIconContainer}>
                <MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />
              </View>
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color={colors.error} />
                <AppText variant="caption" color={colors.error} style={styles.error}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity activeOpacity={0.7}>
                <AppText variant="bodyBold" color={colors.primary}>
                  Forgot Password?
                </AppText>
              </TouchableOpacity>
            </View>

            <Button label="Sign In" onPress={onSubmit} loading={isLoading} disabled={isLoading} />

            <View style={styles.signupContainer}>
              <AppText variant="body" color={colors.textSecondary}>
                Don&apos;t have an account?{' '}
              </AppText>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
                <AppText variant="bodyBold" color={colors.primary}>
                  Sign Up
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg, // px-6 in Figma = 24px
    paddingVertical: spacing.xxl, // py-12 in Figma = 48px
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg, // slightly tighter now that logo is removed
  },
  title: {
    marginBottom: spacing.sm, // mb-2 in Figma = 8px
    textAlign: 'center',
    fontSize: 30, // text-3xl in Figma
    fontWeight: '600', // font-semibold
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    gap: spacing.md, // space-y-4 in Figma = 16px
  },
  inputContainer: {
    position: 'relative',
  },
  inputIconContainer: {
    position: 'absolute',
    left: spacing.md, // left-4 in Figma = 16px
    top: 48, // Adjusted for new input height (56px) - icon center (10px) = 48px
    zIndex: 1,
  },
  input: {
    paddingLeft: spacing.xl + spacing.md, // pl-12 in Figma = 48px (12*4)
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 48, // Aligned with inputIconContainer
    zIndex: 1,
    padding: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorBackground,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  error: {
    flex: 1,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg, // mt-6 in Figma = 24px
  },
});

export default LoginScreen;
