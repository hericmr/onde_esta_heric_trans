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