import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaBed, FaCalendarAlt, FaCoins, FaHome, FaImages, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import API from '../services/api';
import { DEFAULT_PROPERTY_IMAGE } from '../constants/propertyMedia';
import '../utils/leafletIcons';

const priceFormatter = new Intl.NumberFormat('bs-BA', {
  style: 'currency',
  currency: 'BAM',
  maximumFractionDigits: 0
});

const formatDate = (value) => {
  if (!value) return 'Recently listed';
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [property, setProperty] = useState(location.state?.property || null);
  const [loading, setLoading] = useState(!location.state?.property);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const token = localStorage.getItem('token');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/properties/${id}`);
        setProperty(res.data);
        setError('');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Unable to load property details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) return;
      try {
        const res = await API.get('/users/me');
        setCurrentUserId(res.data?.id || null);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!property) return;
    const heroCandidate = property.main_image_url || property.gallery_images?.[0] || DEFAULT_PROPERTY_IMAGE;
    setActiveImage(heroCandidate || DEFAULT_PROPERTY_IMAGE);
  }, [property]);

  const galleryImages = useMemo(() => {
    if (!property) return [];
    const existing = Array.isArray(property.gallery_images) ? property.gallery_images.filter(Boolean) : [];
    if (existing.length) return existing;
    if (property.main_image_url) return [property.main_image_url];
    return [];
  }, [property]);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/properties');
  };

  const handleGallerySelect = (image) => setActiveImage(image);
  const openGalleryModal = (image) => {
    if (!galleryImages.length) return;
    const index = galleryImages.findIndex((img) => img === image);
    setModalIndex(index >= 0 ? index : 0);
    setGalleryOpen(true);
  };
  const handleSendMessage = () => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (property?.user_id && currentUserId && property.user_id === currentUserId) {
      return;
    }
    navigate(`/messages?recipient=${property.user_id}&property=${property.id}`);
  };

  const renderBody = () => {
    if (loading && !property) {
      return <div className="card border-0 shadow-sm p-4 text-center">Loading property...</div>;
    }

    if (error && !property) {
      return (
        <div className="alert alert-danger shadow-sm" role="alert">
          {error}
        </div>
      );
    }

    if (!property) {
      return (
        <div className="alert alert-warning shadow-sm" role="alert">
          Property could not be found. It may have been removed by the host.
        </div>
      );
    }

    return (
      <>
        <div className="property-detail-hero card border-0 shadow-sm mb-4">
          <div className="property-detail-hero__media">
            <img src={activeImage || DEFAULT_PROPERTY_IMAGE} alt={property.title} />
            <span className="badge text-bg-light property-detail-type">{property.property_type || 'Listing'}</span>
          </div>
          <div className="property-detail-hero__content">
            <p className="eyebrow text-muted mb-1">Property #{property.id}</p>
            <h1 className="mb-3">{property.title}</h1>
            <p className="property-detail-location">
              <FaMapMarkerAlt className="me-2 text-primary" />
              {property.location}
            </p>
            <div className="property-detail-price">
              <FaCoins className="me-1" />
              {priceFormatter.format(property.price)}
              <span className="text-muted"> / month</span>
            </div>
          </div>
        </div>

        <div className="property-detail-card card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-4">
              <div className="col-lg-7">
                <h2 className="h4 mb-3">About this property</h2>
                {property.description ? (
                  <p className="text-body-secondary">{property.description}</p>
                ) : (
                  <p className="text-body-secondary">The host has not provided a description yet.</p>
                )}
                <div className="detail-meta-grid mt-4">
                  <div>
                    <FaBed className="text-primary me-2" />
                    <div>
                      <p className="mb-0 text-muted">Rooms</p>
                      <strong>{property.rooms ? `${property.rooms} available` : 'Flexible layout'}</strong>
                    </div>
                  </div>
                  <div>
                    <FaHome className="text-primary me-2" />
                    <div>
                      <p className="mb-0 text-muted">Type</p>
                      <strong>{property.property_type || 'Not specified'}</strong>
                    </div>
                  </div>
                  <div>
                    <FaUser className="text-primary me-2" />
                    <div>
                      <p className="mb-0 text-muted">Host</p>
                      <strong>{property.owner_name}</strong>
                    </div>
                  </div>
                  <div>
                    <FaCalendarAlt className="text-primary me-2" />
                    <div>
                      <p className="mb-0 text-muted">Listed on</p>
                      <strong>{formatDate(property.created_at)}</strong>
                    </div>
                  </div>
                </div>
                <div className="host-card mt-4">
                  <div className="host-avatar">
                    <img src={property.owner_image_url || DEFAULT_PROPERTY_IMAGE} alt={property.owner_name} />
                  </div>
                  <div className="host-meta">
                    <p className="mb-1 fw-semibold">Hosted by {property.owner_name}</p>
                    <small className="text-muted">Response within a few hours</small>
                  </div>
                  {property.user_id !== currentUserId && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleSendMessage}>
                      Send message
                    </button>
                  )}
                </div>
              </div>
              <div className="col-lg-5">
                <h2 className="h4 mb-3">
                  Gallery <FaImages className="ms-2 text-primary" />
                </h2>
                <div className="property-detail-gallery">
                  {galleryImages.map((image) => (
                    <button
                      type="button"
                      key={image}
                      className={`gallery-thumb ${activeImage === image ? 'is-active' : ''}`}
                      onClick={() => {
                        handleGallerySelect(image);
                        openGalleryModal(image);
                      }}
                    >
                      <img src={image} alt="Property thumbnail" />
                    </button>
                  ))}
                  {!galleryImages.length && (
                    <div className="text-muted small">No additional photos were provided for this listing.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {property.latitude && property.longitude && (
          <div className="property-detail-card card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h4 mb-3">Location on map</h2>
              <div className="property-map">
                <MapContainer
                  center={[Number(property.latitude), Number(property.longitude)]}
                  zoom={13}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[Number(property.latitude), Number(property.longitude)]} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="property-detail-page">
      <button type="button" className="btn btn-link ps-0 mb-3 text-decoration-none" onClick={handleBack}>
        <FaArrowLeft className="me-2" />
        Back to properties
      </button>
      {renderBody()}
      {galleryOpen && (
        <div className="filter-modal" role="dialog" aria-modal="true">
          <div className="filter-dialog map-dialog gallery-dialog">
            <div className="filter-header">
              <h2 className="h5 mb-0">Photo gallery</h2>
              <button type="button" className="btn btn-link" onClick={() => setGalleryOpen(false)}>
                Close
              </button>
            </div>
            <div className="gallery-modal-body">
              <img src={galleryImages[modalIndex]} alt="Selected property" />
            </div>
            <div className="gallery-modal-thumbs">
              {galleryImages.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  className={`gallery-thumb ${index === modalIndex ? 'is-active' : ''}`}
                  onClick={() => setModalIndex(index)}
                >
                  <img src={image} alt="Property thumbnail" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
