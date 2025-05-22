// public/sw.js
const CACHE_NAME = "everall-cache-v1";
// Determine if we should strip '/dashboard' from paths
const isAppSubdomain = self.location.hostname === "app.ever-all.us";
// Utility to adjust paths based on subdomain
const resolvePath = (path) => {
  return isAppSubdomain ? path.replace(/^\/dashboard/, "") : path;
};
const OFFLINE_URL = resolvePath("/dashboard/offline.html");
// Install Event
self.addEventListener("install", (event) => {
  console.log("🛠️ Service Worker installing...");
  const filesToCache = [
    resolvePath("/dashboard/offline.html"),
    resolvePath("/dashboard/logoLight.png"),
    resolvePath("/dashboard/badge.ico"),
  ];
  console.log("Caching files:", filesToCache);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(filesToCache);
    })
  );
  self.skipWaiting();
});
// Activate Event
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});
// Fetch Event
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});
// Push Event
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      ...data,
      icon: resolvePath("/dashboard/logoLight.png"),
      badge: resolvePath("/dashboard/badge.ico"),
      timestamp: data.timestamp || Date.now(),
    };
    event.waitUntil(
      self.registration.showNotification(
        data.title || "New Notification",
        options
      )
    );
  } catch (err) {
    console.error("Failed to handle push event:", err);
  }
});
// Message Event
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};
  switch (type) {
    case "SHOW_NOTIFICATION":
      self.registration.showNotification(payload.title, {
        icon: resolvePath("/dashboard/logoLight.png"),
        badge: resolvePath("/dashboard/badge.ico"),
        timestamp: Date.now(),
        ...payload,
      });
      break;
    case "CLEAR_NOTIFICATIONS":
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => notification.close());
      });
      break;
  }
});
// Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
// Notification Close Event
self.addEventListener("notificationclose", (event) => {
  const dismissedTime = Date.now();
  const notification = event.notification;
  console.log("Notification closed:", {
    title: notification.title,
    timestamp: notification.timestamp,
    dismissedAt: dismissedTime,
  });
});
