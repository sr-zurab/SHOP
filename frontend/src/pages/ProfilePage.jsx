import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProfile,
  updateProfile,
  changePassword,
  clearPasswordChangeSuccess,
} from '../features/profile/profileSlice';

function ProfilePage() {
  const dispatch = useDispatch();
  const { data: profile, loading, error, passwordChangeSuccess } = useSelector((state) => state.profile);

  const [form, setForm] = useState({ email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setForm({ email: profile.email || '', phone: profile.phone || '' });
    }
  }, [profile]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    dispatch(updateProfile(form));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    dispatch(changePassword(passwordForm));
    setPasswordForm({ oldPassword: '', newPassword: '' });
  };

  if (loading && !profile) return <p className="loading-text">Загрузка...</p>;
  if (!profile) return null;

  return (
    <div className="profile-page">
      <h1>Мой профиль</h1>

      <div className="profile-section">
        <h2>Данные аккаунта</h2>
        <p className="profile-username">Логин: <strong>{profile.username}</strong></p>
        <p className="profile-joined">
          На сайте с {new Date(profile.date_joined).toLocaleDateString('ru-RU')}
        </p>

        <form onSubmit={handleProfileSubmit} className="profile-form">
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Телефон
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <button type="submit" className="btn btn-primary">Сохранить</button>
        </form>
      </div>

      <div className="profile-section">
        <h2>Смена пароля</h2>
        <form onSubmit={handlePasswordSubmit} className="profile-form">
          <label>
            Текущий пароль
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              required
            />
          </label>
          <label>
            Новый пароль
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={8}
            />
          </label>

          {passwordChangeSuccess && <p className="auth-success">Пароль успешно изменён</p>}
          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary">Изменить пароль</button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;