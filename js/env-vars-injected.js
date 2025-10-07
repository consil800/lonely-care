/**
 * 🔒 보안 강화된 환경변수 주입 파일
 * 생성 시간: 2024-12-27T10:00:00.000Z
 * 환경: development
 * 🚨 생명구조 앱 - 보안 환경변수 로드
 */

// 🔒 보안 강화: .env 파일 기반 환경변수를 window 객체에 주입
console.log('🔒 보안 환경변수 로딩 시작...');

// Firebase 환경변수 (민감한 정보 포함)
window.ENV_FIREBASE_API_KEY = "AIzaSyD6pdH5S3y6JcRQFxf5nEUliNccqM4rK5o";
window.ENV_FIREBASE_AUTH_DOMAIN = "lonely-care-app.firebaseapp.com";
window.ENV_FIREBASE_PROJECT_ID = "lonely-care-app";
window.ENV_FIREBASE_STORAGE_BUCKET = "lonely-care-app.firebasestorage.app";
window.ENV_FIREBASE_MESSAGING_SENDER_ID = "965854578277";
window.ENV_FIREBASE_APP_ID = "1:965854578277:web:6315e84a930432232ba88c";
window.ENV_FIREBASE_MEASUREMENT_ID = "G-XXXXXXXXXX";
window.ENV_FIREBASE_VAPID_KEY = "BKvOv9VbWyMZRFcKYWcKF5L2g9YXQ-_-8MXkFYH1l7cF1xQ2r3KfE9YXR6Q7t8O9p0WqAzXd2E3f4F5r6Q7tY8ZaW";

// 카카오 환경변수 (민감한 정보 포함)
window.ENV_KAKAO_JAVASCRIPT_KEY = "dd74fd58abbb75eb58df11ecc92d6727";
window.ENV_KAKAO_REST_API_KEY = "ab12e5dfca3ad84a158bc54fcf27d190";

// 보안 설정
window.ENV_APP_PORT = "5650";
window.ENV_NODE_ENV = "development";
window.ENV_DEBUG_MODE = "false";
window.ENV_MASK_SENSITIVE_DATA = "true";
window.ENV_CSP_ENABLED = "true";
window.ENV_ALLOWED_ORIGINS = "https://127.0.0.1:5650,https://localhost:5650,http://localhost:5650,http://127.0.0.1:5650";
window.ENV_RATE_LIMIT_PER_MINUTE = "100";

// 환경 정보
window.ENV_BUILD_TIME = "2024-12-27T10:00:00.000Z";
window.ENV_ENVIRONMENT = "development";
window.ENV_DEBUG = true;

// 🔒 민감한 정보 보호를 위한 마스킹 함수
function maskSensitiveValue(value, keepLength = 4) {
    if (!value || value.length <= keepLength) return value;
    return value.substring(0, keepLength) + '*'.repeat(value.length - keepLength);
}

// 보안 로그 (민감한 정보 마스킹)
console.log('🔒 보안 환경변수 주입 완료:', {
    environment: window.ENV_ENVIRONMENT,
    buildTime: window.ENV_BUILD_TIME,
    firebaseApiKey: maskSensitiveValue(window.ENV_FIREBASE_API_KEY),
    kakaoJsKey: maskSensitiveValue(window.ENV_KAKAO_JAVASCRIPT_KEY),
    projectId: window.ENV_FIREBASE_PROJECT_ID,
    port: window.ENV_APP_PORT,
    varsCount: 13,
    securityLevel: 'ENHANCED'
});

// ⚠️ 프로덕션 환경 경고
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.warn('🚨 프로덕션 환경에서 API 키가 노출되고 있습니다. 서버사이드 환경변수 주입으로 변경을 권장합니다.');
}
