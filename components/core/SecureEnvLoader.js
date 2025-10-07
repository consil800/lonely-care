/**
 * SecureEnvLoader - 보안 강화된 환경변수 로더
 * lonely-care 프로젝트의 보안 취약점 개선을 위한 환경변수 관리 시스템
 * 
 * 🚨 생명구조 시스템 보안 강화
 * 
 * @version 1.0.0
 * @created 2024-12-26
 * @purpose 민감한 정보 보호, 환경별 설정 관리, 보안 정책 적용
 */

class SecureEnvLoader {
    static instance = null;
    
    /**
     * 싱글톤 패턴으로 인스턴스 가져오기
     */
    static getInstance() {
        if (!SecureEnvLoader.instance) {
            SecureEnvLoader.instance = new SecureEnvLoader();
        }
        return SecureEnvLoader.instance;
    }
    
    constructor() {
        if (SecureEnvLoader.instance) {
            return SecureEnvLoader.instance;
        }
        
        // 초기화 상태
        this.isLoaded = false;
        this.environment = null;
        this.config = {};
        this.publicConfig = {}; // 클라이언트에 노출해도 안전한 설정
        this.sensitiveKeys = new Set(); // 민감한 키 목록
        
        // 보안 설정
        this.maskSensitiveData = true;
        this.enableSecurityLogs = false;
        
        console.log('🔒 SecureEnvLoader 초기화');
        
        // 자동 로드
        this.detectEnvironment();
        this.loadConfiguration();
    }
    
    /**
     * 현재 환경 감지
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const protocol = window.location.protocol;
        
        // 환경 감지 로직
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.environment = 'development';
        } else if (hostname.includes('staging') || hostname.includes('test')) {
            this.environment = 'staging';
        } else if (pathname.includes('/admin/')) {
            this.environment = 'admin';
        } else {
            this.environment = 'production';
        }
        
        // HTTPS 강제 확인
        if (this.environment === 'production' && protocol !== 'https:') {
            console.warn('🚨 보안 경고: 프로덕션 환경에서 HTTPS를 사용해야 합니다');
        }
        
        console.log(`🌍 환경 감지 결과: ${this.environment}`);
        return this.environment;
    }
    
    /**
     * 설정 로드
     */
    loadConfiguration() {
        try {
            // 기존 ENV_CONFIG와의 호환성 유지
            const legacyConfig = window.ENV_CONFIG || {};
            
            // 기본 설정 로드
            this.loadBaseConfiguration(legacyConfig);
            
            // 환경별 설정 오버라이드
            this.loadEnvironmentSpecificConfig();
            
            // 보안 정책 적용
            this.applySecurityPolicies();
            
            // 민감한 키 마스킹
            this.maskSensitiveInformation();
            
            this.isLoaded = true;
            console.log('✅ SecureEnvLoader 설정 로드 완료');
            
        } catch (error) {
            console.error('❌ SecureEnvLoader 설정 로드 실패:', error);
            this.loadFallbackConfiguration();
        }
    }
    
    /**
     * 기본 설정 로드
     */
    loadBaseConfiguration(legacyConfig) {
        // Firebase 설정 (기존 시스템과 호환성 유지)
        this.config.firebase = {
            apiKey: this.getSecureValue('FIREBASE_API_KEY', legacyConfig.firebase?.apiKey),
            authDomain: this.getSecureValue('FIREBASE_AUTH_DOMAIN', 'lonely-care-app.firebaseapp.com'),
            projectId: this.getSecureValue('FIREBASE_PROJECT_ID', 'lonely-care-app'),
            storageBucket: this.getSecureValue('FIREBASE_STORAGE_BUCKET', 'lonely-care-app.firebasestorage.app'),
            messagingSenderId: this.getSecureValue('FIREBASE_MESSAGING_SENDER_ID', '965854578277'),
            appId: this.getSecureValue('FIREBASE_APP_ID', legacyConfig.firebase?.appId),
            measurementId: this.getSecureValue('FIREBASE_MEASUREMENT_ID', null),
            vapidKey: this.getSecureValue('FIREBASE_VAPID_KEY', legacyConfig.firebase?.vapidKey)
        };
        
        // 카카오 설정
        this.config.kakao = {
            javascriptKey: this.getSecureValue('KAKAO_JAVASCRIPT_KEY', legacyConfig.kakao?.javascriptKey),
            restApiKey: this.getSecureValue('KAKAO_REST_API_KEY', null) // 서버에서만 사용
        };
        
        // 보안 설정
        this.config.security = {
            allowedOrigins: this.getSecureValue('ALLOWED_ORIGINS', 'https://127.0.0.1:5650').split(','),
            cspEnabled: this.getSecureValue('CSP_ENABLED', 'true') === 'true',
            rateLimitPerMinute: parseInt(this.getSecureValue('RATE_LIMIT_PER_MINUTE', '100')),
            maskSensitiveData: this.getSecureValue('MASK_SENSITIVE_DATA', 'true') === 'true'
        };
        
        // 앱 설정
        this.config.app = {
            port: parseInt(this.getSecureValue('APP_PORT', '5650')),
            nodeEnv: this.getSecureValue('NODE_ENV', 'development'),
            debugMode: this.getSecureValue('DEBUG_MODE', 'false') === 'true'
        };
        
        // 민감한 키 등록
        this.sensitiveKeys.add('firebase.apiKey');
        this.sensitiveKeys.add('kakao.javascriptKey');
        this.sensitiveKeys.add('kakao.restApiKey');
    }
    
    /**
     * 환경별 설정 오버라이드
     */
    loadEnvironmentSpecificConfig() {
        switch (this.environment) {
            case 'development':
                this.config.app.debugMode = true;
                this.config.security.allowedOrigins.push('http://localhost:5650');
                this.enableSecurityLogs = true;
                break;
                
            case 'staging':
                this.config.security.rateLimitPerMinute = 200;
                break;
                
            case 'production':
                this.config.app.debugMode = false;
                this.config.security.maskSensitiveData = true;
                this.config.security.cspEnabled = true;
                break;
                
            case 'admin':
                this.config.security.rateLimitPerMinute = 500;
                this.enableSecurityLogs = true;
                break;
        }
    }
    
    /**
     * 보안 정책 적용
     */
    applySecurityPolicies() {
        // Content Security Policy 설정
        if (this.config.security.cspEnabled) {
            this.setContentSecurityPolicy();
        }
        
        // CORS 설정 검증
        this.validateCorsSettings();
        
        // API 키 유효성 검증
        this.validateApiKeys();
    }
    
    /**
     * Content Security Policy 설정
     */
    setContentSecurityPolicy() {
        const cspDirectives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net https://www.gstatic.com https://www.googletagmanager.com",
            "connect-src 'self' https://firestore.googleapis.com https://fcm.googleapis.com https://kauth.kakao.com",
            "img-src 'self' data: https: blob:",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'"
        ].join('; ');
        
        // CSP 메타 태그가 없으면 추가
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const meta = document.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', cspDirectives);
            document.head.appendChild(meta);
            
            console.log('🛡️ Content Security Policy 적용됨');
        }
    }
    
    /**
     * CORS 설정 검증
     */
    validateCorsSettings() {
        const currentOrigin = window.location.origin;
        const allowedOrigins = this.config.security.allowedOrigins;
        
        if (!allowedOrigins.includes(currentOrigin) && !allowedOrigins.includes('*')) {
            console.warn(`⚠️ 현재 Origin(${currentOrigin})이 허용된 목록에 없습니다`);
        }
    }
    
    /**
     * API 키 유효성 검증
     */
    validateApiKeys() {
        const firebaseApiKey = this.config.firebase.apiKey;
        const kakaoKey = this.config.kakao.javascriptKey;
        
        if (!firebaseApiKey || firebaseApiKey.includes('your_') || firebaseApiKey.length < 30) {
            console.error('🚨 Firebase API 키가 올바르지 않습니다');
        }
        
        if (!kakaoKey || kakaoKey.includes('your_') || kakaoKey.length < 20) {
            console.error('🚨 카카오 JavaScript 키가 올바르지 않습니다');
        }
    }
    
    /**
     * 민감한 정보 마스킹
     */
    maskSensitiveInformation() {
        if (!this.config.security.maskSensitiveData) return;
        
        // 공개 설정 생성 (민감한 정보 제외)
        this.publicConfig = {
            environment: this.environment,
            firebase: {
                authDomain: this.config.firebase.authDomain,
                projectId: this.config.firebase.projectId,
                storageBucket: this.config.firebase.storageBucket,
                messagingSenderId: this.config.firebase.messagingSenderId
            },
            app: {
                port: this.config.app.port,
                debugMode: this.config.app.debugMode
            },
            security: {
                cspEnabled: this.config.security.cspEnabled,
                rateLimitPerMinute: this.config.security.rateLimitPerMinute
            }
        };
        
        console.log('🎭 민감한 정보 마스킹 완료');
    }
    
    /**
     * 폴백 설정 로드 (오류 시 안전한 기본값)
     */
    loadFallbackConfiguration() {
        console.warn('⚠️ 폴백 설정 로드');
        
        this.config = {
            firebase: {
                authDomain: 'lonely-care-app.firebaseapp.com',
                projectId: 'lonely-care-app',
                storageBucket: 'lonely-care-app.firebasestorage.app',
                messagingSenderId: '965854578277'
            },
            app: {
                port: 5650,
                debugMode: false
            },
            security: {
                allowedOrigins: ['https://127.0.0.1:5650'],
                cspEnabled: true,
                maskSensitiveData: true
            }
        };
        
        this.isLoaded = true;
    }
    
    /**
     * 안전한 값 가져오기
     */
    getSecureValue(key, fallback = null) {
        // 환경변수에서 먼저 확인
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
        
        // window 객체에서 확인
        if (window[key]) {
            return window[key];
        }
        
        return fallback;
    }
    
    /**
     * 설정값 가져오기 (공개용)
     */
    getConfig(path = null, usePublicConfig = true) {
        const config = usePublicConfig ? this.publicConfig : this.config;
        
        if (!path) return config;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key];
        }, config);
    }
    
    /**
     * Firebase 설정 가져오기 (기존 시스템 호환성)
     */
    getFirebaseConfig() {
        return {
            apiKey: this.config.firebase.apiKey,
            authDomain: this.config.firebase.authDomain,
            projectId: this.config.firebase.projectId,
            storageBucket: this.config.firebase.storageBucket,
            messagingSenderId: this.config.firebase.messagingSenderId,
            appId: this.config.firebase.appId,
            measurementId: this.config.firebase.measurementId,
            vapidKey: this.config.firebase.vapidKey
        };
    }
    
    /**
     * 카카오 설정 가져오기
     */
    getKakaoConfig() {
        return {
            javascriptKey: this.config.kakao.javascriptKey
        };
    }
    
    /**
     * 현재 환경 가져오기
     */
    getEnvironment() {
        return this.environment;
    }
    
    /**
     * 보안 감사 로그
     */
    securityLog(message, data = {}) {
        if (this.enableSecurityLogs) {
            console.log(`🔒 [SECURITY] ${message}`, data);
        }
    }
    
    /**
     * 설정 유효성 검증
     */
    validateConfiguration() {
        const errors = [];
        
        if (!this.config.firebase.apiKey) {
            errors.push('Firebase API Key 누락');
        }
        
        if (!this.config.kakao.javascriptKey) {
            errors.push('카카오 JavaScript Key 누락');
        }
        
        if (this.config.security.allowedOrigins.includes('*')) {
            errors.push('CORS 보안 위험: 모든 Origin 허용');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// 전역 접근
window.SecureEnvLoader = SecureEnvLoader;
window.getSecureEnv = () => SecureEnvLoader.getInstance();

// 기존 시스템과의 호환성을 위한 전역 설정 업데이트
document.addEventListener('DOMContentLoaded', () => {
    const envLoader = SecureEnvLoader.getInstance();
    
    // 기존 firebaseConfig 오버라이드 (호환성)
    if (!window.firebaseConfig) {
        window.firebaseConfig = envLoader.getFirebaseConfig();
    }
    
    console.log('🔒 SecureEnvLoader 초기화 완료');
});

console.log('🔒 SecureEnvLoader 클래스 로드 완료');