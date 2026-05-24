import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DemandeConge() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ date_debut: '', date_fin: '', type: 'annuel' });
  const [message, setMessage] = useState('');
  const [historique, setHistorique] = useState([]);

  useEffect(() => {
    fetchConges();
  }, []);

  const fetchConges = async () => {
    try {
      const res = await api.get('/conges');
      setHistorique(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (new Date(form.date_fin) < new Date(form.date_debut)) {
    setMessage('❌ La date de fin doit être après la date de début !');
    return;
  }

  try {
    await api.post('/conges', form);
    setMessage('Demande envoyée avec succès ✅');
    fetchConges();
    setForm({ date_debut: '', date_fin: '', type: 'annuel' });
  } catch (err) {
    setMessage('Erreur lors de la demande ❌');
  }
};

  const getStatutColor = (statut) => {
    if (statut === 'valide') return '#52c41a';
    if (statut === 'refuse') return '#ff4d4f';
    return '#fa8c16';
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/employe/pointage')}
          style={{ background: '#666', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0 }}>Demande de congé</h2>
      </div>

      {/* Formulaire */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Type de congé</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="annuel">Annuel</option>
              <option value="maladie">Maladie</option>
              <option value="exceptionnel">Exceptionnel</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Date début</label>
            <input
              type="date"
              value={form.date_debut}
              onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '6px', border: '1px solid #ddd' }}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>Date fin</label>
            <input
              type="date"
              value={form.date_fin}
              onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem', borderRadius: '6px', border: '1px solid #ddd' }}
              required
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '0.75rem', background: '#fa8c16', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
          >
            Envoyer la demande
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px', textAlign: 'center' }}>
            {message}
          </div>
        )}
      </div>

      {/* Historique des congés */}
      <h3>Mes demandes</h3>
      {historique.length === 0 ? (
        <p style={{ color: '#999' }}>Aucune demande pour l'instant</p>
      ) : (
        historique.map((c) => (
          <div key={c._id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{c.type.charAt(0).toUpperCase() + c.type.slice(1)}</p>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                {new Date(c.date_debut).toLocaleDateString()} → {new Date(c.date_fin).toLocaleDateString()}
              </p>
            </div>
            <span style={{ color: getStatutColor(c.statut), fontWeight: 'bold' }}>
              {c.statut === 'valide' ? '✅ Validé' : c.statut === 'refuse' ? '❌ Refusé' : '⏳ En attente'}
            </span>
          </div>
        ))
      )}
    </div>
  );
}