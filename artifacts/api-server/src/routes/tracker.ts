import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, sessionsTable, trackerStatesTable, usersTable } from "@workspace/db";
import {
  CreateReportBody,
  CreateReportResponse,
  GetCurrentUserResponse,
  GetTrackerInsightsResponse,
  GetTrackerResponse,
  SaveTrackerBody,
  SaveTrackerResponse,
  SignInBody,
  SignInResponse,
  SignUpBody,
  SignUpResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SESSION_DAYS = 30;
const FORM_ENDPOINT = "https://formspree.io/f/xbdeqknr";

function sessionId(): string {
  return randomBytes(32).toString("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function addDays(days: number): Date {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value;
}

function defaultState(name: string) {
  const pageId = `page-${randomBytes(5).toString("hex")}`;
  return {
    profileName: name,
    activePageId: pageId,
    pages: [{
      id: pageId,
      habitName: "Morning focus",
      color: "blue",
      icon: "sparkles",
      startDate: new Date().toISOString().slice(0, 10),
      daysCount: 30,
      autoCheck: "none",
      timer: "never",
      trackerData: {},
      history: [],
    }],
  };
}

async function currentUser(req: Request) {
  const token = req.signedCookies?.dtp_session as string | undefined;
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(
    and(eq(sessionsTable.id, token), gt(sessionsTable.expiresAt, new Date())),
  );
  if (!session) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}

function setSession(res: Response, userId: number): void {
  const id = sessionId();
  void db.insert(sessionsTable).values({ id, userId, expiresAt: addDays(SESSION_DAYS) });
  res.cookie("dtp_session", id, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function userResponse(user: { id: number; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    name: parsed.data.name.trim(),
    email,
    passwordHash: hashPassword(parsed.data.password),
  }).returning();
  if (!user) {
    res.status(500).json({ error: "Could not create account." });
    return;
  }
  await db.insert(trackerStatesTable).values({ userId: user.id, data: defaultState(user.name) });
  setSession(res, user.id);
  res.status(201).json(SignUpResponse.parse({ user: userResponse(user) }));
});

router.post("/auth/signin", async (req, res): Promise<void> => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.trim().toLowerCase()));
  if (!user) {
    res.status(404).json({ error: "No account exists for that email. Create an account to get started." });
    return;
  }
  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  setSession(res, user.id);
  res.json(SignInResponse.parse({ user: userResponse(user) }));
});

router.post("/auth/signout", async (req, res): Promise<void> => {
  const token = req.signedCookies?.dtp_session as string | undefined;
  if (token) await db.delete(sessionsTable).where(eq(sessionsTable.id, token));
  res.clearCookie("dtp_session", { signed: true, path: "/" });
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  res.json(GetCurrentUserResponse.parse(userResponse(user)));
});

router.get("/tracker", async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const [saved] = await db.select().from(trackerStatesTable).where(eq(trackerStatesTable.userId, user.id));
  const data = saved?.data ?? defaultState(user.name);
  res.json(GetTrackerResponse.parse(data));
});

router.put("/tracker", async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const parsed = SaveTrackerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [saved] = await db.insert(trackerStatesTable).values({
    userId: user.id,
    data: parsed.data,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: trackerStatesTable.userId,
    set: { data: parsed.data, updatedAt: new Date() },
  }).returning();
  res.json(SaveTrackerResponse.parse(saved?.data ?? parsed.data));
});

router.get("/tracker/insights", async (req, res): Promise<void> => {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const [saved] = await db.select().from(trackerStatesTable).where(eq(trackerStatesTable.userId, user.id));
  const state = saved?.data as any ?? defaultState(user.name);
  const pages = Array.isArray(state.pages) ? state.pages : [];
  let totalChecked = 0;
  let totalCrossed = 0;
  let activeDays = 0;
  let bestStreak = 0;
  const weekly = Array.from({ length: 7 }, (_, index) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
    checked: 0,
    crossed: 0,
  }));
  for (const page of pages) {
    const values = Object.entries(page.trackerData ?? {}) as [string, string][];
    totalChecked += values.filter(([, value]) => value === "checked").length;
    totalCrossed += values.filter(([, value]) => value === "crossed").length;
    activeDays += values.filter(([, value]) => value !== "none").length;
    let streak = 0;
    for (const [, value] of values.sort(([a], [b]) => a.localeCompare(b))) {
      if (value === "checked") {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    }
    for (const [date, value] of values) {
      const dayIndex = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
      if (value === "checked") weekly[dayIndex].checked += 1;
      if (value === "crossed") weekly[dayIndex].crossed += 1;
    }
  }
  const totalDays = pages.reduce((sum: number, page: any) => sum + Number(page.daysCount ?? 0), 0);
  res.json(GetTrackerInsightsResponse.parse({
    totalPages: pages.length,
    totalChecked,
    totalCrossed,
    bestStreak,
    completionRate: totalDays ? Math.round((totalChecked / totalDays) * 100) : 0,
    activeDays,
    weekly,
  }));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const form = new URLSearchParams();
  form.set("message", parsed.data.message);
  form.set("email", parsed.data.email ?? "unknown");
  form.set("name", parsed.data.name ?? "Days Tracking Pro user");
  form.set("_subject", "Days Tracking Pro: Report");
  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!response.ok) {
      res.status(502).json({ error: "The report service could not accept this report." });
      return;
    }
    res.status(201).json(CreateReportResponse.parse({ sent: true, message: "Report sent successfully." }));
  } catch (error) {
    req.log.error({ error }, "Report submission failed");
    res.status(502).json({ error: "The report service is unavailable right now." });
  }
});

export default router;