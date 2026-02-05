import { configureStore } from '@reduxjs/toolkit';
import whiteboardReducer from './whiteboardSlice';

export const store = configureStore({
  reducer: {
    whiteboard: whiteboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['whiteboard/setCurrentUser'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;