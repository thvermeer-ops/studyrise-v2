self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Luister naar berichten van de app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    checkAndNotify(e.data.tasks);
  }
});

function checkAndNotify(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tasks.forEach(task => {
    if (!task.date || task.done) return;

    const deadline = new Date(task.date);
    deadline.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((deadline - today) / (1000 * 60 * 60 * 24));

    if (daysLeft === 2) {
      self.registration.showNotification('📚 Taak over 2 dagen', {
        body: `${task.title} (${task.subject}) — deadline ${task.date}`,
        tag: `task-2d-${task.id}`,
        data: { url: self.location.origin + '/app-v2.html' }
      });
    }

    if (daysLeft === 1) {
      self.registration.showNotification('⚠️ Taak morgen deadline!', {
        body: `${task.title} (${task.subject}) — morgen inleveren!`,
        tag: `task-1d-${task.id}`,
        data: { url: self.location.origin + '/app-v2.html' }
      });
    }
  });
}

// Klik op notificatie → open de app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = e.notification.data?.url || '/app-v2.html';
      for (const client of list) {
        if (client.url.includes('app-v2') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Periodieke achtergrond sync (werkt in Chrome/Edge op Android)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-deadlines') {
    e.waitUntil(
      clients.matchAll().then(list => {
        // Vraag de app om taken te sturen
        list.forEach(client => client.postMessage({ type: 'REQUEST_TASKS' }));
      })
    );
  }
});