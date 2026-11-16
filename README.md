---
title: Captionize Studio
emoji: 🎬
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 3000
---

# Captionize

A high-performance audio and video transcription, translation, and subtitle studio (Uniscribe clone). Convert MP4, MP3, WAV, and M4A files to accurate, synchronized text, and export ready-to-use `.srt`, `.vtt`, and `.txt` subtitles.

---

## Highlights

- **Side-by-Side Studio Layout**: Video player, playback overlay, configuration, and AI content overview on the left, paired side-by-side with the real-time Subtitles Track editor on the right.
- **Paced Subtitle Timing (Max 4 Words)**: Strict caption length limit of **max 4 words** per track or split earlier at punctuation (`.,!?`), generating clean, easy-to-read captions suitable for social media, YouTube shorts, reels, and standard video players.
- **Clean Caption Typography**: Omits period punctuation (`.`) and starts lines in lowercase for natural caption readability.
- **1-Click Case Toggle**: Dedicated toggle on the subtitle toolbar to instantly switch all captions between **lowercase (`aa`)** and **UPPERCASE (`AA`)**, updating the live video overlay and export files in real time.
- **Multilingual & Mixed-Language Support**: Auto-detects code-switching across **Bahasa Indonesia**, **English**, and **Mandarin Chinese**, with the ability to choose a primary anchor language.
- **Multi-Speaker & Overlapping Speech**: Automatically detects different speakers (`Speaker 1`, `Speaker 2`), tags simultaneous overlapping dialogue, and renders both speakers concurrently on the video preview and export files.
- **Clean Light / White Studio Theme**: Crisp white and light slate workspace (`#F8FAFC` ground, `#FFFFFF` surfaces, `#0F172A` ink, `#2563EB` accent) with smooth rounded corners.
- **Synchronized Media Player**: Supports both Video (`.mp4`, `.webm`, `.mov`) and Audio (`.mp3`, `.wav`, `.m4a`, `.flac`) with real-time on-screen subtitle preview overlay.
- **Interactive Subtitle Editor**: Click any timestamp to jump the media player; active segment highlights and auto-scrolls with playback; inline text editing, custom start/end time adjustments, and line add/delete.
- **Export Ready**: Instant export to SubRip (`.srt`), WebVTT (`.vtt`), formatted text (`.txt`), or direct clipboard copy.
- **AI Summary & Key Takeaways**: Generates a content overview and bullet points for lectures, podcasts, or meeting recordings.

---

## Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **FFmpeg** (installed and available on your system `PATH`)

### 2. Installation
```powershell
npm install
```

### 3. API Key Configuration
Your Google Gemini API key is configured in `.env`:
```env
GOOGLE_API_KEY=your_key_here
PORT=3000
```

### 4. Run the Server
```powershell
npm start
```

Visit **http://localhost:3000** in your web browser.

---

## Deploy to Render (Free Tier)

This project is fully containerized and pre-configured for free deployment on [Render](https://render.com).

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit for Captionize Studio"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### 2. Deploy on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`captionize`).
4. Render will automatically detect the `Dockerfile` or `render.yaml`.
5. Under **Environment Variables**, add:
   - Key: `GOOGLE_API_KEY`
   - Value: `your_gemini_api_key_here`
6. Click **Create Web Service**.

Render will build the Docker container (with Node.js and FFmpeg included) and provide you with a live HTTPS URL (e.g. `https://captionize-xxxx.onrender.com`).

---

## How It Works

1. **Upload**: Drag and drop any media file (MP4, MP3, WAV, M4A, etc.).
2. **Select Action & Language**:
   - Choose **Transcribe** or **Translate**.
   - Choose **Auto Detect Mixed (ID / EN / ZH)** or pick a specific primary language.
   - Choose Speaker Attribution format (`[Speaker 1]`, `- Dash`, or clean text).
3. **Generate**: Click **Generate Subtitles**. Captionize extracts audio, queries Gemini models (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, etc.) with automatic fallback, and produces timestamped JSON.
4. **Edit & Sync**: The side-by-side workspace allows you to watch the video on the left while editing subtitle tracks on the right.
5. **Toggle Case**: Click **`aa`** or **`AA`** to instantly set all captions to lowercase or UPPERCASE.
6. **Export**: Click **Export SRT** to download subtitles for Premiere Pro, DaVinci Resolve, YouTube, CapCut, or VLC.

---

## License
MIT
