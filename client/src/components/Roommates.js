import React, { useEffect, useMemo, useState } from 'react';
import { FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { DEFAULT_PROPERTY_IMAGE } from '../constants/propertyMedia';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseHabits = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const calculateCompatibility = (currentUser, roommate) => {
  if (!currentUser) return 50;
  const ratings = [
    Math.abs((currentUser.tidiness || 0) - (roommate.tidiness || 0)),
    Math.abs((currentUser.social_energy || 0) - (roommate.social_energy || 0)),
    Math.abs((currentUser.noise_tolerance || 0) - (roommate.noise_tolerance || 0))
  ];
  const ratingSimilarity = 1 - ratings.reduce((sum, value) => sum + value, 0) / (ratings.length * 4);

  const currentHabits = new Set(parseHabits(currentUser.habits));
  const roommateHabits = new Set(parseHabits(roommate.habits));
  const overlap = Array.from(currentHabits).filter((habit) => roommateHabits.has(habit)).length;
  const union = new Set([...currentHabits, ...roommateHabits]).size || 1;
  const habitSimilarity = overlap / union;

  const ageDiff = Math.abs((currentUser.age || 0) - (roommate.age || 0));
  const ageSimilarity = 1 - clamp(ageDiff, 0, 10) / 10;

  const weighted =
    ratingSimilarity * 0.6 +
    habitSimilarity * 0.25 +
    ageSimilarity * 0.15;

  const score = 50 + 50 * clamp(weighted, 0, 1);
  return Math.round(score);
};

export default function Roommates() {
  const [roommates, setRoommates] = useState([]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadRoommates = async () => {
      try {
        setLoading(true);
        const me = await API.get('/users/me');
        const isComplete = Boolean(me.data.profile_complete);
        setCurrentUser(me.data);
        setProfileComplete(isComplete);
        if (!isComplete) {
          setRoommates([]);
          return;
        }
        const res = await API.get('/users/roommates');
        setRoommates(res.data || []);
        setError('');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Unable to load roommates.');
      } finally {
        setLoading(false);
      }
    };

    loadRoommates();
  }, []);

  const emptyCopy = useMemo(() => {
    if (!profileComplete) {
      return 'Complete your profile to unlock roommate browsing.';
    }
    return 'No roommates are available yet. Check back soon.';
  }, [profileComplete]);

  const handleMessage = (roommateId) => {
    navigate(`/messages?recipient=${roommateId}`);
  };

  return (
    <div className="properties-page">
      <section className="properties-hero gradient-card">
        <div>
          <p className="eyebrow text-uppercase fw-semibold mb-2">Roommates</p>
          <h1 className="properties-title mb-3">Find people who match your lifestyle</h1>
          <p className="mb-4 text-light-emphasis">
            Browse complete profiles only. Update your own profile to unlock visibility.
          </p>
          {!profileComplete && (
            <button type="button" className="btn btn-light btn-lg shadow-sm" onClick={() => navigate('/profile')}>
              Complete my profile
            </button>
          )}
        </div>
      </section>

      {error && <div className="alert alert-danger shadow-sm mt-4">{error}</div>}

      <section className="properties-grid-wrapper mt-4">
        {loading ? (
          <div className="card border-0 shadow-sm p-4 text-center">Loading roommates...</div>
        ) : roommates.length ? (
          <div className="property-grid">
            {roommates.map((roommate) => {
              const habits = parseHabits(roommate.habits);
              const compatibility = calculateCompatibility(currentUser, roommate);
              return (
                <article key={roommate.id} className="property-card shadow-sm property-card--host">
                  <div className="roommate-card__media">
                    <div className="profile-avatar small">
                      <img src={roommate.profile_image_url || DEFAULT_PROPERTY_IMAGE} alt={roommate.name} />
                    </div>
                    <span className="property-card__type">{roommate.gender || 'Roommate'}</span>
                    <span className="compatibility-pill">{compatibility}% match</span>
                  </div>
                  <div className="property-card__body">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <h2 className="property-card__title">
                          {roommate.name}
                          {roommate.age ? `, ${roommate.age}` : ''}
                        </h2>
                        {roommate.location && (
                          <p className="property-card__location">
                            <FaMapMarkerAlt className="me-1 text-primary" />
                            {roommate.location}
                          </p>
                        )}
                      </div>
                    </div>
                    {roommate.bio && <p className="property-card__description">{roommate.bio}</p>}
                    <div className="detail-meta-grid mt-3">
                      <div>
                        <FaStar className="text-primary me-2" />
                        <div>
                          <p className="mb-0 text-muted">Tidiness</p>
                          <strong>{roommate.tidiness}/5</strong>
                        </div>
                      </div>
                      <div>
                        <FaStar className="text-primary me-2" />
                        <div>
                          <p className="mb-0 text-muted">Social</p>
                          <strong>{roommate.social_energy}/5</strong>
                        </div>
                      </div>
                      <div>
                        <FaStar className="text-primary me-2" />
                        <div>
                          <p className="mb-0 text-muted">Noise</p>
                          <strong>{roommate.noise_tolerance}/5</strong>
                        </div>
                      </div>
                    </div>
                    {habits.length > 0 && (
                      <div className="pill-row mt-3">
                        {habits.slice(0, 6).map((habit) => (
                          <span key={habit} className="pill pill-selected small">
                            {habit}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="property-card__footer">
                      <span>Available to chat</span>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => handleMessage(roommate.id)}>
                        Send message
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card border-0 shadow-sm p-4 text-center text-muted">{emptyCopy}</div>
        )}
      </section>
    </div>
  );
}
