import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { stockUpdated as productStockUpdated } from '../features/products/productsSlice';
import { stockUpdated as cartStockUpdated } from '../features/cart/cartSlice';

function useProductStockSocket() {
  const dispatch = useDispatch();

  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const connect = () => {
      if (stoppedRef.current) {
        return;
      }

      const protocol =
        window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';

      const socket = new WebSocket(
        `${protocol}//${window.location.host}/ws/products/stock/`
      );

      socket.onopen = () => {
        console.log(
          'Product stock WebSocket connected'
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(
            event.data
          );

          if (
            data.type ===
            'product_stock_updated'
          ) {
            dispatch(
              productStockUpdated(data)
            );

            dispatch(
              cartStockUpdated(data)
            );
          }
        } catch (error) {
          console.error(
            'Ошибка обработки сообщения stock WebSocket:',
            error
          );
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (stoppedRef.current) {
          return;
        }

        reconnectTimerRef.current =
          window.setTimeout(
            connect,
            3000
          );
      };

      socketRef.current = socket;
    };

    connect();

    return () => {
      stoppedRef.current = true;

      if (reconnectTimerRef.current) {
        window.clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [dispatch]);
}

export default useProductStockSocket;