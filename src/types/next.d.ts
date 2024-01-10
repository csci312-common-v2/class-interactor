import { IncomingMessage } from "http";

// As described here: https://github.com/vercel/next.js/pull/12186#issuecomment-744088950
declare module "next" {
  export interface NextApiRequest extends IncomingMessage {
    user?: {
      id: number;
    };
  }
}
