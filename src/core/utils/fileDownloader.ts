import { Platform, PermissionsAndroid, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

/**
 * Convert string to base64 (React Native compatible)
 */
const stringToBase64 = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;

  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;

    // eslint-disable-next-line no-bitwise
    const bitmap = (a << 16) | (b << 8) | c;

    // eslint-disable-next-line no-bitwise
    result += chars.charAt((bitmap >> 18) & 63);
    // eslint-disable-next-line no-bitwise
    result += chars.charAt((bitmap >> 12) & 63);
    // eslint-disable-next-line no-bitwise
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    // eslint-disable-next-line no-bitwise
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
  }

  return result;
};

/**
 * Request storage permission for Android
 */
const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS doesn't need runtime permission for app's Documents folder
  }

  try {
    const androidVersion = Platform.Version as number;

    // Android 10+ (API 29+): Scoped storage allows writing to Downloads without permission
    // Android 13+ (API 33+): WRITE_EXTERNAL_STORAGE is deprecated, Downloads accessible without permission
    if (androidVersion >= 29) {
      // Android 10+ - scoped storage, no permission needed for Downloads folder
      return true;
    } else {
      // Android 9 and below (API 28 and below): Need WRITE_EXTERNAL_STORAGE permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'This app needs access to storage to save PDF reports to your Downloads folder',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn('Permission request error:', err);
    // If permission request fails, try to proceed anyway (might work for Downloads)
    return true;
  }
};

/**
 * Get downloads directory path
 */
const getDownloadsPath = (filename: string): string => {
  if (Platform.OS === 'ios') {
    // iOS: Use DocumentDirectoryPath
    return `${RNFS.DocumentDirectoryPath}/${filename}`;
  } else {
    // Android: Use DownloadDirectoryPath (Android 10+)
    return `${RNFS.DownloadDirectoryPath}/${filename}`;
  }
};

/**
 * Save file to device storage
 * @param base64Data - Base64 encoded file data
 * @param filename - Filename with extension
 * @param _mimeType - MIME type (e.g., 'application/pdf') - kept for API consistency
 * @returns Promise<string> - File path where file was saved
 */
export const saveFileToDevice = async (
  base64Data: string,
  filename: string,
  _mimeType: string,
): Promise<string> => {
  try {
    // Request permission for Android
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      throw new Error('Storage permission denied');
    }

    // Get file path
    const filePath = getDownloadsPath(filename);

    // Remove data URI prefix if present
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    // Write file
    await RNFS.writeFile(filePath, base64Content, 'base64');

    return filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

/**
 * Download and save file to device
 * @param data - File data (base64 string for PDF, plain string for text files)
 * @param filename - Filename with extension
 * @param mimeType - MIME type
 * @param isTextFile - Whether the data is plain text (needs base64 conversion)
 * @returns Promise<void>
 */
export const downloadFile = async (
  data: string,
  filename: string,
  mimeType: string,
  isTextFile: boolean = false,
): Promise<void> => {
  try {
    // Convert text to base64 if needed
    const base64Data = isTextFile ? stringToBase64(data) : data;

    const filePath = await saveFileToDevice(base64Data, filename, mimeType);

    // Show success message with file location
    const message =
      Platform.OS === 'ios'
        ? `File saved to Documents: ${filename}`
        : `File saved to Downloads: ${filename}`;

    Alert.alert('Download Complete', message, [
      {
        text: 'Open File',
        onPress: () => {
          // Open file using Share API
          Share.open({
            url: Platform.OS === 'ios' ? `file://${filePath}` : `file://${filePath}`,
            type: mimeType,
          }).catch(err => {
            console.warn('Error opening file:', err);
          });
        },
      },
      {
        text: 'OK',
        style: 'cancel',
      },
    ]);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};
