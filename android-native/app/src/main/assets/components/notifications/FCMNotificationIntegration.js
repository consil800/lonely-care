/**
 * FCM 알림 통합 파일
 * 기존 시스템과 FCM을 연결하는 통합 레이어
 */

class FCMNotificationIntegration {
    constructor() {
        this.fcmService = null;
        this.notificationManager = null;
        this.friendStatusMonitor = null;
        this.isInitialized = false;
        
        console.log('🔗 FCM 알림 통합 초기화');
        this.init();
    }

    async init() {
        try {
            // FCMService 로드 대기
            await this.waitForService('fcmService', 5000);
            this.fcmService = window.fcmService;
            
            // NotificationManager 대기
            await this.waitForService('notificationManagerComponent', 5000);
            this.notificationManager = window.notificationManagerComponent;
            
            // FriendStatusMonitor 대기
            await this.waitForService('friendStatusMonitor', 5000);
            this.friendStatusMonitor = window.friendStatusMonitor;
            
            // 기존 알림 함수들을 FCM 버전으로 오버라이드
            this.overrideNotificationMethods();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ FCM 알림 통합 완료');
            
        } catch (error) {
            console.error('❌ FCM 알림 통합 실패:', error);
        }
    }

    /**
     * 서비스 로드 대기
     */
    async waitForService(serviceName, timeout = 5000) {
        const startTime = Date.now();
        
        while (!window[serviceName]) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`${serviceName} 로드 타임아웃`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return window[serviceName];
    }

    /**
     * 기존 알림 메서드들을 FCM 버전으로 오버라이드
     */
    overrideNotificationMethods() {
        // 1. NotificationManager의 친구 상태 알림을 FCM으로 전환
        if (this.notificationManager && this.notificationManager.sendFriendInactiveNotification) {
            const originalMethod = this.notificationManager.sendFriendInactiveNotification.bind(this.notificationManager);
            
            this.notificationManager.sendFriendInactiveNotification = async (friendData) => {
                console.log('🔄 FCM으로 친구 상태 알림 전송:', friendData);
                
                try {
                    // 현재 사용자 ID 가져오기
                    const currentUser = window.auth?.getCurrentUser();
                    if (!currentUser) {
                        console.warn('⚠️ 로그인된 사용자 없음');
                        return originalMethod(friendData);
                    }
                    
                    // FCM으로 알림 전송
                    const success = await this.fcmService.sendFriendStatusAlert(
                        currentUser.id,
                        friendData
                    );
                    
                    if (success) {
                        console.log('✅ FCM 친구 상태 알림 전송 성공');
                        
                        // 로컬 알림도 표시 (사용자가 앱 내에 있을 때)
                        if (document.visibilityState === 'visible') {
                            await originalMethod(friendData);
                        }
                        
                        return true;
                    } else {
                        console.warn('⚠️ FCM 전송 실패 - 기존 방식 사용');
                        return originalMethod(friendData);
                    }
                    
                } catch (error) {
                    console.error('❌ FCM 알림 전송 오류:', error);
                    return originalMethod(friendData);
                }
            };
        }

        // 2. 시스템 알림을 FCM으로 전환
        if (window.sendSystemNotification) {
            window.sendSystemNotificationViaFCM = async (title, message, targetUserId = null) => {
                console.log('🔄 FCM으로 시스템 알림 전송:', { title, message, targetUserId });
                
                try {
                    const result = await this.fcmService.sendSystemNotification(
                        title,
                        message,
                        targetUserId
                    );
                    
                    console.log('✅ FCM 시스템 알림 전송 결과:', result);
                    return result;
                    
                } catch (error) {
                    console.error('❌ FCM 시스템 알림 전송 실패:', error);
                    return false;
                }
            };
        }

        // 3. 관리자 전체 알림 함수 추가
        window.sendAdminBroadcastNotification = async (title, message) => {
            console.log('📢 관리자 전체 알림 전송:', { title, message });
            
            try {
                const notification = {
                    title: `📢 ${title}`,
                    body: message,
                    type: 'admin',
                    alertLevel: 'normal',
                    icon: '/lonely-care/icon-192x192.png'
                };
                
                const result = await this.fcmService.sendBroadcastNotification(notification);
                
                console.log('✅ 전체 알림 전송 완료:', result);
                
                // 관리자 UI에 결과 표시
                if (window.adminManager && window.adminManager.showNotification) {
                    window.adminManager.showNotification(
                        `전체 알림 전송 완료: ${result.success}/${result.total}명`,
                        result.success > 0 ? 'success' : 'error'
                    );
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ 전체 알림 전송 실패:', error);
                
                if (window.adminManager && window.adminManager.showNotification) {
                    window.adminManager.showNotification(
                        '전체 알림 전송 실패',
                        'error'
                    );
                }
                
                return { total: 0, success: 0 };
            }
        };

        console.log('✅ 알림 메서드 오버라이드 완료');
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 친구 상태 변경 이벤트 감지
        if (this.friendStatusMonitor) {
            // 원래의 checkAndNotify 메서드 래핑
            const originalCheckAndNotify = this.friendStatusMonitor.checkAndNotifyFriendStatus;
            if (originalCheckAndNotify) {
                this.friendStatusMonitor.checkAndNotifyFriendStatus = async (friendData) => {
                    // 기존 로직 실행
                    await originalCheckAndNotify.call(this.friendStatusMonitor, friendData);
                    
                    // FCM 알림도 추가로 전송
                    const alertLevel = this.friendStatusMonitor.getAlertLevel(friendData.hours_since_heartbeat);
                    if (alertLevel && alertLevel !== 'normal') {
                        const currentUser = window.auth?.getCurrentUser();
                        if (currentUser) {
                            await this.fcmService.sendFriendStatusAlert(currentUser.id, {
                                ...friendData,
                                alert_level: alertLevel
                            });
                        }
                    }
                };
            }
        }

        // FCM 토큰 갱신 이벤트
        if (window.fcmComponent) {
            window.fcmComponent.addEventListener('fcm:token-received', async (event) => {
                const token = event.detail.token;
                const currentUser = window.auth?.getCurrentUser();
                
                if (currentUser && token) {
                    await this.fcmService.updateUserFCMToken(currentUser.id, token);
                    console.log('✅ FCM 토큰 데이터베이스 업데이트 완료');
                }
            });
        }

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    /**
     * 테스트 함수들
     */
    async testFriendAlert(friendId, alertLevel = 'warning', hours = 25) {
        console.log('🧪 친구 알림 테스트:', { friendId, alertLevel, hours });
        
        const currentUser = window.auth?.getCurrentUser();
        if (!currentUser) {
            console.error('❌ 로그인 필요');
            return;
        }
        
        const friendData = {
            friend_id: friendId,
            friend_name: '테스트 친구',
            hours_since_heartbeat: hours,
            alert_level: alertLevel,
            last_active: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
        };
        
        return await this.fcmService.sendFriendStatusAlert(currentUser.id, friendData);
    }

    async testSystemNotification(title = '시스템 공지', message = '테스트 시스템 알림입니다') {
        console.log('🧪 시스템 알림 테스트:', { title, message });
        return await this.fcmService.sendSystemNotification(title, message);
    }

    async testBroadcastNotification(title = '전체 공지', message = '모든 사용자에게 전송되는 테스트 알림입니다') {
        console.log('🧪 전체 알림 테스트:', { title, message });
        return await window.sendAdminBroadcastNotification(title, message);
    }
}

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    // FCMService 로드 후 통합 초기화
    setTimeout(() => {
        window.fcmNotificationIntegration = new FCMNotificationIntegration();
        
        // 전역 테스트 함수 노출
        window.testFCMAlert = (type = 'friend', ...args) => {
            const integration = window.fcmNotificationIntegration;
            
            switch(type) {
                case 'friend':
                    return integration.testFriendAlert(...args);
                case 'system':
                    return integration.testSystemNotification(...args);
                case 'broadcast':
                    return integration.testBroadcastNotification(...args);
                default:
                    console.log('사용법: testFCMAlert("friend"|"system"|"broadcast", ...)');
            }
        };
        
        console.log('💡 FCM 테스트: testFCMAlert("friend", "friend123", "warning", 25)');
        console.log('💡 FCM 테스트: testFCMAlert("system", "제목", "내용")');
        console.log('💡 FCM 테스트: testFCMAlert("broadcast", "제목", "내용")');
        
    }, 2000);
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FCMNotificationIntegration;
}