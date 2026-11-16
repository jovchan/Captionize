/**
 * Captionize Studio — Video & Subtitle Single-Screen Workspace
 * VEED.IO layout implementation with:
 * - OpenAI Whisper transcription backend
 * - Ctrl+Z Undo / Ctrl+Y Redo history stack
 * - Left/Right drag handles on timeline subtitle bars (trim duration)
 * - Draggable subtitle cards in drawer & timeline for re-ordering
 * - Multi-track subtitle rows (stacked vertically when overlapping)
 * - Subtitle Style Configuration Panel (Speaker 1, 2, Clean text, presets, positioning)
 * - Per-bar case toggle (aa/AA) + Global all-subtitles case switcher
 * - Real-time playback synchronization, audio waveform & live overlay
 */

(function () {
  'use strict';

  // ── Element Selectors ───────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  // Top bar
  const projectTitleInput = $('project-title-input');
  const btnUndo = $('btn-undo');
  const btnRedo = $('btn-redo');
  const btnCaseLower = $('btn-case-lower');
  const btnCaseUpper = $('btn-case-upper');
  const btnReplaceMedia = $('btn-replace-media');
  const btnDoneTrigger = $('btn-done-trigger');
  const exportMenu = $('export-menu');
  const btnExportSrt = $('btn-export-srt');
  const btnExportVtt = $('btn-export-vtt');
  const btnExportTxt = $('btn-export-txt');
  const btnCopyAll = $('btn-copy-all');

  // Drawer / Subtitles & Views
  const drawerMainTitle = $('drawer-main-title');
  const tabStyle = $('tab-style');
  const tabEdit = $('tab-edit');
  const subtitlesEditView = $('subtitles-edit-view');
  const subtitlesStyleView = $('subtitles-style-view');

  const targetLanguage = $('target-language');
  const btnToggleOptions = $('btn-toggle-options');
  const drawerOptionsStrip = $('drawer-options-strip');
  const transcriptionMode = $('transcription-mode');
  const speakerFormat = $('speaker-format');
  const btnStartTranscribe = $('btn-start-transcribe');
  const btnGenerateLabel = $('btn-generate-label');
  const drawerProgress = $('drawer-progress');
  const progressBarFill = $('progress-bar-fill');
  const processingMessage = $('processing-message');
  const subtitlesListContainer = $('subtitles-list-container');
  const subtitlesEmptyState = $('subtitles-empty-state');
  const btnAddSegment = $('btn-add-segment');

  // Style panel controls
  const toggleSpeakerColor = $('toggle-speaker-color');
  const positionBtnGrid = $('position-btn-grid');
  const presetList = $('preset-list');
  const fontsizeBtnGrid = $('fontsize-btn-grid');
  const toggleBoxBg = $('toggle-box-bg');
  const boxBgSliderRow = $('box-bg-slider-row');
  const bgOpacitySlider = $('bg-opacity-slider');
  const opacityLabel = $('opacity-label');

  // Stage / Canvas
  const canvasFrame = $('canvas-frame');
  const dropZone = $('drop-zone');
  const btnBrowseFile = $('btn-browse-file');
  const fileInput = $('file-input');
  const videoEl = $('video-element');
  const audioEl = $('audio-element');
  const videoOverlay = $('video-caption-overlay');
  const btnCleanAudio = $('btn-clean-audio');
  const btnAspectToggle = $('btn-aspect-toggle');
  const aspectLabel = $('aspect-label');
  const aspectDropdownMenu = $('aspect-dropdown-menu');

  // Toolbar Adjusters & Popovers (Volume, Background, Text Color)
  const btnVolumeToggle = $('btn-volume-toggle');
  const volumePopover = $('volume-popover');
  const volIconHigh = $('vol-icon-high');
  const volIconMuted = $('vol-icon-muted');
  const volumeLevelLabel = $('volume-level-label');
  const stageVolumeSlider = $('stage-volume-slider');
  const volSliderText = $('vol-slider-text');

  const btnBgToggle = $('btn-bg-toggle');
  const bgColorDropdown = $('bg-color-dropdown');
  const bgColorDot = $('bg-color-dot');
  const bgPaletteGrid = $('bg-palette-grid');
  const bgNativeColor = $('bg-native-color');
  const bgHexInput = $('bg-hex-input');

  const btnTextColorToggle = $('btn-text-color-toggle');
  const textColorDropdown = $('text-color-dropdown');
  const textColorDot = $('text-color-dot');
  const textPaletteGrid = $('text-palette-grid');
  const textNativeColor = $('text-native-color');
  const textHexInput = $('text-hex-input');

  const btnStageSettings = $('btn-stage-settings');
  const stageErrorToast = $('stage-error-toast');
  const toastMessage = $('toast-message');
  const btnDismissToast = $('btn-dismiss-toast');

  // Left Rail Navigation (Subtitles vs Text Fonts)
  const btnRailSubtitles = $('btn-rail-subtitles');
  const btnRailText = $('btn-rail-text');
  const textStyleView = $('text-style-view');

  // Upload Modal (VEED style "Let's make a video")
  const uploadModalBackdrop = $('upload-modal-backdrop');
  const uploadModalCard = $('upload-modal-card');
  const btnModalClose = $('btn-modal-close');
  const modalDropArea = $('modal-drop-area');
  const btnModalUploadBtn = $('btn-modal-upload-btn');
  const btnModalAiTalking = $('btn-modal-ai-talking');
  const btnModalRecord = $('btn-modal-record');
  const btnModalPhone = $('btn-modal-phone');

  // Native Camera Capture & Desktop Webcam Recorder
  const cameraCaptureInput = $('camera-capture-input');
  const webcamModalBackdrop = $('webcam-modal-backdrop');
  const btnWebcamClose = $('btn-webcam-close');
  const webcamPreviewVideo = $('webcam-preview-video');
  const btnWebcamStart = $('btn-webcam-start');
  const btnWebcamStop = $('btn-webcam-stop');
  const btnWebcamDeviceSwitch = $('btn-webcam-device-switch');
  const webcamRecBadge = $('webcam-rec-badge');
  const webcamRecTimer = $('webcam-rec-timer');

  // Timeline
  const studioTimeline = $('studio-timeline');
  const btnCollapseTl = $('btn-collapse-tl');
  const btnSplitAtPlayhead = $('btn-split-at-playhead');
  const btnAddSubtitleTl = $('btn-add-subtitle-tl');
  const btnSkipBackward = $('btn-skip-backward');
  const btnPlayPause = $('btn-play-pause');
  const iconPlay = $('icon-play');
  const iconPause = $('icon-pause');
  const btnSkipForward = $('btn-skip-forward');
  const timeDisplay = $('time-display');
  const timelineZoomSlider = $('timeline-zoom-slider');
  const btnZoomIn = $('btn-zoom-in');
  const btnZoomOut = $('btn-zoom-out');
  const btnFitTimeline = $('btn-fit-timeline');

  const timelineViewport = $('timeline-viewport');
  const timelineTracksInner = $('timeline-tracks-inner');
  const rulerTicks = $('ruler-ticks');
  const timelinePlayhead = $('timeline-playhead');
  const playheadHandle = $('playhead-handle');
  const timelineSubtitlesTrack = $('timeline-subtitles-track');
  const timelineMediaTrack = $('timeline-media-track');
  const waveformCanvas = $('waveform-canvas');

  // ── Application State ───────────────────────────────────────
  let activeFile = null;
  let activePlayer = null;
  let mediaDuration = 0;
  let segments = [];
  let selectedSegmentIndex = null;
  let globalCaseMode = 'lower'; // 'lower' (aa) vs 'upper' (AA)
  let zoomLevel = 1.0;
  let isTimelineCollapsed = false;
  let isScrubbing = false;
  let audioBuffer = null;

  // Active trim or horizontal dragging state on timeline
  let activeTrimOrDrag = null;
  let draggedCardIndex = null;

  // Subtitle Style Configuration (Speaker, Position, Preset, Font size, Font family, Text color, Box background)
  const subtitleStyle = {
    speakerFormat: 'clean', // clean subtitle default (no speaker tag)
    showSpeakerColor: false,
    position: 'bottom', // 'bottom' | 'middle' | 'top'
    preset: 'reels', // 'reels' | 'cinema' | 'pill' | 'yellow'
    fontSize: 'medium', // 'small' | 'medium' | 'large' | 'xlarge'
    boxOpacity: 0.75, // 0 to 1
    showBoxBg: true, // on/off toggle for subtitle box background
    boxBgColor: '#000000', // Subtitle box background color
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'none',
  };

  // Base pixels per second on the timeline (50px = ~1.3cm on 96DPI screen)
  const BASE_PPS = 50;

  function getPixelsPerSecond() {
    return BASE_PPS * zoomLevel;
  }

  function timeToPx(sec) {
    return Math.round(sec * getPixelsPerSecond() * 10) / 10;
  }

  function pxToTime(px) {
    const dur = mediaDuration || 10;
    return Math.max(0, Math.min(dur, px / getPixelsPerSecond()));
  }

  // ── Undo / Redo History Stack ───────────────────────────────
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 60;

  function pushHistory(actionName = 'Edit') {
    undoStack.push({
      segments: JSON.parse(JSON.stringify(segments)),
      globalCase: globalCaseMode,
      style: JSON.parse(JSON.stringify(subtitleStyle)),
      action: actionName,
    });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }

  function undo() {
    if (!undoStack.length) {
      showToast('Nothing to undo');
      return;
    }
    const prevState = undoStack.pop();
    redoStack.push({
      segments: JSON.parse(JSON.stringify(segments)),
      globalCase: globalCaseMode,
      style: JSON.parse(JSON.stringify(subtitleStyle)),
      action: 'Current state',
    });

    segments = prevState.segments || [];
    globalCaseMode = prevState.globalCase || 'lower';
    if (prevState.style) {
      Object.assign(subtitleStyle, prevState.style);
      syncStyleUI();
    }

    updateGlobalCaseButtons();
    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    updateLiveOverlay();
    updateHistoryButtons();
    setSelectedSegment(null);
    showToast(`Undo: ${prevState.action}`);
  }

  function redo() {
    if (!redoStack.length) {
      showToast('Nothing to redo');
      return;
    }
    const nextState = redoStack.pop();
    undoStack.push({
      segments: JSON.parse(JSON.stringify(segments)),
      globalCase: globalCaseMode,
      style: JSON.parse(JSON.stringify(subtitleStyle)),
      action: 'Previous state',
    });

    segments = nextState.segments || [];
    globalCaseMode = nextState.globalCase || 'lower';
    if (nextState.style) {
      Object.assign(subtitleStyle, nextState.style);
      syncStyleUI();
    }

    updateGlobalCaseButtons();
    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    updateLiveOverlay();
    updateHistoryButtons();
    setSelectedSegment(null);
    showToast(`Redo: ${nextState.action}`);
  }

  function updateHistoryButtons() {
    if (btnUndo) {
      btnUndo.disabled = undoStack.length === 0;
      btnUndo.classList.toggle('disabled', undoStack.length === 0);
    }
    if (btnRedo) {
      btnRedo.disabled = redoStack.length === 0;
      btnRedo.classList.toggle('disabled', redoStack.length === 0);
    }
  }

  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);

  // ── Selected Subtitle Management (Keyboard Delete & Highlight) ─
  function setSelectedSegment(index) {
    selectedSegmentIndex = index;
    document.querySelectorAll('.subtitle-card').forEach((card) => {
      const idx = parseInt(card.dataset.index, 10);
      card.classList.toggle('selected-card', idx === index);
    });
    document.querySelectorAll('.timeline-subtitle-block').forEach((block) => {
      const idx = parseInt(block.dataset.index, 10);
      block.classList.toggle('selected-block', idx === index);
    });
  }

  // ── Multi-Track Track Assignment (Overlapping Subtitles) ─────

  function assignSubtitleTracks(segs) {
    if (!segs || !segs.length) {
      adjustTimelineTrackHeight(1);
      return 1;
    }

    // Sort by start time for interval allocation
    const sorted = segs.map((s, idx) => ({ seg: s, idx })).sort((a, b) => a.seg.start - b.seg.start);
    const trackEndTimes = [];

    sorted.forEach(({ seg }) => {
      let placed = false;
      for (let t = 0; t < trackEndTimes.length; t++) {
        // Buffer of 0.05s allows adjacent subtitles to share track 0 without collision
        if (trackEndTimes[t] <= seg.start + 0.05) {
          seg.track = t;
          trackEndTimes[t] = seg.end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        seg.track = trackEndTimes.length;
        trackEndTimes.push(seg.end);
      }
    });

    const totalTracks = Math.max(1, trackEndTimes.length);
    adjustTimelineTrackHeight(totalTracks);
    return totalTracks;
  }

  function adjustTimelineTrackHeight(totalTracks) {
    const trackH = Math.max(42, totalTracks * 38 + 6);
    timelineSubtitlesTrack.style.height = `${trackH}px`;
    timelineMediaTrack.style.top = `${trackH + 36}px`;

    if (!isTimelineCollapsed) {
      const baseHeight = 190;
      const extraHeight = (totalTracks - 1) * 38;
      studioTimeline.style.height = `${baseHeight + extraHeight}px`;
    }
  }

  // ── Punctuation & Letter Case Formatting ────────────────────

  function sanitizeCaptionText(raw) {
    if (!raw) return '';
    // Strip period marks (.) per user rules
    let cleaned = String(raw).replace(/\./g, '').trim();
    return cleaned;
  }

  function formatCaptionText(raw, itemCaseMode = null) {
    let s = sanitizeCaptionText(raw);
    const mode = itemCaseMode || globalCaseMode;
    if (mode === 'upper') {
      return s.toUpperCase();
    } else {
      // Lowercase initial letter & entire string unless proper noun
      return s.toLowerCase();
    }
  }

  // ── Global Case Toggle (Top Bar: aa vs AA) ───────────────────

  function setGlobalCaseMode(mode) {
    pushHistory(`Switch all to ${mode.toUpperCase()}`);
    globalCaseMode = mode;
    updateGlobalCaseButtons();

    // Apply to every single segment
    segments.forEach((seg) => {
      seg.caseMode = mode;
      seg.text = mode === 'upper' ? seg.text.toUpperCase() : seg.text.toLowerCase();
    });

    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    updateLiveOverlay();
    showToast(`All subtitles set to ${mode === 'upper' ? 'UPPERCASE' : 'lowercase'}`);
  }

  function updateGlobalCaseButtons() {
    if (globalCaseMode === 'lower') {
      btnCaseLower.classList.add('active');
      btnCaseUpper.classList.remove('active');
    } else {
      btnCaseUpper.classList.add('active');
      btnCaseLower.classList.remove('active');
    }
  }

  btnCaseLower.addEventListener('click', () => setGlobalCaseMode('lower'));
  btnCaseUpper.addEventListener('click', () => setGlobalCaseMode('upper'));

  // ── Subtitle Drawer Tab Switcher (Edit vs Style) ────────────

  tabEdit.addEventListener('click', () => {
    tabEdit.classList.add('active');
    tabStyle.classList.remove('active');
    subtitlesEditView.classList.remove('hidden');
    subtitlesStyleView.classList.add('hidden');
    drawerMainTitle.textContent = 'Subtitles';
  });

  tabStyle.addEventListener('click', () => {
    tabStyle.classList.add('active');
    tabEdit.classList.remove('active');
    subtitlesStyleView.classList.remove('hidden');
    subtitlesEditView.classList.add('hidden');
    drawerMainTitle.textContent = 'Subtitle Style';
  });

  // ── Left Rail Navigation (Subtitles vs Text Fonts) ──────────
  const drawerHeader = document.querySelector('.drawer-header');

  if (btnRailSubtitles) {
    btnRailSubtitles.addEventListener('click', () => {
      btnRailSubtitles.classList.add('active');
      if (btnRailText) btnRailText.classList.remove('active');
      if (drawerHeader) drawerHeader.classList.remove('hidden');
      if (textStyleView) textStyleView.classList.add('hidden');
      if (tabEdit.classList.contains('active')) {
        subtitlesEditView.classList.remove('hidden');
        subtitlesStyleView.classList.add('hidden');
      } else {
        subtitlesStyleView.classList.remove('hidden');
        subtitlesEditView.classList.add('hidden');
      }
    });
  }

  if (btnRailText) {
    btnRailText.addEventListener('click', () => {
      btnRailText.classList.add('active');
      if (btnRailSubtitles) btnRailSubtitles.classList.remove('active');
      if (drawerHeader) drawerHeader.classList.add('hidden');
      subtitlesEditView.classList.add('hidden');
      subtitlesStyleView.classList.add('hidden');
      if (textStyleView) textStyleView.classList.remove('hidden');
    });
  }

  // Text Font Styles Gallery Filters & Cards
  document.querySelectorAll('.text-cat-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.text-cat-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.dataset.cat;
      document.querySelectorAll('.font-group-block').forEach((group) => {
        if (cat === 'all' || group.dataset.section === cat) {
          group.style.display = 'flex';
        } else {
          group.style.display = 'none';
        }
      });
    });
  });

  document.querySelectorAll('.font-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.font-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const font = card.dataset.font || 'Inter';
      const weight = card.dataset.weight || '700';
      const transform = card.dataset.transform || 'none';

      pushHistory(`Change font style to ${font}`);
      subtitleStyle.fontFamily = font;
      subtitleStyle.fontWeight = weight;
      subtitleStyle.textTransform = transform;
      updateLiveOverlay();
      showToast(`Font applied: ${font}`);
    });
  });

  // ── Style View Interactive Controls ─────────────────────────

  // 1. Speaker identity format radio buttons
  document.querySelectorAll('#speaker-format-group .style-radio-label').forEach((label) => {
    label.addEventListener('click', () => {
      document.querySelectorAll('#speaker-format-group .style-radio-label').forEach((l) => l.classList.remove('active'));
      label.classList.add('active');
      const radio = label.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        pushHistory('Change speaker style');
        subtitleStyle.speakerFormat = radio.value;
        updateLiveOverlay();
      }
    });
  });

  // 2. Speaker color tags toggle
  toggleSpeakerColor.addEventListener('change', (e) => {
    pushHistory('Toggle speaker colors');
    subtitleStyle.showSpeakerColor = e.target.checked;
    updateLiveOverlay();
  });

  // 3. Screen position buttons (top, middle, bottom)
  positionBtnGrid.querySelectorAll('.style-grid-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      positionBtnGrid.querySelectorAll('.style-grid-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      pushHistory('Change caption position');
      subtitleStyle.position = btn.dataset.position;
      updateLiveOverlay();
    });
  });

  // 4. Preset cards (reels, cinema, pill, yellow)
  presetList.querySelectorAll('.style-preset-card').forEach((card) => {
    card.addEventListener('click', () => {
      presetList.querySelectorAll('.style-preset-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      pushHistory('Change visual preset');
      subtitleStyle.preset = card.dataset.preset;
      updateLiveOverlay();
    });
  });

  // 5. Font size buttons
  fontsizeBtnGrid.querySelectorAll('.style-grid-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      fontsizeBtnGrid.querySelectorAll('.style-grid-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      pushHistory('Change font size');
      subtitleStyle.fontSize = btn.dataset.size;
      updateLiveOverlay();
    });
  });

  // 6. Box background toggle and opacity slider
  if (toggleBoxBg) {
    toggleBoxBg.addEventListener('change', (e) => {
      pushHistory('Toggle subtitle box background');
      subtitleStyle.showBoxBg = e.target.checked;
      if (boxBgSliderRow) {
        boxBgSliderRow.classList.toggle('disabled-row', !subtitleStyle.showBoxBg);
      }
      if (subtitleStyle.showBoxBg && subtitleStyle.boxBgColor === 'transparent') {
        subtitleStyle.boxBgColor = '#000000';
        if (bgColorDot) bgColorDot.style.background = '#000000';
      } else if (!subtitleStyle.showBoxBg) {
        if (bgColorDot) bgColorDot.style.background = 'repeating-conic-gradient(#CBD5E1 0% 25%, #FFF 0% 50%) 50% / 8px 8px';
      }
      updateLiveOverlay();
    });
  }

  bgOpacitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    subtitleStyle.boxOpacity = val / 100;
    opacityLabel.textContent = `${val}%`;
    updateLiveOverlay();
  });

  function syncStyleUI() {
    // Sync speaker radio
    document.querySelectorAll('#speaker-format-group .style-radio-label').forEach((label) => {
      const radio = label.querySelector('input[type="radio"]');
      const isMatch = radio && radio.value === subtitleStyle.speakerFormat;
      label.classList.toggle('active', isMatch);
      if (radio) radio.checked = isMatch;
    });

    toggleSpeakerColor.checked = !!subtitleStyle.showSpeakerColor;

    // Sync position
    positionBtnGrid.querySelectorAll('.style-grid-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.position === subtitleStyle.position);
    });

    // Sync preset
    presetList.querySelectorAll('.style-preset-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.preset === subtitleStyle.preset);
    });

    // Sync font size
    fontsizeBtnGrid.querySelectorAll('.style-grid-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.size === subtitleStyle.fontSize);
    });

    // Sync box background toggle
    if (toggleBoxBg) {
      toggleBoxBg.checked = subtitleStyle.showBoxBg !== false && subtitleStyle.boxBgColor !== 'transparent';
      if (boxBgSliderRow) {
        boxBgSliderRow.classList.toggle('disabled-row', !toggleBoxBg.checked);
      }
    }

    // Sync opacity
    const pct = Math.round(subtitleStyle.boxOpacity * 100);
    bgOpacitySlider.value = pct;
    opacityLabel.textContent = `${pct}%`;

    // Sync box background dot and inputs
    if (bgColorDot) {
      if (subtitleStyle.showBoxBg === false || subtitleStyle.boxBgColor === 'transparent') {
        bgColorDot.style.background = 'repeating-conic-gradient(#CBD5E1 0% 25%, #FFF 0% 50%) 50% / 8px 8px';
      } else {
        bgColorDot.style.background = subtitleStyle.boxBgColor || '#000000';
      }
    }
    if (bgNativeColor && subtitleStyle.boxBgColor && subtitleStyle.boxBgColor.startsWith('#')) {
      bgNativeColor.value = subtitleStyle.boxBgColor;
    }
    if (bgHexInput && subtitleStyle.boxBgColor) {
      bgHexInput.value = subtitleStyle.boxBgColor.replace(/^#/, '');
    }
    document.querySelectorAll('#bg-palette-grid .color-swatch').forEach((swatch) => {
      const isMatch = (subtitleStyle.boxBgColor || '').toLowerCase() === swatch.dataset.color.toLowerCase();
      swatch.classList.toggle('active', isMatch);
    });
  }

  // ── Upload Modal Controls & Media Selection ────────────────
  function openUploadModal() {
    if (uploadModalBackdrop) {
      uploadModalBackdrop.classList.add('active');
    }
  }

  function closeUploadModal() {
    if (uploadModalBackdrop) {
      uploadModalBackdrop.classList.remove('active');
    }
  }

  if (btnModalClose) {
    btnModalClose.addEventListener('click', closeUploadModal);
  }

  if (uploadModalBackdrop) {
    uploadModalBackdrop.addEventListener('click', (e) => {
      if (e.target === uploadModalBackdrop) {
        closeUploadModal();
      }
    });
  }

  if (btnModalUploadBtn) {
    btnModalUploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (modalDropArea) {
    modalDropArea.addEventListener('click', (e) => {
      if (e.target === btnModalUploadBtn || (btnModalUploadBtn && btnModalUploadBtn.contains(e.target))) return;
      fileInput.click();
    });

    modalDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      modalDropArea.classList.add('drag-active');
    });

    modalDropArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      modalDropArea.classList.remove('drag-active');
    });

    modalDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      modalDropArea.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnModalAiTalking) {
    btnModalAiTalking.addEventListener('click', () => {
      showToast('AI Talking Video coming soon — select an audio or video file to start captioning!');
    });
  }

  // Record Yourself: Direct mobile camera or desktop webcam live stream
  let mediaRecorder = null;
  let recordedChunks = [];
  let webcamStream = null;
  let recTimerInterval = null;
  let recSeconds = 0;

  if (cameraCaptureInput) {
    cameraCaptureInput.addEventListener('change', () => {
      if (cameraCaptureInput.files && cameraCaptureInput.files.length) {
        handleFileSelected(cameraCaptureInput.files[0]);
      }
    });
  }

  if (btnModalRecord) {
    btnModalRecord.addEventListener('click', async () => {
      closeUploadModal();
      // Try live webcam stream on desktop / devices with getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (webcamPreviewVideo) {
            webcamPreviewVideo.srcObject = webcamStream;
          }
          if (webcamModalBackdrop) {
            webcamModalBackdrop.classList.remove('hidden');
          }
          return;
        } catch (err) {
          console.warn('Webcam stream not directly accessible, opening camera capture:', err);
        }
      }
      // Direct camera file fallback for mobile or camera app
      if (cameraCaptureInput) cameraCaptureInput.click();
    });
  }

  if (btnWebcamClose) {
    btnWebcamClose.addEventListener('click', closeWebcamModal);
  }

  if (btnWebcamDeviceSwitch) {
    btnWebcamDeviceSwitch.addEventListener('click', () => {
      closeWebcamModal();
      if (cameraCaptureInput) cameraCaptureInput.click();
    });
  }

  function closeWebcamModal() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recTimerInterval) {
      clearInterval(recTimerInterval);
      recTimerInterval = null;
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      webcamStream = null;
    }
    if (webcamPreviewVideo) {
      webcamPreviewVideo.srcObject = null;
    }
    if (webcamModalBackdrop) {
      webcamModalBackdrop.classList.add('hidden');
    }
    if (btnWebcamStart && btnWebcamStop) {
      btnWebcamStart.classList.remove('hidden');
      btnWebcamStop.classList.add('hidden');
    }
    if (webcamRecBadge) webcamRecBadge.classList.add('hidden');
  }

  if (btnWebcamStart) {
    btnWebcamStart.addEventListener('click', () => {
      if (!webcamStream) return;
      recordedChunks = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      try {
        mediaRecorder = new MediaRecorder(webcamStream, { mimeType: mime });
      } catch (e) {
        mediaRecorder = new MediaRecorder(webcamStream);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const recordedFile = new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' });
        closeWebcamModal();
        handleFileSelected(recordedFile);
      };

      mediaRecorder.start(100);
      btnWebcamStart.classList.add('hidden');
      btnWebcamStop.classList.remove('hidden');
      if (webcamRecBadge) webcamRecBadge.classList.remove('hidden');

      recSeconds = 0;
      if (webcamRecTimer) webcamRecTimer.textContent = '00:00';
      recTimerInterval = setInterval(() => {
        recSeconds++;
        const mins = String(Math.floor(recSeconds / 60)).padStart(2, '0');
        const secs = String(recSeconds % 60).padStart(2, '0');
        if (webcamRecTimer) webcamRecTimer.textContent = `${mins}:${secs}`;
      }, 1000);
    });
  }

  if (btnWebcamStop) {
    btnWebcamStop.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    });
  }

  if (btnModalPhone) {
    btnModalPhone.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Browse File buttons trigger the modal
  btnBrowseFile.addEventListener('click', (e) => {
    e.stopPropagation();
    openUploadModal();
  });

  dropZone.addEventListener('click', () => openUploadModal());

  btnReplaceMedia.addEventListener('click', () => openUploadModal());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  function handleFileSelected(file) {
    closeUploadModal();

    // Revoke previous blob URL if any
    if (activePlayer && activePlayer.src && activePlayer.src.startsWith('blob:')) {
      URL.revokeObjectURL(activePlayer.src);
    }

    activeFile = file;
    projectTitleInput.value = file.name.replace(/\.[^.]+$/, '');

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    const mediaUrl = URL.createObjectURL(file);

    if (activePlayer) {
      activePlayer.pause();
      activePlayer.src = '';
    }

    // Reset subtitles when uploading a new replacement source
    segments = [];
    selectedSegmentIndex = null;
    undoStack.length = 0;
    redoStack.length = 0;
    updateHistoryButtons();
    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    updateLiveOverlay();

    if (isVideo) {
      videoEl.src = mediaUrl;
      videoEl.classList.remove('hidden');
      audioEl.classList.add('hidden');
      activePlayer = videoEl;
    } else {
      audioEl.src = mediaUrl;
      audioEl.classList.remove('hidden');
      videoEl.classList.add('hidden');
      activePlayer = audioEl;
    }

    dropZone.classList.add('hidden');
    videoOverlay.classList.remove('hidden');
    timelineMediaTrack.classList.add('has-media');

    activePlayer.addEventListener('loadedmetadata', () => {
      mediaDuration = activePlayer.duration || 10;
      updateTimeDisplay(0, mediaDuration);

      // Auto-detect aspect ratio for video to avoid whitespace!
      if (activePlayer === videoEl && videoEl.videoWidth && videoEl.videoHeight) {
        const ratio = videoEl.videoWidth / videoEl.videoHeight;
        if (ratio < 0.75) {
          applyCanvasAspectRatio('9-16', 'Original (9:16)');
        } else if (ratio >= 0.75 && ratio <= 1.25) {
          applyCanvasAspectRatio('1-1', 'Square (1:1)');
        } else {
          applyCanvasAspectRatio('16-9', 'Wide Landscape (16:9)');
        }
      } else {
        // Default audio presentation is 16:9 landscape
        applyCanvasAspectRatio('16-9', 'Wide Landscape (16:9)');
      }

      refreshTimelineLayout();
      renderTimelineRuler();
      renderTimelineSubtitleBlocks();
    }, { once: true });

    activePlayer.addEventListener('timeupdate', onPlayerTimeUpdate);
    activePlayer.addEventListener('ended', onPlayerEnded);

    generateAudioWaveform(file);

    subtitlesEmptyState.classList.remove('hidden');
    showToast(`Loaded: ${file.name}`);
  }

  // ── Audio Waveform Rendering ────────────────────────────────

  async function generateAudioWaveform(file) {
    try {
      const arrayBuffer = await file.slice(0, 40 * 1024 * 1024).arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('No AudioContext');
      const ctx = new AudioCtx();
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      drawWaveform(audioBuffer);
    } catch (e) {
      drawSyntheticWaveform();
    }
  }

  function drawWaveform(buffer) {
    const canvas = waveformCanvas;
    const pps = getPixelsPerSecond();
    const duration = mediaDuration || buffer.duration || 10;
    const mediaW = Math.max(10, Math.round(duration * pps));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(10, Math.round(mediaW * dpr));
    canvas.height = 52 * dpr;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#B9E4E8'; // Ice Blue waveform bars over dark navy media clip

    const rawData = buffer.getChannelData(0);
    const renderWidth = canvas.width;
    const samples = Math.floor(renderWidth / 3);
    if (samples <= 0) return;
    const step = Math.floor(rawData.length / samples);
    const amp = canvas.height / 2;

    for (let i = 0; i < samples; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const val = rawData[i * step + j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const barH = Math.max(3, (max - min) * amp * 0.9);
      const x = i * 3;
      const y = amp - barH / 2;
      ctx.fillRect(x, y, 2, barH);
    }
  }

  function drawSyntheticWaveform() {
    const canvas = waveformCanvas;
    const pps = getPixelsPerSecond();
    const duration = mediaDuration || 10;
    const mediaW = Math.max(10, Math.round(duration * pps));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(10, Math.round(mediaW * dpr));
    canvas.height = 52 * dpr;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#B9E4E8'; // Ice Blue waveform bars over dark navy media clip

    const renderWidth = canvas.width;
    const bars = Math.floor(renderWidth / 3);
    const amp = canvas.height / 2;

    for (let i = 0; i < bars; i++) {
      const noise = Math.sin(i * 0.08) * Math.cos(i * 0.2) * 0.4 + 0.5;
      const barH = Math.max(4, noise * amp * 0.85);
      const x = i * 3;
      const y = amp - barH / 2;
      ctx.fillRect(x, y, 2, barH);
    }
  }

  // ── In-Browser Audio Extraction & Base64 Encoder (Vercel Serverless Ready) ──

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  function audioBufferToWavBlob(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const channelData = buffer.getChannelData(0);
    const dataLength = channelData.length * 2;
    const bufferLength = 44 + dataLength;
    const outBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(outBuffer);
    
    function writeString(offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    
    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([outBuffer], { type: 'audio/wav' });
  }

  async function extractAudioForTranscription(file) {
    // 1. If already small audio file (< 3MB), read directly
    if (file.type && file.type.startsWith('audio/') && file.size < 3 * 1024 * 1024) {
      const arr = await file.arrayBuffer();
      return {
        audioBase64: arrayBufferToBase64(arr),
        mimeType: file.type || 'audio/mp3',
        duration: mediaDuration || 0,
      };
    }

    // 2. Decode via Web Audio API directly in browser
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const tempCtx = new AudioCtxClass();
    const fileArrayBuffer = await file.arrayBuffer();
    const decoded = await tempCtx.decodeAudioData(fileArrayBuffer);

    // Select optimal sample rate for Vercel 4.5MB payload limit
    const dur = decoded.duration || 10;
    let targetRate = 16000;
    if (dur > 180) targetRate = 8000;
    else if (dur > 90) targetRate = 12000;

    const numSamples = Math.round(dur * targetRate);
    const offlineCtx = new OfflineAudioContext(1, numSamples, targetRate);
    const src = offlineCtx.createBufferSource();
    src.buffer = decoded;
    src.connect(offlineCtx.destination);
    src.start(0);

    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(rendered);
    const wavBuffer = await wavBlob.arrayBuffer();

    return {
      audioBase64: arrayBufferToBase64(wavBuffer),
      mimeType: 'audio/wav',
      duration: dur,
    };
  }

  // ── Subtitle Generation / AI Transcribe (Gemini Engine) ────

  if (btnStartTranscribe) btnStartTranscribe.addEventListener('click', startTranscription);
  if (btnCleanAudio) btnCleanAudio.addEventListener('click', startTranscription);

  async function startTranscription() {
    if (!activeFile) {
      showToast('Please upload a video or audio file first.');
      fileInput.click();
      return;
    }

    pushHistory('Generate Subtitles');

    btnStartTranscribe.disabled = true;
    btnGenerateLabel.textContent = 'Preparing audio…';
    drawerProgress.classList.remove('hidden');
    progressBarFill.classList.remove('indeterminate');
    progressBarFill.style.width = '5%';
    processingMessage.textContent = 'Extracting audio from media…';

    let progressTimer = null;

    try {
      // 1. Extract compact audio in browser (~0.5s)
      const audioPayload = await extractAudioForTranscription(activeFile);
      
      btnGenerateLabel.textContent = 'Generating Subtitle…';
      progressBarFill.style.width = '15%';
      processingMessage.textContent = 'Generating Subtitle... 15%';

      let currentPct = 15;
      progressTimer = setInterval(() => {
        if (currentPct < 90) {
          const step = Math.max(1, (90 - currentPct) * 0.08 + Math.random() * 2);
          currentPct = Math.min(92, currentPct + step);
          const rounded = Math.round(currentPct);
          progressBarFill.style.width = `${rounded}%`;
          processingMessage.textContent = `Generating Subtitle... ${rounded}%`;
        }
      }, 250);

      // 2. Send lightweight JSON to /api/transcribe (works on Vercel Serverless & local server)
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: audioPayload.audioBase64,
          mimeType: audioPayload.mimeType,
          duration: audioPayload.duration || mediaDuration,
          mode: transcriptionMode.value,
          language: targetLanguage.value,
        }),
      });

      const data = await response.json();
      if (progressTimer) clearInterval(progressTimer);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Transcription failed.');
      }

      progressBarFill.style.width = '100%';
      processingMessage.textContent = 'Generating Subtitle... 100%';

      segments = (data.segments || []).map((seg, idx) => ({
        id: seg.id || idx + 1,
        start: seg.start,
        end: seg.end,
        speaker: '', // Clean subtitle (no speaker label)
        lang: seg.lang || data.language || targetLanguage.value,
        isOverlap: !!seg.isOverlap,
        caseMode: globalCaseMode,
        text: formatCaptionText(seg.text, globalCaseMode),
      }));

      segments.sort((a, b) => a.start - b.start);

      renderSubtitlesDrawer();
      renderTimelineSubtitleBlocks();
      updateLiveOverlay();

      setTimeout(() => {
        drawerProgress.classList.add('hidden');
      }, 800);

    } catch (err) {
      if (progressTimer) clearInterval(progressTimer);
      drawerProgress.classList.add('hidden');
      showToast(err.message || 'Error occurred during transcription.');
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      btnStartTranscribe.disabled = false;
      btnGenerateLabel.textContent = 'Generate Subtitle';
    }
  }

  // ── Subtitle Drawer Rendering (with Per-Bar Case & Reorder) ──

  function renderSubtitlesDrawer() {
    subtitlesListContainer.innerHTML = '';

    if (!segments.length) {
      subtitlesEmptyState.classList.remove('hidden');
      subtitlesListContainer.appendChild(subtitlesEmptyState);
      return;
    }

    subtitlesEmptyState.classList.add('hidden');

    // Calculate multi-track allocation
    assignSubtitleTracks(segments);

    segments.forEach((seg, idx) => {
      const card = document.createElement('div');
      const isSelected = selectedSegmentIndex === idx;
      card.className = `subtitle-card${isSelected ? ' selected-card' : ''}`;
      card.dataset.index = idx;
      card.id = `sub-card-${idx}`;

      // Card Header
      const header = document.createElement('div');
      header.className = 'subtitle-card-header';

      // Left Header: Drag Grip, Timing, Track Badge
      const leftWrap = document.createElement('div');
      leftWrap.className = 'subtitle-header-left';

      // 6-dot drag grip handle
      const grip = document.createElement('div');
      grip.className = 'subtitle-drag-grip';
      grip.title = 'Drag to re-order subtitle sequence';
      grip.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
        </svg>
      `;

      const timingBadge = document.createElement('span');
      timingBadge.className = 'subtitle-timing-badge';
      timingBadge.textContent = `${formatVeedTime(seg.start)} - ${formatVeedTime(seg.end)}`;

      leftWrap.appendChild(grip);
      leftWrap.appendChild(timingBadge);

      // Track row indicator badge (Track 2, etc.) when simultaneous
      if (typeof seg.track === 'number' && seg.track > 0) {
        const trackBadge = document.createElement('span');
        trackBadge.className = 'subtitle-track-badge';
        trackBadge.textContent = `Track ${seg.track + 1}`;
        trackBadge.title = 'Simultaneous / Overlapping Subtitle Track';
        leftWrap.appendChild(trackBadge);
      }

      if (seg.speaker) {
        const spkBadge = document.createElement('span');
        spkBadge.className = 'subtitle-speaker-badge';
        spkBadge.textContent = seg.speaker;
        leftWrap.appendChild(spkBadge);
      }

      header.appendChild(leftWrap);

      // Right Header: Per-Bar Case Toggle (aa / AA) & Delete
      const rightWrap = document.createElement('div');
      rightWrap.className = 'subtitle-header-right';

      const cardCaseToggle = document.createElement('div');
      cardCaseToggle.className = 'card-case-toggle';
      cardCaseToggle.title = 'Toggle uppercase / lowercase for this line';

      const btnLower = document.createElement('button');
      btnLower.type = 'button';
      btnLower.className = `btn-card-case ${seg.caseMode !== 'upper' ? 'active' : ''}`;
      btnLower.textContent = 'aa';
      btnLower.title = 'Huruf kecil untuk baris ini';
      btnLower.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCardCase(idx, 'lower');
      });

      const btnUpper = document.createElement('button');
      btnUpper.type = 'button';
      btnUpper.className = `btn-card-case ${seg.caseMode === 'upper' ? 'active' : ''}`;
      btnUpper.textContent = 'AA';
      btnUpper.title = 'HURUF BESAR untuk baris ini';
      btnUpper.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCardCase(idx, 'upper');
      });

      cardCaseToggle.appendChild(btnLower);
      cardCaseToggle.appendChild(btnUpper);
      rightWrap.appendChild(cardCaseToggle);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-card-menu';
      deleteBtn.title = 'Delete segment';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSegment(idx);
      });

      rightWrap.appendChild(deleteBtn);
      header.appendChild(rightWrap);

      // Card Editable Text
      const textDiv = document.createElement('div');
      textDiv.className = 'subtitle-card-text';
      textDiv.contentEditable = 'true';
      textDiv.spellcheck = false;
      textDiv.textContent = seg.text;

      let textBeforeEdit = seg.text;
      textDiv.addEventListener('focus', () => {
        textBeforeEdit = seg.text;
        setSelectedSegment(idx);
      });

      textDiv.addEventListener('input', () => {
        segments[idx].text = sanitizeCaptionText(textDiv.textContent);
        renderTimelineSubtitleBlocks();
        updateLiveOverlay();
      });

      textDiv.addEventListener('blur', () => {
        const clean = sanitizeCaptionText(textDiv.textContent);
        if (clean !== textBeforeEdit) {
          pushHistory('Edit subtitle text');
        }
        segments[idx].text = clean;
        textDiv.textContent = clean;
      });

      card.appendChild(header);
      card.appendChild(textDiv);

      // Clicking card seeks media & selects segment
      card.addEventListener('click', (e) => {
        if (e.target === textDiv || e.target.closest('.card-case-toggle') || e.target === deleteBtn) return;
        setSelectedSegment(idx);
        seekMedia(seg.start);
      });

      // Drag and Drop re-order in Subtitle Drawer
      setupCardDragAndDrop(card, idx);

      subtitlesListContainer.appendChild(card);
    });
  }

  // ── Per-Bar Case Toggle Handler ─────────────────────────────

  function toggleCardCase(index, targetMode) {
    const seg = segments[index];
    if (!seg) return;

    pushHistory(`Set line ${index + 1} to ${targetMode.toUpperCase()}`);
    seg.caseMode = targetMode;
    seg.text = targetMode === 'upper' ? seg.text.toUpperCase() : seg.text.toLowerCase();

    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    updateLiveOverlay();
  }

  function setupCardDragAndDrop(card, idx) {
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', (e) => {
      draggedCardIndex = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
      setTimeout(() => card.classList.add('is-dragging'), 0);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      clearCardDropIndicators();
      draggedCardIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedCardIndex === null || draggedCardIndex === idx) return;
      e.dataTransfer.dropEffect = 'move';

      const rect = card.getBoundingClientRect();
      const isAbove = (e.clientY - rect.top) < (rect.height / 2);
      clearCardDropIndicators();
      if (isAbove) {
        card.classList.add('drop-above');
      } else {
        card.classList.add('drop-below');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drop-above', 'drop-below');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drop-above', 'drop-below');
      if (draggedCardIndex === null || draggedCardIndex === idx) return;

      const rect = card.getBoundingClientRect();
      const isAbove = (e.clientY - rect.top) < (rect.height / 2);
      let targetIdx = idx;
      if (!isAbove) targetIdx = idx + 1;
      if (draggedCardIndex < targetIdx) targetIdx--;

      if (draggedCardIndex === targetIdx) return;

      pushHistory('Reorder subtitle line');

      const [movedSeg] = segments.splice(draggedCardIndex, 1);
      segments.splice(targetIdx, 0, movedSeg);

      // Re-sequence timestamps chronologically so timeline & drawer stay synchronized
      let curTime = segments[0] ? segments[0].start : 0;
      segments.forEach((s) => {
        const dur = Math.max(0.4, Math.round((s.end - s.start) * 10) / 10);
        s.start = curTime;
        s.end = Math.round((curTime + dur) * 10) / 10;
        curTime = s.end;
      });

      renderSubtitlesDrawer();
      renderTimelineSubtitleBlocks();
      updateLiveOverlay();
      showToast('Reordered subtitles');
    });
  }

  function clearCardDropIndicators() {
    document.querySelectorAll('.subtitle-card').forEach((c) => {
      c.classList.remove('drop-above', 'drop-below');
    });
  }

  function deleteSegment(index) {
    if (index < 0 || index >= segments.length) return;
    pushHistory(`Delete subtitle line ${index + 1}`);
    segments.splice(index, 1);
    if (selectedSegmentIndex === index) {
      selectedSegmentIndex = null;
    } else if (selectedSegmentIndex !== null && selectedSegmentIndex > index) {
      selectedSegmentIndex--;
    }
    assignSubtitleTracks(segments);
    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    updateLiveOverlay();
    showToast('Deleted subtitle');
  }

  btnAddSegment.addEventListener('click', addNewSubtitleLine);
  btnAddSubtitleTl.addEventListener('click', addNewSubtitleLine);

  function addNewSubtitleLine() {
    pushHistory('Add new subtitle line');

    const curTime = activePlayer ? activePlayer.currentTime : 0;
    const start = Math.round(curTime * 10) / 10;
    const end = Math.round((start + 2.0) * 10) / 10;

    segments.push({
      id: Date.now(),
      start: start,
      end: end,
      speaker: '',
      lang: targetLanguage.value,
      isOverlap: false,
      caseMode: globalCaseMode,
      text: formatCaptionText('Input Text', globalCaseMode),
    });

    segments.sort((a, b) => a.start - b.start);
    renderSubtitlesDrawer();
    renderTimelineSubtitleBlocks();
    seekMedia(start);
  }

  // ── Timeline Ruler & Track Rendering ────────────────────────

  function getTimelineWidth() {
    const duration = mediaDuration || 10;
    const pps = getPixelsPerSecond();
    const mediaW = duration * pps;
    const minWidth = timelineViewport.clientWidth || 800;
    return Math.max(minWidth, mediaW + 180);
  }

  function refreshTimelineLayout() {
    const totalW = getTimelineWidth();
    timelineTracksInner.style.width = `${totalW}px`;

    const pps = getPixelsPerSecond();
    const duration = mediaDuration || 10;
    const mediaW = Math.max(10, Math.round(duration * pps));

    // The blue media track clip bar scales with the zoom level
    if (activeFile || mediaDuration > 0) {
      timelineMediaTrack.style.width = `${mediaW}px`;
      timelineMediaTrack.style.right = 'auto';
    } else {
      timelineMediaTrack.style.width = `${totalW}px`;
      timelineMediaTrack.style.right = '0px';
    }

    if (audioBuffer) drawWaveform(audioBuffer);
    else drawSyntheticWaveform();
  }

  function renderTimelineRuler() {
    rulerTicks.innerHTML = '';
    const pps = getPixelsPerSecond();
    const duration = mediaDuration || 10;
    const totalW = getTimelineWidth();
    const maxSec = Math.max(duration, totalW / pps);

    // Smart tick step depending on current pixels-per-second (zoom)
    const candidateSteps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    let stepSec = 1;
    for (const s of candidateSteps) {
      if (s * pps >= 45) {
        stepSec = s;
        break;
      }
    }

    const totalTicks = Math.ceil(maxSec / stepSec);

    for (let i = 0; i <= totalTicks; i++) {
      const sec = Math.round(i * stepSec * 100) / 100;
      const x = timeToPx(sec);
      if (x > totalW + 10) break;

      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = `${x}px`;

      if (stepSec < 1) {
        tick.textContent = `${sec.toFixed(1)}s`;
      } else if (sec >= 60) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        tick.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      } else {
        tick.textContent = `${sec}s`;
      }

      if (Math.abs(sec - duration) < (stepSec * 0.4)) {
        tick.classList.add('ruler-tick-end');
        tick.title = `Media End (${formatTime(duration)})`;
      }

      rulerTicks.appendChild(tick);
    }
  }

  // ── Multi-Track Timeline Subtitle Blocks (with Overlap Rows) ──

  function renderTimelineSubtitleBlocks() {
    timelineSubtitlesTrack.innerHTML = '';
    if (!segments.length) return;

    // Allocate multi-track rows
    assignSubtitleTracks(segments);

    segments.forEach((seg, idx) => {
      const block = document.createElement('div');
      const trackRow = seg.track || 0;
      const isSelected = selectedSegmentIndex === idx;
      block.className = `timeline-subtitle-block track-row-${trackRow}${isSelected ? ' selected-block' : ''}`;
      block.id = `tl-block-${idx}`;
      block.dataset.index = idx;

      const leftPx = timeToPx(seg.start);
      const rightPx = timeToPx(seg.end);
      const widthPx = Math.max(6, rightPx - leftPx);
      const topPx = 4 + trackRow * 36;

      block.style.left = `${leftPx}px`;
      block.style.top = `${topPx}px`;
      block.style.width = `${widthPx}px`;
      block.title = `${seg.speaker}: "${seg.text}" (${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s) [Track ${trackRow + 1}]`;

      // Left trim handle (adjust start time)
      const handleLeft = document.createElement('div');
      handleLeft.className = 'tl-handle tl-handle-left';
      handleLeft.title = 'Drag to adjust start time';

      // Center block text
      const textSpan = document.createElement('span');
      textSpan.className = 'tl-block-text';
      textSpan.textContent = seg.text;

      // Right trim handle (adjust end time)
      const handleRight = document.createElement('div');
      handleRight.className = 'tl-handle tl-handle-right';
      handleRight.title = 'Drag to adjust end time';

      block.appendChild(handleLeft);
      block.appendChild(textSpan);
      block.appendChild(handleRight);

      // Left Handle: drag start time
      handleLeft.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        pushHistory('Trim subtitle start');
        activeTrimOrDrag = {
          type: 'left',
          index: idx,
          startX: e.clientX,
          initialStart: seg.start,
          initialEnd: seg.end,
          blockEl: block,
        };
        document.body.style.cursor = 'ew-resize';
      });

      // Right Handle: drag end time
      handleRight.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        pushHistory('Trim subtitle end');
        activeTrimOrDrag = {
          type: 'right',
          index: idx,
          startX: e.clientX,
          initialStart: seg.start,
          initialEnd: seg.end,
          blockEl: block,
        };
        document.body.style.cursor = 'ew-resize';
      });

      // Block Body: drag horizontally to shift or click to seek & select
      block.addEventListener('mousedown', (e) => {
        if (e.target === handleLeft || e.target === handleRight) return;
        e.stopPropagation();
        setSelectedSegment(idx);
        activeTrimOrDrag = {
          type: 'move',
          index: idx,
          startX: e.clientX,
          initialStart: seg.start,
          initialEnd: seg.end,
          duration: seg.end - seg.start,
          blockEl: block,
          hasMoved: false,
        };
      });

      block.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedSegment(idx);
        seekMedia(seg.start);
      });

      timelineSubtitlesTrack.appendChild(block);
    });
  }

  // ── Global Mouse Listeners for Timeline Trimming & Dragging ──

  window.addEventListener('mousemove', (e) => {
    // 1. Trimming or Dragging Subtitle Blocks
    if (activeTrimOrDrag) {
      const { type, index, startX, initialStart, initialEnd, duration: segDur, blockEl } = activeTrimOrDrag;
      const duration = mediaDuration || 10;
      const pps = getPixelsPerSecond();
      const deltaX = e.clientX - startX;
      const deltaSec = deltaX / pps;
      const seg = segments[index];
      if (!seg) return;

      if (type === 'left') {
        let newStart = initialStart + deltaSec;
        newStart = Math.max(0, Math.min(initialEnd - 0.2, newStart));
        newStart = Math.round(newStart * 100) / 100;
        seg.start = newStart;

        const newLeftPx = timeToPx(newStart);
        const newWidthPx = Math.max(6, timeToPx(seg.end) - newLeftPx);
        blockEl.style.left = `${newLeftPx}px`;
        blockEl.style.width = `${newWidthPx}px`;

        updateTimeDisplay(newStart, duration);
        seekMedia(newStart);

      } else if (type === 'right') {
        let newEnd = initialEnd + deltaSec;
        newEnd = Math.min(duration, Math.max(initialStart + 0.2, newEnd));
        newEnd = Math.round(newEnd * 100) / 100;
        seg.end = newEnd;

        const newWidthPx = Math.max(6, timeToPx(newEnd) - timeToPx(seg.start));
        blockEl.style.width = `${newWidthPx}px`;

        updateTimeDisplay(newEnd, duration);
        seekMedia(newEnd);

      } else if (type === 'move') {
        if (Math.abs(deltaX) > 3) {
          if (!activeTrimOrDrag.hasMoved) {
            activeTrimOrDrag.hasMoved = true;
            pushHistory('Move subtitle');
            blockEl.classList.add('is-dragging-block');
          }
          let newStart = initialStart + deltaSec;
          newStart = Math.max(0, Math.min(duration - segDur, newStart));
          newStart = Math.round(newStart * 100) / 100;
          const newEnd = Math.round((newStart + segDur) * 100) / 100;
          seg.start = newStart;
          seg.end = newEnd;

          const newLeftPx = timeToPx(newStart);
          blockEl.style.left = `${newLeftPx}px`;

          // Dynamically check overlap while moving
          assignSubtitleTracks(segments);
          const isSelected = selectedSegmentIndex === index;
          blockEl.className = `timeline-subtitle-block track-row-${seg.track || 0} is-dragging-block${isSelected ? ' selected-block' : ''}`;
          blockEl.style.top = `${4 + (seg.track || 0) * 36}px`;

          updateTimeDisplay(newStart, duration);
          seekMedia(newStart);
        }
      }
      return;
    }

    // 2. Playhead Scrubbing
    if (isScrubbing) {
      handleTimelineSeek(e);
    }
  });

  window.addEventListener('mouseup', () => {
    if (activeTrimOrDrag) {
      const wasMoving = activeTrimOrDrag.type === 'move' && activeTrimOrDrag.hasMoved;
      const wasTrimming = activeTrimOrDrag.type === 'left' || activeTrimOrDrag.type === 'right';

      if (activeTrimOrDrag.blockEl) {
        activeTrimOrDrag.blockEl.classList.remove('is-dragging-block');
      }
      activeTrimOrDrag = null;
      document.body.style.cursor = '';

      if (wasMoving || wasTrimming) {
        segments.sort((a, b) => a.start - b.start);
        assignSubtitleTracks(segments);
        renderSubtitlesDrawer();
        renderTimelineSubtitleBlocks();
        updateLiveOverlay();
      }
    }

    isScrubbing = false;
  });

  // ── Timeline Playhead & Scrubbing ───────────────────────────

  timelineViewport.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.timeline-subtitle-block')) {
      setSelectedSegment(null);
    }
    isScrubbing = true;
    handleTimelineSeek(e);
  });

  function handleTimelineSeek(e) {
    const rect = timelineTracksInner.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSec = pxToTime(clickX);
    seekMedia(targetSec);
  }

  function seekMedia(sec) {
    if (!activePlayer) return;
    activePlayer.currentTime = sec;
    updatePlayheadPosition(sec);
    updateLiveOverlay();
  }

  function updatePlayheadPosition(sec) {
    const x = timeToPx(sec);
    timelinePlayhead.style.left = `${x}px`;
    const duration = mediaDuration || 10;
    updateTimeDisplay(sec, duration);
  }

  // ── Sync Playback & Active Highlighting ──────────────────────

  function onPlayerTimeUpdate() {
    if (!activePlayer) return;
    const cur = activePlayer.currentTime;
    updatePlayheadPosition(cur);
    updateLiveOverlay();

    // Auto-scroll timeline to follow playhead if playing and playhead approaches right viewport edge
    if (!isScrubbing && !activePlayer.paused) {
      const curX = timeToPx(cur);
      const scrollL = timelineViewport.scrollLeft;
      const vpW = timelineViewport.clientWidth;
      if (curX > scrollL + vpW - 40) {
        timelineViewport.scrollLeft = curX - 60;
      } else if (curX < scrollL) {
        timelineViewport.scrollLeft = Math.max(0, curX - 60);
      }
    }

    segments.forEach((seg, idx) => {
      const isActive = cur >= seg.start && cur <= seg.end;
      const card = $(`sub-card-${idx}`);
      const block = $(`tl-block-${idx}`);

      if (card) {
        if (isActive) {
          card.classList.add('active-card');
          if (!isElementInViewport(card, subtitlesListContainer)) {
            card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        } else {
          card.classList.remove('active-card');
        }
      }

      if (block) {
        if (isActive) block.classList.add('active-block');
        else block.classList.remove('active-block');
      }
    });
  }

  // ── Live Video Subtitle Overlay (Multi-Track Stack & Style) ──

  function hexToRgba(hex, alpha) {
    if (!hex || hex === 'transparent') return 'transparent';
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map((x) => x + x).join('');
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(0, 0, 0, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function updateLiveOverlay() {
    if (!activePlayer) {
      videoOverlay.innerHTML = '';
      return;
    }

    const cur = activePlayer.currentTime;
    const activeSegs = segments.filter((s) => cur >= s.start && cur <= s.end);

    // Apply position class
    videoOverlay.className = `stage-subtitle-overlay pos-${subtitleStyle.position}`;

    if (activeSegs.length) {
      videoOverlay.innerHTML = activeSegs
        .map((s, idx) => {
          let spkHtml = '';
          const spkName = s.speaker || `Speaker ${idx + 1}`;

          if (subtitleStyle.speakerFormat === 'bracket' && spkName) {
            const spkNum = parseInt((spkName.match(/\d+/) || [idx + 1])[0], 10);
            const colorClass = subtitleStyle.showSpeakerColor
              ? `spk-color-${((spkNum - 1) % 3) + 1}`
              : 'spk-color-neutral';
            spkHtml = `<span class="stage-overlay-speaker ${colorClass}">[${escapeHtml(spkName)}]</span> `;
          } else if (subtitleStyle.speakerFormat === 'dash') {
            spkHtml = `<span class="stage-overlay-speaker">- </span>`;
          } // 'clean': strictly no speaker label prefix

          const pillText = escapeHtml(s.text);
          const presetClass = `preset-${subtitleStyle.preset}`;
          const sizeClass = `size-${subtitleStyle.fontSize}`;

          let boxBgCss = '';
          if (subtitleStyle.showBoxBg === false || subtitleStyle.boxBgColor === 'transparent') {
            boxBgCss = 'background: transparent !important; backdrop-filter: none !important; box-shadow: none !important; text-shadow: 0 2px 5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85);';
          } else {
            const bgRgba = hexToRgba(subtitleStyle.boxBgColor || '#000000', subtitleStyle.boxOpacity !== undefined ? subtitleStyle.boxOpacity : 0.75);
            boxBgCss = `background: ${bgRgba} !important;`;
          }

          const fontCss = `font-family: '${subtitleStyle.fontFamily || 'Inter'}', sans-serif; color: ${subtitleStyle.textColor || '#FFFFFF'}; font-weight: ${subtitleStyle.fontWeight || '700'}; text-transform: ${subtitleStyle.textTransform || 'none'}; --box-opacity: ${subtitleStyle.boxOpacity}; ${boxBgCss}`;

          return `<div class="stage-overlay-pill ${presetClass} ${sizeClass}" style="${fontCss}">${spkHtml}${pillText}</div>`;
        })
        .join('');
      videoOverlay.classList.remove('hidden');
    } else {
      videoOverlay.innerHTML = '';
      videoOverlay.classList.add('hidden');
    }
  }

  function onPlayerEnded() {
    setPlaying(false);
  }

  // ── Keyboard Shortcuts (Ctrl+Z Undo, Spacebar Play/Pause) ───

  window.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
    if (isCtrlOrCmd && e.key.toLowerCase() === 'z') {
      if (document.activeElement && document.activeElement.id === 'project-title-input') return;
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if (isCtrlOrCmd && e.key.toLowerCase() === 'y') {
      if (document.activeElement && document.activeElement.id === 'project-title-input') return;
      e.preventDefault();
      redo();
      return;
    }

    // Modal Escape
    if (e.key === 'Escape') {
      if (uploadModalBackdrop && uploadModalBackdrop.classList.contains('active')) {
        closeUploadModal();
        return;
      }
    }

    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;

    // Delete selected subtitle with Delete or Backspace key
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSegmentIndex !== null) {
      e.preventDefault();
      const targetIdx = selectedSegmentIndex;
      deleteSegment(targetIdx);
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    }
  });

  // ── Play / Pause & Navigation Controls ──────────────────────

  btnPlayPause.addEventListener('click', togglePlayPause);

  function togglePlayPause() {
    if (!activePlayer) return;
    if (activePlayer.paused) {
      activePlayer.play();
      setPlaying(true);
    } else {
      activePlayer.pause();
      setPlaying(false);
    }
  }

  function setPlaying(playing) {
    if (playing) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  }

  btnSkipBackward.addEventListener('click', () => {
    if (!activePlayer) return;
    seekMedia(Math.max(0, activePlayer.currentTime - 2));
  });

  btnSkipForward.addEventListener('click', () => {
    if (!activePlayer) return;
    seekMedia(Math.min(mediaDuration, activePlayer.currentTime + 2));
  });

  // Split subtitle at playhead
  btnSplitAtPlayhead.addEventListener('click', () => {
    if (!activePlayer || !segments.length) return;
    const cur = activePlayer.currentTime;
    const segIdx = segments.findIndex((s) => cur > s.start + 0.3 && cur < s.end - 0.3);
    if (segIdx !== -1) {
      pushHistory('Split subtitle');

      const orig = segments[segIdx];
      const words = orig.text.split(/\s+/);
      const half = Math.max(1, Math.floor(words.length / 2));
      const text1 = words.slice(0, half).join(' ');
      const text2 = words.slice(half).join(' ');

      orig.end = Math.round(cur * 10) / 10;
      orig.text = formatCaptionText(text1, orig.caseMode);

      segments.splice(segIdx + 1, 0, {
        id: Date.now(),
        start: Math.round(cur * 10) / 10,
        end: orig.end,
        speaker: orig.speaker,
        lang: orig.lang,
        isOverlap: false,
        caseMode: orig.caseMode || globalCaseMode,
        text: formatCaptionText(text2 || 'lanjutan', orig.caseMode),
      });

      renderSubtitlesDrawer();
      renderTimelineSubtitleBlocks();
    } else {
      showToast('Position playhead inside a subtitle to split.');
    }
  });

  // ── Unified Zoom & Fit Timeline ─────────────────────────────

  function setZoom(newZoom, focalTime = null, focalViewportX = null) {
    const clampedZoom = Math.max(0.08, Math.min(15.0, Math.round(newZoom * 100) / 100));
    if (clampedZoom === zoomLevel) return;

    const oldPPS = getPixelsPerSecond();
    const vpW = timelineViewport.clientWidth || 800;

    // Pinpoint focal timestamp and its viewport screen position
    let targetTime = focalTime;
    let targetScreenX = focalViewportX;

    if (targetTime === null || targetTime === undefined) {
      if (activePlayer && activePlayer.currentTime > 0) {
        targetTime = activePlayer.currentTime;
        targetScreenX = timeToPx(targetTime) - timelineViewport.scrollLeft;
        if (targetScreenX < 0 || targetScreenX > vpW) {
          targetScreenX = vpW / 2;
        }
      } else {
        targetScreenX = vpW / 2;
        targetTime = (timelineViewport.scrollLeft + targetScreenX) / oldPPS;
      }
    }

    zoomLevel = clampedZoom;
    if (timelineZoomSlider) {
      timelineZoomSlider.value = zoomLevel;
    }

    refreshTimelineLayout();
    renderTimelineRuler();
    renderTimelineSubtitleBlocks();
    if (activePlayer) {
      updatePlayheadPosition(activePlayer.currentTime);
    }

    // Keep focal timestamp pinned to targetScreenX in the viewport
    const newPPS = getPixelsPerSecond();
    const newContentX = targetTime * newPPS;
    timelineViewport.scrollLeft = Math.max(0, newContentX - targetScreenX);
  }

  timelineZoomSlider.addEventListener('input', (e) => {
    setZoom(parseFloat(e.target.value));
  });

  btnZoomIn.addEventListener('click', () => {
    setZoom(zoomLevel * 1.3);
  });

  btnZoomOut.addEventListener('click', () => {
    setZoom(zoomLevel * 0.77);
  });

  btnFitTimeline.addEventListener('click', () => {
    const vpW = (timelineViewport.clientWidth || 800) - 40;
    const dur = mediaDuration || 10;
    const idealZoom = Math.max(0.08, Math.min(15.0, vpW / (dur * BASE_PPS)));
    setZoom(idealZoom, 0, 0);
    timelineViewport.scrollLeft = 0;
  });

  // ── Mouse Wheel: Scroll Timeline Horizontally & Ctrl+Scroll to Zoom ──

  studioTimeline.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      // ── Ctrl + Scroll: Zoom in / Zoom out centered on mouse cursor (Premiere Pro / CapCut style) ──
      e.preventDefault();
      const vpRect = timelineViewport.getBoundingClientRect();
      const mouseX = Math.max(0, Math.min(timelineViewport.clientWidth, e.clientX - vpRect.left));
      const curPPS = getPixelsPerSecond();
      const timeAtCursor = (timelineViewport.scrollLeft + mouseX) / curPPS;

      // Smooth exponential scaling: wheel up zooms in, wheel down zooms out
      const factor = e.deltaY < 0 ? 1.15 : 0.869;
      setZoom(zoomLevel * factor, timeAtCursor, mouseX);
    } else {
      // ── Normal Scroll: Horizontal Timeline Panning ──
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      timelineViewport.scrollLeft += delta;
    }
  }, { passive: false });

  // Prevent browser window zoom globally when Ctrl+scrolling anywhere inside the timeline
  window.addEventListener('wheel', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.target.closest('#studio-timeline, .studio-timeline')) {
      e.preventDefault();
    }
  }, { passive: false });

  // ── Collapse Timeline ───────────────────────────────────────

  btnCollapseTl.addEventListener('click', () => {
    isTimelineCollapsed = !isTimelineCollapsed;
    if (isTimelineCollapsed) {
      studioTimeline.style.height = '38px';
      timelineViewport.classList.add('hidden');
      btnCollapseTl.style.transform = 'rotate(180deg)';
    } else {
      studioTimeline.style.height = '190px';
      timelineViewport.classList.remove('hidden');
      btnCollapseTl.style.transform = 'rotate(0deg)';
      assignSubtitleTracks(segments);
    }
  });

  // ── Aspect Ratio Picker ─────────────────────────────────────

  function applyCanvasAspectRatio(ratio, label) {
    canvasFrame.className = 'stage-canvas-frame';
    if (ratio === '9-16') {
      canvasFrame.classList.add('aspect-9-16');
      aspectLabel.textContent = label || 'Original (9:16)';
    } else if (ratio === '16-9') {
      canvasFrame.classList.add('aspect-16-9');
      aspectLabel.textContent = label || 'Wide Landscape (16:9)';
    } else if (ratio === '1-1') {
      canvasFrame.classList.add('aspect-1-1');
      aspectLabel.textContent = label || 'Square (1:1)';
    } else {
      canvasFrame.classList.add('aspect-auto');
      aspectLabel.textContent = label || 'Original Ratio';
    }
    document.querySelectorAll('.aspect-opt-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.ratio === ratio);
    });
  }

  // ── Floating Toolbar Popovers & Controls ────────────────────

  function closeAllToolbarPopovers() {
    if (aspectDropdownMenu) aspectDropdownMenu.classList.add('hidden');
    if (volumePopover) volumePopover.classList.add('hidden');
    if (bgColorDropdown) bgColorDropdown.classList.add('hidden');
    if (textColorDropdown) textColorDropdown.classList.add('hidden');
  }

  // 1. Aspect Ratio Toggle & Options
  btnAspectToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = aspectDropdownMenu.classList.contains('hidden');
    closeAllToolbarPopovers();
    if (isClosed) aspectDropdownMenu.classList.remove('hidden');
  });

  document.querySelectorAll('.aspect-opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ratio = btn.dataset.ratio;
      let label = 'Wide Landscape (16:9)';
      if (ratio === '9-16') label = 'Original (9:16)';
      else if (ratio === '1-1') label = 'Square (1:1)';
      else if (ratio === 'auto') label = 'Original Ratio';
      applyCanvasAspectRatio(ratio, label);
      aspectDropdownMenu.classList.add('hidden');
    });
  });

  // 2. Volume Adjuster Controls
  if (btnVolumeToggle) {
    btnVolumeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = volumePopover.classList.contains('hidden');
      closeAllToolbarPopovers();
      if (isClosed) volumePopover.classList.remove('hidden');
    });
  }

  if (stageVolumeSlider) {
    stageVolumeSlider.addEventListener('input', () => {
      const val = parseInt(stageVolumeSlider.value, 10);
      setMediaVolume(val);
    });
  }

  document.querySelectorAll('.vol-quick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.vol, 10);
      if (stageVolumeSlider) stageVolumeSlider.value = val;
      setMediaVolume(val);
    });
  });

  function setMediaVolume(val) {
    const fraction = val / 100;
    if (activePlayer) {
      activePlayer.volume = fraction;
      activePlayer.muted = (val === 0);
    }
    if (volSliderText) volSliderText.textContent = `${val}%`;
    if (volumeLevelLabel) volumeLevelLabel.textContent = `${val}%`;

    if (volIconHigh && volIconMuted) {
      if (val === 0) {
        volIconHigh.classList.add('hidden');
        volIconMuted.classList.remove('hidden');
      } else {
        volIconHigh.classList.remove('hidden');
        volIconMuted.classList.add('hidden');
      }
    }
  }

  // 3. Subtitle Box Background Color Editor (Palette + Hex Input)
  if (btnBgToggle) {
    btnBgToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = bgColorDropdown.classList.contains('hidden');
      closeAllToolbarPopovers();
      if (isClosed) bgColorDropdown.classList.remove('hidden');
    });
  }

  function applySubtitleBoxBgColor(color) {
    if (!color) return;
    pushHistory('Change subtitle box background color');

    if (color === 'transparent') {
      subtitleStyle.showBoxBg = false;
      subtitleStyle.boxBgColor = 'transparent';
      if (toggleBoxBg) toggleBoxBg.checked = false;
      if (boxBgSliderRow) boxBgSliderRow.classList.add('disabled-row');
      if (bgColorDot) {
        bgColorDot.style.background = 'repeating-conic-gradient(#CBD5E1 0% 25%, #FFF 0% 50%) 50% / 8px 8px';
      }
    } else {
      subtitleStyle.showBoxBg = true;
      subtitleStyle.boxBgColor = color;
      if (toggleBoxBg) toggleBoxBg.checked = true;
      if (boxBgSliderRow) boxBgSliderRow.classList.remove('disabled-row');
      if (bgColorDot) bgColorDot.style.background = color;
    }

    if (bgNativeColor) bgNativeColor.value = color.startsWith('#') ? color : '#000000';
    if (bgHexInput) bgHexInput.value = color.replace(/^#/, '');

    document.querySelectorAll('#bg-palette-grid .color-swatch').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === color.toLowerCase());
    });

    updateLiveOverlay();
  }

  document.querySelectorAll('#bg-palette-grid .color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      applySubtitleBoxBgColor(swatch.dataset.color);
    });
  });

  if (bgNativeColor) {
    bgNativeColor.addEventListener('input', (e) => {
      applySubtitleBoxBgColor(e.target.value);
    });
  }

  if (bgHexInput) {
    bgHexInput.addEventListener('input', (e) => {
      const cleanHex = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
      e.target.value = cleanHex;
      if (cleanHex.length === 3 || cleanHex.length === 6) {
        applySubtitleBoxBgColor('#' + cleanHex);
      }
    });
  }

  // 4. Subtitle Text Color Editor (Palette + Hex Input)
  if (btnTextColorToggle) {
    btnTextColorToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = textColorDropdown.classList.contains('hidden');
      closeAllToolbarPopovers();
      if (isClosed) textColorDropdown.classList.remove('hidden');
    });
  }

  function applySubtitleTextColor(color) {
    if (!color) return;
    subtitleStyle.textColor = color;
    if (textColorDot) textColorDot.style.background = color;
    if (textNativeColor) textNativeColor.value = color.startsWith('#') ? color : '#FFFFFF';
    if (textHexInput) textHexInput.value = color.replace(/^#/, '');

    document.querySelectorAll('#text-palette-grid .color-swatch').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === color.toLowerCase());
    });

    updateLiveOverlay();
  }

  document.querySelectorAll('#text-palette-grid .color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      applySubtitleTextColor(swatch.dataset.color);
    });
  });

  if (textNativeColor) {
    textNativeColor.addEventListener('input', (e) => {
      applySubtitleTextColor(e.target.value);
    });
  }

  if (textHexInput) {
    textHexInput.addEventListener('input', (e) => {
      const cleanHex = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
      e.target.value = cleanHex;
      if (cleanHex.length === 3 || cleanHex.length === 6) {
        applySubtitleTextColor('#' + cleanHex);
      }
    });
  }

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.floating-stage-toolbar')) {
      closeAllToolbarPopovers();
    }
    if (exportMenu && !e.target.closest('.export-dropdown-wrap')) {
      exportMenu.classList.add('hidden');
    }
  });

  // ── Drawer Options Toggle ───────────────────────────────────

  btnToggleOptions.addEventListener('click', () => {
    drawerOptionsStrip.classList.toggle('hidden');
  });

  // ── Export Handlers ─────────────────────────────────────────

  btnDoneTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('hidden');
  });

  function formatSegmentForExport(seg) {
    const text = seg.text;
    if (subtitleStyle.speakerFormat === 'clean') return text;
    if (subtitleStyle.speakerFormat === 'dash') return `- ${text}`;
    return `[${seg.speaker || 'Speaker 1'}] ${text}`;
  }

  btnExportSrt.addEventListener('click', () => {
    if (!segments.length) {
      showToast('No subtitles to export yet.');
      return;
    }
    let out = '';
    segments.forEach((seg, i) => {
      out += `${i + 1}\r\n`;
      out += `${formatSrtTimestamp(seg.start)} --> ${formatSrtTimestamp(seg.end)}\r\n`;
      out += `${formatSegmentForExport(seg)}\r\n\r\n`;
    });
    triggerDownload(out, `${getFilename()}.srt`, 'text/plain');
    exportMenu.classList.add('hidden');
  });

  btnExportVtt.addEventListener('click', () => {
    if (!segments.length) {
      showToast('No subtitles to export yet.');
      return;
    }
    let out = 'WEBVTT\r\n\r\n';
    segments.forEach((seg, i) => {
      out += `${i + 1}\r\n`;
      out += `${formatVttTimestamp(seg.start)} --> ${formatVttTimestamp(seg.end)}\r\n`;
      out += `${formatSegmentForExport(seg)}\r\n\r\n`;
    });
    triggerDownload(out, `${getFilename()}.vtt`, 'text/vtt');
    exportMenu.classList.add('hidden');
  });

  btnExportTxt.addEventListener('click', () => {
    if (!segments.length) {
      showToast('No subtitles to export yet.');
      return;
    }
    const out = segments
      .map((s) => `[${formatVeedTime(s.start)} - ${formatVeedTime(s.end)}] ${formatSegmentForExport(s)}`)
      .join('\r\n');
    triggerDownload(out, `${getFilename()}.txt`, 'text/plain');
    exportMenu.classList.add('hidden');
  });

  btnCopyAll.addEventListener('click', () => {
    if (!segments.length) {
      showToast('No subtitles to copy.');
      return;
    }
    const out = segments.map((s) => formatSegmentForExport(s)).join('\n');
    navigator.clipboard.writeText(out).then(() => {
      showToast('Copied subtitles to clipboard!');
      exportMenu.classList.add('hidden');
    });
  });

  function triggerDownload(content, filename, mime) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getFilename() {
    return projectTitleInput.value.trim() || 'captionize_subtitles';
  }

  // ── Toast & Helpers ─────────────────────────────────────────

  function showToast(msg) {
    toastMessage.textContent = msg;
    stageErrorToast.classList.remove('hidden');
    setTimeout(() => {
      stageErrorToast.classList.add('hidden');
    }, 3500);
  }

  btnDismissToast.addEventListener('click', () => {
    stageErrorToast.classList.add('hidden');
  });

  function updateTimeDisplay(current, total) {
    timeDisplay.textContent = `${formatVeedTime(current)} / ${formatVeedTime(total)}`;
  }

  function formatVeedTime(sec) {
    const s = Math.max(0, sec || 0);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const tenths = Math.floor((s % 1) * 10);
    return `${pad(mins, 2)}:${pad(secs, 2)}.${tenths}`;
  }

  function formatSrtTimestamp(sec) {
    const s = Math.max(0, sec || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
  }

  function formatVttTimestamp(sec) {
    const s = Math.max(0, sec || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
  }

  function pad(n, len) {
    let s = String(n);
    while (s.length < len) s = '0' + s;
    return s;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isElementInViewport(el, container) {
    const elR = el.getBoundingClientRect();
    const ctR = container.getBoundingClientRect();
    return elR.top >= ctR.top && elR.bottom <= ctR.bottom;
  }

  window.addEventListener('resize', () => {
    refreshTimelineLayout();
    renderTimelineRuler();
    renderTimelineSubtitleBlocks();
    if (activePlayer) updatePlayheadPosition(activePlayer.currentTime);
  });

  // ── Initial State Setup ─────────────────────────────────────
  // Open upload modal on startup if no media has been selected
  if (!activeFile) {
    openUploadModal();
  }

})();
