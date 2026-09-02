import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register } from '../features/auth/authSlice';
import { fetchCart } from '../features/cart/cartSlice';

function AuthForm({ onClose }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '' });
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'login') {
      const result = await dispatch(login({ username: form.username, password: form.password }));
      if (login.fulfilled.match(result)) {
        dispatch(fetchCart()); // подтягиваем корзину (бэк уже смержил анонимную при логине)
        onClose?.();
      }
    } else {
      const result = await dispatch(register(form));
      if (register.fulfilled.match(result)) {
        setRegisterSuccess(true);
        setMode('login');
      }
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-tabs">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Вход
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          Регистрация
        </button>
      </div>

      {registerSuccess && (
        <p className="auth-success">Регистрация прошла успешно, войдите</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Имя пользователя"
          value={form.username}
          onChange={handleChange}
          required
        />
        {mode === 'register' && (
          <>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              name="phone"
              placeholder="Телефон"
              value={form.phone}
              onChange={handleChange}
            />
          </>
        )}
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
          {loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}

export default AuthForm;