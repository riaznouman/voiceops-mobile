import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../src/store";
import { setCredentials } from "../../src/features/auth/authSlice";
import { useLoginMutation } from "../../src/features/auth/authApi";
import { storage } from "../../src/services/storage";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [loginMutation, { isLoading }] = useLoginMutation();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [apiError, setApiError] = useState<string | null>(null);

  const emailError = !email.trim()
    ? "Email is required"
    : !EMAIL_REGEX.test(email)
    ? "Please enter a valid email address"
    : "";

  const passwordError = !password
    ? "Password is required"
    : password.length < 8
    ? "Password must be at least 8 characters"
    : "";

  const isFormValid = !emailError && !passwordError;

  const handleSignIn = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) return;

    setApiError(null);

    try {
      const result = await loginMutation({
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();

      await storage.saveToken(result.token);
      await storage.saveUser(result.user);
      dispatch(setCredentials({ user: result.user, token: result.token }));
      router.replace("/(app)/(tabs)/dashboard");
    } catch (err: any) {
      console.warn("[login] error", err);
      const status = err?.status;
      if (status === 401) {
        setApiError("Invalid email or password.");
      } else if (status === "FETCH_ERROR") {
        setApiError(`Network error: ${err?.error ?? "could not reach server"}`);
      } else {
        const detail = err?.data?.message ?? err?.error ?? `status ${status ?? "?"}`;
        setApiError(`Could not connect: ${detail}`);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>VoiceOps</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                touched.email && emailError ? styles.inputError : null,
              ]}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setApiError(null);
              }}
              onBlur={() => setTouched((v) => ({ ...v, email: true }))}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isLoading}
            />
            {touched.email && emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  styles.passwordInput,
                  touched.password && passwordError ? styles.inputError : null,
                ]}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setApiError(null);
                }}
                onBlur={() => setTouched((v) => ({ ...v, password: true }))}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                editable={!isLoading}
              />
              <Pressable
                style={styles.toggleBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                <Text style={styles.toggleText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>
            {touched.password && passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* API error */}
          {apiError ? (
            <Text style={styles.apiError}>{apiError}</Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.button,
              (!isFormValid || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={!isFormValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Pressable
            style={styles.forgotPassword}
            onPress={() => {
              // TODO: navigate to forgot password screen once it exists
            }}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
  },
  apiError: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginTop: -4,
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 60,
  },
  toggleBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#93C5FD",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: "#6B7280",
  },
});
