import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const sidebarLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/employes', label: 'Employés', icon: '👥' },
  { path: '/admin/conges', label: 'Congés', icon: '📅' },
  { path: '/admin/rapport', label: 'Rapports', icon: '📋' },
];

const REFRESH_MS = 45_000;

/** Cadre coloré + ombre assortie (hex #RRGGBB) */
function cardFrame(accentHex) {
  return {
    borderRadius: '16px',
    border: `2px solid ${accentHex}`,
    background: `linear-gradient(155deg, #ffffff 0%, ${accentHex}0d 48%, #ffffff 100%)`,
    boxShadow: `0 8px 28px ${accentHex}22, 0 2px 8px rgba(15, 23, 42, 0.07)`,
  };
}

const statutBadge = {
  entree: { bg: '#dcfce7', color: '#16a34a' },
  entrée: { bg: '#dcfce7', color: '#16a34a' },
  sortie: { bg: '#fee2e2', color: '#dc2626' },
  retard: { bg: '#fef9c3', color: '#a16207' },
};

function isEntree(type) {
  return type === 'entree' || type === 'entrée';
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function lastNDaysIso(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
}

function formatShortDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

function heureToSort(h) {
  if (!h || typeof h !== 'string') return 0;
  const [hh, mm] = h.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

function aggregateWeek(pointages, dayKeys) {
  const byDay = Object.fromEntries(dayKeys.map((k) => [k, { entrees: 0, sorties: 0 }]));
  pointages.forEach((p) => {
    if (!byDay[p.date]) return;
    if (isEntree(p.type)) byDay[p.date].entrees += 1;
    else if (p.type === 'sortie') byDay[p.date].sorties += 1;
  });
  return dayKeys.map((date) => ({
    date,
    label: formatShortDate(date),
    entrees: byDay[date].entrees,
    sorties: byDay[date].sorties,
  }));
}

function DonutChart({ value, max, color, label }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const r = 54;
  const strokeW = 14;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(circ, (pct / 100) * circ);
  const showArc = pct > 0 && dash > 1;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0.5rem 0',
      }}
    >
      <svg width="156" height="156" viewBox="0 0 156 156" aria-hidden>
        {/* Anneau de fond lisible sur carte claire */}
        <circle cx="78" cy="78" r={r} fill="none" stroke="#94a3b8" strokeWidth={strokeW} opacity={0.55} />
        {showArc ? (
          <circle
            cx="78"
            cy="78"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 78 78)"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.35))' }}
          />
        ) : null}
        <text x="78" y="74" textAnchor="middle" fontSize="26" fontWeight="900" fill="#0f172a" style={{ fontFamily: 'inherit' }}>
          {value}
        </text>
        <text x="78" y="94" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e3a8a" style={{ fontFamily: 'inherit' }}>
          {label}
        </text>
        <text x="78" y="112" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569" style={{ fontFamily: 'inherit' }}>
          {pct}% sur {max}
        </text>
      </svg>
    </div>
  );
}

function StatBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
          <span style={{ color }}>{value}</span>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}> / {max}</span>
        </span>
      </div>
      <div style={{ height: 10, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub, icon, accent }) {
  return (
    <div
      style={{
        ...cardFrame(accent),
        padding: '1.3rem 1.4rem',
        flex: '1',
        minWidth: '150px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: '#0f172a',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.35,
            }}
          >
            {title}
          </p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '1.65rem', fontWeight: 900, color: '#020617', letterSpacing: '-0.02em' }}>
            {value}
          </p>
          {sub ? (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#334155', fontWeight: 700, lineHeight: 1.4 }}>
              {sub}
            </p>
          ) : null}
        </div>
        <span
          style={{
            fontSize: '1.55rem',
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
          }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function WeeklyBarChart({ series }) {
  const [hover, setHover] = useState(null);
  const innerH = 128;
  const barW = 17;
  const gap = 11;
  const labelH = 26;
  const h = innerH + labelH;
  const padX = 16;

  const vals = series.flatMap((d) => [d.entrees, d.sorties]);
  const maxData = vals.length ? Math.max(0, ...vals) : 0;
  const hasData = maxData > 0;
  const maxVal = Math.max(maxData, 1);

  const w = Math.max(300, series.length * (barW * 2 + gap + 4) + padX * 2);

  const barHeights = (d) => {
    if (!hasData) {
      return {
        he: Math.round(innerH * 0.22),
        hs: Math.round(innerH * 0.18),
        placeholder: true,
      };
    }
    const rawE = (d.entrees / maxVal) * innerH;
    const rawS = (d.sorties / maxVal) * innerH;
    return {
      he: d.entrees > 0 ? Math.max(12, rawE) : 0,
      hs: d.sorties > 0 ? Math.max(12, rawS) : 0,
      placeholder: false,
    };
  };

  return (
    <div style={{ position: 'relative' }}>
      {!hasData ? (
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>
          Aucune activité sur 7 jours — barres grises indicatives
        </p>
      ) : null}
      <svg
        width="100%"
        height={h + 8}
        viewBox={`0 0 ${w} ${h + 8}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: '100%', display: 'block' }}
      >
        <line
          x1={padX - 4}
          y1={innerH}
          x2={w - padX + 4}
          y2={innerH}
          stroke="#475569"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {series.map((d, i) => {
          const x0 = padX + i * (barW * 2 + gap);
          const { he, hs, placeholder } = barHeights(d);
          const fillE = placeholder ? '#94a3b8' : '#10b981';
          const fillS = placeholder ? '#64748b' : '#2563eb';
          const op = placeholder ? 0.55 : 1;
          return (
            <g key={d.date}>
              <rect
                x={x0}
                y={innerH - he}
                width={barW}
                height={Math.max(he, 0)}
                rx={5}
                fill={fillE}
                opacity={op}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() =>
                  setHover({ x: x0 + barW, label: d.label, entrees: d.entrees, sorties: d.sorties, placeholder })
                }
                onMouseLeave={() => setHover(null)}
              />
              <rect
                x={x0 + barW + 5}
                y={innerH - hs}
                width={barW}
                height={Math.max(hs, 0)}
                rx={5}
                fill={fillS}
                opacity={op}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() =>
                  setHover({ x: x0 + barW, label: d.label, entrees: d.entrees, sorties: d.sorties, placeholder })
                }
                onMouseLeave={() => setHover(null)}
              />
              <text x={x0 + barW + 2.5} y={h + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#1e293b">
                {d.label.replace(/\.$/, '')}
              </text>
            </g>
          );
        })}
      </svg>
      {hover ? (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(hover.x - 56, 0), w - 130),
            top: 4,
            background: '#fef08a',
            color: '#713f12',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: '0.8rem',
            fontWeight: 800,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {hover.placeholder ? `${hover.label} — pas de données` : `${hover.label} — Entrées ${hover.entrees} · Sorties ${hover.sorties}`}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem', fontSize: '0.8rem', color: '#1e293b', fontWeight: 800 }}>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: '#34d399',
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
          Entrées
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: '#2563eb',
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
          Sorties
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [allPointages, setAllPointages] = useState([]);
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const weekKeys = useMemo(() => lastNDaysIso(7), []);
  const today = todayIso();

  const pointagesToday = useMemo(
    () => allPointages.filter((p) => p.date === today),
    [allPointages, today]
  );

  const pointagesWeek = useMemo(
    () => allPointages.filter((p) => weekKeys.includes(p.date)),
    [allPointages, weekKeys]
  );

  const weekSeries = useMemo(() => aggregateWeek(pointagesWeek, weekKeys), [pointagesWeek, weekKeys]);

  const uniqueEmployeIds = useMemo(() => {
    const ids = new Set();
    allPointages.forEach((p) => {
      if (p.user_id?._id) ids.add(String(p.user_id._id));
    });
    return ids;
  }, [allPointages]);

  const totalEmployesRef = Math.max(uniqueEmployeIds.size, 1);

  const presents = useMemo(() => {
    return new Set(pointagesToday.filter((p) => isEntree(p.type)).map((p) => p.user_id?._id).filter(Boolean))
      .size;
  }, [pointagesToday]);

  const tauxPresence = totalEmployesRef > 0 ? Math.round((presents / totalEmployesRef) * 100) : 0;
  const absenceEst = Math.max(0, totalEmployesRef - presents);
  const todayEntrees = pointagesToday.filter((p) => isEntree(p.type)).length;
  const todaySorties = pointagesToday.filter((p) => p.type === 'sortie').length;
  const pendingConges = conges.filter((c) => c.statut === 'en_attente').length;
  const validesConges = conges.filter((c) => c.statut === 'valide').length;
  const weekTotal = pointagesWeek.length;

  const sortedToday = useMemo(
    () => [...pointagesToday].sort((a, b) => heureToSort(b.heure) - heureToSort(a.heure)),
    [pointagesToday]
  );

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [ptRes, cgRes] = await Promise.all([api.get('/pointages'), api.get('/conges')]);
      setAllPointages(Array.isArray(ptRes.data) ? ptRes.data : []);
      setConges(Array.isArray(cgRes.data) ? cgRes.data : []);
      setLastSync(new Date());
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Impossible de charger les données. Vérifiez le serveur et le token.');
      setAllPointages([]);
      setConges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 35%, #f1f5f9 100%)' }}>
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
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>PointageApp</span>
          </div>
        </div>

        <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
              fontWeight: 800,
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
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.95rem',
                  borderLeft: isActive ? '3px solid white' : '3px solid transparent',
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
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'rgba(255,165,0,0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.3)',
              padding: '0.7rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            background: 'linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
            borderBottom: '2px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
              Tableau de bord
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              disabled={loading}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              Actualiser
            </button>
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
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{user.nom || 'Admin'}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
          {error ? (
            <div
              style={{
                background: '#fef2f2',
                color: '#b91c1c',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: '2px solid #fecaca',
              }}
            >
              {error}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <KpiCard
              title="Présents aujourd'hui"
              value={loading && !lastSync ? '…' : presents}
              sub={`${tauxPresence}%`}
              icon="✓"
              accent="#16a34a"
            />
            <KpiCard
              title="Absents"
              value={loading && !lastSync ? '…' : absenceEst}
              sub={`Entrées / sorties : ${todayEntrees} / ${todaySorties}`}
              icon="○"
              accent="#94a3b8"
            />
            <KpiCard
              title="Congés en attente"
              value={loading && !lastSync ? '…' : pendingConges}
              sub={`${validesConges} validé(s) au total`}
              icon="📅"
              accent="#d97706"
            />
            <KpiCard
              title="Pointages 7 jours"
              value={loading && !lastSync ? '…' : weekTotal}
              sub="Sur la fenêtre affichée"
              icon="📈"
              accent="#7c3aed"
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div
              style={{
                ...cardFrame('#2563eb'),
                padding: '1.5rem',
                flex: '1',
                minWidth: '220px',
              }}
            >
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.02em' }}>
                Taux de présence
              </h3>
              <DonutChart value={presents} max={totalEmployesRef} color="#2563eb" label="Présents" />
            </div>

            <div
              style={{
                ...cardFrame('#16a34a'),
                padding: '1.5rem',
                flex: '2',
                minWidth: '280px',
              }}
            >
              <h3 style={{ margin: '0 0 1.2rem', fontSize: '1.05rem', fontWeight: 900, color: '#14532d', letterSpacing: '-0.02em' }}>
                Aujourd'hui
              </h3>
              <StatBar label="Employés présents" value={presents} max={totalEmployesRef} color="#16a34a" />
              <StatBar
                label="Pointages enregistrés"
                value={pointagesToday.length}
                max={Math.max(totalEmployesRef * 2, 1)}
                color="#2563eb"
              />
            </div>

            <div
              style={{
                ...cardFrame('#6366f1'),
                padding: '1.5rem',
                flex: '2',
                minWidth: '300px',
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 900, color: '#312e81', letterSpacing: '-0.02em' }}>
                Activité sur 7 jours
              </h3>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: '#4338ca', fontWeight: 700 }}>
                Entrées et sorties par jour
              </p>
              {loading && !lastSync ? (
                <p style={{ color: '#475569', fontWeight: 700 }}>Chargement…</p>
              ) : (
                <WeeklyBarChart series={weekSeries} />
              )}
            </div>
          </div>

          <div style={{ ...cardFrame('#0ea5e9'), overflow: 'hidden', padding: 0 }}>
            <div
              style={{
                padding: '1.2rem 1.5rem',
                borderBottom: '2px solid #bae6fd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0c4a6e', letterSpacing: '-0.02em' }}>
                Pointages du jour
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 800 }}>Tri par heure (récent en premier)</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%)' }}>
                  {['Employé', 'Heure', 'Type', 'Statut'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.75rem 1.2rem',
                        textAlign: 'left',
                        fontSize: '0.8rem',
                        color: '#0f172a',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !lastSync ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                      Chargement...
                    </td>
                  </tr>
                ) : sortedToday.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                      Aucun pointage aujourd'hui
                    </td>
                  </tr>
                ) : (
                  sortedToday.map((p, i) => {
                    const badge = statutBadge[p.type] || statutBadge.entree;
                    return (
                      <tr key={p._id || i} style={{ borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.9rem 1.2rem', fontWeight: 800, color: '#0f172a' }}>{p.user_id?.nom || 'Inconnu'}</td>
                        <td style={{ padding: '0.9rem 1.2rem', fontFamily: 'monospace', fontWeight: 800, color: '#1e293b' }}>{p.heure}</td>
                        <td style={{ padding: '0.9rem 1.2rem', textTransform: 'capitalize', fontWeight: 700, color: '#334155' }}>
                          {isEntree(p.type) ? 'entrée' : p.type}
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem' }}>
                          <span
                            style={{
                              ...badge,
                              padding: '4px 14px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                            }}
                          >
                            {isEntree(p.type) ? 'Présent' : 'Parti'}
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
    </div>
  );
}
