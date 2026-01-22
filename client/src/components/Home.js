import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCompass, FaSearch } from 'react-icons/fa';
import LandingImage from '../assets/images/landing.jpg';

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const handleSearch = (event) => {
    if (event) {
      event.preventDefault();
    }
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (minBudget.trim()) params.set('min', minBudget.trim());
    if (maxBudget.trim()) params.set('max', maxBudget.trim());
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="home-page">
      <section className="home-search">
        <form className="home-search-bar" onSubmit={handleSearch}>
          <label className="search-pill search-pill-input">
            <FaSearch />
            <input
              type="text"
              placeholder="City"
              aria-label="Search location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="search-pill search-pill-number">
            Min (BAM)
            <input
              type="number"
              min="0"
              placeholder="0"
              aria-label="Minimum budget"
              value={minBudget}
              onChange={(event) => setMinBudget(event.target.value)}
            />
          </label>
          <label className="search-pill search-pill-number">
            Max (BAM)
            <input
              type="number"
              min="0"
              placeholder="1500"
              aria-label="Maximum budget"
              value={maxBudget}
              onChange={(event) => setMaxBudget(event.target.value)}
            />
          </label>
          <button type="submit" className="search-submit">
            Search
          </button>
        </form>
      </section>
      <section className="airbnb-hero">
        <div className="hero-copy">
          <p className="eyebrow text-uppercase fw-semibold mb-3">Smart roommate matching</p>
          <h1 className="display-4 fw-bold mb-3">Find your people. Find your place.</h1>
          <p className="lead hero-subtext">
            Explore rooms and shared flats with verified hosts, clear pricing, and a vibe-first matching experience.
          </p>
          <div className="d-flex flex-wrap gap-3 mt-4">
            <Link to="/properties" className="btn btn-primary btn-lg">
              Browse rooms
            </Link>
            <Link to="/register" className="btn btn-outline-primary btn-lg">
              Become a host
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-frame">
            <img src={LandingImage} alt="Roommates relaxing" />
          </div>
          <div className="hero-card hero-card-left">
            <div className="hero-card-icon">
              <FaCompass />
            </div>
            <div>
              <p className="mb-1 fw-semibold">Emily</p>
              <span className="hero-card-meta">Today · 3 roommates</span>
            </div>
          </div>
          <div className="hero-card hero-card-right">
            <div className="hero-card-avatar">F</div>
            <div>
              <p className="mb-1 fw-semibold">Francesco, 28</p>
              <span className="hero-card-meta">Freelance designer</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
