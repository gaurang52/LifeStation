import React from 'react';
import { StyleSheet, View, Platform, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Card } from './Card';
import { AppText } from './AppText';
import { spacing, colors } from '@shared/theme';

interface MapViewComponentProps {
  latitude?: number;
  longitude?: number;
  height?: number;
  showMarker?: boolean;
  markerTitle?: string;
}

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  latitude = 40.7128, // Default: New York City
  longitude = -74.006,
  height = 250,
  showMarker = true,
  markerTitle = 'Device Location',
}) => {
  // Convert and validate coordinates - ensure they are numbers
  const latNum = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lngNum = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  // Debug logging
  console.log('MapViewComponent - Rendering with coordinates:', {
    latitude: latNum,
    longitude: lngNum,
    platform: Platform.OS,
  });

  // Validate coordinates - check for NaN, null, undefined, or invalid ranges
  if (
    latNum === null ||
    latNum === undefined ||
    isNaN(latNum) ||
    lngNum === null ||
    lngNum === undefined ||
    isNaN(lngNum) ||
    latNum < -90 ||
    latNum > 90 ||
    lngNum < -180 ||
    lngNum > 180
  ) {
    console.warn('MapViewComponent - Invalid coordinates:', {
      latitude: latNum,
      longitude: lngNum,
    });

    const invalidStyle: ViewStyle = {
      ...styles.mapContainer,
      height,
    };

    return (
      <Card style={invalidStyle} padding={0}>
        <View style={styles.mapContent}>
          <AppText variant="body" color={colors.textSecondary} style={styles.mapText}>
            Invalid location coordinates
          </AppText>
          <AppText variant="small" color={colors.textSecondary} style={styles.mapSubtext}>
            Lat: {String(latitude)}, Lng: {String(longitude)}
          </AppText>
        </View>
      </Card>
    );
  }

  // Create region object for map
  const mapRegion = {
    latitude: latNum,
    longitude: lngNum,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const containerStyle: ViewStyle = {
    ...styles.mapContainer,
    height,
  };

  const mapStyle = {
    width: '100%' as const,
    height: height,
  };

  return (
    <Card style={containerStyle} padding={0}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={mapStyle}
        initialRegion={mapRegion}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor={colors.primary}
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onMapReady={() => {
          console.log('MapViewComponent - Map is ready');
        }}>
        {showMarker && (
          <Marker
            coordinate={{
              latitude: latNum,
              longitude: lngNum,
            }}
            title={markerTitle}
            description={`Lat: ${latNum.toFixed(6)}, Lng: ${lngNum.toFixed(6)}`}
            pinColor={colors.primary}
          />
        )}
      </MapView>
    </Card>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    overflow: 'hidden',
    marginBottom: spacing.md,
    width: '100%',
  },
  mapContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  mapText: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  mapSubtext: {
    textAlign: 'center',
    fontSize: 10,
  },
});
