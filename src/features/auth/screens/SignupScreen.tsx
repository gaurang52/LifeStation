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
import { Screen, AppText, Button, Input, LogoWithTagline } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing, colors, borderRadius } from '@shared/theme';
import { ErrorHandler } from '@core/utils/errorHandler';
import { getFCMToken } from '@core/services/fcmService';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackParamList, RootStackParamList } from '@core/constants/routes';
import { ROUTES } from '@core/constants/routes';
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
  const [csNo, setCsNo] = useState(''); // OPTION A: LifeStation account number
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
    const trimmed = mobileValue.trim();
    if (trimmed.length === 0) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.mobile;
        return next;
      });
      return true;
    }
    // Reject blank spaces anywhere (e.g. pasted text with spaces)
    if (/\s/.test(mobileValue)) {
      setErrors(prev => ({ ...prev, mobile: 'Mobile number cannot contain spaces' }));
      return false;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    const minDigits = 10;
    const maxDigits = 15;
    if (digitsOnly.length < minDigits) {
      setErrors(prev => ({
        ...prev,
        mobile: `Mobile number must be at least ${minDigits} digits`,
      }));
      return false;
    }
    if (digitsOnly.length > maxDigits) {
      setErrors(prev => ({
        ...prev,
        mobile: `Mobile number cannot exceed ${maxDigits} digits`,
      }));
      return false;
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next.mobile;
      return next;
    });
    return true;
  };

  const validateAddress = (addressValue: string): boolean => {
    if (!addressValue || addressValue.trim().length === 0) {
      setErrors(prev => ({ ...prev, address: 'Address is required' }));
      return false;
    }
    setErrors(prev => {
      const next = { ...prev };
      delete next.address;
      return next;
    });
    return true;
  };

  const validateCsNo = (csNoValue: string): boolean => {
    // cs_no is required for seniors (so we can authorize against LifeStation Account API)
    if (userType === 'senior') {
      if (!csNoValue || csNoValue.trim().length === 0) {
        setErrors(prev => ({
          ...prev,
          csNo: 'LifeStation account number (cs_no) is required for senior accounts',
        }));
        return false;
      }
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.csNo;
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
    const isAddressValid = validateAddress(address);
    const isCsNoValid = validateCsNo(csNo);

    if (
      !isNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      !isMobileValid ||
      !isAddressValid ||
      !isCsNoValid
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
      // Automatically retrieve FCM token before signup
      // If FCM token retrieval fails, signup will still proceed without it
      let fcmToken: string | null = null;
      try {
        fcmToken = await getFCMToken();
      } catch (fcmError) {
        // Log but don't block signup if FCM token retrieval fails
        console.warn('Failed to retrieve FCM token:', fcmError);
      }

      await signup({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        user_type: userType,
        mobile: mobile.trim() || undefined,
        address: address.trim() || undefined,
        cs_no: csNo.trim() || undefined, // OPTION A: Include cs_no for LifeStation validation
        fcm_token: fcmToken || undefined,
        privacy_accepted: true,
        terms_accepted: true,
      });
      const rootNav = navigation.getParent() as StackNavigationProp<RootStackParamList> | undefined;
      rootNav?.replace(ROUTES.APP);
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
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag">
          <View style={styles.header}>
            <LogoWithTagline style={styles.logoBlock} />
            <AppText variant="h1" style={styles.title}>
              Create Account
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Join our care community
            </AppText>
          </View>

          <View style={styles.form}>
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
              leftIcon={<MaterialIcons name="person" size={20} color={colors.icon} />}
            />

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
              leftIcon={<MaterialIcons name="email" size={20} color={colors.icon} />}
            />

            <Input
              label="Password *"
              placeholder="Enter password (min 6 characters)"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (errors.password) validatePassword(text);
              }}
              error={errors.password}
              onBlur={() => validatePassword(password)}
              hasRightIcon
              leftIcon={<MaterialIcons name="lock-outline" size={20} color={colors.icon} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              }
            />

            <Input
              label="Confirm Password *"
              placeholder="Confirm password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={text => {
                setConfirmPassword(text);
                if (errors.confirmPassword) validateConfirmPassword(text);
              }}
              error={errors.confirmPassword}
              onBlur={() => validateConfirmPassword(confirmPassword)}
              hasRightIcon
              leftIcon={<MaterialIcons name="lock-outline" size={20} color={colors.icon} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              }
            />

            <Input
              label="Mobile Number"
              placeholder="Mobile number (optional, 10–15 digits)"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={text => {
                setMobile(text.replace(/\s/g, ''));
                if (errors.mobile) validateMobile(text.replace(/\s/g, ''));
              }}
              error={errors.mobile}
              onBlur={() => validateMobile(mobile)}
              leftIcon={<MaterialIcons name="phone" size={20} color={colors.icon} />}
            />

            <Input
              label="Address *"
              placeholder="Enter your address"
              value={address}
              onChangeText={text => {
                setAddress(text);
                if (errors.address) validateAddress(text);
              }}
              error={errors.address}
              onBlur={() => validateAddress(address)}
              multiline
              numberOfLines={2}
              leftIcon={<MaterialIcons name="home" size={20} color={colors.icon} />}
            />

            {/* cs_no required for seniors only (authorize against LifeStation); hidden for caregivers */}
            {userType === 'senior' && (
              <Input
                label="LifeStation Account Number (cs_no) *"
                placeholder="LifeStation account number"
                value={csNo}
                onChangeText={text => {
                  setCsNo(text);
                  if (errors.csNo) validateCsNo(text);
                }}
                error={errors.csNo}
                onBlur={() => validateCsNo(csNo)}
                leftIcon={<MaterialIcons name="account-circle" size={20} color={colors.icon} />}
              />
            )}

            <View style={styles.userTypeContainer}>
              <AppText variant="bodyBold" color={colors.text} style={styles.userTypeLabel}>
                I am a:
              </AppText>
              <View style={styles.userTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'senior' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => {
                    setUserType('senior');
                    // Clear cs_no validation error when switching to senior
                    if (errors.csNo) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.csNo;
                        return newErrors;
                      });
                    }
                  }}
                  activeOpacity={0.7}>
                  <AppText
                    variant="bodyBold"
                    color={userType === 'senior' ? colors.text : colors.text}>
                    Senior
                  </AppText>
                  <AppText variant="small" color={colors.textSecondary}>
                    Using device
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.userTypeButton,
                    userType === 'caregiver' && styles.userTypeButtonActive,
                  ]}
                  onPress={() => {
                    setUserType('caregiver');
                    // Clear cs_no when switching to caregiver (not required)
                    setCsNo('');
                    if (errors.csNo) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.csNo;
                        return newErrors;
                      });
                    }
                  }}
                  activeOpacity={0.7}>
                  <AppText
                    variant="bodyBold"
                    color={userType === 'caregiver' ? colors.text : colors.text}>
                    Caregiver
                  </AppText>
                  <AppText variant="small" color={colors.textSecondary}>
                    Monitoring
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 320,
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBlock: {},
  title: {
    marginBottom: spacing.sm, // mb-2 in Figma
    textAlign: 'center',
    fontSize: 30, // text-3xl in Figma
    fontWeight: '600', // font-semibold
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  userTypeContainer: {
    gap: spacing.sm, // mb-6 in Figma
    marginBottom: spacing.lg,
  },
  userTypeLabel: {
    marginBottom: spacing.sm, // mb-3 in Figma
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: spacing.sm, // gap-3 in Figma
  },
  userTypeButton: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: spacing.md, // p-4 in Figma
    borderRadius: borderRadius.lg, // rounded-xl in Figma
    borderWidth: 2,
    borderColor: colors.lightGray, // border-[#F5F5F5] in Figma
    backgroundColor: colors.surface,
  },
  userTypeButtonActive: {
    borderColor: colors.primary, // border-[#C2185B] in Figma
    backgroundColor: colors.lightPrimary, // bg-[#C2185B]/5 in Figma
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
    backgroundColor: colors.errorBackground,
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
