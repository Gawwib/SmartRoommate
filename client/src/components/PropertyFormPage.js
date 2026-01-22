import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaCloudUploadAlt, FaImage, FaTrash } from 'react-icons/fa';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import API from '../services/api';
import { useRole } from '../context/RoleContext';
import '../utils/leafletIcons';

const emptyFormState = {
  title: '',
  location: '',
  price: '',
  description: '',
  rooms: '',
  property_type: ''
};

const DEFAULT_CENTER = { lat: 43.8563, lng: 18.4131 };

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export default function PropertyFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const { isHost } = useRole();

  const [form, setForm] = useState(emptyFormState);
  const [gallery, setGallery] = useState([]);
  const [mainImage, setMainImage] = useState('');
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [mapQuery, setMapQuery] = useState('');
  const [coordinates, setCoordinates] = useState(DEFAULT_CENTER);
  const [hasPin, setHasPin] = useState(false);
  const mapRef = useRef(null);

  const hydrateForm = useCallback((property) => {
    setForm({
      title: property.title,
      location: property.location,
      price: property.price,
      description: property.description || '',
      rooms: property.rooms ?? '',
      property_type: property.property_type || ''
    });
    const incomingGallery = Array.isArray(property.gallery_images) ? property.gallery_images.filter(Boolean) : [];
    const mergedGallery =
      incomingGallery.length || !property.main_image_url
        ? incomingGallery
        : [property.main_image_url, ...incomingGallery];
    setGallery(mergedGallery);
    setMainImage(property.main_image_url || mergedGallery[0] || '');
    if (property.latitude && property.longitude) {
      setCoordinates({ lat: Number(property.latitude), lng: Number(property.longitude) });
      setHasPin(true);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }
    let initialProperty = null;
    if (location.state?.property && String(location.state.property.id) === String(id)) {
      initialProperty = location.state.property;
      hydrateForm(initialProperty);
      setLoading(false);
    }
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/properties/${id}`);
        hydrateForm(res.data);
        setError('');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Unable to load property details.');
      } finally {
        setLoading(false);
      }
    };
    if (!initialProperty) fetchProperty();
  }, [hydrateForm, id, isEditMode, location.state]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    try {
      setUploadError('');
      setUploading(true);
      const res = await API.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploaded = res.data?.urls || [];
      if (uploaded.length) {
        setGallery((prev) => [...prev, ...uploaded]);
        setMainImage((prevMain) => prevMain || uploaded[0] || '');
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || 'Unable to upload images.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (imageUrl) => {
    setGallery((prev) => {
      const nextGallery = prev.filter((img) => img !== imageUrl);
      if (mainImage === imageUrl) {
        setMainImage(nextGallery[0] || '');
      }
      return nextGallery;
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      navigate('/login');
      return;
    }
    if (!form.title.trim() || !form.location.trim()) {
      setError('Title and location are required.');
      return;
    }
    const priceValue = parseFloat(form.price);
    if (Number.isNaN(priceValue)) {
      setError('Please enter a valid monthly price in BAM.');
      return;
    }
    const roomsValue = form.rooms === '' ? null : parseInt(form.rooms, 10);
    if (roomsValue !== null && Number.isNaN(roomsValue)) {
      setError('Rooms must be a number.');
      return;
    }
    if (!hasPin) {
      setError('Please pin the property location on the map.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      location: form.location.trim(),
      price: priceValue,
      description: form.description.trim(),
      rooms: roomsValue,
      property_type: form.property_type,
      latitude: hasPin ? coordinates.lat : null,
      longitude: hasPin ? coordinates.lng : null,
      mainImage,
      galleryImages: gallery
    };

    try {
      setSaving(true);
      if (isEditMode) {
        await API.put(`/properties/${id}`, payload);
      } else {
        await API.post('/properties', payload);
      }
      navigate('/properties');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to save property.');
    } finally {
      setSaving(false);
    }
  };

  const isFormDisabled = !token || !isHost;
  const pageTitle = isEditMode ? 'Edit property' : 'Add a property';
  const subtitle = isEditMode ? 'Update your listing details' : 'Provide details about the space you are offering';

  const displayGallery = useMemo(() => {
    if (gallery.length) return gallery;
    return mainImage ? [mainImage] : [];
  }, [gallery, mainImage]);

  useEffect(() => {
    if (mapRef.current && hasPin) {
      mapRef.current.setView(coordinates, 13);
    }
  }, [coordinates, hasPin]);

  const handleMapSearch = async () => {
    const query = mapQuery.trim();
    if (!query) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const results = await response.json();
      if (!Array.isArray(results) || !results.length) {
        setError('No results found for that location.');
        return;
      }
      const result = results[0];
      const nextCoords = { lat: Number(result.lat), lng: Number(result.lon) };
      setCoordinates(nextCoords);
      setHasPin(true);
      if (mapRef.current) {
        mapRef.current.setView(nextCoords, 13);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to search the map right now.');
    }
  };

  return (
    <div className="property-detail-page">
      <button type="button" className="btn btn-link ps-0 mb-3 text-decoration-none" onClick={() => navigate(-1)}>
        &larr; Back
      </button>
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <p className="eyebrow text-muted mb-1">{isEditMode ? 'Update listing' : 'Create listing'}</p>
          <h1 className="h3">{pageTitle}</h1>
          <p className="text-muted mb-0">{subtitle}</p>
        </div>
      </div>

      {isFormDisabled && (
        <div className="alert alert-info">
          You need to be logged in and in host mode to manage listings.
          <div className="mt-2">
            <button type="button" className="btn btn-primary me-2" onClick={() => navigate('/login')}>
              Go to login
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/properties')}>
              Return to properties
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card border-0 shadow-sm p-4 text-center">Loading...</div>
      ) : (
        <form className="card border-0 shadow-sm p-4" onSubmit={submitForm}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input
                name="title"
                className="form-control"
                value={form.title}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Pin your property location *</label>
              <div className="map-search-bar">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search address or neighborhood"
                  value={mapQuery}
                  onChange={(event) => setMapQuery(event.target.value)}
                />
                <button type="button" className="btn btn-outline-primary" onClick={handleMapSearch}>
                  Search map
                </button>
              </div>
              <div className="property-map">
                <MapContainer
                  center={coordinates}
                  zoom={12}
                  scrollWheelZoom={false}
                  whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance;
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler
                    onSelect={(coords) => {
                      setCoordinates(coords);
                      setHasPin(true);
                    }}
                  />
                  {hasPin && <Marker position={coordinates} />}
                </MapContainer>
              </div>
              <small className="text-muted">
                Click on the map to drop a pin. This will be visible to people browsing your property.
              </small>
            </div>
            <div className="col-md-6">
              <label className="form-label">Location *</label>
              <input
                name="location"
                className="form-control"
                value={form.location}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Monthly price (BAM) *</label>
              <input
                name="price"
                className="form-control"
                value={form.price}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Rooms</label>
              <input name="rooms" className="form-control" value={form.rooms} onChange={handleChange} disabled={isFormDisabled} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Type</label>
              <select
                name="property_type"
                className="form-select"
                value={form.property_type}
                onChange={handleChange}
                disabled={isFormDisabled}
              >
                <option value="">Select type</option>
                <option value="room">Room</option>
                <option value="flat">Flat</option>
                <option value="apartment">Apartment</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-control"
                rows="3"
                value={form.description}
                onChange={handleChange}
                disabled={isFormDisabled}
              ></textarea>
            </div>
            <div className="col-12">
              <label className="form-label d-flex justify-content-between align-items-center">
                <span className="d-flex align-items-center gap-2">
                  <FaCloudUploadAlt />
                  Upload images
                </span>
                <small className="text-muted">JPG or PNG up to 5MB each</small>
              </label>
              <div className="upload-input">
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isFormDisabled || uploading}
                />
                <small className="text-muted d-block mt-1">
                  {uploading ? 'Uploading...' : 'Add multiple files to build out your gallery.'}
                </small>
                {uploadError && <div className="text-danger small mt-1">{uploadError}</div>}
              </div>
              <div className="image-grid mt-3">
                {displayGallery.length ? (
                  displayGallery.map((image) => (
                    <div key={image} className="uploaded-image-card shadow-sm">
                      <img src={image} alt="Uploaded" />
                      <div className="d-flex align-items-center justify-content-between mt-2">
                        <div className="form-check">
                          <input
                            id={`primary-${image}`}
                            type="radio"
                            className="form-check-input"
                            checked={mainImage === image}
                            onChange={() => setMainImage(image)}
                            disabled={isFormDisabled}
                          />
                          <label htmlFor={`primary-${image}`} className="form-check-label">
                            Primary
                          </label>
                        </div>
                        {!isFormDisabled && (
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRemoveImage(image)}>
                            <FaTrash className="me-1" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="placeholder-image text-center text-muted">
                    <FaImage size={32} className="mb-2" />
                    <p className="small mt-2 mb-0">No images uploaded yet. We&apos;ll use a fallback image on your listing.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={isFormDisabled || saving}>
              {saving ? 'Saving...' : isEditMode ? 'Save changes' : 'Create property'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/properties')}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
