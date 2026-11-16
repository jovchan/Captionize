require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');

const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const UPLOAD_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'captionize_uploads') : path.join(__dirname, 'uploads');
const PYTHON_PATH = 'python';

try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  // Ignore in read-only serverless environments
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Multer Storage ──────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  fileFilter: (req, file, cb) => {
    if (/\.(mp3|mp4|wav|flac|m4a|webm|ogg|mkv|mov|aac|wma)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Didukung: MP3, MP4, WAV, FLAC, M4A, WebM, OGG, MKV, MOV.'));
    }
  },
});

// ── Shell / FFmpeg Helpers ──────────────────────────────────

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

async function hasFFmpeg() {
  try {
    await execCommand('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

async function getMediaDuration(filePath) {
  try {
    const out = await execCommand(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
    );
    return parseFloat(out.trim()) || 0;
  } catch (e) {
    return 0;
  }
}

async function extractAudio(inputPath, outputPath) {
  // Extract to 16kHz mono 64kbps MP3 for fast upload & processing
  await execCommand(
    `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 64k "${outputPath}" -y`
  );
}

// ── Google Gemini Transcription ─────────────────────────────

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
];

function buildGeminiPrompt({ mode, targetLanguage }) {
  let langLabel = 'Bahasa Indonesia';
  if (targetLanguage === 'en') langLabel = 'English';
  else if (targetLanguage === 'zh') langLabel = 'Mandarin Chinese';
  else if (targetLanguage === 'auto' || !targetLanguage) langLabel = 'Auto Detect Mixed (Indonesian / English / Mandarin)';

  return `You are a professional audio transcriber and subtitler, creating high-accuracy subtitle tracks for multi-speaker, mixed-language video and audio.
PRIMARY TARGET LANGUAGE CONTEXT: ${langLabel}

STRICT RULES:
1. Accurately transcribe spoken words with precise start and end timestamps in seconds (float, e.g. 1.25).
2. If 2 speakers speak at the same time (overlapping/simultaneous speech), output separate segments for each speaker with overlapping timestamps.
3. STRICT SUBTITLE LENGTH LIMIT: Each subtitle segment MUST contain a MAXIMUM of 4 words, or cut earlier if a punctuation mark occurs. Never exceed 4 words in a single subtitle segment.
4. Do NOT put period (.) punctuation marks at the end of captions.
5. Start subtitle phrases in lowercase.

Output valid JSON adhering to this exact schema:
{
  "language": "${langLabel}",
  "speakers": ["Speaker 1", "Speaker 2"],
  "segments": [
    {
      "start": 0.0,
      "end": 1.2,
      "speaker": "Speaker 1",
      "lang": "id",
      "text": "halo semuanya"
    }
  ]
}`;
}

function callGeminiREST(modelName, audioBase64, mimeType, prompt) {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_API_KEY) {
      return reject(new Error('GOOGLE_API_KEY tidak terkonfigurasi di file .env'));
    }

    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 120000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
              return reject(new Error('Respons kosong dari model Gemini.'));
            }
            try {
              resolve(JSON.parse(text));
            } catch {
              const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
              resolve(JSON.parse(cleaned));
            }
          } catch (err) {
            reject(new Error(`Gagal mem-parsing JSON Gemini: ${err.message}`));
          }
        } else {
          try {
            const errJson = JSON.parse(data);
            const msg = errJson.error?.message || `HTTP ${res.statusCode}`;
            const errorObj = new Error(msg);
            errorObj.statusCode = res.statusCode;
            reject(errorObj);
          } catch {
            reject(new Error(`Gemini API error (HTTP ${res.statusCode})`));
          }
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out after 120s.'));
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function queryGeminiWithFallback(audioBase64, mimeType, prompt) {
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Gemini] Mencoba model: ${model}...`);
      const res = await callGeminiREST(model, audioBase64, mimeType, prompt);
      console.log(`[Gemini] Model ${model} sukses menghasilkan transkripsi.`);
      return { model, data: res };
    } catch (err) {
      console.warn(`[Gemini] Model ${model} gagal: ${err.message}`);
      lastErr = err;
    }
  }
  throw lastErr || new Error('Semua model Gemini gagal.');
}

// ── Whisper Local Python Fallback ───────────────────────────

function runLocalWhisper(audioPath, language, mode) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'whisper_transcribe.py');
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error('whisper_transcribe.py tidak ditemukan.'));
    }

    const args = [scriptPath, audioPath, language || 'auto', mode || 'transcribe'];
    console.log(`[Whisper Fallback] Menjalankan transkripsi lokal via Python: ${path.basename(audioPath)}...`);
    const proc = spawn(PYTHON_PATH, args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python exit with code ${code}`));
      }
      try {
        const json = JSON.parse(stdout.trim());
        if (!json.success) {
          return reject(new Error(json.error || 'Whisper transkripsi gagal.'));
        }
        resolve(json);
      } catch (err) {
        reject(new Error(`Gagal mem-parsing output Whisper: ${stdout || stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Gagal menjalankan Python Whisper: ${err.message}`));
    });
  });
}

// ── Caption Formatting & Word Splitting ─────────────────────

function sanitizeCaptionText(text) {
  if (!text) return '';
  let cleaned = String(text).trim();
  // Hilangkan tanda baca titik (.)
  cleaned = cleaned.replace(/\./g, '');
  // Huruf kecil pada awal kalimat
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }
  return cleaned.trim();
}

function splitSegmentByWordsAndPunctuation(seg) {
  const text = (seg.text || '').trim();
  if (!text) return [];

  // Jika ada data word timestamps dari Whisper/Gemini
  if (seg.words && seg.words.length) {
    const chunks = [];
    let curWords = [];

    for (let i = 0; i < seg.words.length; i++) {
      const w = seg.words[i];
      curWords.push(w);

      const hasPunc = /[.,!?:;]$/.test(w.word);
      if (hasPunc || curWords.length >= 4 || i === seg.words.length - 1) {
        const chunkText = curWords.map((cw) => cw.word).join(' ');
        const start = curWords[0].start;
        const end = curWords[curWords.length - 1].end;
        chunks.push({
          start,
          end: Math.max(end, start + 0.3),
          speaker: seg.speaker || 'Speaker 1',
          lang: seg.lang || '',
          text: sanitizeCaptionText(chunkText),
        });
        curWords = [];
      }
    }
    return chunks;
  }

  // Pemecahan manual per kata jika word timestamps tidak tersedia
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const speaker = seg.speaker || 'Speaker 1';
  const lang = seg.lang || '';

  const chunks = [];
  let currentWords = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentWords.push(w);

    const hasPunctuation = /[.,!?:;]$/.test(w);
    if (hasPunctuation || currentWords.length >= 4 || i === words.length - 1) {
      chunks.push(currentWords.join(' '));
      currentWords = [];
    }
  }

  if (chunks.length <= 1) {
    return [{
      start: typeof seg.start === 'number' ? seg.start : parseFloat(seg.start) || 0,
      end: typeof seg.end === 'number' ? seg.end : parseFloat(seg.end) || 0,
      speaker,
      lang,
      text: sanitizeCaptionText(chunks[0] || text),
    }];
  }

  const sStart = typeof seg.start === 'number' ? seg.start : parseFloat(seg.start) || 0;
  const sEnd = typeof seg.end === 'number' ? seg.end : parseFloat(seg.end) || 0;
  const totalDuration = Math.max(0.2, sEnd - sStart);
  const totalWords = words.length;
  let curStart = sStart;
  const result = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkWords = chunks[i].split(/\s+/).length;
    const chunkDur = (chunkWords / totalWords) * totalDuration;
    const curEnd = i === chunks.length - 1 ? sEnd : Math.round((curStart + chunkDur) * 100) / 100;
    result.push({
      start: Math.round(curStart * 100) / 100,
      end: Math.round(curEnd * 100) / 100,
      speaker,
      lang,
      text: sanitizeCaptionText(chunks[i]),
    });
    curStart = curEnd;
  }
  return result;
}

// ── File Cleanup ────────────────────────────────────────────

function removeFilesSafely(...filePaths) {
  for (const fp of filePaths) {
    if (!fp) continue;
    try {
      if (fs.existsSync(fp)) {
        if (fs.statSync(fp).isDirectory()) {
          fs.rmSync(fp, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fp);
        }
      }
    } catch (e) {
      console.warn(`[Cleanup] Error removing ${fp}:`, e.message);
    }
  }
}

// ── Endpoints ───────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  const ffmpegOk = await hasFFmpeg();
  res.json({
    status: 'ok',
    engine: 'Google Gemini (gemini-3.5-flash-lite / flash)',
    apiKeyConfigured: Boolean(GOOGLE_API_KEY),
    ffmpeg: ffmpegOk,
  });
});

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  const cleanupList = [];

  try {
    const mode = req.body.mode || 'transcribe';
    const targetLanguage = req.body.language || 'auto';

    // ── Direct Base64 Audio Path (Vercel-compatible & Web Audio API) ──
    if (req.body && req.body.audioBase64) {
      console.log(`[Transcribe] Menerima base64 audio langsung (${Math.round(req.body.audioBase64.length / 1024)}KB)`);
      const audioBase64 = req.body.audioBase64;
      const mimeType = req.body.mimeType || 'audio/wav';
      const prompt = buildGeminiPrompt({ mode, targetLanguage });

      const geminiResult = await queryGeminiWithFallback(audioBase64, mimeType, prompt);
      const parsedData = geminiResult.data;

      let rawSegments = [];
      let detectedLanguage = targetLanguage || 'id';
      let detectedSpeakers = ['Speaker 1'];

      if (Array.isArray(parsedData)) {
        rawSegments = parsedData;
      } else if (parsedData && Array.isArray(parsedData.segments)) {
        rawSegments = parsedData.segments;
        if (parsedData.language) detectedLanguage = parsedData.language;
        if (Array.isArray(parsedData.speakers)) detectedSpeakers = parsedData.speakers;
      }

      const enforcedSegments = [];
      for (const rawSeg of rawSegments) {
        enforcedSegments.push(...splitSegmentByWordsAndPunctuation({
          ...rawSeg,
          speaker: rawSeg.speaker || 'Speaker 1',
          lang: rawSeg.lang || detectedLanguage,
        }));
      }

      enforcedSegments.sort((a, b) => a.start - b.start);

      for (let i = 0; i < enforcedSegments.length; i++) {
        const current = enforcedSegments[i];
        current.isOverlap = false;
        for (let j = 0; j < enforcedSegments.length; j++) {
          if (i === j) continue;
          const other = enforcedSegments[j];
          const overlaps = Math.max(current.start, other.start) < Math.min(current.end, other.end);
          if (overlaps && current.speaker !== other.speaker) {
            current.isOverlap = true;
            break;
          }
        }
      }

      const finalSegments = enforcedSegments.map((seg, idx) => ({
        id: idx + 1,
        start: typeof seg.start === 'number' ? Math.round(seg.start * 100) / 100 : parseFloat(seg.start) || 0,
        end: typeof seg.end === 'number' ? Math.round(seg.end * 100) / 100 : parseFloat(seg.end) || 0,
        speaker: seg.speaker || 'Speaker 1',
        lang: seg.lang || detectedLanguage || '',
        isOverlap: Boolean(seg.isOverlap),
        text: sanitizeCaptionText(seg.text),
      }));

      const finalSpeakers = Array.from(new Set(finalSegments.map((s) => s.speaker)));
      const fullText = finalSegments.map((s) => s.text).join(' ');
      const summary = fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;

      return res.json({
        success: true,
        engine: `Google Gemini (${geminiResult.model})`,
        duration: req.body.duration || (finalSegments.length ? finalSegments[finalSegments.length - 1].end : 0),
        language: detectedLanguage,
        summary,
        keyPoints: [],
        speakers: finalSpeakers.length ? finalSpeakers : detectedSpeakers,
        segments: finalSegments,
      });
    }

    // ── Multipart File Path (Fallback) ──
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file audio atau video yang diunggah.' });
    }

    const uploadedPath = req.file.path;
    cleanupList.push(uploadedPath);

    console.log(`[Upload] Menerima: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(1)}MB)`);
    console.log(`[Config] Mode: ${mode}, Target Language: ${targetLanguage}`);

    // FFmpeg: konversi audio ke MP3 16kHz mono 64kbps
    const ffmpegInstalled = await hasFFmpeg();
    let audioPath = uploadedPath;

    if (ffmpegInstalled) {
      const convertedAudio = uploadedPath.replace(/\.[^.]+$/, '') + '_audio.mp3';
      cleanupList.push(convertedAudio);
      console.log('[FFmpeg] Mengekstrak audio ke MP3 16kHz mono...');
      await extractAudio(uploadedPath, convertedAudio);
      audioPath = convertedAudio;
    }

    const duration = ffmpegInstalled ? await getMediaDuration(audioPath) : 0;
    console.log(`[Media] Durasi: ${duration.toFixed(1)}s`);

    let rawSegments = [];
    let detectedLanguage = targetLanguage || 'id';
    let detectedSpeakers = ['Speaker 1'];
    let activeEngine = 'Google Gemini';

    // 1. Prioritas Utama: Google Gemini REST API
    try {
      console.log('[Transcribe] Memulai transkripsi menggunakan Google Gemini...');
      const audioBuffer = fs.readFileSync(audioPath);
      const audioBase64 = audioBuffer.toString('base64');
      const prompt = buildGeminiPrompt({ mode, targetLanguage });

      const geminiResult = await queryGeminiWithFallback(audioBase64, 'audio/mp3', prompt);
      activeEngine = `Google Gemini (${geminiResult.model})`;

      const parsedData = geminiResult.data;
      if (Array.isArray(parsedData)) {
        rawSegments = parsedData;
      } else if (parsedData && Array.isArray(parsedData.segments)) {
        rawSegments = parsedData.segments;
        if (parsedData.language) detectedLanguage = parsedData.language;
        if (Array.isArray(parsedData.speakers)) detectedSpeakers = parsedData.speakers;
      }
      console.log(`[Gemini] Sukses mengekstrak ${rawSegments.length} raw segments.`);
    } catch (geminiErr) {
      console.warn(`[Gemini Error] ${geminiErr.message}. Beralih ke fallback Whisper...`);
      // Fallback ke local Whisper jika Gemini gagal
      try {
        const whisperResult = await runLocalWhisper(audioPath, targetLanguage, mode);
        activeEngine = 'Whisper Local (Fallback)';
        rawSegments = whisperResult.raw_segments || [];
        detectedLanguage = whisperResult.language || targetLanguage;
        console.log(`[Whisper Fallback] Sukses mengekstrak ${rawSegments.length} raw segments.`);
      } catch (whisperErr) {
        throw new Error(`Transkripsi gagal. Gemini: ${geminiErr.message}. Whisper fallback: ${whisperErr.message}`);
      }
    }

    // Terapkan batasan: maksimal 4 kata per segmen atau potong pada tanda baca
    const enforcedSegments = [];
    for (const rawSeg of rawSegments) {
      enforcedSegments.push(...splitSegmentByWordsAndPunctuation({
        ...rawSeg,
        speaker: rawSeg.speaker || 'Speaker 1',
        lang: rawSeg.lang || detectedLanguage,
      }));
    }

    // Urutkan segmen secara kronologis
    enforcedSegments.sort((a, b) => a.start - b.start);

    // Deteksi overlapping speech
    for (let i = 0; i < enforcedSegments.length; i++) {
      const current = enforcedSegments[i];
      current.isOverlap = false;
      for (let j = 0; j < enforcedSegments.length; j++) {
        if (i === j) continue;
        const other = enforcedSegments[j];
        const overlaps = Math.max(current.start, other.start) < Math.min(current.end, other.end);
        if (overlaps && current.speaker !== other.speaker) {
          current.isOverlap = true;
          break;
        }
      }
    }

    // Normalisasi ID dan atribut segmen akhir
    const finalSegments = enforcedSegments.map((seg, idx) => ({
      id: idx + 1,
      start: typeof seg.start === 'number' ? Math.round(seg.start * 100) / 100 : parseFloat(seg.start) || 0,
      end: typeof seg.end === 'number' ? Math.round(seg.end * 100) / 100 : parseFloat(seg.end) || 0,
      speaker: seg.speaker || 'Speaker 1',
      lang: seg.lang || detectedLanguage || '',
      isOverlap: Boolean(seg.isOverlap),
      text: sanitizeCaptionText(seg.text),
    }));

    const finalSpeakers = Array.from(new Set(finalSegments.map((s) => s.speaker)));
    const fullText = finalSegments.map((s) => s.text).join(' ');
    const summary = fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;

    console.log(`[Done] Sukses menghasilkan ${finalSegments.length} baris subtitle menggunakan ${activeEngine}.`);
    removeFilesSafely(...cleanupList);

    res.json({
      success: true,
      engine: activeEngine,
      duration: duration || (finalSegments.length ? finalSegments[finalSegments.length - 1].end : 0),
      language: detectedLanguage,
      summary,
      keyPoints: [],
      speakers: finalSpeakers.length ? finalSpeakers : detectedSpeakers,
      segments: finalSegments,
    });

  } catch (err) {
    removeFilesSafely(...cleanupList);
    console.error('[Error] Transkripsi gagal:', err);
    res.status(500).json({
      error: err.message || 'Terjadi kesalahan saat memproses audio.',
    });
  }
});

// ── Export & Boot ───────────────────────────────────────────

module.exports = app;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n=================================================`);
    console.log(`  Captionize Studio: http://0.0.0.0:${PORT}`);
    console.log(`=================================================`);
    const ffmpegOk = await hasFFmpeg();
    console.log(`  Engine       : Google Gemini (${GEMINI_MODELS[0]})`);
    console.log(`  API Key      : ${GOOGLE_API_KEY ? 'Configured & Active' : 'Missing'}`);
    console.log(`  FFmpeg Status: ${ffmpegOk ? 'Detected & Ready' : 'Not Found'}`);
    console.log(`  Fallback     : Local Whisper AI\n`);
  });
}
