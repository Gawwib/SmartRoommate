import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDoorOpen, FaUserCircle } from 'react-icons/fa';
import API, { clearAuthToken } from '../services/api';
import { useRole } from '../context/RoleContext';

function HostModeControl({ variant = 'inline' }) {
  const { isHost, toggleMode, isTransitioning, pendingMode } = useRole();
  const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  const nextModeLabel = isHost ? 'tenant' : 'host';
  const displayLabel =
    pendingMode && isTransitioning ? `Switching to ${capitalize(pendingMode)} mode...` : `${capitalize(isHost ? 'host' : 'tenant')} mode`;

  return (
    <div
      className={`host-mode-control d-flex ${variant === 'stacked' ? 'flex-column align-items-stretch' : 'align-items-center'} gap-2`}
    >
      <span className={`mode-pill ${isHost ? 'mode-pill-host' : 'mode-pill-tenant'}`}>{displayLabel}</span>
      <button
        type="button"
        className={`btn host-switch-btn btn-sm ${variant === 'stacked' ? 'w-100' : ''}`}
        onClick={toggleMode}
        disabled={isTransitioning}
      >
        Switch to {nextModeLabel} mode
      </button>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { switchToTenant, isHost } = useRole();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let intervalId = null;
    const fetchUnread = async () => {
      if (!token) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await API.get('/conversations/unread-count');
        setUnreadCount(res.data?.count || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUnread();
    intervalId = setInterval(fetchUnread, 15000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    clearAuthToken();
    switchToTenant();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg smart-navbar shadow-sm">
      <div className="container">
        <div className="d-flex align-items-center gap-3">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <FaDoorOpen />
            <span>SmartRoommate</span>
          </Link>
          {token && (
            <div className="d-none d-lg-block">
              <HostModeControl />
            </div>
          )}
        </div>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/properties">
                {isHost ? 'My properties' : 'Properties'}
              </Link>
            </li>
            {token ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/roommates">
                    Roommates
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link nav-link-badge" to="/messages">
                    Messages
                    {unreadCount > 0 && <span className="nav-dot" aria-label="Unread messages"></span>}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link d-flex align-items-center gap-2" to="/profile">
                    <FaUserCircle />
                    Profile
                  </Link>
                </li>
                <li className="nav-item">
                  <button type="button" className="btn btn-primary btn-sm ms-lg-2" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-primary ms-lg-2" to="/register">
                    Join now
                  </Link>
                </li>
              </>
            )}
          </ul>
          {token && (
            <div className="d-lg-none mt-4 pt-3 border-top">
              <HostModeControl variant="stacked" />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
