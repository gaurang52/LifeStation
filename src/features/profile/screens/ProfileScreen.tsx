import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Lock,
  User,
  Smartphone,
} from 'lucide-react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Card, TopNavbar, Input, Button } from '@shared/components';
import { useAuthStore } from '@core/store';
import { authApi } from '@core/api/authApi';
import { reportsApi } from '@core/api/reportsApi';
import { spacing, colors, borderRadius } from '@shared/theme';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ROUTES } from '@core/constants/routes';
import { ENV } from '@core/constants/env';
import {
  filterNameInput,
  filterPhoneInput,
  validateName,
  validatePhone,
  validatePasswordComplexity,
  NAME_MAX_LENGTH,
  PHONE_MAX_LENGTH,
} from '@core/utils/profileValidation';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const LIFESTATION_HELP_URL = 'https://www.lifestation.com';
const LIFESTATION_TERMS_URL = 'https://www.lifestation.com/terms-and-conditions/';

/** Renders account report data (array of accounts or object with accounts/list). */
function AccountReportContent({ data }: { data: unknown }) {
  const list: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : (data as Record<string, unknown>)?.accounts &&
      Array.isArray((data as Record<string, unknown>).accounts)
    ? ((data as Record<string, unknown>).accounts as Record<string, unknown>[])
    : (data as Record<string, unknown>)?.report &&
      Array.isArray((data as Record<string, unknown>).report)
    ? ((data as Record<string, unknown>).report as Record<string, unknown>[])
    : (data as Record<string, unknown>)?.data &&
      Array.isArray((data as Record<string, unknown>).data)
    ? ((data as Record<string, unknown>).data as Record<string, unknown>[])
    : [];
  if (list.length > 0) {
    return (
      <View style={styles.accountReportList}>
        {list.map((item, i) => (
          <View
            key={String(item.cs_no ?? item.contact_no ?? `item-${i}`)}
            style={styles.accountReportItem}>
            <AppText variant="bodyBold" style={styles.accountReportItemTitle}>
              {String(item.name ?? item.account_name ?? item.cs_no ?? `Account ${i + 1}`)}
            </AppText>
            {item.addr1 != null && (
              <AppText variant="small" color={colors.textSecondary}>
                {String(item.addr1)}
              </AppText>
            )}
            {item.status != null && (
              <AppText variant="small" color={colors.textSecondary}>
                Status: {String(item.status)}
              </AppText>
            )}
            {item.phone1 != null && (
              <AppText variant="small" color={colors.textSecondary}>
                Phone: {String(item.phone1)}
              </AppText>
            )}
          </View>
        ))}
      </View>
    );
  }
  return (
    <AppText variant="small" color={colors.textSecondary} style={styles.accountReportRaw}>
      {typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}
    </AppText>
  );
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const setUser = useAuthStore(state => state.setUser);

  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notificationEnabled, setNotificationEnabled] = useState(
    user?.notification_enabled !== false,
  );
  const [notificationUpdating, setNotificationUpdating] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editMobile, setEditMobile] = useState(user?.mobile ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showAccountReport, setShowAccountReport] = useState(false);
  const [accountReportLoading, setAccountReportLoading] = useState(false);
  const [accountReportError, setAccountReportError] = useState<string | null>(null);
  const [accountReportData, setAccountReportData] = useState<unknown>(null);

  useEffect(() => {
    if (user?.notification_enabled !== undefined) {
      setNotificationEnabled(user.notification_enabled !== false);
    }
  }, [user?.notification_enabled]);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationUpdating(true);
    try {
      await authApi.updateProfile({ notification_enabled: value });
      setNotificationEnabled(value);
      setUser({ ...user!, notification_enabled: value });
    } catch {
      // Revert on error
      setNotificationEnabled(!value);
    } finally {
      setNotificationUpdating(false);
    }
  };

  const openEditProfile = () => {
    setEditName(user?.name ?? '');
    setEditMobile(user?.mobile ?? '');
    setProfileError(null);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    setProfileError(null);

    const nameErr = validateName(editName);
    if (nameErr) {
      setProfileError(nameErr);
      return;
    }
    const phoneErr = validatePhone(editMobile);
    if (phoneErr) {
      setProfileError(phoneErr);
      return;
    }

    setProfileSaving(true);
    try {
      const trimmedName = editName.trim();
      const trimmedMobile = editMobile.trim();
      const normalizedMobile = trimmedMobile
        ? trimmedMobile.startsWith('+')
          ? '+' + trimmedMobile.replace(/\D/g, '')
          : trimmedMobile.replace(/\D/g, '')
        : null;

      const res = await authApi.updateProfile({
        name: trimmedName,
        mobile: normalizedMobile,
      });
      if (res.user) setUser({ ...user!, ...res.user });
      setShowEditProfile(false);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ??
        (e as { message?: string })?.message ??
        'Failed to update profile';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const openHelp = () => Linking.openURL(LIFESTATION_HELP_URL).catch(() => {});
  const openTerms = () => Linking.openURL(LIFESTATION_TERMS_URL).catch(() => {});

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  };

  const doLogout = () => {
    logout();
    const rootNav = navigation.getParent()?.getParent();
    if (rootNav) {
      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: ROUTES.AUTH,
              state: { routes: [{ name: ROUTES.LOGIN }], index: 0 },
            },
          ],
        }),
      );
    }
  };

  const handleDevicePress = () => {
    navigation.navigate(ROUTES.DEVICE_DETAILS_TAB);
  };

  /** Used when Account report row is uncommented (see SUPPORT section). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openAccountReport = async () => {
    setAccountReportError(null);
    setAccountReportData(null);
    setAccountReportLoading(true);
    setShowAccountReport(true);
    try {
      const res = await reportsApi.getAccountReport();
      setAccountReportData(res.data ?? null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ??
        (e as { message?: string })?.message ??
        'Failed to load account report';
      setAccountReportError(msg);
    } finally {
      setAccountReportLoading(false);
    }
  };

  const closeAccountReport = () => {
    setShowAccountReport(false);
    setAccountReportError(null);
    setAccountReportData(null);
    setAccountReportLoading(false);
  };

  const openUpdatePassword = () => {
    setShowUpdatePassword(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const closeUpdatePassword = () => {
    setShowUpdatePassword(false);
    setPasswordError(null);
    setPasswordSuccess(false);
  };

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    if (!currentPassword.trim()) {
      setPasswordError('Enter your current password');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Enter a new password');
      return;
    }
    const complexityErr = validatePasswordComplexity(newPassword);
    if (complexityErr) {
      setPasswordError(complexityErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from your current password');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        closeUpdatePassword();
        doLogout();
      }, 1500);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (e as { message?: string })?.message ||
        'Failed to update password';
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.navbarWrapper}>
        <TopNavbar title="Profile" subtitle="Manage your account" variant="figma" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gradient Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <AppText variant="h2" style={styles.avatarText}>
                  {user?.name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase() || 'U'}
                </AppText>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <AppText variant="h2" style={styles.userName}>
                {user?.name || 'User'}
              </AppText>
              <AppText variant="small" color="rgba(255, 255, 255, 0.8)" style={styles.userEmail}>
                {user?.email || ''}
              </AppText>
              <View style={styles.userTypeBadge}>
                <AppText variant="small" color={colors.white} style={styles.userTypeText}>
                  {user?.user_type === 'senior'
                    ? 'Senior'
                    : user?.user_type === 'caregiver'
                    ? 'Caregiver'
                    : user?.user_type || 'User'}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.settingsContainer}>
          {/* Account Section */}
          <View style={styles.settingsGroup}>
            <AppText variant="small" color={colors.textSecondary} style={styles.sectionGroupTitle}>
              ACCOUNT
            </AppText>
            <Card style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={openEditProfile}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <User size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Edit Profile
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Bell size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Push notifications
                  </AppText>
                </View>
                {notificationUpdating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={notificationEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{ false: colors.lightGray, true: colors.lightPrimary }}
                    thumbColor={notificationEnabled ? colors.primary : colors.white}
                  />
                )}
              </View>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={openUpdatePassword}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Lock size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Update Password
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={handleDevicePress}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Smartphone size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Device
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {/* Account report – commented out until API is fixed
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={openAccountReport}
                disabled={accountReportLoading}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <ClipboardList size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Account report
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              */}
            </Card>
          </View>

          {/* Support Section */}
          <View style={styles.settingsGroup}>
            <AppText variant="small" color={colors.textSecondary} style={styles.sectionGroupTitle}>
              SUPPORT
            </AppText>
            <Card style={styles.settingsCard}>
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={openHelp}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <HelpCircle size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Help Center
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={openTerms}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <FileText size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Terms & Conditions
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </Card>
          </View>

          {/* App Info */}
          <View style={styles.appInfoContainer}>
            <View style={styles.appInfoContent}>
              <AppText variant="body" color={colors.textSecondary} style={styles.appName}>
                {ENV.APP_NAME}
              </AppText>
              <AppText variant="small" color={colors.textSecondary} style={styles.appVersion}>
                Version {ENV.APP_VERSION}
              </AppText>
              <AppText variant="small" color={colors.textSecondary} style={styles.appCopyright}>
                © {new Date().getFullYear()} LifeStation Inc. All rights reserved.
              </AppText>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={20} color={colors.error} />
            <AppText variant="bodyBold" color={colors.error} style={styles.logoutText}>
              Log Out
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditProfile(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <Card style={styles.updatePasswordCard}>
                <AppText variant="h3" style={styles.updatePasswordTitle}>
                  Edit Profile
                </AppText>
                <Input
                  label="Name"
                  value={editName}
                  onChangeText={t => setEditName(filterNameInput(t).slice(0, NAME_MAX_LENGTH))}
                  placeholder="Your name"
                  autoCapitalize="words"
                  maxLength={NAME_MAX_LENGTH}
                  multiline
                  numberOfLines={2}
                  style={[styles.updatePasswordInput, styles.nameInput]}
                />
                <Input
                  label="Email"
                  value={user?.email ?? ''}
                  editable={false}
                  placeholder="Email"
                  style={[styles.updatePasswordInput, styles.inputReadOnly]}
                />
                <AppText variant="small" color={colors.textSecondary} style={styles.emailHint}>
                  Email cannot be changed
                </AppText>
                <Input
                  label="Mobile"
                  value={editMobile}
                  onChangeText={t => setEditMobile(filterPhoneInput(t))}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  maxLength={PHONE_MAX_LENGTH + 1}
                  style={styles.updatePasswordInput}
                />
                {profileError ? (
                  <AppText variant="small" color={colors.error} style={styles.updatePasswordError}>
                    {profileError}
                  </AppText>
                ) : null}
                <View style={styles.updatePasswordActions}>
                  <TouchableOpacity
                    style={styles.updatePasswordCancelBtn}
                    onPress={() => setShowEditProfile(false)}
                    disabled={profileSaving}>
                    <AppText variant="body" color={colors.textSecondary}>
                      Cancel
                    </AppText>
                  </TouchableOpacity>
                  <View style={styles.updatePasswordSubmitWrap}>
                    <Button
                      label="Save"
                      onPress={handleSaveProfile}
                      loading={profileSaving}
                      disabled={profileSaving}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Account Report Modal */}
      <Modal
        visible={showAccountReport}
        transparent
        animationType="fade"
        onRequestClose={closeAccountReport}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeAccountReport}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={styles.modalContentWrap}>
            <Card style={styles.updatePasswordCard}>
              <AppText variant="h3" style={styles.updatePasswordTitle}>
                Account report
              </AppText>
              {accountReportLoading ? (
                <View style={styles.accountReportLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <AppText
                    variant="small"
                    color={colors.textSecondary}
                    style={styles.accountReportLoadingText}>
                    Generating report…
                  </AppText>
                </View>
              ) : accountReportError ? (
                <>
                  <AppText variant="small" color={colors.error} style={styles.updatePasswordError}>
                    {accountReportError}
                  </AppText>
                  <Button label="Close" onPress={closeAccountReport} />
                </>
              ) : accountReportData != null ? (
                <ScrollView
                  style={styles.accountReportScroll}
                  contentContainerStyle={styles.accountReportScrollContent}
                  showsVerticalScrollIndicator={false}>
                  <AccountReportContent data={accountReportData} />
                  <View style={styles.updatePasswordActions}>
                    <Button label="Close" onPress={closeAccountReport} />
                  </View>
                </ScrollView>
              ) : null}
            </Card>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Update Password Modal */}
      <Modal
        visible={showUpdatePassword}
        transparent
        animationType="fade"
        onRequestClose={closeUpdatePassword}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeUpdatePassword}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrap}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <Card style={styles.updatePasswordCard}>
                <AppText variant="h3" style={styles.updatePasswordTitle}>
                  Update Password
                </AppText>
                <AppText
                  variant="small"
                  color={colors.textSecondary}
                  style={styles.updatePasswordSubtitle}>
                  Enter your current password and choose a new one. Password must be 8+ characters
                  and include at least 3 of: uppercase, lowercase, number, special character.
                </AppText>
                <View style={styles.passwordInputWrap}>
                  <Input
                    label="Current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current password"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.updatePasswordInput}
                  />
                  <TouchableOpacity
                    style={styles.passwordEyeIcon}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    activeOpacity={0.7}
                    accessibilityLabel="Toggle password visibility"
                    accessibilityRole="button">
                    <MaterialIcons
                      name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.passwordInputWrap}>
                  <Input
                    label="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.updatePasswordInput}
                  />
                  <TouchableOpacity
                    style={styles.passwordEyeIcon}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    activeOpacity={0.7}
                    accessibilityLabel="Toggle password visibility"
                    accessibilityRole="button">
                    <MaterialIcons
                      name={showNewPassword ? 'visibility' : 'visibility-off'}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.passwordInputWrap}>
                  <Input
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.updatePasswordInput}
                  />
                  <TouchableOpacity
                    style={styles.passwordEyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.7}
                    accessibilityLabel="Toggle password visibility"
                    accessibilityRole="button">
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <AppText variant="small" color={colors.error} style={styles.updatePasswordError}>
                    {passwordError}
                  </AppText>
                ) : null}
                {passwordSuccess ? (
                  <AppText
                    variant="small"
                    color={colors.success}
                    style={styles.updatePasswordSuccess}>
                    Password updated. Logging you out…
                  </AppText>
                ) : null}
                <View style={styles.updatePasswordActions}>
                  <TouchableOpacity
                    style={styles.updatePasswordCancelBtn}
                    onPress={closeUpdatePassword}
                    disabled={passwordLoading}>
                    <AppText variant="body" color={colors.textSecondary}>
                      Cancel
                    </AppText>
                  </TouchableOpacity>
                  <View style={styles.updatePasswordSubmitWrap}>
                    <Button
                      label="Update Password"
                      onPress={handleUpdatePassword}
                      loading={passwordLoading}
                      disabled={passwordLoading}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  navbarWrapper: {
    paddingTop: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.primary, // Gradient-like solid color
    borderRadius: borderRadius.xl, // rounded-2xl in Figma
    padding: spacing.lg, // p-6 in Figma
    marginBottom: spacing.xl, // mb-8 for better spacing
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md, // space-x-4 in Figma
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80, // w-20 in Figma
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.whiteOpacity20, // bg-white/20 in Figma
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 32, // text-2xl in Figma
    fontWeight: '600', // font-semibold
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: colors.white,
    fontSize: 20, // text-xl in Figma
    fontWeight: '600', // font-semibold
    marginBottom: spacing.xs / 2, // mt-1 equivalent
  },
  userEmail: {
    marginTop: spacing.xs / 2,
    marginBottom: spacing.sm, // mt-2 equivalent
  },
  userTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, // px-3 in Figma
    paddingVertical: spacing.xs / 2, // py-1 in Figma
    borderRadius: borderRadius.xl, // rounded-full in Figma
    backgroundColor: colors.whiteOpacity20, // bg-white/20 in Figma
    marginTop: spacing.sm, // mt-2 in Figma
  },
  userTypeText: {
    fontWeight: '500', // font-medium
    textTransform: 'capitalize',
  },
  settingsContainer: {
    marginTop: 0, // Remove extra top margin
  },
  settingsGroup: {
    marginBottom: spacing.xl, // mb-8 for better spacing between groups
  },
  sectionGroupTitle: {
    fontWeight: '600', // font-semibold
    letterSpacing: 0.5, // tracking-wide
    marginBottom: spacing.sm, // mb-3 in Figma
  },
  settingsCard: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontWeight: '500',
    color: colors.text,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.sm,
  },
  emailHint: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  inputReadOnly: {
    opacity: 0.8,
  },
  appInfoContainer: {
    marginBottom: spacing.xl, // mb-8 for better spacing
    alignItems: 'center',
  },
  appInfoContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  appName: {
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    color: colors.text,
  },
  appVersion: {
    marginBottom: spacing.xs / 2,
    color: colors.textSecondary,
  },
  appCopyright: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md, // py-4 in Figma
    borderRadius: borderRadius.lg, // rounded-xl in Figma
    borderWidth: 2,
    borderColor: colors.error, // border-red-500 in Figma
    gap: spacing.sm, // space-x-2 in Figma
    marginTop: spacing.md, // Add top margin for separation
  },
  logoutText: {
    fontWeight: '600', // font-semibold
  },
  // Update Password modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBlack50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContentWrap: {
    width: '100%',
    maxWidth: 400,
  },
  updatePasswordCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  updatePasswordTitle: {
    marginBottom: spacing.xs,
    color: colors.text,
  },
  updatePasswordSubtitle: {
    marginBottom: spacing.lg,
  },
  updatePasswordInput: {
    marginBottom: spacing.md,
  },
  passwordInputWrap: {
    position: 'relative',
  },
  passwordEyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 48,
    padding: spacing.xs,
    zIndex: 1,
  },
  nameInput: {
    minHeight: 72,
    height: 80,
    textAlignVertical: 'top',
  },
  updatePasswordError: {
    marginBottom: spacing.sm,
  },
  updatePasswordSuccess: {
    marginBottom: spacing.sm,
  },
  updatePasswordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  updatePasswordCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  updatePasswordSubmitWrap: {
    minWidth: 140,
  },
  accountReportLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  accountReportLoadingText: {
    marginTop: spacing.sm,
  },
  accountReportScroll: {
    maxHeight: 400,
  },
  accountReportScrollContent: {
    paddingBottom: spacing.lg,
  },
  accountReportList: {
    gap: spacing.md,
  },
  accountReportItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  accountReportItemTitle: {
    marginBottom: spacing.xs,
  },
  accountReportRaw: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
});

export default ProfileScreen;
