import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveTV from './pages/LiveTV';
import Movies from './pages/Movies';
import Series from './pages/Series';

function App() {
  const PrivateRoute = ({ children }) => {
    const isAuthenticated = !!localStorage.getItem('iptv_credentials');
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/live" element={<PrivateRoute><LiveTV /></PrivateRoute>} />
        <Route path="/movies" element={<PrivateRoute><Movies /></PrivateRoute>} />
        <Route path="/series" element={<PrivateRoute><Series /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
