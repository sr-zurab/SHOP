import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../features/auth/authSlice';
import { fetchProfile } from '../features/profile/profileSlice';

function ManagerLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ username: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      const profileResult = await dispatch(fetchProfile());
      if (fetchProfile.fulfilled.match(profileResult) && profileResult.payload.is_manager) {
        navigate('/manager/chats');
      } else {
        setForm({ username: '', password: '' });
      }
    }
  };

  return (
    <div className="manager-login-page">
      <div className="manager-login-box">
        <h1>Вход для менеджеров</h1>
        <form onSubmit={handleSubmit}>
          <input
            name="username"
            placeholder="Логин"
            value={form.username}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ManagerLoginPage;