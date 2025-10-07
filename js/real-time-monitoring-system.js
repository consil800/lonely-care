/**
 * 🚨 실시간 모니터링 시스템 (생명구조 앱)
 * 사용자 생존 상태 실시간 감시 및 자동복구 시스템
 * 
 * 주요 기능:
 * - 실시간 헬스체크 (하트비트, 움직임, 친구 상태)
 * - 자동 복구 시스템 (연결 재시도, 서비스 재시작)
 * - 다단계 알람 시스템 (주의→경고→위험→응급)
 * - 시스템 모니터링 (성능, 오류, 리소스)
 * - 생명구조 응급 대응 (119 API 연동)
 */

class RealTimeMonitoringSystem {
    constructor() {
        this.className = 'RealTimeMonitoringSystem';
        this.isInitialized = false;
        this.isRunning = false;
        
        // 🚨 생명구조 모니터링 설정
        this.monitoringConfig = {
            // 헬스체크 간격 (밀리초)
            healthCheckInterval: 30000,      // 30초
            heartbeatTimeout: 60000,         // 1분
            motionTimeout: 3600000,          // 1시간
            friendCheckTimeout: 7200000,     // 2시간
            emergencyTimeout: 259200000,     // 72시간 (응급상황)
            
            // 자동복구 설정
            maxRetries: 3,
            retryDelay: 5000,               // 5초
            reconnectDelay: 10000,          // 10초
            
            // 알람 레벨 임계값
            alertThresholds: {
                normal: 0,                  // 정상
                caution: 1800000,          // 30분
                warning: 3600000,          // 1시간
                danger: 7200000,           // 2시간
                emergency: 259200000       // 72시간
            }
        };
        
        // 모니터링 상태 데이터
        this.monitoringState = {
            users: new Map(),              // 사용자별 상태
            systemHealth: {
                firebase: false,
                api119: false,
                notifications: false,
                battery: 100,
                memory: 0,
                lastCheck: null
            },
            alerts: [],                    // 활성 알림
            recoveryActions: []            // 복구 작업 로그
        };
        
        // 타이머 관리
        this.timers = {
            healthCheck: null,
            userMonitoring: null,
            systemMonitoring: null,
            alertProcessor: null
        };
        
        console.log('🚨 [생명구조] 실시간 모니터링 시스템 초기화');
        this.init();
    }
    
    /**
     * 시스템 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] 실시간 모니터링 시스템 초기화 중...');
            
            // Firebase 및 기본 서비스 대기
            await this.waitForDependencies();
            
            // 시스템 헬스체크 시작
            this.startSystemHealthCheck();
            
            // 사용자 모니터링 시작
            this.startUserMonitoring();
            
            // 알림 프로세서 시작
            this.startAlertProcessor();
            
            // 자동복구 시스템 시작
            this.startAutoRecovery();
            
            // 성능 모니터링 시작
            this.startPerformanceMonitoring();
            
            this.isInitialized = true;
            this.isRunning = true;
            
            console.log('✅ [생명구조] 실시간 모니터링 시스템 초기화 완료');
            this.logSystemEvent('SYSTEM_STARTED', '실시간 모니터링 시스템 시작됨');
            
        } catch (error) {
            console.error('❌ [생명구조] 실시간 모니터링 시스템 초기화 실패:', error);
            this.handleCriticalError('INIT_FAILED', error);
        }
    }
    
    /**
     * 의존성 서비스 대기
     */
    async waitForDependencies() {
        const dependencies = [
            { name: 'Firebase', check: () => window.firebaseDb },
            { name: 'FriendStatusChecker', check: () => window.friendStatusChecker },
            { name: 'NotificationManager', check: () => window.notificationManager },
            { name: 'API119Client', check: () => window.api119Client }
        ];
        
        for (const dep of dependencies) {
            await this.waitForService(dep.name, dep.check);
        }
    }
    
    /**
     * 개별 서비스 대기 (개선된 버전)
     */
    async waitForService(serviceName, checkFunction, maxWait = 30000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let checkCount = 0;
            const maxChecks = 10; // 최대 10번 체크 (Android WebView 고려)
            
            const checkService = () => {
                try {
                    if (checkFunction()) {
                        console.log(`✅ [생명구조] ${serviceName} 서비스 연결 확인됨`);
                        resolve();
                        return;
                    }
                    
                    checkCount++;
                    
                    if (Date.now() - startTime > maxWait || checkCount >= maxChecks) {
                        // 조용하게 로그 레벨 낮춤
                        if (checkCount >= maxChecks) {
                            console.log(`🔄 [생명구조] ${serviceName} 서비스 대기 중 - 백그라운드에서 계속 시도`);
                        }
                        resolve(); // 타임아웃되어도 진행 (복구 시스템이 처리)
                        return;
                    }
                    
                    // 점진적으로 체크 간격 늘리기
                    const nextInterval = Math.min(1000 * checkCount, 3000);
                    setTimeout(checkService, nextInterval);
                } catch (error) {
                    // 오류는 조용하게 처리
                    checkCount++;
                    if (checkCount < maxChecks) {
                        setTimeout(checkService, 2000);
                    } else {
                        resolve(); // 최대 시도 후 진행
                    }
                }
            };
            
            checkService();
        });
    }
    
    /**
     * 시스템 헬스체크 시작
     */
    startSystemHealthCheck() {
        this.timers.healthCheck = setInterval(() => {
            this.performSystemHealthCheck();
        }, this.monitoringConfig.healthCheckInterval);
        
        // 즉시 첫 체크 실행
        this.performSystemHealthCheck();
    }
    
    /**
     * 시스템 헬스체크 수행
     */
    async performSystemHealthCheck() {
        try {
            const healthStatus = {
                timestamp: new Date().toISOString(),
                firebase: await this.checkFirebaseHealth(),
                api119: await this.checkAPI119Health(),
                notifications: await this.checkNotificationHealth(),
                battery: await this.checkBatteryStatus(),
                memory: this.getMemoryUsage(),
                performance: this.getPerformanceMetrics()
            };
            
            this.monitoringState.systemHealth = {
                ...healthStatus,
                lastCheck: healthStatus.timestamp,
                overall: this.calculateOverallHealth(healthStatus)
            };
            
            // 시스템 이슈 감지 시 자동복구 시도
            if (!healthStatus.overall) {
                this.triggerAutoRecovery('SYSTEM_HEALTH_FAILED', healthStatus);
            }
            
            console.log('🏥 [생명구조] 시스템 헬스체크 완료:', healthStatus.overall ? '정상' : '이상');
            
        } catch (error) {
            console.error('❌ [생명구조] 시스템 헬스체크 실패:', error);
            this.handleSystemError('HEALTH_CHECK_FAILED', error);
        }
    }
    
    /**
     * Firebase 연결 상태 확인
     */
    async checkFirebaseHealth() {
        try {
            if (!window.firebaseDb) return false;
            
            // 실제 쿼리로 연결 테스트
            await window.firebaseDb.collection('system_health').doc('test').get();
            return true;
        } catch (error) {
            console.warn('⚠️ [생명구조] Firebase 연결 이상:', error);
            return false;
        }
    }
    
    /**
     * 119 API 상태 확인
     */
    async checkAPI119Health() {
        try {
            if (!window.api119Client) return false;
            return await window.api119Client.testConnection();
        } catch (error) {
            console.warn('⚠️ [생명구조] 119 API 연결 이상:', error);
            return false;
        }
    }
    
    /**
     * 알림 시스템 상태 확인
     */
    async checkNotificationHealth() {
        try {
            if (!window.notificationManager) return false;
            return window.notificationManager.isReady();
        } catch (error) {
            console.warn('⚠️ [생명구조] 알림 시스템 이상:', error);
            return false;
        }
    }
    
    /**
     * 배터리 상태 확인
     */
    async checkBatteryStatus() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return Math.round(battery.level * 100);
            }
            return 100; // 배터리 API 미지원시 100% 가정
        } catch (error) {
            return 100;
        }
    }
    
    /**
     * 메모리 사용량 확인
     */
    getMemoryUsage() {
        try {
            if ('memory' in performance) {
                const memory = performance.memory;
                return Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * 성능 지표 측정
     */
    getPerformanceMetrics() {
        try {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.loadEventStart) : 0,
                domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) : 0,
                timestamp: Date.now()
            };
        } catch (error) {
            return { loadTime: 0, domContentLoaded: 0, timestamp: Date.now() };
        }
    }
    
    /**
     * 전체 시스템 상태 계산
     */
    calculateOverallHealth(healthStatus) {
        const criticalServices = ['firebase', 'notifications'];
        const importantServices = ['api119'];
        
        // 필수 서비스 체크
        for (const service of criticalServices) {
            if (!healthStatus[service]) {
                return false;
            }
        }
        
        // 배터리 위험 수준 체크
        if (healthStatus.battery < 10) {
            return false;
        }
        
        // 메모리 사용량 체크
        if (healthStatus.memory > 90) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 사용자 모니터링 시작
     */
    startUserMonitoring() {
        this.timers.userMonitoring = setInterval(() => {
            this.performUserMonitoring();
        }, this.monitoringConfig.healthCheckInterval);
        
        // 즉시 첫 모니터링 실행
        this.performUserMonitoring();
    }
    
    /**
     * 사용자 상태 모니터링 수행
     */
    async performUserMonitoring() {
        try {
            console.log('👥 [생명구조] 사용자 상태 모니터링 시작');
            
            // 현재 사용자 정보 가져오기
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                console.log('👤 [생명구조] 로그인된 사용자 없음 - 모니터링 제한');
                return;
            }
            
            // 사용자 상태 업데이트
            await this.updateUserStatus(currentUser.id);
            
            // 친구들 상태 확인
            await this.checkFriendsStatus(currentUser.id);
            
            // 위험 상황 감지
            await this.detectEmergencies();
            
        } catch (error) {
            console.error('❌ [생명구조] 사용자 모니터링 실패:', error);
            this.handleSystemError('USER_MONITORING_FAILED', error);
        }
    }
    
    /**
     * 현재 사용자 정보 가져오기
     */
    getCurrentUser() {
        try {
            // KakaoAuth에서 사용자 정보 가져오기
            if (window.KakaoAuth && window.KakaoAuth.currentUser) {
                return window.KakaoAuth.currentUser;
            }
            
            // LocalStorage에서 사용자 정보 가져오기
            const userData = localStorage.getItem('userData');
            if (userData) {
                return JSON.parse(userData);
            }
            
            return null;
        } catch (error) {
            console.warn('⚠️ [생명구조] 현재 사용자 정보 가져오기 실패:', error);
            return null;
        }
    }
    
    /**
     * 사용자 상태 업데이트
     */
    async updateUserStatus(userId) {
        try {
            const now = Date.now();
            const currentStatus = this.monitoringState.users.get(userId) || {
                lastHeartbeat: now,
                lastMotion: now,
                lastActivity: now,
                alertLevel: 'normal',
                consecutiveFailures: 0
            };
            
            // 하트비트 전송
            const heartbeatSent = await this.sendHeartbeat(userId);
            if (heartbeatSent) {
                currentStatus.lastHeartbeat = now;
                currentStatus.consecutiveFailures = 0;
            } else {
                currentStatus.consecutiveFailures++;
            }
            
            // 움직임 감지 확인
            const motionDetected = await this.checkMotionDetection();
            if (motionDetected) {
                currentStatus.lastMotion = now;
            }
            
            // 활동 상태 업데이트
            currentStatus.lastActivity = Math.max(currentStatus.lastHeartbeat, currentStatus.lastMotion);
            
            // 알림 레벨 계산
            currentStatus.alertLevel = this.calculateAlertLevel(currentStatus, now);
            
            // 상태 저장
            this.monitoringState.users.set(userId, currentStatus);
            
            console.log(`👤 [생명구조] 사용자 ${userId} 상태 업데이트:`, currentStatus.alertLevel);
            
        } catch (error) {
            console.error('❌ [생명구조] 사용자 상태 업데이트 실패:', error);
        }
    }
    
    /**
     * 하트비트 전송
     */
    async sendHeartbeat(userId) {
        try {
            if (!window.firebaseDb) return false;
            
            await window.firebaseDb.collection('user_heartbeat').doc(userId).set({
                timestamp: new Date().toISOString(),
                status: 'alive',
                battery: await this.checkBatteryStatus(),
                userAgent: navigator.userAgent
            }, { merge: true });
            
            return true;
        } catch (error) {
            console.warn('⚠️ [생명구조] 하트비트 전송 실패:', error);
            return false;
        }
    }
    
    /**
     * 움직임 감지 확인
     */
    async checkMotionDetection() {
        try {
            if (window.motionDetector && window.motionDetector.getLastMotionTime) {
                const lastMotion = window.motionDetector.getLastMotionTime();
                const timeSinceMotion = Date.now() - lastMotion;
                return timeSinceMotion < this.monitoringConfig.motionTimeout;
            }
            return true; // 움직임 감지기 없으면 정상 가정
        } catch (error) {
            console.warn('⚠️ [생명구조] 움직임 감지 확인 실패:', error);
            return true;
        }
    }
    
    /**
     * 알림 레벨 계산
     */
    calculateAlertLevel(userStatus, currentTime) {
        const timeSinceActivity = currentTime - userStatus.lastActivity;
        const thresholds = this.monitoringConfig.alertThresholds;
        
        if (timeSinceActivity >= thresholds.emergency) {
            return 'emergency';
        } else if (timeSinceActivity >= thresholds.danger) {
            return 'danger';
        } else if (timeSinceActivity >= thresholds.warning) {
            return 'warning';
        } else if (timeSinceActivity >= thresholds.caution) {
            return 'caution';
        } else {
            return 'normal';
        }
    }
    
    /**
     * 친구들 상태 확인
     */
    async checkFriendsStatus(userId) {
        try {
            if (window.friendStatusChecker && window.friendStatusChecker.checkAllFriends) {
                await window.friendStatusChecker.checkAllFriends(userId);
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] 친구 상태 확인 실패:', error);
        }
    }
    
    /**
     * 응급상황 감지
     */
    async detectEmergencies() {
        try {
            for (const [userId, userStatus] of this.monitoringState.users) {
                if (userStatus.alertLevel === 'emergency') {
                    await this.handleEmergency(userId, userStatus);
                } else if (userStatus.alertLevel === 'danger') {
                    await this.handleDangerSituation(userId, userStatus);
                }
            }
        } catch (error) {
            console.error('❌ [생명구조] 응급상황 감지 실패:', error);
        }
    }
    
    /**
     * 응급상황 처리
     */
    async handleEmergency(userId, userStatus) {
        try {
            console.log(`🚨 [생명구조] 응급상황 감지 - 사용자 ${userId}`);
            
            // 119 API 자동 신고
            if (window.api119Client) {
                await window.api119Client.reportEmergency(userId, userStatus);
            }
            
            // 모든 친구들에게 응급 알림
            await this.notifyAllFriends(userId, 'emergency', userStatus);
            
            // 관리자에게 알림
            await this.notifyAdministrators('emergency', userId, userStatus);
            
            // 응급 로그 기록
            this.logEmergency(userId, userStatus);
            
        } catch (error) {
            console.error('❌ [생명구조] 응급상황 처리 실패:', error);
        }
    }
    
    /**
     * 위험상황 처리
     */
    async handleDangerSituation(userId, userStatus) {
        try {
            console.log(`⚠️ [생명구조] 위험상황 감지 - 사용자 ${userId}`);
            
            // 친구들에게 위험 알림
            await this.notifyAllFriends(userId, 'danger', userStatus);
            
            // 위험 로그 기록
            this.logDangerSituation(userId, userStatus);
            
        } catch (error) {
            console.error('❌ [생명구조] 위험상황 처리 실패:', error);
        }
    }
    
    /**
     * 알림 프로세서 시작
     */
    startAlertProcessor() {
        this.timers.alertProcessor = setInterval(() => {
            this.processAlerts();
        }, 10000); // 10초마다 알림 처리
    }
    
    /**
     * 알림 처리
     */
    async processAlerts() {
        try {
            // 대기 중인 알림들 처리
            const pendingAlerts = this.monitoringState.alerts.filter(alert => alert.status === 'pending');
            
            for (const alert of pendingAlerts) {
                await this.processAlert(alert);
            }
            
            // 오래된 알림 정리
            this.cleanupOldAlerts();
            
        } catch (error) {
            console.error('❌ [생명구조] 알림 처리 실패:', error);
        }
    }
    
    /**
     * 개별 알림 처리
     */
    async processAlert(alert) {
        try {
            switch (alert.type) {
                case 'system_failure':
                    await this.processSystemFailureAlert(alert);
                    break;
                case 'user_emergency':
                    await this.processUserEmergencyAlert(alert);
                    break;
                case 'friend_warning':
                    await this.processFriendWarningAlert(alert);
                    break;
                default:
                    console.warn('⚠️ [생명구조] 알 수 없는 알림 타입:', alert.type);
            }
            
            alert.status = 'processed';
            alert.processedAt = new Date().toISOString();
            
        } catch (error) {
            console.error('❌ [생명구조] 알림 처리 실패:', error);
            alert.status = 'failed';
            alert.error = error.message;
        }
    }
    
    /**
     * 자동복구 시스템 시작
     */
    startAutoRecovery() {
        console.log('🔧 [생명구조] 자동복구 시스템 시작');
        
        // 주기적 복구 작업 체크
        setInterval(() => {
            this.performAutoRecovery();
        }, 60000); // 1분마다
    }
    
    /**
     * 자동복구 수행
     */
    async performAutoRecovery() {
        try {
            const systemHealth = this.monitoringState.systemHealth;
            
            // Firebase 연결 복구
            if (!systemHealth.firebase) {
                await this.recoverFirebaseConnection();
            }
            
            // 119 API 연결 복구
            if (!systemHealth.api119) {
                await this.recoverAPI119Connection();
            }
            
            // 알림 시스템 복구
            if (!systemHealth.notifications) {
                await this.recoverNotificationSystem();
            }
            
            // 메모리 정리
            if (systemHealth.memory > 80) {
                await this.performMemoryCleanup();
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 자동복구 실패:', error);
        }
    }
    
    /**
     * Firebase 연결 복구
     */
    async recoverFirebaseConnection() {
        try {
            console.log('🔧 [생명구조] Firebase 연결 복구 시도');
            
            if (window.firebase && window.firebaseConfig) {
                // 새로운 Firebase 연결 시도
                const app = window.firebase.initializeApp(window.firebaseConfig, 'recovery-' + Date.now());
                window.firebaseDb = app.firestore();
                
                // 연결 테스트
                await window.firebaseDb.collection('test').doc('recovery').get();
                
                console.log('✅ [생명구조] Firebase 연결 복구 성공');
                this.logRecoveryAction('FIREBASE_RECOVERY_SUCCESS');
                
                return true;
            }
        } catch (error) {
            console.error('❌ [생명구조] Firebase 연결 복구 실패:', error);
            this.logRecoveryAction('FIREBASE_RECOVERY_FAILED', error);
            return false;
        }
    }
    
    /**
     * 119 API 연결 복구
     */
    async recoverAPI119Connection() {
        try {
            console.log('🔧 [생명구조] 119 API 연결 복구 시도');
            
            if (window.api119Client && window.api119Client.reconnect) {
                await window.api119Client.reconnect();
                console.log('✅ [생명구조] 119 API 연결 복구 성공');
                this.logRecoveryAction('API119_RECOVERY_SUCCESS');
                return true;
            }
        } catch (error) {
            console.error('❌ [생명구조] 119 API 연결 복구 실패:', error);
            this.logRecoveryAction('API119_RECOVERY_FAILED', error);
            return false;
        }
    }
    
    /**
     * 알림 시스템 복구
     */
    async recoverNotificationSystem() {
        try {
            console.log('🔧 [생명구조] 알림 시스템 복구 시도');
            
            if (window.notificationManager && window.notificationManager.reinitialize) {
                await window.notificationManager.reinitialize();
                console.log('✅ [생명구조] 알림 시스템 복구 성공');
                this.logRecoveryAction('NOTIFICATION_RECOVERY_SUCCESS');
                return true;
            }
        } catch (error) {
            console.error('❌ [생명구조] 알림 시스템 복구 실패:', error);
            this.logRecoveryAction('NOTIFICATION_RECOVERY_FAILED', error);
            return false;
        }
    }
    
    /**
     * 메모리 정리
     */
    async performMemoryCleanup() {
        try {
            console.log('🧹 [생명구조] 메모리 정리 시작');
            
            // 오래된 로그 정리
            this.cleanupOldLogs();
            
            // 오래된 알림 정리
            this.cleanupOldAlerts();
            
            // 캐시 정리
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('old') || cacheName.includes('temp')) {
                        await caches.delete(cacheName);
                    }
                }
            }
            
            // 가비지 컬렉션 강제 실행 (가능한 경우)
            if (window.gc) {
                window.gc();
            }
            
            console.log('✅ [생명구조] 메모리 정리 완료');
            this.logRecoveryAction('MEMORY_CLEANUP_SUCCESS');
            
        } catch (error) {
            console.error('❌ [생명구조] 메모리 정리 실패:', error);
            this.logRecoveryAction('MEMORY_CLEANUP_FAILED', error);
        }
    }
    
    /**
     * 성능 모니터링 시작
     */
    startPerformanceMonitoring() {
        console.log('📊 [생명구조] 성능 모니터링 시작');
        
        // 성능 지표 수집
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 300000); // 5분마다
    }
    
    /**
     * 성능 지표 수집
     */
    collectPerformanceMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                memory: this.getMemoryUsage(),
                performance: this.getPerformanceMetrics(),
                activeUsers: this.monitoringState.users.size,
                activeAlerts: this.monitoringState.alerts.filter(a => a.status === 'active').length,
                systemHealth: this.monitoringState.systemHealth.overall
            };
            
            // 성능 로그 저장
            this.logPerformanceMetrics(metrics);
            
            // 성능 임계값 체크
            if (metrics.memory > 85) {
                this.createAlert('system_failure', 'HIGH_MEMORY_USAGE', metrics);
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 성능 지표 수집 실패:', error);
        }
    }
    
    /**
     * 알림 생성
     */
    createAlert(type, code, data) {
        const alert = {
            id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: type,
            code: code,
            data: data,
            status: 'pending',
            createdAt: new Date().toISOString(),
            priority: this.getAlertPriority(type, code)
        };
        
        this.monitoringState.alerts.push(alert);
        console.log(`🚨 [생명구조] 새 알림 생성: ${type}/${code}`);
        
        return alert;
    }
    
    /**
     * 알림 우선순위 계산
     */
    getAlertPriority(type, code) {
        const priorities = {
            'user_emergency': 'critical',
            'system_failure': 'high',
            'friend_warning': 'medium',
            'performance_warning': 'low'
        };
        
        return priorities[type] || 'low';
    }
    
    /**
     * 시스템 오류 처리
     */
    handleSystemError(errorType, error) {
        console.error(`❌ [생명구조] 시스템 오류 (${errorType}):`, error);
        
        this.createAlert('system_failure', errorType, {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // 오류 로그 기록
        this.logSystemEvent('SYSTEM_ERROR', `${errorType}: ${error.message}`);
    }
    
    /**
     * 치명적 오류 처리
     */
    handleCriticalError(errorType, error) {
        console.error(`💀 [생명구조] 치명적 오류 (${errorType}):`, error);
        
        // 즉시 복구 시도
        this.triggerAutoRecovery(errorType, error);
        
        // 관리자에게 즉시 알림
        this.notifyAdministrators('critical', errorType, error);
    }
    
    /**
     * 자동복구 트리거
     */
    triggerAutoRecovery(reason, data) {
        console.log(`🔧 [생명구조] 자동복구 트리거: ${reason}`);
        
        setTimeout(() => {
            this.performAutoRecovery();
        }, this.monitoringConfig.retryDelay);
    }
    
    /**
     * 시스템 이벤트 로깅
     */
    logSystemEvent(eventType, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: eventType,
            message: message,
            systemHealth: this.monitoringState.systemHealth
        };
        
        console.log(`📝 [생명구조] 시스템 로그: ${eventType} - ${message}`);
        
        // Firebase에 로그 저장 (가능한 경우)
        this.saveLogToDatabase(logEntry);
    }
    
    /**
     * 🚨 생명구조 시스템: 성능 지표 로깅
     * @param {Object} metrics - 성능 지표 데이터
     */
    logPerformanceMetrics(metrics) {
        try {
            const performanceLog = {
                timestamp: metrics.timestamp,
                type: 'PERFORMANCE_METRICS',
                memory: metrics.memory,
                performance: metrics.performance,
                activeUsers: metrics.activeUsers,
                activeAlerts: metrics.activeAlerts,
                systemHealth: metrics.systemHealth
            };
            
            console.log('📊 [생명구조] 성능 지표 로그:', {
                memory: `${metrics.memory}%`,
                activeUsers: metrics.activeUsers,
                activeAlerts: metrics.activeAlerts,
                systemHealth: metrics.systemHealth ? '정상' : '이상'
            });
            
            // Firebase에 성능 로그 저장 (가능한 경우)
            this.savePerformanceLogToDatabase(performanceLog);
            
        } catch (error) {
            console.error('❌ [생명구조] 성능 지표 로깅 실패:', error);
        }
    }
    
    /**
     * 복구 작업 로깅
     */
    logRecoveryAction(action, error = null) {
        const recoveryLog = {
            timestamp: new Date().toISOString(),
            action: action,
            success: !error,
            error: error ? error.message : null
        };
        
        this.monitoringState.recoveryActions.push(recoveryLog);
        
        // 로그 크기 제한
        if (this.monitoringState.recoveryActions.length > 100) {
            this.monitoringState.recoveryActions = this.monitoringState.recoveryActions.slice(-50);
        }
        
        console.log(`🔧 [생명구조] 복구 로그: ${action} - ${recoveryLog.success ? '성공' : '실패'}`);
    }
    
    /**
     * 오래된 알림 정리
     */
    cleanupOldAlerts() {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        this.monitoringState.alerts = this.monitoringState.alerts.filter(alert => {
            const alertTime = new Date(alert.createdAt).getTime();
            return alertTime > oneDayAgo || alert.status === 'active';
        });
    }
    
    /**
     * 오래된 로그 정리
     */
    cleanupOldLogs() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        this.monitoringState.recoveryActions = this.monitoringState.recoveryActions.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime > oneWeekAgo;
        });
    }
    
    /**
     * 데이터베이스에 로그 저장
     */
    async saveLogToDatabase(logEntry) {
        try {
            if (window.firebaseDb) {
                await window.firebaseDb.collection('system_logs').add(logEntry);
            }
        } catch (error) {
            // 로그 저장 실패는 조용히 처리 (무한 루프 방지)
        }
    }
    
    /**
     * 🚨 생명구조 시스템: 데이터베이스에 성능 로그 저장
     * @param {Object} performanceLog - 성능 로그 데이터
     */
    async savePerformanceLogToDatabase(performanceLog) {
        try {
            if (window.firebaseDb) {
                await window.firebaseDb.collection('performance_logs').add(performanceLog);
            }
        } catch (error) {
            // 성능 로그 저장 실패는 조용히 처리 (무한 루프 방지)
            console.warn('⚠️ [생명구조] 성능 로그 데이터베이스 저장 실패 (무시됨)');
        }
    }
    
    /**
     * 모니터링 시스템 중지
     */
    stop() {
        console.log('🛑 [생명구조] 실시간 모니터링 시스템 중지');
        
        // 모든 타이머 정리
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        this.isRunning = false;
        this.logSystemEvent('SYSTEM_STOPPED', '실시간 모니터링 시스템 중지됨');
    }
    
    /**
     * 모니터링 상태 조회
     */
    getMonitoringStatus() {
        return {
            isRunning: this.isRunning,
            systemHealth: this.monitoringState.systemHealth,
            activeUsers: this.monitoringState.users.size,
            activeAlerts: this.monitoringState.alerts.filter(a => a.status === 'active').length,
            lastHealthCheck: this.monitoringState.systemHealth.lastCheck
        };
    }
}

// 전역 인스턴스 생성
window.realTimeMonitoringSystem = new RealTimeMonitoringSystem();

// 글로벌 함수 노출
window.getRealTimeMonitoringSystem = () => window.realTimeMonitoringSystem;

console.log('🚨 [생명구조] 실시간 모니터링 시스템 로드 완료');