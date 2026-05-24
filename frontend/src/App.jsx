import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Pointage from './pages/employe/Pointage';
import ScannerQR from './pages/employe/ScannerQR';
import DemandeConge from './pages/employe/DemandeConge';

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Routes employé */}
          <Route path="/employe/pointage" element={<PrivateRoute role="employe"><Pointage /></PrivateRoute>} />
          <Route path="/employe/scanner" element={<PrivateRoute role="employe"><ScannerQR /></PrivateRoute>} />
          <Route path="/employe/conge" element={<PrivateRoute role="employe"><DemandeConge /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;