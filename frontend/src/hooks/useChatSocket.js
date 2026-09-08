import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addMessage, setConnected } from '../features/chat/chatSlice';

function useChatSocket(roomId, wsToken, onDisconnected) {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const stoppedRef = useRef(false);

  const connect = useCallback(() => {
    if (!roomId || !wsToken) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${roomId}/?ws_token=${wsToken}`);

    socket.onopen = () => {
      dispatch(setConnected(true));
      heartbeatTimerRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) return;
      if (data.type === 'pong') return;
      dispatch(addMessage(data));
    };

    socket.onclose = () => {
      window.clearInterval(heartbeatTimerRef.current);
      if (!stoppedRef.current) {
        onDisconnected?.();
      } else {
        dispatch(setConnected(false));
      }
    };

    socketRef.current = socket;
  }, [roomId, wsToken, dispatch, onDisconnected]);

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      window.clearInterval(heartbeatTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((text) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ text }));
    }
  }, []);

  return { sendMessage };
}

export default useChatSocket;