import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Clock, UserPlus, Users } from 'lucide-react-native';
import {
  Screen,
  AppText,
  CaregiverCard,
  InvitationCard,
  TopNavbar,
  Card,
  Button,
} from '@shared/components';
import { spacing, colors } from '@shared/theme';
import {
  caregiverApi,
  type Caregiver,
  type CaregiverInvitation,
  type InvitedCaregiverItem,
} from '@core/api/caregiverApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@core/store';
import { ROUTES } from '@core/constants/routes';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const WARNING_BACKGROUND_COLOR = '#fffbeb';

const isCaregiverActiveStatus = (status?: string | null): boolean => {
  const normalized = (status || '').trim().toLowerCase();
  // Backend defaults caregivers.status to "ACTIVATED"
  return normalized === 'active' || normalized === 'activated';
};

const CareCircleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [invitations, setInvitations] = useState<CaregiverInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSenior = user?.user_type === 'senior';
  const activeCaregivers = isSenior
    ? caregivers.filter(c => isCaregiverActiveStatus(c.status))
    : caregivers;

  const loadCaregivers = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = isSenior
        ? await caregiverApi.getCaregivers()
        : await caregiverApi.getSeniors();
      const rawData = response.data || [];

      if (isSenior) {
        const caregiversOnly = rawData.filter(
          (x): x is Caregiver => x.id != null && !(x as InvitedCaregiverItem).is_invited,
        );
        const invitedOnly = rawData.filter(
          (x): x is InvitedCaregiverItem => (x as InvitedCaregiverItem).is_invited === true,
        );
        setCaregivers(caregiversOnly);
        setInvitations(
          invitedOnly.map(
            (inv): CaregiverInvitation => ({
              id: inv.invitation_id,
              caregiver_email: inv.email,
              status: 'PENDING',
              relationship_with_senior: inv.relationship_with_senior,
              created_at: inv.invitation_date || '',
              expires_at: inv.expires_at || '',
            }),
          ),
        );
      } else {
        setCaregivers(rawData as Caregiver[]);
        setInvitations([]);
      }
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to load care circle. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCaregivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    loadCaregivers(true);
  };

  const handleDelete = async (caregiverId: number) => {
    if (!isSenior) return;

    try {
      await caregiverApi.deleteCaregiver({ caregiver_id: caregiverId });
      // Reload the list after deletion
      await loadCaregivers();
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to remove caregiver. Please try again.';
      setError(errorMessage);
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    try {
      await caregiverApi.resendInvitation(invitationId);
      await loadCaregivers();
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to resend invitation. Please try again.';
      setError(errorMessage);
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    try {
      await caregiverApi.revokeInvitation(invitationId);
      await loadCaregivers();
    } catch (err) {
      const errorMessage =
        ErrorHandler.getErrorMessage(err) || 'Failed to revoke invitation. Please try again.';
      setError(errorMessage);
    }
  };

  const handleAddPress = () => {
    navigation.navigate(ROUTES.ADD_CAREGIVER);
  };

  if (loading && caregivers.length === 0) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <MaterialIcons name="people" size={64} color={colors.primary} />
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading care circle...
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TopNavbar
        title="Care Circle"
        subtitle="Manage your caregivers and contacts"
        variant="figma"
      />

      {error && caregivers.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Care Circle
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorText}>
            {error}
          </AppText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadCaregivers()}
            activeOpacity={0.7}>
            <AppText variant="bodyBold" color={colors.primary}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (isSenior ? activeCaregivers.length === 0 : caregivers.length === 0) &&
        invitations.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="people-outline" size={64} color={colors.icon} />
          <AppText variant="h3" style={styles.emptyTitle}>
            {isSenior ? 'No Caregivers Yet' : 'No Seniors Yet'}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            {isSenior
              ? 'Add caregivers to your care circle to help monitor your health and devices'
              : 'You will see seniors here once they add you to their care circle'}
          </AppText>
          {isSenior && (
            <TouchableOpacity
              style={styles.addCaregiverButton}
              onPress={handleAddPress}
              activeOpacity={0.7}>
              <UserPlus size={20} color={colors.primary} />
              <AppText variant="bodyBold" color={colors.primary}>
                Add Caregiver
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }>
          {error && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="info-outline" size={20} color={colors.warning} />
              <AppText variant="small" color={colors.warning} style={styles.errorBannerText}>
                {error}
              </AppText>
            </View>
          )}

          {/* Summary Cards */}
          {isSenior && (
            <View style={styles.summaryCards}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      { backgroundColor: colors.success + '20' },
                    ]}>
                    <View style={[styles.summaryIconCircle, { backgroundColor: colors.success }]}>
                      <Users size={16} color={colors.white} />
                    </View>
                    <AppText variant="h2" style={styles.summaryNumber}>
                      {activeCaregivers.length}
                    </AppText>
                  </View>
                  <AppText variant="small" color={colors.textSecondary}>
                    Active Caregivers
                  </AppText>
                </View>
              </Card>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      { backgroundColor: colors.warning + '20' },
                    ]}>
                    <View style={[styles.summaryIconCircle, { backgroundColor: colors.warning }]}>
                      <Clock size={16} color={colors.white} />
                    </View>
                    <AppText variant="h2" style={styles.summaryNumber}>
                      {invitations.filter(inv => inv.status === 'PENDING').length}
                    </AppText>
                  </View>
                  <AppText variant="small" color={colors.textSecondary}>
                    Pending Invites
                  </AppText>
                </View>
              </Card>
            </View>
          )}

          {/* Add Caregiver Button */}
          {isSenior && (
            <View style={styles.addButtonContainer}>
              <Button label="Add Caregiver" onPress={handleAddPress} disabled={false} />
            </View>
          )}

          {/* Care Team Section */}
          <View style={styles.careTeamSection}>
            <AppText variant="h3" style={styles.careTeamTitle}>
              Your Care Team
            </AppText>
          </View>

          {/* Show pending invitations first */}
          {isSenior &&
            invitations
              .filter(inv => inv.status === 'PENDING')
              .map(invitation => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResend={() => handleResendInvitation(invitation.id)}
                  onRevoke={() => handleRevokeInvitation(invitation.id)}
                />
              ))}
          {/* Show accepted caregivers */}
          {activeCaregivers.map(caregiver => (
            <CaregiverCard
              key={caregiver.id}
              caregiver={caregiver}
              showDelete={isSenior}
              onDelete={() => handleDelete(caregiver.id)}
            />
          ))}
          {/* Show other invitation statuses (expired, revoked) */}
          {isSenior &&
            invitations
              .filter(inv => inv.status !== 'PENDING')
              .map(invitation => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onResend={
                    invitation.status === 'EXPIRED'
                      ? () => handleResendInvitation(invitation.id)
                      : undefined
                  }
                />
              ))}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: spacing.sm, // gap-3 in Figma
    marginBottom: spacing.lg, // mb-6 in Figma
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md, // p-4 in Figma
  },
  summaryCardContent: {
    gap: spacing.sm, // mb-2 equivalent
  },
  summaryIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // space-x-2 in Figma
    marginBottom: spacing.sm, // mb-2 in Figma
  },
  summaryIconCircle: {
    width: 32, // w-8 in Figma
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryNumber: {
    fontSize: 24, // text-2xl in Figma
    fontWeight: '600', // font-semibold
    color: colors.text,
  },
  addButtonContainer: {
    marginBottom: spacing.lg, // mb-6 in Figma
  },
  careTeamSection: {
    marginBottom: spacing.md, // mb-4 in Figma
  },
  careTeamTitle: {
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loader: {
    marginTop: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorTitle: {
    marginTop: spacing.md,
    color: colors.error,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  addCaregiverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.lightPrimary,
    marginTop: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WARNING_BACKGROUND_COLOR,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  errorBannerText: {
    marginLeft: spacing.xs,
    flex: 1,
  },
});

export default CareCircleScreen;
