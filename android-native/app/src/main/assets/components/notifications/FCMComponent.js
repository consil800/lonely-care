/**
 * FCMComponent v1.0
 * Firebase Cloud Messaging을 담당하는 독립 컴포넌트
 * 
 * 기존 fcm-manager.js와 firebase-messaging.js를 통합하여 컴포넌트화
 * 토큰 관리, 푸시 알림, 백그라운드 메시지, 서비스 워커 등의 고급 기능 제공
 */

class FCMComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoInit: true,
            requestPermission: true,
            enableServiceWorker: true,
            enableTokenRefresh: true,
            enableBackgroundSync: true,
            tokenRefreshInterval: 24 * 60 * 60 * 1000, // 24시간
            debug: options.debug || false,
            ...options
        };

        // Firebase 설정 (중앙화된 설정 사용)
        this.firebaseConfig = window.firebaseConfig || {
            // 백업 설정 (firebase-config.js 로드 실패 시)
            apiKey: "",
            authDomain: "lonely-care-app.firebaseapp.com", 
            projectId: "lonely-care-app",
            storageBucket: "lonely-care-app.appspot.com",
            messagingSenderId: "965854578277",
            appId: "1:965854578277:web:lonely-care-web",
            vapidKey: "BNZGiFig0fz7i5Z5PB4aTegY64xEHcIJxcyTr0IQWqrfXjfd4XVPmz0iNg56xKZWdnLTOTnTHJQhAVXId3nK6FU"
        };
        
        // 중앙화된 설정 로드 확인
        if (!window.firebaseConfig) {
            console.warn('⚠️ 중앙화된 Firebase 설정이 로드되지 않았습니다. firebase-config.js 확인 필요');
        } else {
            console.log('✅ 중앙화된 Firebase 설정 사용 중');
        }

        // 상태 관리
        this.messaging = null;
        this.fcmToken = null;
        this.isInitialized = false;
        this.hasPermission = false;
        this.isWebViewMode = false;
        this.serviceWorkerRegistration = null;
        this.messageHandlers = new Map();
        this.pendingMessages = [];
        
        // 플랫폼 감지
        this.platform = this.detectPlatform();
        
        // 타이머들
        this.tokenRefreshTimer = null;
        this.connectionCheckTimer = null;
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        this.notificationManager = null;
        
        // 기존 FCM 매니저 참조 (호환성)
        this.legacyManager = null;
        
        console.log('🔥 FCMComponent 초기화', {
            platform: this.platform,
            options: this.options
        });
        
        // 자동 초기화
        if (this.options.autoInit) {
            this.init();
        }
    }

    /**
     * 플랫폼 감지
     */
    detectPlatform() {
        const userAgent = navigator.userAgent || '';
        
        if (window.AndroidBridge) {
            return 'android-native';
        } else if (userAgent.includes('wv') || window.webkit?.messageHandlers) {
            return 'webview';
        } else {
            return 'web';
        }
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 FCM 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            this.notificationManager = window.notificationManagerComponent;
            
            if (!this.auth) {
                throw new Error('필수 의존성 (Auth)이 준비되지 않았습니다.');
            }
            
            // 기존 FCM 매니저 참조 (호환성)
            if (window.fcmTokenManager || window.firebaseMessagingManager) {
                this.legacyManager = window.fcmTokenManager || window.firebaseMessagingManager;
            }

            // Firebase 지원 확인
            if (!this.isFirebaseSupported()) {
                console.warn('❌ Firebase/FCM이 지원되지 않는 환경');
                this.isWebViewMode = true;
                return false;
            }
            
            // Firebase 초기화
            await this.initializeFirebase();
            
            // 서비스 워커 등록
            if (this.options.enableServiceWorker) {
                await this.registerServiceWorker();
            }
            
            // 권한 요청 및 토큰 획득
            if (this.options.requestPermission) {
                await this.requestPermissionAndGetToken();
            }
            
            // 메시지 핸들러 설정
            this.setupMessageHandlers();
            
            // 토큰 새로고침 설정
            if (this.options.enableTokenRefresh) {
                this.startTokenRefresh();
            }
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('fcm:ready', {
                detail: { 
                    component: this, 
                    hasToken: !!this.fcmToken,
                    platform: this.platform
                }
            }));

            console.log('✅ FCM 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ FCM 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('fcm:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * Firebase 지원 확인
     */
    isFirebaseSupported() {
        try {
            return window.firebase && 
                   firebase.messaging && 
                   firebase.messaging.isSupported &&
                   firebase.messaging.isSupported();
        } catch (error) {
            return false;
        }
    }

    /**
     * Firebase 초기화
     */
    async initializeFirebase() {
        try {
            // Firebase 앱 초기화 (중복 방지)
            let app;
            try {
                app = firebase.app();
                console.log('✅ 기존 Firebase 앱 사용');
            } catch (error) {
                app = firebase.initializeApp(this.firebaseConfig);
                console.log('🆕 새 Firebase 앱 초기화');
            }

            // Messaging 인스턴스 생성
            this.messaging = firebase.messaging();
            
            // VAPID 키 설정
            if (this.firebaseConfig.vapidKey) {
                // Firebase v9+ 방식으로 업데이트
                if (this.messaging.usePublicVapidKey) {
                    this.messaging.usePublicVapidKey(this.firebaseConfig.vapidKey);
                }
                console.log('🔑 VAPID 키 설정 완료');
            }

            console.log('🔥 Firebase Messaging 인스턴스 생성 완료');

        } catch (error) {
            console.error('❌ Firebase 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 서비스 워커 등록
     */
    async registerServiceWorker() {
        try {
            if (!('serviceWorker' in navigator)) {
                console.warn('❌ Service Worker 미지원');
                return null;
            }

            // 서비스 워커 파일들 확인
            const swPaths = [
                '/lonely-care/firebase-messaging-sw.js',
                '/lonely-care/sw-notifications.js',
                '/firebase-messaging-sw.js'
            ];

            let registration = null;
            for (const swPath of swPaths) {
                try {
                    registration = await navigator.serviceWorker.register(swPath);
                    console.log('✅ FCM Service Worker 등록:', swPath);
                    break;
                } catch (error) {
                    console.warn(`⚠️ Service Worker 등록 실패: ${swPath}`, error);
                }
            }

            if (registration) {
                this.serviceWorkerRegistration = registration;
                
                // Firebase Messaging과 연결
                if (this.messaging && this.messaging.useServiceWorker) {
                    this.messaging.useServiceWorker(registration);
                }

                this.dispatchEvent(new CustomEvent('fcm:service-worker-registered', {
                    detail: { registration }
                }));

                return registration;
            } else {
                console.warn('⚠️ 모든 Service Worker 등록 실패');
                return null;
            }

        } catch (error) {
            console.error('❌ Service Worker 등록 중 오류:', error);
            return null;
        }
    }

    /**
     * 권한 요청 및 토큰 획득
     */
    async requestPermissionAndGetToken() {
        try {
            console.log('🔔 FCM 권한 요청 및 토큰 획득 시작');

            // 알림 권한 확인
            if ('Notification' in window) {
                let permission = Notification.permission;
                
                if (permission === 'default') {
                    console.log('🔔 알림 권한 요청 중...');
                    permission = await Notification.requestPermission();
                }

                this.hasPermission = permission === 'granted';
                
                if (!this.hasPermission) {
                    console.warn('❌ 알림 권한 거부됨');
                    this.dispatchEvent(new CustomEvent('fcm:permission-denied'));
                    return null;
                }

                console.log('✅ 알림 권한 획득');
                this.dispatchEvent(new CustomEvent('fcm:permission-granted'));
            }

            // FCM 토큰 획득
            const token = await this.getToken();
            if (token) {
                this.fcmToken = token;
                await this.saveTokenToDatabase(token);
                
                this.dispatchEvent(new CustomEvent('fcm:token-received', {
                    detail: { token }
                }));

                console.log('✅ FCM 토큰 획득 및 저장 완료');
                return token;
            }

            return null;

        } catch (error) {
            console.error('❌ 권한 요청/토큰 획득 실패:', error);
            this.dispatchEvent(new CustomEvent('fcm:token-error', {
                detail: { error }
            }));
            return null;
        }
    }

    /**
     * FCM 토큰 획득
     */
    async getToken() {
        try {
            if (!this.messaging) {
                console.warn('⚠️ Messaging 인스턴스가 초기화되지 않음');
                return null;
            }

            let token;
            if (this.firebaseConfig.vapidKey) {
                token = await this.messaging.getToken({
                    vapidKey: this.firebaseConfig.vapidKey
                });
            } else {
                token = await this.messaging.getToken();
            }

            if (token) {
                console.log('🎫 FCM 토큰 획득:', token.substring(0, 20) + '...');
                return token;
            } else {
                console.warn('⚠️ FCM 토큰을 가져올 수 없음');
                return null;
            }

        } catch (error) {
            console.error('❌ FCM 토큰 획득 실패:', error);
            return null;
        }
    }

    /**
     * 토큰을 데이터베이스에 저장
     */
    async saveTokenToDatabase(token) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                console.warn('⚠️ 현재 사용자 정보 없음');
                return;
            }

            // users 테이블에 fcm_token 업데이트
            if (this.supabase) {
                await this.supabase.update('users', 
                    { 
                        fcm_token: token,
                        updated_at: new Date().toISOString()
                    }, 
                    { id: currentUser.id }
                );

                // FCM 토큰 히스토리 저장
                try {
                    await this.supabase.upsert('user_fcm_tokens', {
                        user_id: currentUser.id,
                        fcm_token: token,
                        platform: this.platform,
                        user_agent: navigator.userAgent,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                } catch (historyError) {
                    console.warn('⚠️ FCM 토큰 히스토리 저장 실패 (무시):', historyError);
                }
            } 
            // Fallback to legacy storage
            else if (this.storage && this.storage.supabase && this.storage.supabase.client) {
                const { error } = await this.storage.supabase.client
                    .from('users')
                    .update({
                        fcm_token: token,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentUser.id);

                if (error) {
                    console.error('❌ FCM 토큰 저장 실패:', error);
                } else {
                    console.log('✅ FCM 토큰 저장 완료');
                }
            }

            // 로컬 저장소에도 백업
            localStorage.setItem(`fcm-token-${currentUser.kakao_id}`, token);

            this.dispatchEvent(new CustomEvent('fcm:token-saved', {
                detail: { token, userId: currentUser.id }
            }));

        } catch (error) {
            console.error('❌ FCM 토큰 저장 실패:', error);
        }
    }

    /**
     * 메시지 핸들러 설정
     */
    setupMessageHandlers() {
        if (!this.messaging) return;

        try {
            // 포그라운드 메시지 수신
            this.messaging.onMessage((payload) => {
                console.log('📨 포그라운드 FCM 메시지 수신:', payload);
                this.handleForegroundMessage(payload);
            });

            // 토큰 갱신 처리
            this.messaging.onTokenRefresh(async () => {
                console.log('🔄 FCM 토큰 갱신됨');
                try {
                    const newToken = await this.getToken();
                    if (newToken) {
                        this.fcmToken = newToken;
                        await this.saveTokenToDatabase(newToken);
                        
                        this.dispatchEvent(new CustomEvent('fcm:token-refreshed', {
                            detail: { token: newToken }
                        }));
                    }
                } catch (error) {
                    console.error('❌ 토큰 갱신 처리 실패:', error);
                }
            });

            console.log('✅ FCM 메시지 핸들러 설정 완료');

        } catch (error) {
            console.error('❌ FCM 메시지 핸들러 설정 실패:', error);
        }
    }

    /**
     * 포그라운드 메시지 처리
     */
    handleForegroundMessage(payload) {
        try {
            const { notification, data } = payload;
            
            console.log('📨 포그라운드 메시지 상세:', {
                title: notification?.title,
                body: notification?.body,
                data: data
            });

            // 메시지 데이터 구성
            const messageData = {
                title: notification?.title || '알림',
                message: notification?.body || '새 메시지가 있습니다.',
                type: data?.notificationType || data?.type || 'general',
                level: this.getNotificationLevel(data?.alertLevel || data?.notificationType),
                icon: notification?.icon || '/lonely-care/icon.png',
                data: data || {},
                source: 'fcm-foreground'
            };

            // NotificationManagerComponent 사용 (우선)
            if (this.notificationManager) {
                this.notificationManager.showSystemNotification(
                    messageData.title,
                    messageData.message,
                    messageData.level,
                    {
                        icon: messageData.icon,
                        data: messageData.data,
                        source: 'fcm'
                    }
                );
            }
            // 기존 알림 매니저 사용 (fallback)
            else if (window.notificationsManager) {
                window.notificationsManager.showBrowserNotification(
                    messageData.title,
                    messageData.message,
                    {
                        icon: messageData.icon,
                        alertLevel: messageData.level,
                        data: messageData.data
                    }
                );
            }
            // 직접 브라우저 알림 (최종 fallback)
            else if (this.hasPermission) {
                const notification = new Notification(messageData.title, {
                    body: messageData.message,
                    icon: messageData.icon,
                    tag: `fcm-${Date.now()}`,
                    data: messageData.data
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                setTimeout(() => notification.close(), 10000);
            }

            // 커스텀 이벤트 발생
            this.dispatchEvent(new CustomEvent('fcm:message-received', {
                detail: { payload, messageData }
            }));

            // 내부 이벤트 핸들러 호출
            this.emit('message', payload);

        } catch (error) {
            console.error('❌ 포그라운드 메시지 처리 실패:', error);
        }
    }

    /**
     * 알림 레벨 매핑
     */
    getNotificationLevel(type) {
        const typeMapping = {
            'friend_warning': 'warning',
            'friend_danger': 'danger',
            'friend_emergency': 'emergency',
            'system': 'normal',
            'general': 'normal',
            'warning': 'warning',
            'danger': 'danger',
            'emergency': 'emergency'
        };
        
        return typeMapping[type] || 'normal';
    }

    /**
     * 서버로 푸시 알림 전송 요청
     */
    async sendPushNotification(targetUserId, notificationData) {
        try {
            if (!this.supabase) {
                console.error('❌ Supabase 컴포넌트 없음');
                return false;
            }

            // 대상 사용자의 FCM 토큰 조회
            const tokenResult = await this.supabase.query('users', {
                select: 'fcm_token',
                eq: { id: targetUserId },
                single: true
            });

            if (!tokenResult.data || !tokenResult.data.fcm_token) {
                console.warn('⚠️ 대상 사용자 FCM 토큰 없음:', targetUserId);
                return false;
            }

            // FCM 메시지 페이로드 구성
            const fcmPayload = {
                to: tokenResult.data.fcm_token,
                notification: {
                    title: notificationData.title,
                    body: notificationData.message,
                    icon: notificationData.icon || '/lonely-care/icon.png',
                    click_action: notificationData.clickAction || window.location.origin + '/lonely-care/'
                },
                data: {
                    notificationType: notificationData.type || 'general',
                    alertLevel: notificationData.level || 'normal',
                    friendId: notificationData.friendId || '',
                    timestamp: new Date().toISOString(),
                    source: 'fcm-server',
                    ...notificationData.customData
                },
                webpush: {
                    fcm_options: {
                        link: notificationData.clickAction || window.location.origin + '/lonely-care/'
                    }
                }
            };

            console.log('🚀 FCM 푸시 알림 전송 준비:', {
                target: targetUserId,
                title: fcmPayload.notification.title,
                type: fcmPayload.data.notificationType
            });

            // 실제 FCM API 호출은 백엔드에서 처리
            // 여기서는 데이터베이스에 알림 요청 저장
            if (this.supabase) {
                await this.supabase.insert('push_notification_queue', {
                    target_user_id: targetUserId,
                    sender_user_id: this.auth.getCurrentUser()?.id,
                    title: notificationData.title,
                    message: notificationData.message,
                    notification_type: notificationData.type || 'general',
                    fcm_payload: fcmPayload,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            }

            this.dispatchEvent(new CustomEvent('fcm:push-queued', {
                detail: { targetUserId, notificationData, fcmPayload }
            }));

            console.log('✅ FCM 푸시 알림 대기열에 추가');
            return true;

        } catch (error) {
            console.error('❌ FCM 푸시 알림 전송 실패:', error);
            return false;
        }
    }

    /**
     * 친구 상태 알림 전송
     */
    async sendFriendStatusAlert(friendData, targetUserId = null) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) return false;

            const { friend_name, alert_level, hours_since_heartbeat, friend_id } = friendData;
            const userId = targetUserId || currentUser.id;

            const notificationData = {
                title: this.getFriendAlertTitle(alert_level),
                message: `${friend_name}님이 ${hours_since_heartbeat}시간째 무응답 상태입니다.`,
                type: `friend_${alert_level}`,
                level: alert_level,
                friendId: friend_id,
                icon: '/lonely-care/icon.png',
                clickAction: `${window.location.origin}/lonely-care/#friends`,
                customData: {
                    friendName: friend_name,
                    hoursInactive: hours_since_heartbeat,
                    friendId: friend_id
                }
            };

            return await this.sendPushNotification(userId, notificationData);

        } catch (error) {
            console.error('❌ 친구 상태 알림 전송 실패:', error);
            return false;
        }
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
     * 시스템 알림 전송
     */
    async sendSystemNotification(title, message, targetUserId = null) {
        const notificationData = {
            title: `🔔 ${title}`,
            message: message,
            type: 'system',
            level: 'normal',
            icon: '/lonely-care/icon.png'
        };

        if (targetUserId) {
            return await this.sendPushNotification(targetUserId, notificationData);
        }

        // 모든 활성 사용자에게 전송 (관리자 기능)
        try {
            const usersResult = await this.supabase.query('users', {
                select: 'id, fcm_token',
                neq: { fcm_token: null }
            });

            if (!usersResult.data) {
                console.error('❌ 사용자 목록 조회 실패');
                return false;
            }

            let successCount = 0;
            for (const user of usersResult.data) {
                const success = await this.sendPushNotification(user.id, notificationData);
                if (success) successCount++;
            }

            console.log(`📤 시스템 알림 전송 완료: ${successCount}/${usersResult.data.length}명`);
            return successCount > 0;

        } catch (error) {
            console.error('❌ 시스템 알림 전송 실패:', error);
            return false;
        }
    }

    /**
     * 토큰 새로고침 주기적 실행
     */
    startTokenRefresh() {
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
        }

        this.tokenRefreshTimer = setInterval(async () => {
            try {
                console.log('🔄 정기 FCM 토큰 확인 중...');
                const newToken = await this.getToken();
                
                if (newToken && newToken !== this.fcmToken) {
                    console.log('🔄 FCM 토큰 갱신 감지');
                    this.fcmToken = newToken;
                    await this.saveTokenToDatabase(newToken);
                    
                    this.dispatchEvent(new CustomEvent('fcm:token-refreshed', {
                        detail: { token: newToken }
                    }));
                }
            } catch (error) {
                console.warn('⚠️ 정기 토큰 확인 실패:', error);
            }
        }, this.options.tokenRefreshInterval);
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

            const currentUser = this.auth.getCurrentUser();
            if (currentUser) {
                // 데이터베이스에서 토큰 제거
                if (this.supabase) {
                    await this.supabase.update('users', 
                        { fcm_token: null }, 
                        { id: currentUser.id }
                    );
                    
                    await this.supabase.update('user_fcm_tokens', 
                        { is_active: false }, 
                        { user_id: currentUser.id }
                    );
                }

                // 로컬 저장소에서 제거
                localStorage.removeItem(`fcm-token-${currentUser.kakao_id}`);
            }

            this.fcmToken = null;
            
            this.dispatchEvent(new CustomEvent('fcm:token-deleted'));

        } catch (error) {
            console.error('❌ FCM 토큰 삭제 실패:', error);
        }
    }

    /**
     * 내부 이벤트 시스템
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
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasToken: !!this.fcmToken,
            token: this.fcmToken,
            hasPermission: this.hasPermission,
            platform: this.platform,
            isWebViewMode: this.isWebViewMode,
            hasServiceWorker: !!this.serviceWorkerRegistration,
            firebaseSupported: this.isFirebaseSupported(),
            messagingSupported: firebase?.messaging?.isSupported() || false
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // fcm-manager.js 호환
    async requestPermissionAndGetTokenLegacy() {
        return await this.requestPermissionAndGetToken();
    }

    async sendTestTokenLegacy() {
        return this.fcmToken;
    }

    // firebase-messaging.js 호환
    async sendNotificationToUserLegacy(userId, notificationData) {
        return await this.sendPushNotification(userId, notificationData);
    }

    async sendFriendStatusAlertLegacy(friendData, alertLevel) {
        return await this.sendFriendStatusAlert({
            ...friendData,
            alert_level: alertLevel
        });
    }

    // 전역 이벤트 리스너 지원
    onFCMEvent(event, callback) {
        this.addEventListener(event.replace('fcm:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
        }
        
        if (this.connectionCheckTimer) {
            clearInterval(this.connectionCheckTimer);
        }
        
        this.messageHandlers.clear();
        this.pendingMessages = [];
        this.isInitialized = false;
        this.fcmToken = null;
        
        console.log('🗑️ FCMComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.FCMComponent = FCMComponent;
    
    // 즉시 인스턴스 생성 (기존 코드 호환성)
    if (!window.fcmComponent) {
        window.fcmComponent = new FCMComponent();
        
        // 기존 변수명도 지원
        window.fcmTokenManager = window.fcmComponent;
        window.firebaseMessagingManager = window.fcmComponent;
        
        console.log('🌐 FCMComponent 전역 등록 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FCMComponent;
}