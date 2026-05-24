import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const sidebarLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/employes', label: 'Employés', icon: '👥' },
  { path: '/admin/conges', label: 'Congés', icon: '📅' },
  { path: '/admin/rapport', label: 'Rapports', icon: '📋' },
];

/** Aligné sur le schéma MongoDB : en_attente | valide | refuse */
const STATUT_UI = {
  en_attente: { label: 'En attente', bg: '#fff8e1', color: '#92400e' },
  valide: { label: 'Validé', bg: '#e6f4ea', color: '#137333' },
  refuse: { label: 'Refusé', bg: '#fce8e6', color: '#c5221f' },
};

const TYPE_LABELS = {
  annuel: 'Congé annuel',
  maladie: 'Maladie',
  exceptionnel: 'Congé exceptionnel',
};

const FILTRES = [
  { key: 'tous', label: 'Tous' },
  { key: 'en_attente', label: 'En attente', badge: true },
  { key: 'valide', label: 'Validés' },
  { key: 'refuse', label: 'Refusés' },
];

function nbJoursConge(debut, fin) {
  const t0 = new Date(debut).setHours(12, 0, 0, 0);
  const t1 = new Date(fin).setHours(12, 0, 0, 0);
  const diff = (t1 - t0) / 86400000;
  return Math.max(1, Math.floor(diff) + 1);
}

function formatPlageConge(debut, fin) {
  const d1 = new Date(debut);
  const d2 = new Date(fin);
  const j1 = d1.getDate();
  const j2 = d2.getDate();
  const m1 = d1.toLocaleDateString('fr-FR', { month: 'long' });
  const m2 = d2.toLocaleDateString('fr-FR', { month: 'long' });
  const y1 = d1.getFullYear();
  const y2 = d2.getFullYear();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (m1 === m2 && y1 === y2) return `${j1} au ${j2} ${cap(m1)} ${y1}`;
  return `${d1.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au ${d2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function formatDateCell(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div
      style={{
        width: '240px',
        minHeight: '100vh',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '2rem 1.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
            }}
          >
            🕐
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>PointageApp</span>
        </div>
      </div>
      <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '0.8rem',
            paddingLeft: '0.5rem',
          }}
        >
          Menu
        </p>
        {sidebarLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                marginBottom: '0.3rem',
                textDecoration: 'none',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.95rem',
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '0.7rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          🚪 Déconnexion
        </button>
      </div>
    </div>
  );
}

export default function GestionConges() {
  const [conges, setConges] = useState([]);
  const [filtre, setFiltre] = useState('tous');
  const [loading, setLoading] = useState(true);
  const userAdmin = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchConges();
  }, []);

  const fetchConges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/conges', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setConges(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch conges error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (id, nouveauStatut) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/conges/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      if (response.ok) {
        fetchConges();
      }
    } catch (err) {
      console.error('Update conge error:', err);
    }
  };

  const pendingCount = conges.filter((c) => c.statut === 'en_attente').length;
  const valideCount = conges.filter((c) => c.statut === 'valide').length;
  const refuseCount = conges.filter((c) => c.statut === 'refuse').length;
  const filtered = conges.filter((c) => filtre === 'tous' || c.statut === filtre);

  const pillInactive = {
    padding: '0.65rem 1.35rem',
    borderRadius: '999px',
    cursor: 'pointer',
    border: '2px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    fontWeight: 800,
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  };

  const pillActive = {
    ...pillInactive,
    border: '2px solid transparent',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
  };

  const statBoxes = [
    { label: 'Total demandes', val: conges.length, bg: '#eff6ff', border: '#3b82f6', color: '#1e40af' },
    { label: 'En attente', val: pendingCount, bg: '#fffbeb', border: '#f59e0b', color: '#b45309' },
    { label: 'Validés', val: valideCount, bg: '#ecfdf5', border: '#22c55e', color: '#15803d' },
    { label: 'Refusés', val: refuseCount, bg: '#fef2f2', border: '#ef4444', color: '#b91c1c' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 40%)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            background: 'white',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
              Gestion des congés
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f1f5f9',
                padding: '0.4rem 1rem',
                borderRadius: '20px',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                A
              </div>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{userAdmin.nom || 'Admin'}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 1.5rem 2.5rem', flex: 1 }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {statBoxes.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: s.bg,
                    borderRadius: '16px',
                    padding: '1.15rem 1.25rem',
                    border: `3px solid ${s.border}`,
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.label}
                  </p>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '2.25rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</p>
                </div>
              ))}
            </div>

            {!loading && conges.length > 0 ? (
              <div
                style={{
                  marginBottom: '1.75rem',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '3px solid #2563eb',
                  boxShadow: '0 8px 28px rgba(37, 99, 235, 0.15)',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                    padding: '0.85rem 1.25rem',
                  }}
                >
                  <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.02em' }}>
                    Tableau des demandes {filtre !== 'tous' ? '(filtré)' : ''}
                  </h2>
                </div>
                <div style={{ overflowX: 'auto', background: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                    <thead>
                      <tr style={{ background: '#e0e7ff' }}>
                        {['Employé', 'Type', 'Du', 'Au', 'Durée', 'Statut'].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '1rem 1.15rem',
                              textAlign: 'left',
                              fontSize: '0.95rem',
                              fontWeight: 900,
                              color: '#312e81',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              borderBottom: '2px solid #c7d2fe',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, idx) => {
                        const su = STATUT_UI[c.statut] || { label: c.statut, bg: '#f1f5f9', color: '#475569' };
                        const typeLib = TYPE_LABELS[c.type] || c.type;
                        const nj = nbJoursConge(c.date_debut, c.date_fin);
                        return (
                          <tr
                            key={c._id}
                            style={{
                              background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                            }}
                          >
                            <td style={{ padding: '1rem 1.15rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                              {c.user_id?.nom || '—'}
                            </td>
                            <td style={{ padding: '1rem 1.15rem', fontSize: '1.02rem', fontWeight: 700, color: '#4338ca' }}>{typeLib}</td>
                            <td style={{ padding: '1rem 1.15rem', fontSize: '1.02rem', fontWeight: 600, color: '#334155' }}>{formatDateCell(c.date_debut)}</td>
                            <td style={{ padding: '1rem 1.15rem', fontSize: '1.02rem', fontWeight: 600, color: '#334155' }}>{formatDateCell(c.date_fin)}</td>
                            <td style={{ padding: '1rem 1.15rem', fontSize: '1.05rem', fontWeight: 900, color: '#0369a1' }}>
                              {nj} j.
                            </td>
                            <td style={{ padding: '1rem 1.15rem' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  background: su.bg,
                                  color: su.color,
                                  padding: '6px 14px',
                                  borderRadius: '999px',
                                  fontSize: '0.92rem',
                                  fontWeight: 900,
                                }}
                              >
                                {su.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <p style={{ margin: '0 0 0.85rem', fontSize: '1.1rem', fontWeight: 900, color: '#1e3a8a' }}>Filtres</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.5rem' }}>
              {FILTRES.map((f) => {
                const active = filtre === f.key;
                const count = f.badge ? pendingCount : 0;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFiltre(f.key)}
                    style={active ? pillActive : pillInactive}
                  >
                    {f.label}
                    {f.badge && count > 0 ? (
                      <span
                        style={{
                          background: active ? 'rgba(255,255,255,0.35)' : '#fef08a',
                          color: active ? '#fff' : '#854d0e',
                          borderRadius: '999px',
                          minWidth: '22px',
                          height: '22px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          padding: '0 7px',
                        }}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: '0 0 0.85rem', fontSize: '1.1rem', fontWeight: 900, color: '#1e3a8a' }}>Actions rapides</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {loading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: '1.1rem' }}>
                  Chargement des demandes…
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    color: '#64748b',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    background: '#fff',
                    borderRadius: '16px',
                    border: '2px dashed #cbd5e1',
                  }}
                >
                  Aucune demande pour ce filtre
                </div>
              ) : (
                filtered.map((c) => {
                  const su = STATUT_UI[c.statut] || { label: c.statut, bg: '#f1f5f9', color: '#475569' };
                  const typeLib = TYPE_LABELS[c.type] || c.type;
                  const plage = formatPlageConge(c.date_debut, c.date_fin);
                  const nj = nbJoursConge(c.date_debut, c.date_fin);
                  const detail = `${typeLib} · ${plage} (${nj} jour${nj > 1 ? 's' : ''})`;

                  return (
                    <div
                      key={`card-${c._id}`}
                      style={{
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                        borderRadius: '18px',
                        padding: '1.35rem 1.4rem 1.4rem',
                        border: '2px solid #e0e7ff',
                        boxShadow: '0 6px 22px rgba(99, 102, 241, 0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.85rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.3 }}>
                          {c.user_id?.nom || 'Employé inconnu'}
                        </h2>
                        <span
                          style={{
                            flexShrink: 0,
                            background: su.bg,
                            color: su.color,
                            padding: '7px 16px',
                            borderRadius: '999px',
                            fontSize: '0.95rem',
                            fontWeight: 900,
                          }}
                        >
                          {su.label}
                        </span>
                      </div>
                      <p style={{ margin: '0.75rem 0 0', fontSize: '1.05rem', color: '#475569', fontWeight: 700, lineHeight: 1.5 }}>
                        {detail}
                      </p>
                      {c.statut === 'en_attente' ? (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                          <button
                            type="button"
                            onClick={() => updateStatut(c._id, 'valide')}
                            style={{
                              flex: 1,
                              padding: '0.9rem 1rem',
                              borderRadius: '14px',
                              border: '2px solid #22c55e',
                              background: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
                              color: '#166534',
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              cursor: 'pointer',
                            }}
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatut(c._id, 'refuse')}
                            style={{
                              flex: 1,
                              padding: '0.9rem 1rem',
                              borderRadius: '14px',
                              border: '2px solid #f87171',
                              background: 'linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)',
                              color: '#991b1b',
                              fontWeight: 900,
                              fontSize: '1.05rem',
                              cursor: 'pointer',
                            }}
                          >
                            Refuser
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
