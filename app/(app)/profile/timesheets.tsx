import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  useGetTimesheetsQuery,
  useCreateTimesheetMutation,
  useDeleteTimesheetMutation,
  Timesheet,
} from "../../../src/features/timesheets/timesheetsApi";
import { groupByWeek } from "../../../src/features/timesheets/groupByWeek";

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function TimesheetsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetTimesheetsQuery();
  const [deleteTimesheet] = useDeleteTimesheetMutation();

  const [modalOpen, setModalOpen] = useState(false);

  const groups = useMemo(
    () => groupByWeek(data?.data ?? []),
    [data]
  );

  function confirmDelete(t: Timesheet) {
    Alert.alert(
      "Delete entry",
      `Delete ${t.hoursWorked}h on ${formatDate(t.date)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTimesheet(t.id).unwrap();
            } catch {
              Alert.alert("Error", "Could not delete entry.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hours</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Total</Text>
        <Text style={styles.totalsValue}>
          {(data?.totalHours ?? 0).toFixed(1)} h
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 32 }}
          />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Could not load hours.</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hours logged yet.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.weekKey} style={styles.weekBlock}>
              <Text style={styles.weekLabel}>{group.label}</Text>
              {group.items.map((t) => (
                <Pressable
                  key={t.id}
                  onLongPress={() => confirmDelete(t)}
                  style={styles.row}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowDate}>{formatDate(t.date)}</Text>
                    {t.workOrder?.referenceNumber ? (
                      <Text style={styles.rowSub}>
                        {t.workOrder.referenceNumber}
                      </Text>
                    ) : null}
                    {t.notes ? (
                      <Text style={styles.rowNote} numberOfLines={2}>
                        {t.notes}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.rowHours}>{t.hoursWorked.toFixed(1)} h</Text>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setModalOpen(true)}
      >
        <Text style={styles.fabText}>+ Add</Text>
      </TouchableOpacity>

      <AddTimesheetModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

function AddTimesheetModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [createTimesheet, { isLoading }] = useCreateTimesheetMutation();
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const dateError = !DATE_RX.test(date) ? "Use YYYY-MM-DD format" : "";
  const hoursNum = Number(hours);
  const hoursError =
    !hours
      ? "Hours required"
      : Number.isNaN(hoursNum) || hoursNum <= 0
      ? "Hours must be greater than 0"
      : hoursNum > 24
      ? "Hours can't exceed 24"
      : "";

  const isValid = !dateError && !hoursError;

  function reset() {
    setDate(todayISO());
    setHours("");
    setNotes("");
    setTouched(false);
  }

  async function handleSubmit() {
    setTouched(true);
    if (!isValid) return;
    try {
      await createTimesheet({
        date,
        hoursWorked: hoursNum,
        notes: notes.trim() || undefined,
      }).unwrap();
      reset();
      onClose();
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.data?.message ?? "Could not save.";
      Alert.alert("Error", msg);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Log hours</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={[
                styles.input,
                touched && dateError ? styles.inputError : null,
              ]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            {touched && dateError ? (
              <Text style={styles.errorText}>{dateError}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Hours</Text>
            <TextInput
              style={[
                styles.input,
                touched && hoursError ? styles.inputError : null,
              ]}
              value={hours}
              onChangeText={setHours}
              placeholder="e.g. 7.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            {touched && hoursError ? (
              <Text style={styles.errorText}>{hoursError}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 64, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you work on?"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.cancelBtn, isLoading && styles.btnDisabled]}
              onPress={() => {
                reset();
                onClose();
              }}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!isValid || isLoading) && styles.btnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 70 },
  backText: { fontSize: 17, color: "#2563EB" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  totalsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  totalsValue: { fontSize: 22, fontWeight: "700", color: "#111827" },

  scrollContent: { paddingBottom: 100 },

  weekBlock: { marginTop: 12, paddingHorizontal: 16 },
  weekLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  rowMain: { flex: 1, gap: 2 },
  rowDate: { fontSize: 14, fontWeight: "600", color: "#111827" },
  rowSub: { fontSize: 12, color: "#2563EB" },
  rowNote: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  rowHours: { fontSize: 16, fontWeight: "700", color: "#111827" },

  empty: { alignItems: "center", padding: 32, gap: 12 },
  emptyText: { fontSize: 14, color: "#6B7280" },
  retryBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { fontSize: 13, color: "#EF4444" },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: "#374151", fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
});
