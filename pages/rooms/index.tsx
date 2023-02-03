import Link from "next/link";
import { knex } from "../../knex/knex";

type RoomsProps = {
  rooms: Array<{ [key: string]: number }>;
};

const Page = ({ rooms }: RoomsProps) => {
  return (
    <ul>
      {rooms.map((room) => (
        <li key={room.id}>
          <Link href={`/rooms/${room.id}`}>{room.name}</Link>
        </li>
      ))}
    </ul>
  );
};

export async function getServerSideProps() {
  const rooms = await knex("Room").select();
  console.log(rooms);
  return { props: { rooms } };
}

export default Page;
