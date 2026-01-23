import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Card, TopNavbar } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing, colors } from '@shared/theme';

const ProfileScreen: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const handleLogout = () => {
    logout();
  };

  const renderInfoRow = (
    icon: string,
    label: string,
    value: string | null | undefined,
    iconColor?: string,
  ) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <MaterialIcons name={icon as string} size={20} color={iconColor || colors.icon} />
          <AppText variant="body" color={colors.textSecondary} style={styles.infoLabel}>
            {label}
          </AppText>
        </View>
        <AppText variant="bodyBold" style={styles.infoValue}>
          {value}
        </AppText>
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <TopNavbar title="Profile" icon="person" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={48} color={colors.primary} />
            </View>
            <AppText variant="h2" style={styles.userName}>
              {user?.name || 'User'}
            </AppText>
            <View style={styles.userTypeBadge}>
              <MaterialIcons
                name={user?.user_type === 'senior' ? 'elderly' : 'favorite'}
                size={16}
                color={colors.primary}
              />
              <AppText variant="caption" color={colors.primary}>
                {user?.user_type === 'senior'
                  ? 'Senior'
                  : user?.user_type === 'caregiver'
                  ? 'Caregiver'
                  : user?.user_type || 'User'}
              </AppText>
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={24} color={colors.primary} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Account Information
            </AppText>
          </View>
          {renderInfoRow('email', 'Email', user?.email)}
          {renderInfoRow('phone', 'Mobile', user?.mobile)}
          {renderInfoRow('home', 'Address', user?.address)}
          {renderInfoRow('badge', 'User ID', user?.id?.toString())}
          {renderInfoRow(
            'calendar-today',
            'Member Since',
            user?.created_at ? new Date(user.created_at).toLocaleDateString() : undefined,
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={24} color={colors.primary} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Settings
            </AppText>
          </View>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="notifications" size={20} color={colors.icon} />
              <AppText variant="body" style={styles.settingLabel}>
                Notifications
              </AppText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="security" size={20} color={colors.icon} />
              <AppText variant="body" style={styles.settingLabel}>
                Privacy & Security
              </AppText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="help" size={20} color={colors.icon} />
              <AppText variant="body" style={styles.settingLabel}>
                Help & Support
              </AppText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
          </TouchableOpacity>
        </Card>

        <View style={styles.logoutContainer}>
          <Button label="Sign Out" onPress={handleLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userName: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.lightPrimary,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    textAlign: 'right',
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  settingLabel: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  logoutContainer: {
    marginTop: spacing.md,
  },
});

export default ProfileScreen;
