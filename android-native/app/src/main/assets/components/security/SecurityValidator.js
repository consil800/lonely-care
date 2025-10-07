/**
 * 🔒 SecurityValidator - 보안 검증 시스템
 * lonely-care 프로젝트의 보안 설정 검증 및 강화
 * 
 * 🚨 생명구조 시스템 보안 검증: 모든 보안 컴포넌트 작동 상태 확인
 * 
 * @version 1.0.0
 * @created 2024-12-27
 * @purpose 보안 시스템 무결성 검증, 취약점 탐지, 보안 정책 적용
 */

class SecurityValidator {
    static instance = null;
    
    static getInstance() {
        if (!SecurityValidator.instance) {
            SecurityValidator.instance = new SecurityValidator();
        }
        return SecurityValidator.instance;
    }
    
    constructor() {
        if (SecurityValidator.instance) {
            return SecurityValidator.instance;
        }
        
        this.isValidated = false;
        this.securityScore = 0;
        this.validationResults = {
            envLoader: false,
            tokenManager: false,
            storageWrapper: false,
            apiKeys: false,
            httpsRequired: false,
            csp: false
        };
        
        console.log('🔒 SecurityValidator 초기화');
        this.init();
    }
    
    /**
     * 보안 검증 시작
     */
    async init() {
        try {
            console.log('🔒 보안 시스템 검증 시작...');
            
            // 모든 보안 컴포넌트 검증
            await this.validateSecurityComponents();
            
            // API 키 보안 검증
            this.validateApiKeySecurity();
            
            // HTTPS 및 네트워크 보안 검증
            this.validateNetworkSecurity();
            
            // CSP 검증
            this.validateContentSecurityPolicy();
            
            // localStorage 보안 검증
            this.validateStorageSecurity();
            
            // 전체 보안 점수 계산
            this.calculateSecurityScore();
            
            this.isValidated = true;
            this.reportSecurityStatus();
            
        } catch (error) {
            console.error('❌ 보안 검증 실패:', error);
        }
    }
    
    /**
     * 보안 컴포넌트들 검증
     */
    async validateSecurityComponents() {
        // SecureEnvLoader 검증
        if (window.getSecureEnv && window.getSecureEnv().isLoaded) {
            this.validationResults.envLoader = true;
            console.log('✅ SecureEnvLoader 작동 중');
        } else {
            console.warn('⚠️ SecureEnvLoader 미작동');
        }
        
        // SecureTokenManager 검증
        if (window.getSecureTokenManager && window.getSecureTokenManager().isInitialized) {
            this.validationResults.tokenManager = true;
            console.log('✅ SecureTokenManager 작동 중');
        } else {
            console.warn('⚠️ SecureTokenManager 미작동');
        }
        
        // SecureStorageWrapper 검증
        if (window.getSecureStorageWrapper && window.getSecureStorageWrapper().isInitialized) {
            this.validationResults.storageWrapper = true;
            console.log('✅ SecureStorageWrapper 작동 중');
        } else {
            console.warn('⚠️ SecureStorageWrapper 미작동');
        }
    }
    
    /**
     * API 키 보안 검증
     */
    validateApiKeySecurity() {
        const issues = [];
        
        // 환경변수 사용 확인
        if (!window.ENV_FIREBASE_API_KEY || !window.ENV_KAKAO_JAVASCRIPT_KEY) {
            issues.push('환경변수 미설정');
        }
        
        // 하드코딩된 키 검증 (간단한 패턴 체크)
        const scripts = document.getElementsByTagName('script');
        let hardcodedKeyFound = false;
        
        for (let script of scripts) {
            if (script.innerHTML && (
                script.innerHTML.includes('AIzaSy') || 
                script.innerHTML.includes('dd74fd58') ||
                script.innerHTML.includes('ab12e5df')
            )) {
                // 환경변수 주입 파일은 제외
                if (!script.src || !script.src.includes('env-vars-injected.js')) {
                    hardcodedKeyFound = true;
                    break;
                }
            }
        }
        
        if (!hardcodedKeyFound) {
            this.validationResults.apiKeys = true;
            console.log('✅ API 키 보안 양호');
        } else {
            issues.push('하드코딩된 API 키 발견');
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ API 키 보안 이슈:', issues);
        }
    }
    
    /**
     * 네트워크 보안 검증
     */
    validateNetworkSecurity() {
        const issues = [];
        
        // HTTPS 확인 (프로덕션 환경)
        if (window.location.protocol === 'https:' || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            this.validationResults.httpsRequired = true;
            console.log('✅ 네트워크 보안 양호');
        } else {
            issues.push('HTTPS 미사용');
        }
        
        // Mixed Content 확인
        const externalScripts = Array.from(document.getElementsByTagName('script'))
            .filter(script => script.src && script.src.startsWith('http:'));
        
        if (externalScripts.length > 0 && window.location.protocol === 'https:') {
            issues.push('Mixed Content 탐지');
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ 네트워크 보안 이슈:', issues);
        }
    }
    
    /**
     * Content Security Policy 검증
     */
    validateContentSecurityPolicy() {
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        
        if (cspMeta) {
            this.validationResults.csp = true;
            console.log('✅ Content Security Policy 적용됨');
        } else {
            console.warn('⚠️ Content Security Policy 미적용');
        }
    }
    
    /**
     * 저장소 보안 검증
     */
    validateStorageSecurity() {
        const issues = [];
        
        // localStorage에 민감한 정보가 평문으로 저장되어 있는지 확인
        const sensitivePatterns = [
            'access_token',
            'refresh_token',
            'api_key',
            'secret',
            'password'
        ];
        
        const localStorageData = { ...localStorage };
        let unsecureDataFound = false;
        
        Object.keys(localStorageData).forEach(key => {
            const value = localStorageData[key];
            
            // __lc_token_ 접두사가 있는 것은 암호화된 토큰이므로 제외
            if (key.startsWith('__lc_token_') || key.startsWith('__lc_salt')) {
                return;
            }
            
            sensitivePatterns.forEach(pattern => {
                if (key.toLowerCase().includes(pattern) || 
                    (value && value.toLowerCase().includes(pattern))) {
                    unsecureDataFound = true;
                    console.warn(`⚠️ 평문 민감 데이터 발견: ${key}`);
                }
            });
        });
        
        if (!unsecureDataFound) {
            console.log('✅ 저장소 보안 양호');
        } else {
            issues.push('평문 민감 데이터 발견');
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ 저장소 보안 이슈:', issues);
        }
    }
    
    /**
     * 보안 점수 계산
     */
    calculateSecurityScore() {
        const weights = {
            envLoader: 15,
            tokenManager: 25,
            storageWrapper: 25,
            apiKeys: 20,
            httpsRequired: 10,
            csp: 5
        };
        
        let totalScore = 0;
        let maxScore = 0;
        
        Object.keys(weights).forEach(key => {
            maxScore += weights[key];
            if (this.validationResults[key]) {
                totalScore += weights[key];
            }
        });
        
        this.securityScore = Math.round((totalScore / maxScore) * 100);
    }
    
    /**
     * 보안 상태 보고
     */
    reportSecurityStatus() {
        const emoji = this.securityScore >= 90 ? '🛡️' : 
                     this.securityScore >= 70 ? '⚠️' : '🚨';
        
        console.log(`${emoji} 보안 검증 완료 - 점수: ${this.securityScore}/100`);
        console.log('📋 보안 컴포넌트 상태:', this.validationResults);
        
        if (this.securityScore < 70) {
            console.warn('🚨 보안 점수가 낮습니다. 즉시 개선이 필요합니다.');
            this.provideSecurityRecommendations();
        } else if (this.securityScore < 90) {
            console.warn('⚠️ 보안 개선 여지가 있습니다.');
            this.provideSecurityRecommendations();
        } else {
            console.log('✅ 보안 상태가 매우 양호합니다.');
        }
    }
    
    /**
     * 보안 개선 권장사항 제공
     */
    provideSecurityRecommendations() {
        const recommendations = [];
        
        if (!this.validationResults.envLoader) {
            recommendations.push('SecureEnvLoader 활성화');
        }
        if (!this.validationResults.tokenManager) {
            recommendations.push('SecureTokenManager 활성화');
        }
        if (!this.validationResults.storageWrapper) {
            recommendations.push('SecureStorageWrapper 활성화');
        }
        if (!this.validationResults.apiKeys) {
            recommendations.push('API 키 환경변수화');
        }
        if (!this.validationResults.httpsRequired) {
            recommendations.push('HTTPS 적용');
        }
        if (!this.validationResults.csp) {
            recommendations.push('Content Security Policy 적용');
        }
        
        if (recommendations.length > 0) {
            console.log('📝 권장 보안 개선사항:', recommendations);
        }
    }
    
    /**
     * 보안 테스트 실행
     */
    runSecurityTests() {
        console.log('🧪 보안 테스트 실행...');
        
        // 토큰 암호화 테스트
        this.testTokenEncryption();
        
        // localStorage 래핑 테스트
        this.testStorageWrapping();
        
        // API 키 환경변수 테스트
        this.testEnvironmentVariables();
    }
    
    /**
     * 토큰 암호화 테스트
     */
    testTokenEncryption() {
        if (window.getSecureTokenManager) {
            const tokenManager = window.getSecureTokenManager();
            
            // 테스트 토큰 저장/조회
            const testToken = 'test_token_' + Date.now();
            const stored = tokenManager.setSecureToken('test', testToken);
            const retrieved = tokenManager.getSecureToken('test');
            
            if (stored && retrieved === testToken) {
                console.log('✅ 토큰 암호화 테스트 통과');
            } else {
                console.error('❌ 토큰 암호화 테스트 실패');
            }
            
            // 테스트 토큰 정리
            tokenManager.removeSecureToken('test');
        }
    }
    
    /**
     * localStorage 래핑 테스트
     */
    testStorageWrapping() {
        // 민감한 키로 테스트
        const originalSetItem = localStorage.setItem;
        let wrapperCalled = false;
        
        // 래퍼가 호출되었는지 확인하기 위한 임시 플래그
        const testKey = 'testAccessToken';
        localStorage.setItem(testKey, 'test_value');
        
        // 보안 저장소에서 조회되는지 확인
        if (window.getSecureTokenManager) {
            const secureValue = window.getSecureTokenManager().getSecureToken(testKey);
            if (secureValue) {
                console.log('✅ localStorage 래핑 테스트 통과');
            } else {
                console.warn('⚠️ localStorage 래핑 미완전');
            }
        }
        
        // 테스트 데이터 정리
        localStorage.removeItem(testKey);
        if (window.getSecureTokenManager) {
            window.getSecureTokenManager().removeSecureToken(testKey);
        }
    }
    
    /**
     * 환경변수 테스트
     */
    testEnvironmentVariables() {
        const envVars = [
            'ENV_FIREBASE_API_KEY',
            'ENV_KAKAO_JAVASCRIPT_KEY',
            'ENV_FIREBASE_PROJECT_ID'
        ];
        
        const missingVars = envVars.filter(varName => !window[varName]);
        
        if (missingVars.length === 0) {
            console.log('✅ 환경변수 테스트 통과');
        } else {
            console.warn('⚠️ 누락된 환경변수:', missingVars);
        }
    }
    
    /**
     * 보안 상태 조회
     */
    getSecurityStatus() {
        return {
            isValidated: this.isValidated,
            securityScore: this.securityScore,
            validationResults: { ...this.validationResults },
            recommendations: this.provideSecurityRecommendations()
        };
    }
}

// 전역 접근
window.SecurityValidator = SecurityValidator;
window.getSecurityValidator = () => SecurityValidator.getInstance();

// 자동 초기화 (모든 보안 컴포넌트 로드 후)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const validator = SecurityValidator.getInstance();
        validator.runSecurityTests();
    }, 2000); // 다른 컴포넌트들이 초기화될 시간 제공
});

console.log('🔒 SecurityValidator 클래스 로드 완료');