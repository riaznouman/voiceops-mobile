import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const API_BASE_URL: string =
  extra.apiBaseUrl ?? "http://localhost:3000";
