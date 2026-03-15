import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView, Image, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Trash2, Search, Camera, X, ImageIcon } from "lucide-react-native";
import { apiFetch, API_BASE, getToken } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface RequestItem {
  description: string;
  quantity: string;
  notes: string;
  photos: string[];
}

interface ClientRequest {
  _id: string;
  number: string;
  status: string;
  priority: string;
  date: string;
  notes: string;
  items: (RequestItem & { _id?: string })[];
  client?: { _id: string; name: string; phone: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  nouvelle: { label: "Nouvelle", color: "#3b82f6" },
  en_cours: { label: "En cours", color: "#f97316" },
  terminee: { label: "Terminée", color: "#22c55e" },
  annulee: { label: "Annulée", color: "#ef4444" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  basse: { label: "Basse", color: "#64748b" },
  normale: { label: "Normale", color: "#3b82f6" },
  haute: { label: "Haute", color: "#f97316" },
  urgente: { label: "Urgente", color: "#ef4444" },
};

async function pickImage(): Promise<string | null> {
  try {
    const ImagePicker = await import("expo-image-picker");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission requise", "L'accès à la galerie est requis");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      quality: 0.7,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0].uri;
  } catch { return null; }
}

async function uploadImage(uri: string): Promise<string | null> {
  try {
    const token = await getToken();
    const formData = new FormData();
    const filename = uri.split("/").pop() || "photo.jpg";
    formData.append("file", { uri, name: filename, type: "image/jpeg" } as any);
    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    return null;
  } catch { return null; }
}

export default function DemandesClientsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRequest | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formStatus, setFormStatus] = useState("nouvelle");
  const [formPriority, setFormPriority] = useState("normale");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<RequestItem[]>([{ description: "", quantity: "1", notes: "", photos: [] }]);
  const [uploadingPhotoIdx, setUploadingPhotoIdx] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiFetch("/api/client-requests");
      if (res.ok) setRequests(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => {
    const unsub = nav.addListener("focus", () => fetchRequests());
    return unsub;
  }, [nav, fetchRequests]);

  function openCreate() {
    setEditing(null);
    setFormStatus("nouvelle"); setFormPriority("normale"); setFormNotes("");
    setFormItems([{ description: "", quantity: "1", notes: "", photos: [] }]);
    setModalOpen(true);
  }

  function openEdit(req: ClientRequest) {
    setEditing(req);
    setFormStatus(req.status); setFormPriority(req.priority); setFormNotes(req.notes || "");
    setFormItems(req.items.length > 0
      ? req.items.map((i) => ({ description: i.description, quantity: String(i.quantity), notes: i.notes, photos: i.photos || [] }))
      : [{ description: "", quantity: "1", notes: "", photos: [] }]);
    setModalOpen(true);
  }

  function addItem() { setFormItems((p) => [...p, { description: "", quantity: "1", notes: "", photos: [] }]); }
  function removeItem(i: number) { setFormItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, key: keyof RequestItem, val: any) {
    setFormItems((p) => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  async function handleAddPhoto(itemIdx: number) {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingPhotoIdx(itemIdx);
    const url = await uploadImage(uri);
    setUploadingPhotoIdx(null);
    if (url) {
      updateItem(itemIdx, "photos", [...(formItems[itemIdx].photos || []), url]);
    } else {
      Alert.alert("Erreur", "Impossible d'uploader la photo");
    }
  }

  function removePhoto(itemIdx: number, photoIdx: number) {
    const updated = formItems[itemIdx].photos.filter((_, i) => i !== photoIdx);
    updateItem(itemIdx, "photos", updated);
  }

  async function handleSave() {
    if (formItems.every((i) => !i.description.trim())) {
      Alert.alert("Erreur", "Ajoutez au moins un article");
      return;
    }
    setSaving(true);
    try {
      const body = {
        status: formStatus,
        priority: formPriority,
        notes: formNotes,
        items: formItems.filter((i) => i.description.trim()).map((i) => ({
          description: i.description.trim(),
          quantity: parseInt(i.quantity) || 1,
          notes: i.notes,
          photos: i.photos,
        })),
      };
      const url = editing ? `/api/client-requests/${editing._id}` : "/api/client-requests";
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        setModalOpen(false);
        fetchRequests();
      } else {
        const d = await res.json();
        Alert.alert("Erreur", d.error || "Erreur lors de l'enregistrement");
      }
    } catch { Alert.alert("Erreur", "Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function handleDelete(req: ClientRequest) {
    Alert.alert("Supprimer", `Supprimer la demande ${req.number} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          await apiFetch(`/api/client-requests/${req._id}`, { method: "DELETE" });
          fetchRequests();
        },
      },
    ]);
  }

  const filtered = requests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.number.toLowerCase().includes(q) || r.client?.name.toLowerCase().includes(q) || false;
  });

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Search size={18} color={colors.textDimmed} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} value={search} onChangeText={setSearch}
            placeholder="Rechercher..." placeholderTextColor={colors.placeholder} />
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.7}>
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune demande</Text></View>}
        renderItem={({ item }) => {
          const s = STATUS_CONFIG[item.status];
          const p = PRIORITY_CONFIG[item.priority];
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openEdit(item)} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <Text style={[styles.number, { color: colors.textDimmed }]}>{item.number}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={[styles.badge, { backgroundColor: s?.color + "20" }]}>
                    <Text style={[styles.badgeText, { color: s?.color }]}>{s?.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: p?.color + "20" }]}>
                    <Text style={[styles.badgeText, { color: p?.color }]}>{p?.label}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.client, { color: colors.text }]}>{item.client?.name || "Sans client"}</Text>
              <Text style={[styles.itemCount, { color: colors.textDimmed }]}>{item.items.length} article(s)</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* Create/Edit modal */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? "Modifier" : "Nouvelle demande"}</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Status + Priority */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Statut</Text>
                <View style={[styles.row, { marginTop: 4, flexWrap: "wrap" }]}>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <TouchableOpacity key={val}
                      style={[styles.chip, { borderColor: colors.border },
                        formStatus === val && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setFormStatus(val)}>
                      <Text style={[styles.chipText, { color: formStatus === val ? "#fff" : colors.text }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Priorité</Text>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                <TouchableOpacity key={val}
                  style={[styles.chip, { borderColor: colors.border },
                    formPriority === val && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                  onPress={() => setFormPriority(val)}>
                  <Text style={[styles.chipText, { color: formPriority === val ? "#fff" : colors.text }]}>{cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>Articles demandés</Text>
            {formItems.map((item, i) => (
              <View key={i} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemCardHeader}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Article {i + 1}</Text>
                  {formItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(i)}><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  value={item.description} onChangeText={(v) => updateItem(i, "description", v)}
                  placeholder="Description de l'article..." placeholderTextColor={colors.placeholder}
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, fontSize: 11 }]}>Quantité</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                      value={item.quantity} onChangeText={(v) => updateItem(i, "quantity", v)}
                      keyboardType="numeric" placeholder="1" placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, fontSize: 11 }]}>Notes</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                      value={item.notes} onChangeText={(v) => updateItem(i, "notes", v)}
                      placeholder="Notes..." placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* Photos */}
                <View style={styles.photosRow}>
                  {item.photos.map((photo, pi) => (
                    <View key={pi} style={styles.photoThumb}>
                      <Image source={{ uri: photo.startsWith("/uploads") ? `${API_BASE}${photo}` : photo }}
                        style={styles.photoImg} />
                      <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i, pi)}>
                        <X size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.addPhotoBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => handleAddPhoto(i)}
                    disabled={uploadingPhotoIdx === i}
                  >
                    {uploadingPhotoIdx === i
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <>
                          <Camera size={18} color={colors.primary} />
                          <Text style={[styles.addPhotoText, { color: colors.primary }]}>Photo</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={[styles.addItemBtn, { borderColor: colors.border }]} onPress={addItem}>
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addItemText, { color: colors.primary }]}>Ajouter un article</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>Notes générales</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              value={formNotes} onChangeText={setFormNotes}
              placeholder="Notes sur la demande..." placeholderTextColor={colors.placeholder}
              multiline numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.submitText}>{editing ? "Modifier" : "Créer"}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.sm },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: borderRadius.sm, borderWidth: 1, paddingHorizontal: spacing.md, gap: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm },
  addBtn: { width: 44, height: 44, borderRadius: borderRadius.sm, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyText: { fontSize: fontSize.md },
  card: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { fontSize: fontSize.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  client: { fontSize: fontSize.md, fontWeight: "600" },
  itemCount: { fontSize: fontSize.sm },
  deleteBtn: { position: "absolute", top: spacing.md, right: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: fontSize.sm },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, paddingTop: 56 },
  modalTitle: { fontSize: fontSize.xl, fontWeight: "700" },
  modalContent: { padding: spacing.lg, paddingBottom: 80 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  label: { fontSize: fontSize.sm, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md },
  itemCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  itemCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photosRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  photoThumb: { width: 60, height: 60, borderRadius: 8, overflow: "hidden", position: "relative" },
  photoImg: { width: 60, height: 60, borderRadius: 8 },
  photoRemove: { position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  addPhotoBtn: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 2 },
  addPhotoText: { fontSize: 10, fontWeight: "600" },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: spacing.md, borderRadius: borderRadius.sm, borderWidth: 1, borderStyle: "dashed", justifyContent: "center", marginBottom: spacing.md },
  addItemText: { fontSize: fontSize.sm, fontWeight: "600" },
  submitBtn: { marginTop: spacing.lg, borderRadius: borderRadius.sm, paddingVertical: spacing.lg, alignItems: "center" },
  submitText: { color: "#fff", fontSize: fontSize.lg, fontWeight: "600" },
});
