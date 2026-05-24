import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const sidebarLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/employes', label: 'Employés', icon: '👥' },
  { path: '/admin/conges', label: 'Congés', icon: '📅' },
  { path: '/admin/rapport', label: 'Rapports', icon: '📋' },
];

const moisLabel = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const STATUT_FILTRE = [
  { key: 'tous', label: 'Tous les statuts' },
  { key: 'present', label: 'Présent' },
  { key: 'partiel', label: 'Partiel / retard' },
  { key: 'absent', label: 'Absent' },
];

function isEntree(t) { return t === 'entree' || t === 'entrée'; }
function heureToMinutes(h) {
  if (!h || typeof h !== 'string') return null;
  const p = h.trim().slice(0, 5).split(':');
  const hh = Number(p[0]), mm = Number(p[1] ?? 0);
  if (Number.isNaN(hh)) return null;
  return hh * 60 + (Number.isNaN(mm) ? 0 : mm);
}
function minutesToDuree(m) {
  if (m == null || m < 0) return '0h';
  return `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, '0')}`;
}
function minHeure(a, b) { if (!a) return b; if (!b) return a; return a < b ? a : b; }
function maxHeure(a, b) { if (!a) return b; if (!b) return a; return a > b ? a : b; }
function dateInMonth(dateStr, month0, year) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parts = dateStr.split('-');
  if (parts.length < 3) return false;
  return Number(parts[0]) === year && Number(parts[1]) === month0 + 1;
}
function formatDateFr(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
function isWeekday(y, month0, day) {
  const w = new Date(y, month0, day).getDay();
  return w >= 1 && w <= 5;
}
function daysInMonth(year, month0) { return new Date(year, month0 + 1, 0).getDate(); }
function ymd(y, month0, day) {
  return `${y}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildRapportRows(pointages, month0, year) {
  const empsMap = new Map();
  for (const p of pointages) {
    const uid = p.user_id?._id?.toString() || p.user_id?.toString();
    if (!uid) continue;
    if (!empsMap.has(uid)) empsMap.set(uid, { id: uid, nom: p.user_id?.nom || '—' });
  }
  const empIds = [...empsMap.values()].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
  if (empIds.length === 0) return [];

  const byKey = new Map();
  for (const p of pointages) {
    const uid = p.user_id?._id?.toString() || p.user_id?.toString();
    if (!uid || !dateInMonth(p.date, month0, year)) continue;
    const key = `${uid}|${p.date}`;
    if (!byKey.has(key)) byKey.set(key, { userId: uid, nom: p.user_id?.nom || '—', date: p.date, entrees: [], sorties: [] });
    const g = byKey.get(key);
    if (isEntree(p.type)) g.entrees.push(p.heure);
    else if (p.type === 'sortie') g.sorties.push(p.heure);
  }

  const rows = [];
  const last = daysInMonth(year, month0);
  for (const emp of empIds) {
    for (let day = 1; day <= last; day++) {
      if (!isWeekday(year, month0, day)) continue;
      const dateStr = ymd(year, month0, day);
      const key = `${emp.id}|${dateStr}`;
      if (byKey.has(key)) {
        const g = byKey.get(key);
        const entreeH = g.entrees.length ? g.entrees.reduce((a, b) => minHeure(a, b)) : null;
        const sortieH = g.sorties.length ? g.sorties.reduce((a, b) => maxHeure(a, b)) : null;
        let statut = 'present', dureeMins = null;
        if (entreeH && sortieH) {
          dureeMins = heureToMinutes(sortieH) - heureToMinutes(entreeH);
          if (dureeMins < 0) dureeMins = null;
        }
        if (!entreeH && !sortieH) statut = 'absent';
        else if (!entreeH || !sortieH) statut = 'partiel';
        else {
          const late = heureToMinutes(entreeH) > 9 * 60 + 15;
          const short = dureeMins != null && dureeMins < 7 * 60 + 30;
          if (late || short) statut = 'partiel';
        }
        rows.push({ id: key, nom: g.nom, date: dateStr, entree: entreeH, sortie: sortieH, dureeMins, statut });
      } else {
        rows.push({ id: `${emp.id}|${dateStr}|abs`, nom: emp.nom, date: dateStr, entree: null, sortie: null, dureeMins: 0, statut: 'absent' });
      }
    }
  }
  rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (a.nom || '').localeCompare(b.nom || '', 'fr');
  });
  return rows;
}

function rowStyle(statut) {
  if (statut === 'absent') return { background: '#fef2f2' };
  if (statut === 'partiel') return { background: '#fffbeb' };
  return { background: '#ffffff' };
}
function cellColor(statut, column) {
  if (statut === 'absent' && ['entree', 'sortie', 'duree'].includes(column)) return '#dc2626';
  if (statut === 'partiel' && ['entree', 'sortie', 'duree'].includes(column)) return '#d97706';
  if (column === 'duree') return '#15803d';
  return '#0f172a';
}

export default function Rapport() {
  const [rawPointages, setRawPointages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMois, setSelectedMois] = useState(new Date().getMonth());
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [filtStatut, setFiltStatut] = useState('tous');
  const userAdmin = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/pointages', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await response.text();
        const data = text && text.trim() !== '' ? JSON.parse(text) : [];
        if (response.ok) setRawPointages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Report error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const moisAnneeOptions = useMemo(() => {
    const out = [];
    for (let y = 2024; y <= 2028; y++) {
      for (let m = 0; m < 12; m++) {
        out.push({ y, m, label: `${moisLabel[m]} ${y}`, value: `${y}_${m}` });
      }
    }
    return out;
  }, []);

  const baseRows = useMemo(() => buildRapportRows(rawPointages, selectedMois, selectedAnnee), [rawPointages, selectedMois, selectedAnnee]);
  const filteredRows = useMemo(() => filtStatut === 'tous' ? baseRows : baseRows.filter(r => r.statut === filtStatut), [baseRows, filtStatut]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleExportPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF();

        // En-tête
        doc.setFillColor(29, 78, 216);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('PointageApp', 14, 15);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rapport de Pointage — ${moisLabel[selectedMois]} ${selectedAnnee}`, 14, 25);

        // Info export
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 42);
        doc.text(`Filtre : ${STATUT_FILTRE.find(s => s.key === filtStatut)?.label || 'Tous'}`, 14, 48);

        // Tableau
        const rows = filteredRows.map(r => {
          const dur = r.statut === 'absent' ? '0h' : r.dureeMins != null ? minutesToDuree(r.dureeMins) : '—';
          const st = r.statut === 'present' ? 'Présent' : r.statut === 'partiel' ? 'Partiel' : 'Absent';
          return [r.nom, formatDateFr(r.date), r.entree || '—', r.sortie || '—', dur, st];
        });

        doc.autoTable({
          startY: 55,
          head: [['Employé', 'Date', 'Entrée', 'Sortie', 'Durée', 'Statut']],
          body: rows,
          headStyles: {
            fillColor: [29, 78, 216],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center',
          },
          bodyStyles: { fontSize: 9, halign: 'center' },
          columnStyles: { 0: { halign: 'left' } },
          alternateRowStyles: { fillColor: [239, 246, 255] },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const statut = filteredRows[data.row.index]?.statut;
              if (statut === 'absent') {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fillColor = [254, 242, 242];
              } else if (statut === 'partiel') {
                data.cell.styles.textColor = [217, 119, 6];
                data.cell.styles.fillColor = [255, 251, 235];
              } else if (data.column.index === 4) {
                data.cell.styles.textColor = [21, 128, 61];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
          margin: { left: 14, right: 14 },
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${i} / ${pageCount}`, 105, 290, { align: 'center' });
        }

        doc.save(`rapport_${moisLabel[selectedMois]}_${selectedAnnee}.pdf`);
      });
    });
  };

  const selectBase = {
    padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0',
    background: '#ffffff', fontSize: '0.95rem', fontWeight: 600,
    color: '#0f172a', minWidth: '160px', cursor: 'pointer', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f1f5f9' }}>

      {/* Sidebar */}
      <div style={{ width: '240px', background: 'linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
              display: 'flex', alignItems: 'center', gap: '0.8rem',
              padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '0.3rem',
              textDecoration: 'none',
              background: location.pathname === link.path ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: location.pathname === link.path ? 'white' : 'rgba(255,255,255,0.7)',
              fontWeight: location.pathname === link.path ? 600 : 400,
              borderLeft: location.pathname === link.path ? '3px solid white' : '3px solid transparent',
            }}>
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={handleLogout} style={{
            width: '100%', background: 'rgba(255,165,0,0.15)', color: '#fbbf24',
            border: '1px solid rgba(251,191,36,0.3)', padding: '0.7rem',
            borderRadius: '10px', cursor: 'pointer', fontWeight: 600,
          }}>🚪 Déconnexion</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Rapport pointages</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem 1rem', borderRadius: '20px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>A</div>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{userAdmin.nom || 'Admin'}</span>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem 2rem', flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <select
              value={`${selectedAnnee}_${selectedMois}`}
              onChange={e => { const [y, m] = e.target.value.split('_').map(Number); setSelectedAnnee(y); setSelectedMois(m); }}
              style={{ ...selectBase, minWidth: '200px' }}
            >
              {moisAnneeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={filtStatut}
              onChange={e => setFiltStatut(e.target.value)}
              style={{ ...selectBase, minWidth: '200px', border: filtStatut !== 'tous' ? '2px solid #1d4ed8' : selectBase.border }}
            >
              {STATUT_FILTRE.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', border: '3px solid #1d4ed8', boxShadow: '0 8px 28px rgba(29,78,216,0.22)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%)' }}>
                    {['Employé', 'Date', 'Entrée', 'Sortie', 'Durée'].map(h => (
                      <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.95rem', fontWeight: 900, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #93c5fd' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: '2.75rem', textAlign: 'center', color: '#334155', fontWeight: 800 }}>Chargement…</td></tr>
                  ) : rawPointages.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '2.75rem', textAlign: 'center', color: '#334155', fontWeight: 800 }}>Aucun pointage en base — impossible de construire le rapport.</td></tr>
                  ) : filteredRows.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '2.75rem', textAlign: 'center', color: '#334155', fontWeight: 800 }}>Aucune ligne pour ce filtre.</td></tr>
                  ) : (
                    filteredRows.map(r => {
                      const rs = rowStyle(r.statut);
                      const durStr = r.statut === 'absent' ? '0h' : r.dureeMins != null ? minutesToDuree(r.dureeMins) : '—';
                      const tdBase = { padding: '1rem 1.25rem', fontSize: '1.05rem', fontWeight: 800 };
                      return (
                        <tr key={r.id} style={{ ...rs, borderTop: '1px solid #bfdbfe' }}>
                          <td style={{ ...tdBase, color: '#0f172a' }}>{r.nom}</td>
                          <td style={{ ...tdBase, color: '#0f172a' }}>{formatDateFr(r.date)}</td>
                          <td style={{ ...tdBase, fontFamily: 'monospace', color: cellColor(r.statut, 'entree') }}>{r.entree || '—'}</td>
                          <td style={{ ...tdBase, fontFamily: 'monospace', color: cellColor(r.statut, 'sortie') }}>{r.sortie || '—'}</td>
                          <td style={{ ...tdBase, fontFamily: 'monospace', fontWeight: 900, color: cellColor(r.statut, 'duree') }}>{durStr}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bouton Export PDF uniquement */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={loading || filteredRows.length === 0}
              style={{
                padding: '1rem 2.35rem', borderRadius: '14px', border: 'none',
                minWidth: '280px',
                background: loading || filteredRows.length === 0
                  ? '#93c5fd'
                  : 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff', fontWeight: 900, fontSize: '1.12rem',
                cursor: loading || filteredRows.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || filteredRows.length === 0 ? 0.7 : 1,
                boxShadow: '0 8px 24px rgba(29,78,216,0.45)',
              }}
            >
              📄 Exporter PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}