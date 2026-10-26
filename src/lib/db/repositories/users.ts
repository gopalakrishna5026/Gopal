import { AppError } from "@/lib/errors";
import { nowIso, uid } from "@/lib/utils";
import { hashPassword, verifyPassword } from "@/lib/utils/password";
import type { PublicUser, User } from "@/types";
import { getDb } from "../database";

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, passwordSalt, ...rest } = user;
  return rest;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

export async function registerUser(input: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}): Promise<PublicUser> {
  const db = getDb();
  const email = normaliseEmail(input.email);
  const { hash, salt } = await hashPassword(input.password);
  const now = nowIso();
  const user: User = {
    id: uid(),
    fullName: input.fullName.trim(),
    email,
    mobile: input.mobile,
    passwordHash: hash,
    passwordSalt: salt,
    role: "user",
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.users, async () => {
    if (await db.users.where("email").equals(email).count()) {
      throw new AppError("DUPLICATE", "An account with this email already exists.");
    }
    await db.users.add(user);
  });
  return toPublicUser(user);
}

export async function authenticate(email: string, password: string): Promise<PublicUser> {
  const user = await getDb().users.where("email").equals(normaliseEmail(email)).first();
  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
    throw new AppError("UNAUTHORIZED", "Invalid email or password.");
  }
  return toPublicUser(user);
}

export async function getUser(id: string): Promise<PublicUser | undefined> {
  const user = await getDb().users.get(id);
  return user && toPublicUser(user);
}

export async function updateProfile(
  id: string,
  patch: Pick<User, "fullName" | "mobile"> & Partial<Pick<User, "dateOfBirth" | "gender" | "address">>,
): Promise<PublicUser> {
  const db = getDb();
  const updated = await db.users.update(id, { ...patch, updatedAt: nowIso() });
  if (!updated) throw new AppError("NOT_FOUND", "User not found.");
  return toPublicUser((await db.users.get(id))!);
}

export async function changePassword(id: string, current: string, next: string): Promise<void> {
  const db = getDb();
  const user = await db.users.get(id);
  if (!user) throw new AppError("NOT_FOUND", "User not found.");
  if (!(await verifyPassword(current, user.passwordHash, user.passwordSalt))) {
    throw new AppError("INVALID", "Current password is incorrect.");
  }
  const { hash, salt } = await hashPassword(next);
  await db.users.update(id, { passwordHash: hash, passwordSalt: salt, updatedAt: nowIso() });
}
