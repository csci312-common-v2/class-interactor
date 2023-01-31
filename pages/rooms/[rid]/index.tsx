import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SocketProvider } from "../../../components/contexts/socket/useSocketContext";
import Participant from "../../../components/interfaces/participant/participant";

const Page: NextPage = () => {
  const [roomId, setRoomId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    setRoomId(router.query.rid as string);
  }, [router.query]);

  return (
    <SocketProvider roomId={roomId}>
      <Participant roomId={roomId} />
    </SocketProvider>
  );
};

export default Page;
