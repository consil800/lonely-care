/**
 * NotificationManagerIntegration v1.0
 * NotificationManagerComponent와 기존 notifications.js를 연결하는 통합 계층
 * 
 * 100% 후방 호환성을 보장하며 기존 코드 수정 없이 컴포넌트 기능 추가
 */

class NotificationManagerIntegration {
    constructor() {
        this.component = null;
        this.legacyManager = null;
        this.isIntegrated = false;
        
        console.log('🔗 NotificationManager 통합 계층 초기화');
        
        this.init();
    }

    async init() {
        try {
            // 컴포넌트 대기
            await this.waitForComponent();
            
            // 기존 매니저 참조
            this.legacyManager = window.notificationsManager;
            
            // 통합 설정
            this.setupIntegration();
            
            // 이벤트 연결
            this.connectEvents();
            
            this.isIntegrated = true;
            console.log('✅ NotificationManager 통합 완료');
            
        } catch (error) {
            console.error('❌ NotificationManager 통합 실패:', error);
        }
    }

    async waitForComponent() {
        return new Promise((resolve) => {
            const checkComponent = () => {
                if (window.notificationManagerComponent) {
                    this.component = window.notificationManagerComponent;
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

        // 전역 접근을 위한 설정
        const component = this.component;

        // 기존 NotificationsManager 클래스 메서드들을 컴포넌트로 래핑
        if (window.notificationsManager && typeof window.notificationsManager === 'object') {
            const legacy = window.notificationsManager;
            
            // 핵심 메서드 래핑
            const originalSendFriend = legacy.sendFriendInactiveNotification;
            if (originalSendFriend) {
                legacy.sendFriendInactiveNotification = async function(friendData) {
                    console.log('🔄 기존 sendFriendInactiveNotification 호출 -> 컴포넌트로 전달');
                    try {
                        // 컴포넌트의 고급 기능 사용
                        const result = await component.sendFriendInactiveNotification(friendData);
                        if (result) return result;
                        
                        // 실패시 기존 방식 fallback
                        return await originalSendFriend.call(this, friendData);
                    } catch (error) {
                        console.warn('컴포넌트 알림 실패, 기존 방식 사용:', error);
                        return await originalSendFriend.call(this, friendData);
                    }
                }.bind(legacy);
            }

            // 설정 관련 메서드 래핑
            const originalUpdateSetting = legacy.updateNotificationSetting;
            if (originalUpdateSetting) {
                legacy.updateNotificationSetting = async function(key, value) {
                    console.log('🔄 기존 updateNotificationSetting 호출 -> 컴포넌트로 전달');
                    try {
                        const result = await component.updateSetting(key, value);
                        if (result) return result;
                        
                        return await originalUpdateSetting.call(this, key, value);
                    } catch (error) {
                        console.warn('컴포넌트 설정 업데이트 실패, 기존 방식 사용:', error);
                        return await originalUpdateSetting.call(this, key, value);
                    }
                }.bind(legacy);
            }

            // 설정 조회 래핑
            const originalGetSettings = legacy.getNotificationSettings;
            if (originalGetSettings) {
                legacy.getNotificationSettings = function() {
                    try {
                        // 컴포넌트에서 최신 설정 반환
                        const componentSettings = component.getStatus().settings;
                        if (componentSettings && Object.keys(componentSettings).length > 0) {
                            return componentSettings;
                        }
                        
                        return originalGetSettings.call(this);
                    } catch (error) {
                        return originalGetSettings.call(this);
                    }
                }.bind(legacy);
            }

            // 테스트 알림 래핑
            const originalSendTest = legacy.sendTestNotification;
            if (originalSendTest) {
                legacy.sendTestNotification = async function(level) {
                    try {
                        const result = await component.sendTestNotification(level);
                        if (result) return result;
                        
                        return await originalSendTest.call(this, level);
                    } catch (error) {
                        return await originalSendTest.call(this, level);
                    }
                }.bind(legacy);
            }
        }

        // 전역 함수들도 래핑
        if (window.sendTestNotification) {
            const originalGlobalTest = window.sendTestNotification;
            window.sendTestNotification = async (level = 'warning') => {
                try {
                    const result = await component.sendTestNotification(level);
                    if (result) return result;
                    
                    return originalGlobalTest(level);
                } catch (error) {
                    return originalGlobalTest(level);
                }
            };
        }

        console.log('🔗 기존 NotificationsManager 메서드 래핑 완료');
    }

    connectEvents() {
        if (!this.component) return;

        // 컴포넌트 이벤트를 기존 시스템으로 전달
        this.component.addEventListener('notification:friend-inactive-sent', (e) => {
            console.log('📢 친구 무응답 알림 전송 완료:', e.detail);
        });

        this.component.addEventListener('notification:permission-granted', () => {
            console.log('✅ 알림 권한 획득');
        });

        this.component.addEventListener('notification:permission-denied', () => {
            console.log('❌ 알림 권한 거부됨');
        });

        this.component.addEventListener('notification:settings-loaded', (e) => {
            console.log('📋 알림 설정 로드 완료:', e.detail.settings);
        });

        this.component.addEventListener('notification:quiet-hours-changed', (e) => {
            console.log('🌙 조용한 시간 상태 변경:', e.detail.isQuietHours);
        });

        // 사용자 활동 이벤트
        this.component.addEventListener('notification:user-activity', (e) => {
            // 기존 시스템에 사용자 활동 알림
            if (window.motionDetector && window.motionDetector.recordMotion) {
                window.motionDetector.recordMotion();
            }
        });

        console.log('🔗 컴포넌트 이벤트 연결 완료');
    }

    // 기존 코드에서 사용할 수 있는 향상된 기능들
    getEnhancedFeatures() {
        if (!this.component) return {};

        return {
            // 고급 알림 설정
            enableQuietHours: (start, end) => {
                this.component.updateSetting('quiet_hours_enabled', true);
                this.component.updateSetting('quiet_hours_start', start);
                this.component.updateSetting('quiet_hours_end', end);
            },

            // 알림 우선순위 설정
            setPriority: (type, priority) => {
                if (this.component.notificationTypes[type]) {
                    this.component.notificationTypes[type].priority = priority;
                }
            },

            // 사용자 정의 알림 발송
            sendCustomNotification: async (title, message, options = {}) => {
                return await this.component.showSystemNotification(title, message, options.level || 'info', options);
            },

            // 대기 알림 강제 처리
            processPendingNotifications: () => {
                return this.component.processPendingNotifications();
            },

            // 상태 정보 조회
            getDetailedStatus: () => {
                return this.component.getStatus();
            },

            // 이벤트 리스너 추가
            onNotificationEvent: (event, callback) => {
                this.component.addEventListener(event, callback);
            }
        };
    }

    // 디버깅 및 모니터링
    getIntegrationStatus() {
        return {
            isIntegrated: this.isIntegrated,
            hasComponent: !!this.component,
            hasLegacy: !!this.legacyManager,
            componentStatus: this.component ? this.component.getStatus() : null,
            legacyStatus: this.legacyManager ? {
                hasSettings: !!this.legacyManager.notificationSettings,
                isWebViewMode: !!this.legacyManager.isWebViewMode
            } : null
        };
    }
}

// 전역 초기화 함수
window.initNotificationManagerIntegration = () => {
    if (window.__notificationIntegrationInitialized) {
        console.log('⚠️ NotificationManager 통합이 이미 초기화됨');
        return;
    }

    console.log('🚀 NotificationManager 통합 초기화 시작');
    
    const integration = new NotificationManagerIntegration();
    window.notificationManagerIntegration = integration;
    window.__notificationIntegrationInitialized = true;

    // 향상된 기능을 전역에서 사용 가능하게
    window.notificationEnhancements = integration.getEnhancedFeatures();
    
    console.log('✅ NotificationManager 통합 초기화 완료');
    
    return integration;
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.initNotificationManagerIntegration();
    }, 500); // 다른 컴포넌트들이 로드된 후 실행
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManagerIntegration;
}