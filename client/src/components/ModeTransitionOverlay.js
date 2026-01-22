import React from 'react';
import { useRole } from '../context/RoleContext';

export default function ModeTransitionOverlay() {
  const { isTransitioning, pendingMode } = useRole();

  if (!isTransitioning || !pendingMode) return null;

  const label = pendingMode.charAt(0).toUpperCase() + pendingMode.slice(1);

  return (
    <div className="mode-transition-overlay" role="alert" aria-live="assertive">
      <div className="mode-transition-box text-center">
        <div className="spinner-border text-primary" role="status" aria-hidden="true"></div>
        <p className="mt-3 mb-0 fw-semibold">Switching to {label} mode...</p>
        <small className="text-muted">Hang tight, we'll have your dashboard ready in a moment.</small>
      </div>
    </div>
  );
}
