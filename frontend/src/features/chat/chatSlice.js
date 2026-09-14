import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const getWsToken = createAsyncThunk(
  'chat/getWsToken',
  async (roomId, { rejectWithValue }) => {
    try {
      const res = await authFetch('/chat/ws-token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomId ? { room_id: roomId } : {}),
      });
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

export const fetchChatUnreadCount = createAsyncThunk(
  'chat/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/chat/unread-count/');
      return await parseJsonOrThrow(res, 'Ошибка загрузки уведомлений чата');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const markChatRead = createAsyncThunk(
  'chat/markRead',
  async (roomId, { rejectWithValue }) => {
    try {
      const res = await authFetch(`/chat/rooms/${roomId}/mark-read/`, { method: 'POST' });
      return await parseJsonOrThrow(res, 'Ошибка отметки сообщений чата');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
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
    unreadCount: 0,
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
      .addCase(fetchChatUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      })
      .addCase(markChatRead.fulfilled, (state) => {
        state.unreadCount = 0;
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