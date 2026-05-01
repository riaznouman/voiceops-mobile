import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useGetJobQuery } from "../../../src/features/jobs/jobsApi";
import {
  useCreateInvoiceMutation,
  InvoiceLineItem,
} from "../../../src/features/invoices/invoicesApi";

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function calcSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
}

function formatCurrency(amount: number): string {
  return `$${(amount ?? 0).toFixed(2)}`;
}

const EMPTY_ITEM = (): InvoiceLineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export default function InvoiceNewScreen() {
  const insets = useSafeAreaInsets();
  const { workOrderId, customerId } = useLocalSearchParams<{
    workOrderId: string;
    customerId: string;
  }>();

  const { data: job, isLoading: jobLoading } = useGetJobQuery(
    workOrderId ?? "",
    { skip: !workOrderId }
  );

  const [createInvoice, { isLoading: submitting }] = useCreateInvoiceMutation();

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([EMPTY_ITEM()]);
  const [notes, setNotes] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDaysIso(7));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = calcSubtotal(lineItems);
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  const updateItem = useCallback(
    (idx: number, field: keyof InvoiceLineItem, value: string) => {
      setLineItems((prev) =>
        prev.map((item, i) => {
          if (i !== idx) return item;
          if (field === "quantity") {
            return { ...item, quantity: Number(value) || 0 };
          }
          if (field === "unitPrice") {
            return { ...item, unitPrice: Number(value) || 0 };
          }
          return { ...item, [field]: value };
        })
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setLineItems((prev) => [...prev, EMPTY_ITEM()]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (lineItems.length === 0) {
      errs.lineItems = "Add at least one line item.";
    }
    lineItems.forEach((item, idx) => {
      if (!item.description.trim()) {
        errs[`desc_${idx}`] = "Description is required.";
      }
      if (Number(item.quantity) <= 0) {
        errs[`qty_${idx}`] = "Quantity must be > 0.";
      }
      if (Number(item.unitPrice) < 0) {
        errs[`price_${idx}`] = "Price must be ≥ 0.";
      }
    });
    if (!issueDate) errs.issueDate = "Issue date is required.";
    if (!dueDate) errs.dueDate = "Due date is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      await createInvoice({
        workOrderId: workOrderId!,
        customerId: customerId ?? job?.customer?.id ?? "",
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        notes: notes.trim() || undefined,
        issueDate,
        dueDate,
      }).unwrap();
      router.replace("/(app)/(tabs)/invoices");
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        "Could not create invoice. Please try again.";
      Alert.alert("Error", msg);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Invoice</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer — read-only */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          {jobLoading ? (
            <ActivityIndicator color="#2563EB" size="small" />
          ) : (
            <>
              <Text style={styles.cardPrimary}>
                {job?.customer?.name ?? "—"}
              </Text>
              {workOrderId && (
                <Text style={styles.cardSecondary}>
                  Work order: {job?.referenceNumber ?? workOrderId}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Line items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Line Items</Text>
          {errors.lineItems && (
            <Text style={styles.errorText}>{errors.lineItems}</Text>
          )}

          {lineItems.map((item, idx) => (
            <View key={idx} style={styles.lineItemBlock}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemNum}>Item {idx + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  errors[`desc_${idx}`] && styles.inputError,
                ]}
                placeholder="e.g. Labour — 2 hours"
                placeholderTextColor="#9CA3AF"
                value={item.description}
                onChangeText={(v) => updateItem(idx, "description", v)}
              />
              {errors[`desc_${idx}`] && (
                <Text style={styles.errorText}>{errors[`desc_${idx}`]}</Text>
              )}

              <View style={styles.qtyPriceRow}>
                <View style={styles.qtyWrap}>
                  <Text style={styles.label}>Qty</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors[`qty_${idx}`] && styles.inputError,
                    ]}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={item.quantity === 0 ? "" : String(item.quantity)}
                    onChangeText={(v) => updateItem(idx, "quantity", v)}
                  />
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.label}>Unit price ($)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors[`price_${idx}`] && styles.inputError,
                    ]}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={item.unitPrice === 0 ? "" : String(item.unitPrice)}
                    onChangeText={(v) => updateItem(idx, "unitPrice", v)}
                  />
                </View>
                <View style={styles.lineTotalWrap}>
                  <Text style={styles.label}>Total</Text>
                  <Text style={styles.lineTotal}>
                    {formatCurrency(
                      (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                    )}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <Text style={styles.addItemText}>+ Add line item</Text>
          </TouchableOpacity>
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST (10%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(gst)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowGrand]}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <View style={styles.dateFieldRow}>
            <View style={styles.dateFieldWrap}>
              <Text style={styles.label}>Issue date</Text>
              <TextInput
                style={[styles.input, errors.issueDate && styles.inputError]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                value={issueDate}
                onChangeText={setIssueDate}
              />
              {errors.issueDate && (
                <Text style={styles.errorText}>{errors.issueDate}</Text>
              )}
            </View>
            <View style={styles.dateFieldWrap}>
              <Text style={styles.label}>Due date</Text>
              <TextInput
                style={[styles.input, errors.dueDate && styles.inputError]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
                value={dueDate}
                onChangeText={setDueDate}
              />
              {errors.dueDate && (
                <Text style={styles.errorText}>{errors.dueDate}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any additional notes…"
            placeholderTextColor="#9CA3AF"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Create Invoice</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, color: "#2563EB" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  scrollContent: { padding: 16, gap: 12, paddingBottom: 48 },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardPrimary: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSecondary: { fontSize: 13, color: "#6B7280" },

  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  inputError: { borderColor: "#EF4444" },

  errorText: { fontSize: 12, color: "#EF4444" },

  lineItemBlock: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    gap: 6,
  },
  lineItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineItemNum: { fontSize: 13, fontWeight: "600", color: "#374151" },
  removeText: { fontSize: 13, color: "#EF4444" },

  qtyPriceRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  qtyWrap: { width: 64 },
  priceWrap: { flex: 1 },
  lineTotalWrap: { width: 72, justifyContent: "flex-end" },
  lineTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
    paddingVertical: 10,
  },

  addItemBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    borderStyle: "dashed",
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  addItemText: { fontSize: 14, color: "#2563EB", fontWeight: "600" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 4,
    paddingTop: 8,
  },
  totalLabel: { fontSize: 14, color: "#6B7280" },
  totalValue: { fontSize: 14, color: "#374151" },
  grandLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  grandValue: { fontSize: 16, fontWeight: "700", color: "#111827" },

  dateFieldRow: { flexDirection: "row", gap: 12 },
  dateFieldWrap: { flex: 1, gap: 4 },

  notesInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },

  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
});
