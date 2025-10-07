/**
 * FCMIntegration v1.0
 * FCMComponent와 기존 FCM 시스템들을 연결하는 통합 계층
 * 
 * 100% 후방 호환성을 보장하며 기존 코드 수정 없이 컴포넌트 기능 추가
 */

class FCMIntegration {
    constructor() {
        this.component = null;
        this.legacyManagers = {};
        this.isIntegrated = false;
        
        console.log('🔗 FCM 통합 계층 초기화');
        
        this.init();
    }

    async init() {
        try {
            // 컴포넌트 대기
            await this.waitForComponent();
            
            // 기존 매니저들 참조
            this.legacyManagers = {
                fcmTokenManager: window.fcmTokenManager,
                firebaseMessagingManager: window.firebaseMessagingManager
            };
            
            // 통합 설정
            this.setupIntegration();
            
            // 이벤트 연결
            this.connectEvents();
            
            this.isIntegrated = true;
            console.log('✅ FCM 통합 완료');
            
        } catch (error) {
            console.error('❌ FCM 통합 실패:', error);
        }
    }

    async waitForComponent() {
        return new Promise((resolve) => {
            const checkComponent = () => {
                if (window.fcmComponent) {
                    this.component = window.fcmComponent;
                    resolve();
                } else {
                    setTimeout(checkComponent, 100);
                }
            };
            checkComponent();
        });
    }

    setupIntegration() {
        if (!this.component) return;

        const component = this.component;

        // 기존 FCMTokenManager 래핑
        if (window.fcmTokenManager && typeof window.fcmTokenManager === 'object') {
            const legacy = window.fcmTokenManager;
            
            // 핵심 메서드들 래핑
            const originalRequestToken = legacy.requestPermissionAndGetToken;
            if (originalRequestToken) {
                legacy.requestPermissionAndGetToken = async function() {
                    console.log('🔄 기존 requestPermissionAndGetToken 호출 -> 컴포넌트로 전달');
                    try {
                        const result = await component.requestPermissionAndGetToken();
                        if (result) return result;
                        
                        return await originalRequestToken.call(this);
                    } catch (error) {
                        console.warn('컴포넌트 토큰 요청 실패, 기존 방식 사용:', error);
                        return await originalRequestToken.call(this);
                    }
                }.bind(legacy);
            }

            const originalSaveToken = legacy.saveFCMToken;
            if (originalSaveToken) {
                legacy.saveFCMToken = async function(token) {
                    try {
                        await component.saveTokenToDatabase(token);
                        return;
                    } catch (error) {
                        console.warn('컴포넌트 토큰 저장 실패, 기존 방식 사용:', error);
                        return await originalSaveToken.call(this, token);
                    }
                }.bind(legacy);
            }

            const originalSendTest = legacy.sendTestToken;
            if (originalSendTest) {
                legacy.sendTestToken = async function() {
                    try {
                        const status = component.getStatus();
                        return status.token || await component.requestPermissionAndGetToken();
                    } catch (error) {
                        return await originalSendTest.call(this);
                    }
                }.bind(legacy);
            }
        }

        // 기존 FirebaseMessagingManager 래핑
        if (window.firebaseMessagingManager && typeof window.firebaseMessagingManager === 'object') {
            const legacy = window.firebaseMessagingManager;
            
            // 핵심 메서드들 래핑
            const originalSendToUser = legacy.sendNotificationToUser;
            if (originalSendToUser) {
                legacy.sendNotificationToUser = async function(userId, notificationData) {
                    console.log('🔄 기존 sendNotificationToUser 호출 -> 컴포넌트로 전달');
                    try {
                        const result = await component.sendPushNotification(userId, notificationData);
                        if (result) return result;
                        
                        return await originalSendToUser.call(this, userId, notificationData);
                    } catch (error) {
                        console.warn('컴포넌트 알림 전송 실패, 기존 방식 사용:', error);
                        return await originalSendToUser.call(this, userId, notificationData);
                    }
                }.bind(legacy);
            }

            const originalSendFriendAlert = legacy.sendFriendStatusAlert;
            if (originalSendFriendAlert) {
                legacy.sendFriendStatusAlert = async function(friendData, alertLevel) {
                    try {
                        const result = await component.sendFriendStatusAlert({
                            ...friendData,
                            alert_level: alertLevel
                        });
                        if (result) return result;
                        
                        return await originalSendFriendAlert.call(this, friendData, alertLevel);
                    } catch (error) {
                        return await originalSendFriendAlert.call(this, friendData, alertLevel);
                    }
                }.bind(legacy);
            }

            const originalSendSystem = legacy.sendSystemNotification;
            if (originalSendSystem) {
                legacy.sendSystemNotification = async function(title, message, targetUserId) {
                    try {
                        const result = await component.sendSystemNotification(title, message, targetUserId);
                        if (result) return result;
                        
                        return await originalSendSystem.call(this, title, message, targetUserId);
                    } catch (error) {
                        return await originalSendSystem.call(this, title, message, targetUserId);
                    }
                }.bind(legacy);
            }

            // 상태 메서드 래핑
            const originalGetStatus = legacy.getStatus;
            if (originalGetStatus) {
                legacy.getStatus = function() {
                    try {
                        const componentStatus = component.getStatus();
                        if (componentStatus && componentStatus.isInitialized) {
                            return {
                                ...originalGetStatus.call(this),
                                ...componentStatus,
                                enhanced: true
                            };
                        }
                        
                        return originalGetStatus.call(this);
                    } catch (error) {
                        return originalGetStatus.call(this);
                    }
                }.bind(legacy);
            }
        }

        // 전역 함수들 래핑
        if (window.testFCMToken) {
            const originalTestFCM = window.testFCMToken;
            window.testFCMToken = async () => {
                try {
                    const status = component.getStatus();
                    if (status.hasToken) {
                        console.log('🧪 컴포넌트 FCM 토큰:', status.token?.substring(0, 20) + '...');
                        return status.token;
                    }
                    
                    const newToken = await component.requestPermissionAndGetToken();
                    if (newToken) return newToken;
                    
                    return originalTestFCM();
                } catch (error) {
                    return originalTestFCM();
                }
            };
        }

        // 전역 초기화 함수들 래핑
        if (window.initFCMTokenManager) {
            const originalInitFCM = window.initFCMTokenManager;
            window.initFCMTokenManager = async () => {
                try {
                    if (component.isInitialized) {
                        console.log('✅ FCM 컴포넌트가 이미 초기화되어 있음');
                        return component;
                    }
                    
                    const success = await component.init();
                    if (success) return component;
                    
                    return originalInitFCM();
                } catch (error) {
                    return originalInitFCM();
                }
            };
        }

        if (window.initFirebaseMessaging) {
            const originalInitFirebase = window.initFirebaseMessaging;
            window.initFirebaseMessaging = async () => {
                try {
                    if (component.isInitialized) {
                        console.log('✅ Firebase 메시징 컴포넌트가 이미 초기화되어 있음');
                        return component;
                    }
                    
                    const success = await component.init();
                    if (success) return component;
                    
                    return originalInitFirebase();
                } catch (error) {
                    return originalInitFirebase();
                }
            };
        }

        console.log('🔗 기존 FCM 매니저들 메서드 래핑 완료');
    }

    connectEvents() {
        if (!this.component) return;

        // 컴포넌트 이벤트를 기존 시스템으로 전달
        this.component.addEventListener('fcm:ready', (e) => {
            console.log('🔥 FCM 컴포넌트 준비 완료:', e.detail);
            
            // NotificationManager와 연동
            if (window.notificationManagerComponent) {
                window.notificationManagerComponent.dispatchEvent(new CustomEvent('notification:fcm-ready', {
                    detail: e.detail
                }));
            }
        });

        this.component.addEventListener('fcm:token-received', (e) => {
            console.log('🎫 FCM 토큰 수신:', e.detail.token?.substring(0, 20) + '...');
        });

        this.component.addEventListener('fcm:token-refreshed', (e) => {
            console.log('🔄 FCM 토큰 갱신:', e.detail.token?.substring(0, 20) + '...');
        });

        this.component.addEventListener('fcm:message-received', (e) => {
            console.log('📨 FCM 메시지 수신:', e.detail.payload);
            
            // 친구 상태 모니터링 시스템에 알림
            if (e.detail.messageData.type.startsWith('friend_') && window.friendStatusMonitor) {
                setTimeout(() => {
                    if (window.friendStatusMonitor.loadFriendsStatus) {
                        window.friendStatusMonitor.loadFriendsStatus();
                    }
                }, 1000);
            }
        });

        this.component.addEventListener('fcm:permission-granted', () => {
            console.log('✅ FCM 권한 획득');
        });

        this.component.addEventListener('fcm:permission-denied', () => {
            console.log('❌ FCM 권한 거부됨');
        });

        this.component.addEventListener('fcm:push-queued', (e) => {
            console.log('📤 FCM 푸시 알림 대기열 추가:', e.detail.targetUserId);
        });

        // 서비스 워커 관련 이벤트
        this.component.addEventListener('fcm:service-worker-registered', (e) => {
            console.log('📱 FCM Service Worker 등록 완료');
        });

        console.log('🔗 FCM 컴포넌트 이벤트 연결 완료');
    }

    // 기존 코드에서 사용할 수 있는 향상된 기능들
    getEnhancedFeatures() {
        if (!this.component) return {};

        return {
            // 고급 FCM 기능
            sendRichNotification: async (userId, title, message, options = {}) => {
                return await this.component.sendPushNotification(userId, {
                    title,
                    message,
                    type: options.type || 'general',
                    level: options.level || 'normal',
                    icon: options.icon || '/lonely-care/icon.png',
                    clickAction: options.clickAction,
                    customData: options.customData
                });
            },

            // 친구 그룹 알림
            sendGroupNotification: async (userIds, title, message) => {
                let successCount = 0;
                for (const userId of userIds) {
                    const success = await this.component.sendSystemNotification(title, message, userId);
                    if (success) successCount++;
                }
                return successCount;
            },

            // 토큰 상태 확인
            checkTokenValidity: async () => {
                try {
                    const newToken = await this.component.getToken();
                    return newToken === this.component.fcmToken;
                } catch (error) {
                    return false;
                }
            },

            // 배경 동기화 설정
            enableBackgroundSync: () => {
                // 서비스 워커를 통한 백그라운드 동기화 활성화
                if (this.component.serviceWorkerRegistration) {
                    this.component.serviceWorkerRegistration.sync?.register('fcm-background-sync');
                }
            },

            // 플랫폼 감지 정보
            getPlatformInfo: () => {
                return {
                    platform: this.component.platform,
                    isWebView: this.component.isWebViewMode,
                    hasServiceWorker: !!this.component.serviceWorkerRegistration,
                    firebaseSupported: this.component.isFirebaseSupported()
                };
            },

            // 이벤트 리스너 추가
            onFCMEvent: (event, callback) => {
                this.component.addEventListener(event, callback);
            }
        };
    }

    // 디버깅 및 모니터링
    getIntegrationStatus() {
        return {
            isIntegrated: this.isIntegrated,
            hasComponent: !!this.component,
            hasLegacyManagers: Object.keys(this.legacyManagers).length > 0,
            componentStatus: this.component ? this.component.getStatus() : null,
            legacyStatus: {
                fcmTokenManager: !!this.legacyManagers.fcmTokenManager,
                firebaseMessagingManager: !!this.legacyManagers.firebaseMessagingManager
            }
        };
    }

    // 테스트 및 진단
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            component: this.component ? this.component.getStatus() : null,
            firebase: {
                available: !!window.firebase,
                messagingSupported: firebase?.messaging?.isSupported?.() || false
            },
            permissions: {
                notification: Notification?.permission || 'unknown'
            },
            serviceWorker: {
                supported: 'serviceWorker' in navigator,
                registered: !!this.component?.serviceWorkerRegistration
            },
            platform: this.component?.platform || 'unknown'
        };

        console.log('🔍 FCM 진단 결과:', diagnostics);
        return diagnostics;
    }
}

// 전역 초기화 함수
window.initFCMIntegration = () => {
    if (window.__fcmIntegrationInitialized) {
        console.log('⚠️ FCM 통합이 이미 초기화됨');
        return;
    }

    console.log('🚀 FCM 통합 초기화 시작');
    
    const integration = new FCMIntegration();
    window.fcmIntegration = integration;
    window.__fcmIntegrationInitialized = true;

    // 향상된 기능을 전역에서 사용 가능하게
    window.fcmEnhancements = integration.getEnhancedFeatures();
    
    console.log('✅ FCM 통합 초기화 완료');
    
    return integration;
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.initFCMIntegration();
    }, 1000); // FCM 컴포넌트가 로드된 후 실행
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FCMIntegration;
}