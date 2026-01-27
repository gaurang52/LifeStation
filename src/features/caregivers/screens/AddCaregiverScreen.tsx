import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Screen, AppText, Button, Input } from '@shared/components';
import { spacing, colors } from '@shared/theme';
import { caregiverApi } from '@core/api/caregiverApi';
import { ErrorHandler } from '@core/utils/errorHandler';
import { useNavigation } from '@react-navigation/native';

const ERROR_BACKGROUND_COLOR = '#fef2f2';

const AddCaregiverScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleSubmit = async () => {
    // Reset error
    setError(null);

    // Validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const response = await caregiverApi.addCaregiver({
        email: trimmedEmail,
        relationship_with_senior: 'other',
      });

      // Check if it's an invitation or direct mapping
      if (response.data.invitation_id) {
        // Invitation was sent
        Alert.alert(
          'Invitation Sent',
          `An invitation has been sent to ${trimmedEmail}. They will receive an email with instructions to join your care circle.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } else {
        // Direct mapping (caregiver already exists)
        Alert.alert(
          'Caregiver Added',
          `${response.data.caregiver?.name || trimmedEmail} has been added to your care circle.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } catch (err: unknown) {
      // Handle conflict errors (existing invitation)
      const errorResponse = err as {
        response?: {
          status?: number;
          data?: { data?: { invitation_id?: number; expires_at?: string } };
        };
      };
      if (
        errorResponse?.response?.status === 409 &&
        errorResponse?.response?.data?.data?.invitation_id
      ) {
        Alert.alert(
          'Invitation Already Sent',
          `An invitation has already been sent to ${trimmedEmail}. It expires on ${new Date(
            errorResponse.response.data.data.expires_at || '',
          ).toLocaleDateString()}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
        return;
      }

      const errorMessage =
        ErrorHandler.getErrorMessage(err) ||
        'Failed to add caregiver. Please check the email and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons name="person-add" size={28} color={colors.primary} />
          <AppText variant="h2" style={styles.headerTitle}>
            Add Caregiver
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.headerSubtitle}>
            Enter the email address of the caregiver you want to add to your care circle. If they
            don&apos;t have an account, an invitation will be sent.
          </AppText>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="caregiver@example.com"
              value={email}
              onChangeText={text => {
                setEmail(text);
                setError(null); // Clear error when user types
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={error || undefined}
              editable={!loading}
            />

            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color={colors.error} />
                <AppText variant="small" color={colors.error} style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Button
                label="Add Caregiver"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || !email.trim()}
              />
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: ERROR_BACKGROUND_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});

export default AddCaregiverScreen;
