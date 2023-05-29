import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { SocketProvider } from "@/components/contexts/socket/useSocketContext";
import Console from "@/components/interfaces/console/console";
import Participant from "@/components/interfaces/participant/participant";
import Viewer from "@/components/interfaces/viewer/viewer";

const Page: NextPage = () => {
  const [room, setRoom] = useState<{
    id?: string;
    name?: string;
    view?: string;
  }>({});
  const router = useRouter();

  useEffect(() => {
    if (router.query.rid) {
      const [id, view] = router.query.rid as string[];
      setRoom((prevState) => ({ ...prevState, id, view }));

      fetch(`/api/rooms/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setRoom((prevState) => ({ ...prevState, ...data }));
        });
    }
  }, [router.query]);

  if (room.id) {
    const { view, ...roomProp } = room;

    let viewer;
    if (view === "console") {
      viewer = <Console room={roomProp} />;
    } else if (view === "viewer") {
      viewer = <Viewer />;
    } else {
      viewer = <Participant room={roomProp} />;
    }

    return (
      <SocketProvider roomId={room.id} admin={view === "console"}>
        {viewer}
      </SocketProvider>
    );
  } else {
    // Don't render anything until room is ready
    return <div />;
  }
};

export default Page;
