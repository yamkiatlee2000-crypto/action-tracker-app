// Admin-only user management for the Meeting Action Tracker.
// Runs on Supabase with the service role, so the web page never holds a secret key.
// Actions: list, create, reset_password, set_role, delete.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const EMAIL_DOMAIN = "meeting-actions.local";
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;
const MIN_PASSWORD = 6;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Who is calling?
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Your session has expired. Sign in again." }, 401);
    const caller = userData.user;

    const { data: me } = await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle();
    if (!me || me.role !== "admin") return json({ error: "Only admins can manage users." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, username, display_name, role, must_change_password, created_at")
        .order("display_name");
      if (error) throw error;
      const { data: authList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;
      const lastSignIn = new Map(authList.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
      return json({
        users: (profiles ?? []).map((p) => ({ ...p, last_sign_in_at: lastSignIn.get(p.id) ?? null })),
      });
    }

    if (action === "create") {
      const username = String(body.username ?? "").trim().toLowerCase();
      const displayName = String(body.display_name ?? "").trim() || username;
      const password = String(body.password ?? "");
      const role = body.role === "admin" ? "admin" : "member";
      if (!USERNAME_RE.test(username)) {
        return json({ error: "Usernames need 2 to 32 characters: lowercase letters, numbers, dots, dashes or underscores." }, 400);
      }
      if (password.length < MIN_PASSWORD) {
        return json({ error: `The initial password needs at least ${MIN_PASSWORD} characters.` }, 400);
      }
      const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (taken) return json({ error: `The username "${username}" is already taken.` }, 409);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: `${username}@${EMAIL_DOMAIN}`,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });
      if (createErr || !created?.user) return json({ error: createErr?.message ?? "Couldn't create the account." }, 400);

      const { error: profileErr } = await admin.from("profiles").insert({
        id: created.user.id,
        username,
        display_name: displayName,
        role,
        must_change_password: true,
        created_by: caller.id,
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        throw profileErr;
      }
      return json({ ok: true, id: created.user.id });
    }

    const targetId = String(body.user_id ?? "");
    if (!targetId) return json({ error: "Choose a user first." }, 400);
    const { data: target } = await admin.from("profiles").select("id, role").eq("id", targetId).maybeSingle();
    if (!target) return json({ error: "That user no longer exists." }, 404);

    if (action === "reset_password") {
      const password = String(body.password ?? "");
      if (password.length < MIN_PASSWORD) {
        return json({ error: `The new password needs at least ${MIN_PASSWORD} characters.` }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(targetId, { password });
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").update({ must_change_password: targetId !== caller.id }).eq("id", targetId);
      return json({ ok: true });
    }

    async function adminCount() {
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      return count ?? 0;
    }

    if (action === "set_role") {
      const role = body.role === "admin" ? "admin" : "member";
      if (target.role === "admin" && role === "member" && (await adminCount()) <= 1) {
        return json({ error: "There must be at least one admin." }, 400);
      }
      const { error } = await admin.from("profiles").update({ role }).eq("id", targetId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "delete") {
      if (targetId === caller.id) return json({ error: "You can't remove your own account." }, 400);
      if (target.role === "admin" && (await adminCount()) <= 1) {
        return json({ error: "There must be at least one admin." }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong on the server. Try again." }, 500);
  }
});
