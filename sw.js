// Timesheet · service worker nhận web push. Đặt cùng thư mục với index.html.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Timesheet";
  e.waitUntil((async () => {
    const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const vis = cl.filter(c => c.visibilityState === "visible");
    // đang mở trang: báo ngay trong trang, không bật thông báo hệ thống
    if (vis.length) { vis.forEach(c => c.postMessage({ type: "push", title, body: d.body || "" })); return; }
    await self.registration.showNotification(title, { body: d.body || "", tag: d.tag || undefined, data: { url: "./" } });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (cl.length) return cl[0].focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./");
  })());
});
