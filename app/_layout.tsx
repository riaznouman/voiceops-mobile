import { useEffect, useRef, useState } from "react";
import { Stack, router } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store, AppDispatch, RootState } from "../src/store";
import { setCredentials } from "../src/features/auth/authSlice";
import { storage } from "../src/services/storage";
import {
  registerForPush,
  addNotificationTapListener,
} from "../src/services/push";

type StoredUser = { id: string; name: string; email: string; role: string };

function AuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const [ready, setReady] = useState(false);
  const prevToken = useRef<string | null>(null);
  const pushRegistered = useRef(false);

  useEffect(() => {
    (async () => {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser<StoredUser>();
      if (storedToken && storedUser && storedUser.role === "TECHNICIAN") {
        dispatch(setCredentials({ user: storedUser, token: storedToken }));
      } else if (storedToken || storedUser) {
        // Stale or non-technician session — clear it
        await storage.removeToken();
        await storage.removeUser();
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (prevToken.current && token === null) {
      router.replace("/(auth)/login");
    }
    prevToken.current = token;
  }, [token, ready]);

  useEffect(() => {
    if (!ready) return;
    if (token && !pushRegistered.current) {
      pushRegistered.current = true;
      registerForPush().catch((err) => {
        console.warn("[push] register on boot failed", err);
      });
    }
    if (!token) {
      pushRegistered.current = false;
    }
  }, [token, ready]);

  return null;
}

function NotificationRouter() {
  useEffect(() => {
    return addNotificationTapListener((path) => {
      router.push(path as any);
    });
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AuthBootstrap />
        <NotificationRouter />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </Provider>
    </SafeAreaProvider>
  );
}
