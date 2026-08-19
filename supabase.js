window.API_URL = 'https://qrznwrvfjacoepegjpov.supabase.co/functions/v1'

window.ALL_QUESTION_FILES = [
    'lesen1', 'lesen2', 'lesen3',
    'horen1', 'horen2', 'horen3',
    'sprach1'
]

// ====== المسار الجديد لملفات JSON على Supabase ======
const STORAGE_BASE = 'https://qrznwrvfjacoepegjpov.supabase.co/storage/v1/object/public/teil1lesen/';

window.LOCAL_QUESTION_FILES = {
    lesen1: STORAGE_BASE + 'L1.json',
    lesen2: STORAGE_BASE + 'L2.json',
    lesen3: STORAGE_BASE + 'L3.json',
    horen1: STORAGE_BASE + 'H1.json',
    horen2: STORAGE_BASE + 'H2.json',
    horen3: STORAGE_BASE + 'H3.json',
    sprach1: STORAGE_BASE + 'S1.json'
}

window.getToken = function () {
    return localStorage.getItem('auth_token')
}

window.setToken = function (token) {
    if (token) {
        localStorage.setItem('auth_token', token)
    } else {
        localStorage.removeItem('auth_token')
    }
}

window.hashDeviceString = function (input) {
    let hash = 5381
    const str = String(input || '')
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i)
        hash = hash & hash
    }
    return Math.abs(hash).toString(36)
}

window.buildDeviceFingerprint = function () {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const parts = [
        navigator.platform || '',
        String(screen.width || ''),
        String(screen.height || ''),
        String(screen.colorDepth || ''),
        tz
    ]
    return parts.join('|')
}

window.getDeviceId = function () {
    const fingerprint = window.buildDeviceFingerprint()
    const fingerprintId = 'fp_' + window.hashDeviceString(fingerprint)
    localStorage.setItem('device_id', fingerprintId)
    return fingerprintId
}

window.loginUser = async function (username, password) {
    try {
        const response = await fetch(`${window.API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                deviceId: window.getDeviceId(),
                deviceFingerprint: window.buildDeviceFingerprint()
            })
        })

        const result = await response.json()

        if (result.success) {
            window.setToken(result.token)
            sessionStorage.setItem('username', username)
            sessionStorage.setItem('user_id', result.user.id)
            sessionStorage.setItem('logged_in', 'true')
            return { success: true }
        }
        return { success: false, message: result.message }
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, message: '❌ فشل الاتصال بالخادم' }
    }
}

window.checkSession = function () {
    if (sessionStorage.getItem('logged_in') !== 'true') return false
    const token = window.getToken()
    if (!token) return false
    try {
        const userData = JSON.parse(atob(token))
        if (userData.exp < Date.now()) {
            sessionStorage.clear()
            window.setToken(null)
            return false
        }
        return true
    } catch (e) {
        return false
    }
}

window.logout = function () {
    sessionStorage.clear()
    window.setToken(null)
    window.location.href = 'login.html'
}

window.getCurrentUsername = function () {
    return sessionStorage.getItem('username') || 'Premium'
}

window._questionsCache = window._questionsCache || {}
window._questionsInFlight = window._questionsInFlight || {}

window.loadQuestionsFile = async function (fileKey, options) {
    const opts = options || {}
    const maxAgeMs = typeof opts.maxAgeMs === 'number' ? opts.maxAgeMs : 6 * 60 * 60 * 1000
    const forceReload = !!opts.forceReload
    const allowStale = opts.allowStale !== false
    const cacheKey = 'questions_cache_' + fileKey
    const localPath = window.LOCAL_QUESTION_FILES[fileKey]

    if (!localPath) {
        console.error('Unknown file key:', fileKey)
        return null
    }

    if (!window.checkSession()) {
        console.error('Login required for file:', fileKey)
        return null
    }

    const isValidData = function (payload) {
        if (!payload) return false
        if (Array.isArray(payload) && payload.length > 0) return true
        if (payload.topics && Array.isArray(payload.topics) && payload.topics.length > 0) return true
        if (payload.sections && Array.isArray(payload.sections) && payload.sections.length > 0) return true
        if (payload.exam_title && payload.sections && payload.sections.length > 0) return true
        return false
    }

    const fetchFromRemote = async function () {
        if (window._questionsInFlight[fileKey]) {
            return window._questionsInFlight[fileKey]
        }

        window._questionsInFlight[fileKey] = (async function () {
            const response = await fetch(localPath, { cache: 'no-store' })
            if (!response.ok) {
                console.error('Failed to load remote file:', localPath, response.status)
                return null
            }

            const data = await response.json()
            if (!isValidData(data)) {
                console.error('Invalid JSON structure in:', localPath)
                return null
            }

            window._questionsCache[fileKey] = data
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: data }))
            } catch (e) { }
            return data
        })()

        try {
            return await window._questionsInFlight[fileKey]
        } finally {
            delete window._questionsInFlight[fileKey]
        }
    }

    if (!forceReload && window._questionsCache[fileKey] && isValidData(window._questionsCache[fileKey])) {
        return window._questionsCache[fileKey]
    }

    if (!forceReload) {
        try {
            const cachedRaw = localStorage.getItem(cacheKey)
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw)
                if (cached && typeof cached.ts === 'number' && isValidData(cached.data)) {
                    const age = Date.now() - cached.ts
                    window._questionsCache[fileKey] = cached.data
                    if (age < maxAgeMs) {
                        fetchFromRemote().catch(function () { })
                        return cached.data
                    }
                    if (allowStale) {
                        fetchFromRemote().catch(function () { })
                        return cached.data
                    }
                }
            }
        } catch (e) {
            console.warn('Error reading questions cache for', fileKey, e)
        }
    }

    try {
        return await fetchFromRemote()
    } catch (error) {
        console.error('Error loading file:', localPath, error)
        return null
    }
}

window.getQuestionFileMeta = function (fileKey) {
    const meta = {
        lesen1: {
            icon: 'fa-align-left',
            titleDe: 'Leseverstehen Teil 1',
            titleAr: 'القراءة – Teil 1 · Überschriften zuordnen',
            category: 'Lesen',
            telcPart: 'L1',
            descDe: 'Überschriften den Texten zuordnen',
            descAr: 'مطابقة العناوين مع النصوص'
        },
        lesen2: {
            icon: 'fa-list-check',
            titleDe: 'Leseverstehen Teil 2',
            titleAr: 'القراءة – Teil 2 · Detailverstehen',
            category: 'Lesen',
            telcPart: 'L2',
            descDe: 'Multiple Choice · Detailfragen',
            descAr: 'اختيار من متعدد · فهم التفاصيل'
        },
        lesen3: {
            icon: 'fa-tv',
            titleDe: 'Leseverstehen Teil 3',
            titleAr: 'القراءة – Teil 3 · Situationen',
            category: 'Lesen',
            telcPart: 'L3',
            descDe: 'Situationen den Anzeigen zuordnen',
            descAr: 'مطابقة المواقف مع الإعلانات'
        },
        horen1: {
            icon: 'fa-headphones',
            titleDe: 'Hörverstehen Teil 1',
            titleAr: 'السمع – Teil 1 · Richtige Aussagen',
            category: 'Hören',
            telcPart: 'H1',
            descDe: '2 richtige Aussagen auswählen',
            descAr: 'اختر جملتين صحيحتين'
        },
        horen2: {
            icon: 'fa-podcast',
            titleDe: 'Hörverstehen Teil 2',
            titleAr: 'السمع – Teil 2 · Mehrfachauswahl',
            category: 'Hören',
            telcPart: 'H2',
            descDe: 'Mehrere richtige Aussagen markieren',
            descAr: 'حدّد الجمل الصحيحة'
        },
        horen3: {
            icon: 'fa-bullhorn',
            titleDe: 'Hörverstehen Teil 3',
            titleAr: 'السمع – Teil 3 · Richtig/Falsch',
            category: 'Hören',
            telcPart: 'H3',
            descDe: 'Richtig oder Falsch?',
            descAr: 'صح أم خطأ؟'
        },
        sprach1: {
            icon: 'fa-puzzle-piece',
            titleDe: 'Sprachbausteine Teil 1',
            titleAr: 'Sprachbausteine – Teil 1 · Lückentext',
            category: 'Sprachbausteine',
            telcPart: 'S1',
            descDe: 'Lückentext · Grammatik & Wortschatz',
            descAr: 'نص بفراغات · قواعد ومفردات'
        }
    }
    return meta[fileKey] || { icon: 'fa-book', titleDe: fileKey, titleAr: fileKey, category: 'Übung' }
}

window.countQuestionItems = function (data, fileKey) {
    if (!data) return 0
    if (fileKey === 'sprach1' && data.sections) {
        return data.sections.reduce(function (acc, s) {
            return acc + (s.tasks ? s.tasks.length : 0)
        }, 0)
    }
    if (Array.isArray(data) && data[0] && data[0].models) return data.length
    if (data.sections) return data.sections.length
    if (data.topics) return data.topics.length
    if (Array.isArray(data)) return data.length
    return 0
}