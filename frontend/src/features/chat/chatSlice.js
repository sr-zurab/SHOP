import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const getWsToken = createAsyncThunk(
  'chat/getWsToken',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/chat/ws-token/', { method: 'POST' });
      return await parseJsonOrThrow(res, 'Ошибка получения токена чата');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (roomId, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/chat/messages/${roomId}/`);
      return await parseJsonOrThrow(res, 'Ошибка загрузки сообщений');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchManagerRooms = createAsyncThunk(
  'chat/fetchManagerRooms',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/chat/manager/rooms/');
      return await parseJsonOrThrow(res, 'Ошибка загрузки списка чатов');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    roomId: null,
    messages: [],
    managerRooms: [],
    connected: false,
    loading: false,
    error: null,
  },
  reducers: {
    setRoomId(state, action) {
      state.roomId = action.payload;
    },
    setConnected(state, action) {
      state.connected = action.payload;
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    clearMessages(state) {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.messages = action.payload;
        state.loading = false;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchManagerRooms.fulfilled, (state, action) => {
        state.managerRooms = action.payload;
      })
      .addCase(getWsToken.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { setRoomId, setConnected, addMessage, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;