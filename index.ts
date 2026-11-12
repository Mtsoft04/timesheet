// Edge Function: gửi web push nhắc lịch. Được gọi mỗi phút bởi pg_cron (xem HUONG-DAN-V3.md).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,          // vd: mailto:ban@congty.vn
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("forbidden", { status: 403 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data, error } = await sb.rpc("claim_due_reminders"); // mỗi nhắc chỉ được "nhận" một lần
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0; const gone: string[] = [];
  await Promise.all((data ?? []).map(async (r: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: r.r_endpoint, keys: { p256dh: r.r_p256dh, auth: r.r_auth } },
        JSON.stringify({ title: r.r_title, body: r.r_body, tag: r.r_key }),
        { TTL: 600 },
      );
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(r.r_endpoint); // thiết bị đã hủy đăng ký
      else console.error("push lỗi", e?.statusCode, e?.body);
    }
  }));
  if (gone.length) await sb.from("push_subs").delete().in("endpoint", gone);
  return Response.json({ claimed: data?.length ?? 0, sent, removed: gone.length });
});
