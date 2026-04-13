import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";

// centeral redux storage
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
