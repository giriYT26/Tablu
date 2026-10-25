import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { RestaurantDetailPage } from './pages/RestaurantDetailPage';
import { BookingsPage } from './pages/BookingsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
