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
    this.onLocationUpdate = null;
    this.forcedUpdateInterval = null;
    this.updateInterval = 5000; // 5 segundos
  }

  startTracking(onLocationUpdate = null) {
    if (this.isTracking) {
      console.log('Tracking já está ativo');
      return;
    }

    if (!("geolocation" in navigator)) {
      throw new Error('Geolocalização não é suportada pelo navegador');
    }

    this.isTracking = true;
    this.onLocationUpdate = onLocationUpdate;
    
    // Inicia o watch de geolocalização
    this.watchId = navigator.geolocation.watchPosition(
      position => this.handlePosition(position),
      error => this.handleError(error),
      this.options
    );

    // Inicia atualizações forçadas a cada 5 segundos
    this.startForcedUpdates();
    
    // Inicia atualizações periódicas do LocationManager
    locationManager.startPeriodicUpdates();
    
    console.log('Tracking de geolocalização iniciado');
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    // Para as atualizações forçadas
    this.stopForcedUpdates();
    
    this.isTracking = false;
    locationManager.stopPeriodicUpdates();
    
    console.log('Tracking de geolocalização parado');
  }

  startForcedUpdates() {
    // Limpa intervalo anterior se existir
    if (this.forcedUpdateInterval) {
      clearInterval(this.forcedUpdateInterval);
    }

    // Inicia intervalo de atualizações forçadas
    this.forcedUpdateInterval = setInterval(() => {
      if (this.isTracking && this.lastLocation) {
        // Força envio da última localização conhecida
        const forcedLocation = {
          ...this.lastLocation,
          timestamp: Date.now(),
          forced: true // Marca como atualização forçada
        };
        
        locationManager.addLocation(forcedLocation);
        console.log('Atualização forçada enviada:', forcedLocation);
        
        // Chama callback se fornecido
        if (this.onLocationUpdate) {
          this.onLocationUpdate(forcedLocation);
        }
      }
    }, this.updateInterval);
  }

  stopForcedUpdates() {
    if (this.forcedUpdateInterval) {
      clearInterval(this.forcedUpdateInterval);
      this.forcedUpdateInterval = null;
    }
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

    // Sempre atualiza a última localização
    this.lastLocation = location;
    
    // Sempre envia a localização (removido threshold de movimento)
    locationManager.addLocation(location);
    
    // Chama callback se fornecido
    if (this.onLocationUpdate) {
      this.onLocationUpdate(location);
    }
    
    console.log('Nova localização capturada:', location);
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
      default:
        errorMessage = 'Erro desconhecido de geolocalização';
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

  setMovementThreshold(threshold) {
    this.movementThreshold = threshold;
  }

  getMovementThreshold() {
    return this.movementThreshold;
  }

  setUpdateInterval(interval) {
    this.updateInterval = interval;
    // Reinicia as atualizações forçadas com o novo intervalo
    if (this.isTracking) {
      this.stopForcedUpdates();
      this.startForcedUpdates();
    }
  }

  getUpdateInterval() {
    return this.updateInterval;
  }
}

export const geolocationService = new GeolocationService(); 