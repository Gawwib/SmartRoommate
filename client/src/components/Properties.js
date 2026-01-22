import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaBed, FaCoins, FaImages, FaMapMarkerAlt, FaPen, FaTrash, FaRegEye } from 'react-icons/fa';
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import API from '../services/api';
import { useRole } from '../context/RoleContext';
import { DEFAULT_PROPERTY_IMAGE } from '../constants/propertyMedia';
import '../utils/leafletIcons';

const priceFormatter = new Intl.NumberFormat('bs-BA', {
  style: 'currency',
  currency: 'BAM',
  maximumFractionDigits: 0
});

const formatPrice = (value) => priceFormatter.format(Number(value) || 0);
const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseBudget = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const emptyFilters = {
  min: '',
  max: '',
  roomsMin: '',
  roomsMax: '',
  cities: [],
  searchCity: ''
};

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ ...emptyFilters, cities: [], searchCity: '' });
  const [draftFilters, setDraftFilters] = useState({ ...emptyFilters, cities: [], searchCity: '' });
  const [mapOpen, setMapOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [mapError, setMapError] = useState('');
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token);
  const { isHost, isTransitioning, pendingMode } = useRole();
  const canManageListings = isAuthenticated && isHost;

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const res = await API.get('/properties');
        setProperties(res.data);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Unable to load properties right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setCurrentUser(null);
        return;
      }

      try {
        const res = await API.get('/users/me');
        setCurrentUser(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          setCurrentUser(null);
        } else {
          console.error(err);
        }
      }
    };

    loadUser();
  }, [token]);

  const handleDelete = async (propertyId) => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!window.confirm('Delete this property?')) return;

    try {
      await API.delete(`/properties/${propertyId}`);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to delete property.');
    }
  };

  const ownedByCurrentUser = useCallback(
    (property) => currentUser && property.user_id === currentUser.id,
    [currentUser]
  );

  const visibleProperties = useMemo(() => {
    if (isHost) {
      if (!currentUser) return [];
      return properties.filter((property) => ownedByCurrentUser(property));
    }
    return properties;
  }, [isHost, currentUser, properties, ownedByCurrentUser]);

  const cityOptions = useMemo(() => {
    const unique = new Map();
    visibleProperties.forEach((property) => {
      const locationLabel = String(property.location || '').trim();
      if (!locationLabel) return;
      const key = normalizeText(locationLabel);
      if (!unique.has(key)) {
        unique.set(key, locationLabel);
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [visibleProperties]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const min = params.get('min') || '';
    const max = params.get('max') || '';
    const roomsMin = params.get('rooms_min') || '';
    const roomsMax = params.get('rooms_max') || '';
    const searchCity = (params.get('search') || '').trim();
    const citiesParam = params.get('cities') || '';
    let cities = citiesParam
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!cities.length && searchCity) {
      const normalizedQuery = normalizeText(searchCity);
      cities = cityOptions.filter((city) => normalizeText(city).includes(normalizedQuery));
    }

    const nextFilters = {
      min,
      max,
      roomsMin,
      roomsMax,
      cities,
      searchCity
    };

    setFilters(nextFilters);
    setDraftFilters(nextFilters);
    setFilterOpen(false);
  }, [location.search, cityOptions]);

  const hasActiveFilters = Boolean(
    filters.min || filters.max || filters.roomsMin || filters.roomsMax || filters.cities.length || filters.searchCity
  );

  const filteredProperties = useMemo(() => {
    const min = parseBudget(filters.min);
    const max = parseBudget(filters.max);
    const roomsMin = filters.roomsMin ? parseInt(filters.roomsMin, 10) : null;
    const roomsMax = filters.roomsMax ? parseInt(filters.roomsMax, 10) : null;
    const selectedCities = filters.cities.map(normalizeText);
    const cityQuery = normalizeText(filters.searchCity || '');

    return visibleProperties.filter((property) => {
      const priceValue = parseBudget(property.price);
      const matchesMin = min === null || (priceValue !== null && priceValue >= min);
      const matchesMax = max === null || (priceValue !== null && priceValue <= max);
      const roomsValue = property.rooms ?? null;
      const matchesRoomsMin =
        roomsMin === null || (Number.isInteger(roomsValue) && Number.isInteger(roomsMin) && roomsValue >= roomsMin);
      const matchesRoomsMax =
        roomsMax === null || (Number.isInteger(roomsValue) && Number.isInteger(roomsMax) && roomsValue <= roomsMax);
      const locationKey = normalizeText(property.location || '');
      const matchesCities = selectedCities.length
        ? selectedCities.includes(locationKey)
        : !cityQuery || locationKey.includes(cityQuery);
      return matchesMin && matchesMax && matchesRoomsMin && matchesRoomsMax && matchesCities;
    });
  }, [visibleProperties, filters]);

  const mapProperties = useMemo(
    () => filteredProperties.filter((property) => property.latitude && property.longitude),
    [filteredProperties]
  );

  const highlightCopy = useMemo(() => {
    if (isHost) {
      if (!currentUser) return 'Loading your personal listings...';
      if (!filteredProperties.length) return 'You have not created any properties yet. Start by adding one.';
      return `You currently manage ${filteredProperties.length} ${
        filteredProperties.length === 1 ? 'listing' : 'listings'
      }.`;
    }
    return filteredProperties.length
      ? `We found ${filteredProperties.length} ${filteredProperties.length === 1 ? 'place' : 'places'} across the community.`
      : 'No spaces have been listed yet - be the first to add yours.';
  }, [isHost, filteredProperties.length, currentUser]);

  const openDetails = (property) => {
    if (isHost) return;
    navigate(`/properties/${property.id}`, { state: { property } });
  };
  const openCreatePage = () => navigate('/properties/new');
  const openEditPage = (property) => navigate(`/properties/${property.id}/edit`, { state: { property } });
  const openPreview = (property) => navigate(`/properties/${property.id}`, { state: { property } });

  const applyFilters = (nextFilters) => {
    const params = new URLSearchParams();
    const min = nextFilters.min.trim();
    const max = nextFilters.max.trim();
    const roomsMin = nextFilters.roomsMin.trim();
    const roomsMax = nextFilters.roomsMax.trim();
    const cities = nextFilters.cities.filter(Boolean);
    const searchCity = nextFilters.searchCity.trim();

    if (min) params.set('min', min);
    if (max) params.set('max', max);
    if (roomsMin) params.set('rooms_min', roomsMin);
    if (roomsMax) params.set('rooms_max', roomsMax);
    if (cities.length) {
      params.set('cities', cities.join('|'));
    } else if (searchCity) {
      params.set('search', searchCity);
    }

    const query = params.toString();
    navigate(query ? `/properties?${query}` : '/properties');
  };

  const heroTitle = isHost ? 'My properties' : 'Beautiful shared homes curated for modern roommates';
  const heroEyebrow = isHost ? 'Host center' : 'Explore';

  const handleMapSearch = async () => {
    const query = mapQuery.trim();
    if (!query) return;
    setMapError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const results = await response.json();
      if (!Array.isArray(results) || !results.length) {
        setMapError('No results found for that location.');
        return;
      }
      const result = results[0];
      const nextCoords = [Number(result.lat), Number(result.lon)];
      if (mapRef.current) {
        mapRef.current.setView(nextCoords, 12);
      }
    } catch (err) {
      console.error(err);
      setMapError('Unable to search the map right now.');
    }
  };

  return (
    <div className="properties-page">
      <section className="properties-hero gradient-card">
        <div>
          <p className="eyebrow text-uppercase fw-semibold mb-2">{heroEyebrow}</p>
          <h1 className="properties-title mb-3">{heroTitle}</h1>
          <p className="mb-4 text-light-emphasis">{highlightCopy}</p>
          {canManageListings && (
            <button type="button" className="btn btn-light btn-lg shadow-sm" onClick={openCreatePage}>
              List a new space
            </button>
          )}
        </div>
        <div className="properties-hero-meta">
          <div>
            <span className="hero-number">{filteredProperties.length || '00'}</span>
            <p className="mb-0 text-light">{isHost ? 'your listings' : 'active listings'}</p>
          </div>
          <div>
            <span className="hero-number">
              {filteredProperties.filter((p) => p.property_type?.toLowerCase() === 'apartment').length || '0'}
            </span>
            <p className="mb-0 text-light">{isHost ? 'apartment posts' : 'city apartments'}</p>
          </div>
        </div>
      </section>

      {isAuthenticated && isTransitioning && pendingMode === 'host' && (
        <div className="alert alert-secondary shadow-sm mt-4">Loading host tools for you. This will only take a moment.</div>
      )}

      {error && <div className="alert alert-danger shadow-sm mt-4">{error}</div>}

      <section className="properties-grid-wrapper mt-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => {
                  setDraftFilters(filters);
                  setFilterOpen(true);
                }}
              >
                Filter listings
              </button>
              {!isHost && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => setMapOpen(true)}>
                  Map view
                </button>
              )}
            </div>
          {(filters.min || filters.max || filters.roomsMin || filters.roomsMax || filters.cities.length || filters.searchCity) && (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => applyFilters({ ...emptyFilters, cities: [], searchCity: '' })}
            >
              Clear filters
            </button>
          )}
        </div>
        {loading ? (
          <div className="card border-0 shadow-sm p-4 text-center">Loading properties...</div>
        ) : filteredProperties.length ? (
          <div className="property-grid">
            {filteredProperties.map((property) => {
              const galleryImages = Array.isArray(property.gallery_images)
                ? property.gallery_images.filter(Boolean)
                : [];
              const heroImage = property.main_image_url || galleryImages[0] || DEFAULT_PROPERTY_IMAGE;
              const galleryCount = galleryImages.length || (property.main_image_url ? 1 : 0);

              return (
                <article
                  key={property.id}
                  className={`property-card shadow-sm ${isHost ? 'property-card--host' : ''}`}
                  role={!isHost ? 'button' : undefined}
                  tabIndex={!isHost ? 0 : undefined}
                  onClick={() => openDetails(property)}
                  onKeyDown={(e) => {
                    if (!isHost && e.key === 'Enter') openDetails(property);
                  }}
                >
                  <div className="property-card__media">
                    <img src={heroImage} alt={property.title} loading="lazy" />
                    <span className="property-card__type">{property.property_type || 'Listing'}</span>
                    {!isHost && (
                      <div className="property-card__overlay">
                        <span>View details</span>
                      </div>
                    )}
                  </div>
                  <div className="property-card__body">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <h2 className="property-card__title">{property.title}</h2>
                        <p className="property-card__location">
                          <FaMapMarkerAlt className="me-1 text-primary" />
                          {property.location}
                        </p>
                      </div>
                      <div className="property-card__price">
                        <FaCoins className="me-1" />
                        {formatPrice(property.price)}
                        <span className="text-muted">/mo</span>
                      </div>
                    </div>
                    {property.description && <p className="property-card__description">{property.description}</p>}
                    <div className="property-card__meta">
                      <span>
                        <FaBed className="me-1" />
                        {property.rooms ? `${property.rooms} rooms` : 'Flexible rooms'}
                      </span>
                      <span>
                        <FaImages className="me-1" />
                        {galleryCount ? `${galleryCount} photos` : 'No photos'}
                      </span>
                    </div>
                    <div className="property-card__footer">
                      <span>Hosted by {property.owner_name}</span>
                      {ownedByCurrentUser(property) && canManageListings && (
                        <div className="property-card__actions">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditPage(property);
                            }}
                          >
                            <FaPen className="me-1" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPreview(property);
                            }}
                          >
                            <FaRegEye className="me-1" />
                            Preview
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(property.id);
                            }}
                          >
                            <FaTrash className="me-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card border-0 shadow-sm p-4 text-center text-muted">
            {hasActiveFilters
              ? 'No properties found for your search.'
              : isHost
              ? 'You have not listed any properties yet. Click "List a new space" to get started.'
              : 'There are no properties yet. Hosts can be the first to share a beautiful space.'}
          </div>
        )}
      </section>

      {filterOpen && (
        <div className="filter-modal" role="dialog" aria-modal="true">
          <div className="filter-dialog">
            <div className="filter-header">
              <h2 className="h5 mb-0">Filter listings</h2>
              <button type="button" className="btn btn-link" onClick={() => setFilterOpen(false)}>
                Close
              </button>
            </div>
            <div className="filter-body">
              <div className="filter-field">
                <label className="form-label">Minimum price (BAM)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={draftFilters.min}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, min: event.target.value }))}
                />
              </div>
              <div className="filter-field">
                <label className="form-label">Maximum price (BAM)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={draftFilters.max}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, max: event.target.value }))}
                />
              </div>
              <div className="filter-field">
                <label className="form-label">Rooms (min)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={draftFilters.roomsMin}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, roomsMin: event.target.value }))}
                />
              </div>
              <div className="filter-field">
                <label className="form-label">Rooms (max)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={draftFilters.roomsMax}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, roomsMax: event.target.value }))}
                />
              </div>
              <div className="filter-field">
                <label className="form-label">Cities</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Search city"
                  value={draftFilters.searchCity}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, searchCity: event.target.value }))
                  }
                />
                <div className="filter-city-grid">
                  {cityOptions.length ? (
                    cityOptions.map((city) => (
                      <label key={city} className="filter-city-pill">
                        <input
                          type="checkbox"
                          checked={draftFilters.cities.includes(city)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setDraftFilters((prev) => {
                              if (checked) {
                                return { ...prev, cities: [...prev.cities, city] };
                              }
                              return { ...prev, cities: prev.cities.filter((item) => item !== city) };
                            });
                          }}
                        />
                        <span>{city}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted mb-0">No cities available yet.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="filter-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setDraftFilters({ ...emptyFilters, cities: [], searchCity: '' })}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  applyFilters({
                    ...draftFilters,
                    searchCity: draftFilters.cities.length ? '' : draftFilters.searchCity
                  });
                }}
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="filter-modal" role="dialog" aria-modal="true">
          <div className="filter-dialog map-dialog">
            <div className="filter-header">
              <h2 className="h5 mb-0">Map view</h2>
              <button type="button" className="btn btn-link" onClick={() => setMapOpen(false)}>
                Close
              </button>
            </div>
            <div className="map-search-bar mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search a city or address"
                value={mapQuery}
                onChange={(event) => setMapQuery(event.target.value)}
              />
              <button type="button" className="btn btn-outline-primary" onClick={handleMapSearch}>
                Search map
              </button>
            </div>
            {mapError && <div className="alert alert-warning py-2 mb-3">{mapError}</div>}
            <div className="property-map map-modal">
              <MapContainer
                center={[43.8563, 18.4131]}
                zoom={8}
                scrollWheelZoom
                whenCreated={(mapInstance) => {
                  mapRef.current = mapInstance;
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapProperties.map((property) => {
                  const position = [Number(property.latitude), Number(property.longitude)];
                  const heroImage =
                    property.main_image_url ||
                    (Array.isArray(property.gallery_images) ? property.gallery_images[0] : null) ||
                    DEFAULT_PROPERTY_IMAGE;
                  return (
                    <Marker
                      key={property.id}
                      position={position}
                      eventHandlers={{
                        click: () => openDetails(property)
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                        <div className="map-tooltip">
                          <img src={heroImage} alt={property.title} />
                          <div>
                            <strong>{formatPrice(property.price)}</strong>
                            <span>{property.title}</span>
                          </div>
                        </div>
                      </Tooltip>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
            {!mapProperties.length && (
              <p className="text-muted mt-2 mb-0">No properties with map pins yet.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
