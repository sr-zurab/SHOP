import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchChatMessages,
  fetchChatUnreadCount,
  getWsToken,
  markChatRead,
  setRoomId,
  clearMessages,
} from '../features/chat/chatSlice';
import useChatSocket from '../hooks/useChatSocket';
import { MessageCircle, X, Send } from 'lucide-react';

function ChatWidget({
  open,
  onOpen,
  onClose,
}) {
  const dispatch = useDispatch();

  const { isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const {
    messages,
    roomId,
    connected,
    unreadCount,
  } = useSelector(
    (state) => state.chat
  );

  const [text, setText] = useState('');
  const [wsToken, setWsToken] = useState(null);

  const messagesEndRef = useRef(null);

  const handleDisconnected = useCallback(() => {
    setWsToken(null);
    dispatch(setRoomId(null));
  }, [dispatch]);

  const { sendMessage } = useChatSocket(
    open ? roomId : null,
    wsToken,
    handleDisconnected
  );

  useEffect(() => {
    if (
      open &&
      isAuthenticated &&
      !roomId
    ) {
      dispatch(getWsToken()).then(
        (result) => {
          if (
            getWsToken.fulfilled.match(
              result
            )
          ) {
            const newRoomId =
              result.payload.room_id;

            setWsToken(
              result.payload.ws_token
            );

            dispatch(
              setRoomId(newRoomId)
            );

            dispatch(
              markChatRead(newRoomId)
            );

            dispatch(
              fetchChatMessages(
                newRoomId
              )
            );
          }
        }
      );
    }
  }, [
    open,
    isAuthenticated,
    roomId,
    dispatch,
  ]);

  useEffect(() => {
    if (open && roomId) {
      dispatch(markChatRead(roomId));
      dispatch(fetchChatUnreadCount());
    }
  }, [
    open,
    roomId,
    dispatch,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();

    if (!text.trim()) {
      return;
    }

    sendMessage(text.trim());
    setText('');
  };

  const handleClose = () => {
    onClose();

    setWsToken(null);

    dispatch(setRoomId(null));
    dispatch(clearMessages());
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="chat-widget">
      {open ? (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <span>
              Поддержка{' '}
              {connected ? '🟢' : '🔴'}
            </span>

            <button
              onClick={handleClose}
              aria-label="Закрыть чат"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-widget-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${
                  msg.is_from_manager
                    ? 'from-manager'
                    : 'from-user'
                }`}
              >
                <p>{msg.text}</p>

                <span className="chat-message-time">
                  {new Date(
                    msg.created
                  ).toLocaleTimeString(
                    'ru-RU',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              </div>
            ))}

            <div
              ref={messagesEndRef}
            />
          </div>

          <form
            className="chat-widget-input"
            onSubmit={handleSend}
          >
            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              placeholder="Напишите сообщение..."
              maxLength={2000}
            />

            <button
              type="submit"
              aria-label="Отправить"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <button
          className="chat-widget-toggle"
          onClick={onOpen}
          aria-label="Открыть чат"
        >
          <MessageCircle size={24} />

          {unreadCount > 0 && (
            <span className="chat-widget-badge">
              {unreadCount > 99
                ? '99+'
                : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default ChatWidget;