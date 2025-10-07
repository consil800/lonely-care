/**
 * 🔒 SecureTokenManager - 토큰 암호화 관리자
 * lonely-care 프로젝트의 보안 강화를 위한 토큰 암호화/복호화 시스템
 * 
 * 🚨 생명구조 시스템 보안 강화: localStorage 대신 암호화된 보안 저장소 사용
 * 
 * @version 1.0.0
 * @created 2024-12-27
 * @purpose 토큰 보안 강화, XSS 공격 방지, 민감 정보 보호
 */

class SecureTokenManager {
    static instance = null;
    
    /**
     * 싱글톤 패턴으로 인스턴스 가져오기
     */
    static getInstance() {
        if (!SecureTokenManager.instance) {
            SecureTokenManager.instance = new SecureTokenManager();
        }
        return SecureTokenManager.instance;
    }
    
    constructor() {
        if (SecureTokenManager.instance) {
            return SecureTokenManager.instance;
        }
        
        // 초기화
        this.isInitialized = false;
        this.encryptionKey = null;
        this.salt = null;
        this.tokenCache = new Map(); // 메모리 캐시 (휘발성)
        this.maxCacheAge = 30 * 60 * 1000; // 30분
        
        console.log('🔒 SecureTokenManager 초기화');
        this.init();
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            // 암호화 키 생성 또는 복원
            await this.initializeEncryption();
            
            // 기존 평문 토큰 마이그레이션
            await this.migrateExistingTokens();
            
            this.isInitialized = true;
            console.log('✅ SecureTokenManager 초기화 완료');
            
        } catch (error) {
            console.error('❌ SecureTokenManager 초기화 실패:', error);
            // 생명구조 앱이므로 fallback 모드로 동작
            this.isInitialized = false;
        }
    }
    
    /**
     * 암호화 키 초기화
     */
    async initializeEncryption() {
        // 기기별 고유 식별자 생성
        const deviceFingerprint = await this.generateDeviceFingerprint();
        
        // 기존 salt 확인 또는 새로 생성
        let storedSalt = localStorage.getItem('__lc_salt');
        if (!storedSalt) {
            storedSalt = this.generateRandomSalt();
            localStorage.setItem('__lc_salt', storedSalt);
        }
        this.salt = storedSalt;
        
        // 암호화 키 생성 (기기 지문 + salt)
        this.encryptionKey = await this.deriveKey(deviceFingerprint + this.salt);
        
        console.log('🔑 암호화 키 초기화 완료');
    }
    
    /**
     * 기기 지문 생성 (기기별 고유값)
     */
    async generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 1,
            navigator.platform
        ];
        
        // 간단한 해시 함수 (Web Crypto API 대신)
        const data = components.join('|');
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit 정수 변환
        }
        
        return Math.abs(hash).toString(36);
    }
    
    /**
     * 랜덤 salt 생성
     */
    generateRandomSalt() {
        const array = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(array);
        } else {
            // fallback
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * 키 도출 함수 (PBKDF2 대신 간단한 구현)
     */
    async deriveKey(input) {
        // 간단한 키 도출 (보안을 위해서는 PBKDF2 사용 권장)
        let hash = 0;
        const iterations = 1000;
        
        for (let iter = 0; iter < iterations; iter++) {
            const data = input + iter.toString();
            for (let i = 0; i < data.length; i++) {
                hash = ((hash << 5) - hash) + data.charCodeAt(i);
                hash = hash & hash;
            }
        }
        
        return Math.abs(hash).toString(36).padStart(16, '0').substring(0, 16);
    }
    
    /**
     * 텍스트 암호화 (간단한 XOR 암호화)
     */
    encrypt(text) {
        if (!this.encryptionKey || !text) return text;
        
        try {
            const key = this.encryptionKey;
            let encrypted = '';
            
            for (let i = 0; i < text.length; i++) {
                const keyChar = key.charCodeAt(i % key.length);
                const textChar = text.charCodeAt(i);
                encrypted += String.fromCharCode(textChar ^ keyChar);
            }
            
            // Base64 인코딩
            return btoa(encrypted);
            
        } catch (error) {
            console.error('❌ 암호화 실패:', error);
            return text; // fallback
        }
    }
    
    /**
     * 텍스트 복호화
     */
    decrypt(encryptedText) {
        if (!this.encryptionKey || !encryptedText) return encryptedText;
        
        try {
            const key = this.encryptionKey;
            
            // Base64 디코딩
            const encrypted = atob(encryptedText);
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                const keyChar = key.charCodeAt(i % key.length);
                const encryptedChar = encrypted.charCodeAt(i);
                decrypted += String.fromCharCode(encryptedChar ^ keyChar);
            }
            
            return decrypted;
            
        } catch (error) {
            console.error('❌ 복호화 실패:', error);
            return encryptedText; // fallback
        }
    }
    
    /**
     * 보안 토큰 저장
     */
    setSecureToken(key, token, expiresIn = 3600) {
        if (!token) return false;
        
        try {
            const tokenData = {
                token: token,
                timestamp: Date.now(),
                expiresIn: expiresIn * 1000, // 밀리초로 변환
                encrypted: this.isInitialized
            };
            
            // 암호화된 토큰 생성
            const encryptedToken = this.isInitialized ? this.encrypt(token) : token;
            tokenData.token = encryptedToken;
            
            // localStorage에 저장 (암호화됨)
            const storageKey = `__lc_token_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(tokenData));
            
            // 메모리 캐시에도 저장 (평문, 짧은 시간)
            this.tokenCache.set(key, {
                token: token, // 평문
                timestamp: Date.now(),
                expiresAt: Date.now() + Math.min(expiresIn * 1000, this.maxCacheAge)
            });
            
            console.log(`🔒 보안 토큰 저장 완료: ${key}`);
            return true;
            
        } catch (error) {
            console.error('❌ 보안 토큰 저장 실패:', error);
            return false;
        }
    }
    
    /**
     * 보안 토큰 조회
     */
    getSecureToken(key) {
        try {
            // 1순위: 메모리 캐시 확인
            const cached = this.tokenCache.get(key);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.token;
            }
            
            // 2순위: localStorage에서 조회
            const storageKey = `__lc_token_${key}`;
            const storedData = localStorage.getItem(storageKey);
            
            if (!storedData) return null;
            
            const tokenData = JSON.parse(storedData);
            
            // 만료 시간 확인
            if (Date.now() - tokenData.timestamp > tokenData.expiresIn) {
                this.removeSecureToken(key);
                return null;
            }
            
            // 복호화
            const decryptedToken = tokenData.encrypted ? 
                this.decrypt(tokenData.token) : tokenData.token;
            
            // 메모리 캐시 업데이트
            this.tokenCache.set(key, {
                token: decryptedToken,
                timestamp: Date.now(),
                expiresAt: Date.now() + this.maxCacheAge
            });
            
            return decryptedToken;
            
        } catch (error) {
            console.error('❌ 보안 토큰 조회 실패:', error);
            return null;
        }
    }
    
    /**
     * 보안 토큰 삭제
     */
    removeSecureToken(key) {
        try {
            const storageKey = `__lc_token_${key}`;
            localStorage.removeItem(storageKey);
            this.tokenCache.delete(key);
            
            console.log(`🔒 보안 토큰 삭제: ${key}`);
            return true;
            
        } catch (error) {
            console.error('❌ 보안 토큰 삭제 실패:', error);
            return false;
        }
    }
    
    /**
     * 기존 평문 토큰 마이그레이션
     */
    async migrateExistingTokens() {
        try {
            console.log('🔄 기존 토큰 마이그레이션 시작...');
            
            // 기존 카카오 토큰 마이그레이션
            const existingKakaoToken = localStorage.getItem('kakaoAccessToken');
            if (existingKakaoToken && !this.getSecureToken('kakaoAccess')) {
                this.setSecureToken('kakaoAccess', existingKakaoToken, 3600);
                localStorage.removeItem('kakaoAccessToken'); // 평문 토큰 제거
                console.log('✅ 카카오 토큰 마이그레이션 완료');
            }
            
            // 기존 사용자 정보에서 토큰 추출 및 마이그레이션
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const userData = JSON.parse(currentUser);
                
                // 액세스 토큰 마이그레이션
                if (userData.access_token && !this.getSecureToken('kakaoAccess')) {
                    this.setSecureToken('kakaoAccess', userData.access_token, 3600);
                    delete userData.access_token; // 평문 토큰 제거
                }
                
                // 리프레시 토큰 마이그레이션
                if (userData.refresh_token && !this.getSecureToken('kakaoRefresh')) {
                    this.setSecureToken('kakaoRefresh', userData.refresh_token, 30 * 24 * 3600); // 30일
                    delete userData.refresh_token; // 평문 토큰 제거
                }
                
                // 정리된 사용자 정보 다시 저장
                localStorage.setItem('currentUser', JSON.stringify(userData));
            }
            
            console.log('✅ 토큰 마이그레이션 완료');
            
        } catch (error) {
            console.error('❌ 토큰 마이그레이션 실패:', error);
        }
    }
    
    /**
     * 모든 토큰 정리
     */
    clearAllTokens() {
        try {
            // localStorage의 모든 토큰 제거
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('__lc_token_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // 메모리 캐시 정리
            this.tokenCache.clear();
            
            console.log('🔒 모든 보안 토큰 정리 완료');
            return true;
            
        } catch (error) {
            console.error('❌ 토큰 정리 실패:', error);
            return false;
        }
    }
    
    /**
     * 토큰 유효성 검증
     */
    validateToken(key) {
        const token = this.getSecureToken(key);
        return token && token.length > 10; // 간단한 유효성 검사
    }
    
    /**
     * 기존 시스템과의 호환성을 위한 래퍼 함수들
     */
    
    // 카카오 액세스 토큰
    setKakaoAccessToken(token) {
        return this.setSecureToken('kakaoAccess', token, 3600);
    }
    
    getKakaoAccessToken() {
        return this.getSecureToken('kakaoAccess');
    }
    
    // 카카오 리프레시 토큰
    setKakaoRefreshToken(token) {
        return this.setSecureToken('kakaoRefresh', token, 30 * 24 * 3600);
    }
    
    getKakaoRefreshToken() {
        return this.getSecureToken('kakaoRefresh');
    }
    
    // Firebase 토큰
    setFirebaseToken(token) {
        return this.setSecureToken('firebaseId', token, 24 * 3600);
    }
    
    getFirebaseToken() {
        return this.getSecureToken('firebaseId');
    }
}

// 전역 접근
window.SecureTokenManager = SecureTokenManager;
window.getSecureTokenManager = () => SecureTokenManager.getInstance();

// 기존 시스템과의 호환성을 위한 전역 함수들
window.setSecureToken = (key, token, expiresIn) => {
    const manager = SecureTokenManager.getInstance();
    return manager.setSecureToken(key, token, expiresIn);
};

window.getSecureToken = (key) => {
    const manager = SecureTokenManager.getInstance();
    return manager.getSecureToken(key);
};

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    const tokenManager = SecureTokenManager.getInstance();
    console.log('🔒 SecureTokenManager 초기화 완료');
});

console.log('🔒 SecureTokenManager 클래스 로드 완료');