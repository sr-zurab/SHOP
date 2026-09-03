import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authFetch, parseJsonOrThrow } from '../../api/authFetch';

export const fetchProfile = createAsyncThunk(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch('/auth/profile/');
      return await parseJsonOrThrow(res, 'Ошибка загрузки профиля');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/update',
  async ({ email, phone }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/auth/profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });
      return await parseJsonOrThrow(res, 'Ошибка обновления профиля');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const changePassword = createAsyncThunk(
  'profile/changePassword',
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const res = await authFetch('/auth/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      return await parseJsonOrThrow(res, 'Ошибка смены пароля');
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    data: null,
    loading: false,
    error: null,
    passwordChangeSuccess: false,
  },
  reducers: {
    clearPasswordChangeSuccess: (state) => {
      state.passwordChangeSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.passwordChangeSuccess = true;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload;
        state.passwordChangeSuccess = false;
      });
  },
});

export const { clearPasswordChangeSuccess } = profileSlice.actions;
export default profileSlice.reducer;