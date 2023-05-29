import React, { createContext, useContext, useEffect, useState } from "react";
import SocketIO, { Socket } from "socket.io-client";

// https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components
type Props = {
  roomId: string | undefined;
  children: React.ReactNode;
  admin?: boolean;
};

const SocketContext = createContext<Socket | undefined>(undefined);

const SocketProvider = ({ roomId, children, admin = false }: Props) => {
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    if (!roomId) return;

    const newSocket = SocketIO(`/rooms/${roomId}` + (admin ? "/admin" : ""));
    setSocket(newSocket);

    // Disconnect when component is unmounted, or a different room is specified
    return () => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    };
    // Setting socket as a dependency leads to an infinite loop. We
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, admin]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

const useSocketContext = () => {
  return useContext(SocketContext);
};

export { SocketProvider, useSocketContext };
