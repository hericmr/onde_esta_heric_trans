# 🔧 Configuração do Projeto

## 📋 Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **Conta no Supabase** (gratuita)
3. **Navegador moderno** com suporte a Service Workers

## 🚀 Configuração Rápida

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Configuração do Supabase

#### 2.1 Criar Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL e a chave anônima

#### 2.2 Criar Tabela
Execute este SQL no editor SQL do Supabase:

```sql
-- Criar tabela de localizações
CREATE TABLE location_updates (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;

-- Política para inserção
CREATE POLICY "Users can insert their own location" ON location_updates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para leitura
CREATE POLICY "Users can view their own location" ON location_updates
  FOR SELECT USING (auth.uid() = user_id);
```

#### 2.3 Configurar Autenticação
1. Vá para Authentication > Settings
2. Configure os provedores de autenticação desejados
3. Recomendado: Email/Password

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar o Projeto

```bash
npm start
```

## 🔍 Verificação da Configuração

### 1. Service Worker
- Abra o DevTools (F12)
- Vá para Application > Service Workers
- Deve mostrar "service-worker.js" como ativo

### 2. IndexedDB
- No DevTools, vá para Application > Storage > IndexedDB
- Deve mostrar "locationDB" criado

### 3. Geolocalização
- Permita o acesso à localização quando solicitado
- Verifique se o ícone de localização aparece na barra de endereços

### 4. Autenticação
- Tente fazer login com um usuário criado no Supabase
- Verifique se o tracking inicia automaticamente

## 🚨 Problemas Comuns

### Service Worker não registra
```bash
# Verifique se está em HTTPS ou localhost
# Service Workers só funcionam em contextos seguros
```

### Erro de CORS
```bash
# Verifique se as credenciais do Supabase estão corretas
# Confirme se a URL está sem barra no final
```

### Geolocalização não funciona
```bash
# Verifique as permissões do navegador
# Certifique-se de estar em HTTPS
# Teste em um dispositivo móvel
```

### Autenticação falha
```bash
# Verifique se o usuário existe no Supabase
# Confirme se as políticas RLS estão configuradas
# Verifique se a chave anônima está correta
```

## 📱 Teste em Dispositivo Móvel

### 1. Acesso Local
```bash
# Descubra seu IP local
ip addr show

# Execute com IP específico
REACT_APP_HOST=192.168.1.100 npm start
```

### 2. Deploy Temporário
```bash
# Use serviços como Netlify Drop ou Vercel
npm run build
# Faça upload da pasta build
```

## 🔧 Configurações Avançadas

### Intervalos Personalizados
```javascript
// Em src/services/LocationManager.js
this.updateInterval = 3000; // 3 segundos
```

### Threshold de Movimento
```javascript
// Em src/services/GeolocationService.js
this.movementThreshold = 5; // 5 metros
```

### Retry Configuration
```javascript
// Em src/services/LocationManager.js
this.maxRetries = 5; // 5 tentativas
```

## 📊 Monitoramento

### Logs do Console
- Service Worker: `console.log('SW registrado')`
- Geolocalização: `console.log('Tracking iniciado')`
- Envios: `console.log('Localização enviada')`

### Métricas
- Status da rede (online/offline)
- Tamanho da fila de envios
- Última localização
- Status de permissões

## 🎯 Próximos Passos

1. **Teste completo** em dispositivo móvel
2. **Configure notificações** push (opcional)
3. **Implemente analytics** (opcional)
4. **Deploy em produção**

---

**✅ Configuração concluída! Seu sistema está pronto para uso.** 