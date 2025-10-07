/**
 * FCM Token Manager
 * Firebase Cloud Messaging 토큰 관리 전용 모듈
 */

class FCMTokenManager {
    constructor() {
        this.token = null;
        this.messaging = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.authFailureDetected = false; // 인증 오류 감지 플래그
        this.isDevelopmentMode = this.isRunningInDevelopment();
        this.cacheVersion = 'v13.5.1-final-fix-' + Date.now(); // 캐시 무효화
        
        // 🚨 즉시 WebView 환경 확인 (생성자에서 바로 실행)
        this.isWebViewEnvironment = this.detectWebViewEnvironment();
        console.log('🔍 [FCM] 🚨 IMMEDIATE WebView 감지 결과:', this.isWebViewEnvironment);
    }

    /**
     * 🚨 WebView 환경 즉시 감지 (절대 실패하지 않는 감지)
     */
    detectWebViewEnvironment() {
        // 1차: URL 프로토콜 확인 (가장 확실한 방법)
        if (window.location.protocol === 'file:') {
            console.log('🚨 [FCM] file:// 프로토콜 확정 - WebView 100% 확실');
            return true;
        }
        
        // 2차: URL href 확인
        if (window.location.href.includes('android_asset')) {
            console.log('🚨 [FCM] android_asset 경로 확정 - WebView 100% 확실');
            return true;
        }
        
        // 3차: AndroidBridge 확인
        if (window.AndroidBridge) {
            console.log('🚨 [FCM] AndroidBridge 확정 - WebView 100% 확실');
            return true;
        }
        
        // 4차: UserAgent 확인
        if (navigator.userAgent && navigator.userAgent.includes('wv')) {
            console.log('🚨 [FCM] UserAgent wv 확정 - WebView 100% 확실');
            return true;
        }
        
        console.log('🌐 [FCM] 웹 브라우저 환경으로 판단');
        return false;
    }
    
    /**
     * FCM 시스템 초기화
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ FCM 토큰 매니저가 이미 초기화됨');
            return this.token;
        }
        
        try {
            console.log('🔔 FCM 토큰 매니저 초기화 시작');
            
            // 🚨 생명구조 시스템: 사용자 로그인 상태 확인
            const currentUser = this.getCurrentUser();
            if (!currentUser || !currentUser.kakao_id) {
                console.log('⏳ 사용자 로그인 대기 중 - FCM 초기화 지연');
                console.log('🚨 생명구조 시스템: 로그인 후 자동으로 FCM 활성화됩니다');
                
                // 로그인 상태 변화 감지를 위한 이벤트 리스너 설정
                this.setupLoginStateListener();
                return null;
            }
            
            console.log('✅ 로그인된 사용자 확인:', currentUser.nickname || currentUser.kakao_id);
            
            // 알림 권한 요청
            await this.requestNotificationPermission();
            
            // Service Worker 등록
            await this.registerServiceWorker();
            
            // FCM 토큰 초기화
            await this.initializeFCMToken();
            
            this.isInitialized = true;
            console.log('✅ FCM 토큰 매니저 초기화 완료');
            
            return this.token;
            
        } catch (error) {
            console.error('❌ FCM 토큰 매니저 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 🚨 알림 권한 요청 (WebView API 절대 금지)
     */
    async requestNotificationPermission() {
        try {
            console.log('🔍 [FCM] 🚨 알림 권한 요청 시작 - WebView 상태:', this.isWebViewEnvironment);
            
            // 🚨 WebView에서는 절대로 알림 API 시도하지 않음
            if (this.isWebViewEnvironment) {
                console.log('📱 [FCM] 🚨 WebView 확정 - 알림 API 완전 차단 (네이티브 사용)');
                return true; // Android 네이티브에서 처리
            }
            
            // 🌐 웹 브라우저에서만 알림 API 사용
            console.log('🌐 [FCM] 웹 브라우저 환경 - 알림 API 시도');
            
            if (!('Notification' in window)) {
                throw new Error('이 브라우저는 알림을 지원하지 않습니다');
            }
            
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ FCM 알림 권한 허용됨');
                return true;
            } else {
                console.warn('⚠️ FCM 알림 권한이 거부되었습니다:', permission);
                return false;
            }
            
        } catch (error) {
            console.error('❌ 알림 권한 요청 실패:', error);
            return false;
        }
    }
    
    /**
     * 🚨 Service Worker 등록 (WebView API 절대 금지)
     */
    async registerServiceWorker() {
        try {
            console.log('🔍 [SW] 🚨 Service Worker 등록 시작 - WebView 상태:', this.isWebViewEnvironment);
            
            // 🚨 WebView에서는 절대로 Service Worker 시도하지 않음
            if (this.isWebViewEnvironment) {
                console.log('📱 [SW] 🚨 WebView 확정 - Service Worker 완전 차단 (네이티브 FCM 사용)');
                return null; // WebView에서는 Android 네이티브 FCM 사용
            }
            
            // 🌐 웹 브라우저에서만 Service Worker 등록
            console.log('🌐 [SW] 웹 브라우저 환경 - Service Worker 등록 시도');
            
            if (!('serviceWorker' in navigator)) {
                throw new Error('이 브라우저는 Service Worker를 지원하지 않습니다');
            }
            
            // 🚨 생명구조 시스템: 경로 통일 및 중복 등록 방지
            const swPath = '/firebase-messaging-sw.js';
            
            // 기존 등록 확인
            const existingRegistration = await navigator.serviceWorker.getRegistration();
            if (existingRegistration && existingRegistration.active) {
                console.log('✅ 기존 Service Worker 발견, 재사용');
                console.log('📍 Service Worker 스코프:', existingRegistration.scope);
                return existingRegistration;
            }
            
            // 새 Service Worker 등록
            const registration = await navigator.serviceWorker.register(swPath);
            console.log('✅ Service Worker 등록 완료:', registration.scope);
            console.log('🚨 생명구조 메시지 시스템 Service Worker 활성화');
            
            return registration;
            
        } catch (error) {
            console.error('❌ Service Worker 등록 실패:', error);
            console.error('🚨 생명구조 시스템 메시지 채널 오류 발생');
            throw error;
        }
    }
    
    /**
     * 개발 환경 감지 - 2024.09.24 생명구조 시스템 안정화
     */
    isRunningInDevelopment() {
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname === '0.0.0.0' ||
                     hostname.includes('.local');
        return isDev;
    }

    /**
     * Android WebView 환경 감지 (강화된 감지)
     */
    isAndroidWebView() {
        const isFileProtocol = window.location.protocol === 'file:';
        const hasAndroidBridge = !!window.AndroidBridge;
        const userAgent = navigator.userAgent || '';
        const hasWebViewUA = userAgent.indexOf('wv') > -1;
        
        // file:// 프로토콜이 가장 확실한 WebView 지표
        return isFileProtocol || hasAndroidBridge || hasWebViewUA;
    }
    
    /**
     * FCM 토큰 초기화 및 생성 - 개발 환경 우회 로직 추가
     */
    async initializeFCMToken() {
        try {
            // 개발 환경에서도 실제 FCM 토큰 생성 (백그라운드 알림을 위해)
            if (this.isDevelopmentMode) {
                console.log('🔧 개발 환경 감지: 실제 FCM 토큰 생성 진행');
                console.log('📱 백그라운드 푸시 알림을 위해 FCM 시스템 활성화');
                console.log('🚨 생명구조 시스템: 모든 환경에서 FCM 사용');
                
                // 개발환경에서도 실제 FCM 진행
                // 단, 서버 등록만 선택적으로 처리 (아래 saveTokenToDatabase에서)
            }
            
            // Firebase 초기화 대기 및 messaging 객체 받기
            this.messaging = await this.waitForFirebase();
            
            // VAPID 키 설정 (환경변수에서 가져오기)
            const vapidKey = window.ENV_CONFIG?.firebase?.vapidKey || 
                           window.firebaseConfig?.vapidKey;
            
            if (!vapidKey) {
                throw new Error('VAPID 키가 설정되지 않았습니다');
            }
            
            // Service Worker 연결 확인 및 활성화 대기
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const state = registration.active?.state;
                console.log('✅ Service Worker 상태 확인:', {
                    scope: registration.scope,
                    state: state,
                    scriptURL: registration.active?.scriptURL
                });
                
                // Service Worker가 활성화될 때까지 대기
                if (state !== 'activated') {
                    console.log('⏰ Service Worker 활성화 대기 중...');
                    await this.waitForServiceWorkerActivation(registration);
                }
            } else {
                throw new Error('Service Worker가 등록되지 않았습니다.');
            }
            
            // FCM 토큰 생성
            this.token = await this.messaging.getToken({ vapidKey });
            
            if (!this.token) {
                throw new Error('FCM 토큰 생성 실패');
            }
            
            console.log('✅ FCM 토큰 생성 성공:', this.token.substring(0, 20) + '...');
            
            // 토큰 저장 - 재시도 로직 포함
            const dbSaveSuccess = await this.saveTokenToDatabase();
            await this.saveTokenToLocalStorage();
            
            // 서버 등록 실패시 재시도 (인증 오류가 아닌 경우에만)
            if (!dbSaveSuccess && this.retryCount < this.maxRetries && !this.authFailureDetected) {
                console.warn(`⚠️ FCM 토큰 서버 등록 실패 - 재시도 ${this.retryCount + 1}/${this.maxRetries}`);
                this.retryCount++;
                
                // 1초 후 재시도
                setTimeout(async () => {
                    const retrySuccess = await this.saveTokenToDatabase();
                    if (retrySuccess) {
                        console.log('✅ FCM 토큰 재시도 등록 성공');
                    } else {
                        console.error('❌ FCM 토큰 재시도 등록 실패');
                    }
                }, 1000);
            } else if (this.authFailureDetected) {
                console.log('🚨 인증 오류로 인해 서버 등록 재시도 중단');
            }
            
            // 포그라운드 메시지 핸들러 설정
            this.setupForegroundMessageHandler();
            
            return this.token;
            
        } catch (error) {
            console.error('❌ FCM 토큰 초기화 실패:', error);
            
            // 인증 오류 감지 (권한 거부, VAPID 키 오류 등)
            if (error.code === 'messaging/permission-blocked' || 
                error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/invalid-vapid-key' ||
                error.message?.includes('auth') ||
                error.message?.includes('permission') ||
                error.message?.includes('blocked')) {
                
                console.error('🚨 인증 오류 감지 - 재시도 중단:', error.code || error.message);
                this.authFailureDetected = true;
                throw error; // 인증 오류는 재시도하지 않음
            }
            
            // 일반적인 네트워크 오류나 임시 오류의 경우에만 재시도
            if (this.retryCount < this.maxRetries && !this.authFailureDetected) {
                this.retryCount++;
                console.log(`🔄 FCM 토큰 초기화 재시도 (${this.retryCount}/${this.maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await this.initializeFCMToken();
            }
            
            throw error;
        }
    }
    
    /**
     * Firebase 로딩 대기 - 2024.09.24 생명구조 시스템 안정화
     */
    async waitForFirebase(maxWaitTime = 15000) {
        const startTime = Date.now();
        let attempts = 0;
        
        while (!window.firebase || !window.firebase.messaging) {
            attempts++;
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error(`Firebase 로딩 시간 초과 (${attempts}번 시도)`);
            }
            
            console.log(`🔄 Firebase 로딩 대기 중... (${attempts}번째 시도)`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`✅ Firebase 로딩 완료 (${attempts}번 시도 후)`);
        
        // Firebase Messaging 초기화 확인
        try {
            const messaging = window.firebase.messaging();
            console.log('✅ Firebase Messaging 객체 생성 성공');
            return messaging;
        } catch (error) {
            console.error('❌ Firebase Messaging 객체 생성 실패:', error);
            throw error;
        }
    }
    
    /**
     * Service Worker 활성화 대기 - 2024.09.24 생명구조 시스템 안정화
     */
    async waitForServiceWorkerActivation(registration, maxWaitTime = 10000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkActivation = () => {
                if (registration.active && registration.active.state === 'activated') {
                    console.log('✅ Service Worker 활성화 완료');
                    resolve();
                } else if (Date.now() - startTime > maxWaitTime) {
                    console.warn('⚠️ Service Worker 활성화 대기 시간 초과, 계속 진행');
                    resolve();
                } else {
                    console.log('🔄 Service Worker 활성화 대기 중...', registration.active?.state);
                    setTimeout(checkActivation, 200);
                }
            };
            
            checkActivation();
        });
    }
    
    /**
     * 포그라운드 메시지 핸들러 설정
     */
    setupForegroundMessageHandler() {
        this.messaging.onMessage((payload) => {
            console.log('📱 포그라운드에서 FCM 메시지 수신:', payload);
            
            // 브라우저 알림으로 표시
            if (payload.notification) {
                this.showNotification(payload.notification, payload.data);
            }
        });
    }
    
    /**
     * 브라우저 알림 표시
     */
    showNotification(notification, data = {}) {
        const notificationOptions = {
            body: notification.body,
            icon: notification.icon || '/icon-192x192.png',
            badge: '/icon-192x192.png', // badge용으로 기존 아이콘 재사용
            tag: data.type || 'fcm-notification',
            renotify: true,
            requireInteraction: data.alert_level === 'emergency',
            data: data,
            actions: [
                { action: 'view', title: '확인하기' },
                { action: 'dismiss', title: '닫기' }
            ]
        };
        
        // 알림 레벨에 따른 추가 설정
        if (data.alert_level === 'emergency') {
            notificationOptions.requireInteraction = true;
            notificationOptions.actions = [
                { action: 'call119', title: '119 신고' },
                { action: 'view', title: '확인' },
                { action: 'dismiss', title: '닫기' }
            ];
        }
        
        new Notification(notification.title, notificationOptions);
    }
    
    /**
     * 토큰을 Firebase에 저장 - 2024.09.24 생명구조 시스템 긴급 수정
     */
    async saveTokenToDatabase() {
        try {
            // 개발 환경에서도 서버 등록 시도 (백그라운드 알림을 위해)
            if (this.isDevelopmentMode) {
                console.log('🔧 개발 환경: FCM 토큰 서버 등록 시도');
                console.log('📱 백그라운드 알림을 위해 실제 토큰 서버 등록');
                // 개발환경에서도 계속 진행
            }
            
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.kakao_id) {
                console.warn('⚠️ 로그인된 사용자가 없어 FCM 토큰 저장 건너뜀');
                return false;
            }
            
            console.log('🚨 생명구조 시스템: FCM 토큰 서버 등록 시작');
            
            // Firebase Functions updateFCMToken 엔드포인트 사용 (올바른 방식)
            if (window.fcmEndpoints && window.fcmEndpoints.updateToken) {
                const tokenData = {
                    userId: String(currentUser.kakao_id),      // Firebase Functions 기대 형식
                    fcmToken: this.token,                      // Firebase Functions 기대 형식
                    platform: this.getDeviceType(),
                    userAgent: navigator.userAgent || 'Unknown'
                };
                
                console.log('📤 FCM 토큰 등록 데이터:', {
                    userId: tokenData.userId,
                    hasToken: !!tokenData.fcmToken,
                    platform: tokenData.platform
                });
                
                const response = await fetch(window.fcmEndpoints.updateToken, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(tokenData)
                });
                
                const responseText = await response.text();
                console.log('📋 FCM 토큰 등록 응답:', {
                    status: response.status,
                    statusText: response.statusText,
                    response: responseText
                });
                
                if (response.ok) {
                    console.log('✅ 생명구조 시스템: FCM 토큰 서버 등록 성공');
                    return true;
                } else {
                    console.error('❌ FCM 토큰 서버 등록 실패:', {
                        status: response.status,
                        response: responseText
                    });
                    
                    // 인증 관련 오류 감지 (401, 403 등)
                    if (response.status === 401 || response.status === 403 || 
                        responseText.includes('auth') || responseText.includes('unauthorized')) {
                        console.error('🚨 서버 인증 오류 감지 - 재시도 중단');
                        this.authFailureDetected = true;
                    }
                    
                    return false;
                }
            } else {
                console.error('❌ FCM 엔드포인트를 찾을 수 없음');
                return false;
            }
            
        } catch (error) {
            console.error('❌ FCM 토큰 데이터베이스 저장 실패:', error);
            return false;
        }
    }
    
    /**
     * 토큰을 로컬 스토리지에 저장
     */
    async saveTokenToLocalStorage() {
        try {
            localStorage.setItem('fcm-token', this.token);
            localStorage.setItem('fcm-token-created', new Date().toISOString());
            console.log('✅ FCM 토큰 로컬 저장 완료');
            
        } catch (error) {
            console.error('❌ FCM 토큰 로컬 저장 실패:', error);
        }
    }
    
    /**
     * 토큰 새로고침
     */
    async refreshToken() {
        try {
            if (!this.messaging) {
                throw new Error('FCM 메시징이 초기화되지 않았습니다');
            }
            
            const vapidKey = window.ENV_CONFIG?.firebase?.vapidKey || 
                           window.firebaseConfig?.vapidKey;
            
            this.token = await this.messaging.getToken({ vapidKey });
            
            if (this.token) {
                const dbSaveSuccess = await this.saveTokenToDatabase();
                await this.saveTokenToLocalStorage();
                
                if (dbSaveSuccess) {
                    console.log('✅ FCM 토큰 새로고침 및 서버 등록 완료');
                } else {
                    console.warn('⚠️ FCM 토큰 새로고침 완료, 서버 등록 실패');
                }
            }
            
            return this.token;
            
        } catch (error) {
            console.error('❌ FCM 토큰 새로고침 실패:', error);
            throw error;
        }
    }
    
    /**
     * 토큰 삭제
     */
    async deleteToken() {
        try {
            if (this.messaging && this.token) {
                await this.messaging.deleteToken();
                console.log('✅ FCM 토큰 삭제 완료');
            }
            
            // 로컬 스토리지에서 제거
            localStorage.removeItem('fcm-token');
            localStorage.removeItem('fcm-token-created');
            
            this.token = null;
            
        } catch (error) {
            console.error('❌ FCM 토큰 삭제 실패:', error);
        }
    }
    
    /**
     * 현재 토큰 조회
     */
    getCurrentToken() {
        return this.token;
    }
    
    /**
     * 디바이스 타입 감지
     */
    getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('android')) {
            return 'android';
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            return 'ios';
        } else {
            return 'web';
        }
    }
    
    /**
     * 토큰 유효성 검사
     */
    isTokenValid() {
        if (!this.token) {
            return false;
        }
        
        // 토큰 생성 시간 확인 (30일 후 만료)
        const tokenCreated = localStorage.getItem('fcm-token-created');
        if (tokenCreated) {
            const createdTime = new Date(tokenCreated);
            const now = new Date();
            const daysDiff = (now - createdTime) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 30) {
                console.warn('⚠️ FCM 토큰이 만료되었습니다');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 현재 로그인된 사용자 정보 조회
     */
    getCurrentUser() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return currentUser;
        } catch (error) {
            console.error('❌ 사용자 정보 조회 실패:', error);
            return null;
        }
    }
    
    /**
     * 로그인 상태 변화 감지 및 FCM 자동 초기화 설정
     */
    setupLoginStateListener() {
        console.log('🔍 로그인 상태 변화 감지 시스템 설정');
        
        // localStorage 변화 감지
        window.addEventListener('storage', (event) => {
            if (event.key === 'currentUser' && event.newValue) {
                console.log('🔄 로그인 상태 변화 감지됨');
                const newUser = JSON.parse(event.newValue);
                if (newUser && newUser.kakao_id && !this.isInitialized) {
                    console.log('✅ 사용자 로그인 확인 - FCM 자동 초기화 시작');
                    setTimeout(() => {
                        this.init().catch(error => {
                            console.error('❌ FCM 자동 초기화 실패:', error);
                        });
                    }, 1000);
                }
            }
        });
        
        // 주기적 로그인 상태 확인 (3초마다)
        const loginCheckInterval = setInterval(() => {
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.kakao_id && !this.isInitialized) {
                console.log('✅ 주기적 확인: 사용자 로그인 확인됨 - FCM 초기화 시작');
                clearInterval(loginCheckInterval);
                this.init().catch(error => {
                    console.error('❌ FCM 주기적 초기화 실패:', error);
                });
            }
        }, 3000);
        
        // 5분 후 타임아웃
        setTimeout(() => {
            clearInterval(loginCheckInterval);
            console.log('⏰ FCM 로그인 상태 감지 타임아웃');
        }, 300000);
    }
    
    /**
     * 수동 FCM 활성화 (로그인 후 호출)
     */
    async activateAfterLogin() {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.kakao_id && !this.isInitialized) {
            console.log('🚀 수동 FCM 활성화 요청');
            return await this.init();
        } else if (this.isInitialized) {
            console.log('ℹ️ FCM이 이미 활성화되어 있습니다');
            return this.token;
        } else {
            console.warn('⚠️ 로그인 상태가 확인되지 않아 FCM 활성화를 건너뜁니다');
            return null;
        }
    }
    
    /**
     * 디버그 정보 조회 - 개발 환경 정보 추가
     */
    getDebugInfo() {
        const currentUser = this.getCurrentUser();
        return {
            isInitialized: this.isInitialized,
            hasToken: !!this.token,
            tokenPreview: this.token ? this.token.substring(0, 20) + '...' : null,
            deviceType: this.getDeviceType(),
            isTokenValid: this.isTokenValid(),
            retryCount: this.retryCount,
            isDevelopmentMode: this.isDevelopmentMode,
            hostname: window.location.hostname,
            backupSystemActive: this.isDevelopmentMode,
            authFailureDetected: this.authFailureDetected,
            currentUser: currentUser ? {
                hasKakaoId: !!currentUser.kakao_id,
                nickname: currentUser.nickname || 'unknown'
            } : null
        };
    }
}

// 전역 인스턴스 생성
window.fcmTokenManager = new FCMTokenManager();

// Android에서 FCM 토큰 수신 핸들러 - 생명구조 시스템
window.onFCMTokenReceived = function(token) {
    console.log('🔑 Android에서 FCM 토큰 수신:', token.substring(0, 20) + '...');
    
    if (window.fcmTokenManager) {
        // Android 토큰으로 업데이트
        window.fcmTokenManager.token = token;
        window.fcmTokenManager.isInitialized = true;
        
        // 서버에 토큰 등록
        window.fcmTokenManager.saveTokenToDatabase().then(success => {
            if (success) {
                console.log('✅ Android FCM 토큰 서버 등록 성공');
            } else {
                console.warn('⚠️ Android FCM 토큰 서버 등록 실패');
            }
        });
        
        // 로컬 저장
        window.fcmTokenManager.saveTokenToLocalStorage();
        
        console.log('🚨 생명구조 시스템: Android FCM 토큰 통합 완료');
    }
};

// 백그라운드 FCM 메시지 수신 핸들러 - 생명구조 시스템
window.onFCMBackgroundMessage = function(payload) {
    console.log('📱 백그라운드 FCM 메시지 수신:', payload);
    
    // 친구 상태 알림인 경우 UI 업데이트
    if (payload.data && payload.data.type === 'friend_status') {
        if (window.friendStatusMonitor && window.friendStatusMonitor.refreshFriendStatus) {
            window.friendStatusMonitor.refreshFriendStatus();
        }
        
        // 알림 표시
        if (window.notifications && typeof window.notifications.showNotification === 'function') {
            const title = payload.notification?.title || '친구 상태 알림';
            const message = payload.notification?.body || '친구 상태를 확인해주세요';
            window.notifications.showNotification(title, message, payload.data.alert_level);
        }
    }
};

// 알림에서 앱이 열렸을 때 처리 - 생명구조 시스템
window.onNotificationOpened = function(data) {
    console.log('📱 알림에서 앱 열림:', data);
    
    // 친구 페이지로 이동
    if (data.friendId) {
        // 친구 상태 페이지 표시
        if (window.showPage) {
            window.showPage('friends');
        }
        
        // 해당 친구 카드로 스크롤
        setTimeout(() => {
            const friendCard = document.querySelector(`[data-friend-id="${data.friendId}"]`);
            if (friendCard) {
                friendCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                friendCard.style.border = '3px solid #ff6b35';
                friendCard.style.animation = 'pulse 2s infinite';
            }
        }, 1000);
    }
};

// 119 응급 신고 처리 - 생명구조 시스템
window.handle119Emergency = function(friendName) {
    console.log('🚨 119 응급 신고 처리:', friendName);
    
    if (window.api119Client && typeof window.api119Client.reportEmergency === 'function') {
        // API 119 클라이언트로 신고
        window.api119Client.reportEmergency('emergency', {
            name: friendName,
            reason: '72시간 이상 무응답',
            source: 'fcm_notification'
        }).then(result => {
            if (result.success) {
                alert(`✅ ${friendName}님에 대한 119 신고가 접수되었습니다.`);
            } else {
                alert(`❌ 119 신고 실패: ${result.error}`);
            }
        });
    } else {
        // 기본 알림
        alert(`🚨 ${friendName}님에 대한 응급신고를 진행합니다.\n119에 연락하여 안전 확인을 요청하세요.`);
    }
};

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FCMTokenManager;
}