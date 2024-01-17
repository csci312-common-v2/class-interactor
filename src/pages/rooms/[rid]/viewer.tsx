import { useEffect, useState } from "react";
import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { SocketProvider } from "@/components/contexts/socket/useSocketContext";
import Viewer from "@/components/interfaces/viewer/viewer";
import Room from "@/models/Room";

type RoomProp =
  | {
      id: string;
      name: string;
    }
  | undefined;

const Page = ({
  room,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  if (room) {
    return (
      <SocketProvider roomId={room.id} admin={false}>
        <Viewer />
      </SocketProvider>
    );
  } else {
    // Don't render anything until room is ready
    return <div />;
  }
};

export const getServerSideProps = (async (context) => {
  const { rid } = context.query;
  let room = await Room.query().findOne({ visibleId: rid });
  if (room) {
    return {
      props: {
        room: {
          id: room.visibleId,
          name: room.name,
        },
      },
    };
  } else {
    return {
      redirect: {
        destination: `/?${new URLSearchParams({ error: "InvalidRoom" })}`,
        permanent: false,
      },
    };
  }
}) satisfies GetServerSideProps<{ room: RoomProp }>;

export default Page;
