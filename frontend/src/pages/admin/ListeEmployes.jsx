import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const sidebarLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/employes', label: 'Employés', icon: '👥' },
  { path: '/admin/conges', label: 'Congés', icon: '📅' },
  { path: '/admin/rapport', label: 'Rapports', icon: '📋' },
];

const AVATAR_PALETTE = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#ccfbf1', color: '#0f766e' },
  { bg: '#fef9c3', color: '#a16207' },
  { bg: '#e9d5ff', color: '#7c3aed' },
  { bg: '#ffedd5', color: '#c2410c' },
];

const STATUT_BADGE = {
  present: { label: 'Présent', background: '#dcfce7', color: '#166534' },
  absent: { label: 'Absent', background: '#fee2e2', color: '#991b1b' },
  retard: { label: 'Retard', background: '#fef3c7', color: '#b45309' },
};

function isEntree(type) {
  return type === 'entree' || type === 'entrée';
}

function initialsFromNom(nom) {
  if (!nom?.trim()) return '?';
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  const first = (parts[0][0] || '').toUpperCase();
  const second =
    parts.length > 1 ? (parts[parts.length - 1][0] || '').toUpperCase() : (parts[0][1] || '').toUpperCase();
  return (first + second).slice(0, 2);
}

function paletteIndex(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % AVATAR_PALETTE.length;
}

/** Heure d'entrée du jour : après 09:15 → retard (réglable côté métier) */
function statutJourFromPointages(todayPts) {
  if (!todayPts?.length) return 'absent';
  const ent = todayPts.find((p) => isEntree(p.type));
  if (!ent) return 'absent';
  const [hh, mm] = String(ent.heure || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  const mins = hh * 60 + mm;
  if (mins > 9 * 60 + 15) return 'retard';
  return 'present';
}

/** Couleur du % (sur la période couverte par les pointages chargés) */
function tauxPresenceColor(pct) {
  if (pct >= 90) return '#16a34a';
  if (pct >= 75) return '#d97706';
  return '#dc2626';
}

function buildEmployesAvecTaux(pointages) {
  const list = Array.isArray(pointages) ? pointages : [];
  const uniqueUsers = {};
  list.forEach((p) => {
    if (p.user_id) uniqueUsers[String(p.user_id._id)] = p.user_id;
  });

  const datesUniques = [...new Set(list.map((p) => p.date))];
  const nbJoursRef = Math.max(datesUniques.length, 1);
  const today = new Date().toISOString().split('T')[0];

  const joursAvecEntree = {};
  list.forEach((p) => {
    const id = p.user_id?._id != null ? String(p.user_id._id) : '';
    if (!id || !isEntree(p.type)) return;
    if (!joursAvecEntree[id]) joursAvecEntree[id] = new Set();
    joursAvecEntree[id].add(p.date);
  });

  return Object.values(uniqueUsers).map((u) => {
    const uid = String(u._id);
    const jours = joursAvecEntree[uid]?.size ?? 0;
    const tauxPresence = Math.min(100, Math.round((jours / nbJoursRef) * 100));
    const todayPts = list.filter((p) => String(p.user_id?._id) === uid && p.date === today);
    const statutJour = statutJourFromPointages(todayPts);
    return { ...u, tauxPresence, statutJour };
  });
}

export default function ListeEmployes() {
  const [search, setSearch] = useState('');
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', password: 'password123', role: 'employe' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchEmployesActifs();
  }, []);

  const fetchEmployesActifs = async () => {
    try {
      const token = localStorage.getItem('token');
      // On extrait les utilisateurs uniques depuis les pointages récents
      const response = await fetch('http://localhost:5000/api/pointages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setEmployes(buildEmployesAvecTaux(data));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.nom || !form.email) return;
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (response.ok) {
        alert('Employé enregistré avec succès !');
        setShowModal(false);
        fetchEmployesActifs();
      }
    } catch (err) {
      console.error('Register error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const filtered = employes.filter(e =>
    e.nom?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', background: '#f8fafc' }}>

      {/* Sidebar */}
      <div style={{ width: '240px', background: 'linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🕐</div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>PointageApp</span>
          </div>
        </div>
        <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem', paddingLeft: '0.5rem' }}>Menu</p>
          {sidebarLinks.map(link => (
            <Link key={link.path} to={link.path} style={{
              display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '0.3rem',
              textDecoration: 'none', background: location.pathname === link.path ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: location.pathname === link.path ? 'white' : 'rgba(255,255,255,0.7)',
              fontWeight: location.pathname === link.path ? 600 : 400,
              borderLeft: location.pathname === link.path ? '3px solid white' : '3px solid transparent',
            }}>{link.icon} {link.label}</Link>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', padding: '0.7rem', borderRadius: '10px', cursor: 'pointer' }}>🚪 Déconnexion</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Employés (Actifs)</h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Taux = jours avec entrée / jours couverts par les pointages</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>➕ Nouveau Compte</button>
        </div>

        <div style={{ padding: '1.5rem 2rem 2rem' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              boxShadow: '0 4px 24px rgba(15, 23, 42, 0.07)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
              <input
                placeholder="Rechercher un employé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #f1f5f9 0%, #e8eef4 100%)' }}>
                  {['EMPLOYÉ', 'EMAIL', 'TAUX PRÉSENCE', "STATUT AUJOURD'HUI"].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: '1rem 1.35rem',
                        textAlign: 'left',
                        color: '#64748b',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        borderBottom: '2px solid #e2e8f0',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                      Chargement...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                      Aucun employé trouvé en base
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp, i) => {
                    const pal = AVATAR_PALETTE[paletteIndex(emp._id)];
                    const badge = STATUT_BADGE[emp.statutJour] || STATUT_BADGE.absent;
                    return (
                      <tr
                        key={emp._id || i}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: i % 2 === 0 ? '#ffffff' : '#fafbfc',
                        }}
                      >
                        <td style={{ padding: '1.15rem 1.35rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background: pal.bg,
                                color: pal.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                              }}
                            >
                              {initialsFromNom(emp.nom)}
                            </div>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{emp.nom}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1.15rem 1.35rem', color: '#94a3b8', fontSize: '0.92rem', fontWeight: 500, verticalAlign: 'middle' }}>
                          {emp.email}
                        </td>
                        <td style={{ padding: '1.15rem 1.35rem', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '1.05rem',
                              color: tauxPresenceColor(emp.tauxPresence ?? 0),
                            }}
                          >
                            {emp.tauxPresence ?? 0}%
                          </span>
                        </td>
                        <td style={{ padding: '1.15rem 1.35rem', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: badge.background,
                              color: badge.color,
                              padding: '6px 14px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Création */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', width: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>➕ Créer un compte</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label>Nom complet</label>
              <input style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label>Email</label>
              <input style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={handleRegister} style={{ flex: 1, padding: '0.8rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Créer</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.8rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}