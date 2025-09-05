// Service Worker for SitFit - Background notifications and caching
const CACHE_NAME = 'sitfit-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for reminders
self.addEventListener('sync', event => {
    if (event.tag === 'background-reminder') {
        event.waitUntil(sendBackgroundNotification());
    }
});

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: 'Time for your posture check!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'dismiss',
                title: 'Done!',
                icon: '/icons/check.png'
            },
            {
                action: 'snooze',
                title: 'Snooze 5 min',
                icon: '/icons/snooze.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('SitFit Reminder', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'dismiss') {
        // Handle dismiss
        console.log('Reminder dismissed');
    } else if (event.action === 'snooze') {
        // Handle snooze
        console.log('Reminder snoozed');
        setTimeout(() => {
            self.registration.showNotification('SitFit Reminder (Snoozed)', {
                body: 'Time for your posture check!',
                icon: '/favicon.ico'
            });
        }, 300000); // 5 minutes
    } else {
        // Handle main notification click
        event.waitUntil(
            clients.openWindow('/index.html')
        );
    }
});

function sendBackgroundNotification() {
    return self.registration.showNotification('SitFit Reminder', {
        body: 'Time to check your posture and take a break!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [500, 200, 500],
        requireInteraction: true,
        silent: false
    });
}