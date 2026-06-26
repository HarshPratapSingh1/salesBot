import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import NewProduct from './pages/NewProduct';
import ProductDetail from './pages/ProductDetail';
import Calls from './pages/Calls';
import Embed from './pages/Embed';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/products/new" element={<PrivateRoute><NewProduct /></PrivateRoute>} />
        <Route path="/products/:id" element={<PrivateRoute><ProductDetail /></PrivateRoute>} />
        <Route path="/calls" element={<PrivateRoute><Calls /></PrivateRoute>} />
        <Route path="/embed/:id" element={<PrivateRoute><Embed /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}