import { authRouter } from "./auth-router";
import { chatRouter } from "./routers-chat";
import { createRouter, publicQuery } from "./middleware";
import {
  shopRouter,
  cartRouter,
  orderRouter,
  letterRouter,
  contentRouter,
  adminRouter,
} from "./routers-shop";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  chat: chatRouter,
  shop: shopRouter,
  cart: cartRouter,
  order: orderRouter,
  letter: letterRouter,
  content: contentRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
