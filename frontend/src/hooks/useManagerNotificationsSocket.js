import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchManagerRooms, fetchManagerUnreadCount, getWsToken } from '../features/chat/chatSlice';
import { fetchManagerOrderUnreadCount } from '../features/orders/ordersSlice';

function useManagerNotificationsSocket(enabled) {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const stoppedRef = useRef(false);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    stoppedRef.current = false;

    const connect = async () => {
      if (stoppedRef.current) return;

      const result = await dispatch(getWsToken());
      if (!getWsToken.fulfilled.match(result) || stoppedRef.current) return;

      const wsToken = result.payload.ws_token;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/ws/chat/manager-notifications/?ws_token=${wsToken}`,
      );

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          dispatch(fetchManagerRooms());
          dispatch(fetchManagerUnreadCount());
        }
        if (data.type === 'manager_order_created') {
          dispatch(fetchManagerOrderUnreadCount());
        }
      };

      socket.onclose = () => {
        if (stoppedRef.current) return;
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      };

      socketRef.current = socket;
    };

    connect();

    return () => {
      stoppedRef.current = true;
      window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [enabled, dispatch]);
}

export default useManagerNotificationsSocket;
