/**
 * 친구 매니저 - 친구 관련 기능 통합 관리
 * 기존 invite-code.js, friend-status-monitor.js 기능을 안전하게 래핑
 */
class FriendManager {
    constructor() {
        this.friends = [];
        this.inviteManager = null;
        this.statusMonitor = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    log(message) {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] FriendManager: ${message}`);
    }
    
    /**
     * 기존 친구 관련 시스템들과 연결
     */
    async init() {
        try {
            // 기존 시스템들 로드 대기
            await this.waitForExistingSystems();
            
            // 기존 전역 객체들과 연결
            this.inviteManager = window.inviteCodeManager;
            this.statusMonitor = window.friendStatusMonitor;
            
            this.isInitialized = true;
            this.log('✅ 기존 친구 관리 시스템들과 연결 완료');
            
            // 초기 친구 목록 로드
            await this.loadFriends();
            
            this.emit('ready');
            
        } catch (error) {
            this.log('❌ 친구 관리 시스템 초기화 실패: ' + error.message);
        }
    }
    
    /**
     * 기존 시스템들 로드 대기
     */
    waitForExistingSystems() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 150; // 15초 대기
            
            const check = () => {
                const hasInvite = window.inviteCodeManager && typeof window.inviteCodeManager === 'object';
                const hasStatus = window.friendStatusMonitor && typeof window.friendStatusMonitor === 'object';
                
                if (hasInvite && hasStatus) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(check, 100);
                } else {
                    // 부분적 초기화라도 허용
                    this.log('⚠️ 일부 시스템만 로드됨 (부분 초기화)');
                    resolve();
                }
            };
            
            check();
        });
    }
    
    /**
     * 친구 목록 로드 (기존 로직 보호)
     */
    async loadFriends() {
        try {
            if (this.inviteManager && typeof this.inviteManager.loadFriends === 'function') {
                // 기존 invite manager의 친구 로드 함수 사용
                await this.inviteManager.loadFriends();
                this.log('✅ 기존 시스템을 통한 친구 목록 로드 완료');
            }
            
            // 친구 목록 동기화
            await this.syncFriendsList();
            
        } catch (error) {
            this.log('❌ 친구 목록 로드 실패: ' + error.message);
        }
    }
    
    /**
     * 친구 목록 동기화
     */
    async syncFriendsList() {
        try {
            // 기존 전역 변수에서 친구 목록 가져오기
            if (window.friends && Array.isArray(window.friends)) {
                this.friends = [...window.friends];
                this.log(`✅ 친구 목록 동기화 완료: ${this.friends.length}명`);
                this.emit('friendsUpdated', this.friends);
            }
        } catch (error) {
            this.log('❌ 친구 목록 동기화 실패: ' + error.message);
        }
    }
    
    /**
     * 친구 상태 조회 (기존 로직 보호)
     */
    async getFriendStatus() {
        try {
            if (this.statusMonitor && typeof this.statusMonitor.loadFriendStatus === 'function') {
                // 기존 status monitor 함수 사용
                await this.statusMonitor.loadFriendStatus();
                this.log('✅ 친구 상태 조회 완료');
                return this.statusMonitor.friendsData || [];
            }
            return [];
        } catch (error) {
            this.log('❌ 친구 상태 조회 실패: ' + error.message);
            return [];
        }
    }
    
    /**
     * 초대 코드 생성 (기존 로직 보호)
     */
    async generateInviteCode() {
        try {
            if (this.inviteManager && typeof this.inviteManager.generateNewCode === 'function') {
                const code = await this.inviteManager.generateNewCode();
                this.log('✅ 초대 코드 생성 완료');
                this.emit('inviteCodeGenerated', code);
                return code;
            }
            throw new Error('초대 매니저를 사용할 수 없음');
        } catch (error) {
            this.log('❌ 초대 코드 생성 실패: ' + error.message);
            throw error;
        }
    }
    
    /**
     * 친구 추가 (기존 로직 보호)
     */
    async addFriend(inviteCode) {
        try {
            if (this.inviteManager && typeof this.inviteManager.addFriendByCode === 'function') {
                const result = await this.inviteManager.addFriendByCode(inviteCode);
                this.log('✅ 친구 추가 완료');
                
                // 친구 목록 재로드
                await this.syncFriendsList();
                
                this.emit('friendAdded', result);
                return result;
            }
            throw new Error('초대 매니저를 사용할 수 없음');
        } catch (error) {
            this.log('❌ 친구 추가 실패: ' + error.message);
            throw error;
        }
    }
    
    /**
     * 친구 목록 가져오기
     */
    getFriends() {
        return this.friends;
    }
    
    /**
     * 특정 친구 정보 가져오기
     */
    getFriend(friendId) {
        return this.friends.find(friend => friend.id === friendId || friend.friend_id === friendId);
    }
    
    /**
     * 친구 수 가져오기
     */
    getFriendCount() {
        return this.friends.length;
    }
    
    /**
     * 무응답 친구 목록 (상태 기반)
     */
    getInactiveFriends(hoursThreshold = 24) {
        try {
            if (this.statusMonitor && this.statusMonitor.friendsData) {
                return this.statusMonitor.friendsData.filter(friend => 
                    friend.hours_since_heartbeat >= hoursThreshold
                );
            }
            return [];
        } catch (error) {
            this.log('❌ 무응답 친구 조회 실패: ' + error.message);
            return [];
        }
    }
    
    /**
     * 친구 상태 실시간 모니터링 시작
     */
    startStatusMonitoring() {
        try {
            if (this.statusMonitor && typeof this.statusMonitor.startMonitoring === 'function') {
                this.statusMonitor.startMonitoring();
                this.log('✅ 친구 상태 모니터링 시작');
            }
        } catch (error) {
            this.log('❌ 상태 모니터링 시작 실패: ' + error.message);
        }
    }
    
    /**
     * 이벤트 발생
     */
    emit(eventName, data) {
        const event = new CustomEvent(`friends:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }
    
    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback) {
        window.addEventListener(`friends:${eventName}`, (e) => callback(e.detail));
    }
    
    /**
     * 시스템 상태 확인
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            friendCount: this.friends.length,
            inviteManager: !!this.inviteManager,
            statusMonitor: !!this.statusMonitor,
            timestamp: new Date().toISOString()
        };
    }
}

// 전역으로 내보내기
window.FriendManager = FriendManager;