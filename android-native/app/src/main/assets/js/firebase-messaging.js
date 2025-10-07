/**
 * Firebase Cloud Messaging (FCM) 통합 시스템
 * lonely-care 앱용 실제 푸시 알림 구현
 */

// Firebase 설정 가져오기
if (!window.firebaseConfig) {
    const script = document.createElement('script');
    script.src = '/lonely-care/js/firebase-config.js';
    document.head.appendChild(script);
}

// Firebase 설정 (firebase-config.js에서 로드)
const firebaseConfig = window.firebaseConfig || {
    apiKey: "AIzaSyDJZ8X8Dz0LKyN7tYo8rvQEhmN4_-_UjKE",
    authDomain: "lonely-care-app.firebaseapp.com",
    projectId: "lonely-care-app",
    storageBucket: "lonely-care-app.appspot.com",
    messagingSenderId: "965854578277",
    appId: "1:965854578277:web:c123456789abcdef012345",
    vapidKey: "BNZGiFig0fz7i5Z5PB4aTegY64xEHcIJxcyTr0IQWqrfXjfd4XVPmz0iNg56xKZWdnLTOTnTHJQhAVXId3nK6FU"
};

class FirebaseMessagingManager {
    constructor() {
        this.messaging = null;
        this.fcmToken = null;
        this.isInitialized = false;
        this.isWebView = this.detectWebView();
        this.notificationPermission = 'default';
        this.messageHandlers = new Map();
        
        console.log('🔥 Firebase Messaging Manager 초기화', {
            platform: this.isWebView ? 'WebView' : 'Web',
            vapidKey: firebaseConfig.vapidKey ? '설정됨' : '미설정'
        });
        
        this.init();
    }

    /**
     * WebView 환경 감지
     */
    detectWebView() {
        const userAgent = navigator.userAgent || '';
        return userAgent.includes('wv') || 
               window.AndroidBridge || 
               window.webkit?.messageHandlers;
    }

    /**
     * 🚨 생명구조 시스템: Firebase 초기화 (완전 강화된 로직)
     */
    async init() {
        try {
            console.log('🔥 [생명구조] Firebase Messaging 초기화 시작...');
            
            // 1단계: Firebase SDK 로딩 대기 및 확인
            await this.waitForFirebaseSDK();
            
            // 2단계: Firebase 앱 초기화 (중복 방지)
            let app;
            try {
                app = firebase.app();
                console.log('✅ [생명구조] 기존 Firebase 앱 사용');
            } catch (error) {
                console.log('🆕 [생명구조] 새 Firebase 앱 초기화 중...');
                app = firebase.initializeApp(firebaseConfig);
                console.log('✅ [생명구조] Firebase 앱 초기화 완료');
            }

            // 3단계: FCM 지원 확인
            console.log('🔍 [생명구조] FCM 브라우저 지원 확인...');
            if (!firebase.messaging || !firebase.messaging.isSupported()) {
                console.warn('❌ [생명구조] 이 브라우저는 FCM을 지원하지 않습니다');
                console.log('   📱 지원되는 브라우저: Chrome, Firefox, Safari (최신 버전)');
                return false;
            }
            console.log('✅ [생명구조] FCM 브라우저 지원 확인됨');

            // 4단계: Messaging 인스턴스 생성
            console.log('📮 [생명구조] Firebase Messaging 인스턴스 생성...');
            this.messaging = firebase.messaging();
            console.log('✅ [생명구조] Messaging 인스턴스 생성 완료');
            
            // 5단계: Service Worker 등록
            console.log('⚙️ [생명구조] Service Worker 등록 중...');
            await this.registerServiceWorker();
            
            // 6단계: VAPID 키 설정
            if (firebaseConfig.vapidKey) {
                console.log('🔑 [생명구조] VAPID 키 설정 중...');
                try {
                    this.messaging.usePublicVapidKey(firebaseConfig.vapidKey);
                    console.log('✅ [생명구조] VAPID 키 설정 완료');
                } catch (vapidError) {
                    console.warn('⚠️ [생명구조] VAPID 키 설정 실패:', vapidError.message);
                }
            } else {
                console.warn('⚠️ [생명구조] VAPID 키가 설정되지 않음');
            }

            // 7단계: 메시지 핸들러 설정
            console.log('📨 [생명구조] 메시지 핸들러 설정 중...');
            this.setupMessageHandlers();
            
            // 8단계: 권한 요청 및 토큰 획득
            console.log('🎫 [생명구조] FCM 토큰 획득 프로세스 시작...');
            const token = await this.requestPermissionAndGetToken();
            
            this.isInitialized = true;
            
            if (token) {
                console.log('🎉 [생명구조] Firebase Messaging 초기화 및 토큰 획득 완료!');
            } else {
                console.log('⚠️ [생명구조] Firebase Messaging 초기화 완료 (토큰 획득 실패)');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [생명구조] Firebase Messaging 초기화 최종 실패:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * 🚨 생명구조 시스템: Firebase SDK 로딩 대기
     */
    async waitForFirebaseSDK() {
        const maxWaitTime = 10000; // 10초
        const checkInterval = 100; // 100ms
        let waitedTime = 0;
        
        console.log('⏳ [생명구조] Firebase SDK 로딩 대기...');
        
        return new Promise((resolve, reject) => {
            const checkSDK = () => {
                if (typeof firebase !== 'undefined' && firebase.messaging) {
                    console.log('✅ [생명구조] Firebase SDK 로드 완료');
                    resolve(true);
                    return;
                }
                
                waitedTime += checkInterval;
                if (waitedTime >= maxWaitTime) {
                    console.error('❌ [생명구조] Firebase SDK 로딩 타임아웃 (10초)');
                    reject(new Error('Firebase SDK 로딩 타임아웃'));
                    return;
                }
                
                setTimeout(checkSDK, checkInterval);
            };
            
            checkSDK();
        });
    }

    /**
     * 🚨 생명구조 시스템: Service Worker 등록 (강화된 경로 처리)
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('❌ Service Worker 미지원');
            return;
        }

        try {
            // 🚨 생명구조 시스템: 환경별 Service Worker 경로 자동 감지
            const swPaths = [
                '/firebase-messaging-sw.js',           // 로컬 루트
                '/lonely-care/firebase-messaging-sw.js', // 서브디렉토리
                './firebase-messaging-sw.js',          // 상대 경로
                `${window.location.origin}/firebase-messaging-sw.js` // 절대 경로
            ];
            
            let registration = null;
            let lastError = null;
            
            for (const swPath of swPaths) {
                try {
                    console.log(`🔄 [생명구조] Service Worker 등록 시도: ${swPath}`);
                    registration = await navigator.serviceWorker.register(swPath);
                    console.log(`✅ [생명구조] FCM Service Worker 등록 성공: ${registration.scope}`);
                    break;
                } catch (error) {
                    console.warn(`⚠️ [생명구조] Service Worker 경로 실패: ${swPath}`, error.message);
                    lastError = error;
                    continue;
                }
            }
            
            if (!registration) {
                throw new Error(`모든 Service Worker 경로 실패. 마지막 오류: ${lastError?.message}`);
            }
            
            // Messaging에 Service Worker 등록 정보 전달
            if (this.messaging && this.messaging.useServiceWorker) {
                this.messaging.useServiceWorker(registration);
                console.log('✅ [생명구조] Messaging Service Worker 연결 완료');
            }
            
            return registration;
            
        } catch (error) {
            console.error('❌ [생명구조] FCM Service Worker 등록 최종 실패:', error);
            
            // Service Worker 없이도 FCM 토큰 획득 시도
            console.log('🔄 [생명구조] Service Worker 없이 FCM 토큰 획득 시도...');
            return null;
        }
    }

    /**
     * 메시지 핸들러 설정 - 메시지 채널 안정화
     */
    setupMessageHandlers() {
        if (!this.messaging) return;

        // 포그라운드 메시지 수신 - Promise 반환으로 채널 안정화
        this.messaging.onMessage(async (payload) => {
            try {
                console.log('📨 포그라운드 메시지 수신:', payload);
                await this.handleForegroundMessage(payload);
                console.log('✅ 포그라운드 메시지 처리 완료');
            } catch (error) {
                console.error('❌ 포그라운드 메시지 처리 실패:', error);
                // 오류가 발생해도 채널을 닫지 않도록 처리
            }
        });

        // 토큰 갱신 처리 - Promise 반환으로 채널 안정화
        this.messaging.onTokenRefresh(async () => {
            try {
                console.log('🔄 FCM 토큰 갱신 시작');
                const token = await this.getToken();
                if (token) {
                    this.fcmToken = token;
                    await this.saveTokenToDatabase(token);
                    console.log('✅ FCM 토큰 갱신 완료');
                }
            } catch (error) {
                console.error('❌ FCM 토큰 갱신 실패:', error);
                // 오류가 발생해도 채널을 닫지 않도록 처리
            }
        });
    }

    /**
     * 🚨 생명구조 시스템: 권한 요청 및 토큰 획득 (강화된 재시도 로직)
     */
    async requestPermissionAndGetToken() {
        try {
            console.log('🔔 [생명구조] FCM 토큰 획득 프로세스 시작...');
            
            // 1단계: 브라우저 호환성 확인
            if (!('Notification' in window)) {
                console.warn('❌ [생명구조] 브라우저가 알림을 지원하지 않음');
                return null;
            }
            
            // 2단계: 현재 권한 상태 확인
            this.notificationPermission = Notification.permission;
            console.log(`🔍 [생명구조] 현재 알림 권한: ${this.notificationPermission}`);
            
            // 3단계: 권한 요청 (필요시)
            if (this.notificationPermission === 'default') {
                console.log('🔔 [생명구조] 알림 권한 요청 중...');
                
                // 사용자 상호작용이 있을 때만 권한 요청
                try {
                    const permission = await Notification.requestPermission();
                    this.notificationPermission = permission;
                    console.log(`📋 [생명구조] 알림 권한 결과: ${permission}`);
                } catch (permError) {
                    console.warn('⚠️ [생명구조] 권한 요청 실패:', permError.message);
                    // 권한 요청 실패해도 기존 권한으로 계속 진행
                }
            }

            // 4단계: 권한 상태에 따른 처리
            if (this.notificationPermission !== 'granted') {
                console.warn(`❌ [생명구조] 알림 권한 없음 (${this.notificationPermission}) - FCM 토큰 획득 불가`);
                
                // 로컬 환경에서는 경고만 하고 계속 진행
                if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log('🏠 [생명구조] 로컬 환경 감지 - 권한 없이도 토큰 획득 시도');
                } else {
                    return null;
                }
            }

            // 5단계: FCM 토큰 획득 (재시도 로직 포함)
            const maxRetries = 3;
            let token = null;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`🎫 [생명구조] FCM 토큰 획득 시도 ${attempt}/${maxRetries}...`);
                    token = await this.getToken();
                    
                    if (token) {
                        this.fcmToken = token;
                        console.log(`✅ [생명구조] FCM 토큰 획득 성공 (${attempt}번째 시도)`);
                        break;
                    } else {
                        console.warn(`⚠️ [생명구조] FCM 토큰 획득 실패 (${attempt}번째 시도) - 토큰이 null`);
                    }
                    
                } catch (tokenError) {
                    console.error(`❌ [생명구조] FCM 토큰 획득 오류 (${attempt}번째 시도):`, tokenError);
                    
                    if (attempt < maxRetries) {
                        console.log(`🔄 [생명구조] ${2000 * attempt}ms 후 재시도...`);
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                    }
                }
            }

            // 6단계: 토큰 저장 및 결과 반환
            if (token) {
                try {
                    await this.saveTokenToDatabase(token);
                    console.log('✅ [생명구조] FCM 토큰 획득 및 저장 완료');
                } catch (saveError) {
                    console.warn('⚠️ [생명구조] FCM 토큰 저장 실패:', saveError.message);
                    // 저장 실패해도 토큰은 반환
                }
                return token;
            } else {
                console.error('❌ [생명구조] 모든 시도 후에도 FCM 토큰 획득 실패');
                return null;
            }

        } catch (error) {
            console.error('❌ [생명구조] FCM 권한 요청 또는 토큰 획득 최종 실패:', error);
            return null;
        }
    }

    /**
     * 🚨 생명구조 시스템: FCM 토큰 획득 (강화된 디버깅 및 오류 처리)
     */
    async getToken() {
        try {
            if (!this.messaging) {
                console.warn('⚠️ [생명구조] Messaging 인스턴스가 초기화되지 않음');
                return null;
            }

            console.log('🔍 [생명구조] Firebase Messaging 상태 확인...');
            console.log('  - Firebase SDK 로드됨:', typeof firebase !== 'undefined');
            console.log('  - Messaging 지원됨:', firebase?.messaging?.isSupported?.() || false);
            console.log('  - VAPID 키 설정됨:', !!firebaseConfig.vapidKey);
            
            // VAPID 키 재설정 (토큰 획득 직전에)
            if (firebaseConfig.vapidKey) {
                try {
                    this.messaging.usePublicVapidKey(firebaseConfig.vapidKey);
                    console.log('🔑 [생명구조] VAPID 키 재설정 완료');
                } catch (vapidError) {
                    console.warn('⚠️ [생명구조] VAPID 키 설정 실패:', vapidError.message);
                }
            }

            console.log('🎫 [생명구조] FCM 토큰 획득 중...');
            const token = await this.messaging.getToken();
            
            if (token) {
                console.log('✅ [생명구조] FCM 토큰 획득 성공');
                console.log(`   📋 토큰 미리보기: ${token.substring(0, 30)}...`);
                console.log(`   📏 토큰 길이: ${token.length}자`);
                
                // 토큰 유효성 기본 검증
                if (token.length < 100) {
                    console.warn('⚠️ [생명구조] FCM 토큰이 너무 짧음 - 유효하지 않을 수 있음');
                }
                
                return token;
            } else {
                console.warn('⚠️ [생명구조] FCM 토큰이 null 또는 빈 값');
                
                // 추가 디버깅 정보
                console.log('🔍 [생명구조] FCM 토큰이 null인 이유 분석:');
                console.log('  - Service Worker 등록됨:', !!navigator.serviceWorker?.controller);
                console.log('  - 현재 URL:', window.location.href);
                console.log('  - User Agent:', navigator.userAgent.substring(0, 100) + '...');
                
                return null;
            }
            
        } catch (error) {
            console.error('❌ [생명구조] FCM 토큰 획득 실패:', error);
            
            // 상세한 오류 분석
            if (error.code) {
                console.error(`   📋 오류 코드: ${error.code}`);
            }
            if (error.message) {
                console.error(`   📋 오류 메시지: ${error.message}`);
            }
            
            // 일반적인 오류 해결 가이드
            if (error.message?.includes('messaging/unsupported-browser')) {
                console.error('   💡 해결방법: 지원되는 브라우저에서 실행하세요');
            } else if (error.message?.includes('messaging/permission-blocked')) {
                console.error('   💡 해결방법: 브라우저 설정에서 알림 권한을 허용하세요');
            } else if (error.message?.includes('messaging/token-unsubscribe-failed')) {
                console.error('   💡 해결방법: 브라우저 데이터를 초기화하고 다시 시도하세요');
            }
            
            return null;
        }
    }

    /**
     * 토큰을 Firebase Functions를 통해 저장
     */
    async saveTokenToDatabase(token) {
        try {
            const currentUser = storage?.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ 현재 사용자 정보 없음');
                return;
            }

            // Firebase Functions를 통한 토큰 등록/업데이트
            const response = await fetch(window.fcmEndpoints?.updateToken || 'https://us-central1-lonely-care-app.cloudfunctions.net/updateFCMToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.kakao_id || currentUser.id,
                    fcmToken: token,
                    platform: this.isWebView ? 'webview' : 'web',
                    userAgent: navigator.userAgent
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ FCM 토큰 서버 저장 완료:', result.message);
            } else {
                console.error('❌ FCM 토큰 저장 실패:', await response.text());
            }

        } catch (error) {
            console.error('❌ 토큰 저장 중 오류:', error);
            
            // Fallback: Firebase Firestore에 직접 저장
            try {
                const currentUser = storage?.getCurrentUser();
                if (currentUser && window.firebaseClient) {
                    await window.firebaseClient.db.collection('userFCMTokens').add({
                        userId: currentUser.kakao_id || currentUser.id,
                        fcmToken: token,
                        platform: this.isWebView ? 'webview' : 'web',
                        userAgent: navigator.userAgent,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isActive: true
                    });
                    console.log('✅ Fallback: Firestore 직접 저장 완료');
                }
            } catch (fallbackError) {
                console.error('❌ Fallback 저장도 실패:', fallbackError);
            }
        }
    }

    /**
     * 포그라운드 메시지 처리
     */
    async handleForegroundMessage(payload) {
        const { notification, data } = payload;
        
        console.log('📨 포그라운드 메시지 상세:', {
            title: notification?.title,
            body: notification?.body,
            data: data
        });

        // 커스텀 알림 표시 (브라우저 기본 알림 대신)
        await this.showCustomNotification({
            title: notification?.title || '알림',
            message: notification?.body || '새 메시지가 있습니다.',
            icon: notification?.icon || '/lonely-care/icon.png',
            data: data || {},
            type: data?.notificationType || 'general'
        });

        // 이벤트 전파
        this.emit('message', payload);
    }

    /**
     * 커스텀 알림 표시
     */
    async showCustomNotification(options) {
        try {
            // Advanced Notification Manager 사용 (있다면)
            if (window.AdvancedNotificationManager && window.notificationManager) {
                await window.notificationManager.show({
                    title: options.title,
                    message: options.message,
                    level: this.getNotificationLevel(options.type),
                    icon: options.icon,
                    data: options.data
                });
                return;
            }

            // 기본 알림 매니저 사용
            if (window.notificationsManager) {
                await window.notificationsManager.showBrowserNotification(
                    options.title,
                    options.message,
                    {
                        icon: options.icon,
                        data: options.data
                    }
                );
                return;
            }

            // Fallback: 브라우저 기본 알림
            if (this.notificationPermission === 'granted') {
                const notification = new Notification(options.title, {
                    body: options.message,
                    icon: options.icon,
                    data: options.data,
                    tag: `lonely-care-${Date.now()}`
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                setTimeout(() => notification.close(), 10000);
            }

        } catch (error) {
            console.error('❌ 커스텀 알림 표시 실패:', error);
        }
    }

    /**
     * 알림 타입에 따른 레벨 결정
     */
    getNotificationLevel(type) {
        const typeMapping = {
            'friend_warning': 'warning',
            'friend_danger': 'danger', 
            'friend_emergency': 'emergency',
            'system': 'normal',
            'general': 'normal'
        };
        
        return typeMapping[type] || 'normal';
    }

    /**
     * Firebase Functions를 통한 푸시 알림 요청
     */
    async sendNotificationToUser(userId, notificationData) {
        try {
            // Firebase Functions를 통한 알림 전송
            const response = await fetch(window.fcmEndpoints?.sendNotification || 'https://us-central1-lonely-care-app.cloudfunctions.net/sendNotification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    title: notificationData.title,
                    body: notificationData.message || notificationData.body,
                    type: notificationData.type || 'general',
                    alertLevel: notificationData.alertLevel || 'normal',
                    data: {
                        friendId: notificationData.friendId || '',
                        clickAction: notificationData.clickAction || window.location.origin,
                        ...notificationData.customData
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ FCM 알림 전송 성공:', result);
                return result.successCount > 0;
            } else {
                const error = await response.text();
                console.error('❌ FCM 알림 전송 실패:', error);
                
                // Fallback: 로컬 알림 표시
                await this.showCustomNotification({
                    title: notificationData.title,
                    message: notificationData.message || notificationData.body,
                    icon: notificationData.icon,
                    data: notificationData.customData || {},
                    type: notificationData.type
                });
                return false;
            }

        } catch (error) {
            console.error('❌ FCM 알림 전송 실패:', error);
            
            // Fallback: 로컬 알림 표시
            await this.showCustomNotification({
                title: notificationData.title,
                message: notificationData.message || notificationData.body,
                icon: notificationData.icon,
                data: notificationData.customData || {},
                type: notificationData.type
            });
            return false;
        }
    }

    /**
     * 친구 상태 알림 전송
     */
    async sendFriendStatusAlert(friendData, alertLevel) {
        const currentUser = auth?.getCurrentUser();
        if (!currentUser) return false;

        const notificationData = {
            title: this.getFriendAlertTitle(alertLevel),
            message: `${friendData.friend_name || '친구'}님이 ${friendData.hours_since_heartbeat}시간째 무응답 상태입니다.`,
            type: `friend_${alertLevel}`,
            alertLevel: alertLevel,
            friendId: friendData.friend_id,
            icon: '/lonely-care/icon.png'
        };

        return await this.sendNotificationToUser(currentUser.id, notificationData);
    }

    /**
     * 친구 알림 제목 생성
     */
    getFriendAlertTitle(alertLevel) {
        const titles = {
            warning: '⚠️ 친구 상태 주의',
            danger: '🚨 친구 상태 경고', 
            emergency: '🆘 친구 상태 긴급'
        };
        
        return titles[alertLevel] || '📢 친구 알림';
    }

    /**
     * 시스템 알림 전송 (전체 사용자 대상)
     */
    async sendSystemNotification(title, message, testMode = false) {
        try {
            // Firebase Functions를 통한 전체 알림 전송
            const response = await fetch(window.fcmEndpoints?.sendBroadcastNotification || 'https://us-central1-lonely-care-app.cloudfunctions.net/sendBroadcastNotification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: `🔔 ${title}`,
                    body: message,
                    type: 'system',
                    alertLevel: 'normal',
                    testMode: testMode
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`📤 시스템 알림 전송 완료: 성공 ${result.successCount}명, 실패 ${result.failureCount}명`);
                return result.successCount > 0;
            } else {
                const error = await response.text();
                console.error('❌ 시스템 알림 전송 실패:', error);
                
                // Fallback: 로컬 알림 표시
                await this.showCustomNotification({
                    title: `🔔 ${title}`,
                    message: message,
                    type: 'system'
                });
                return false;
            }

        } catch (error) {
            console.error('❌ 시스템 알림 전송 실패:', error);
            
            // Fallback: 로컬 알림 표시
            await this.showCustomNotification({
                title: `🔔 ${title}`,
                message: message,
                type: 'system'
            });
            return false;
        }
    }

    /**
     * 이벤트 시스템
     */
    on(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.messageHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ FCM 이벤트 핸들러 오류 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 토큰 삭제 (로그아웃시)
     */
    async deleteToken() {
        try {
            if (this.messaging && this.fcmToken) {
                await this.messaging.deleteToken(this.fcmToken);
                console.log('🗑️ FCM 토큰 삭제 완료');
            }

            // Firebase Firestore에서 토큰 삭제
            const currentUser = storage?.getCurrentUser();
            if (currentUser && window.firebaseClient) {
                const tokensRef = window.firebaseClient.db.collection('userFCMTokens');
                const query = tokensRef.where('userId', '==', currentUser.kakao_id || currentUser.id);
                const snapshot = await query.get();
                
                const deletePromises = [];
                snapshot.forEach(doc => {
                    deletePromises.push(doc.ref.delete());
                });
                
                await Promise.all(deletePromises);
                console.log('🗑️ Firestore에서 FCM 토큰 삭제 완료');
            }

            this.fcmToken = null;

        } catch (error) {
            console.error('❌ FCM 토큰 삭제 실패:', error);
        }
    }

    /**
     * 상태 정보 반환
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasToken: !!this.fcmToken,
            permission: this.notificationPermission,
            platform: this.isWebView ? 'webview' : 'web',
            messagingSupported: firebase?.messaging?.isSupported() || false
        };
    }
}

// 전역 인스턴스 생성
let firebaseMessagingManager;

// 초기화 함수
async function initFirebaseMessaging() {
    if (!firebaseMessagingManager) {
        firebaseMessagingManager = new FirebaseMessagingManager();
        window.firebaseMessagingManager = firebaseMessagingManager;
        
        // 기존 알림 시스템과 통합
        if (window.notificationsManager) {
            // 친구 상태 알림을 FCM으로 전환
            window.notificationsManager.sendFriendInactiveNotification = async function(friendData) {
                const success = await firebaseMessagingManager.sendFriendStatusAlert(
                    friendData, 
                    friendData.alert_level
                );
                
                if (success) {
                    console.log('✅ FCM을 통한 친구 알림 전송 완료');
                    return true;
                } else {
                    // Fallback: 기존 방식
                    console.log('⚠️ FCM 실패 - 기존 알림 방식 사용');
                    return await this.originalSendFriendInactiveNotification(friendData);
                }
            };
        }
        
        console.log('🔥 Firebase Messaging Manager 글로벌 초기화 완료');
    }
    
    return firebaseMessagingManager;
}

// 🚨 생명구조 시스템: FCM 토큰 테스트 함수
window.testFCMToken = function() {
    console.log('🧪 [생명구조] FCM 토큰 테스트 시작...');
    
    if (window.firebaseMessagingManager) {
        const manager = window.firebaseMessagingManager;
        
        console.log('📋 [생명구조] FCM 시스템 상태:');
        console.log('  - 초기화됨:', manager.isInitialized);
        console.log('  - 현재 토큰:', manager.fcmToken ? manager.fcmToken.substring(0, 30) + '...' : 'null');
        console.log('  - 알림 권한:', manager.notificationPermission);
        console.log('  - WebView 환경:', manager.isWebView);
        
        if (manager.fcmToken) {
            console.log('✅ [생명구조] FCM 토큰이 정상적으로 획득됨');
            return manager.fcmToken;
        } else {
            console.log('❌ [생명구조] FCM 토큰이 없음 - 재획득 시도...');
            manager.requestPermissionAndGetToken().then(token => {
                if (token) {
                    console.log('✅ [생명구조] FCM 토큰 재획득 성공');
                } else {
                    console.log('❌ [생명구조] FCM 토큰 재획득 실패');
                }
            });
        }
    } else {
        console.log('❌ [생명구조] Firebase Messaging Manager가 초기화되지 않음');
        console.log('🔄 [생명구조] 수동 초기화 시도...');
        initFirebaseMessaging();
    }
};

// 🚨 생명구조 시스템: 강화된 DOM 로드 후 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 [생명구조] DOM 로드 완료 - FCM 초기화 예약');
    
    // 다른 시스템들이 로드될 시간을 충분히 주고 초기화
    setTimeout(() => {
        console.log('🚀 [생명구조] Firebase Messaging 자동 초기화 시작');
        initFirebaseMessaging();
    }, 2000); // 2초 지연으로 증가
});

// 🚨 생명구조 시스템: 수동 FCM 초기화 함수 (디버깅용)
window.manualInitFCM = function() {
    console.log('🔧 [생명구조] 수동 FCM 초기화 시작...');
    return initFirebaseMessaging();
};

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseMessagingManager, initFirebaseMessaging };
} else {
    window.FirebaseMessagingManager = FirebaseMessagingManager;
    window.initFirebaseMessaging = initFirebaseMessaging;
}

console.log('🔥 [생명구조] Firebase Messaging 모듈 로드 완료 - 수동 초기화: manualInitFCM(), 토큰 테스트: testFCMToken()');