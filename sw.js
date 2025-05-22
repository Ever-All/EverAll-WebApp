// public/sw.js
const isProd = self.location.hostname.startsWith("app");
const CACHE_NAME = `everall-cache-v1`;
const OFFLINE_URL = "/offline.html";
// Helper function to handle paths based on environment
const getAssetPath = (path) => {
  if (isProd) {
    // In production, assets are at root or in /assets/
    return path.replace("/dashboard/", "/assets/");
  }
  // In development/API, keep dashboard prefix
  return path;
};
// Install Event
self.addEventListener("install", (event) => {
  console.log(`🛠️ Service Worker installing... (${isProd ? "prod" : "dev"})`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        getAssetPath("/dashboard/images/home-but/logoLight.png"),
        getAssetPath("/dashboard/badge.ico"),
      ]);
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
  const url = new URL(event.request.url);
  // Handle dashboard assets
  if (url.pathname.includes("/dashboard/")) {
    const newUrl = new URL(event.request.url);
    newUrl.pathname = getAssetPath(url.pathname);
    event.respondWith(
      fetch(newUrl).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
  // Handle navigation
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
      icon: data.icon || "dashboard/images/home-but/logoLight.png",
      badge: data.badge || "/dashboard/badge.ico",
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
        icon: "dashboard/images/home-but/logoLight.png",
        badge: "/dashboard/badge.ico",
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
