import { useEffect, useRef, useState } from "react";
import { Stack, router } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store, AppDispatch, RootState } from "../src/store";
import { setCredentials } from "../src/features/auth/authSlice";
import { storage } from "../src/services/storage";

type StoredUser = { id: string; name: string; email: string; role: string };

function AuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const [ready, setReady] = useState(false);
  const prevToken = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser<StoredUser>();
      if (storedToken && storedUser) {
        dispatch(setCredentials({ user: storedUser, token: storedToken }));
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

  return null;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </Provider>
  );
}
