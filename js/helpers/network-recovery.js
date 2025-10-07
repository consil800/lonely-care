/**
 * 네트워크 오류 복구 메커니즘
 * 인터넷 연결 문제 시 자동 재시도, 오프라인 모드, 데이터 동기화 등을 제공
 */
class NetworkRecoveryManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 5;
        this.reconnectionDelay = 1000; // 초기 지연시간 1초
        this.maxReconnectionDelay = 30000; // 최대 지연시간 30초
        
        // 오프라인 작업 큐
        this.offlineQueue = [];
        this.maxOfflineQueueSize = 100;
        
        // 네트워크 상태 리스너들
        this.statusListeners = new Set();
        
        // 연결 품질 모니터링
        this.connectionQuality = 'unknown';
        this.lastLatencyTest = 0;
        this.latencyHistory = [];
        
        // 복구 통계
        this.stats = {
            totalDisconnections: 0,
            totalReconnections: 0,
            offlineQueueExecutions: 0,
            averageRecoveryTime: 0
        };
        
        this.initialize();
    }
    
    /**
     * 네트워크 복구 시스템 초기화
     */
    initialize() {
        this.setupNetworkListeners();
        this.startConnectionMonitoring();
        this.setupPeriodicHealthCheck();
        
        console.log('🌐 네트워크 복구 시스템 초기화 완료');
    }
    
    /**
     * 네트워크 이벤트 리스너 설정
     */
    setupNetworkListeners() {
        // 온라인/오프라인 이벤트
        window.addEventListener('online', () => {
            this.handleOnlineEvent();
        });
        
        window.addEventListener('offline', () => {
            this.handleOfflineEvent();
        });
        
        // 페이지 가시성 변화 (백그라운드에서 복귀 시)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkConnectionStatus();
            }
        });
        
        // 포커스 복귀 시 연결 확인
        window.addEventListener('focus', () => {
            this.checkConnectionStatus();
        });
    }
    
    /**
     * 온라인 상태로 변경 시 처리
     */
    async handleOnlineEvent() {
        console.log('📶 네트워크 연결 복구 감지');
        
        const wasOffline = !this.isOnline;
        this.isOnline = true;
        this.reconnectionAttempts = 0;
        
        if (wasOffline) {
            const recoveryStartTime = Date.now();
            
            // 연결 품질 재테스트
            await this.testConnectionQuality();
            
            // 오프라인 큐 처리
            await this.processOfflineQueue();
            
            // 실패한 작업들 재시도
            await this.retryFailedOperations();
            
            // 데이터 동기화
            await this.syncOfflineData();
            
            const recoveryTime = Date.now() - recoveryStartTime;
            this.updateRecoveryStats(recoveryTime);
            
            this.notifyStatusListeners('online');
            
            if (window.NotificationHelper) {
                NotificationHelper.showSuccess('network', '인터넷 연결이 복구되었습니다');
            }
        }
    }
    
    /**
     * 오프라인 상태로 변경 시 처리
     */
    handleOfflineEvent() {
        console.log('📵 네트워크 연결 끊어짐 감지');
        
        this.isOnline = false;
        this.stats.totalDisconnections++;
        
        // 재연결 시도 시작
        this.startReconnectionAttempts();
        
        this.notifyStatusListeners('offline');
        
        if (window.NotificationHelper) {
            NotificationHelper.showWarning('인터넷 연결이 끊어졌습니다. 자동으로 재연결을 시도합니다.');
        }
    }
    
    /**
     * 재연결 시도 시작
     */
    async startReconnectionAttempts() {
        if (this.isOnline) return;
        
        this.reconnectionAttempts++;
        
        if (this.reconnectionAttempts > this.maxReconnectionAttempts) {
            console.log('🚫 최대 재연결 시도 횟수 초과');
            this.handleMaxReconnectionAttemptsReached();
            return;
        }
        
        const delay = Math.min(
            this.reconnectionDelay * Math.pow(2, this.reconnectionAttempts - 1),
            this.maxReconnectionDelay
        );
        
        console.log(`🔄 재연결 시도 ${this.reconnectionAttempts}/${this.maxReconnectionAttempts} (${delay}ms 후)`);
        
        setTimeout(async () => {
            const isConnected = await this.testConnection();
            
            if (isConnected) {
                // 수동으로 온라인 이벤트 트리거
                this.handleOnlineEvent();
            } else {
                // 다음 재연결 시도
                this.startReconnectionAttempts();
            }
        }, delay);
    }
    
    /**
     * 연결 상태 테스트
     * @returns {Promise<boolean>} 연결 여부
     */
    async testConnection() {
        // 로컬 서버 환경에서는 항상 온라인으로 처리
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            return true;
        }
        
        try {
            // Supabase 연결 테스트 우선
            if (window.storage?.supabase?.client) {
                await window.storage.supabase.client
                    .from('users')
                    .select('id')
                    .limit(1);
                return true;
            }
            
            // 대체 연결 테스트 (Google DNS)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://dns.google/', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return true; // no-cors 모드에서는 응답 상태를 확인할 수 없음
            
        } catch (error) {
            console.warn('🌐 네트워크 연결 테스트 실패:', error.message);
            
            // 🚨 생명구조 시스템: 강화된 오프라인 대응
            // 최근 온라인 시간을 확인하여 일시적 문제인지 판단
            const lastOnlineTime = localStorage.getItem('lastOnlineTime');
            if (!lastOnlineTime) {
                localStorage.setItem('lastOnlineTime', Date.now().toString());
            }
            
            // DNS 해결 실패여도 기본 생명구조 기능 유지
            console.log('📵 네트워크 불안정 - 오프라인 모드로 전환 (생명구조 기능 유지)');
            return false; // 확실한 오프라인 상태로 처리
        }
    }
    
    /**
     * 연결 품질 테스트
     */
    async testConnectionQuality() {
        if (!this.isOnline) return;
        
        const startTime = Date.now();
        
        try {
            await this.testConnection();
            const latency = Date.now() - startTime;
            
            this.latencyHistory.push({
                latency,
                timestamp: Date.now()
            });
            
            // 최근 10개 기록만 유지
            if (this.latencyHistory.length > 10) {
                this.latencyHistory = this.latencyHistory.slice(-10);
            }
            
            // 연결 품질 분류
            if (latency < 100) {
                this.connectionQuality = 'excellent';
            } else if (latency < 300) {
                this.connectionQuality = 'good';
            } else if (latency < 1000) {
                this.connectionQuality = 'poor';
            } else {
                this.connectionQuality = 'very_poor';
            }
            
            this.lastLatencyTest = Date.now();
            
            console.log(`🚀 연결 품질: ${this.connectionQuality} (${latency}ms)`);
            
        } catch (error) {
            this.connectionQuality = 'unknown';
        }
    }
    
    /**
     * 작업을 오프라인 큐에 추가
     * @param {Object} operation - 실행할 작업
     */
    queueOfflineOperation(operation) {
        if (this.offlineQueue.length >= this.maxOfflineQueueSize) {
            // 오래된 작업 제거
            this.offlineQueue.shift();
            console.warn('오프라인 큐 크기 제한으로 오래된 작업 제거');
        }
        
        this.offlineQueue.push({
            ...operation,
            queuedAt: Date.now()
        });
        
        console.log(`📝 오프라인 작업 큐에 추가: ${operation.type || 'unknown'} (큐 크기: ${this.offlineQueue.length})`);
    }
    
    /**
     * 오프라인 큐 처리
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`🔄 오프라인 큐 처리 시작: ${this.offlineQueue.length}개 작업`);
        
        const operations = [...this.offlineQueue];
        this.offlineQueue.length = 0; // 큐 비우기
        
        let successCount = 0;
        let failCount = 0;
        
        for (const operation of operations) {
            try {
                await this.executeOfflineOperation(operation);
                successCount++;
            } catch (error) {
                console.warn('오프라인 작업 실행 실패:', operation, error);
                failCount++;
                
                // 중요한 작업은 다시 큐에 추가
                if (operation.priority === 'high') {
                    this.queueOfflineOperation(operation);
                }
            }
        }
        
        this.stats.offlineQueueExecutions++;
        
        console.log(`✅ 오프라인 큐 처리 완료: 성공 ${successCount}, 실패 ${failCount}`);
        
        if (successCount > 0 && window.NotificationHelper) {
            NotificationHelper.showInfo(`오프라인 중 대기된 ${successCount}개 작업이 처리되었습니다`);
        }
    }
    
    /**
     * 오프라인 작업 실행
     * @param {Object} operation - 실행할 작업
     */
    async executeOfflineOperation(operation) {
        switch (operation.type) {
            case 'status_update':
                return await this.retryStatusUpdate(operation.data);
                
            case 'friend_action':
                return await this.retryFriendAction(operation.data);
                
            case 'profile_update':
                return await this.retryProfileUpdate(operation.data);
                
            case 'custom':
                return await operation.execute();
                
            default:
                console.warn('알 수 없는 오프라인 작업 타입:', operation.type);
        }
    }
    
    /**
     * 상태 업데이트 재시도
     * @param {Object} statusData - 상태 데이터
     */
    async retryStatusUpdate(statusData) {
        if (!window.storage?.supabase?.client) {
            throw new Error('Supabase 클라이언트 없음');
        }
        
        const { error } = await window.storage.supabase.client
            .from('user_status')
            .upsert(statusData);
        
        if (error) throw error;
        
        console.log('✅ 상태 업데이트 재시도 성공');
    }
    
    /**
     * 친구 액션 재시도
     * @param {Object} actionData - 액션 데이터
     */
    async retryFriendAction(actionData) {
        // 친구 추가/삭제 등의 작업 재시도
        console.log('🤝 친구 액션 재시도:', actionData.action);
        // 구체적인 구현은 필요에 따라 추가
    }
    
    /**
     * 프로필 업데이트 재시도
     * @param {Object} profileData - 프로필 데이터
     */
    async retryProfileUpdate(profileData) {
        console.log('👤 프로필 업데이트 재시도');
        // 구체적인 구현은 필요에 따라 추가
    }
    
    /**
     * 실패한 작업들 재시도
     */
    async retryFailedOperations() {
        console.log('🔄 실패한 네트워크 작업들 재시도');
        
        // NetworkOptimizer 캐시 무효화
        if (window.networkOptimizer) {
            window.networkOptimizer.invalidateCache('');
        }
        
        // AsyncOptimizer 실패 큐 재시도
        if (window.asyncOptimizer) {
            // 중요한 데이터 재로드
            if (window.auth?.isLoggedIn()) {
                const currentUser = window.auth.getCurrentUser();
                if (currentUser) {
                    await window.asyncOptimizer.urgent(async () => {
                        return await window.networkOptimizer?.fetchFriendsData(currentUser.id);
                    }, { name: 'NetworkRecovery-FriendsData' });
                }
            }
        }
    }
    
    /**
     * 오프라인 데이터 동기화
     */
    async syncOfflineData() {
        console.log('🔄 오프라인 데이터 동기화 시작');
        
        try {
            // 로컬 저장소의 변경사항 확인
            const pendingChanges = this.collectPendingChanges();
            
            if (pendingChanges.length > 0) {
                console.log(`📊 동기화할 변경사항: ${pendingChanges.length}개`);
                
                // 배치로 동기화
                if (window.networkOptimizer) {
                    await window.networkOptimizer.batchStatusUpdate(pendingChanges);
                }
            }
            
            console.log('✅ 오프라인 데이터 동기화 완료');
            
        } catch (error) {
            console.error('❌ 데이터 동기화 실패:', error);
        }
    }
    
    /**
     * 대기 중인 변경사항 수집
     * @returns {Array} 대기 중인 변경사항들
     */
    collectPendingChanges() {
        const changes = [];
        
        // 예시: 로컬스토리지에서 동기화 대기 중인 항목들 수집
        const pendingStatusUpdates = StorageHelper?.get('pending_status_updates') || [];
        changes.push(...pendingStatusUpdates);
        
        // 동기화 후 대기 목록 정리
        StorageHelper?.remove('pending_status_updates');
        
        return changes;
    }
    
    /**
     * 최대 재연결 시도 횟수 도달 시 처리
     */
    handleMaxReconnectionAttemptsReached() {
        console.log('🚫 네트워크 재연결 포기, 오프라인 모드로 전환');
        
        if (window.NotificationHelper) {
            NotificationHelper.showError(
                '네트워크 연결을 복구할 수 없습니다. 오프라인 모드로 동작합니다.',
                'network_recovery'
            );
        }
        
        // 오프라인 모드 활성화
        this.enableOfflineMode();
    }
    
    /**
     * 오프라인 모드 활성화
     */
    enableOfflineMode() {
        console.log('📱 오프라인 모드 활성화');
        
        // UI에 오프라인 표시 추가
        this.showOfflineIndicator();
        
        // 불필요한 네트워크 작업 비활성화
        this.disableNetworkIntensiveFeatures();
        
        // 로컬 데이터로만 동작하도록 설정
        this.enableLocalOnlyMode();
    }
    
    /**
     * 오프라인 표시기 표시
     */
    showOfflineIndicator() {
        let indicator = document.getElementById('offline-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.innerHTML = '📵 오프라인 모드';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff6b6b;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10001;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(indicator);
        }
    }
    
    /**
     * 오프라인 표시기 숨기기
     */
    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    /**
     * 네트워크 집약적 기능 비활성화
     */
    disableNetworkIntensiveFeatures() {
        // 자동 새로고침 중단
        if (window.motionDetector?.statusInterval) {
            clearInterval(window.motionDetector.statusInterval);
        }
        
        // 이미지 프리로딩 중단
        // 기타 네트워크 작업 최소화
    }
    
    /**
     * 로컬 전용 모드 활성화
     */
    enableLocalOnlyMode() {
        // 로컬 데이터만 사용하도록 설정
        // 캐시된 데이터 우선 사용
        console.log('💾 로컬 전용 모드 활성화');
    }
    
    /**
     * 연결 상태 모니터링 시작
     */
    startConnectionMonitoring() {
        // 1분마다 연결 품질 테스트
        setInterval(() => {
            if (this.isOnline) {
                this.testConnectionQuality();
            }
        }, 60000);
    }
    
    /**
     * 주기적 헬스체크 설정
     */
    setupPeriodicHealthCheck() {
        // 로컬 서버 환경에서는 헬스체크 비활성화
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            console.log('🏠 로컬 환경 - 네트워크 헬스체크 비활성화');
            return;
        }
        
        // 5분마다 연결 상태 확인 (30초 → 5분으로 변경)
        setInterval(() => {
            this.checkConnectionStatus();
        }, 5 * 60 * 1000);
    }
    
    /**
     * 연결 상태 확인
     */
    async checkConnectionStatus() {
        const actuallyOnline = await this.testConnection();
        
        if (actuallyOnline !== this.isOnline) {
            console.log(`🔄 실제 연결 상태와 다름: 현재 ${this.isOnline}, 실제 ${actuallyOnline}`);
            
            if (actuallyOnline) {
                this.handleOnlineEvent();
            } else {
                this.handleOfflineEvent();
            }
        }
    }
    
    /**
     * 상태 리스너 추가
     * @param {Function} listener - 상태 변화 리스너
     */
    addStatusListener(listener) {
        this.statusListeners.add(listener);
    }
    
    /**
     * 상태 리스너 제거
     * @param {Function} listener - 제거할 리스너
     */
    removeStatusListener(listener) {
        this.statusListeners.delete(listener);
    }
    
    /**
     * 상태 리스너들에게 알림
     * @param {string} status - 상태 (online/offline)
     */
    notifyStatusListeners(status) {
        this.statusListeners.forEach(listener => {
            try {
                listener(status, this.getNetworkInfo());
            } catch (error) {
                console.error('상태 리스너 오류:', error);
            }
        });
    }
    
    /**
     * 복구 통계 업데이트
     * @param {number} recoveryTime - 복구 시간
     */
    updateRecoveryStats(recoveryTime) {
        this.stats.totalReconnections++;
        
        // 평균 복구 시간 계산
        this.stats.averageRecoveryTime = 
            ((this.stats.averageRecoveryTime * (this.stats.totalReconnections - 1)) + recoveryTime) / 
            this.stats.totalReconnections;
        
        console.log(`📊 네트워크 복구 완료: ${recoveryTime}ms (평균: ${Math.round(this.stats.averageRecoveryTime)}ms)`);
    }
    
    /**
     * 네트워크 정보 조회
     * @returns {Object} 네트워크 정보
     */
    getNetworkInfo() {
        return {
            isOnline: this.isOnline,
            connectionQuality: this.connectionQuality,
            reconnectionAttempts: this.reconnectionAttempts,
            offlineQueueSize: this.offlineQueue.length,
            latencyHistory: this.latencyHistory.slice(-5), // 최근 5개
            stats: { ...this.stats }
        };
    }
    
    /**
     * 강제 재연결 시도
     */
    async forceReconnect() {
        console.log('🔄 강제 재연결 시도');
        
        this.reconnectionAttempts = 0;
        await this.checkConnectionStatus();
        
        if (!this.isOnline) {
            this.startReconnectionAttempts();
        }
    }
    
    /**
     * 오프라인 큐 정리
     */
    clearOfflineQueue() {
        const clearedCount = this.offlineQueue.length;
        this.offlineQueue.length = 0;
        console.log(`🗑️ 오프라인 큐 정리: ${clearedCount}개 작업 삭제`);
    }
}

// 전역 인스턴스 생성
window.networkRecoveryManager = new NetworkRecoveryManager();

// 기존 ErrorHandler와 통합
if (window.ErrorHandler) {
    // 네트워크 오류 발생 시 복구 매니저에 알림
    const originalHandleNetworkError = ErrorHandler.handleNetworkError;
    ErrorHandler.handleNetworkError = function(error, operation) {
        // 기존 처리
        const message = originalHandleNetworkError.call(this, error, operation);
        
        // 네트워크 오류 시 복구 시도
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            window.networkRecoveryManager.forceReconnect();
        }
        
        return message;
    };
}

console.log('🌐 NetworkRecoveryManager 초기화 완료');