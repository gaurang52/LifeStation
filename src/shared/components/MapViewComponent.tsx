import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Card } from './Card';
import { AppText } from './AppText';
import { spacing, colors } from '@shared/theme';
import { ENV } from '@core/constants/env';

interface MapViewComponentProps {
  latitude?: number;
  longitude?: number;
  height?: number;
  showMarker?: boolean;
  markerTitle?: string;
}

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  latitude = 37.78825,
  longitude = -122.4324,
  height = 250,
  showMarker = true,
  markerTitle = 'Device Location',
}) => {
  // Check if Google Maps API key is configured
  const hasApiKey = ENV.GOOGLE_MAPS_API_KEY && ENV.GOOGLE_MAPS_API_KEY.length > 0;

  if (!hasApiKey) {
    return (
      <Card style={[styles.mapContainer, { height }]} padding={0}>
        <View style={styles.mapContent}>
          <AppText variant="body" color={colors.textSecondary} style={styles.mapText}>
            Google Maps API key not configured
          </AppText>
          <AppText variant="small" color={colors.textSecondary} style={styles.mapSubtext}>
            Please set GOOGLE_PLACE_API_KEY in your .env file
          </AppText>
        </View>
      </Card>
    );
  }

  // Convert and validate coordinates - ensure they are numbers
  const latNum = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  const lngNum = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

  // Debug logging
  console.log('MapViewComponent - Received coordinates:', {
    originalLatitude: latitude,
    originalLongitude: longitude,
    latitudeType: typeof latitude,
    longitudeType: typeof longitude,
    convertedLatitude: latNum,
    convertedLongitude: lngNum,
    isLatValid: !isNaN(latNum) && latNum !== null && latNum !== undefined,
    isLngValid: !isNaN(lngNum) && lngNum !== null && lngNum !== undefined,
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
    return (
      <Card style={[styles.mapContainer, { height }]} padding={0}>
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

  // Use converted numeric values
  const finalLat = latNum;
  const finalLng = lngNum;

  console.log('MapViewComponent - Rendering map with coordinates:', {
    latitude: finalLat,
    longitude: finalLng,
  });

  return (
    <Card style={[styles.mapContainer, { height }]} padding={0}>
      <View style={[styles.mapWrapper, { height }]}>
        <MapView
          key={`map-${finalLat}-${finalLng}`}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: finalLat,
            longitude: finalLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
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
          }}
          onError={error => {
            console.error('MapViewComponent - Map error:', error);
          }}>
          {showMarker && (
            <Marker
              coordinate={{
                latitude: finalLat,
                longitude: finalLng,
              }}
              title={markerTitle}
              pinColor={colors.primary}
            />
          )}
        </MapView>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  mapWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
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
