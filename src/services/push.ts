import { Platform } from "react-native";
import { store } from "../store";
import { pushApi } from "../features/push/pushApi";

let registeredToken: string | null = null;
let handlerInstalled = false;

function isPushSupported(): boolean {
  try {
    const Constants = require("expo-constants");
    const env =
      Constants.default?.executionEnvironment ?? Constants.executionEnvironment;
    if (env === "storeClient" && Platform.OS === "android") return false;
    return true;
  } catch {
    return true;
  }
}

function installHandler() {
  if (handlerInstalled) return;
  try {
    const Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerInstalled = true;
  } catch (err) {
    console.warn("[push] could not install handler", err);
  }
}

function getProjectId(): string | undefined {
  try {
    const Constants = require("expo-constants").default;
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
    return (
      (extra.eas as { projectId?: string } | undefined)?.projectId ??
      (extra.projectId as string | undefined) ??
      Constants.easConfig?.projectId
    );
  } catch {
    return undefined;
  }
}

export async function registerForPush(): Promise<string | null> {
  if (!isPushSupported()) {
    console.warn(
      "[push] running in Expo Go on Android; push requires a dev build"
    );
    return null;
  }

  let Device: typeof import("expo-device");
  let Notifications: typeof import("expo-notifications");
  try {
    Device = require("expo-device");
    Notifications = require("expo-notifications");
  } catch (err) {
    console.warn("[push] modules not available", err);
    return null;
  }

  if (!Device.isDevice) {
    console.warn("[push] not a physical device, skipping");
    return null;
  }

  installHandler();

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
      });
    }

    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) {
      console.warn("[push] permission not granted");
      return null;
    }

    const projectId = getProjectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (!token) return null;

    if (token === registeredToken) return token;
    await store
      .dispatch(pushApi.endpoints.registerPushToken.initiate({ token }))
      .unwrap()
      .catch((err) => {
        console.warn("[push] register failed", err);
      });
    registeredToken = token;
    return token;
  } catch (err) {
    console.warn("[push] registerForPush failed", err);
    return null;
  }
}

export async function unregisterPush(): Promise<void> {
  try {
    await store
      .dispatch(pushApi.endpoints.deletePushToken.initiate())
      .unwrap()
      .catch(() => undefined);
  } finally {
    registeredToken = null;
  }
}

export function addNotificationTapListener(
  onTap: (link: string) => void
): () => void {
  if (!isPushSupported()) return () => {};
  try {
    const Notifications = require("expo-notifications");
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response?.notification?.request?.content?.data as
          | { link?: string }
          | undefined;
        const path = normaliseNotificationLink(data?.link);
        if (path) onTap(path);
      }
    );
    return () => sub.remove();
  } catch (err) {
    console.warn("[push] could not subscribe to taps", err);
    return () => {};
  }
}

export function normaliseNotificationLink(link: string | undefined): string | null {
  if (!link) return null;
  return link.replace(/^\/admin/, "");
}
