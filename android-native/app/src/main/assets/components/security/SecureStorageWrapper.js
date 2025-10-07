/**
 * 🔒 SecureStorageWrapper - 보안 스토리지 래퍼
 * localStorage를 가로채서 민감한 데이터는 암호화된 저장소로 리다이렉트
 * 
 * 🚨 생명구조 시스템 보안 강화: 기존 코드 수정 없이 보안 개선
 * 
 * @version 1.0.0
 * @created 2024-12-27
 * @purpose 기존 시스템과 호환성 유지하면서 토큰 보안 강화
 */

class SecureStorageWrapper {
    static instance = null;
    
    static getInstance() {
        if (!SecureStorageWrapper.instance) {
            SecureStorageWrapper.instance = new SecureStorageWrapper();
        }
        return SecureStorageWrapper.instance;
    }
    
    constructor() {
        if (SecureStorageWrapper.instance) {
            return SecureStorageWrapper.instance;
        }
        
        this.isInitialized = false;
        this.tokenManager = null;
        this.originalLocalStorage = null;
        this.sensitiveKeys = new Set([
            'kakaoAccessToken',
            'kakaoRefreshToken',
            'firebaseToken',
            'authToken',
            'accessToken',
            'refreshToken'
        ]);
        
        console.log('🔒 SecureStorageWrapper 초기화');
        this.init();
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            // SecureTokenManager 대기
            await this.waitForTokenManager();
            
            // localStorage 래핑 시작
            this.wrapLocalStorage();
            
            this.isInitialized = true;
            console.log('✅ SecureStorageWrapper 초기화 완료');
            
        } catch (error) {
            console.error('❌ SecureStorageWrapper 초기화 실패:', error);
        }
    }
    
    /**
     * SecureTokenManager 로드 대기
     */
    async waitForTokenManager(maxAttempts = 20, delay = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const checkManager = () => {
                attempts++;
                
                if (window.getSecureTokenManager) {
                    this.tokenManager = window.getSecureTokenManager();
                    console.log('✅ SecureTokenManager 연결 완료');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ SecureTokenManager 로드 타임아웃 - fallback 모드');
                    resolve(); // 에러가 아닌 경고로 처리
                } else {
                    setTimeout(checkManager, delay);
                }
            };
            
            checkManager();
        });
    }
    
    /**
     * localStorage 래핑
     */
    wrapLocalStorage() {
        // 원본 localStorage 백업
        this.originalLocalStorage = {
            getItem: localStorage.getItem.bind(localStorage),
            setItem: localStorage.setItem.bind(localStorage),
            removeItem: localStorage.removeItem.bind(localStorage),
            clear: localStorage.clear.bind(localStorage)
        };
        
        // localStorage 메서드 오버라이드
        const self = this;
        
        // setItem 래핑
        localStorage.setItem = function(key, value) {
            return self.secureSetItem(key, value);
        };
        
        // getItem 래핑
        localStorage.getItem = function(key) {
            return self.secureGetItem(key);
        };
        
        // removeItem 래핑
        localStorage.removeItem = function(key) {
            return self.secureRemoveItem(key);
        };
        
        console.log('🔒 localStorage 보안 래핑 완료');
    }
    
    /**
     * 보안 setItem
     */
    secureSetItem(key, value) {
        try {
            // 민감한 키인지 확인
            if (this.isSensitiveKey(key)) {
                console.log(`🔒 민감한 데이터 보안 저장: ${key}`);
                
                if (this.tokenManager) {
                    // 토큰으로 저장
                    const success = this.tokenManager.setSecureToken(key, value);
                    if (success) {
                        return; // 성공적으로 보안 저장됨
                    }
                }
                
                // fallback: 원본 localStorage 사용 (경고 표시)
                console.warn(`⚠️ 보안 저장 실패, 평문 저장: ${key}`);
            }
            
            // currentUser 특별 처리 (토큰 분리)
            if (key === 'currentUser' && value) {
                return this.handleCurrentUserStorage(value);
            }
            
            // 일반 데이터는 원본 localStorage 사용
            return this.originalLocalStorage.setItem(key, value);
            
        } catch (error) {
            console.error('❌ secureSetItem 오류:', error);
            // fallback
            return this.originalLocalStorage.setItem(key, value);
        }
    }
    
    /**
     * 보안 getItem
     */
    secureGetItem(key) {
        try {
            // 민감한 키인지 확인
            if (this.isSensitiveKey(key)) {
                if (this.tokenManager) {
                    const secureValue = this.tokenManager.getSecureToken(key);
                    if (secureValue) {
                        console.log(`🔒 보안 저장소에서 로드: ${key}`);
                        return secureValue;
                    }
                }
                
                // fallback: 원본 localStorage에서 확인
                const originalValue = this.originalLocalStorage.getItem(key);
                if (originalValue) {
                    console.warn(`⚠️ 평문 데이터 발견, 마이그레이션 권장: ${key}`);
                    
                    // 자동 마이그레이션 시도
                    if (this.tokenManager) {
                        this.tokenManager.setSecureToken(key, originalValue);
                        this.originalLocalStorage.removeItem(key);
                        console.log(`✅ 자동 마이그레이션 완료: ${key}`);
                    }
                    
                    return originalValue;
                }
                
                return null;
            }
            
            // currentUser 특별 처리
            if (key === 'currentUser') {
                return this.handleCurrentUserRetrieval();
            }
            
            // 일반 데이터는 원본 localStorage 사용
            return this.originalLocalStorage.getItem(key);
            
        } catch (error) {
            console.error('❌ secureGetItem 오류:', error);
            // fallback
            return this.originalLocalStorage.getItem(key);
        }
    }
    
    /**
     * 보안 removeItem
     */
    secureRemoveItem(key) {
        try {
            // 민감한 키인지 확인
            if (this.isSensitiveKey(key)) {
                if (this.tokenManager) {
                    this.tokenManager.removeSecureToken(key);
                }
            }
            
            // 원본 localStorage에서도 제거
            return this.originalLocalStorage.removeItem(key);
            
        } catch (error) {
            console.error('❌ secureRemoveItem 오류:', error);
            return this.originalLocalStorage.removeItem(key);
        }
    }
    
    /**
     * currentUser 저장 특별 처리
     */
    handleCurrentUserStorage(value) {
        try {
            const userData = typeof value === 'string' ? JSON.parse(value) : value;
            
            // 토큰 분리 및 보안 저장
            if (userData.access_token && this.tokenManager) {
                this.tokenManager.setSecureToken('kakaoAccess', userData.access_token);
                delete userData.access_token;
            }
            
            if (userData.refresh_token && this.tokenManager) {
                this.tokenManager.setSecureToken('kakaoRefresh', userData.refresh_token);
                delete userData.refresh_token;
            }
            
            // 토큰이 제거된 사용자 정보만 저장
            const cleanUserData = JSON.stringify(userData);
            return this.originalLocalStorage.setItem('currentUser', cleanUserData);
            
        } catch (error) {
            console.error('❌ currentUser 저장 처리 오류:', error);
            return this.originalLocalStorage.setItem('currentUser', value);
        }
    }
    
    /**
     * currentUser 조회 특별 처리
     */
    handleCurrentUserRetrieval() {
        try {
            const userData = this.originalLocalStorage.getItem('currentUser');
            if (!userData) return null;
            
            const userObj = JSON.parse(userData);
            
            // 토큰 정보 복원
            if (this.tokenManager) {
                const accessToken = this.tokenManager.getSecureToken('kakaoAccess');
                const refreshToken = this.tokenManager.getSecureToken('kakaoRefresh');
                
                if (accessToken) {
                    userObj.access_token = accessToken;
                }
                if (refreshToken) {
                    userObj.refresh_token = refreshToken;
                }
            }
            
            return JSON.stringify(userObj);
            
        } catch (error) {
            console.error('❌ currentUser 조회 처리 오류:', error);
            return this.originalLocalStorage.getItem('currentUser');
        }
    }
    
    /**
     * 민감한 키인지 확인
     */
    isSensitiveKey(key) {
        if (this.sensitiveKeys.has(key)) return true;
        
        // 키워드 기반 감지
        const sensitiveKeywords = ['token', 'key', 'secret', 'password', 'auth'];
        const lowerKey = key.toLowerCase();
        
        return sensitiveKeywords.some(keyword => 
            lowerKey.includes(keyword) && 
            !lowerKey.includes('config') && 
            !lowerKey.includes('setting')
        );
    }
    
    /**
     * 민감한 키 추가
     */
    addSensitiveKey(key) {
        this.sensitiveKeys.add(key);
        console.log(`🔒 민감한 키 추가: ${key}`);
    }
    
    /**
     * 래핑 해제 (테스트용)
     */
    unwrapLocalStorage() {
        if (this.originalLocalStorage) {
            localStorage.setItem = this.originalLocalStorage.setItem;
            localStorage.getItem = this.originalLocalStorage.getItem;
            localStorage.removeItem = this.originalLocalStorage.removeItem;
            localStorage.clear = this.originalLocalStorage.clear;
            
            console.log('🔒 localStorage 래핑 해제');
        }
    }
    
    /**
     * 통계 정보
     */
    getSecurityStats() {
        const stats = {
            sensitiveKeys: Array.from(this.sensitiveKeys),
            tokenManagerActive: !!this.tokenManager,
            wrappingActive: this.isInitialized
        };
        
        if (this.tokenManager) {
            // 저장된 토큰 수 (개인정보 보호)
            stats.secureTokensCount = this.tokenManager.tokenCache.size;
        }
        
        return stats;
    }
}

// 전역 접근
window.SecureStorageWrapper = SecureStorageWrapper;
window.getSecureStorageWrapper = () => SecureStorageWrapper.getInstance();

// 자동 초기화 (다른 스크립트들보다 먼저 실행되도록)
(function() {
    // DOM 로드를 기다리지 않고 즉시 초기화
    const wrapper = SecureStorageWrapper.getInstance();
    
    // 추가적으로 DOM 로드 후에도 확인
    document.addEventListener('DOMContentLoaded', () => {
        if (!wrapper.isInitialized) {
            wrapper.init();
        }
    });
})();

console.log('🔒 SecureStorageWrapper 클래스 로드 완료');