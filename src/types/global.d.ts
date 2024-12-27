export {};

declare global {
  interface Question {
    id: number;
    question: string;
    approved: boolean;
    votes: number;
    created_at: Date;
  }

  interface Poll {
    id: number;
    values: { [key: string]: number };
    created_at: Date;
    ended_at: Date;
  }
}
