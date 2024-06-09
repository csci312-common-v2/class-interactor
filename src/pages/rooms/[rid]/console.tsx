import { ReactElement } from "react";
import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { useSession, signOut } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { SocketProvider } from "@/components/contexts/socket/useSocketContext";
import Header from "@/components/interactions/Header";
import Console from "@/components/interfaces/console/console";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
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
        <button onClick={() => signOut()}>Sign out</button>
      </SocketProvider>
    );
  } else {
    // Don't render anything until room is ready
    return <div />;
  }
};

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <>
      <Header />
      {page}
    </>
  );
};

export const getServerSideProps = (async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    // Mimic the behavior of useSession required: true
    // https://github.com/nextauthjs/next-auth/blob/9e802b00fdfbec7c3008ac2853ccf3a49e26f5c0/packages/next-auth/src/react.tsx#L140C7-L143C11
    const url = `/api/auth/signin?${new URLSearchParams({
      error: "SessionRequired",
      callbackUrl: context.resolvedUrl,
    })}`;
    return {
      redirect: {
        destination: url,
        permanent: false,
      },
    };
  }

  const { rid } = context.query;
  const [room] = await Room.query()
    .where({ visibleId: rid })
    .withGraphFetched("users(filterIdAndRole)")
    .modifiers({
      filterIdAndRole(builder) {
        builder.where({ id: session.user.id, role: "administrator" });
      },
    });

  if (room && room.users.length > 0) {
    // This user is an admin of this room
    return {
      props: {
        room: {
          id: room.visibleId,
          name: room.name,
        },
        session,
      },
    };
  } else {
    // Invalid room or user is not an admin
    const url = `/?${new URLSearchParams({
      error: "InvalidRoom",
    })}`;
    return {
      redirect: {
        destination: url,
        permanent: false,
      },
    };
  }
}) satisfies GetServerSideProps<{ room: RoomProp }>;

export default Page;
