import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Input } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { deviceApi, type AddDeviceRequest } from '@core/api/deviceApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '@core/constants/routes';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '@core/store';

type NavigationProp = StackNavigationProp<AppStackParamList>;

const AddDeviceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [deviceImei, setDeviceImei] = useState('');
  const [simIccid, setSimIccid] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateIMEI = (imei: string): boolean => {
    const imeiRegex = /^\d{15}$/;
    if (!imei) {
      setErrors(prev => ({ ...prev, device_imei: 'Device IMEI is required' }));
      return false;
    }
    if (!imeiRegex.test(imei)) {
      setErrors(prev => ({
        ...prev,
        device_imei: 'IMEI must be exactly 15 digits',
      }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.device_imei;
      return newErrors;
    });
    return true;
  };

  const handleSubmit = async () => {
    if (!validateIMEI(deviceImei)) {
      return;
    }

    if (user?.user_type !== 'senior') {
      Alert.alert(
        'Access Denied',
        'Only senior accounts can register devices. Please log in as a senior user.',
      );
      return;
    }

    setLoading(true);
    try {
      const payload: AddDeviceRequest = {
        device_imei: deviceImei.trim(),
        sim_action: 'none',
      };

      if (simIccid.trim()) {
        payload.sim_iccid = simIccid.trim();
      }

      if (deviceType.trim()) {
        payload.device_type = deviceType.trim();
      }

      const response = await deviceApi.addDevice(payload);

      Alert.alert('Success', response.message || 'Device registered successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string } } };
      const errorMessage =
        errorResponse?.response?.data?.error ||
        ErrorHandler.getErrorMessage(err) ||
        'Failed to add device. Please try again.';

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <MaterialIcons name="add-circle" size={32} color={colors.primary} />
            <AppText variant="h2" style={styles.headerTitle}>
              Add Device
            </AppText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <AppText variant="bodyBold" style={styles.infoTitle}>
                Register a New Device
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Enter your device&apos;s IMEI number to register it with your account. The IMEI is a
                15-digit number found on your device or in its settings.
              </AppText>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="devices"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <Input
                label="Device IMEI *"
                placeholder="Enter 15-digit IMEI"
                keyboardType="numeric"
                maxLength={15}
                value={deviceImei}
                onChangeText={text => {
                  setDeviceImei(text);
                  if (errors.device_imei) validateIMEI(text);
                }}
                error={errors.device_imei}
                onBlur={() => validateIMEI(deviceImei)}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="sim-card"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <Input
                label="SIM ICCID"
                placeholder="Enter SIM ICCID (optional)"
                keyboardType="numeric"
                value={simIccid}
                onChangeText={setSimIccid}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="category"
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <Input
                label="Device Type"
                placeholder="Enter device type (optional)"
                value={deviceType}
                onChangeText={setDeviceType}
                style={styles.input}
              />
            </View>

            {user?.user_type !== 'senior' && (
              <View style={styles.warningCard}>
                <MaterialIcons name="warning" size={20} color={colors.warning} />
                <AppText variant="caption" color={colors.warning} style={styles.warningText}>
                  Only senior accounts can register devices. Please log in as a senior user.
                </AppText>
              </View>
            )}

            <Button
              label="Register Device"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || !deviceImei.trim() || user?.user_type !== 'senior'}
            />
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.lightPrimary,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    marginBottom: spacing.xs,
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
    top: 32,
    zIndex: 1,
  },
  input: {
    paddingLeft: spacing.xl + spacing.md,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.xs,
  },
  warningText: {
    flex: 1,
  },
});

export default AddDeviceScreen;
