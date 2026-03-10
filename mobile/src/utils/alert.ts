import { Platform, Alert } from "react-native";

/**
 * Cross-platform alert that works on both native and web.
 * On web, falls back to window.alert / window.confirm.
 */
export function showAlert(
  title: string,
  message: string,
  onOk?: () => void,
) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
    onOk?.();
  } else {
    Alert.alert(
      title,
      message,
      onOk ? [{ text: "OK", onPress: onOk }] : undefined,
    );
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", style: "destructive", onPress: onConfirm },
    ]);
  }
}
