// api-client.js - الإصدار الآمن والمصحح
const API_BASE_URL = 'https://python1messi.pythonanywhere.com'; // تأكد من هذا الرابط

// ========== Helper Functions ==========
function getAuthToken() {
    return sessionStorage.getItem('auth_token');
}

async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // إضافة التوكن إلى الهيدر إذا كان موجوداً
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Token wird gesendet:', token.substring(0, 10) + '...'); // للتأكد
    } else {
        console.warn('⚠️ Kein Token gefunden!');
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include' // مهم لارسال الكوكيز إذا استخدمنا session
        });
        
        return await response.json();
    } catch (error) {
        console.error('❌ API Request Error:', error);
        return { success: false, message: 'Connection error' };
    }
}

// ========== Device ID ==========
window.getDeviceId = function() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
};

// ========== Login ==========
window.loginUser = async function(username, password) {
    try {
        const deviceId = window.getDeviceId();
        
        const result = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ 
                username, 
                password, 
                device_id: deviceId 
            })
        });
        
        if (result.success && result.token) {
            sessionStorage.setItem('auth_token', result.token);
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('user_id', result.user?.id || '');
            console.log('✅ Login erfolgreich, Token gespeichert');
            return { success: true };
        }
        
        return { 
            success: false, 
            message: result.message || 'Login failed' 
        };
        
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Connection error' };
    }
};

// ========== Check Session ==========
window.checkSession = async function() {
    const token = sessionStorage.getItem('auth_token');
    if (!token) return false;
    
    try {
        const result = await apiRequest('/api/user/status');
        return result.authenticated === true;
    } catch {
        return false;
    }
};

// ========== Get Current Username ==========
window.getCurrentUsername = function() {
    return sessionStorage.getItem('username') || 'Gast';
};

// ========== Load Questions File ==========
window.loadQuestionsFile = async function(fileKey) {
    console.log('🚀 Laden der Datei:', fileKey);
    
    try {
        // apiRequest الآن ترسل التوكن تلقائياً
        const result = await apiRequest(`/api/questions/${fileKey}`);
        
        console.log('📦 API Antwort:', result);
        
        if (result.success && result.data) {
            return result.data;
        }
        
        if (result.error === 'Unauthorized') {
            console.error('❌ Nicht autorisiert. Bitte neu einloggen.');
            // يمكنك توجيه المستخدم إلى صفحة تسجيل الدخول هنا إذا أردت
            // window.location.href = '/static/login.html';
            return null;
        }
        
        if (result.premium_required) {
            console.log('🔒 Premium-Inhalt benötigt');
            return null;
        }
        
        console.error('❌ Fehler beim Laden:', result.error);
        return null;
    } catch (error) {
        console.error('❌ Error loading questions:', error);
        return null;
    }
};

// ========== Logout ==========
window.logout = async function() {
    await apiRequest('/api/logout', { method: 'POST' });
    sessionStorage.clear();
    window.location.href = '/static/index.html';
};

// ========== Check Premium Status ==========
window.isPremium = async function() {
    try {
        const result = await apiRequest('/api/user/status');
        return result.premium === true;
    } catch {
        return false;
    }
};