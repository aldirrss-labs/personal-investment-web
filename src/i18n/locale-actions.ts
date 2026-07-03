"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

export async function getUserLocale(): Promise<Locale> {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : defaultLocale;
}

export async function setUserLocale(locale: Locale): Promise<void> {
  cookies().set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
}
