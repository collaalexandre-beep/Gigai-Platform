import crypto from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LEN).toString("hex");
    crypto.scrypt(password, salt, KEY_LEN, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, stored] = hash.split(":");
    if (!salt || !stored) return resolve(false);
    crypto.scrypt(password, salt, KEY_LEN, (err, derived) => {
      if (err) reject(err);
      else resolve(crypto.timingSafeEqual(Buffer.from(stored, "hex"), derived));
    });
  });
}
