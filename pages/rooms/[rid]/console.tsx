import { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { SocketProvider } from "../../../components/contexts/socket/useSocketContext";
import Console from "../../../components/interfaces/console/console";

const Page: NextPage = () => {
  const [roomId, setRoomId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    setRoomId(router.query.rid as string);
  }, [router.query]);

  if (roomId === null) {
    // Loading screen
    return <div>Loading...</div>;
  } else {
    return (
      <SocketProvider roomId={roomId} admin>
        <Console roomId={roomId} />
      </SocketProvider>
    );
  }
};

export default Page;
