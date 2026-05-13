import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { API_BASE_URL } from "../config/env";
import { logout } from "../features/auth/authSlice";
import { storage } from "./storage";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithLogout: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    api.dispatch(baseApi.util.resetApiState());
    await storage.removeToken();
    await storage.removeUser();
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithLogout,
  tagTypes: [
    "Auth",
    "WorkOrder",
    "WorkOrderNote",
    "WorkOrderPhoto",
    "WorkOrderActivity",
    "Invoice",
    "Service",
    "TechDashboard",
    "Timesheet",
    "Expense",
  ],
  endpoints: () => ({}),
});
