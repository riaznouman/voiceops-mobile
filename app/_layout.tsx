import { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider, useDispatch } from "react-redux";
import { store, AppDispatch } from "../src/store";
import { setCredentials } from "../src/features/auth/authSlice";
import { storage } from "../src/services/storage";

type StoredUser = { id: string; name: string; email: string; role: string };

function AuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      const user = await storage.getUser<StoredUser>();
      if (token && user) {
        dispatch(setCredentials({ user, token }));
      }
    })();
  }, []);

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
