import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshToken } from '../features/auth/authSlice';

// Access-токен живёт 15 минут (ACCESS_TOKEN_LIFETIME в Django settings).
// Обновляем заранее, за пару минут до истечения, чтобы токен
// никогда не успевал протухнуть в активной сессии.
const REFRESH_INTERVAL = 13 * 60 * 1000; // 13 минут

function useTokenRefreshTimer() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (localStorage.getItem('refresh')) {
        dispatch(refreshToken());
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [dispatch, isAuthenticated]);
}

export default useTokenRefreshTimer;