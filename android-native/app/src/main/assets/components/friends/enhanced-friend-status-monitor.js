/**
 * Enhanced Friend Status Monitor Component
 * 기존 friend-status-monitor.js를 래핑하여 새로운 기능을 안전하게 추가하는 컴포넌트
 * 
 * 🔧 Level 4 컴포넌트: 자유롭게 수정 가능
 * 🛡️ 기존 Level 2 파일(friend-status-monitor.js)을 건드리지 않음
 */

class EnhancedFriendStatusMonitor {
    constructor() {
        this.originalMonitor = null;
        this.isInitialized = false;
        this.debugMode = true;
        this.refreshInterval = null;
        
        console.log('🆕 Enhanced Friend Status Monitor 초기화 시작');
        this.init();
    }

    async init() {
        try {
            // 원본 Monitor가 초기화될 때까지 대기
            await this.waitForOriginalMonitor();
            
            console.log('✅ Enhanced Friend Status Monitor 초기화 완료');
            this.isInitialized = true;
            
            // 기존 기능을 확장
            this.enhanceOriginalMethods();
            
            // 🆕 자동 새로고침 시작
            this.startAutoRefresh();
            
        } catch (error) {
            console.error('❌ Enhanced Friend Status Monitor 초기화 실패:', error);
        }
    }

    // 원본 모니터가 로드될 때까지 대기
    async waitForOriginalMonitor() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5초 대기
            
            const checkMonitor = () => {
                if (window.friendStatusMonitor && window.friendStatusMonitor.createFriendCard) {
                    this.originalMonitor = window.friendStatusMonitor;
                    console.log('🔗 원본 FriendStatusMonitor와 연결됨');
                    resolve();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(new Error('원본 FriendStatusMonitor 로드 타임아웃'));
                    } else {
                        setTimeout(checkMonitor, 100);
                    }
                }
            };
            
            checkMonitor();
        });
    }

    // 기존 메서드들을 확장
    enhanceOriginalMethods() {
        if (!this.originalMonitor) return;

        // 원본 메서드들 백업
        this.originalCreateFriendCard = this.originalMonitor.createFriendCard.bind(this.originalMonitor);
        this.originalCheckAndSendNotifications = this.originalMonitor.checkAndSendNotifications.bind(this.originalMonitor);
        
        // 확장된 메서드로 교체
        this.originalMonitor.createFriendCard = this.enhancedCreateFriendCard.bind(this);
        this.originalMonitor.checkAndSendNotifications = this.enhancedCheckAndSendNotifications.bind(this);
        
        console.log('🚀 원본 FriendStatusMonitor 메서드들이 확장됨');
    }

    // 🆕 확장된 친구 카드 생성 (비정상 활동 시간 표시 포함)
    enhancedCreateFriendCard(friend) {
        try {
            const alertInfo = this.originalMonitor.alertLevels[friend.alert_level];
            const hoursAgo = friend.hours_since_heartbeat || 0;
            
            if (this.debugMode) {
                console.log(`🔍 Enhanced 친구 카드 생성: ${friend.friend_name}, 레벨: ${friend.alert_level}, 시간: ${hoursAgo}`);
            }

            // 🆕 비정상 활동 시간 텍스트 생성
            const inactiveTimeText = this.generateInactiveTimeText(friend);
            
            return `
                <div class="friend-status-card" data-alert-level="${friend.alert_level}">
                    <div class="friend-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div class="friend-info" style="flex: 1;">
                            <div class="friend-name" style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                                ${friend.friend_name}
                            </div>
                            ${inactiveTimeText ? `
                                <div class="inactive-time" style="font-size: 12px; color: #666; margin-top: 2px;">
                                    ${inactiveTimeText}
                                </div>
                            ` : ''}
                        </div>
                        <div class="alert-badge" style="background-color: ${alertInfo.color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; white-space: nowrap;">
                            <span class="alert-icon" style="margin-right: 4px;">${alertInfo.icon}</span>
                            <span class="alert-text">${alertInfo.text}</span>
                        </div>
                    </div>
                    
                    ${friend.alert_level !== 'normal' ? `
                        <div class="friend-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                            <button class="btn-contact" onclick="contactFriend('${friend.friend_id}', '${friend.friend_name}')" 
                                    style="flex: 1; background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                                📞 연락하기
                            </button>
                            ${friend.alert_level === 'emergency' ? `
                                <button class="btn-emergency" onclick="reportEmergency('${friend.friend_id}', '${friend.friend_name}')"
                                        style="flex: 1; background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                                    🚨 신고하기
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            
        } catch (error) {
            console.error('❌ Enhanced 친구 카드 생성 실패:', error);
            // 오류 시 원본 메서드로 폴백
            return this.originalCreateFriendCard(friend);
        }
    }

    // 🆕 비정상 활동 시간 텍스트 생성
    generateInactiveTimeText(friend) {
        if (friend.alert_level === 'normal') {
            return null; // 정상 상태는 표시하지 않음
        }

        const hoursAgo = friend.hours_since_heartbeat || 0;
        if (hoursAgo <= 0) {
            return null;
        }

        // 시간 단위에 따른 표시
        if (hoursAgo < 1) {
            const minutesAgo = Math.floor(hoursAgo * 60);
            return `${minutesAgo}분 비정상 활동`;
        } else if (hoursAgo < 24) {
            return `${Math.floor(hoursAgo)}시간 비정상 활동`;
        } else {
            const daysAgo = Math.floor(hoursAgo / 24);
            const remainingHours = Math.floor(hoursAgo % 24);
            return remainingHours > 0 
                ? `${daysAgo}일 ${remainingHours}시간 비정상 활동`
                : `${daysAgo}일 비정상 활동`;
        }
    }

    // 🆕 확장된 알림 체크 (중복 방지 로직 포함)
    async enhancedCheckAndSendNotifications() {
        try {
            if (this.debugMode) {
                console.log('🔔 Enhanced 알림 체크 시작');
            }

            // Enhanced Notification Manager가 있으면 그것을 사용
            if (window.enhancedNotificationManager?.isInitialized) {
                console.log('📡 Enhanced Notification Manager 사용');
                // Enhanced 시스템에서 알림 처리하므로 여기서는 스킵
                return;
            }

            // 원본 메서드 실행
            await this.originalCheckAndSendNotifications();

        } catch (error) {
            console.error('❌ Enhanced 알림 체크 실패:', error);
        }
    }

    // 🆕 친구 상태 수동 새로고침
    async refreshFriendStatus() {
        try {
            console.log('🔄 Enhanced: 친구 상태 수동 새로고침');
            
            if (this.originalMonitor?.loadFriendsStatus) {
                await this.originalMonitor.loadFriendsStatus();
                console.log('✅ Enhanced: 친구 상태 새로고침 완료');
            }
            
        } catch (error) {
            console.error('❌ Enhanced 친구 상태 새로고침 실패:', error);
        }
    }

    // 🆕 자동 새로고침 시작 (하트비트 전송 후 사용)
    startAutoRefresh() {
        // 기존 인터벌 정리
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // 2분마다 자동 새로고침 (원본 30초보다 느리게 설정)
        this.refreshInterval = setInterval(async () => {
            if (this.debugMode) {
                console.log('🔄 Enhanced: 자동 새로고침');
            }
            await this.refreshFriendStatus();
        }, 120000); // 2분

        console.log('⏰ Enhanced: 자동 새로고침 시작 (2분 간격)');
    }

    // 🆕 하트비트 전송 후 즉시 새로고침 트리거
    triggerImmediateRefresh() {
        console.log('💗 Enhanced: 하트비트 후 즉시 새로고침');
        
        // 2초 후 새로고침 (서버 동기화 시간 고려)
        setTimeout(async () => {
            await this.refreshFriendStatus();
        }, 2000);
    }

    // 현재 상태 정보
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasOriginalMonitor: !!this.originalMonitor,
            autoRefreshActive: !!this.refreshInterval,
            debugMode: this.debugMode,
            component: 'EnhancedFriendStatusMonitor v1.0'
        };
    }

    // 정리
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        console.log('🛑 Enhanced Friend Status Monitor 정리됨');
    }
}

// 전역 인스턴스 생성 및 등록
let enhancedFriendStatusMonitor;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연 후 초기화 (기존 시스템이 먼저 로드되도록)
    setTimeout(() => {
        if (!enhancedFriendStatusMonitor) {
            enhancedFriendStatusMonitor = new EnhancedFriendStatusMonitor();
            window.enhancedFriendStatusMonitor = enhancedFriendStatusMonitor;
            
            console.log('🎉 Enhanced Friend Status Monitor 전역 등록 완료');
        }
    }, 1500);
});

// 테스트 함수들 등록
window.testEnhancedFriendCard = () => {
    const testFriend = {
        friend_id: 'test-123',
        friend_name: 'Enhanced 테스트 친구',
        alert_level: 'emergency',
        hours_since_heartbeat: 25.5
    };

    if (enhancedFriendStatusMonitor) {
        const cardHtml = enhancedFriendStatusMonitor.enhancedCreateFriendCard(testFriend);
        console.log('테스트 카드 HTML:', cardHtml);
        return cardHtml;
    } else {
        console.error('Enhanced Friend Status Monitor가 초기화되지 않았습니다');
        return null;
    }
};

window.refreshFriendsNow = () => {
    if (enhancedFriendStatusMonitor) {
        enhancedFriendStatusMonitor.refreshFriendStatus();
    } else {
        console.error('Enhanced Friend Status Monitor가 초기화되지 않았습니다');
    }
};

console.log('📦 Enhanced Friend Status Monitor 컴포넌트 로드됨');