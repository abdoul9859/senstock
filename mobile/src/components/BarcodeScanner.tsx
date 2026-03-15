import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import { X, Zap, Camera } from "lucide-react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
  title?: string;
}

export default function BarcodeScanner({ visible, onClose, onScanned, title = "Scanner" }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!visible) { setScanned(false); return; }
    requestPermission();
  }, [visible]);

  async function requestPermission() {
    try {
      const { Camera } = await import("expo-camera");
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    } catch {
      setHasPermission(false);
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  }

  if (!visible) return null;

  // Web fallback — expo-camera doesn't work on web in all setups
  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
        <View style={styles.overlay}>
          <View style={styles.webContainer}>
            <Text style={styles.title}>{title}</Text>
            <Camera size={48} color="#9ca3af" />
            <Text style={styles.webNote}>Le scanner n'est pas disponible sur le web.</Text>
            <Text style={styles.webNote}>Entrez le code manuellement.</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {hasPermission === null && (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.permText}>Demande d'autorisation caméra...</Text>
          </View>
        )}

        {hasPermission === false && (
          <View style={styles.center}>
            <Camera size={48} color="#9ca3af" />
            <Text style={styles.permText}>Accès à la caméra refusé.</Text>
            <Text style={styles.permSubText}>Autorisez l'accès dans les paramètres de l'appareil.</Text>
          </View>
        )}

        {hasPermission === true && (
          <ScannerView onScanned={handleBarcodeScanned} scanned={scanned} onReset={() => setScanned(false)} />
        )}
      </View>
    </Modal>
  );
}

function ScannerView({ onScanned, scanned, onReset }: {
  onScanned: (e: { data: string }) => void;
  scanned: boolean;
  onReset: () => void;
}) {
  const [CameraView, setCameraView] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("expo-camera").then((mod) => {
      setCameraView(() => mod.CameraView);
    }).catch(() => {});
  }, []);

  if (!CameraView) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "itf14", "datamatrix", "aztec", "pdf417"] }}
        onBarcodeScanned={scanned ? undefined : onScanned}
      />
      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.finder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.hint}>Pointez vers un code-barres ou QR code</Text>
      </View>
      {scanned && (
        <View style={styles.scannedBar}>
          <Zap size={16} color="#fff" />
          <Text style={styles.scannedText}>Code scanné</Text>
          <TouchableOpacity onPress={onReset} style={styles.retryBtn}>
            <Text style={styles.retryText}>Scanner à nouveau</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  closeIcon: { padding: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  permText: { color: "#fff", fontSize: 16, textAlign: "center", marginTop: 12 },
  permSubText: { color: "#9ca3af", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  cameraContainer: { flex: 1, position: "relative" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  finder: {
    width: 240, height: 240,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 32, height: 32,
    borderColor: "#22c55e",
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { color: "#fff", marginTop: 24, fontSize: 14, textAlign: "center" },
  scannedBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.8)", padding: 16, gap: 12,
  },
  scannedText: { color: "#fff", fontSize: 14, flex: 1 },
  retryBtn: { backgroundColor: "#22c55e", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  // Web fallback
  webContainer: {
    backgroundColor: "#1f2937", borderRadius: 16, padding: 32,
    alignItems: "center", gap: 12, width: "80%", maxWidth: 360,
  },
  webNote: { color: "#9ca3af", textAlign: "center", fontSize: 14 },
  closeBtn: { marginTop: 16, backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  closeBtnText: { color: "#fff", fontWeight: "600" },
});
