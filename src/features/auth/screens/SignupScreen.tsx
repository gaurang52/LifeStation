import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Input } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing, colors } from '@shared/theme';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<AuthStackParamList>;

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const signup = useAuthStore(state => state.signup);
  const isLoading = useAuthStore(state => state.isLoading);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [userType, setUserType] = useState<'caregiver' | 'senior'>('senior');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.email;
      return newErrors;
    });
    return true;
  };

  const validatePassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      return false;
    }
    if (passwordValue.length < 6) {
      setErrors(prev => ({
        ...prev,
        password: 'Password must be at least 6 characters long',
      }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.password;
      return newErrors;
    });
    return true;
  };

  const validateConfirmPassword = (confirmPasswordValue: string): boolean => {
    if (!confirmPasswordValue) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password' }));
      return false;
    }
    if (confirmPasswordValue !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.confirmPassword;
      return newErrors;
    });
    return true;
  };

  const validateName = (nameValue: string): boolean => {
    if (!nameValue || nameValue.trim().length === 0) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.name;
      return newErrors;
    });
    return true;
  };

  const validateMobile = (mobileValue: string): boolean => {
    if (mobileValue && mobileValue.trim().length > 0) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      if (!phoneRegex.test(mobileValue)) {
        setErrors(prev => ({ ...prev, mobile: 'Invalid mobile number format' }));
        return false;
      }
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.mobile;
      return newErrors;
    });
    return true;
  };

  const onSubmit = async () => {
    setError(null);

    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isMobileValid = validateMobile(mobile);

    if (
      !isNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      !isMobileValid
    ) {
      return;
    }

    if (!privacyAccepted || !termsAccepted) {
      Alert.alert(
        'Required',
        'You must accept the Privacy Policy and Terms of Service to create an account.',
      );
      return;
    }

    try {
      await signup({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        user_type: userType,
        mobile: mobile.trim() || undefined,
        address: address.trim() || undefined,
        privacy_accepted: true,
        terms_accepted: true,
      });
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      const errorMessage =
        errorResponse?.response?.data?.error ||
        ErrorHandler.getErrorMessage(err) ||
        'Signup failed. Please try again.';
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
            <View style={styles.iconContainer}>
              <MaterialIcons name="person-add" size={48} color={colors.primary} />
            </View>
            <AppText variant="h1" style={styles.title}>
              Create Account
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Sign up to get started with LifeStation
            </AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={20} color={colors.icon} style={styles.inputIcon} />
              <Input
                label="Full Name *"
                placeholder="Enter your full name"
                value={name}
                onChangeText={text => {
                  setName(text);
                  if (errors.name) validateName(text);
                }}
                error={errors.name}
                onBlur={() => validateName(name)}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color={colors.icon} style={styles.inputIcon} />
              <Input
                label="Email *"
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (errors.email) validateEmail(text);
                }}
                error={errors.email}
                onBlur={() => validateEmail(email)}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="lock-outline"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <Input
                label="Password *"
                placeholder="Enter your password (min 6 characters)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (errors.password) validatePassword(text);
                }}
                error={errors.password}
                onBlur={() => validatePassword(password)}
                style={styles.input}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="lock-outline"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <Input
                label="Confirm Password *"
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) validateConfirmPassword(text);
                }}
                error={errors.confirmPassword}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                style={styles.input}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}>
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={20} color={colors.icon} style={styles.inputIcon} />
              <Input
                label="Mobile Number"
                placeholder="Enter your mobile number (optional)"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={text => {
                  setMobile(text);
                  if (errors.mobile) validateMobile(text);
                }}
                error={errors.mobile}
                onBlur={() => validateMobile(mobile)}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="home" size={20} color={colors.icon} style={styles.inputIcon} />
              <Input
                label="Address"
                placeholder="Enter your address (optional)"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
                style={styles.input}
              />
            </View>

            <View style={styles.userTypeContainer}>
              <AppText variant="caption" color={colors.textSecondary} style={styles.userTypeLabel}>
                Account Type *
              </AppText>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'senior' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => setUserType('senior')}
                  activeOpacity={0.7}>
                  <MaterialIcons
                    name="elderly"
                    size={20}
                    color={userType === 'senior' ? colors.primary : colors.icon}
                  />
                  <AppText
                    variant="bodyBold"
                    color={userType === 'senior' ? colors.primary : colors.textSecondary}>
                    Senior
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'caregiver' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => setUserType('caregiver')}
                  activeOpacity={0.7}>
                  <MaterialIcons
                    name="favorite"
                    size={20}
                    color={userType === 'caregiver' ? colors.primary : colors.icon}
                  />
                  <AppText
                    variant="bodyBold"
                    color={userType === 'caregiver' ? colors.primary : colors.textSecondary}>
                    Caregiver
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
                activeOpacity={0.7}>
                <View style={[styles.checkboxBox, privacyAccepted && styles.checkboxBoxChecked]}>
                  {privacyAccepted && <MaterialIcons name="check" size={16} color={colors.white} />}
                </View>
                <AppText variant="caption" color={colors.text} style={styles.checkboxLabel}>
                  I accept the Privacy Policy *
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}>
                <View style={[styles.checkboxBox, termsAccepted && styles.checkboxBoxChecked]}>
                  {termsAccepted && <MaterialIcons name="check" size={16} color={colors.white} />}
                </View>
                <AppText variant="caption" color={colors.text} style={styles.checkboxLabel}>
                  I accept the Terms of Service *
                </AppText>
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

            <Button
              label="Sign Up"
              onPress={onSubmit}
              loading={isLoading}
              disabled={isLoading || !privacyAccepted || !termsAccepted}
            />

            <View style={styles.loginContainer}>
              <AppText variant="body" color={colors.textSecondary}>
                Already have an account?{' '}
              </AppText>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <AppText variant="bodyBold" color={colors.primary}>
                  Sign In
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
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 38, // Label height (20) + gap (4) + input center (24) - icon center (10) = 38
    zIndex: 1,
  },
  input: {
    paddingLeft: spacing.xl + spacing.md,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 38, // Aligned with inputIcon for consistency
    zIndex: 1,
    padding: spacing.xs,
  },
  userTypeContainer: {
    gap: spacing.sm,
  },
  userTypeLabel: {
    marginBottom: spacing.xs,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  userTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
  },
  checkboxContainer: {
    gap: spacing.sm,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#fef2f2',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  error: {
    flex: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
});

export default SignupScreen;
