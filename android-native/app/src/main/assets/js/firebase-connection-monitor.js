/**
 * 🔥 Firebase 연결 상태 모니터링 시스템 - 생명구조 앱 전용
 * 
 * 목적: Firebase 연결 상태를 실시간으로 모니터링하고 연결 문제 시 대응
 * 특징:
 * - 실시간 연결 상태 감지
 * - 자동 재연결 시도
 * - 사용자 알림 제공
 * - 생명구조 앱 안정성 보장
 * 
 * @author AI Assistant
 * @version 1.0.0 (생명구조 최적화)
 * @since 2025-01-01
 */

class FirebaseConnectionMonitor {
    constructor() {
        this.isConnected = false;
        this.isMonitoring = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000; // 3초
        this.healthCheckInterval = 30000; // 30초마다 헬스체크
        this.lastHealthCheck = null;
        this.listeners = [];
        this.healthCheckTimer = null;
        this.reconnectTimer = null;
        
        // 연결 상태 UI 요소
        this.connectionStatusElement = null;
        this.createStatusUI();
        
        console.log('🔥 [생명구조] Firebase 연결 모니터 생성됨');
    }

    /**
     * 연결 상태 표시 UI 생성
     */
    createStatusUI() {
        // 연결 상태 표시 요소가 이미 있는지 확인
        this.connectionStatusElement = document.getElementById('firebase-connection-status');
        
        if (!this.connectionStatusElement) {
            this.connectionStatusElement = document.createElement('div');
            this.connectionStatusElement.id = 'firebase-connection-status';
            this.connectionStatusElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 10000;
                display: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            document.body.appendChild(this.connectionStatusElement);
        }
    }

    /**
     * 연결 상태 UI 업데이트
     * @param {boolean} connected - 연결 상태
     * @param {string} message - 표시할 메시지
     */
    updateStatusUI(connected, message = '') {
        if (!this.connectionStatusElement) return;

        if (connected) {
            // 연결됨 - UI 숨김
            this.connectionStatusElement.style.display = 'none';
        } else {
            // 연결 끊김 - UI 표시
            this.connectionStatusElement.style.background = 'rgba(220, 53, 69, 0.9)';
            this.connectionStatusElement.innerHTML = `
                🔴 Firebase 연결 끊김
                ${message ? `<br><small>${message}</small>` : ''}
            `;
            this.connectionStatusElement.style.display = 'block';
        }
    }

    /**
     * 연결 상태 변경 이벤트 리스너 등록
     * @param {Function} callback - 상태 변경 시 호출될 콜백 함수
     */
    onConnectionStateChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * 연결 상태 변경 알림
     * @param {boolean} connected - 연결 상태
     * @param {string} reason - 변경 이유
     */
    notifyConnectionStateChange(connected, reason = '') {
        const previousState = this.isConnected;
        this.isConnected = connected;
        
        if (previousState !== connected) {
            console.log(`🔥 [생명구조] Firebase 연결 상태 변경: ${connected ? '연결됨' : '끊어짐'} (${reason})`);
            
            // UI 업데이트
            this.updateStatusUI(connected, reason);
            
            // 리스너들에게 알림
            this.listeners.forEach(callback => {
                try {
                    callback(connected, reason);
                } catch (error) {
                    console.error('❌ [생명구조] 연결 상태 리스너 오류:', error);
                }
            });

            // 연결이 끊어졌을 때 재연결 시도
            if (!connected) {
                this.startReconnectAttempts();
            } else {
                this.reconnectAttempts = 0;
                this.stopReconnectAttempts();
            }
        }
    }

    /**
     * 모니터링 시작
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('🔥 [생명구조] Firebase 연결 모니터링 이미 실행 중');
            return;
        }

        this.isMonitoring = true;
        console.log('🔥 [생명구조] Firebase 연결 모니터링 시작');

        // 초기 상태 확인
        this.performHealthCheck();

        // 정기적인 헬스체크 시작
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);

        // 네트워크 상태 변화 감지
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('🔥 [생명구조] 네트워크 온라인 상태 감지');
                setTimeout(() => this.performHealthCheck(), 1000);
            });

            window.addEventListener('offline', () => {
                console.log('🔥 [생명구조] 네트워크 오프라인 상태 감지');
                this.notifyConnectionStateChange(false, '네트워크 연결 끊김');
            });
        }
    }

    /**
     * 모니터링 중지
     */
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        this.stopReconnectAttempts();
        
        console.log('🔥 [생명구조] Firebase 연결 모니터링 중지');
    }

    /**
     * Firebase 연결 상태 헬스체크 수행
     */
    async performHealthCheck() {
        try {
            this.lastHealthCheck = new Date();
            
            // Firebase 초기화 상태 확인
            if (!window.firebaseInitializer || !window.firebaseInitializer.state.fullyInitialized) {
                this.notifyConnectionStateChange(false, 'Firebase 초기화 대기 중');
                return;
            }

            // Firebase 클라이언트 헬스체크
            if (window.firebaseInitializer && typeof window.firebaseInitializer.healthCheck === 'function') {
                const isHealthy = await window.firebaseInitializer.healthCheck();
                this.notifyConnectionStateChange(isHealthy, isHealthy ? '정상' : '연결 실패');
            } else {
                // 백업: 기본 연결 테스트
                const isConnected = await this.basicConnectionTest();
                this.notifyConnectionStateChange(isConnected, isConnected ? '정상' : '연결 테스트 실패');
            }

        } catch (error) {
            console.warn('🔥 [생명구조] Firebase 헬스체크 오류:', error);
            this.notifyConnectionStateChange(false, '헬스체크 오류');
        }
    }

    /**
     * 기본 연결 테스트
     * @returns {Promise<boolean>} 연결 상태
     */
    async basicConnectionTest() {
        try {
            if (!window.firebaseClient || !window.firebaseClient.isInitialized) {
                return false;
            }

            // 간단한 Firebase 작업 시도
            const testResult = await Promise.race([
                window.firebaseClient.testConnection(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);

            return testResult && testResult.connected === true;
        } catch (error) {
            console.warn('🔥 [생명구조] 기본 연결 테스트 실패:', error);
            return false;
        }
    }

    /**
     * 재연결 시도 시작
     */
    startReconnectAttempts() {
        if (this.reconnectTimer) {
            return; // 이미 재연결 시도 중
        }

        console.log('🔥 [생명구조] Firebase 재연결 시도 시작');
        
        this.reconnectTimer = setTimeout(async () => {
            await this.attemptReconnect();
        }, this.reconnectDelay);
    }

    /**
     * 재연결 시도 중지
     */
    stopReconnectAttempts() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * 재연결 시도 수행
     */
    async attemptReconnect() {
        this.reconnectTimer = null;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [생명구조] Firebase 재연결 최대 시도 횟수 초과');
            this.updateStatusUI(false, '재연결 실패 - 새로고침 필요');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔥 [생명구조] Firebase 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        try {
            // Firebase 초기화 관리자를 통한 재연결
            if (window.firebaseInitializer) {
                const success = await window.firebaseInitializer.initializeWithRetry();
                if (success) {
                    console.log('🔥 [생명구조] Firebase 재연결 성공');
                    this.notifyConnectionStateChange(true, '재연결 성공');
                    return;
                }
            }

            // 재연결 실패 - 다시 시도
            this.updateStatusUI(false, `재연결 시도 중 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.startReconnectAttempts();

        } catch (error) {
            console.warn(`🔥 [생명구조] Firebase 재연결 시도 ${this.reconnectAttempts} 실패:`, error);
            this.updateStatusUI(false, `재연결 시도 중 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.startReconnectAttempts();
        }
    }

    /**
     * 수동 재연결 시도
     * @returns {Promise<boolean>} 재연결 성공 여부
     */
    async forceReconnect() {
        console.log('🔥 [생명구조] 수동 Firebase 재연결 시도');
        this.reconnectAttempts = 0;
        this.stopReconnectAttempts();
        
        try {
            if (window.firebaseInitializer) {
                const success = await window.firebaseInitializer.initializeWithRetry();
                this.notifyConnectionStateChange(success, success ? '수동 재연결 성공' : '수동 재연결 실패');
                return success;
            }
            return false;
        } catch (error) {
            console.error('❌ [생명구조] 수동 Firebase 재연결 실패:', error);
            this.notifyConnectionStateChange(false, '수동 재연결 실패');
            return false;
        }
    }

    /**
     * 현재 연결 상태 반환
     * @returns {Object} 연결 상태 정보
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            isMonitoring: this.isMonitoring,
            reconnectAttempts: this.reconnectAttempts,
            lastHealthCheck: this.lastHealthCheck,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }

    /**
     * 정리 - 메모리 누수 방지
     */
    destroy() {
        this.stopMonitoring();
        
        if (this.connectionStatusElement && this.connectionStatusElement.parentNode) {
            this.connectionStatusElement.parentNode.removeChild(this.connectionStatusElement);
        }
        
        this.listeners = [];
        console.log('🔥 [생명구조] Firebase 연결 모니터 정리 완료');
    }
}

// 전역 Firebase 연결 모니터 인스턴스 생성
if (typeof window !== 'undefined') {
    window.firebaseConnectionMonitor = new FirebaseConnectionMonitor();
    
    // 전역 함수 제공
    window.startFirebaseMonitoring = () => {
        window.firebaseConnectionMonitor.startMonitoring();
    };
    
    window.stopFirebaseMonitoring = () => {
        window.firebaseConnectionMonitor.stopMonitoring();
    };
    
    window.forceFirebaseReconnect = () => {
        return window.firebaseConnectionMonitor.forceReconnect();
    };

    console.log('🔥 [생명구조] Firebase 연결 모니터 준비 완료');
}

// 모듈 내보내기 (필요한 경우)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseConnectionMonitor };
}