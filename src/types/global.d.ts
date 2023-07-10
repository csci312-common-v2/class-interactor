export {};

declare global {
  interface Question {
    id: number;
    question: string;
    approved: boolean;
    votes: number;
    created_at: Date;
  }
}
