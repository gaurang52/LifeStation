import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AppText } from './AppText';
import { Card } from './Card';
import { spacing, colors } from '@shared/theme';

interface MapPlaceholderProps {
  latitude?: number;
  longitude?: number;
  height?: number;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  latitude = 37.78825,
  longitude = -122.4324,
  height = 250,
}) => {
  return (
    <Card style={[styles.mapContainer, { height }]}>
      <View style={styles.mapContent}>
        <MaterialIcons name="map" size={48} color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={styles.mapText}>
          {latitude !== 0 && longitude !== 0
            ? `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : 'Map View'}
        </AppText>
        <AppText variant="small" color={colors.textSecondary} style={styles.mapSubtext}>
          Install react-native-maps for full map functionality
        </AppText>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  mapContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  mapText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  mapSubtext: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 10,
  },
});
