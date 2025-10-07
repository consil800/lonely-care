/**
 * FirebaseManager - 중앙화된 Firebase 초기화 및 관리 시스템
 * lonely-care 프로젝트의 Firebase 중복 초기화 문제 해결을 위한 싱글톤 매니저
 * 
 * 🚨 생명구조 시스템 - Firebase 연결 안정성 최우선
 * 
 * @version 1.0.0
 * @created 2024-12-26
 * @purpose Firebase 초기화 중복 방지, 안정적인 연결 관리
 */

class FirebaseManager {
    static instance = null;
    
    /**
     * 싱글톤 패턴으로 인스턴스 가져오기
     */
    static getInstance() {
        if (!FirebaseManager.instance) {
            FirebaseManager.instance = new FirebaseManager();
        }
        return FirebaseManager.instance;
    }
    
    constructor() {
        // 싱글톤 패턴 보장
        if (FirebaseManager.instance) {
            return FirebaseManager.instance;
        }
        
        // 초기화 상태
        this.isInitialized = false;
        this.isInitializing = false;
        this.initPromise = null;
        
        // Firebase 인스턴스들
        this.app = null;
        this.db = null;
        this.messaging = null;
        this.auth = null;
        
        // 설정
        this.config = null;
        
        // 에러 및 재시도 관리
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1초
        this.currentRetries = 0;
        
        console.log('🔥 FirebaseManager 인스턴스 생성');
    }
    
    /**
     * Firebase 초기화 (Promise 기반, 중복 방지)
     */
    async initialize() {
        // 이미 초기화된 경우
        if (this.isInitialized) {
            console.log('✅ Firebase 이미 초기화됨 - 기존 인스턴스 반환');
            return this.getInstances();
        }
        
        // 초기화 진행 중인 경우 동일한 Promise 반환
        if (this.isInitializing && this.initPromise) {
            console.log('🔄 Firebase 초기화 진행 중 - 기존 Promise 대기');
            return this.initPromise;
        }
        
        // 새로운 초기화 시작
        console.log('🚀 Firebase 초기화 시작');
        this.isInitializing = true;
        this.initPromise = this._doInitialize();
        
        return this.initPromise;
    }
    
    /**
     * 실제 초기화 로직
     */
    async _doInitialize() {
        try {
            // 1단계: 설정 로드 대기
            await this._waitForConfig();
            
            // 2단계: Firebase 앱 초기화
            await this._initializeApp();
            
            // 3단계: 서비스 초기화
            await this._initializeServices();
            
            // 4단계: 완료 처리
            this.isInitialized = true;
            this.isInitializing = false;
            this.currentRetries = 0;
            
            console.log('✅ FirebaseManager 초기화 완료');
            return this.getInstances();
            
        } catch (error) {
            console.error('❌ FirebaseManager 초기화 실패:', error);
            this.isInitializing = false;
            
            // 재시도 로직
            if (this.currentRetries < this.maxRetries) {
                this.currentRetries++;
                console.log(`🔄 Firebase 초기화 재시도 ${this.currentRetries}/${this.maxRetries}`);
                
                await this._delay(this.retryDelay * this.currentRetries);
                return this._doInitialize();
            } else {
                console.error('💥 Firebase 초기화 최종 실패 - 모든 재시도 소진');
                throw error;
            }
        }
    }
    
    /**
     * Firebase 설정 로드 대기
     */
    async _waitForConfig() {
        // 최대 5초 동안 설정 로드 대기
        const maxWait = 5000;
        const checkInterval = 100;
        const maxChecks = maxWait / checkInterval;
        
        for (let i = 0; i < maxChecks; i++) {
            if (window.firebaseConfig && window.firebaseConfig.apiKey) {
                this.config = window.firebaseConfig;
                console.log('✅ Firebase 설정 로드 완료');
                return;
            }
            
            await this._delay(checkInterval);
        }
        
        throw new Error('Firebase 설정을 로드할 수 없습니다. firebase-config.js 확인 필요');
    }
    
    /**
     * Firebase 앱 초기화
     */
    async _initializeApp() {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK가 로드되지 않았습니다');
        }
        
        // 기존 앱이 있는 경우 재사용
        if (firebase.apps && firebase.apps.length > 0) {
            this.app = firebase.apps[0];
            console.log('🔄 기존 Firebase 앱 재사용');
        } else {
            // 새 앱 초기화
            this.app = firebase.initializeApp(this.config);
            console.log('🔥 새 Firebase 앱 초기화 완료');
        }
    }
    
    /**
     * Firebase 서비스 초기화
     */
    async _initializeServices() {
        try {
            // Firestore 초기화
            if (firebase.firestore) {
                this.db = firebase.firestore();
                console.log('✅ Firestore 초기화 완료');
            }
            
            // FCM 초기화 (선택적)
            if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) {
                this.messaging = firebase.messaging();
                console.log('✅ Firebase Messaging 초기화 완료');
            } else {
                console.log('⚠️ Firebase Messaging 미지원 환경');
            }
            
            // Auth 초기화 (선택적)
            if (firebase.auth) {
                this.auth = firebase.auth();
                console.log('✅ Firebase Auth 초기화 완료');
            }
            
        } catch (error) {
            console.warn('⚠️ 일부 Firebase 서비스 초기화 실패:', error);
            // 일부 서비스 실패는 전체 초기화를 중단하지 않음
        }
    }
    
    /**
     * 초기화된 인스턴스들 반환
     */
    getInstances() {
        return {
            app: this.app,
            db: this.db,
            messaging: this.messaging,
            auth: this.auth,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * Firestore 인스턴스 가져오기
     */
    async getFirestore() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.db;
    }
    
    /**
     * Messaging 인스턴스 가져오기
     */
    async getMessaging() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.messaging;
    }
    
    /**
     * Auth 인스턴스 가져오기
     */
    async getAuth() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.auth;
    }
    
    /**
     * 초기화 상태 확인
     */
    isReady() {
        return this.isInitialized && this.app !== null;
    }
    
    /**
     * 지연 함수
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 연결 상태 확인
     */
    async checkConnection() {
        try {
            if (!this.db) {
                return false;
            }
            
            // 간단한 읽기 테스트
            await this.db.collection('_health_check').limit(1).get();
            return true;
            
        } catch (error) {
            console.warn('⚠️ Firebase 연결 확인 실패:', error);
            return false;
        }
    }
    
    /**
     * 강제 재초기화 (디버깅/복구용)
     */
    async reinitialize() {
        console.log('🔄 Firebase 강제 재초기화');
        
        this.isInitialized = false;
        this.isInitializing = false;
        this.initPromise = null;
        this.currentRetries = 0;
        
        return this.initialize();
    }
}

// 전역 인스턴스 생성 및 접근
window.FirebaseManager = FirebaseManager;
window.getFirebaseManager = () => FirebaseManager.getInstance();

// 즉시 초기화 (선택적)
if (typeof window !== 'undefined' && window.firebaseConfig) {
    const manager = FirebaseManager.getInstance();
    manager.initialize().catch(error => {
        console.warn('⚠️ FirebaseManager 자동 초기화 실패:', error);
    });
}

console.log('🔥 FirebaseManager 클래스 로드 완료');