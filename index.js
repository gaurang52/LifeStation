/**
 * @format
 */

import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

enableScreens();

// Setup background notification handler (must be called before AppRegistry)
import { setupBackgroundNotificationHandler } from '@core/services/notificationHandler';
setupBackgroundNotificationHandler();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
