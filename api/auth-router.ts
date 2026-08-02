import { z } from "zod";
import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { signSessionToken } from "./kimi/session";
import { hashPassword, verifyPassword } from "./lib/password";
import { env } from "./lib/env";
import {
  findUserByUnionId,
  createUser,
  updateLastSignIn,
  publicUser,
} from "./queries/users";
import { createRouter, authedQuery, publicQuery } from "./middleware";

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/, "用户名仅支持字母、数字、下划线、短横线");
const passwordSchema = z.string().min(6).max(128);

/** 把会话 token 写进响应 cookie（与 logout 同款选项 + maxAge）。 */
function setSessionCookie(
  resHeaders: Headers,
  headers: Headers,
  token: string,
) {
  const opts = getSessionCookieOptions(headers);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

export const authRouter = createRouter({
  me: authedQuery.query((opts) => publicUser(opts.ctx.user)),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),

  register: publicQuery
    .input(
      z.object({
        username: usernameSchema,
        password: passwordSchema,
        name: z.string().min(1).max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await findUserByUnionId(input.username);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该用户名已被占用",
        });
      }
      const passwordHash = await hashPassword(input.password);
      await createUser({
        unionId: input.username,
        name: input.name ?? input.username,
        passwordHash,
        role: "user",
        lastSignInAt: new Date(),
      });
      const user = await findUserByUnionId(input.username);
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "注册失败，请重试",
        });
      }
      const token = await signSessionToken({
        unionId: input.username,
        clientId: env.appId,
      });
      setSessionCookie(ctx.resHeaders, ctx.req.headers, token);
      return publicUser(user);
    }),

  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await findUserByUnionId(input.username);
      const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }
      await updateLastSignIn(user.id);
      const token = await signSessionToken({
        unionId: user.unionId,
        clientId: env.appId,
      });
      setSessionCookie(ctx.resHeaders, ctx.req.headers, token);
      return publicUser(user);
    }),
});