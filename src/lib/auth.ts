import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ikisu_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "development-secret-must-be-replaced";
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminPassword(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && safeEqual(candidate, expected!);
}

export function createSessionToken() {
  const payload = `admin.${Date.now() + SESSION_SECONDS * 1000}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(signature(payload), parts[2])) return false;
  return Number(parts[1]) > Date.now();
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}
