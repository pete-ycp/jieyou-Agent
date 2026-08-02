import type { CookieOptions } from "hono/utils/cookie";

/**
 * 判断当前请求是否为"安全上下文"——Cookie 可被浏览器接受的环境。
 *
 * 背景浏览器策略：SameSite=None 的 Cookie 必须 Secure，
 * 而 Secure 的 Cookie 只能在 HTTPS 下传输。
 * 所以 HTTP 直连 IP（如线上调试期）必须用 SameSite=Lax + secure=false。
 *
 * 判定规则：HTTPS 或 localhost 都算安全上下文（localhost 是浏览器白名单）。
 */
function isSecureContext(headers: Headers): boolean {
  // 1. 反代场景：Nginx 设置 X-Forwarded-Proto: https
  const forwardedProto = headers.get("x-forwarded-proto");
  if (forwardedProto === "https") return true;

  // 2. 标准 HTTPS
  // 注：Hono 在 Node 原生 https 下 c.req.url 才是 https://，
  //     这里简化处理，主要靠 x-forwarded-proto 兜底。

  // 3. localhost / 127.0.0.1（浏览器白名单，HTTP 也算安全）
  const host = headers.get("host") || "";
  if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) return true;

  // 4. 其他（含 HTTP 直连公网 IP）→ 非安全上下文
  return false;
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const secure = isSecureContext(headers);

  return {
    httpOnly: true,
    path: "/",
    // 安全上下文(HTTPS)用 None+Secure 跨域友好；HTTP 下用 Lax 才能被浏览器接受
    sameSite: secure ? "None" : "Lax",
    secure,
  };
}
