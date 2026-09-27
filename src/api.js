const API_BASE_URL = 'https://game-test-api.onrender.com/api';

export const api = {
  // Consultar estado de la sala
  async getRoom() {
    const res = await fetch(`${API_BASE_URL}/room`);
    if (!res.ok) throw new Error('Error al consultar sala');
    return res.json();
  },

  // Crear/aperturar sala
  async createRoom(roomName, leaderName) {
    const res = await fetch(`${API_BASE_URL}/room/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, leaderName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear sala');
    return data;
  },

  // Unirse a sala existente
  async joinRoom(playerName) {
    const res = await fetch(`${API_BASE_URL}/room/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al unirse');
    return data;
  },

  // Iniciar juego (líder)
  async startGame(playerId) {
    const res = await fetch(`${API_BASE_URL}/room/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar juego');
    return data;
  },

  // Sacar número (1 al 10)
  async rollNumber(playerId) {
    const res = await fetch(`${API_BASE_URL}/room/roll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al lanzar número');
    return data;
  },

  // Reiniciar juego para nueva ronda (líder)
  async restartGame(playerId) {
    const res = await fetch(`${API_BASE_URL}/room/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al reiniciar juego');
    return data;
  },

  // Cerrar sala (líder)
  async closeRoom(playerId) {
    const res = await fetch(`${API_BASE_URL}/room/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cerrar sala');
    return data;
  }
};
