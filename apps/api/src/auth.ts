import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

import type {
  StoredUserRecord,
} from "./storage.js";

const derivePasswordKey = (
  password: string,
  salt: string,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });

export const normalizeEmail = (
  value: unknown,
): string =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isValidEmail = (
  email: string,
): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isAcceptablePassword = (
  password: string,
): boolean =>
  password.length >= 12 &&
  password.length <= 256;

export const hashPassword = async (
  password: string,
): Promise<string> => {
  const salt =
    randomBytes(18)
      .toString("base64url");

  const key =
    await derivePasswordKey(
      password,
      salt,
    );

  return [
    "scrypt",
    salt,
    key.toString("hex"),
  ].join("$");
};

export const verifyPassword = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  const [
    algorithm,
    salt,
    hashHex,
  ] = String(
    storedHash || "",
  ).split("$");

  if (
    algorithm !== "scrypt" ||
    !salt ||
    !hashHex
  ) {
    return false;
  }

  const expected =
    Buffer.from(
      hashHex,
      "hex",
    );

  const actual =
    await derivePasswordKey(
      password,
      salt,
    );

  if (
    expected.length !==
    actual.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expected,
    actual,
  );
};

export const createAccessToken =
  (): string =>
    randomBytes(32)
      .toString("base64url");

export const createApiKeySecret =
  (): string =>
    `cpk_${randomBytes(32)
      .toString("base64url")}`;

export const hashAccessToken = (
  token: string,
): string =>
  createHash("sha256")
    .update(token)
    .digest("hex");

export const toPublicUser = (
  user: StoredUserRecord,
) => ({
  id: user.id,
  email: user.email,
  organizationId:
    user.organizationId,
  organizationName:
    user.organizationName,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
