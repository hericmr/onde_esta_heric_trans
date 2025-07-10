import { supabase } from '../supabaseClient';
import { openDB } from 'idb';

class LocationManager {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.updateInterval = 5000; // 5 segundos
    this.intervalId = null;
    this.isOnline = navigator.onLine;
    
    this.setupNetworkListener();
    this.initDB();
  }

  async initDB() {
    try {
      this.db = await openDB('locationDB', 1, {
        upgrade(db) {
          db.createObjectStore('locations');
        },
      });
    } catch (error) {
      console.error('Erro ao inicializar IndexedDB:', error);
    }
  }

  setupNetworkListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async addLocation(location) {
    const locationData = {
      ...location,
      timestamp: Date.now(),
      user_id: 'anonymous' // Usuário anônimo fixo
    };

    // Adiciona à fila local
    this.queue.push(locationData);

    // Salva no IndexedDB para persistência
    await this.saveToIndexedDB(locationData);

    // Processa imediatamente se online
    if (this.isOnline) {
      this.processQueue();
    } else {
      // Agenda sincronização quando voltar online
      this.scheduleBackgroundSync();
    }
  }

  async saveToIndexedDB(location) {
    try {
      if (!this.db) return;
      
      const queue = await this.db.get('locations', 'queue') || [];
      queue.push(location);
      
      // Mantém apenas as últimas 100 localizações
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }
      
      await this.db.put('locations', queue, 'queue');
    } catch (error) {
      console.error('Erro ao salvar no IndexedDB:', error);
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const location = this.queue.shift();
      const success = await this.sendLocation(location);

      if (!success && this.retryCount < this.maxRetries) {
        this.queue.unshift(location);
        this.retryCount++;
        await this.delay(Math.pow(2, this.retryCount) * 1000); // Exponential backoff
      } else if (!success) {
        // Se falhou após todas as tentativas, salva para sincronização posterior
        await this.saveToIndexedDB(location);
      }
    }

    this.isProcessing = false;
    this.retryCount = 0;
  }

  async sendLocation(location) {
    try {
      const { error } = await supabase
        .from('location_updates')
        .insert([{
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: new Date(location.timestamp).toISOString(),
          user_id: location.user_id
        }]);

      if (error) {
        console.error('Erro ao enviar localização:', error);
        return false;
      }

      console.log('Localização enviada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro na requisição:', error);
      return false;
    }
  }

  scheduleBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('location-sync');
      });
    }
  }

  startPeriodicUpdates() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      if (this.isOnline) {
        this.processQueue();
      }
    }, this.updateInterval);
  }

  stopPeriodicUpdates() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async clearQueue() {
    this.queue = [];
    if (this.db) {
      await this.db.put('locations', [], 'queue');
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  isOnline() {
    return this.isOnline;
  }
}

export const locationManager = new LocationManager(); 