import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Card } from './Card';
import { AppText } from './AppText';
import { colors, spacing } from '@shared/theme';
import type { CaregiverInvitation } from '@core/api/caregiverApi';

interface InvitationCardProps {
  invitation: CaregiverInvitation;
  onResend?: () => void;
  onRevoke?: () => void;
}

const formatRelationship = (relationship?: string): string => {
  if (!relationship) return 'Caregiver';
  const formatted = relationship.replace('_', ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return colors.warning;
    case 'ACCEPTED':
      return colors.success || colors.primary;
    case 'EXPIRED':
      return colors.error;
    case 'REVOKED':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'schedule';
    case 'ACCEPTED':
      return 'check-circle';
    case 'EXPIRED':
      return 'error-outline';
    case 'REVOKED':
      return 'cancel';
    default:
      return 'info';
  }
};

export const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  onResend,
  onRevoke,
}) => {
  const handleResend = () => {
    Alert.alert('Resend Invitation', `Resend invitation to ${invitation.caregiver_email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resend',
        onPress: onResend,
      },
    ]);
  };

  const handleRevoke = () => {
    Alert.alert(
      'Revoke Invitation',
      `Are you sure you want to revoke the invitation sent to ${invitation.caregiver_email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: onRevoke,
        },
      ],
    );
  };

  const statusColor = getStatusColor(invitation.status);
  const statusIcon = getStatusIcon(invitation.status);
  const isExpired = new Date(invitation.expires_at) < new Date();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.lightPrimary }]}>
            <MaterialIcons name="mail-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.invitationInfo}>
            <AppText variant="h3" style={styles.email}>
              {invitation.caregiver_email}
            </AppText>
            <View style={styles.statusRow}>
              <MaterialIcons name={statusIcon} size={16} color={statusColor} />
              <AppText variant="small" style={[styles.status, { color: statusColor }]}>
                {invitation.status}
                {invitation.status === 'PENDING' && isExpired && ' (Expired)'}
              </AppText>
            </View>
            <AppText variant="small" color={colors.textSecondary} style={styles.relationship}>
              {formatRelationship(invitation.relationship_with_senior)}
            </AppText>
          </View>
        </View>
        {invitation.status === 'PENDING' && !isExpired && (
          <View style={styles.actions}>
            {onResend && (
              <TouchableOpacity
                onPress={handleResend}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            {onRevoke && (
              <TouchableOpacity
                onPress={handleRevoke}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="cancel" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <MaterialIcons name="email" size={16} color={colors.icon} />
          <AppText variant="small" color={colors.textSecondary} style={styles.detailText}>
            Invitation sent {new Date(invitation.created_at).toLocaleDateString()}
          </AppText>
        </View>
        {invitation.status === 'PENDING' && (
          <View style={styles.detailItem}>
            <MaterialIcons name="schedule" size={16} color={colors.icon} />
            <AppText variant="small" color={colors.textSecondary} style={styles.detailText}>
              Expires {new Date(invitation.expires_at).toLocaleDateString()}
            </AppText>
          </View>
        )}
        {invitation.accepted_at && (
          <View style={styles.detailItem}>
            <MaterialIcons name="check-circle" size={16} color={colors.success || colors.primary} />
            <AppText variant="small" color={colors.textSecondary} style={styles.detailText}>
              Accepted {new Date(invitation.accepted_at).toLocaleDateString()}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  email: {
    marginBottom: spacing.xs / 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
  },
  status: {
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  relationship: {
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
  },
  details: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    flex: 1,
  },
});
