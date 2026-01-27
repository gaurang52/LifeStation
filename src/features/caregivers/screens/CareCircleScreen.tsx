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
import { Screen, AppText, CaregiverCard, InvitationCard, TopNavbar } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { caregiverApi, type Caregiver, type CaregiverInvitation } from '@core/api/caregiverApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@core/store';
import { ROUTES } from '@core/constants/routes';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const WARNING_BACKGROUND_COLOR = '#fffbeb';

const CareCircleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [invitations, setInvitations] = useState<CaregiverInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSenior = user?.user_type === 'senior';

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
      setCaregivers(response.data || []);

      // Load invitations if senior
      if (isSenior) {
        try {
          const invitationsResponse = await caregiverApi.listInvitations();
          setInvitations(invitationsResponse.data || []);
        } catch (invErr) {
          // Don't fail the whole request if invitations fail
          console.warn('Failed to load invitations:', invErr);
        }
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
        title={isSenior ? 'Care Circle' : 'My Seniors'}
        icon="people"
        rightAction={
          isSenior
            ? {
                label: 'Add',
                icon: 'add',
                onPress: handleAddPress,
              }
            : undefined
        }
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
      ) : caregivers.length === 0 && invitations.length === 0 ? (
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
              <MaterialIcons name="add-circle" size={24} color={colors.primary} />
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
          {caregivers.map(caregiver => (
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
    padding: spacing.md,
    paddingBottom: spacing.lg,
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
