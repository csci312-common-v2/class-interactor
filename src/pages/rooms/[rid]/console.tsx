import { useEffect, useState } from "react";
import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { SocketProvider } from "@/components/contexts/socket/useSocketContext";
import Console from "@/components/interfaces/console/console";
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
  const { data: session, status } = useSession({ required: true });

  if (room && status === "authenticated") {
    return (
      <SocketProvider roomId={room.id} admin>
        <Console room={room} />
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
    return { props: { room } };
  }
}) satisfies GetServerSideProps<{ room: RoomProp }>;

export default Page;
