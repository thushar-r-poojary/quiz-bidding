import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = `http://${window.location.hostname}:5000`;

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
};
