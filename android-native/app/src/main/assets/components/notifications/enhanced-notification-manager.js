/**
 * Enhanced Notification Manager Component
 * 기존 notifications.js를 래핑하여 새로운 기능을 안전하게 추가하는 컴포넌트
 * 
 * 🔧 Level 4 컴포넌트: 자유롭게 수정 가능
 * 🛡️ 기존 Level 2 파일(notifications.js)을 건드리지 않음
 */

class EnhancedNotificationManager {
    constructor() {
        this.originalManager = null;
        this.isInitialized = false;
        this.debugMode = true; // 개발 중 디버깅용
        
        console.log('🆕 Enhanced Notification Manager 초기화 시작');
        this.init();
    }

    async init() {
        try {
            // 원본 NotificationManager가 초기화될 때까지 대기
            await this.waitForOriginalManager();
            
            console.log('✅ Enhanced Notification Manager 초기화 완료');
            this.isInitialized = true;
            
            // 기존 기능을 확장
            this.enhanceOriginalMethods();
            
        } catch (error) {
            console.error('❌ Enhanced Notification Manager 초기화 실패:', error);
        }
    }

    // 원본 매니저가 로드될 때까지 대기
    async waitForOriginalManager() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5초 대기
            
            const checkManager = () => {
                if (window.notificationsManager && window.notificationsManager.sendFriendInactiveNotification) {
                    this.originalManager = window.notificationsManager;
                    console.log('🔗 원본 NotificationManager와 연결됨');
                    resolve();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(new Error('원본 NotificationManager 로드 타임아웃'));
                    } else {
                        setTimeout(checkManager, 100);
                    }
                }
            };
            
            checkManager();
        });
    }

    // 기존 메서드들을 확장
    enhanceOriginalMethods() {
        if (!this.originalManager) return;

        // 원본 메서드 백업
        this.originalSendNotification = this.originalManager.sendFriendInactiveNotification.bind(this.originalManager);
        
        // 확장된 메서드로 교체
        this.originalManager.sendFriendInactiveNotification = this.enhancedSendFriendInactiveNotification.bind(this);
        
        console.log('🚀 원본 NotificationManager 메서드들이 확장됨');
    }

    // 🆕 확장된 친구 무응답 알림 발송 (쿨다운 기능 포함)
    async enhancedSendFriendInactiveNotification(friendData) {
        try {
            if (this.debugMode) {
                console.log('🔔 Enhanced 알림 발송:', friendData);
            }

            // 🆕 개선된 쿨다운 체크
            const cooldownResult = this.checkNotificationCooldown(friendData);
            if (!cooldownResult.canSend) {
                console.log(`🔕 쿨다운: ${friendData.friend_name} (${cooldownResult.remainingTime}초 남음)`);
                return false;
            }

            // 🆕 알림 발송 전에 미리 쿨다운 설정 (중복 방지)
            this.setNotificationCooldown(friendData);

            // 원본 기능 실행
            const success = await this.originalSendNotification(friendData);

            if (success) {
                console.log(`✅ Enhanced 알림 발송 성공: ${friendData.friend_name}`);
                
                // 🆕 추가 기능: 알림 발송 후 상태 모니터 새로고침 트리거
                this.triggerStatusRefresh();
            } else {
                // 실패 시 쿨다운 제거
                this.removeNotificationCooldown(friendData);
                console.log(`❌ Enhanced 알림 발송 실패: ${friendData.friend_name}`);
            }

            return success;

        } catch (error) {
            console.error('❌ Enhanced 알림 발송 중 오류:', error);
            // 오류 시에도 쿨다운 제거
            this.removeNotificationCooldown(friendData);
            return false;
        }
    }

    // 🆕 개선된 쿨다운 체크 (5분)
    checkNotificationCooldown(friendData) {
        const cooldownKey = `enhanced-notification-cooldown-${friendData.friend_id}-${friendData.alert_level}`;
        const lastTime = localStorage.getItem(cooldownKey);
        const currentTime = Date.now();
        const cooldownPeriod = 300000; // 5분

        if (lastTime) {
            const timeDiff = currentTime - parseInt(lastTime);
            if (timeDiff < cooldownPeriod) {
                return {
                    canSend: false,
                    remainingTime: Math.ceil((cooldownPeriod - timeDiff) / 1000)
                };
            }
        }

        return { canSend: true, remainingTime: 0 };
    }

    // 🆕 쿨다운 타이머 설정
    setNotificationCooldown(friendData) {
        const cooldownKey = `enhanced-notification-cooldown-${friendData.friend_id}-${friendData.alert_level}`;
        localStorage.setItem(cooldownKey, Date.now().toString());
        
        if (this.debugMode) {
            console.log(`⏰ 쿨다운 설정: ${cooldownKey}`);
        }
    }

    // 🆕 쿨다운 타이머 제거 (실패 시)
    removeNotificationCooldown(friendData) {
        const cooldownKey = `enhanced-notification-cooldown-${friendData.friend_id}-${friendData.alert_level}`;
        localStorage.removeItem(cooldownKey);
        
        if (this.debugMode) {
            console.log(`🗑️ 쿨다운 제거: ${cooldownKey}`);
        }
    }

    // 🆕 상태 모니터 새로고침 트리거
    triggerStatusRefresh() {
        // 2초 후 친구 상태 모니터 새로고침
        setTimeout(() => {
            if (window.enhancedFriendStatusMonitor?.refreshFriendStatus) {
                window.enhancedFriendStatusMonitor.refreshFriendStatus();
            } else if (window.friendStatusMonitor?.loadFriendsStatus) {
                window.friendStatusMonitor.loadFriendsStatus();
            }
        }, 2000);
    }

    // 🆕 테스트 알림 발송 (개발용)
    async sendTestNotification(alertLevel = 'warning') {
        const testData = {
            friend_id: 'test-enhanced',
            friend_name: 'Enhanced 테스트',
            alert_level: alertLevel,
            hours_since_heartbeat: alertLevel === 'warning' ? 1 : alertLevel === 'danger' ? 2 : 3
        };

        return await this.enhancedSendFriendInactiveNotification(testData);
    }

    // 현재 상태 정보
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasOriginalManager: !!this.originalManager,
            debugMode: this.debugMode,
            component: 'EnhancedNotificationManager v1.0'
        };
    }
}

// 전역 인스턴스 생성 및 등록
let enhancedNotificationManager;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연 후 초기화 (기존 시스템이 먼저 로드되도록)
    setTimeout(() => {
        if (!enhancedNotificationManager) {
            enhancedNotificationManager = new EnhancedNotificationManager();
            window.enhancedNotificationManager = enhancedNotificationManager;
            
            console.log('🎉 Enhanced Notification Manager 전역 등록 완료');
        }
    }, 1000);
});

// 테스트 함수 등록
window.testEnhancedNotification = (level = 'warning') => {
    if (enhancedNotificationManager) {
        return enhancedNotificationManager.sendTestNotification(level);
    } else {
        console.error('Enhanced Notification Manager가 초기화되지 않았습니다');
        return false;
    }
};

console.log('📦 Enhanced Notification Manager 컴포넌트 로드됨');