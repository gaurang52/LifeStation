import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Card } from './Card';
import { AppText } from './AppText';
import { colors, spacing } from '@shared/theme';
import type { Caregiver } from '@core/api/caregiverApi';

interface CaregiverCardProps {
  caregiver: Caregiver;
  onPress?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

const formatRelationship = (relationship?: string): string => {
  if (!relationship) return 'Caregiver';
  const formatted = relationship.replace('_', ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const CaregiverCard: React.FC<CaregiverCardProps> = ({
  caregiver,
  onPress,
  onDelete,
  showDelete = false,
}) => {
  const handleDelete = () => {
    Alert.alert(
      'Remove Caregiver',
      `Are you sure you want to remove ${caregiver.name} from your care circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onDelete,
        },
      ],
    );
  };

  const content = (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
          </View>
          <View style={styles.caregiverInfo}>
            <AppText variant="h3" style={styles.caregiverName}>
              {caregiver.name}
            </AppText>
            <AppText variant="small" color={colors.textSecondary} style={styles.relationship}>
              {formatRelationship(caregiver.relationship_with_senior)}
            </AppText>
          </View>
        </View>
        {showDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="delete-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <MaterialIcons name="email" size={16} color={colors.icon} />
          <AppText variant="small" color={colors.textSecondary} style={styles.detailText}>
            {caregiver.email}
          </AppText>
        </View>
        {caregiver.mobile && (
          <View style={styles.detailItem}>
            <MaterialIcons name="phone" size={16} color={colors.icon} />
            <AppText variant="small" color={colors.textSecondary} style={styles.detailText}>
              {caregiver.mobile}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
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
    backgroundColor: colors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caregiverInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  caregiverName: {
    marginBottom: spacing.xs / 2,
  },
  relationship: {
    textTransform: 'capitalize',
  },
  deleteButton: {
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
