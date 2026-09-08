import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchManagerRooms,
  fetchChatMessages,
  setRoomId,
  clearMessages,
  getWsToken,
} from '../features/chat/chatSlice';
import useChatSocket from '../hooks/useChatSocket';
import { authFetch } from '../api/authFetch';
import { Send } from 'lucide-react';

function ManagerChatPage() {
  const dispatch = useDispatch();
  const { data: profile } = useSelector((state) => state.profile);
  const { managerRooms, messages, roomId, connected } = useSelector((state) => state.chat);
  const [wsToken, setWsToken] = useState(null);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const handleDisconnected = useCallback(() => {
    setWsToken(null);
    dispatch(setRoomId(null));
  }, [dispatch]);

  const { sendMessage } = useChatSocket(roomId, wsToken, handleDisconnected);

  useEffect(() => {
    if (profile?.is_manager) {
      dispatch(fetchManagerRooms());
    }
  }, [dispatch, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openRoom = async (room) => {
    dispatch(clearMessages());
    dispatch(setRoomId(room.id));

    await authFetch(`/chat/rooms/${room.id}/assign/`, { method: 'POST' });
    dispatch(fetchManagerRooms());

    const result = await dispatch(getWsToken(room.id));
    if (getWsToken.fulfilled.match(result)) {
      setWsToken(result.payload.ws_token);
    }

    dispatch(fetchChatMessages(room.id));
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  if (!profile?.is_manager) {
    return (
      <div className="manager-chat-page-denied">
        <p className="empty-text">Доступ только для менеджеров поддержки</p>
        <Link to="/" className="btn btn-primary">На главную</Link>
      </div>
    );
  }

  return (
    <div className="manager-chat-page">
      <div className="manager-chat-sidebar">
        <h2>Чаты</h2>
        {managerRooms.length === 0 && <p className="empty-text">Нет открытых чатов</p>}
        {managerRooms.map((room) => (
          <button
            key={room.id}
            className={`manager-chat-room-item ${roomId === room.id ? 'active' : ''}`}
            onClick={() => openRoom(room)}
          >
            <div className="manager-chat-room-top">
              <span className="manager-chat-room-username">{room.username}</span>
              {room.assigned_manager_username && (
                <span className="manager-chat-room-badge">
                  В работе: {room.assigned_manager_username}
                </span>
              )}
            </div>
            {room.last_message && (
              <span className="manager-chat-room-preview">{room.last_message.text}</span>
            )}
          </button>
        ))}
      </div>

      <div className="manager-chat-window">
        {roomId ? (
          <>
            <div className="chat-widget-header">
              <span>Чат {connected ? '🟢' : '🔴'}</span>
            </div>

            <div className="chat-widget-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.is_from_manager ? 'from-manager' : 'from-user'}`}
                >
                  <p>{msg.text}</p>
                  <span className="chat-message-time">
                    {new Date(msg.created).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-widget-input" onSubmit={handleSend}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ответить..."
                maxLength={2000}
              />
              <button type="submit" aria-label="Отправить">
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <p className="empty-text">Выберите чат слева</p>
        )}
      </div>
    </div>
  );
}

export default ManagerChatPage;