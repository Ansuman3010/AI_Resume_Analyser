import { useState, useRef } from 'react'
import './App.css'
import logo from './assets/image.png';

function ScoreRing({ score }) {
  const clamped = Math.min(100, Math.max(0, score))
  const color = clamped >= 75 ? '#10b981' : clamped >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="score-ring-wrapper">
      <div
        className="score-ring"
        style={{ background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}
      >
        <div className="score-inner">
          <span className="score-number">{clamped}</span>
          <span className="score-label-sm">/ 100</span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped?.type === 'application/pdf') { setFile(dropped); setError(null) }
    else if (dropped) setError('Please upload a valid PDF file.')
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected?.type === 'application/pdf') { setFile(selected); setError(null) }
    else if (selected) setError('Please upload a valid PDF file.')
  }

  const handleAnalyze = async () => {
    if (!file) return
    setIsLoading(true); setError(null); setResult(null)
    const formData = new FormData()
    formData.append('resume', file)
    if (jobDescription.trim()) formData.append('jobDescription', jobDescription)
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to analyze resume')
      }
      setResult(await response.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const scoreLabel = (s) => s >= 75 ? '🟢 Excellent' : s >= 50 ? '🟡 Needs Work' : '🔴 Major Gaps'

  return (
    <div className="app-container">
      {/* ── Hero ── */}
      <header className="hero">
        <h1 className="app-title">
          <img src={logo} alt="AI Resume Analyzer Logo" className="logo" />
          AI Resume Analyzer
        </h1>
        <p>Upload your PDF resume and get instant ATS scoring, strengths breakdown, and actionable improvement suggestions.</p>
      </header>

      <main className="main-content">
        {/* ── Upload Panel ── */}
        {!result && !isLoading && (
          <div className="glass-panel upload-section">
            <p className="upload-section-title">📄 Upload Your Resume</p>

            <div
              className={`drop-zone ${isDragging ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <div className="upload-icon">☁️</div>
              <h3>Drag &amp; drop your resume</h3>
              <p>or click to browse — PDF only</p>
              <input
                id="resume-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                style={{ display: 'none' }}
              />
              {file && (
                <div className="file-info">📎 {file.name}</div>
              )}
            </div>

            {/* Job Description */}
            <div className="job-description-area">
              <label htmlFor="job-desc">
                Target Job Description
                <span className="optional-badge">Optional</span>
              </label>
              <textarea
                id="job-desc"
                placeholder="Paste the job description here to get a tailored match score and role-specific suggestions..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            {/* Error + Button */}
            <div className="btn-row">
              {error
                ? <span className="error-msg">⚠️ {error}</span>
                : <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {file ? `✅ Ready to analyze: ${file.name}` : 'No file selected yet'}
                </span>
              }
              <button
                id="analyze-btn"
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={!file}
              >
                Analyze Resume
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="glass-panel loading-state">
            <div className="spinner" />
            <h2>Analyzing your resume…</h2>
            <p>The AI is reading your experience and generating insights. This takes a few seconds.</p>
          </div>
        )}

        {/* ── Results ── */}
        {result && !isLoading && (
          <div className="results-section">

            {/* Score */}
            <div className="glass-panel score-card">
              <ScoreRing score={result.score} />
              <div className="score-info">
                <h2>ATS Match Score</h2>
                <p>{scoreLabel(result.score)}</p>
                <div className="score-bar-row">
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${result.score}%` }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {result.score} / 100
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="glass-panel summary-card">
              <h3>🧠 Executive Summary</h3>
              <p>{result.summary}</p>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid-2">
              <div className="glass-panel list-card">
                <h3><span>✅</span> Key Strengths</h3>
                <ul>
                  {result.strengths?.map((item, i) => (
                    <li key={i}><span className="li-icon" style={{ color: 'var(--success)' }}>✓</span>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="glass-panel list-card">
                <h3><span>⚠️</span> Areas to Improve</h3>
                <ul>
                  {result.weaknesses?.map((item, i) => (
                    <li key={i}><span className="li-icon" style={{ color: 'var(--danger)' }}>✕</span>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggestions */}
            <div className="glass-panel list-card">
              <h3>💡 Actionable Suggestions</h3>
              <ul className="suggestions-list">
                {result.suggestions?.map((item, i) => (
                  <li key={i}><span className="li-icon" style={{ color: 'var(--primary-light)' }}>→</span>{item}</li>
                ))}
              </ul>
            </div>

            {/* Keywords */}
            <div className="glass-panel list-card keywords">
              <h3> Detected Keywords</h3>
              <div className="keyword-tags">
                {result.keywords?.map((item, i) => (
                  <span className="tag" key={i}>{item}</span>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div className="reset-btn-row">
              <button id="analyze-another-btn" className="reset-btn" onClick={() => { setResult(null); setFile(null); setJobDescription('') }}>
                ↺ Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
