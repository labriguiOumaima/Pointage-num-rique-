import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../services/api';

export default function ScannerQR() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    }, false);

    scanner.render(async (decodedText) => {
      scanner.clear();
      try {
        const data = JSON.parse(decodedText);
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await api.post('/pointages', {
            type: data.type || 'entree',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            valide: true
          });
          setMessage('Pointage via QR enregistré ✅');
          setTimeout(() => navigate('/employe/pointage'), 2000);
        }, () => {
          setMessage('Géolocalisation refusée ❌');
        });
      } catch {
        setMessage('QR Code invalide ❌');
      }
    }, (err) => {
      console.warn(err);
    });

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1.5rem', textAlign: 'center' }}>
      <h2>Scanner QR Code</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>Pointez votre caméra vers le QR code</p>

      <div id="reader" style={{ marginBottom: '1rem' }} />

      {message && (
        <div style={{ padding: '0.75rem', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <button
        onClick={() => navigate('/employe/pointage')}
        style={{ padding: '0.75rem 1.5rem', background: '#666', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        ← Retour
      </button>
    </div>
  );
}