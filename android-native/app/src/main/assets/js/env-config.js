/**
 * 환경변수 설정 관리 파일
 * 클라이언트 사이드에서 안전하게 사용할 수 있는 환경변수만 포함
 */

// 환경 감지 함수
function getEnvironment() {
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:') {
        return 'development';
    } else if (window.location.hostname.includes('firebaseapp.com') || 
               window.location.hostname.includes('web.app')) {
        return 'production';
    } else {
        return 'staging';
    }
}

// Firebase API 키 처리 (환경별)
function getFirebaseApiKey() {
    const env = getEnvironment();
    
    // 1순위: 환경변수
    if (window.ENV_FIREBASE_API_KEY) {
        return window.ENV_FIREBASE_API_KEY;
    }
    
    // 2순위: 환경별 기본값
    switch (env) {
        case 'production':
            return "AIzaSyD6pdH5S3y6JcRQFxf5nEUliNccqM4rK5o"; // 프로덕션 키
        case 'staging':
            return "AIzaSyD6pdH5S3y6JcRQFxf5nEUliNccqM4rK5o"; // 스테이징 키
        case 'development':
        default:
            return "AIzaSyD6pdH5S3y6JcRQFxf5nEUliNccqM4rK5o"; // 개발 키
    }
}

// 카카오 JavaScript 키 처리 (환경별)
function getKakaoJavaScriptKey() {
    const env = getEnvironment();
    
    // 1순위: 환경변수
    if (window.ENV_KAKAO_JAVASCRIPT_KEY) {
        return window.ENV_KAKAO_JAVASCRIPT_KEY;
    }
    
    // 2순위: 환경별 기본값
    switch (env) {
        case 'production':
            return "dd74fd58abbb75eb58df11ecc92d6727"; // 프로덕션 키
        case 'staging':
            return "dd74fd58abbb75eb58df11ecc92d6727"; // 스테이징 키 (필요시 별도 발급)
        case 'development':
        default:
            return "dd74fd58abbb75eb58df11ecc92d6727"; // 개발 키
    }
}

// 환경변수에서 설정을 가져오는 함수
function getEnvConfig() {
    // 개발 환경에서는 로컬 환경변수 또는 기본값 사용
    // 프로덕션 환경에서는 빌드시 주입된 값 사용
    
    const config = {
        // Firebase 설정 (클라이언트 사이드에서 사용 가능)
        firebase: {
            // 환경별 API 키 처리 (개발/프로덕션 분리)
            apiKey: getFirebaseApiKey(),
            authDomain: window.ENV_FIREBASE_AUTH_DOMAIN || "lonely-care-app.firebaseapp.com",
            projectId: window.ENV_FIREBASE_PROJECT_ID || "lonely-care-app",
            storageBucket: window.ENV_FIREBASE_STORAGE_BUCKET || "lonely-care-app.firebasestorage.app",
            messagingSenderId: window.ENV_FIREBASE_MESSAGING_SENDER_ID || "965854578277",
            appId: window.ENV_FIREBASE_APP_ID || "1:965854578277:web:6315e84a930432232ba88c",
            measurementId: window.ENV_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX",
            vapidKey: window.ENV_FIREBASE_VAPID_KEY || "BHNd92Hp0mqZyMZy_pR-z2lYeO8wgko3KziEPakWfZY0t8FrP_GxZjOnXTIWSAunZDRo6zDWmhvy_kO_a-O_WTg"
        },
        
        // 카카오 설정 (JavaScript Key만 클라이언트에서 사용)
        kakao: {
            // 환경별 카카오 키 처리
            javascriptKey: getKakaoJavaScriptKey()
            // REST API Key는 서버에서만 사용하므로 여기에 포함하지 않음
        },
        
        // Cloud Functions 엔드포인트
        fcmEndpoints: {
            sendNotification: 'https://us-central1-lonely-care-app.cloudfunctions.net/sendNotification',
            sendBroadcastNotification: 'https://us-central1-lonely-care-app.cloudfunctions.net/sendBroadcastNotification',
            updateToken: 'https://us-central1-lonely-care-app.cloudfunctions.net/updateFCMToken',
            checkFriendStatus: 'https://us-central1-lonely-care-app.cloudfunctions.net/checkFriendStatus'
        }
    };
    
    // 개발 환경에서 환경변수 로딩 확인
    if (window.ENV_DEBUG) {
        console.log('🔧 환경변수 설정 로딩:', {
            firebaseApiKey: config.firebase.apiKey ? '✅ 로딩됨' : '❌ 기본값 사용',
            kakaoJsKey: config.kakao.javascriptKey ? '✅ 로딩됨' : '❌ 기본값 사용',
            endpoints: config.fcmEndpoints ? '✅ 로딩됨' : '❌ 기본값 사용'
        });
    }
    
    return config;
}

// 환경변수 설정을 전역으로 제공
window.getEnvConfig = getEnvConfig;

// 🚨 생명구조 앱 - 중복 선언 완전 방지
(function() {
    'use strict';
    
    // 이미 로드된 경우 종료
    if (window.ENV_CONFIG_LOADED) {
        console.log('🔧 환경변수 설정 이미 로딩됨 - 스크립트 중복 실행 방지');
        return;
    }
    
    // 로딩 플래그 설정
    window.ENV_CONFIG_LOADED = true;
    
    // 전역 설정 직접 할당 (const/var 선언 없음)
    if (!window.ENV_CONFIG) {
        window.ENV_CONFIG = getEnvConfig();
        console.log('🔧 환경변수 설정 로딩 완료');
    }
    
    // 모듈 내보내기
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getEnvConfig: getEnvConfig, ENV_CONFIG: window.ENV_CONFIG };
    }
})();