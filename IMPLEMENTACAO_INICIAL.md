# Implementação Inicial - Melhorias de Geolocalização

## 🚀 Começando Agora

Este documento contém a implementação inicial das melhorias de geolocalização, focando nas mudanças mais críticas para garantir atualizações constantes a cada 5 segundos.

## 📦 Passo 1: Instalar Dependências

```bash
npm install @supabase/auth-helpers-react idb debounce workbox-webpack-plugin
```

## 🔧 Passo 2: Configurar Service Worker

### 2.1 Criar Service Worker

```javascript
// public/service-worker.js
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
  const supabaseUrl = 'SUA_URL_SUPABASE';
  const supabaseKey = 'SUA_CHAVE_SUPABASE';
  
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
      user_id: location.user_id
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar localização: ${response.status}`);
  }

  return response.json();
}
```

### 2.2 Registrar Service Worker

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registrado: ', registration);
      })
      .catch(registrationError => {
        console.log('SW falhou: ', registrationError);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
```

## 🔐 Passo 3: Implementar Autenticação Real

### 3.1 Criar Auth Service

```javascript
// src/services/authService.js
import { supabase } from '../supabaseClient';

class AuthService {
  constructor() {
    this.user = null;
    this.session = null;
    this.setupAuthListener();
  }

  setupAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      this.session = session;
      this.user = session?.user || null;
      
      if (event === 'SIGNED_IN') {
        console.log('Usuário logado:', this.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('Usuário deslogado');
      }
    });
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  getCurrentUser() {
    return this.user;
  }

  getCurrentSession() {
    return this.session;
  }

  isAuthenticated() {
    return !!this.user;
  }
}

export const authService = new AuthService();
```

### 3.2 Criar User Context

```javascript
// src/contexts/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    const session = authService.getCurrentSession();
    if (session) {
      setUser(session.user);
    }
    setLoading(false);

    // Listener para mudanças de autenticação
    const unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => unsubscribe.data.subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService)
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};
```

## 📍 Passo 4: Implementar Location Manager Otimizado

### 4.1 Location Manager Melhorado

```javascript
// src/services/LocationManager.js
import { supabase } from '../supabaseClient';
import { openDB } from 'idb';
import debounce from 'debounce';

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
    this.db = await openDB('locationDB', 1, {
      upgrade(db) {
        db.createObjectStore('locations');
      },
    });
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
      user_id: authService.getCurrentUser()?.id
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
      if (this.isOnline && authService.isAuthenticated()) {
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
    await this.db.put('locations', [], 'queue');
  }
}

export const locationManager = new LocationManager();
```

### 4.2 Geolocation Service Otimizado

```javascript
// src/services/GeolocationService.js
import { locationManager } from './LocationManager';

class GeolocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };
    
    this.lastLocation = null;
    this.movementThreshold = 10; // metros
  }

  startTracking() {
    if (this.isTracking) {
      console.log('Tracking já está ativo');
      return;
    }

    if (!("geolocation" in navigator)) {
      throw new Error('Geolocalização não é suportada pelo navegador');
    }

    this.isTracking = true;
    
    this.watchId = navigator.geolocation.watchPosition(
      position => this.handlePosition(position),
      error => this.handleError(error),
      this.options
    );

    // Inicia atualizações periódicas
    locationManager.startPeriodicUpdates();
    
    console.log('Tracking de geolocalização iniciado');
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    locationManager.stopPeriodicUpdates();
    
    console.log('Tracking de geolocalização parado');
  }

  handlePosition(position) {
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      speed: position.coords.speed || null,
      heading: position.coords.heading || null
    };

    // Verifica se houve movimento significativo
    if (this.shouldUpdateLocation(location)) {
      this.lastLocation = location;
      locationManager.addLocation(location);
    }
  }

  shouldUpdateLocation(newLocation) {
    if (!this.lastLocation) {
      return true;
    }

    const distance = this.calculateDistance(this.lastLocation, newLocation);
    return distance > this.movementThreshold;
  }

  calculateDistance(loc1, loc2) {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = loc1.lat * Math.PI / 180;
    const φ2 = loc2.lat * Math.PI / 180;
    const Δφ = (loc2.lat - loc1.lat) * Math.PI / 180;
    const Δλ = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  handleError(error) {
    console.error('Erro de geolocalização:', error);
    
    let errorMessage = 'Erro desconhecido';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permissão de geolocalização negada';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Informação de localização indisponível';
        break;
      case error.TIMEOUT:
        errorMessage = 'Timeout na obtenção da localização';
        break;
    }
    
    throw new Error(errorMessage);
  }

  isTracking() {
    return this.isTracking;
  }

  getLastLocation() {
    return this.lastLocation;
  }
}

export const geolocationService = new GeolocationService();
```

## 🎨 Passo 5: Componente Transmitter Atualizado

```javascript
// src/components/Transmitter/index.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { geolocationService } from '../../services/GeolocationService';
import { authService } from '../../services/authService';
import './styles.css';

const Transmitter = () => {
  const { user, loading, signIn, signOut, isAuthenticated } = useUser();
  const [permissionStatus, setPermissionStatus] = useState('Aguardando permissão...');
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [sendStatus, setSendStatus] = useState('Aguardando envio...');
  const [isTracking, setIsTracking] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated && !isTracking) {
      startLocationTracking();
    } else if (!isAuthenticated && isTracking) {
      stopLocationTracking();
    }
  }, [isAuthenticated, isTracking]);

  const startLocationTracking = async () => {
    try {
      setPermissionStatus('Iniciando tracking...');
      geolocationService.startTracking();
      setIsTracking(true);
      setPermissionStatus('Tracking ativo');
      setSendStatus('Enviando localizações...');
    } catch (error) {
      setError(error.message);
      setPermissionStatus('Erro no tracking');
    }
  };

  const stopLocationTracking = () => {
    geolocationService.stopTracking();
    setIsTracking(false);
    setPermissionStatus('Tracking parado');
    setSendStatus('Aguardando login...');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      setError(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setError(null);
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return <div className="transmitter-container">Carregando...</div>;
  }

  return (
    <div className="transmitter-container">
      <h1>Página Transmissora</h1>
      
      {!isAuthenticated ? (
        <div className="auth-form">
          <h2>Login</h2>
          <form onSubmit={handleSignIn}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Entrar</button>
          </form>
        </div>
      ) : (
        <div className="tracking-info">
          <h2>Bem-vindo, {user?.email}</h2>
          <p>Status da Permissão: <span className={permissionStatus === 'Tracking ativo' ? 'success' : 'warning'}>{permissionStatus}</span></p>
          <p>Status do Envio: <span className={sendStatus === 'Enviando localizações...' ? 'success' : 'warning'}>{sendStatus}</span></p>
          
          {location && (
            <div className="location-info">
              <h3>Última Localização:</h3>
              <p>Latitude: {location.lat.toFixed(6)}</p>
              <p>Longitude: {location.lng.toFixed(6)}</p>
              <p>Precisão: {location.accuracy?.toFixed(2)}m</p>
              {location.speed && <p>Velocidade: {(location.speed * 3.6).toFixed(1)} km/h</p>}
            </div>
          )}
          
          <button onClick={handleSignOut} className="logout-btn">
            Sair
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>Erro: {error}</p>
        </div>
      )}
    </div>
  );
};

export default Transmitter;
```

## 🎨 Passo 6: Estilos Atualizados

```css
/* src/components/Transmitter/styles.css */
.transmitter-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.auth-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.auth-form h2 {
  margin-top: 0;
  color: #333;
}

.auth-form input {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.auth-form button {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}

.auth-form button:hover {
  background: #0056b3;
}

.tracking-info {
  background: #e8f5e8;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.tracking-info h2 {
  margin-top: 0;
  color: #2d5a2d;
}

.location-info {
  background: white;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
  border-left: 4px solid #28a745;
}

.location-info h3 {
  margin-top: 0;
  color: #333;
}

.location-info p {
  margin: 5px 0;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.success {
  color: #28a745;
  font-weight: bold;
}

.warning {
  color: #ffc107;
  font-weight: bold;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
  border-left: 4px solid #dc3545;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.logout-btn:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .transmitter-container {
    padding: 15px;
  }
  
  .auth-form,
  .tracking-info {
    padding: 15px;
  }
}
```

## 🚀 Como Executar

1. **Instalar dependências:**
```bash
npm install @supabase/auth-helpers-react idb debounce workbox-webpack-plugin
```

2. **Configurar variáveis de ambiente:**
```env
REACT_APP_SUPABASE_URL=sua_url_do_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
```

3. **Substituir os arquivos existentes pelos novos**

4. **Executar o projeto:**
```bash
npm start
```

## ✅ Benefícios Imediatos

- ✅ **Atualizações constantes**: Localização enviada a cada 5 segundos
- ✅ **Funcionamento offline**: Dados salvos localmente quando offline
- ✅ **Autenticação real**: Login real com Supabase Auth
- ✅ **Retry automático**: Tentativas automáticas em caso de falha
- ✅ **Otimização de bateria**: Só atualiza quando há movimento significativo
- ✅ **Service Worker**: Funciona em background e offline

## 🔄 Próximos Passos

1. Implementar Adaptive Tracking (intervalos dinâmicos)
2. Adicionar geofencing
3. Implementar analytics
4. Adicionar testes automatizados
5. Otimizar para PWA completo

---

**Status**: 🚀 Pronto para implementação  
**Tempo estimado**: 2-3 horas  
**Dificuldade**: Média 