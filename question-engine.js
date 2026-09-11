/**
 * Question Engine – telc Deutsch B2 · Deutsch mit Rawad
 * يدعم جميع ملفات JSON الجديدة (L1, L2, L3, H1, H3, S1)
 * تم إصلاح عرض النص في L2 قبل الأسئلة
 */
(function () {
    'use strict'

    const POINTS = 10

    /** ملفات الصوت في جذر الموقع: teil1_num1.mp3 */
    const VOICES_BASE = ''

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    function shuffle(arr) {
        const a = arr.slice()
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const t = a[i]; a[i] = a[j]; a[j] = t
        }
        return a
    }

    function pickRandom(arr) {
        if (!arr || !arr.length) return null
        return arr[Math.floor(Math.random() * arr.length)]
    }

    function pickRandomKey(obj) {
        const keys = Object.keys(obj || {})
        return keys.length ? pickRandom(keys) : null
    }

    function isCorrectStatus(status) {
        const s = String(status || '').toLowerCase()
        return s === 'correct' || s === 'richtig'
    }

    function horenTeilNum(fileKey) {
        return { horen1: 1, horen2: 2, horen3: 3 }[fileKey] || 0
    }

    function horenAudioTryNames(sectionId) {
        const sid = String(sectionId).toLowerCase().replace(/\s/g, '')
        const names = [sid]
        const baseNum = sid.replace(/[a-z]+$/i, '')
        if (baseNum && baseNum !== sid) names.push(baseNum)
        if (/^\d+$/.test(sid)) names.push(sid + 'a')
        return names.filter(function (v, i, a) { return a.indexOf(v) === i })
    }

    function horenAudioCandidates(fileKey, sectionId) {
        const teil = horenTeilNum(fileKey)
        const names = horenAudioTryNames(sectionId)
        const exts = ['mp3', 'm4a']
        const list = []
        names.forEach(function (n) {
            const baseName = 'teil' + teil + '_num' + n
            exts.forEach(function (ext) {
                list.push({ baseName: baseName, ext: ext, src: VOICES_BASE + baseName + '.' + ext })
            })
        })
        return list
    }

    function voiceUrl(baseName, ext) {
        return VOICES_BASE + baseName + '.' + ext
    }

    function hasHorenAudio() {
        return true
    }

    function audioPlayerHtml(fileKey, sectionId) {
        const candidates = horenAudioCandidates(fileKey, sectionId)
        if (!candidates.length) {
            return `<div class="qe-audio-panel qe-audio-missing">
                <div class="qe-audio-head">
                    <span class="qe-audio-icon"><i class="fas fa-volume-mute"></i></span>
                    <div class="qe-audio-meta">
                        <strong>Hörtext · Modell ${esc(String(sectionId))}</strong>
                        <span class="qe-audio-sub">⚠️ No audio available / لا يوجد ملف صوتي</span>
                    </div>
                </div>
                <p class="qe-audio-fallback"><i class="fas fa-volume-mute"></i> No audio available</p>
            </div>`
        }

        const sourcesHtml = candidates.map(function (c) {
            const type = c.ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg'
            return `<source src="${esc(c.src)}" type="${type}">`
        }).join('')

        return `<div class="qe-audio-panel" data-audio-base="${esc(candidates[0].src)}">
            <div class="qe-audio-head">
                <span class="qe-audio-icon"><i class="fas fa-headphones"></i></span>
                <div class="qe-audio-meta">
                    <strong>Hörtext · Modell ${esc(String(sectionId))}</strong>
                    <span class="qe-audio-sub">Zuerst hören, dann antworten · اسمع ثم أجب</span>
                </div>
                <button type="button" class="qe-audio-replay" title="Nochmal abspielen"><i class="fas fa-redo"></i></button>
            </div>
            <div class="qe-audio-wave" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
            <audio class="qe-audio-player" controls preload="metadata" playsinline>
                ${sourcesHtml}
            </audio>
            <p class="qe-audio-fallback" hidden><i class="fas fa-volume-mute"></i> Keine Audiodatei</p>
        </div>`
    }

    function bindAudioPlayer(root) {
        const panel = root.querySelector('.qe-audio-panel')
        const audio = panel && panel.querySelector('.qe-audio-player')
        const fallback = panel && panel.querySelector('.qe-audio-fallback')
        const replay = panel && panel.querySelector('.qe-audio-replay')
        if (!audio || !panel) return

        audio.addEventListener('play', function () { panel.classList.add('qe-audio-playing') })
        audio.addEventListener('pause', function () { panel.classList.remove('qe-audio-playing') })
        audio.addEventListener('ended', function () { panel.classList.remove('qe-audio-playing') })
        audio.addEventListener('loadedmetadata', function () {
            panel.classList.add('qe-audio-ready')
            panel.classList.remove('qe-audio-missing')
            if (fallback) fallback.hidden = true
        })
        audio.addEventListener('error', function () {
            window.setTimeout(function () {
                if (!audio || audio.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE) return
                panel.classList.add('qe-audio-missing')
                if (fallback) fallback.hidden = false
            }, 400)
        })

        if (replay) {
            replay.addEventListener('click', function () {
                audio.currentTime = 0
                audio.play().catch(function () { })
            })
        }
    }

    function revealAllAnswers(root) {
        if (!root) return
        root.classList.add('qe-answers-visible')
        const btn = root.querySelector('.qe-show-answers-btn')
        if (btn) {
            btn.setAttribute('aria-pressed', 'true')
            btn.classList.add('active')
            const span = btn.querySelector('span')
            if (span) span.textContent = 'Antworten verbergen / إخفاء الإجابات'
        }
    }

    function mcCorrectLabel(btn) {
        if (!btn) return ''
        const letter = btn.querySelector('.qe-opt-letter')
        const de = btn.querySelector('.qe-line-de')
        const l = letter ? letter.textContent.trim() : ''
        const t = de ? de.textContent.trim() : ''
        return l && t ? l + ') ' + t : t || l
    }

    function bilingualBlock(de, ar, extraClass) {
        const deText = de || ''
        const arText = ar || ''
        const showAr = arText && arText !== deText
        return `<div class="qe-bilingual${extraClass ? ' ' + extraClass : ''}">
            <p class="qe-line-de" dir="ltr">${esc(deText)}</p>
            ${showAr ? `<p class="qe-line-ar" dir="rtl">${esc(arText)}</p>` : ''}
        </div>`
    }

    function langPrefBar() {
        return `<div class="qe-lang-pref" role="group" aria-label="Arabic translation">
            <span class="qe-lang-pref-label">Deutsch</span>
            <button type="button" class="qe-ar-toggle-btn" aria-pressed="false" title="Arabische Übersetzung">
                <i class="fas fa-language"></i><span>+ عربي</span>
            </button>
        </div>`
    }

    function exerciseToolbar(extra) {
        return `<div class="qe-toolbar">
            ${langPrefBar()}
            <button type="button" class="qe-show-answers-btn" aria-pressed="false">
                <i class="fas fa-eye"></i>
                <span>Antworten anzeigen / إظهار الإجابات</span>
            </button>
            ${extra || ''}
        </div>`
    }

    function bindLangPref(root) {
        if (!root) return
        const saved = localStorage.getItem('qe_show_ar') === '1'
        applyArMode(root, saved)
        const btn = root.querySelector('.qe-ar-toggle-btn')
        if (!btn) return
        btn.addEventListener('click', function () {
            const on = !root.classList.contains('qe-ar-enabled')
            localStorage.setItem('qe_show_ar', on ? '1' : '0')
            applyArMode(root, on)
        })
    }

    function applyArMode(root, enabled) {
        root.classList.toggle('qe-ar-enabled', !!enabled)
        const btn = root.querySelector('.qe-ar-toggle-btn')
        if (btn) {
            btn.setAttribute('aria-pressed', enabled ? 'true' : 'false')
            btn.classList.toggle('active', !!enabled)
            const span = btn.querySelector('span')
            if (span) span.textContent = enabled ? 'DE + عربي' : '+ عربي'
        }
    }

    function bindShowAnswers(root) {
        if (!root) return
        const btn = root.querySelector('.qe-show-answers-btn')
        if (!btn) return
        btn.addEventListener('click', function () {
            const on = root.classList.toggle('qe-answers-visible')
            btn.setAttribute('aria-pressed', on ? 'true' : 'false')
            btn.querySelector('span').textContent = on
                ? 'Antworten verbergen / إخفاء الإجابات'
                : 'Antworten anzeigen / إظهار الإجابات'
            btn.classList.toggle('active', on)
        })
    }

    function bindExerciseControls(root) {
        bindShowAnswers(root)
        bindLangPref(root)
    }

    function scoreBar(total, answered, points) {
        const pct = total ? Math.round((answered / total) * 100) : 0
        return `<div class="qe-score-bar">
            <div class="qe-score-meta">
                <span class="qe-points"><i class="fas fa-star"></i> <strong id="qePoints">${points}</strong> Punkte</span>
                <span class="qe-counter" id="qeCounter">${answered} / ${total}</span>
            </div>
            <div class="qe-progress"><div class="qe-progress-fill" id="qeProgress" style="width:${pct}%"></div></div>
        </div>`
    }

    function telcBadge(meta) {
        return `<span class="qe-telc-badge"><i class="fas fa-certificate"></i> telc B2 · ${esc(meta.telcPart || '')}</span>`
    }

    function showResultModal(opts) {
        const pct = opts.total ? Math.round((opts.correct / opts.total) * 100) : 0
        const passed = pct >= 60
        const level = pct >= 90 ? 'Sehr gut!' : pct >= 70 ? 'Gut!' : pct >= 60 ? 'Bestanden' : 'Weiter üben'
        const overlay = document.createElement('div')
        overlay.className = 'qe-result-overlay show'
        overlay.innerHTML = `
            <div class="qe-result-modal">
                <button type="button" class="qe-result-close" aria-label="Schließen"><i class="fas fa-times"></i></button>
                <div class="qe-result-icon ${passed ? 'pass' : 'fail'}"><i class="fas fa-${passed ? 'trophy' : 'redo'}"></i></div>
                <h2>${level}</h2>
                <div class="qe-result-score">${opts.points}</div>
                <p class="qe-result-label">Punkte · ${pct}% · telc B2</p>
                <div class="qe-result-stats">
                    <span class="ok"><i class="fas fa-check"></i> ${opts.correct} richtig</span>
                    <span class="bad"><i class="fas fa-times"></i> ${opts.wrong} falsch</span>
                </div>
                <div class="qe-result-actions">
                    <a href="${esc(opts.retryUrl)}" class="btn-secondary"><i class="fas fa-redo"></i> Nochmal</a>
                    <a href="${esc(opts.listUrl)}" class="btn-secondary"><i class="fas fa-list"></i> Teilliste</a>
                    <a href="dashboard.html" class="btn-primary"><i class="fas fa-th-large"></i> Dashboard</a>
                </div>
            </div>`
        document.body.appendChild(overlay)
        overlay.querySelector('.qe-result-close').addEventListener('click', function () { overlay.remove() })
        overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove() })
    }

    function viewerUrl(fileKey, params) {
        const q = new URLSearchParams({ file: fileKey })
        if (params) Object.keys(params).forEach(function (k) { if (params[k] != null) q.set(k, params[k]) })
        return 'viewer.html?' + q.toString()
    }

    // ========== كشف نوع الملف ==========
    function detectFormat(data, fileKey) {
        if (fileKey === 'lesen1' && Array.isArray(data) && data.length > 0 && data[0].models && data[0].all_texts) {
            return 'lesen1'
        }
        if (fileKey === 'lesen2' && data.sections && data.sections.length > 0) {
            return 'lesen2'
        }
        if (fileKey === 'lesen3' && data.sections && data.sections.length > 0 && data.sections[0].situations) {
            return 'lesen3'
        }
        if (fileKey && fileKey.startsWith('horen') && data.sections && data.sections.length > 0 && data.sections[0].items) {
            return 'horen'
        }
        if (fileKey === 'sprach1' && data.sections && data.sections.length > 0 && data.sections[0].tasks) {
            return 'sprach1'
        }
        return 'unknown'
    }

    // ========== عرض قائمة الأقسام (مشترك) ==========
    function renderSectionList(container, sections, fileKey, meta, opts) {
        opts = opts || {}
        
        let filteredSections = sections.filter(function(sec) {
            if (!sec.section_id) return false
            if (fileKey && fileKey.startsWith('horen') && (!sec.items || sec.items.length === 0)) return false
            if (fileKey === 'lesen3' && (!sec.situations || sec.situations.length === 0)) return false
            return true
        })
        
        if (filteredSections.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 40px;">⚠️ Keine gültigen Abschnitte gefunden.</p>'
            return
        }

        const label = opts.sectionLabel || 'Abschnitt'
        let html = `<div class="qe-viewer">
            <header class="qe-header">
                <a href="dashboard.html" class="qe-back"><i class="fas fa-arrow-left"></i> Dashboard</a>
                <div class="qe-header-main">
                    <div class="qe-header-icon qe-icon-${meta.category ? meta.category.toLowerCase() : 'default'}">
                        <i class="fas ${esc(meta.icon)}"></i>
                    </div>
                    <div>
                        ${telcBadge(meta)}
                        <h1>${esc(meta.titleDe)}</h1>
                        <p>${filteredSections.length} ${label}${filteredSections.length !== 1 ? 'e' : ''} · Premium</p>
                    </div>
                </div>
            </header>
            <div class="qe-section-grid">`

        filteredSections.forEach(function (sec, idx) {
            const sid = sec.section_id != null ? sec.section_id : (idx + 1)
            const title = sec.title || opts.getTitle(sec, idx) || `${label} ${sid}`
            const sub = opts.getSub ? opts.getSub(sec) : ''
            const hasAudio = hasHorenAudio(fileKey, sid)
            const audioTag = hasAudio ? '<span class="qe-card-audio"><i class="fas fa-volume-up"></i> Audio</span>' : ''
            html += `<a href="${viewerUrl(fileKey, { section: idx })}" class="qe-section-card qe-cat-${(meta.category || '').toLowerCase()}">
                <span class="qe-section-num">${esc(String(sid))}</span>
                ${audioTag}
                <h3>${esc(String(title))}</h3>
                ${sub ? `<p class="qe-section-sub">${esc(sub)}</p>` : ''}
                <span class="qe-topic-go">Starten <i class="fas fa-arrow-right"></i></span>
            </a>`
        })
        html += '</div></div>'
        container.innerHTML = html
    }

    // ============================================================
    // HÖREN (H1, H2, H3)
    // ============================================================
    function renderHorenList(container, data, fileKey, meta) {
        renderSectionList(container, data.sections, fileKey, meta, {
            sectionLabel: 'Modell',
            getTitle: function (sec) { return 'Modell ' + sec.section_id },
            getSub: function (sec) {
                const n = (sec.correct_answers || []).length
                const isRF = fileKey === 'horen3'
                return (isRF ? '5 Aussagen · Richtig/Falsch' : n + ' richtige Aussagen · ' + (sec.items || []).length + ' Optionen') + ' · 🔊 Audio'
            }
        })
    }

    function renderHorenSection(container, data, fileKey, sectionIdx, meta) {
        const section = data.sections[sectionIdx]
        if (!section || !section.items || section.items.length === 0) {
            container.innerHTML = '<p class="error-message">Abschnitt nicht gefunden oder leer.</p>'
            return
        }

        const isRF = fileKey === 'horen3'
        const correctAnswers = section.correct_answers || []
        const correctSet = new Set(correctAnswers)
        const items = section.items || []

        let html = `<div class="qe-viewer qe-horen-mode" id="qeRoot">
            <header class="qe-header compact">
                <a href="${viewerUrl(fileKey)}" class="qe-back"><i class="fas fa-arrow-left"></i> Teilliste</a>
                ${telcBadge(meta)}
                <h1>${esc(meta.titleDe)} · Modell ${esc(String(section.section_id))}</h1>
            </header>
            ${exerciseToolbar()}
            ${scoreBar(isRF ? items.length : 1, 0, 0)}
            ${audioPlayerHtml(fileKey, section.section_id)}
            <div class="qe-instruction qe-instruction-horen">
                <i class="fas fa-info-circle"></i>
                ${isRF
                    ? '<span dir="ltr">Entscheiden Sie: <strong>Richtig</strong> oder <strong>Falsch</strong>?</span><span dir="rtl">قرر: صح أم خطأ؟</span>'
                    : `<span dir="ltr">Wählen Sie die <strong>richtigen</strong> Aussagen.</span><span dir="rtl">اختر الجمل <strong>الصحيحة</strong>.</span>`}
            </div>
            <div class="qe-horen-items">`

        if (isRF) {
            items.forEach(function (item) {
                const isCorrect = correctSet.has(item.id)
                html += `<article class="qe-horen-statement" data-id="${item.id}" data-correct="${isCorrect ? '1' : '0'}">
                    <span class="qe-statement-id">${item.id}</span>
                    ${bilingualBlock(item.german, item.arabic, 'qe-statement-text')}
                    <div class="qe-rf-btns">
                        <button type="button" class="qe-rf-btn" data-val="R"><i class="fas fa-check"></i> Richtig</button>
                        <button type="button" class="qe-rf-btn" data-val="F"><i class="fas fa-times"></i> Falsch</button>
                    </div>
                    <div class="qe-answer-hint"><i class="fas fa-lightbulb"></i> ${isCorrect ? 'Richtig ✓' : 'Falsch ✗'}</div>
                </article>`
            })
        } else {
            items.forEach(function (item) {
                const isCorrect = correctSet.has(item.id)
                html += `<article class="qe-horen-statement" data-id="${item.id}" data-correct="${isCorrect ? '1' : '0'}">
                    <span class="qe-statement-id">${item.id}</span>
                    ${bilingualBlock(item.german, item.arabic, 'qe-statement-text')}
                    <button type="button" class="qe-select-toggle" aria-pressed="false">
                        <i class="far fa-circle"></i> Auswählen
                    </button>
                    <div class="qe-answer-hint"><i class="fas fa-lightbulb"></i> ${isCorrect ? 'Richtig ✓' : 'Falsch ✗'}</div>
                </article>`
            })
        }

        html += `</div>
            <div class="qe-finish-bar">
                <button type="button" class="btn-primary qe-check-btn" disabled>
                    <i class="fas fa-check-double"></i> Antworten prüfen
                </button>
            </div></div>`

        container.innerHTML = html
        const root = container.querySelector('#qeRoot')
        bindExerciseControls(root)
        bindAudioPlayer(root)

        const checkBtn = root.querySelector('.qe-check-btn')
        let selected = new Set()

        if (isRF) {
            root.querySelectorAll('.qe-horen-statement').forEach(function (row) {
                row.querySelectorAll('.qe-rf-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        if (row.dataset.answered === '1') return
                        row.querySelectorAll('.qe-rf-btn').forEach(function (b) { b.classList.remove('picked') })
                        btn.classList.add('picked')
                        row.dataset.pick = btn.dataset.val
                        updateRFReady()
                    })
                })
            })
            function updateRFReady() {
                const done = root.querySelectorAll('.qe-horen-statement[data-pick]').length
                checkBtn.disabled = done < items.length
                document.getElementById('qeCounter').textContent = done + ' / ' + items.length
                document.getElementById('qeProgress').style.width = (items.length ? (done / items.length) * 100 : 0) + '%'
            }
        } else {
            root.querySelectorAll('.qe-select-toggle').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const row = btn.closest('.qe-horen-statement')
                    const id = parseInt(row.dataset.id, 10)
                    if (btn.classList.contains('selected')) {
                        btn.classList.remove('selected')
                        btn.innerHTML = '<i class="far fa-circle"></i> Auswählen'
                        selected.delete(id)
                    } else {
                        btn.classList.add('selected')
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> Gewählt'
                        selected.add(id)
                    }
                    updateMultiSelect()
                })
            })
            function updateMultiSelect() {
                checkBtn.disabled = selected.size === 0
                document.getElementById('qeCounter').textContent = selected.size + ' / ' + items.length
                document.getElementById('qeProgress').style.width = (items.length ? (selected.size / items.length) * 100 : 0) + '%'
            }
        }

        checkBtn.addEventListener('click', function () {
            if (checkBtn.disabled) return
            checkBtn.disabled = true
            let correct = 0, wrong = 0, total = 0, points = 0

            if (isRF) {
                total = items.length
                root.querySelectorAll('.qe-horen-statement').forEach(function (row) {
                    row.dataset.answered = '1'
                    const pick = row.dataset.pick
                    const shouldBeR = row.dataset.correct === '1'
                    const ok = (pick === 'R' && shouldBeR) || (pick === 'F' && !shouldBeR)
                    row.querySelectorAll('.qe-rf-btn').forEach(function (b) { b.disabled = true })
                    if (ok) {
                        correct++
                        row.classList.add('qe-row-correct')
                        row.querySelector('[data-val="' + pick + '"]').classList.add('correct')
                    } else {
                        wrong++
                        row.classList.add('qe-row-wrong')
                        row.querySelector('[data-val="' + pick + '"]').classList.add('wrong')
                        const rightBtn = row.querySelector('[data-val="' + (shouldBeR ? 'R' : 'F') + '"]')
                        if (rightBtn) rightBtn.classList.add('correct')
                    }
                })
                points = correct * POINTS
            } else {
                total = correctAnswers.length
                const selectedArr = Array.from(selected)
                const correctArr = correctAnswers
                const allCorrect = correctArr.every(function(id) { return selected.has(id) })
                const noWrong = selectedArr.every(function(id) { return correctSet.has(id) })
                const perfect = allCorrect && noWrong && selectedArr.length === correctArr.length
                
                correct = perfect ? correctArr.length : 0
                wrong = perfect ? 0 : correctArr.length
                points = perfect ? correctArr.length * POINTS : 0
                
                root.querySelectorAll('.qe-horen-statement').forEach(function (row) {
                    const id = parseInt(row.dataset.id, 10)
                    const isSel = selected.has(id)
                    const isCorr = correctSet.has(id)
                    if (isSel && isCorr) row.classList.add('qe-row-correct')
                    else if (isSel && !isCorr) row.classList.add('qe-row-wrong')
                    else if (!isSel && isCorr) row.classList.add('qe-row-missed')
                })
                
                const summary = root.querySelector('.qe-horen-summary') || (function () {
                    const el = document.createElement('div')
                    el.className = 'qe-horen-summary qe-feedback bad'
                    root.querySelector('.qe-horen-items').before(el)
                    return el
                })()
                if (!perfect) {
                    summary.innerHTML = '<i class="fas fa-lightbulb"></i> Richtig waren: <strong>' + correctArr.join(', ') + '</strong>'
                    summary.hidden = false
                } else {
                    summary.hidden = true
                }
            }

            document.getElementById('qePoints').textContent = points
            revealAllAnswers(root)
            setTimeout(function () {
                showResultModal({
                    points: points, correct: correct, wrong: wrong, total: total,
                    retryUrl: viewerUrl(fileKey, { section: sectionIdx }),
                    listUrl: viewerUrl(fileKey)
                })
            }, 600)
        })
    }

    // ============================================================
    // LESEN 1 (L1.json)
    // ============================================================
    function renderLesen1List(container, data, fileKey, meta) {
        renderSectionList(container, data, fileKey, meta, {
            sectionLabel: 'Thema',
            getTitle: function (sec) { return 'Thema ' + sec.section_id },
            getSub: function (sec) {
                const models = Object.keys(sec.models || {}).length
                return '5 Texte · ' + models + ' Modell' + (models !== 1 ? 'e' : '')
            }
        })
    }

    function renderLesen1Section(container, data, fileKey, sectionIdx, meta) {
        const section = data[sectionIdx]
        if (!section) {
            container.innerHTML = '<p class="error-message">Thema nicht gefunden.</p>'
            return
        }

        const modelKey = pickRandomKey(section.models)
        const model = section.models[modelKey]
        const sentences = model.sentences || []
        const assignments = model.correct_assignments || {}
        const texts = section.all_texts || {}
        const textKeys = ['text_1', 'text_2', 'text_3', 'text_4', 'text_5']
        const total = 5

        let html = `<div class="qe-viewer" id="qeRoot">
            <header class="qe-header compact">
                <a href="${viewerUrl(fileKey)}" class="qe-back"><i class="fas fa-arrow-left"></i> Teilliste</a>
                ${telcBadge(meta)}
                <h1>${esc(meta.titleDe)} · Thema ${esc(String(section.section_id))}</h1>
                <p class="qe-model-tag"><i class="fas fa-shuffle"></i> Modell: ${esc(modelKey)}</p>
            </header>
            ${exerciseToolbar()}
            ${scoreBar(total, 0, 0)}
            <div class="qe-instruction">
                <i class="fas fa-align-left"></i>
                <span dir="ltr">Ordnen Sie jeder Textnummer die passende Überschrift zu.</span>
                <span dir="rtl">طابق كل نص مع العنوان المناسب.</span>
            </div>
            <div class="qe-l1-layout">
                <section class="qe-l1-texts">
                    <h2><i class="fas fa-book-open"></i> Texte 1–5</h2>`

        textKeys.forEach(function (tk, i) {
            const t = texts[tk]
            if (!t) return
            const expected = assignments[String(i + 1)] || ''
            html += `<article class="qe-l1-text-card" data-text="${i + 1}">
                <div class="qe-l1-text-head">
                    <span class="qe-text-num">Text ${i + 1}</span>
                    <select class="qe-l1-select" data-slot="${i + 1}">
                        <option value="">— Überschrift wählen —</option>
                        ${sentences.map(function (s) {
                            return `<option value="${esc(s.sentence)}">${esc(s.sentence)}</option>`
                        }).join('')}
                    </select>
                </div>
                <div class="qe-l1-text-body">${esc(t.content)}</div>
                ${t.summary_ar ? `<p class="qe-l1-summary-ar" dir="rtl">${esc(t.summary_ar)}</p>` : ''}
                <div class="qe-answer-hint"><i class="fas fa-check"></i> ${esc(expected)}</div>
            </article>`
        })

        html += `</section>
                <aside class="qe-l1-headlines">
                    <h2><i class="fas fa-heading"></i> Überschriften</h2>
                    <ul class="qe-headline-list">${sentences.map(function (s) {
                        return `<li>${bilingualBlock(s.sentence, s.translation_ar, 'qe-headline-item')}</li>`
                    }).join('')}</ul>
                </aside>
            </div>
            <div class="qe-finish-bar">
                <button type="button" class="btn-primary qe-check-btn" disabled><i class="fas fa-check-double"></i> Antworten prüfen</button>
            </div></div>`

        container.innerHTML = html
        const root = container.querySelector('#qeRoot')
        bindExerciseControls(root)
        const checkBtn = root.querySelector('.qe-check-btn')

        root.querySelectorAll('.qe-l1-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                const filled = root.querySelectorAll('.qe-l1-select').length
                const done = Array.from(root.querySelectorAll('.qe-l1-select')).filter(function (s) { return s.value }).length
                checkBtn.disabled = done < filled
                document.getElementById('qeCounter').textContent = done + ' / ' + total
                document.getElementById('qeProgress').style.width = (total ? (done / total) * 100 : 0) + '%'
            })
        })

        checkBtn.addEventListener('click', function () {
            let correct = 0, wrong = 0
            root.querySelectorAll('.qe-l1-select').forEach(function (sel) {
                const slot = sel.dataset.slot
                const expected = assignments[slot] || ''
                const card = sel.closest('.qe-l1-text-card')
                if (sel.value === expected) {
                    correct++;
                    card.classList.add('qe-row-correct')
                } else {
                    wrong++;
                    card.classList.add('qe-row-wrong')
                    sel.value = expected
                    let fb = card.querySelector('.qe-inline-feedback')
                    if (!fb) {
                        fb = document.createElement('div')
                        fb.className = 'qe-feedback bad qe-inline-feedback'
                        card.appendChild(fb)
                    }
                    fb.innerHTML = '<i class="fas fa-times"></i> Falsch · Richtig: <strong>' + esc(expected) + '</strong>'
                    fb.hidden = false
                }
                sel.disabled = true
            })
            checkBtn.disabled = true
            const points = correct * POINTS
            document.getElementById('qePoints').textContent = points
            revealAllAnswers(root)
            setTimeout(function () {
                showResultModal({
                    points: points, correct: correct, wrong: wrong, total: total,
                    retryUrl: viewerUrl(fileKey, { section: sectionIdx }),
                    listUrl: viewerUrl(fileKey)
                })
            }, 600)
        })
    }

    // ============================================================
    // LESEN 2 (L2.json) - مع عرض النص قبل الأسئلة
    // ============================================================
    function renderLesen2List(container, data, fileKey, meta) {
        renderSectionList(container, data.sections, fileKey, meta, {
            sectionLabel: 'Text',
            getTitle: function (sec) { return sec.title || 'Text ' + sec.section_id },
            getSub: function (sec) {
                if (sec.versions) {
                    const versions = Object.keys(sec.versions || {}).length
                    return versions + ' Version' + (versions !== 1 ? 'en' : '') + ' · MC-Fragen'
                } else if (sec.questions) {
                    return (sec.questions.length || 0) + ' Fragen · MC-Fragen'
                } else {
                    return 'MC-Fragen'
                }
            }
        })
    }

    function renderLesen2Section(container, data, fileKey, sectionIdx, meta) {
        const section = data.sections[sectionIdx]
        if (!section) {
            container.innerHTML = '<p class="error-message">Text nicht gefunden.</p>'
            return
        }

        let questions = []
        let fullText = section.full_text || section.text || null
        
        if (section.versions) {
            const versionKey = pickRandomKey(section.versions)
            const version = section.versions[versionKey]
            questions = version.questions || []
        } else if (section.questions) {
            questions = section.questions || []
        }

        if (questions.length === 0) {
            container.innerHTML = '<p class="error-message">Keine Fragen gefunden.</p>'
            return
        }

        const total = questions.length
        let points = 0, correct = 0, wrong = 0, answered = 0

        // ====== عرض النص أولاً ======
        let textHtml = ''
        if (fullText) {
            let content = fullText.content || fullText || ''
            let summaryDe = fullText.summary_de || ''
            let summaryAr = fullText.summary_ar || ''
            
            textHtml = `<div class="qe-story-box">
                <h2>📖 Text</h2>
                <div class="qe-story-text">${esc(content)}</div>`
            
            if (summaryDe) {
                textHtml += `<div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
                    <p style="color:var(--gray-400);font-size:0.9rem;"><strong>Zusammenfassung:</strong> ${esc(summaryDe)}</p>`
                if (summaryAr) {
                    textHtml += `<p style="color:var(--gray-500);font-size:0.85rem;margin-top:4px;" dir="rtl"><strong>ملخص:</strong> ${esc(summaryAr)}</p>`
                }
                textHtml += `</div>`
            }
            textHtml += `</div>`
        }

        // ====== عرض الأسئلة ======
        let questionsHtml = `<div class="qe-questions-list qe-l2-scroll">`
        questions.forEach(function (q, idx) {
            const opts = shuffle((q.options || []).slice())
            questionsHtml += `<div class="qe-question-card mc" data-qidx="${idx}" data-done="0">
                <span class="qe-q-num">Frage ${q.question_number || (idx + 1)}</span>
                ${bilingualBlock(q.question_text, q.question_ar, 'qe-q-text')}
                <div class="qe-mc-options">${opts.map(function (opt) {
                    return `<button type="button" class="qe-mc-btn" data-correct="${opt.is_correct ? '1' : '0'}">
                        <span class="qe-opt-letter">${esc(opt.option)}</span>
                        ${bilingualBlock(opt.text, opt.text_ar, 'qe-opt-bilingual')}
                    </button>`
                }).join('')}</div>
                <div class="qe-feedback" hidden></div>
            </div>`
        })
        questionsHtml += `</div>`

        let html = `<div class="qe-viewer" id="qeRoot">
            <header class="qe-header compact">
                <a href="${viewerUrl(fileKey)}" class="qe-back"><i class="fas fa-arrow-left"></i> Teilliste</a>
                ${telcBadge(meta)}
                <h1>${esc(section.title || meta.titleDe)}</h1>
                ${section.versions ? `<p class="qe-model-tag"><i class="fas fa-shuffle"></i> ${esc(pickRandomKey(section.versions))}</p>` : ''}
            </header>
            ${exerciseToolbar()}
            ${scoreBar(total, 0, 0)}
            ${textHtml}
            <h2 style="font-family:var(--font-display);margin:24px 0 16px;color:var(--light);"><i class="fas fa-question-circle"></i> Fragen</h2>
            ${questionsHtml}
            <div class="qe-finish-bar">
                <button type="button" class="btn-primary qe-finish-btn" disabled><i class="fas fa-flag-checkered"></i> Ergebnis anzeigen</button>
            </div>
        </div>`

        container.innerHTML = html
        const root = container.querySelector('#qeRoot')
        bindExerciseControls(root)
        const finishBtn = root.querySelector('.qe-finish-btn')

        function updateBar() {
            document.getElementById('qePoints').textContent = points
            document.getElementById('qeCounter').textContent = answered + ' / ' + total
            document.getElementById('qeProgress').style.width = (total ? (answered / total) * 100 : 0) + '%'
            finishBtn.disabled = answered < total
        }

        root.querySelectorAll('.qe-mc-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const card = btn.closest('.qe-question-card')
                if (card.dataset.done === '1') return
                card.dataset.done = '1';
                answered++
                card.querySelectorAll('.qe-mc-btn').forEach(function (b) { b.disabled = true })
                const fb = card.querySelector('.qe-feedback')
                if (btn.dataset.correct === '1') {
                    btn.classList.add('correct');
                    points += POINTS;
                    correct++
                    fb.className = 'qe-feedback ok';
                    fb.innerHTML = '<i class="fas fa-check"></i> Richtig! +' + POINTS
                } else {
                    btn.classList.add('wrong')
                    const corr = card.querySelector('.qe-mc-btn[data-correct="1"]')
                    if (corr) corr.classList.add('correct')
                    wrong++
                    const corrLabel = mcCorrectLabel(corr)
                    fb.className = 'qe-feedback bad'
                    fb.innerHTML = '<i class="fas fa-times"></i> Falsch · Richtig: <strong>' + esc(corrLabel) + '</strong>'
                }
                fb.hidden = false
                updateBar()
            })
        })

        finishBtn.addEventListener('click', function () {
            revealAllAnswers(root)
            showResultModal({
                points: points, correct: correct, wrong: wrong, total: total,
                retryUrl: viewerUrl(fileKey, { section: sectionIdx }),
                listUrl: viewerUrl(fileKey)
            })
        })
        updateBar()
    }

    // ============================================================
    // LESEN 3 (L3.json)
    // ============================================================
    function renderLesen3List(container, data, fileKey, meta) {
        renderSectionList(container, data.sections, fileKey, meta, {
            sectionLabel: 'Anzeige',
            getTitle: function (sec) { return sec.title || 'Anzeige ' + sec.section_id },
            getSub: function (sec) {
                return (sec.situations || []).length + ' Situationen · ' + (sec.info_texts || []).length + ' Anzeigen'
            }
        })
    }

    function renderLesen3Section(container, data, fileKey, sectionIdx, meta) {
        const section = data.sections[sectionIdx]
        if (!section || !section.situations || section.situations.length === 0) {
            container.innerHTML = '<p class="error-message">Anzeige nicht gefunden oder leer.</p>'
            return
        }

        const situations = section.situations || []
        const infoTexts = section.info_texts || []
        const letters = infoTexts.map(function (t) { return String(t.id).toLowerCase() })
        letters.push('x')
        const total = situations.length

        let html = `<div class="qe-viewer" id="qeRoot">
            <header class="qe-header compact">
                <a href="${viewerUrl(fileKey)}" class="qe-back"><i class="fas fa-arrow-left"></i> Teilliste</a>
                ${telcBadge(meta)}
                <h1>${esc(section.title || meta.titleDe)}</h1>
            </header>
            ${exerciseToolbar(`<button type="button" class="qe-toggle-ads-btn"><i class="fas fa-newspaper"></i> Anzeigen ein/aus</button>`)}
            ${scoreBar(total, 0, 0)}
            <div class="qe-l3-layout">
                <section class="qe-l3-situations">
                    <h2><i class="fas fa-user"></i> Situationen</h2>`

        situations.forEach(function (sit) {
            const corr = String(sit.correct_answer || '').toLowerCase()
            html += `<article class="qe-l3-situation" data-correct="${esc(corr)}" data-num="${sit.number}">
                <span class="qe-sit-num">${sit.number}</span>
                ${bilingualBlock(sit.text, sit.translation_ar, 'qe-sit-text')}
                <select class="qe-l3-select" data-num="${sit.number}">
                    <option value="">— wählen —</option>
                    ${letters.map(function (l) {
                        return `<option value="${esc(l)}">${esc(l.toUpperCase())}</option>`
                    }).join('')}
                </select>
                <div class="qe-answer-hint"><i class="fas fa-check"></i> Richtig: <strong>${esc(corr.toUpperCase())}</strong></div>
            </article>`
        })

        html += `</section>
                <aside class="qe-l3-ads qe-ads-panel open">
                    <h2><i class="fas fa-newspaper"></i> Anzeigen</h2>
                    <div class="qe-ads-list">${infoTexts.map(function (ad) {
                        return `<article class="qe-ad-card" id="ad-${esc(String(ad.id).toLowerCase())}">
                            <span class="qe-ad-id">${esc(String(ad.id).toUpperCase())}</span>
                            ${bilingualBlock(ad.content, ad.translation_ar, 'qe-ad-text')}
                        </article>`
                    }).join('')}
                    <article class="qe-ad-card qe-ad-x"><span class="qe-ad-id">X</span><p>Keine Anzeige passt</p></article>
                    </div>
                </aside>
            </div>
            <div class="qe-finish-bar">
                <button type="button" class="btn-primary qe-check-btn" disabled><i class="fas fa-check-double"></i> Antworten prüfen</button>
            </div></div>`

        container.innerHTML = html
        const root = container.querySelector('#qeRoot')
        bindExerciseControls(root)
        const checkBtn = root.querySelector('.qe-check-btn')

        const toggleAds = root.querySelector('.qe-toggle-ads-btn')
        if (toggleAds) {
            toggleAds.addEventListener('click', function () {
                root.querySelector('.qe-l3-ads').classList.toggle('open')
            })
        }

        root.querySelectorAll('.qe-l3-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                const done = Array.from(root.querySelectorAll('.qe-l3-select')).filter(function (s) { return s.value }).length
                checkBtn.disabled = done < total
                document.getElementById('qeCounter').textContent = done + ' / ' + total
                document.getElementById('qeProgress').style.width = (total ? (done / total) * 100 : 0) + '%'
            })
        })

        checkBtn.addEventListener('click', function () {
            let correct = 0, wrong = 0
            root.querySelectorAll('.qe-l3-situation').forEach(function (row) {
                const sel = row.querySelector('.qe-l3-select')
                const expected = row.dataset.correct
                const pick = (sel.value || '').toLowerCase()
                if (pick === expected) {
                    correct++;
                    row.classList.add('qe-row-correct')
                } else {
                    wrong++;
                    row.classList.add('qe-row-wrong')
                    sel.value = expected
                    let fb = row.querySelector('.qe-inline-feedback')
                    if (!fb) {
                        fb = document.createElement('div')
                        fb.className = 'qe-feedback bad qe-inline-feedback'
                        row.appendChild(fb)
                    }
                    fb.innerHTML = '<i class="fas fa-times"></i> Falsch · Richtig: <strong>' + esc(expected.toUpperCase()) + '</strong>'
                    fb.hidden = false
                }
                sel.disabled = true
            })
            checkBtn.disabled = true
            const points = correct * POINTS
            document.getElementById('qePoints').textContent = points
            revealAllAnswers(root)
            setTimeout(function () {
                showResultModal({
                    points: points, correct: correct, wrong: wrong, total: total,
                    retryUrl: viewerUrl(fileKey, { section: sectionIdx }),
                    listUrl: viewerUrl(fileKey)
                })
            }, 600)
        })
    }

    // ============================================================
    // SPRACHBAUSTEINE S1 (S1.json)
    // ============================================================
    function renderSprachList(container, data, fileKey, meta) {
        const tasks = (data.sections || []).reduce(function (acc, s) {
            return acc.concat(s.tasks || [])
        }, [])
        
        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 40px;">⚠️ Keine Aufgaben gefunden.</p>'
            return
        }
        
        let html = `<div class="qe-viewer">
            <header class="qe-header">
                <a href="dashboard.html" class="qe-back"><i class="fas fa-arrow-left"></i> Dashboard</a>
                <div class="qe-header-main">
                    <div class="qe-header-icon qe-icon-sprachbausteine"><i class="fas ${esc(meta.icon)}"></i></div>
                    <div>${telcBadge(meta)}<h1>${esc(meta.titleDe)}</h1><p>${tasks.length} Aufgaben · Premium</p></div>
                </div>
            </header>
            <div class="qe-section-grid">`

        tasks.forEach(function (task, idx) {
            html += `<a href="${viewerUrl(fileKey, { task: idx })}" class="qe-section-card qe-cat-sprachbausteine">
                <span class="qe-section-num">${task.task_id || (idx + 1)}</span>
                <h3>${esc(task.title || 'Aufgabe ' + (idx + 1))}</h3>
                <p class="qe-section-sub">10 Lücken · (21)–(30)</p>
                <span class="qe-topic-go">Starten <i class="fas fa-arrow-right"></i></span>
            </a>`
        })
        html += '</div></div>'
        container.innerHTML = html
    }

    function renderSprachTask(container, data, fileKey, taskIdx, meta) {
        const tasks = (data.sections || []).reduce(function (acc, s) {
            return acc.concat(s.tasks || [])
        }, [])
        const task = tasks[taskIdx]
        if (!task) {
            container.innerHTML = '<p class="error-message">Aufgabe nicht gefunden.</p>'
            return
        }

        const blankNums = Object.keys(task.options || {}).sort(function (a, b) { return Number(a) - Number(b) })
        const total = blankNums.length
        const correctAnswers = task.correct_answers || {}

        let html = `<div class="qe-viewer" id="qeRoot">
            <header class="qe-header compact">
                <a href="${viewerUrl(fileKey)}" class="qe-back"><i class="fas fa-arrow-left"></i> Teilliste</a>
                ${telcBadge(meta)}
                <h1>${esc(task.title || 'Sprachbausteine')}</h1>
            </header>
            ${exerciseToolbar()}
            ${scoreBar(total, 0, 0)}
            <div class="qe-s1-text-panel">
                <h2><i class="fas fa-envelope-open-text"></i> Text mit Lücken</h2>
                <div class="qe-s1-gaps" id="qeS1Text"></div>
                ${task.translated_text ? `<div class="qe-s1-translation" dir="rtl">${esc(task.translated_text)}</div>` : ''}
            </div>
            <div class="qe-s1-blanks-panel">
                <h2><i class="fas fa-puzzle-piece"></i> Lücken (21)–(30)</h2>
                <div class="qe-s1-blanks">${blankNums.map(function (num) {
                    const opts = task.options[num] || {}
                    const trans = (task.translations && task.translations[num]) || {}
                    const corr = correctAnswers[num] || ''
                    return `<div class="qe-s1-blank" data-num="${num}" data-correct="${esc(corr)}">
                        <span class="qe-blank-num">(${num})</span>
                        <div class="qe-s1-options">${['A', 'B', 'C'].map(function (letter) {
                            const word = opts[letter] || ''
                            const wordAr = trans[letter] || ''
                            return `<button type="button" class="qe-s1-opt" data-letter="${letter}" data-correct="${letter === corr ? '1' : '0'}">
                                <span class="qe-opt-letter">${letter}</span>
                                ${bilingualBlock(word, wordAr, 'qe-opt-bilingual')}
                            </button>`
                        }).join('')}</div>
                        <div class="qe-answer-hint"><i class="fas fa-check"></i> Richtig: <strong>${esc(corr)}</strong> · ${esc(opts[corr] || '')}</div>
                    </div>`
                }).join('')}</div>
            </div>
            <div class="qe-finish-bar">
                <button type="button" class="btn-primary qe-finish-btn" disabled><i class="fas fa-flag-checkered"></i> Ergebnis anzeigen</button>
            </div></div>`

        container.innerHTML = html
        const root = container.querySelector('#qeRoot')
        bindExerciseControls(root)

        const textEl = root.querySelector('#qeS1Text')
        let rendered = esc(task.text)
        blankNums.forEach(function (num) {
            rendered = rendered.replace(
                new RegExp('\\(' + num + '\\)', 'g'),
                `<span class="qe-inline-gap" data-gap="${num}">(${num}) ___</span>`
            )
        })
        textEl.innerHTML = rendered

        let points = 0, correct = 0, wrong = 0, answered = 0
        const finishBtn = root.querySelector('.qe-finish-btn')

        function updateBar() {
            document.getElementById('qePoints').textContent = points
            document.getElementById('qeCounter').textContent = answered + ' / ' + total
            document.getElementById('qeProgress').style.width = (total ? (answered / total) * 100 : 0) + '%'
            finishBtn.disabled = answered < total
        }

        root.querySelectorAll('.qe-s1-opt').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const row = btn.closest('.qe-s1-blank')
                if (row.dataset.done === '1') return
                row.dataset.done = '1';
                answered++
                row.querySelectorAll('.qe-s1-opt').forEach(function (b) { b.disabled = true })
                const num = row.dataset.num
                const gapEl = root.querySelector('[data-gap="' + num + '"]')
                const word = btn.querySelector('.qe-line-de')
                if (gapEl && word) gapEl.innerHTML = '(' + num + ') <strong>' + word.textContent + '</strong>'

                if (btn.dataset.correct === '1') {
                    btn.classList.add('correct');
                    points += POINTS;
                    correct++
                } else {
                    btn.classList.add('wrong')
                    const corrBtn = row.querySelector('.qe-s1-opt[data-correct="1"]')
                    if (corrBtn) corrBtn.classList.add('correct')
                    wrong++
                    const corrLetter = row.dataset.correct
                    const corrWord = corrBtn && corrBtn.querySelector('.qe-line-de')
                    const corrText = corrWord ? corrWord.textContent.trim() : ''
                    let fb = row.querySelector('.qe-inline-feedback')
                    if (!fb) {
                        fb = document.createElement('div')
                        fb.className = 'qe-feedback bad qe-inline-feedback'
                        row.appendChild(fb)
                    }
                    fb.innerHTML = '<i class="fas fa-times"></i> Richtig: <strong>' + esc(corrLetter) + '</strong> · ' + esc(corrText)
                    fb.hidden = false
                    if (gapEl && corrWord) {
                        gapEl.innerHTML = '(' + num + ') <strong class="qe-gap-correct">' + esc(corrText) + '</strong>'
                    }
                }
                updateBar()
            })
        })
        updateBar()

        finishBtn.addEventListener('click', function () {
            revealAllAnswers(root)
            showResultModal({
                points: points, correct: correct, wrong: wrong, total: total,
                retryUrl: viewerUrl(fileKey, { task: taskIdx }),
                listUrl: viewerUrl(fileKey)
            })
        })
    }

    // ============================================================
    // المحرك الرئيسي
    // ============================================================
    window.QuestionEngine = {
        detectFormat: detectFormat,
        render: function (container, data, fileKey, params) {
            params = params || {}
            const meta = window.getQuestionFileMeta ? window.getQuestionFileMeta(fileKey) : { icon: 'fa-book', titleDe: fileKey }
            const format = detectFormat(data, fileKey)
            const sectionIdx = params.section != null ? parseInt(params.section, 10) : null
            const taskIdx = params.task != null ? parseInt(params.task, 10) : null

            switch (format) {
                case 'horen':
                    if (sectionIdx == null || isNaN(sectionIdx)) {
                        renderHorenList(container, data, fileKey, meta)
                    } else {
                        renderHorenSection(container, data, fileKey, sectionIdx, meta)
                    }
                    return true

                case 'lesen1':
                    if (sectionIdx == null || isNaN(sectionIdx)) {
                        renderLesen1List(container, data, fileKey, meta)
                    } else {
                        renderLesen1Section(container, data, fileKey, sectionIdx, meta)
                    }
                    return true

                case 'lesen2':
                    if (sectionIdx == null || isNaN(sectionIdx)) {
                        renderLesen2List(container, data, fileKey, meta)
                    } else {
                        renderLesen2Section(container, data, fileKey, sectionIdx, meta)
                    }
                    return true

                case 'lesen3':
                    if (sectionIdx == null || isNaN(sectionIdx)) {
                        renderLesen3List(container, data, fileKey, meta)
                    } else {
                        renderLesen3Section(container, data, fileKey, sectionIdx, meta)
                    }
                    return true

                case 'sprach1':
                    if (taskIdx == null || isNaN(taskIdx)) {
                        renderSprachList(container, data, fileKey, meta)
                    } else {
                        renderSprachTask(container, data, fileKey, taskIdx, meta)
                    }
                    return true

                default:
                    container.innerHTML = '<p class="error-message">⚠️ Dieses Format wird noch nicht unterstützt.</p>'
                    return false
            }
        }
    }
})()