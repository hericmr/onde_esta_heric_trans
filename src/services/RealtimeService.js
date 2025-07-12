import { supabase } from '../supabaseClient';

class RealtimeService {
  constructor() {
    this.subscription = null;
    this.listeners = new Set();
    this.locations = new Map();
  }

  subscribe(callback) {
    this.listeners.add(callback);

    if (!this.subscription) {
      this.subscription = supabase
        .channel('public:location_updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'location_updates' },
          (payload) => {
            this.handleIncomingPayload(payload);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Conectado ao canal de tempo real!');
            this.fetchAllInitialLocations();
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Erro no canal:', err);
          }
          if (status === 'TIMED_OUT') {
            console.warn('Conexão expirou.');
          }
        });
    }

    // Retorna a função de cancelamento da inscrição
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.unsubscribe();
      }
    };
  }

  unsubscribe() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      console.log('Desconectado do canal de tempo real.');
    }
  }

  async fetchAllInitialLocations() {
    const { data, error } = await supabase
      .from('location_updates')
      .select('*');

    if (error) {
      console.error('Erro ao buscar localizações iniciais:', error);
      return;
    }

    // Limpa localizações antigas e preenche com as novas
    this.locations.clear();
    data.forEach(location => {
      // Usamos o user_id como chave para garantir que cada usuário tenha apenas uma localização
      this.locations.set(location.user_id, location);
    });

    this.notifyListeners();
  }

  handleIncomingPayload(payload) {
    console.log('Payload recebido:', payload);
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        this.locations.set(newRecord.user_id, newRecord);
        break;
      case 'UPDATE':
        this.locations.set(newRecord.user_id, newRecord);
        break;
      case 'DELETE':
        this.locations.delete(oldRecord.id.user_id);
        break;
      default:
        // Evento não tratado
        break;
    }

    this.notifyListeners();
  }

  notifyListeners() {
    const locationsArray = Array.from(this.locations.values());
    for (const listener of this.listeners) {
      listener(locationsArray);
    }
  }
}

export const realtimeService = new RealtimeService();
