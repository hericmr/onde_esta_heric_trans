const CACHE_NAME = 'location-cache-v1';
const LOCATION_QUEUE_KEY = 'location-queue';

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Background sync para envios offline
self.addEventListener('sync', event => {
  if (event.tag === 'location-sync') {
    console.log('Sincronizando localizações offline');
    event.waitUntil(syncLocations());
  }
});

// Função para sincronizar localizações
async function syncLocations() {
  try {
    const queue = await getLocationQueue();
    if (queue.length === 0) return;

    console.log(`Sincronizando ${queue.length} localizações`);

    for (const location of queue) {
      await sendLocationToSupabase(location);
    }

    // Limpa a fila após sincronização bem-sucedida
    await clearLocationQueue();
    console.log('Sincronização concluída');
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}

// Funções auxiliares para IndexedDB
async function getLocationQueue() {
  const db = await openDB('locationDB', 1, {
    upgrade(db) {
      db.createObjectStore('locations');
    },
  });
  return await db.get('locations', 'queue') || [];
}

async function setLocationQueue(queue) {
  const db = await openDB('locationDB', 1, {
    upgrade(db) {
      db.createObjectStore('locations');
    },
  });
  await db.put('locations', queue, 'queue');
}

async function clearLocationQueue() {
  const db = await openDB('locationDB', 1, {
    upgrade(db) {
      db.createObjectStore('locations');
    },
  });
  await db.put('locations', [], 'queue');
}

// Função para enviar localização ao Supabase
async function sendLocationToSupabase(location) {
  // Usar as variáveis de ambiente do cliente
  const supabaseUrl = 'https://your-project.supabase.co'; // Será substituído pelo cliente
  const supabaseKey = 'your-anon-key'; // Será substituído pelo cliente
  
  const response = await fetch(`${supabaseUrl}/rest/v1/location_updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
      user_id: location.user_id || 'anonymous'
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar localização: ${response.status}`);
  }

  return response.json();
}

// Função auxiliar para abrir IndexedDB
function openDB(name, version, options) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (options && options.upgrade) {
        options.upgrade(db);
      }
    };
  });
} 