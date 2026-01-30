import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Shield,
  User,
  Smartphone,
} from 'lucide-react-native';
import { Screen, AppText, Card, TopNavbar } from '@shared/components';
import { useAuthStore } from '@core/store';
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

  const handleLogout = () => {
    logout();
  };

  const handleDevicePress = () => {
    navigation.navigate(ROUTES.DEVICE_DETAILS_TAB);
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg, // px-6 in Figma
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm, // Minimal top padding since navbar already has spacing
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
    borderColor: colors.lightGray, // border-[#F5F5F5] in Figma
    borderRadius: borderRadius.lg, // Add border radius for modern look
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md, // p-4 in Figma
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // space-x-3 in Figma
    flex: 1,
  },
  settingIconContainer: {
    width: 40, // w-10 in Figma
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightPrimary, // bg-[#C2185B]/10 in Figma
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontWeight: '500', // font-medium
    color: colors.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // space-x-2 in Figma
  },
  badge: {
    paddingHorizontal: spacing.xs, // px-2 in Figma
    paddingVertical: spacing.xs / 2, // py-1 in Figma
    borderRadius: borderRadius.xl, // rounded-full in Figma
    backgroundColor: colors.primary, // bg-[#C2185B] in Figma
  },
  badgeText: {
    fontWeight: '600', // font-semibold
    fontSize: 12, // text-xs in Figma
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray, // border-[#F5F5F5] in Figma
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
});

export default ProfileScreen;
