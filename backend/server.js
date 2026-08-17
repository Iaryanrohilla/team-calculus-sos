const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const Tesseract = require('tesseract.js');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/watermarked', express.static(path.join(__dirname, 'watermarked')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create SVG watermark buffer
const watermarkBuffer = Buffer.from(
  `<svg width="800" height="800">
    <style>
      .title { fill: rgba(255, 0, 0, 0.4); font-size: 40px; font-weight: bold; font-family: sans-serif; }
    </style>
    <text x="50%" y="50%" text-anchor="middle" class="title" transform="rotate(-45 400 400)">FOR MISSING PERSON VERIFICATION ONLY</text>
    <text x="50%" y="55%" text-anchor="middle" class="title" transform="rotate(-45 400 400)">TEAM CALCULUS</text>
  </svg>`
);

app.post('/api/process-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('watermarked', 'wm_' + req.file.filename);

    // Apply watermark using sharp
    await sharp(inputPath)
      .composite([{
        input: watermarkBuffer,
        gravity: 'center',
        blend: 'over'
      }])
      .toFile(outputPath);

    // Run OCR using Tesseract
    const { data: { text } } = await Tesseract.recognize(
      inputPath,
      'eng',
      { logger: m => console.log(m) }
    );

    console.log("Extracted text:", text);

    // Rudimentary parsing for Name, DOB, and ID (assuming generic keywords/formats)
    let extractedName = '';
    let extractedDOB = '';
    let extractedID = '';

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Example regex for DOB (DD/MM/YYYY or similar)
    const dobRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
    const dobMatch = text.match(dobRegex);
    if (dobMatch) extractedDOB = dobMatch[0];

    // Search for ID number (e.g. 12 digits for Aadhaar, or alphanumeric for passport)
    const idRegex = /(\d{4}\s\d{4}\s\d{4}|[A-Z]{1}[0-9]{7})/;
    const idMatch = text.match(idRegex);
    if (idMatch) extractedID = idMatch[0];

    // For Name, let's try to look for keywords or just grab a likely line
    // This is highly error prone on real IDs but serves as a proof of concept.
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('name') && i + 1 < lines.length) {
            extractedName = lines[i+1].replace(/[^a-zA-Z\s]/g, '').trim();
            break;
        }
    }

    // Clean up original uploaded file to save space (keep the watermarked one)
    fs.unlinkSync(inputPath);

    res.json({
      success: true,
      watermarkedUrl: `${req.protocol}://${req.get('host')}/watermarked/wm_${req.file.filename}`,
      extractedData: {
        rawText: text,
        name: extractedName,
        dob: extractedDOB,
        idNo: extractedID
      }
    });

  } catch (error) {
    console.error("Error processing document:", error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

app.post('/api/submit-emergency', (req, res) => {
  const { profileData, watermarkedUrl, timestamp } = req.body;
  
  const payload = {
    profileData,
    watermarkedUrl,
    timestamp: timestamp || new Date().toISOString(),
    tag: 'EMERGENCY - HIGH PRIORITY',
    id: Date.now().toString()
  };

  // Broadcast to all connected clients
  io.emit('new_emergency', payload);

  res.json({ success: true, message: 'Emergency broadcasted successfully' });
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  socket.on('MATCH_CONFIRMED', (data) => {
    console.log('MATCH_CONFIRMED Event Received:', data);
    // Broadcast match to all clients
    io.emit('MATCH_CONFIRMED', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
