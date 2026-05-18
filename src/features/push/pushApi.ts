import { baseApi } from "../../services/api";

type RegisterTokenRequest = { token: string };
type RegisterTokenResponse = { ok: boolean };

export const pushApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerPushToken: builder.mutation<RegisterTokenResponse, RegisterTokenRequest>({
      query: (body) => ({
        url: "/push/register-token",
        method: "POST",
        body,
      }),
    }),
    deletePushToken: builder.mutation<RegisterTokenResponse, void>({
      query: () => ({
        url: "/push/register-token",
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: true,
});

export const { useRegisterPushTokenMutation, useDeletePushTokenMutation } =
  pushApi;
