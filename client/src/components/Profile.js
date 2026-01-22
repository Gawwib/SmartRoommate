import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { DEFAULT_PROPERTY_IMAGE } from '../constants/propertyMedia';

const HABIT_OPTIONS = [
  'Cinema',
  'Football',
  'Basketball',
  'Tennis',
  'Running',
  'Cycling',
  'Hiking',
  'Swimming',
  'Gym / Fitness',
  'Yoga',
  'Pilates',
  'Cooking',
  'Baking',
  'Coffee shops',
  'Tea lover',
  'Wine tasting',
  'Craft beer',
  'Board games',
  'Card games',
  'Video games',
  'Esports',
  'Anime',
  'Manga',
  'Reading',
  'Writing',
  'Photography',
  'Videography',
  'Art galleries',
  'Museums',
  'Concerts',
  'Live music',
  'Festivals',
  'Travel',
  'Road trips',
  'Camping',
  'Beach days',
  'Shopping',
  'Thrifting',
  'Fashion',
  'Interior design',
  'DIY projects',
  'Gardening',
  'Plants',
  'Pets / Dogs',
  'Pets / Cats',
  'Volunteering',
  'Meditation',
  'Language learning',
  'Tech & gadgets',
  'Podcasts',
  'Stand-up comedy',
  'Dancing'
];

const MIN_HABITS = 3;
const MAX_HABITS = 8;
const BIO_LIMIT = 30;

const parseHabits = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const formatHabits = (list) => list.join(', ');

const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// cropping helpers removed

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    birthdate: '',
    gender: '',
    location: '',
    bio: '',
    habits: [],
    profileImage: '',
    tidiness: 3,
    social_energy: 3,
    noise_tolerance: 3
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get('/users/me');
        const interests = parseHabits(res.data.habits);
        setProfile(res.data);
        setForm({
          birthdate: res.data.birthdate ? res.data.birthdate.slice(0, 10) : '2003-01-01',
          gender: res.data.gender || '',
          location: res.data.location || '',
          bio: res.data.bio || '',
          habits: interests,
          profileImage: res.data.profile_image_url || '',
          tidiness: res.data.tidiness ?? 3,
          social_energy: res.data.social_energy ?? 3,
          noise_tolerance: res.data.noise_tolerance ?? 3
        });
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Please log in to view your profile.');
        } else {
          setError('Unable to load your profile right now.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleHabitToggle = (habit) => {
    setForm((prev) => {
      const alreadySelected = prev.habits.includes(habit);
      if (alreadySelected) {
        return { ...prev, habits: prev.habits.filter((h) => h !== habit) };
      }
      if (prev.habits.length >= MAX_HABITS) return prev;
      return { ...prev, habits: [...prev.habits, habit] };
    });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const persistProfileImage = async (url) => {
    const age = calculateAge(form.birthdate || profile?.birthdate || '2003-01-01');
    const ratings = {
      tidiness: Number(form.tidiness) || null,
      social_energy: Number(form.social_energy) || null,
      noise_tolerance: Number(form.noise_tolerance) || null
    };
    const payload = {
      birthdate: profile?.birthdate || '2003-01-01',
      age,
      gender: form.gender || profile?.gender || null,
      location: form.location || profile?.location || '',
      budget: null,
      habits: formatHabits(form.habits),
      profile_image_url: url,
      bio: form.bio || profile?.bio || '',
      ...ratings
    };
    try {
      await API.put('/users/me', payload);
      setProfile((prev) => ({ ...prev, ...payload }));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to save photo.');
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const formData = new FormData();
    formData.append('images', files[0]);
    try {
      setUploading(true);
      const res = await API.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.urls?.[0];
      if (url) {
        setForm((prev) => ({ ...prev, profileImage: url }));
        await persistProfileImage(url);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to upload photo.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (form.habits.length < MIN_HABITS || form.habits.length > MAX_HABITS) {
      setError(`Choose at least ${MIN_HABITS} and at most ${MAX_HABITS} interests.`);
      return;
    }

    if (!form.gender) {
      setError('Please select your gender.');
      return;
    }

    if (!form.bio.trim()) {
      setError('Add a short bio about yourself (max 30 characters).');
      return;
    }

    if (form.bio.trim().length > BIO_LIMIT) {
      setError('Bio must be 30 characters or fewer.');
      return;
    }

    const ratingValues = [form.tidiness, form.social_energy, form.noise_tolerance].map((value) => Number(value));
    if (ratingValues.some((value) => Number.isNaN(value) || value < 1 || value > 5)) {
      setError('Please rate tidiness, social energy, and noise tolerance from 1 to 5.');
      return;
    }

    const age = calculateAge(form.birthdate || profile?.birthdate || '2003-01-01');
    const ratings = {
      tidiness: Number(form.tidiness) || null,
      social_energy: Number(form.social_energy) || null,
      noise_tolerance: Number(form.noise_tolerance) || null
    };
    const payload = {
      birthdate: profile?.birthdate || '2003-01-01',
      age,
      gender: form.gender || null,
      location: form.location || '',
      budget: null,
      habits: formatHabits(form.habits),
      profile_image_url: form.profileImage || profile?.profile_image_url || null,
      bio: form.bio.trim(),
      ...ratings
    };

    try {
      setSaving(true);
      await API.put('/users/me', payload);
      setMsg('Profile updated');
      setProfile((prev) => ({ ...prev, ...payload }));
      if (profile?.id) {
        localStorage.removeItem(`profileImagePos_${profile.id}`);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to update profile right now.');
    } finally {
      setSaving(false);
    }
  };

  const ageDisplay = useMemo(() => calculateAge(form.birthdate || profile?.birthdate), [form.birthdate, profile]);
  const birthYear = useMemo(
    () => (profile?.birthdate ? new Date(profile.birthdate).getFullYear() : null),
    [profile?.birthdate]
  );
  const displayImage = form.profileImage || profile?.profile_image_url || DEFAULT_PROPERTY_IMAGE;
  const ratingSummary = [
    { label: 'Tidiness', value: form.tidiness },
    { label: 'Social energy', value: form.social_energy },
    { label: 'Noise tolerance', value: form.noise_tolerance }
  ];


  if (loading) return <div>Loading...</div>;

  if (error && !profile) {
    return (
      <div className="alert alert-warning d-flex justify-content-between align-items-center">
        <span>{error}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>
          Go to login
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-page">
      <div className="profile-hero-card shadow-sm">
        <div className="profile-hero-body">
          <div className="profile-avatar large">
            {displayImage ? <img src={displayImage} alt="Profile" /> : <span>?</span>}
          </div>
          <div className="profile-hero-info">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="status-dot"></span>
              <span className="text-muted small">Online now</span>
            </div>
            <h2 className="mb-1">{ageDisplay !== null ? `${profile.name}, ${ageDisplay}` : profile.name}</h2>
            {birthYear && <p className="mb-1 text-muted small">Born {birthYear}</p>}
            {profile.location && <p className="mb-1 text-muted">{profile.location}</p>}
            {form.bio && <p className="mb-2 fw-semibold">{form.bio}</p>}
            {form.habits.length > 0 && (
              <div className="pill-row">
                {form.habits.slice(0, 6).map((habit) => (
                  <span key={habit} className="pill pill-selected small">
                    {habit}
                  </span>
                ))}
              </div>
            )}
            <div className="profile-rating-grid mt-3">
              {ratingSummary.map((rating) => (
                <div key={rating.label} className="profile-rating-chip">
                  <span>{rating.label}</span>
                  <strong>{rating.value}/5</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <p className="eyebrow text-uppercase mb-1">Improve your matches</p>
          <h3 className="h5">Update profile</h3>
          {msg && <div className="alert alert-info mt-2">{msg}</div>}
          {error && profile && <div className="alert alert-warning mt-2">{error}</div>}
          <form className="mt-3" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label d-block">Gender *</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="gender"
                    id="gender-male"
                    value="male"
                    checked={form.gender === 'male'}
                    onChange={handleChange}
                    required
                  />
                  <label className="form-check-label" htmlFor="gender-male">
                    Male
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="gender"
                    id="gender-female"
                    value="female"
                    checked={form.gender === 'female'}
                    onChange={handleChange}
                    required
                  />
                  <label className="form-check-label" htmlFor="gender-female">
                    Female
                  </label>
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="form-control" />
            </div>
            <div className="mb-4">
              <h4 className="h6 mb-3">Your living style</h4>
              <div className="rating-field">
                <div className="rating-label">
                  <span>Tidiness</span>
                  <small className="text-muted">1 = Messy, 5 = Very neat · {form.tidiness}/5</small>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  name="tidiness"
                  value={form.tidiness}
                  onChange={handleChange}
                  className="form-range"
                />
              </div>
              <div className="rating-field">
                <div className="rating-label">
                  <span>Social energy</span>
                  <small className="text-muted">1 = Introvert, 5 = Very social · {form.social_energy}/5</small>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  name="social_energy"
                  value={form.social_energy}
                  onChange={handleChange}
                  className="form-range"
                />
              </div>
              <div className="rating-field">
                <div className="rating-label">
                  <span>Noise tolerance</span>
                  <small className="text-muted">1 = Quiet, 5 = Loud ok · {form.noise_tolerance}/5</small>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  name="noise_tolerance"
                  value={form.noise_tolerance}
                  onChange={handleChange}
                  className="form-range"
                />
              </div>
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0">Interests (select {MIN_HABITS}-{MAX_HABITS}) *</label>
                <small className="text-muted">{form.habits.length} selected</small>
              </div>
              <div className="pill-grid selectable">
                {HABIT_OPTIONS.map((option) => {
                  const selected = form.habits.includes(option);
                  const disabled = !selected && form.habits.length >= MAX_HABITS;
                  return (
                    <button
                      type="button"
                      key={option}
                      className={`pill ${selected ? 'pill-selected' : ''}`}
                      onClick={() => handleHabitToggle(option)}
                      disabled={disabled}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <small className="text-muted">
                We’ll use these to improve AI roommate compatibility. Pick what genuinely matters to you.
              </small>
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0">My bio *</label>
                <small className="text-muted">{form.bio.length}/{BIO_LIMIT}</small>
              </div>
              <input
                name="bio"
                value={form.bio}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_LIMIT) handleChange(e);
                }}
                className="form-control"
                placeholder="Short sentence about you"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Profile photo</label>
              <div className="d-flex align-items-center gap-3">
                <div className="profile-avatar small">
                  {displayImage ? <img src={displayImage} alt="Profile" /> : <span>?</span>}
                </div>
                <div className="flex-grow-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  <small className="text-muted">Upload one clear photo (max 5MB).</small>
                </div>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
