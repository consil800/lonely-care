// 🔒 보안 강화된 환경 설정
// SecureEnvLoader와 연동하여 환경변수 우선 사용, 하드코딩 키는 fallback으로 유지

// 환경변수 또는 SecureEnvLoader에서 값 가져오기
function getSecureConfig(key, fallback) {
    // 1순위: SecureEnvLoader에서 가져오기
    if (window.getSecureEnv && window.getSecureEnv().isLoaded) {
        const envValue = window.getSecureEnv().getConfig(key);
        if (envValue) return envValue;
    }
    
    // 2순위: window 환경변수에서 가져오기
    if (window[key.replace('.', '_').toUpperCase()]) {
        return window[key.replace('.', '_').toUpperCase()];
    }
    
    // 3순위: process.env에서 가져오기 (Node.js 환경)
    if (typeof process !== 'undefined' && process.env && process.env[key.replace('.', '_').toUpperCase()]) {
        return process.env[key.replace('.', '_').toUpperCase()];
    }
    
    // 4순위: fallback 값 사용 (기존 하드코딩 키 - 호환성 유지)
    // 개발 환경에서는 경고 생략 (localhost, 127.0.0.1)
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.log(`🔑 [생명구조] ${key} 환경변수 없음 - 개발용 fallback 키 사용`);
    } else {
        console.warn(`⚠️ 환경변수 ${key}를 찾을 수 없어 fallback 값을 사용합니다. 보안을 위해 환경변수 설정을 권장합니다.`);
    }
    return fallback;
}

const CONFIG = {
    // 카카오 API 설정 (환경변수 우선, fallback으로 기존 키 유지)
    KAKAO: {
        JAVASCRIPT_KEY: getSecureConfig('kakao.javascriptKey', 'dd74fd58abbb75eb58df11ecc92d6727'),
        REST_API_KEY: getSecureConfig('kakao.restApiKey', 'ab12e5dfca3ad84a158bc54fcf27d190')
    },
    
    // 허용된 도메인들 (HTTPS 우선, HTTP 호환성 유지)
    ALLOWED_DOMAINS: [
        'https://127.0.0.1:5650',
        'https://localhost:5650',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://localhost:8000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8000',
        'http://localhost:5650',
        'http://127.0.0.1:5650'
    ],
    
    // 리다이렉트 URI들 (HTTPS 우선, HTTP 호환성 유지)
    REDIRECT_URIS: [
        'https://127.0.0.1:5650/oauth.html',
        'https://127.0.0.1:5650/lonely-care/oauth.html',
        'https://localhost:5650/oauth.html',
        'https://localhost:5650/lonely-care/oauth.html',
        'http://localhost:5500/oauth',
        'http://127.0.0.1:5500/oauth',
        'http://localhost:8080/oauth',
        'http://localhost:8000/oauth',
        'http://127.0.0.1:8080/oauth',
        'http://127.0.0.1:8000/oauth',
        'http://127.0.0.1:5500/lonely-care/oauth.html',
        'http://localhost:8080/oauth.html',
        'http://127.0.0.1:8080/oauth.html',
        'http://localhost:5650/oauth.html',
        'http://127.0.0.1:5650/oauth.html',
        'http://localhost:5650/lonely-care/oauth.html',
        'http://127.0.0.1:5650/lonely-care/oauth.html'
    ],
    
    // 앱 설정
    APP: {
        NAME: 'lonely-care',
        VERSION: '13.5.1',
        ENVIRONMENT: 'development'
    }
};

// 🚨 중요: CONFIG 객체를 전역으로 노출 (OAuth 시스템에서 필요)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    console.log('🔧 [생명구조] CONFIG 객체 전역 노출 완료:', {
        hasKAKAO: !!CONFIG.KAKAO,
        hasJavaScriptKey: !!CONFIG.KAKAO.JAVASCRIPT_KEY,
        hasRestApiKey: !!CONFIG.KAKAO.REST_API_KEY
    });
}