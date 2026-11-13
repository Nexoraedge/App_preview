// apps/mobile/src/utils/crossAlert.ts
// Cross-platform confirmation dialog (works on React Native Web as well as iOS/Android)

import { Alert, Platform } from 'react-native';

export function confirmDialog(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true
) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: () => {
        onConfirm();
      },
    },
  ]);
}

