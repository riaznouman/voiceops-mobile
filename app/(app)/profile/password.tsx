import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useChangePasswordMutation } from "../../../src/features/auth/authApi";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);

  const currentError = !currentPassword ? "Current password is required" : "";
  const newError = !newPassword
    ? "New password is required"
    : newPassword.length < 8
    ? "New password must be at least 8 characters"
    : "";
  const confirmError =
    confirm !== newPassword ? "Passwords do not match" : "";

  const isValid = !currentError && !newError && !confirmError;

  async function handleSubmit() {
    setTouched(true);
    if (!isValid) return;
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      Alert.alert("Password changed", "Your password has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg =
        err?.data?.error ??
        err?.data?.message ??
        "Could not change password. Please try again.";
      Alert.alert("Error", msg);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={[
              styles.input,
              touched && currentError ? styles.inputError : null,
            ]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            editable={!isLoading}
          />
          {touched && currentError ? (
            <Text style={styles.errorText}>{currentError}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={[
              styles.input,
              touched && newError ? styles.inputError : null,
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            editable={!isLoading}
          />
          {touched && newError ? (
            <Text style={styles.errorText}>{newError}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={[
              styles.input,
              touched && confirmError ? styles.inputError : null,
            ]}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat new password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            editable={!isLoading}
          />
          {touched && confirmError ? (
            <Text style={styles.errorText}>{confirmError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || isLoading) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { fontSize: 13, color: "#EF4444" },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
});
