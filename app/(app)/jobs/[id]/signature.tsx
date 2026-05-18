import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import SignatureCanvas, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import {
  useUpdateJobStatusMutation,
  useUploadJobSignatureMutation,
} from "../../../../src/features/jobs/jobsApi";

const CANVAS_STYLE = `.m-signature-pad { box-shadow: none; border: none; margin: 0; }
.m-signature-pad--body { border: 1px solid #D1D5DB; border-radius: 8px; }
.m-signature-pad--footer { display: none; margin: 0; }
body, html { background-color: #F9FAFB; margin: 0; padding: 0; height: 100%; }`;

export default function SignatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const ref = useRef<SignatureViewRef | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const [uploadSignature] = useUploadJobSignatureMutation();
  const [updateStatus] = useUpdateJobStatusMutation();

  async function persistBase64ToTemp(base64: string): Promise<string> {
    const cleaned = base64.replace(/^data:image\/\w+;base64,/, "");
    const path = `${FileSystem.cacheDirectory}signature_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(path, cleaned, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  }

  async function handleOK(signature: string) {
    if (!id) return;
    setSubmitting(true);
    try {
      const uri = await persistBase64ToTemp(signature);
      await uploadSignature({ workOrderId: id, uri }).unwrap();
      await updateStatus({ id, status: "COMPLETED" }).unwrap();
      router.replace(`/jobs/${id}`);
    } catch (err: any) {
      const msg =
        err?.data?.error ?? err?.data?.message ?? "Could not save signature.";
      Alert.alert("Error", msg);
      setSubmitting(false);
    }
  }

  function handleConfirm() {
    if (!hasInk) {
      Alert.alert(
        "Signature required",
        "Please ask the customer to sign before completing the job."
      );
      return;
    }
    ref.current?.readSignature();
  }

  function handleClear() {
    ref.current?.clearSignature();
    setHasInk(false);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Signature</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        <Text style={styles.instruction}>
          Please ask the customer to sign below to confirm the job is complete.
        </Text>

        <View style={styles.canvasWrap}>
          <SignatureCanvas
            ref={(r) => {
              ref.current = r;
            }}
            onOK={handleOK}
            onBegin={() => setHasInk(true)}
            onEmpty={() => setHasInk(false)}
            descriptionText=""
            webStyle={CANVAS_STYLE}
            backgroundColor="#F9FAFB"
            penColor="#111827"
            autoClear={false}
            imageType="image/png"
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, submitting && styles.btnDisabled]}
            onPress={handleClear}
            disabled={submitting}
          >
            <Text style={styles.secondaryBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Confirm & Complete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  body: { flex: 1, padding: 16, gap: 16 },
  instruction: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  canvasWrap: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    minHeight: 280,
  },
  actionRow: { flexDirection: "row", gap: 12 },
  primaryBtn: {
    flex: 2,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#374151", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
});
