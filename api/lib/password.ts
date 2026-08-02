import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const SALT_BYTES = 16;
const KEY_LEN = 64;
const SEP = ".";

/** 哈希密码：返回 "saltB64.hashB64"。 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(plain, salt, KEY_LEN);
  return `${salt.toString("base64")}${SEP}${hash.toString("base64")}`;
}

/** 校验密码：常量时间比较，防时序侧信道。空串/false 直接拒绝。 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [saltB64, hashB64] = stored.split(SEP);
  if (!saltB64 || !hashB64) return false;
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = await scrypt(plain, salt, KEY_LEN);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}