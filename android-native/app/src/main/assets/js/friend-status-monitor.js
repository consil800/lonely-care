/**
 * Friend Status Monitor System (Refactored)
 * 친구들의 상태를 모니터링하고 경고 레벨을 표시하는 시스템
 * 
 * 기존 1265줄의 거대한 파일을 모듈별로 분할하여 리팩토링
 */

class FriendStatusMonitor {
    constructor() {
        this.isInitialized = false;
        this.updateInterval = null;
        this.modules = {
            alertLevelManager: null,
            thresholdManager: null,
            statusChecker: null,
            ui: null
        };
    }

    /**
     * 시스템 초기화
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ 친구 상태 모니터링 시스템이 이미 초기화됨');
            return;
        }
        
        console.log('🔍 친구 상태 모니터링 시스템 초기화');
        
        try {
            // 의존성 모듈 확인
            if (!this.checkDependencies()) {
                throw new Error('필수 모듈이 로드되지 않았습니다');
            }
            
            // 모듈 인스턴스 연결
            this.connectModules();
            
            // UI 초기화
            if (this.modules.ui) {
                this.modules.ui.init();
            }
            
            // 주기적 상태 체크 시작
            if (this.modules.statusChecker) {
                this.modules.statusChecker.startPeriodicCheck(5); // 5분마다
            }
            
            this.isInitialized = true;
            console.log('✅ 친구 상태 모니터링 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 친구 상태 모니터링 시스템 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 의존성 모듈 확인
     */
    checkDependencies() {
        const requiredModules = [
            'alertLevelManager',
            'notificationThresholdManager', 
            'friendStatusChecker',
            'friendStatusUI'
        ];
        
        const missing = [];
        
        for (const moduleName of requiredModules) {
            if (!window[moduleName]) {
                missing.push(moduleName);
            }
        }
        
        if (missing.length > 0) {
            console.error('❌ 누락된 모듈:', missing);
            return false;
        }
        
        return true;
    }
    
    /**
     * 모듈 인스턴스 연결
     */
    connectModules() {
        this.modules.alertLevelManager = window.alertLevelManager;
        this.modules.thresholdManager = window.notificationThresholdManager;
        this.modules.statusChecker = window.friendStatusChecker;
        this.modules.ui = window.friendStatusUI;
        
        console.log('🔗 모듈 연결 완료');
    }
    
    /**
     * 친구 상태 새로고침
     */
    async refreshFriendStatus() {
        try {
            if (this.modules.ui) {
                await this.modules.ui.loadFriendsStatus();
            }
            
            if (this.modules.statusChecker) {
                await this.modules.statusChecker.checkAndSendNotifications();
            }
            
            console.log('🔄 친구 상태 새로고침 완료');
            
        } catch (error) {
            console.error('❌ 친구 상태 새로고침 실패:', error);
        }
    }
    
    /**
     * 친구 상태 로딩 (main.js 호환성을 위한 메서드)
     */
    async loadFriendsStatus() {
        try {
            if (this.modules.ui && this.modules.ui.loadFriendsStatus) {
                return await this.modules.ui.loadFriendsStatus();
            } else {
                console.warn('⚠️ UI 모듈이나 loadFriendsStatus 메서드가 없습니다');
                return [];
            }
        } catch (error) {
            console.error('❌ 친구 상태 로딩 실패:', error);
            return [];
        }
    }
    
    /**
     * 알림 임계값 업데이트
     */
    async updateNotificationThresholds(newThresholds) {
        try {
            if (!this.modules.thresholdManager) {
                throw new Error('Threshold Manager가 초기화되지 않았습니다');
            }
            
            const validation = this.modules.thresholdManager.validateThresholds(newThresholds);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            await this.modules.thresholdManager.updateNotificationThresholds(newThresholds);
            
            // Alert Level Manager에도 업데이트 반영
            if (this.modules.alertLevelManager) {
                this.modules.alertLevelManager.updateThresholds(newThresholds);
            }
            
            console.log('✅ 알림 임계값 업데이트 완료');
            return true;
            
        } catch (error) {
            console.error('❌ 알림 임계값 업데이트 실패:', error);
            return false;
        }
    }
    
    /**
     * 특정 친구의 상태 체크
     */
    async checkSpecificFriend(friendId) {
        try {
            if (!this.modules.statusChecker) {
                throw new Error('Status Checker가 초기화되지 않았습니다');
            }
            
            const friends = await this.modules.statusChecker.getFriendsWithStatus(
                JSON.parse(localStorage.getItem('currentUser') || '{}').kakao_id
            );
            
            const friend = friends.find(f => f.id === friendId);
            if (!friend) {
                throw new Error('친구를 찾을 수 없습니다');
            }
            
            const thresholds = await this.modules.thresholdManager.getNotificationThresholds();
            const alertLevel = await this.modules.statusChecker.checkFriendStatus(friend, thresholds);
            
            console.log(`📊 ${friend.name} 상태: ${alertLevel}`);
            return { friend, alertLevel };
            
        } catch (error) {
            console.error('❌ 특정 친구 상태 체크 실패:', error);
            throw error;
        }
    }
    
    /**
     * 시스템 정리
     */
    cleanup() {
        try {
            // 주기적 체크 중지
            if (this.modules.statusChecker) {
                this.modules.statusChecker.stopPeriodicCheck();
            }
            
            // 기타 정리 작업
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            this.isInitialized = false;
            console.log('🧹 친구 상태 모니터링 시스템 정리 완료');
            
        } catch (error) {
            console.error('❌ 시스템 정리 실패:', error);
        }
    }
    
    /**
     * 디버그 정보 출력
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            modules: Object.keys(this.modules).map(key => ({
                name: key,
                loaded: !!this.modules[key]
            })),
            dependencies: [
                'alertLevelManager',
                'notificationThresholdManager',
                'friendStatusChecker', 
                'friendStatusUI'
            ].map(name => ({
                name,
                available: !!window[name]
            }))
        };
    }
}

// 전역 인스턴스 생성 (호환성 유지)
window.friendStatusMonitor = new FriendStatusMonitor();

// 레거시 호환성을 위한 전역 함수들
window.loadFriendsStatus = () => window.friendStatusMonitor.refreshFriendStatus();
window.checkAndSendNotifications = () => window.friendStatusMonitor.modules.statusChecker?.checkAndSendNotifications();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendStatusMonitor;
}

console.log('📦 Friend Status Monitor (Refactored) 로딩 완료');