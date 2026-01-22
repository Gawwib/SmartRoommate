const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
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

const diskStorage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const supabaseEnabled =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  Boolean(process.env.SUPABASE_BUCKET);

const supabase = supabaseEnabled
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

const uploadCloud = multer({
  storage: multer.memoryStorage(),
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
  const handler = supabaseEnabled ? uploadCloud : uploadDisk;
  handler.array('images', 6)(req, res, async (err) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || 'Unable to upload files.' });
    }

    try {
      if (!supabaseEnabled) {
        const fileUrls = (req.files || []).map((file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
        return res.status(201).json({ urls: fileUrls });
      }

      const bucket = process.env.SUPABASE_BUCKET;
      const uploadToSupabase = async (file) => {
        const ext = path.extname(file.originalname) || '';
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = `uploads/${fileName}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });
        if (uploadError) {
          throw uploadError;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
      };

      const fileUrls = await Promise.all((req.files || []).map((file) => uploadToSupabase(file)));
      return res.status(201).json({ urls: fileUrls });
    } catch (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ message: 'Unable to upload files.' });
    }
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
