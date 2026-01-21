import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, AppText } from '@shared/components';
import { useAuthStore } from '@core/store';
import { spacing } from '@shared/theme';

const ProfileScreen: React.FC = () => {
  const user = useAuthStore(state => state.user);

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h2">Profile</AppText>
        {user ? (
          <>
            <AppText variant="bodyBold">Name: {user.name}</AppText>
            <AppText variant="body">Email: {user.email}</AppText>
          </>
        ) : (
          <AppText variant="body">No user data available.</AppText>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
});

export default ProfileScreen;
