import { handleCalendarSync } from "./routes/classrooms";
import { handleReminderCron } from "./cron/reminders";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // tighten to your ACAD domain(s) before going live
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === "/api/calendar/sync" && request.method === "POST") {
      // TODO: verify a shared secret / signed token from ACAD's main backend
      // here before trusting the request body (see README "Securing this
      // worker").
      const res = await handleCalendarSync(request, env);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (url.pathname === "/health") {
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleReminderCron(env));
  },
};
