import { useState, useRef, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import HelpDialog from './HelpDialog'
import './App.css'

// ── Types ────────────────────────────────────────────────

interface Segment {
  url: string
  name: string
  start: number
  end: number
  size: number
}

interface PanelTab {
  id: TabId
  label: string
  badge: number | null
}

type TabId = 'markers' | 'segments' | 'export'

// ── Constants ────────────────────────────────────────────

const ffmpeg = new FFmpeg()

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB

// ── Helpers ──────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '00:00:00:00'
  const h  = Math.floor(seconds / 3600)
  const m  = Math.floor((seconds % 3600) / 60)
  const s  = Math.floor(seconds % 60)
  const f  = Math.floor((seconds % 1) * 100)
  return [h, m, s, f].map((v, i) => String(v).padStart(i === 3 ? 2 : 2, '0')).join(':')
}

function formatTimeShort(seconds: number): string {
  if (!isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function getFileExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'mp4'
}

// ── Component ────────────────────────────────────────────

export default function App() {
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [videoFile,     setVideoFile]     = useState<File | null>(null)
  const [videoUrl,      setVideoUrl]      = useState<string | null>(null)
  const [duration,      setDuration]      = useState(0)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [markers,       setMarkers]       = useState<number[]>([])
  const [processing,    setProcessing]    = useState(false)
  const [segments,      setSegments]      = useState<Segment[]>([])
  const [isDragging,    setIsDragging]    = useState(false)
  const [activePanel,   setActivePanel]   = useState<TabId>('markers')
  const [showHelp,      setShowHelp]      = useState(false)
  const [tcInput,       setTcInput]       = useState<string | null>(null)

  const videoRef    = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => { void loadFFmpeg() }, [])

  // ── FFmpeg ──

  async function loadFFmpeg(): Promise<void> {
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js',   'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      })
      setFfmpegLoaded(true)
    } catch (err) {
      console.error('FFmpeg load error:', err)
    }
  }

  // ── File handling ──

  function openFile(file: File): void {
    if (file.size > MAX_FILE_SIZE) {
      alert('ファイルサイズが大きすぎます（上限: 2GB）')
      return
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setMarkers([])
    setSegments([])
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (file) openFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('video/')) openFile(file)
  }

  // ── Video events ──

  function handleVideoLoaded(): void {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }

  function handleTimeUpdate(): void {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  // ── Timecode input ──

  function parseTC(str: string): number | null {
    // 受け付けるフォーマット: HH:MM:SS:FF / HH:MM:SS / MM:SS / SS
    const clean = str.trim().replace(/[;,]/, ':')
    const parts = clean.split(':').map(Number)
    if (parts.some(isNaN)) return null
    if (parts.length === 4) return parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / 100
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 1) return parts[0]
    return null
  }

  function commitTC(): void {
    if (tcInput === null) return
    const t = parseTC(tcInput)
    if (t !== null && isFinite(t) && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(t, duration))
    }
    setTcInput(null)
  }

  function handleTCKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') { commitTC(); (e.target as HTMLInputElement).blur() }
    if (e.key === 'Escape') setTcInput(null)
  }

  // ── Markers ──

  function addMarker(): void {
    const t = videoRef.current?.currentTime ?? 0
    setMarkers(prev => {
      if (prev.some(m => Math.abs(m - t) < 0.05)) return prev
      return [...prev, t].sort((a, b) => a - b)
    })
  }

  function removeMarker(idx: number): void {
    setMarkers(prev => prev.filter((_, i) => i !== idx))
  }

  function seekToMarker(t: number): void {
    if (videoRef.current) videoRef.current.currentTime = t
  }

  // ── Timeline ──

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (!duration || !timelineRef.current) return
    const rect  = timelineRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = ratio * duration
  }

  // ── Segments ──

  function getSegments(): { start: number; end: number }[] {
    const points = [0, ...markers, duration].sort((a, b) => a - b)
    const segs: { start: number; end: number }[] = []
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1] - points[i] > 0.05)
        segs.push({ start: points[i], end: points[i + 1] })
    }
    return segs
  }

  async function processSegments(): Promise<void> {
    if (!videoFile || !ffmpegLoaded) return
    setProcessing(true)

    // 前回の Object URL を解放
    setSegments(prev => { prev.forEach(s => URL.revokeObjectURL(s.url)); return [] })

    const segs      = getSegments()
    const ext       = getFileExt(videoFile.name)
    const inputName = `input.${ext}`

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile))
      const results: Segment[] = []

      for (let i = 0; i < segs.length; i++) {
        const { start, end } = segs[i]
        const outputName = `segment_${i + 1}.${ext}`

        await ffmpeg.exec([
          '-i', inputName,
          '-ss', String(start),
          '-to', String(end),
          '-c',  'copy',
          '-avoid_negative_ts', 'make_zero',
          outputName,
        ])

        const data     = await ffmpeg.readFile(outputName)
        const blob     = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: videoFile.type || 'video/mp4' })
        const baseName = videoFile.name.replace(new RegExp(`\\.${ext}$`, 'i'), '')

        results.push({
          url:   URL.createObjectURL(blob),
          name:  `${baseName}_part${i + 1}.${ext}`,
          start, end,
          size:  blob.size,
        })
        await ffmpeg.deleteFile(outputName)
      }

      await ffmpeg.deleteFile(inputName)
      setSegments(results)
      setActivePanel('export')
    } catch (err) {
      console.error(err)
      // 仮想FS に残留したファイルをクリーンアップ
      try { await ffmpeg.deleteFile(inputName) } catch { /* already gone */ }
      for (let i = 0; i < segs.length; i++) {
        try { await ffmpeg.deleteFile(`segment_${i + 1}.${ext}`) } catch { /* already gone */ }
      }
    } finally {
      setProcessing(false)
    }
  }

  // ── Derived state ──


  const segmentList = duration > 0 ? getSegments() : []

  const panelTabs: PanelTab[] = [
    { id: 'markers',  label: 'マーカー',    badge: markers.length     || null },
    { id: 'segments', label: 'セグメント',   badge: segmentList.length || null },
    { id: 'export',   label: 'ダウンロード', badge: segments.length    || null },
  ]

  // ── Render ───────────────────────────────────────────

  return (
    <div className="ps-app">
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}

      {/* ── Menu bar ── */}
      <header className="ps-menubar">
        <div className="ps-menubar-left">
          <span className="ps-logo">Video Cutter</span>
          <div className="ps-menu-divider" />
          <label className="ps-menu-btn">
            ファイルを開く
            <input type="file" accept="video/*" onChange={handleFileChange} hidden />
          </label>
        </div>
        <div className="ps-menubar-center">
          {videoFile && <span className="ps-filename">{videoFile.name}</span>}
        </div>
        <div className="ps-menubar-right">
          <button className="ps-menu-btn" onClick={() => setShowHelp(true)}>？ 使い方</button>
        </div>
      </header>

      {!videoUrl ? (
        /* ── Drop zone ── */
        <div className="dz-screen">

          {/* 概要 */}
          <div className="dz-overview">
            <div className="dz-overview-logo">🎬</div>
            <h2 className="dz-overview-title">Video Cutter</h2>
            <p className="dz-overview-desc">
              動画ファイルを読み込んでマーカーを置くだけで、好きな場所で分割・ダウンロードできるツールです。
              すべての処理はブラウザ内で完結し、ファイルが外部に送信されることはありません。
            </p>
            <div className="dz-features">
              <div className="dz-feature">
                <span className="dz-feature-icon">◆</span>
                <span>複数マーカーで自由に分割</span>
              </div>
              <div className="dz-feature">
                <span className="dz-feature-icon">⚡</span>
                <span>WebAssembly FFmpeg による高速処理</span>
              </div>
              <div className="dz-feature">
                <span className="dz-feature-icon">🔒</span>
                <span>完全オフライン・プライバシー保護</span>
              </div>
              <div className="dz-feature">
                <span className="dz-feature-icon">✂</span>
                <span>無劣化コピーカット</span>
              </div>
            </div>
          </div>

          {/* ドロップゾーン */}
          <div
            className={`ps-dropzone ${isDragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="dz-icon">🎞️</div>
            <p className="dz-title">動画ファイルをドラッグ＆ドロップ</p>
            <p className="dz-sub">または</p>
            <label className="ps-btn ps-btn-primary">
              ファイルを選択
              <input type="file" accept="video/*" onChange={handleFileChange} hidden />
            </label>
            <p className="dz-hint">MP4 · MOV · AVI · MKV · WebM（最大 2GB）</p>
          </div>

        </div>
      ) : (
        /* ── Editor workspace ── */
        <div className="ps-workspace">

          {/* Video canvas */}
          <main className="ps-canvas">
            <div className="ps-video-bg">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleVideoLoaded}
                onTimeUpdate={handleTimeUpdate}
                controls
              />
            </div>
          </main>

          {/* Right panels */}
          <aside className="ps-sidebar">
            <div className="ps-panel-tabs">
              {panelTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`ps-tab ${activePanel === tab.id ? 'active' : ''}`}
                  onClick={() => setActivePanel(tab.id)}
                >
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="ps-tab-badge">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="ps-panel-body">

              {/* Markers panel */}
              {activePanel === 'markers' && (
                <div className="ps-panel-content">
                  <div className="ps-panel-toolbar">
                    <button
                      className="ps-btn ps-btn-primary ps-btn-sm"
                      onClick={addMarker}
                      disabled={!duration}
                    >
                      + 現在位置にマーカー追加
                    </button>
                  </div>
                  {markers.length === 0 ? (
                    <p className="ps-empty">
                      マーカーがありません<br />
                      動画を再生し、カットしたい位置でマーカーを追加してください
                    </p>
                  ) : (
                    <div className="ps-marker-list">
                      {markers.map((m, i) => (
                        <div key={i} className="ps-marker-row">
                          <div
                            className="ps-marker-swatch"
                            style={{ background: `hsl(${(i * 47 + 30) % 360},80%,60%)` }}
                          />
                          <span className="ps-marker-idx">M{i + 1}</span>
                          <button className="ps-timecode" onClick={() => seekToMarker(m)}>
                            {formatTime(m)}
                          </button>
                          <button
                            className="ps-icon-btn ps-icon-del"
                            onClick={() => removeMarker(i)}
                            title="削除"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Segments panel */}
              {activePanel === 'segments' && (
                <div className="ps-panel-content">
                  {segmentList.length === 0 ? (
                    <p className="ps-empty">マーカーを追加すると<br />セグメントが表示されます</p>
                  ) : (
                    <div className="ps-seg-list">
                      {segmentList.map((seg, i) => (
                        <div
                          key={i}
                          className="ps-seg-row"
                          style={{ '--c': `hsl(${(i * 47 + 30) % 360},70%,55%)` } as React.CSSProperties}
                        >
                          <div className="ps-seg-bar" />
                          <div className="ps-seg-info">
                            <span className="ps-seg-label">セグメント {i + 1}</span>
                            <span className="ps-seg-range">
                              {formatTime(seg.start)} → {formatTime(seg.end)}
                            </span>
                            <span className="ps-seg-dur">
                              {formatTimeShort(seg.end - seg.start)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="ps-panel-footer">
                    <button
                      className="ps-btn ps-btn-accent ps-btn-block"
                      onClick={() => void processSegments()}
                      disabled={processing || !ffmpegLoaded || segmentList.length === 0}
                    >
                      {processing ? '処理中...' : `✂ ${segmentList.length}個に分割`}
                    </button>
                  </div>
                </div>
              )}

              {/* Export / Download panel */}
              {activePanel === 'export' && (
                <div className="ps-panel-content">
                  {segments.length === 0 ? (
                    <p className="ps-empty">セグメントタブから<br />分割処理を実行してください</p>
                  ) : (
                    <div className="ps-export-list">
                      {segments.map((seg, i) => (
                        <div key={i} className="ps-export-row">
                          <div
                            className="ps-export-thumb"
                            style={{ background: `hsl(${(i * 47 + 30) % 360},50%,25%)` }}
                          >
                            <span style={{ color: `hsl(${(i * 47 + 30) % 360},80%,70%)`, fontSize: 18 }}>
                              ▶
                            </span>
                          </div>
                          <div className="ps-export-info">
                            <div className="ps-export-name">{seg.name}</div>
                            <div className="ps-export-meta">
                              {formatTime(seg.start)} → {formatTime(seg.end)}
                              &nbsp;·&nbsp;{(seg.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                          <a className="ps-btn ps-btn-dl" href={seg.url} download={seg.name}>↓</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </aside>
        </div>
      )}

      {/* ── Timeline & controls ── */}
      {videoUrl && (
        <div className="ps-bottom">
          <div className="ps-timeline-wrap">
            <div
              className="ps-timeline"
              ref={timelineRef}
              onClick={handleTimelineClick}
            >
              {/* Segment color bands */}
              {segmentList.map((seg, i) => (
                <div
                  key={i}
                  className="ps-tl-seg"
                  style={{
                    left:       `${(seg.start / duration) * 100}%`,
                    width:      `${((seg.end - seg.start) / duration) * 100}%`,
                    background: `hsl(${(i * 47 + 30) % 360},60%,40%)`,
                  }}
                />
              ))}

              {/* Tick marks */}
              {duration > 0 && (() => {
                const interval = duration <= 30 ? 5 : duration <= 120 ? 10 : duration <= 600 ? 30 : 60
                const count    = Math.floor(duration / interval)
                return Array.from({ length: count + 1 }, (_, k) => {
                  const t = k * interval
                  if (t > duration) return null
                  return (
                    <div key={k} className="ps-tl-tick" style={{ left: `${(t / duration) * 100}%` }}>
                      <span className="ps-tl-tick-label">{formatTimeShort(t)}</span>
                    </div>
                  )
                })
              })()}

              {/* Markers */}
              {markers.map((m, i) => (
                <div
                  key={i}
                  className="ps-tl-marker"
                  style={{ left: `${(m / duration) * 100}%` }}
                  title={`マーカー ${i + 1}: ${formatTime(m)}`}
                >
                  <div
                    className="ps-tl-marker-flag"
                    style={{ background: `hsl(${(i * 47 + 30) % 360},80%,60%)` }}
                  />
                </div>
              ))}

              {/* Playhead */}
              <div
                className="ps-tl-playhead"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="ps-controls">
            <div className="ps-tc-display ps-tc-editable" title="クリックして時間を入力">
              <span className="ps-tc-label">TC</span>
              {tcInput !== null ? (
                <input
                  className="ps-tc-input"
                  value={tcInput}
                  onChange={e => setTcInput(e.target.value)}
                  onBlur={commitTC}
                  onKeyDown={handleTCKeyDown}
                  autoFocus
                  spellCheck={false}
                  placeholder="00:00:00:00"
                />
              ) : (
                <span
                  className="ps-tc-value ps-tc-clickable"
                  onClick={() => setTcInput(formatTime(currentTime))}
                >
                  {formatTime(currentTime)}
                </span>
              )}
            </div>
            <div className="ps-tc-display ps-tc-dur">
              <span className="ps-tc-label">DUR</span>
              <span className="ps-tc-value">{formatTime(duration)}</span>
            </div>
            <div className="ps-ctrl-sep" />
            <button
              className="ps-btn ps-btn-marker"
              onClick={addMarker}
              disabled={!duration}
              title="現在位置にマーカー追加"
            >
              ◆ マーカー追加
            </button>
            <div className="ps-ctrl-sep" />
            <span className="ps-seg-count">{segmentList.length} セグメント</span>
            <button
              className="ps-btn ps-btn-accent"
              onClick={() => void processSegments()}
              disabled={processing || !ffmpegLoaded || segmentList.length === 0}
            >
              {processing ? '処理中...' : '✂ 分割してエクスポート'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
