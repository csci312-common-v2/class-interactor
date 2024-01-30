declare module "http" {
  interface IncomingMessage {
    anonUserCookie?: string;
  }
}
