import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Properties from './components/Properties';
import PropertyDetails from './components/PropertyDetails';
import PropertyFormPage from './components/PropertyFormPage';
import Roommates from './components/Roommates';
import Messages from './components/Messages';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { RoleProvider } from './context/RoleContext';
import ModeTransitionOverlay from './components/ModeTransitionOverlay';

function App() {
  return (
    <RoleProvider>
      <ModeTransitionOverlay />
      <Router>
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/new" element={<PropertyFormPage />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
            <Route path="/properties/:id/edit" element={<PropertyFormPage />} />
            <Route path="/roommates" element={<Roommates />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </Router>
    </RoleProvider>
  );
}

export default App;
