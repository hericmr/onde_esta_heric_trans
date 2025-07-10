import React, { useState, useEffect, useCallback } from 'react';
import { geolocationService } from '../../services/GeolocationService';
import { locationManager } from '../../services/LocationManager';
import './styles.css';

const Transmitter = () => {
  const [permissionStatus, setPermissionStatus] = useState('Aguardando permissão...');
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [sendStatus, setSendStatus] = useState('Aguardando envio...');
  const [isTracking, setIsTracking] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Monitora status da rede
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitora tamanho da fila
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueLength(locationManager.getQueueLength());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Verifica permissão de geolocalização
  const checkGeolocationPermission = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      setPermissionStatus('Não suportada');
      return;
    }

    try {
      // Verifica se já tem permissão
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        setHasPermission(true);
        setPermissionStatus('Permissão concedida');
        startLocationTracking();
      } else if (permission.state === 'denied') {
        setHasPermission(false);
        setPermissionStatus('Permissão negada');
        setError('Permissão de geolocalização negada. Por favor, permita o acesso à localização nas configurações do navegador.');
      } else {
        setHasPermission(false);
        setPermissionStatus('Aguardando permissão');
      }
    } catch (error) {
      console.log('Erro ao verificar permissão:', error);
      setHasPermission(false);
      setPermissionStatus('Aguardando permissão');
    }
  }, []);

  useEffect(() => {
    checkGeolocationPermission();
  }, [checkGeolocationPermission]);

  const requestPermission = async () => {
    try {
      setPermissionStatus('Solicitando permissão...');
      setError(null);
      
      // Solicita permissão usando getCurrentPosition
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });
      
      setHasPermission(true);
      setPermissionStatus('Permissão concedida');
      startLocationTracking();
    } catch (error) {
      setHasPermission(false);
      setPermissionStatus('Permissão negada');
      setError('Permissão de geolocalização negada. Por favor, permita o acesso à localização.');
    }
  };

  const startLocationTracking = async () => {
    if (isTracking) return;
    
    try {
      setPermissionStatus('Iniciando tracking...');
      
      // Configura callback para atualizações de localização
      geolocationService.startTracking((newLocation) => {
        setLocation(newLocation);
        setLastUpdate(new Date());
        setSendStatus(newLocation.forced ? 'Atualização forçada' : 'Localização atualizada');
      });
      
      setIsTracking(true);
      setPermissionStatus('Tracking ativo');
      setSendStatus('Enviando localizações...');
      setError(null);
      
    } catch (error) {
      setError(error.message);
      setPermissionStatus('Erro no tracking');
      setIsTracking(false);
    }
  };

  const stopLocationTracking = () => {
    geolocationService.stopTracking();
    setIsTracking(false);
    setPermissionStatus('Tracking parado');
    setSendStatus('Aguardando...');
  };

  const restartTracking = () => {
    stopLocationTracking();
    setTimeout(() => {
      if (hasPermission) {
        startLocationTracking();
      } else {
        requestPermission();
      }
    }, 1000);
  };

  return (
    <div className="transmitter-container">
      <h1>🚗 Página Transmissora</h1>
      
      {/* Status da rede */}
      <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot"></span>
        {isOnline ? 'Online' : 'Offline'}
      </div>
      
      {!hasPermission ? (
        <div className="permission-request">
          <h2>📍 Permissão de Localização</h2>
          <p>Este app precisa de acesso à sua localização para funcionar corretamente.</p>
          <button onClick={requestPermission} className="permission-btn">
            📍 Permitir Localização
          </button>
          <p className="permission-note">
            💡 Clique no botão acima e depois "Permitir" quando o navegador solicitar
          </p>
        </div>
      ) : (
        <div className="tracking-info">
          <h2>📍 Rastreamento de Localização</h2>
          
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Permissão:</span>
              <span className={`value ${permissionStatus === 'Tracking ativo' ? 'success' : 'warning'}`}>
                {permissionStatus}
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">Envio:</span>
              <span className={`value ${sendStatus === 'Enviando localizações...' ? 'success' : 'warning'}`}>
                {sendStatus}
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">Fila:</span>
              <span className={`value ${queueLength > 0 ? 'warning' : 'success'}`}>
                {queueLength} localizações
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">Última Atualização:</span>
              <span className="value">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Nunca'}
              </span>
            </div>
          </div>
          
          {location && (
            <div className="location-info">
              <h3>📍 Última Localização:</h3>
              <div className="location-grid">
                <div className="location-item">
                  <span className="label">Latitude:</span>
                  <span className="value">{location.lat.toFixed(6)}</span>
                </div>
                <div className="location-item">
                  <span className="label">Longitude:</span>
                  <span className="value">{location.lng.toFixed(6)}</span>
                </div>
                <div className="location-item">
                  <span className="label">Precisão:</span>
                  <span className="value">{location.accuracy?.toFixed(2)}m</span>
                </div>
                {location.speed && (
                  <div className="location-item">
                    <span className="label">Velocidade:</span>
                    <span className="value">{(location.speed * 3.6).toFixed(1)} km/h</span>
                  </div>
                )}
                {location.forced && (
                  <div className="location-item">
                    <span className="label">Tipo:</span>
                    <span className="value">Atualização forçada</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="action-buttons">
            <button 
              onClick={restartTracking} 
              className="restart-btn"
            >
              🔄 Reiniciar Tracking
            </button>
            <button 
              onClick={() => locationManager.clearQueue()} 
              className="clear-btn"
              disabled={queueLength === 0}
            >
              🗑️ Limpar Fila
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>❌ Erro: {error}</p>
          <button onClick={requestPermission} className="retry-btn">
            🔄 Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default Transmitter;
