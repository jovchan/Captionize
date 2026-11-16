const https = require('https');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

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
    const apiKey = process.env.GOOGLE_API_KEY || GOOGLE_API_KEY;
    if (!apiKey) {
      return reject(new Error('GOOGLE_API_KEY tidak terkonfigurasi di environment variables'));
    }

    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/wav',
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
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 60000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('Respons kosong dari Gemini'));
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
            reject(new Error(errJson.error?.message || `Gemini API error HTTP ${res.statusCode}`));
          } catch {
            reject(new Error(`Gemini API error HTTP ${res.statusCode}`));
          }
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out after 60s'));
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
      const res = await callGeminiREST(model, audioBase64, mimeType, prompt);
      return { model, data: res };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Semua model Gemini gagal.');
}

function sanitizeCaptionText(text) {
  if (!text) return '';
  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/\./g, '');
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }
  return cleaned.trim();
}

function splitSegmentByWordsAndPunctuation(seg) {
  const text = (seg.text || '').trim();
  if (!text) return [];

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

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioBase64, mimeType = 'audio/wav', language = 'auto', mode = 'transcribe', duration = 0 } = req.body || {};

    if (!audioBase64) {
      return res.status(400).json({ error: 'Tidak ada data audio yang diterima.' });
    }

    const prompt = buildGeminiPrompt({ mode, targetLanguage: language });
    const geminiResult = await queryGeminiWithFallback(audioBase64, mimeType, prompt);

    let rawSegments = [];
    let detectedLanguage = language || 'id';
    let detectedSpeakers = ['Speaker 1'];

    const parsedData = geminiResult.data;
    if (Array.isArray(parsedData)) {
      rawSegments = parsedData;
    } else if (parsedData && Array.isArray(parsedData.segments)) {
      rawSegments = parsedData.segments;
      if (parsedData.language) detectedLanguage = parsedData.language;
      if (Array.isArray(parsedData.speakers)) detectedSpeakers = parsedData.speakers;
    }

    // Terapkan batasan: maksimal 4 kata per segmen dan tanpa tanda baca titik
    const enforcedSegments = [];
    for (const rawSeg of rawSegments) {
      enforcedSegments.push(...splitSegmentByWordsAndPunctuation({
        ...rawSeg,
        speaker: rawSeg.speaker || 'Speaker 1',
        lang: rawSeg.lang || detectedLanguage,
      }));
    }

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

    res.status(200).json({
      success: true,
      engine: `Google Gemini (${geminiResult.model})`,
      duration: duration || (finalSegments.length ? finalSegments[finalSegments.length - 1].end : 0),
      language: detectedLanguage,
      summary,
      keyPoints: [],
      speakers: finalSpeakers.length ? finalSpeakers : detectedSpeakers,
      segments: finalSegments,
    });
  } catch (err) {
    console.error('[Error] Transkripsi gagal:', err);
    res.status(500).json({
      error: err.message || 'Terjadi kesalahan saat memproses audio.',
    });
  }
};
