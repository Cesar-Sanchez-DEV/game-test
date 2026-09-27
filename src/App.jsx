import React, { useState, useEffect, useRef } from 'react';
import { api } from './api';

export default function App() {
  // Estado de la sala y del jugador local
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos del jugador actual guardados en sessionStorage
  const [currentPlayer, setCurrentPlayer] = useState(() => {
    const saved = sessionStorage.getItem('juego_player');
    return saved ? JSON.parse(saved) : null;
  });

  // Formularios
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [leaderNameInput, setLeaderNameInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [rolling, setRolling] = useState(false);

  // Consulta el estado de la sala
  const checkRoomStatus = async () => {
    try {
      const data = await api.getRoom();
      if (!data.exists) {
        setRoomData(null);
        // Si la sala ya no existe, limpiar sesión si había
        if (currentPlayer) {
          sessionStorage.removeItem('juego_player');
          setCurrentPlayer(null);
        }
      } else {
        setRoomData(data.room);
        // Si el jugador actual ya no está en la sala (por reinicio de backend), resetear
        if (currentPlayer && !data.room.players.some(p => p.id === currentPlayer.id)) {
          sessionStorage.removeItem('juego_player');
          setCurrentPlayer(null);
        }
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Efecto inicial y sondeo periódico (polling) para sincronizar en tiempo real
  useEffect(() => {
    checkRoomStatus();
    const interval = setInterval(checkRoomStatus, 1200);
    return () => clearInterval(interval);
  }, [currentPlayer?.id]);

  // Manejar creación de sala
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomNameInput.trim() || !leaderNameInput.trim()) {
      setError('Por favor completa el nombre de la sala y tu nombre');
      return;
    }
    setError(null);
    try {
      const result = await api.createRoom(roomNameInput, leaderNameInput);
      setRoomData(result.room);
      setCurrentPlayer(result.player);
      sessionStorage.setItem('juego_player', JSON.stringify(result.player));
      setShowCreateForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Manejar unirse a sala
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinNameInput.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }
    setError(null);
    try {
      const result = await api.joinRoom(joinNameInput);
      setRoomData(result.room);
      setCurrentPlayer(result.player);
      sessionStorage.setItem('juego_player', JSON.stringify(result.player));
    } catch (err) {
      setError(err.message);
    }
  };

  // Iniciar partida (Líder)
  const handleStartGame = async () => {
    if (!currentPlayer) return;
    try {
      const result = await api.startGame(currentPlayer.id);
      setRoomData(result.room);
    } catch (err) {
      setError(err.message);
    }
  };

  // Tirar número
  const handleRollNumber = async () => {
    if (!currentPlayer || rolling) return;
    setRolling(true);
    try {
      const result = await api.rollNumber(currentPlayer.id);
      setRoomData(result.room);
    } catch (err) {
      setError(err.message);
    } finally {
      setRolling(false);
    }
  };

  // Volver a jugar (Líder)
  const handleRestartGame = async () => {
    if (!currentPlayer) return;
    try {
      const result = await api.restartGame(currentPlayer.id);
      setRoomData(result.room);
    } catch (err) {
      setError(err.message);
    }
  };

  // Cerrar sala (Líder)
  const handleCloseRoom = async () => {
    if (!currentPlayer) return;
    if (!window.confirm('¿Seguro que deseas cerrar la sala? Todos serán desconectados.')) return;
    try {
      await api.closeRoom(currentPlayer.id);
      setRoomData(null);
      setCurrentPlayer(null);
      sessionStorage.removeItem('juego_player');
    } catch (err) {
      setError(err.message);
    }
  };

  // Comprobar si el usuario local es el líder
  const isLeader = roomData && currentPlayer && roomData.leaderId === currentPlayer.id;

  // Comprobar si el usuario local ya tiró su número
  const playerInRoom = roomData?.players?.find(p => p.id === currentPlayer?.id);
  const myRolledNumber = playerInRoom ? playerInRoom.rolledNumber : null;

  // Comprobar si el usuario actual es perdedor
  const isCurrentPlayerLoser = roomData?.status === 'finished' && 
    currentPlayer && 
    roomData.losers?.includes(currentPlayer.id);

  if (loading) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#94a3b8' }}>Conectando con el servidor...</h2>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      {/* Encabezado */}
      <header className="app-header">
        <h1 className="app-title">
          <span>🎲</span> Juego de Números
        </h1>
        {roomData && (
          <div className="room-badge">
            <span>Sala: <strong>{roomData.name}</strong></span>
            <span>•</span>
            <span className={`status-badge ${roomData.status}`}>
              {roomData.status === 'waiting' && 'En Espera'}
              {roomData.status === 'playing' && 'En Juego'}
              {roomData.status === 'finished' && 'Pausado (Resultados)'}
            </span>
          </div>
        )}
      </header>

      {error && <div className="error-toast">⚠️ {error}</div>}

      {/* CASO 1: NO EXISTE SALA */}
      {!roomData && !showCreateForm && (
        <div style={{ textAlign: 'center', padding: '30px 10px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🏠</div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '10px' }}>No hay ninguna sala abierta</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Apertura una nueva sala para que tus amigos o compañeros puedan unirse y jugar.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            ➕ Aperturar Sala
          </button>
        </div>
      )}

      {/* CASO 1.1: FORMULARIO APERTURAR SALA */}
      {!roomData && showCreateForm && (
        <form onSubmit={handleCreateRoom} style={{ padding: '10px 0' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', textAlign: 'center' }}>
            Aperturar Nueva Sala
          </h2>
          <div className="form-group">
            <label className="form-label">Nombre de la Sala</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Sala de Campeones, Duelo 123"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tu Nombre (Serás el Líder)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: César"
              value={leaderNameInput}
              onChange={(e) => setLeaderNameInput(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateForm(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Crear y Entrar
            </button>
          </div>
        </form>
      )}

      {/* CASO 2: EXISTE SALA PERO EL USUARIO NO SE HA UNIDO AÚN */}
      {roomData && !currentPlayer && (
        <form onSubmit={handleJoinRoom} style={{ padding: '20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
              ¡La sala "{roomData.name}" está abierta!
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Ingresa tu nombre para unirte al juego.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Tu Nombre de Jugador</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Alex, María..."
              value={joinNameInput}
              onChange={(e) => setJoinNameInput(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '14px' }}>
            🎮 Unirme a la Sala
          </button>
        </form>
      )}

      {/* CASO 3: EL USUARIO YA ESTÁ DENTRO DE LA SALA */}
      {roomData && currentPlayer && (
        <div>
          {/* BANNER RESULTADO SI EL JUEGO TERMINÓ */}
          {roomData.status === 'finished' && (
            <div>
              {isCurrentPlayerLoser ? (
                <div className="loser-banner">
                  <h3>💀 PERDEDOR 💀</h3>
                  <p>
                    ¡Sacaste el número más bajo ({roomData.minScore})! Has perdido esta ronda.
                  </p>
                </div>
              ) : (
                <div className="winner-banner">
                  <h3>🎉 ¡A SALVO! 🎉</h3>
                  <p>
                    No obtuviste el menor puntaje. ¡Sobreviviste a esta ronda!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ESTADO 'WAITING': PANTALLA DE ESPERA */}
          {roomData.status === 'waiting' && (
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⏳</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Pantalla de Espera</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Esperando a que todos los participantes se conecten...
              </p>

              {isLeader ? (
                <div style={{ marginTop: '20px' }}>
                  <button
                    className="btn btn-success"
                    onClick={handleStartGame}
                    disabled={roomData.players.length === 0}
                  >
                    🚀 Iniciar Juego
                  </button>
                  <p className="info-note">
                    Eres el líder. Presiona el botón cuando todos estén listos.
                  </p>
                </div>
              ) : (
                <p className="info-note" style={{ marginTop: '20px' }}>
                  Esperando que el líder (<strong>{roomData.players.find(p => p.isLeader)?.name}</strong>) inicie la partida.
                </p>
              )}
            </div>
          )}

          {/* ESTADO 'PLAYING': EN JUEGO */}
          {roomData.status === 'playing' && (
            <div style={{ margin: '20px 0' }}>
              {myRolledNumber === null ? (
                <div style={{ textAlign: 'center' }}>
                  <button
                    className="btn btn-roll"
                    onClick={handleRollNumber}
                    disabled={rolling}
                  >
                    {rolling ? '🎲 Sacando número...' : '🎲 Lanzar Número (1 al 10)'}
                  </button>
                  <p className="info-note">
                    ¡Presiona el botón para obtener tu número al azar!
                  </p>
                </div>
              ) : (
                <div className="roll-hero-box">
                  <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    Tu número obtenido:
                  </div>
                  <div className="big-number">{myRolledNumber}</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Esperando a que los demás participantes lancen su número...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ESTADO 'FINISHED': PAUSA Y CONTROL DEL LÍDER */}
          {roomData.status === 'finished' && (
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '14px' }}>
                ⏸️ Juego en pausa.
              </p>
              {isLeader ? (
                <button className="btn btn-accent" onClick={handleRestartGame}>
                  🔄 Volver a Jugar (Nueva Ronda)
                </button>
              ) : (
                <p className="info-note">
                  Esperando que el líder permita volver a jugar...
                </p>
              )}
            </div>
          )}

          {/* LISTA DE JUGADORES CONECTADOS */}
          <div className="players-section">
            <div className="section-subtitle">
              <span>Participantes ({roomData.players.length})</span>
              <span>{roomData.status === 'playing' ? 'Ronda en curso' : ''}</span>
            </div>

            <div className="player-grid">
              {roomData.players.map((player) => {
                const isYou = player.id === currentPlayer.id;
                const isLoser = roomData.status === 'finished' && roomData.losers?.includes(player.id);

                return (
                  <div
                    key={player.id}
                    className={`player-card ${isYou ? 'is-you' : ''} ${isLoser ? 'is-loser' : ''}`}
                  >
                    <div className="player-avatar">
                      {isLoser ? '💀' : player.isLeader ? '👑' : '👤'}
                    </div>

                    <div className="player-name">
                      {player.name}
                      {player.isLeader && <span className="tag-leader">Líder</span>}
                      {isYou && <span className="tag-you">Tú</span>}
                    </div>

                    {/* Estado de tirada */}
                    <div className="player-dice-status">
                      {roomData.status === 'waiting' && 'Listo en sala'}
                      {roomData.status === 'playing' && (
                        player.rolledNumber !== null ? (
                          <div style={{ color: '#38bdf8', fontWeight: 600 }}>
                            {isYou ? `Sacaste: ${player.rolledNumber}` : '¡Ya tiró!'}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Pensando...</span>
                        )
                      )}
                      {roomData.status === 'finished' && (
                        <div>
                          <div
                            className={`dice-number-display ${isLoser ? 'loser-number' : ''}`}
                          >
                            {player.rolledNumber}
                          </div>
                          {isLoser && (
                            <div style={{ color: 'var(--danger)', fontWeight: 800, marginTop: '4px', fontSize: '0.85rem' }}>
                              PERDEDOR
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPCIONES DE PIE DE PÁGINA (LÍDER PUEDE CERRAR SALA) */}
          {isLeader && (
            <div className="action-footer">
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '10px' }}
                onClick={handleCloseRoom}
              >
                🚪 Cerrar Sala por Completo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
