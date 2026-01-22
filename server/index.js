const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const conversationRoutes = require('./routes/conversations');
const authMiddleware = require('./middleware/authMiddleware');
const runMigrations = require('./migrations');

dotenv.config();
const app = express();
app.use(cors());

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

app.use('/uploads', express.static(uploadsPath));

app.post('/api/uploads', authMiddleware, (req, res) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || 'Unable to upload files.' });
    }

    const fileUrls = (req.files || []).map((file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
    res.status(201).json({ urls: fileUrls });
  });
});

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Smart Roommate API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/conversations', conversationRoutes);

runMigrations()
  .then(() => {
    console.log('Database migrations applied.');
  })
  .catch((err) => {
    console.error('Database migration failed', err);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
