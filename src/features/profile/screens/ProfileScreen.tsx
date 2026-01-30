import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Lock,
  Shield,
  User,
  Smartphone,
} from 'lucide-react-native';
import { Screen, AppText, Card, TopNavbar, Input, Button } from '@shared/components';
import { useAuthStore } from '@core/store';
import { authApi } from '@core/api/authApi';
import { spacing, colors, borderRadius } from '@shared/theme';
import { useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ROUTES } from '@core/constants/routes';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleDevicePress = () => {
    navigation.navigate(ROUTES.DEVICE_DETAILS_TAB);
  };

  const openUpdatePassword = () => {
    setShowUpdatePassword(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
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
        logout();
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
      <TopNavbar title="Profile" subtitle="Manage your account" variant="figma" />

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
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
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
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Bell size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Notifications
                  </AppText>
                </View>
                <View style={styles.settingRight}>
                  <View style={styles.badge}>
                    <AppText variant="small" color={colors.white} style={styles.badgeText}>
                      3
                    </AppText>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Shield size={20} color={colors.primary} />
                  </View>
                  <AppText variant="body" style={styles.settingLabel}>
                    Privacy & Security
                  </AppText>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
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
            </Card>
          </View>

          {/* Support Section */}
          <View style={styles.settingsGroup}>
            <AppText variant="small" color={colors.textSecondary} style={styles.sectionGroupTitle}>
              SUPPORT
            </AppText>
            <Card style={styles.settingsCard}>
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
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
              <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
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
                LifeStation CareAssist
              </AppText>
              <AppText variant="small" color={colors.textSecondary} style={styles.appVersion}>
                Version 1.0.0
              </AppText>
              <AppText variant="small" color={colors.textSecondary} style={styles.appCopyright}>
                © 2026 LifeStation Inc. All rights reserved.
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
                  Enter your current password and choose a new one (min 8 characters).
                </AppText>
                <Input
                  label="Current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.updatePasswordInput}
                />
                <Input
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.updatePasswordInput}
                />
                <Input
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.updatePasswordInput}
                />
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
  scrollContent: {
    paddingHorizontal: 8, // Match Home screen - less left/right padding
    paddingTop: spacing.sm, // Minimal top padding since navbar already has spacing
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
    paddingHorizontal: spacing.md,
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
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.md,
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
});

export default ProfileScreen;
