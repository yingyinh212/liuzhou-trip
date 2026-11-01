import { DurableObject } from "cloudflare:workers";

const TASK_IDS = ["outbound-train", "return-train", "hotel", "fountain"];
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export class TripChecklist extends DurableObject {
  async fetch(request) {
    if (request.method === "GET") {
      const tasks = (await this.ctx.storage.get("tasks")) || {};
      return json({ tasks: Object.fromEntries(TASK_IDS.map(id => [id, tasks[id] === true])) });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body || !TASK_IDS.includes(body.id) || typeof body.completed !== "boolean") {
      return json({ error: "Invalid task" }, 400);
    }
    const tasks = (await this.ctx.storage.get("tasks")) || {};
    tasks[body.id] = body.completed;
    await this.ctx.storage.put("tasks", tasks);
    return json({ tasks: Object.fromEntries(TASK_IDS.map(id => [id, tasks[id] === true])) });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/checklist") {
      const id = env.TRIP_CHECKLIST.idFromName("liuzhou-2026-11-shared");
      const stub = env.TRIP_CHECKLIST.get(id);
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
