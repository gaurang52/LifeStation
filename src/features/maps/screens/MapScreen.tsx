import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Screen, TopNavbar } from '@shared/components';
import { colors } from '@shared/theme';
import { deviceApi, type Device } from '@core/api/deviceApi';

const MapScreen: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);

  // Default location (New York City)
  const defaultLocation = {
    latitude: 40.7128,
    longitude: -74.006,
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDevices = async () => {
      try {
        const response = await deviceApi.getDevices();
        const deviceList = response.devices || [];
        if (isMounted) {
          setDevices(deviceList);
        }
      } catch (err: unknown) {
        console.error('Error fetching devices:', err);
      }
    };

    fetchDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate map region based on devices or use default
  const getMapRegion = () => {
    const validDevices = devices.filter(
      d =>
        d.location?.latitude &&
        d.location?.longitude &&
        !isNaN(d.location.latitude) &&
        !isNaN(d.location.longitude),
    );

    if (validDevices.length === 0) {
      return {
        ...defaultLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // If we have devices, center on the first device's location
    const firstDevice = validDevices[0];
    const lat =
      typeof firstDevice.location!.latitude === 'string'
        ? parseFloat(firstDevice.location!.latitude)
        : firstDevice.location!.latitude;
    const lng =
      typeof firstDevice.location!.longitude === 'string'
        ? parseFloat(firstDevice.location!.longitude)
        : firstDevice.location!.longitude;

    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  const mapRegion = getMapRegion();

  return (
    <Screen padded={false} style={styles.screen}>
      <TopNavbar
        title="Maps/GPS Location"
        subtitle="Location tracking and geofencing"
        variant="figma"
      />
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          pitchEnabled={true}
          loadingEnabled={true}
          loadingIndicatorColor={colors.primary}
          mapType="standard"
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onMapReady={() => {
            console.log('MapScreen - Map is ready');
          }}>
          {devices
            .filter(
              d =>
                d.location?.latitude &&
                d.location?.longitude &&
                !isNaN(d.location.latitude) &&
                !isNaN(d.location.longitude),
            )
            .map((device, index) => {
              const lat =
                typeof device.location!.latitude === 'string'
                  ? parseFloat(device.location!.latitude)
                  : device.location!.latitude;
              const lng =
                typeof device.location!.longitude === 'string'
                  ? parseFloat(device.location!.longitude)
                  : device.location!.longitude;

              return (
                <Marker
                  key={`${device.device_id}-${device.id_type}-${index}`}
                  coordinate={{
                    latitude: lat,
                    longitude: lng,
                  }}
                  title={device.name || `Device ${device.device_id}`}
                  description={`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`}
                  pinColor={colors.primary}
                />
              );
            })}
        </MapView>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default MapScreen;
