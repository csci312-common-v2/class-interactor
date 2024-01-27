declare module "http" {
  interface IncomingMessage {
    anonGraspUserCookie?: string;
  }
}
