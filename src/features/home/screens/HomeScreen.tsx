import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, AppText, Button } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing } from '@shared/theme';

const HomeScreen: React.FC = () => {
  const logout = useAuthStore(state => state.logout);

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h2">Home</AppText>
        <AppText variant="body" style={styles.body}>
          This is a sample home screen. Wire your feature components here.
        </AppText>
        <Button label="Sign Out" onPress={logout} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  body: {
    marginBottom: spacing.md,
  },
});

export default HomeScreen;
