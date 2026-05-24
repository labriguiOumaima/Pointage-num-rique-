import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Pointage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchHistorique();
  }, []);

  const fetchHistorique = async () => {
    try {
      const res = await api.get('/pointages');
      setHistorique(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePointage = async (type) => {
    setLoading(true);
    setMessage('');
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await api.post('/pointages', {
          type,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          valide: true
        });
        setMessage(`${type === 'entree' ? 'Entrée' : 'Sortie'} enregistrée avec succès ✅`);
        fetchHistorique();
        setLoading(false);
      }, () => {
        setMessage('Géolocalisation refusée ❌');
        setLoading(false);
      });
    } catch (err) {
      setMessage('Erreur lors du pointage');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Bonjour, {user?.nom} 👋</h2>
        <button onClick={logout} style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      {/* Boutons pointage */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handlePointage('entree')}
          disabled={loading}
          style={{ flex: 1, padding: '1rem', background: '#52c41a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}
        >
          ✅ Pointer Entrée
        </button>
        <button
          onClick={() => handlePointage('sortie')}
          disabled={loading}
          style={{ flex: 1, padding: '1rem', background: '#1890ff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}
        >
          🚪 Pointer Sortie
        </button>
      </div>

      {/* Bouton Scanner QR */}
      <button
        onClick={() => navigate('/employe/scanner')}
        style={{ width: '100%', padding: '0.75rem', background: '#722ed1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        📷 Scanner QR Code
      </button>

      {/* Bouton Demande Congé */}
      <button
        onClick={() => navigate('/employe/conge')}
        style={{ width: '100%', padding: '0.75rem', background: '#fa8c16', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        📅 Demander un congé
      </button>

      {/* Message feedback */}
      {message && (
        <div style={{ padding: '0.75rem', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center' }}>
          {message}
        </div>
      )}

      {/* Historique */}
      <h3>Historique des pointages</h3>
      {historique.length === 0 ? (
        <p style={{ color: '#999' }}>Aucun pointage enregistré</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f2f5' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Heure</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {historique.map((p) => (
              <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{p.date}</td>
                <td style={{ padding: '0.5rem' }}>{p.heure}</td>
                <td style={{ padding: '0.5rem', color: p.type === 'entree' ? '#52c41a' : '#1890ff' }}>
                  {p.type === 'entree' ? '✅ Entrée' : '🚪 Sortie'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}