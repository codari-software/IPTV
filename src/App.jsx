import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveTV from './pages/LiveTV';
import Movies from './pages/Movies';
import Series from './pages/Series';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function App() {
  const PrivateRoute = ({ children }) => {
    const { currentUser } = useAuth();
    // While loading auth state, you might want to show a spinner, 
    // but typically we can just assume if currentUser is null after initial load, they are logged out.
    // The AuthProvider handles the initial loading state (rendering nothing until auth is checked).
    return currentUser ? children : <Navigate to="/login" />;
  };

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;
