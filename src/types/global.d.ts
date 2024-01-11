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

  interface Reminder {
    id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
  }
}
