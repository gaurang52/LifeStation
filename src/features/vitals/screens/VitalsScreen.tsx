import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Input, Card, TopNavbar } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { vitalsApi, type VitalData } from '@core/api/vitalsApi';
import { useAuthStore } from '@core/store';
import { ErrorHandler } from '@core/utils/errorHandler';

const VitalsScreen: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [vitals, setVitals] = useState<VitalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seniorId, setSeniorId] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (user?.user_type === 'senior' && user.id) {
      setSeniorId(user.id.toString());
      loadVitals(user.id);
    } else {
      setLoading(false);
      setShowInput(true);
    }
  }, [user]);

  const loadVitals = async (targetSeniorId?: number) => {
    const idToUse = targetSeniorId || parseInt(seniorId, 10);
    if (!idToUse || isNaN(idToUse)) {
      setError('Please enter a valid senior ID');
      return;
    }

    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);

      const response = await vitalsApi.getRecentVitals(idToUse);
      setVitals(response.vitals || []);

      if (response.cached && response.warning) {
        console.warn('Using cached data:', response.warning);
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      const errorMessage =
        errorResponse?.response?.data?.error ||
        ErrorHandler.getErrorMessage(err) ||
        'Failed to load vitals. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    const idToUse = user?.user_type === 'senior' ? user.id : parseInt(seniorId, 10);
    if (idToUse) {
      setRefreshing(true);
      loadVitals(idToUse);
    }
  };

  const handleLoadVitals = () => {
    loadVitals();
  };

  const handleDownload = async (format: 'csv' | 'pdf' = 'csv') => {
    const idToUse = user?.user_type === 'senior' ? user.id : parseInt(seniorId, 10);
    if (!idToUse || isNaN(idToUse)) {
      Alert.alert('Error', 'Please enter a valid senior ID');
      return;
    }

    if (vitals.length === 0) {
      Alert.alert('No Data', 'No vitals data available to download. Please load vitals first.');
      return;
    }

    try {
      setDownloading(true);
      setError(null);

      const result = await vitalsApi.downloadVitalsReport(idToUse, format);

      // Use React Native Share API to save/share the file
      const shareOptions = {
        message: result.data,
        title: `Vitals Report - ${result.filename}`,
      };

      if (Platform.OS === 'ios') {
        // On iOS, Share API will allow saving to Files app
        await Share.share(shareOptions);
      } else {
        // On Android, Share API will show options to save/share
        await Share.share(shareOptions);
      }

      Alert.alert('Success', `Report downloaded successfully: ${result.filename}`);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      const errorMessage =
        errorResponse?.response?.data?.error ||
        ErrorHandler.getErrorMessage(err) ||
        'Failed to download report. Please try again.';

      Alert.alert('Download Failed', errorMessage);
      setError(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const renderVitalCard = (vital: VitalData, index: number) => {
    return (
      <Card key={index} style={styles.vitalCard}>
        <View style={styles.vitalHeader}>
          <MaterialIcons name="favorite" size={20} color={colors.primary} />
          <AppText variant="caption" color={colors.textSecondary} style={styles.timestamp}>
            {formatTimestamp(vital.timestamp)}
          </AppText>
        </View>
        <View style={styles.vitalMetrics}>
          {vital.heart_rate !== null && vital.heart_rate !== undefined && (
            <View style={styles.metric}>
              <View style={styles.metricHeader}>
                <MaterialIcons name="favorite" size={24} color={colors.red} />
                <AppText variant="caption" color={colors.textSecondary}>
                  Heart Rate
                </AppText>
              </View>
              <AppText variant="h2" color={colors.red}>
                {vital.heart_rate}
              </AppText>
              <AppText variant="small" color={colors.textSecondary}>
                bpm
              </AppText>
            </View>
          )}
          {vital.blood_pressure && (
            <View style={styles.metric}>
              <View style={styles.metricHeader}>
                <MaterialIcons name="monitor-heart" size={24} color={colors.primary} />
                <AppText variant="caption" color={colors.textSecondary}>
                  Blood Pressure
                </AppText>
              </View>
              <AppText variant="h2" color={colors.primary}>
                {vital.blood_pressure.systolic || '--'}/{vital.blood_pressure.diastolic || '--'}
              </AppText>
              <AppText variant="small" color={colors.textSecondary}>
                mmHg
              </AppText>
            </View>
          )}
          {vital.temperature !== null && vital.temperature !== undefined && (
            <View style={styles.metric}>
              <View style={styles.metricHeader}>
                <MaterialIcons name="device-thermostat" size={24} color={colors.warning} />
                <AppText variant="caption" color={colors.textSecondary}>
                  Temperature
                </AppText>
              </View>
              <AppText variant="h2" color={colors.warning}>
                {vital.temperature}
              </AppText>
              <AppText variant="small" color={colors.textSecondary}>
                °C
              </AppText>
            </View>
          )}
          {vital.oxygen_saturation !== null && vital.oxygen_saturation !== undefined && (
            <View style={styles.metric}>
              <View style={styles.metricHeader}>
                <MaterialIcons name="air" size={24} color={colors.blue} />
                <AppText variant="caption" color={colors.textSecondary}>
                  Oxygen Saturation
                </AppText>
              </View>
              <AppText variant="h2" color={colors.blue}>
                {vital.oxygen_saturation}
              </AppText>
              <AppText variant="small" color={colors.textSecondary}>
                %
              </AppText>
            </View>
          )}
          {vital.steps !== null && vital.steps !== undefined && (
            <View style={styles.metric}>
              <View style={styles.metricHeader}>
                <MaterialIcons name="directions-walk" size={24} color={colors.footSteps} />
                <AppText variant="caption" color={colors.textSecondary}>
                  Steps
                </AppText>
              </View>
              <AppText variant="h2" color={colors.footSteps}>
                {vital.steps}
              </AppText>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (loading && vitals.length === 0) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <MaterialIcons name="favorite" size={64} color={colors.primary} />
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          <AppText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Loading vitals...
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <TopNavbar
        title="Recent Vitals"
        icon="favorite"
        rightAction={
          vitals.length > 0
            ? {
                label: downloading ? 'Downloading...' : 'Download',
                icon: downloading ? undefined : 'download',
                onPress: () => {
                  Alert.alert(
                    'Download Report',
                    'Choose a format:',
                    [
                      {
                        text: 'CSV',
                        onPress: () => handleDownload('csv'),
                      },
                      {
                        text: 'PDF',
                        onPress: () => handleDownload('pdf'),
                      },
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                    ],
                    { cancelable: true },
                  );
                },
              }
            : user?.user_type !== 'senior'
            ? {
                label: showInput ? 'Hide' : 'Enter ID',
                onPress: () => setShowInput(!showInput),
              }
            : undefined
        }
      />
      {showInput && user?.user_type !== 'senior' && (
        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={20} color={colors.icon} style={styles.inputIcon} />
            <Input
              label="Senior ID"
              placeholder="Enter senior ID"
              keyboardType="numeric"
              value={seniorId}
              onChangeText={setSeniorId}
              style={styles.searchInput}
            />
          </View>
          <Button label="Load Vitals" onPress={handleLoadVitals} />
        </View>
      )}

      {error && vitals.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <AppText variant="h3" style={styles.errorTitle}>
            Unable to Load Vitals
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.errorText}>
            {error}
          </AppText>
          <Button label="Retry" onPress={handleRefresh} />
        </View>
      ) : vitals.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="favorite-border" size={64} color={colors.icon} />
          <AppText variant="h3" style={styles.emptyTitle}>
            No Vitals Data
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
            {user?.user_type !== 'senior'
              ? 'Enter a senior ID to view their vitals'
              : 'No vitals data available at this time'}
          </AppText>
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
          {vitals.map((vital, index) => renderVitalCard(vital, index))}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    flex: 1,
  },
  toggleButton: {
    padding: spacing.xs,
  },
  downloadButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 32,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: spacing.xl + spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  vitalCard: {
    marginBottom: spacing.md,
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  timestamp: {
    fontWeight: '600',
  },
  vitalMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: spacing.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  emptyTitle: {
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
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

export default VitalsScreen;
