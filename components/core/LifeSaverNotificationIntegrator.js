/**
 * 생명구조 알림 통합자 - 기존 시스템과 강화된 알림 시스템의 안전한 통합
 * 
 * 주요 기능:
 * 1. 기존 friend-status-monitor.js와 notifications.js 시스템 보호
 * 2. Enhanced Notification Manager와의 안전한 연동
 * 3. 친구 상태 변화 감지 및 적절한 알림 전송
 * 4. 알림 주기 관리 (주의/경고: 1회, 위험: 6시간마다)
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

class LifeSaverNotificationIntegrator {
    constructor() {
        this.className = 'LifeSaverNotificationIntegrator';
        this.isInitialized = false;
        this.statusHistory = new Map(); // 친구별 상태 이력
        this.monitoringInterval = null;
        this.checkInterval = 60000; // 1분마다 확인
        
        console.log('🆘 [생명구조] 알림 통합자 초기화');
        this.init();
    }

    /**
     * 초기화
     */
    async init() {
        try {
            if (this.isInitialized) return;
            
            // 의존성 확인
            await this.waitForDependencies();
            
            // 기존 시스템과 연동
            this.setupSystemIntegration();
            
            // 상태 모니터링 시작
            this.startStatusMonitoring();
            
            this.isInitialized = true;
            console.log('✅ [생명구조] 알림 통합자 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 알림 통합자 초기화 실패:', error);
        }
    }

    /**
     * 의존성 대기
     */
    async waitForDependencies() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30;
            
            const checkDeps = () => {
                attempts++;
                const hasEnhancedNotifications = window.EnhancedNotificationManager;
                const hasRealTimeStatus = window.realTimeStatusManager || window.RealTimeStatusManager;
                const hasAuth = window.auth;
                
                if (hasEnhancedNotifications && hasAuth) {
                    console.log('✅ [생명구조] 통합자 의존성 확인 완료');
                    this.enhancedNotifier = window.EnhancedNotificationManager;
                    this.realTimeStatus = hasRealTimeStatus;
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ [생명구조] 일부 의존성 없음, 기본 기능으로 진행');
                    this.enhancedNotifier = window.EnhancedNotificationManager;
                    resolve();
                } else {
                    setTimeout(checkDeps, 100);
                }
            };
            checkDeps();
        });
    }

    /**
     * 기존 시스템과 연동 설정
     */
    setupSystemIntegration() {
        // 기존 RealTimeStatusManager 후킹 (있는 경우)
        if (this.realTimeStatus && typeof this.realTimeStatus.updateFriendStatus === 'function') {
            console.log('🔗 [생명구조] RealTimeStatusManager와 연동');
            this.hookRealTimeStatusManager();
        }

        // 기존 notifications 시스템 후킹 (있는 경우)
        if (window.notifications) {
            console.log('🔗 [생명구조] 기존 notifications 시스템과 연동');
            this.hookNotificationsSystem();
        }

        // 친구 목록 변화 감지
        this.setupFriendListMonitoring();
    }

    /**
     * RealTimeStatusManager 후킹
     */
    hookRealTimeStatusManager() {
        try {
            const originalUpdate = this.realTimeStatus.updateFriendStatus;
            const self = this;
            
            // 원본 메서드를 래핑
            this.realTimeStatus.updateFriendStatus = function(friendId, statusData) {
                // 원본 메서드 실행
                const result = originalUpdate.call(this, friendId, statusData);
                
                // 추가 로직: 상태 변화 감지 및 알림
                self.onFriendStatusChange(friendId, statusData).catch(error => {
                    console.error('❌ [생명구조] 상태 변화 처리 실패:', error);
                });
                
                return result;
            };
            
            console.log('✅ [생명구조] RealTimeStatusManager 후킹 완료');
        } catch (error) {
            console.warn('⚠️ [생명구조] RealTimeStatusManager 후킹 실패:', error);
        }
    }

    /**
     * 기존 notifications 시스템 후킹
     */
    hookNotificationsSystem() {
        try {
            if (window.notifications && typeof window.notifications.sendNotification === 'function') {
                const originalSend = window.notifications.sendNotification;
                const self = this;
                
                // 원본 메서드를 래핑하여 강화된 알림도 함께 전송
                window.notifications.sendNotification = function(data) {
                    // 원본 메서드 실행
                    const result = originalSend.call(this, data);
                    
                    // 생명구조 관련 알림인 경우 강화된 알림도 전송
                    if (self.isLifeSaverNotification(data)) {
                        self.enhanceNotification(data).catch(error => {
                            console.error('❌ [생명구조] 강화된 알림 전송 실패:', error);
                        });
                    }
                    
                    return result;
                };
                
                console.log('✅ [생명구조] notifications 시스템 후킹 완료');
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] notifications 시스템 후킹 실패:', error);
        }
    }

    /**
     * 친구 목록 모니터링 설정
     */
    setupFriendListMonitoring() {
        // DOM 변화 감지로 친구 카드 업데이트 모니터링
        const friendsList = document.getElementById('current-friends-list');
        if (friendsList) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        this.onFriendsListChange();
                    }
                });
            });
            
            observer.observe(friendsList, {
                childList: true,
                subtree: true
            });
            
            console.log('👥 [생명구조] 친구 목록 모니터링 설정 완료');
        }
    }

    /**
     * 상태 모니터링 시작
     */
    startStatusMonitoring() {
        // 주기적으로 친구 상태 확인
        this.monitoringInterval = setInterval(() => {
            this.checkAllFriendsStatus();
        }, this.checkInterval);
        
        console.log(`🔄 [생명구조] 상태 모니터링 시작 (${this.checkInterval/1000}초 간격)`);
    }

    /**
     * 모든 친구 상태 확인
     */
    async checkAllFriendsStatus() {
        try {
            if (!window.auth || !window.auth.getCurrentUser()) {
                return; // 로그인하지 않은 경우
            }

            const friendCards = document.querySelectorAll('.friend-card');
            if (!friendCards.length) {
                return; // 친구가 없는 경우
            }

            for (const card of friendCards) {
                await this.checkFriendCardStatus(card);
            }

        } catch (error) {
            console.warn('⚠️ [생명구조] 전체 친구 상태 확인 실패:', error);
        }
    }

    /**
     * 개별 친구 카드 상태 확인
     * @param {Element} friendCard 친구 카드 DOM 요소
     */
    async checkFriendCardStatus(friendCard) {
        try {
            // 친구 정보 추출
            const friendName = friendCard.querySelector('.friend-name')?.textContent?.trim();
            const statusElement = friendCard.querySelector('.friend-status');
            const timeElement = friendCard.querySelector('.friend-time');
            
            if (!friendName || !statusElement) {
                return;
            }

            // 현재 상태 분석
            const currentStatus = this.parseStatusFromCard(statusElement, timeElement);
            const friendId = this.extractFriendIdFromCard(friendCard);
            
            if (!friendId) {
                console.warn(`⚠️ [생명구조] 친구 ID 추출 실패: ${friendName}`);
                return;
            }

            // 상태 변화 감지
            const lastStatus = this.statusHistory.get(friendId);
            if (this.hasStatusChanged(lastStatus, currentStatus)) {
                console.log(`🔄 [생명구조] 상태 변화 감지: ${friendName} ${lastStatus?.level} → ${currentStatus.level}`);
                
                // 상태 이력 업데이트
                this.statusHistory.set(friendId, {
                    ...currentStatus,
                    timestamp: Date.now(),
                    friendName: friendName
                });

                // 알림 전송 판단
                if (this.shouldSendAlert(currentStatus)) {
                    await this.sendStatusChangeAlert(friendId, friendName, currentStatus);
                }
            }

        } catch (error) {
            console.warn('⚠️ [생명구조] 친구 카드 상태 확인 실패:', error);
        }
    }

    /**
     * 친구 카드에서 상태 정보 파싱
     * @param {Element} statusElement 상태 요소
     * @param {Element} timeElement 시간 요소
     * @returns {Object} 상태 정보
     */
    parseStatusFromCard(statusElement, timeElement) {
        const statusText = statusElement.textContent.trim();
        const timeText = timeElement?.textContent?.trim() || '';
        
        let level = 'normal';
        let icon = '🟢';
        
        if (statusText.includes('위험') || statusText.includes('🔴')) {
            level = 'emergency';
            icon = '🔴';
        } else if (statusText.includes('경고') || statusText.includes('🟠')) {
            level = 'danger';
            icon = '🟠';
        } else if (statusText.includes('주의') || statusText.includes('🟡')) {
            level = 'warning';
            icon = '🟡';
        }
        
        return {
            level,
            icon,
            text: statusText,
            timeText,
            lastActivity: timeElement?.getAttribute('data-timestamp') || null
        };
    }

    /**
     * 친구 카드에서 친구 ID 추출
     * @param {Element} friendCard 친구 카드
     * @returns {string|null} 친구 ID
     */
    extractFriendIdFromCard(friendCard) {
        // 삭제 버튼에서 ID 추출
        const deleteBtn = friendCard.querySelector('[onclick*="deleteFriendGlobal"]');
        if (deleteBtn) {
            const onclick = deleteBtn.getAttribute('onclick');
            const match = onclick.match(/deleteFriendGlobal\('([^']+)'/);
            if (match) {
                return match[1];
            }
        }
        
        // 다른 방법으로 ID 추출 시도
        const dataId = friendCard.getAttribute('data-friend-id');
        if (dataId) {
            return dataId;
        }
        
        return null;
    }

    /**
     * 상태 변화 여부 확인
     * @param {Object} lastStatus 이전 상태
     * @param {Object} currentStatus 현재 상태
     * @returns {boolean} 변화 여부
     */
    hasStatusChanged(lastStatus, currentStatus) {
        if (!lastStatus) {
            return currentStatus.level !== 'normal'; // 첫 확인 시 정상이 아니면 알림
        }
        
        return lastStatus.level !== currentStatus.level;
    }

    /**
     * 알림 전송 여부 판단
     * @param {Object} status 상태 정보
     * @returns {boolean} 전송 여부
     */
    shouldSendAlert(status) {
        // 정상 상태는 알림 안함
        if (status.level === 'normal') {
            return false;
        }
        
        // 주의, 경고, 위험 상태는 모두 알림
        return ['warning', 'danger', 'emergency'].includes(status.level);
    }

    /**
     * 상태 변화 알림 전송
     * @param {string} friendId 친구 ID
     * @param {string} friendName 친구 이름
     * @param {Object} status 상태 정보
     */
    async sendStatusChangeAlert(friendId, friendName, status) {
        try {
            if (!this.enhancedNotifier) {
                console.warn('⚠️ [생명구조] Enhanced Notification Manager 없음');
                return;
            }

            // 알림 데이터 구성
            const alertData = {
                friendId: friendId,
                friendName: friendName,
                alertLevel: status.level,
                message: this.buildAlertMessage(friendName, status),
                currentUserId: window.auth.getCurrentUser()?.id,
                timeSinceLastActivity: status.timeText || '알 수 없음',
                statusIcon: status.icon,
                timestamp: Date.now()
            };

            console.log(`🚨 [생명구조] 상태 변화 알림 전송: ${friendName} - ${status.level}`);
            
            // 강화된 알림 전송
            const result = await this.enhancedNotifier.sendEnhancedAlert(alertData);
            
            if (result.success) {
                console.log(`✅ [생명구조] 알림 전송 성공: ${friendName}`);
            } else {
                console.error(`❌ [생명구조] 알림 전송 실패: ${friendName} - ${result.reason}`);
            }

        } catch (error) {
            console.error('❌ [생명구조] 상태 변화 알림 전송 실패:', error);
        }
    }

    /**
     * 알림 메시지 구성
     * @param {string} friendName 친구 이름
     * @param {Object} status 상태 정보
     * @returns {string} 알림 메시지
     */
    buildAlertMessage(friendName, status) {
        switch (status.level) {
            case 'warning':
                return `${friendName}님이 24시간 이상 활동하지 않았습니다. 안부를 확인해주세요.`;
            case 'danger':
                return `${friendName}님이 48시간 이상 활동하지 않았습니다. 즉시 연락해주세요!`;
            case 'emergency':
                return `🚨 ${friendName}님이 72시간 이상 활동하지 않았습니다! 긴급 상황일 수 있습니다. 즉시 확인하거나 신고를 고려해주세요.`;
            default:
                return `${friendName}님의 상태를 확인해주세요.`;
        }
    }

    /**
     * 친구 상태 변화 이벤트 핸들러
     * @param {string} friendId 친구 ID
     * @param {Object} statusData 상태 데이터
     */
    async onFriendStatusChange(friendId, statusData) {
        try {
            console.log(`🔄 [생명구조] 친구 상태 변화: ${friendId}`, statusData);
            // 추가 처리가 필요한 경우 여기에 구현
        } catch (error) {
            console.error('❌ [생명구조] 친구 상태 변화 처리 실패:', error);
        }
    }

    /**
     * 친구 목록 변화 이벤트 핸들러
     */
    onFriendsListChange() {
        console.log('👥 [생명구조] 친구 목록 변화 감지');
        // 새로운 친구 카드들의 상태를 즉시 확인
        setTimeout(() => {
            this.checkAllFriendsStatus();
        }, 1000);
    }

    /**
     * 생명구조 관련 알림인지 확인
     * @param {Object} data 알림 데이터
     * @returns {boolean} 생명구조 관련 여부
     */
    isLifeSaverNotification(data) {
        if (!data || !data.type) return false;
        
        const lifeSaverTypes = ['warning', 'danger', 'emergency', 'friend_status'];
        return lifeSaverTypes.includes(data.type);
    }

    /**
     * 알림 강화
     * @param {Object} data 원본 알림 데이터
     */
    async enhanceNotification(data) {
        try {
            if (!this.enhancedNotifier) return;
            
            // 기존 알림 데이터를 Enhanced Notification 형식으로 변환
            const enhancedData = {
                friendId: data.friendId || 'unknown',
                friendName: data.friendName || data.title || '친구',
                alertLevel: data.type || 'warning',
                message: data.message || data.body || '상태를 확인해주세요',
                currentUserId: window.auth?.getCurrentUser()?.id,
                timeSinceLastActivity: data.timeSinceLastActivity || '알 수 없음'
            };
            
            await this.enhancedNotifier.sendEnhancedAlert(enhancedData);
        } catch (error) {
            console.error('❌ [생명구조] 알림 강화 실패:', error);
        }
    }

    /**
     * 시스템 정리
     */
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.statusHistory.clear();
        console.log('🧹 [생명구조] 알림 통합자 정리 완료');
    }

    /**
     * 시스템 상태 확인
     * @returns {Object} 시스템 상태
     */
    getSystemStatus() {
        return {
            초기화됨: this.isInitialized,
            모니터링활성: !!this.monitoringInterval,
            추적중인친구수: this.statusHistory.size,
            확인간격: `${this.checkInterval/1000}초`,
            강화된알림시스템: !!this.enhancedNotifier,
            실시간상태관리자: !!this.realTimeStatus
        };
    }

    /**
     * 테스트 알림 전송
     */
    async sendTestAlert() {
        if (this.enhancedNotifier) {
            return await this.enhancedNotifier.sendTestAlert('warning');
        } else {
            console.error('❌ [생명구조] Enhanced Notification Manager 없음');
            return { success: false, reason: 'Manager 없음' };
        }
    }
}

// 전역 인스턴스 생성 (싱글톤 패턴)
if (typeof window !== 'undefined') {
    window.LifeSaverNotificationIntegrator = window.LifeSaverNotificationIntegrator || new LifeSaverNotificationIntegrator();
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LifeSaverNotificationIntegrator;
}

console.log('🆘 [생명구조] 알림 통합자 로드 완료 - 기존 시스템과 안전하게 연동됨');