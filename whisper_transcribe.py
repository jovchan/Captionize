import sys
import json
import os

os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

def run_transcription(audio_path, language=None, task='transcribe'):
    from faster_whisper import WhisperModel

    lang_param = None
    if language and language not in ['auto', '']:
        lang_param = language

    device = 'cpu'
    segments_list = []
    info = None

    # Try CUDA first, fall back to CPU if cublas DLL is missing
    try:
        model = WhisperModel('small', device='cuda', compute_type='float16')
        segs_gen, info = model.transcribe(
            audio_path,
            language=lang_param,
            task=task,
            beam_size=5,
            word_timestamps=True,
        )
        segments_list = list(segs_gen)
        device = 'cuda'
    except Exception:
        model = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4)
        segs_gen, info = model.transcribe(
            audio_path,
            language=lang_param,
            task=task,
            beam_size=5,
            word_timestamps=True,
        )
        segments_list = list(segs_gen)
        device = 'cpu'

    detected_lang = (info.language if info else None) or 'id'
    raw_segments = []

    for seg in segments_list:
        words = []
        if seg.words:
            for w in seg.words:
                words.append({
                    'word': w.word.strip(),
                    'start': round(w.start, 2),
                    'end': round(w.end, 2),
                    'probability': round(w.probability, 2)
                })
        raw_segments.append({
            'start': round(seg.start, 2),
            'end': round(seg.end, 2),
            'text': seg.text.strip(),
            'words': words
        })

    return {
        'success': True,
        'language': detected_lang,
        'duration': round(info.duration, 2) if info and hasattr(info, 'duration') else 0,
        'device': device,
        'raw_segments': raw_segments
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Missing audio file path'}))
        sys.exit(1)

    audio_file = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else 'auto'
    mode = sys.argv[3] if len(sys.argv) > 3 else 'transcribe'

    try:
        output = run_transcription(audio_file, language=lang, task=mode)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as err:
        print(json.dumps({'success': False, 'error': str(err)}))
        sys.exit(1)
