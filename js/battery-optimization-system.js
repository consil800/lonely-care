/**
 * 🔋 배터리 수명 최적화 시스템
 * 생명구조 앱용 스마트 배터리 관리 시스템
 * 
 * 핵심 원칙:
 * 1. 생명 관련 기능은 절대 차단하지 않음
 * 2. 알림(문자, 알람, 진동)은 배터리와 무관하게 최우선 보장
 * 3. 배터리 상태에 따른 적응형 모니터링
 * 4. 백그라운드 최적화로 배터리 수명 연장
 */

class BatteryOptimizationSystem {
    constructor() {
        this.className = 'BatteryOptimizationSystem';
        this.isInitialized = false;
        this.batteryManager = null;
        this.currentMode = 'normal'; // normal, power_save, critical
        this.optimizationSettings = {
            normal: {
                heartbeatInterval: 30000,        // 30초
                friendCheckInterval: 60000,      // 1분
                uiUpdateInterval: 5000,          // 5초
                locationUpdateInterval: 300000,  // 5분
                enableAnimations: true,
                enableAutoRefresh: true,
                maxBackgroundTasks: 10
            },
            power_save: {
                heartbeatInterval: 45000,        // 45초
                friendCheckInterval: 120000,     // 2분
                uiUpdateInterval: 10000,         // 10초
                locationUpdateInterval: 600000,  // 10분
                enableAnimations: false,
                enableAutoRefresh: false,
                maxBackgroundTasks: 5
            },
            critical: {
                heartbeatInterval: 60000,        // 1분 (최소한 유지)
                friendCheckInterval: 300000,     // 5분
                uiUpdateInterval: 30000,         // 30초
                locationUpdateInterval: 900000,  // 15분
                enableAnimations: false,
                enableAutoRefresh: false,
                maxBackgroundTasks: 3
            }
        };
        
        // 중요한 기능들은 절대 차단하지 않음
        this.criticalFeatures = [
            'emergency_notifications',  // 응급 알림
            'friend_status_alerts',     // 친구 상태 알림
            'heartbeat_sender',         // 하트비트 전송
            'motion_detection',         // 움직임 감지
            'push_notifications'        // 푸시 알림
        ];
        
        this.monitoringIntervals = new Map();
        this.wakeLock = null;
        this.lastOptimization = Date.now();
        
        console.log('🔋 [생명구조] 배터리 최적화 시스템 초기화');
        this.init();
    }
    
    /**
     * 시스템 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] 배터리 최적화 시스템 초기화 중...');
            
            // 배터리 API 초기화
            await this.initBatteryAPI();
            
            // 배터리 상태 모니터링 시작
            this.startBatteryMonitoring();
            
            // 백그라운드 최적화 설정
            this.setupBackgroundOptimization();
            
            // 중요 기능 보호 설정
            this.protectCriticalFeatures();
            
            // 적응형 모니터링 시작
            this.startAdaptiveMonitoring();
            
            // Wake Lock 초기화
            await this.initWakeLock();
            
            this.isInitialized = true;
            console.log('✅ [생명구조] 배터리 최적화 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 배터리 최적화 시스템 초기화 실패:', error);
            // 초기화 실패해도 기본 기능은 유지
            this.isInitialized = false;
        }
    }
    
    /**
     * 배터리 API 초기화
     */
    async initBatteryAPI() {
        try {
            if ('getBattery' in navigator) {
                this.batteryManager = await navigator.getBattery();
                console.log('✅ [생명구조] 배터리 API 초기화 완료');
                
                // 배터리 이벤트 리스너 등록
                this.batteryManager.addEventListener('levelchange', () => {
                    this.onBatteryLevelChange();
                });
                
                this.batteryManager.addEventListener('chargingchange', () => {
                    this.onChargingStateChange();
                });
                
            } else if (window.AndroidBridge && window.AndroidBridge.getBatteryLevel) {
                // Android WebView용 배터리 정보
                this.batteryManager = {
                    level: await window.AndroidBridge.getBatteryLevel() / 100,
                    charging: await window.AndroidBridge.isCharging()
                };
                console.log('✅ [생명구조] Android 배터리 API 초기화 완료');
            } else {
                console.warn('⚠️ [생명구조] 배터리 API 사용 불가 - 시뮬레이션 모드');
                // 시뮬레이션용 배터리 매니저
                this.batteryManager = {
                    level: 0.8, // 80%로 가정
                    charging: false
                };
            }
        } catch (error) {
            console.error('❌ [생명구조] 배터리 API 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 배터리 상태 모니터링 시작
     */
    startBatteryMonitoring() {
        setInterval(() => {
            this.checkBatteryStatus();
        }, 30000); // 30초마다 배터리 상태 확인
        
        console.log('🔄 [생명구조] 배터리 모니터링 시작');
    }
    
    /**
     * 배터리 상태 확인 및 최적화 모드 결정
     */
    async checkBatteryStatus() {
        try {
            let batteryLevel = this.batteryManager?.level || 0.8;
            let isCharging = this.batteryManager?.charging || false;
            
            // Android WebView의 경우 실시간 업데이트
            if (window.AndroidBridge?.getBatteryLevel) {
                batteryLevel = await window.AndroidBridge.getBatteryLevel() / 100;
                isCharging = await window.AndroidBridge.isCharging();
            }
            
            const previousMode = this.currentMode;
            
            // 배터리 수준에 따른 모드 결정
            if (isCharging) {
                // 충전 중이면 노멀 모드
                this.currentMode = 'normal';
            } else if (batteryLevel <= 0.1) {
                // 10% 이하: 크리티컬 모드
                this.currentMode = 'critical';
            } else if (batteryLevel <= 0.2) {
                // 20% 이하: 절전 모드
                this.currentMode = 'power_save';
            } else {
                // 21% 이상: 노멀 모드
                this.currentMode = 'normal';
            }
            
            // 모드 변경 시 최적화 적용
            if (previousMode !== this.currentMode) {
                console.log(`🔋 [생명구조] 배터리 모드 변경: ${previousMode} -> ${this.currentMode} (${Math.round(batteryLevel * 100)}%)`);
                await this.applyOptimization();
                this.notifyModeChange();
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 배터리 상태 확인 실패:', error);
        }
    }
    
    /**
     * 배터리 레벨 변경 이벤트
     */
    onBatteryLevelChange() {
        const level = Math.round(this.batteryManager.level * 100);
        console.log(`🔋 [생명구조] 배터리 레벨 변경: ${level}%`);
        this.checkBatteryStatus();
    }
    
    /**
     * 충전 상태 변경 이벤트
     */
    onChargingStateChange() {
        const isCharging = this.batteryManager.charging;
        console.log(`🔌 [생명구조] 충전 상태 변경: ${isCharging ? '충전 중' : '방전 중'}`);
        this.checkBatteryStatus();
    }
    
    /**
     * 최적화 적용
     */
    async applyOptimization() {
        const settings = this.optimizationSettings[this.currentMode];
        
        try {
            // 1. 모니터링 주기 조정 (중요 기능 제외)
            await this.adjustMonitoringIntervals(settings);
            
            // 2. UI 최적화
            this.optimizeUI(settings);
            
            // 3. 백그라운드 작업 제한
            this.limitBackgroundTasks(settings);
            
            // 4. 네트워크 요청 최적화
            this.optimizeNetworkRequests(settings);
            
            // 5. 중요 기능은 항상 보장
            this.ensureCriticalFeatures();
            
            console.log(`✅ [생명구조] ${this.currentMode} 모드 최적화 적용 완료`);
            
        } catch (error) {
            console.error('❌ [생명구조] 최적화 적용 실패:', error);
        }
    }
    
    /**
     * 모니터링 주기 조정 (중요 기능은 최소한만 조정)
     */
    async adjustMonitoringIntervals(settings) {
        // 하트비트 전송 주기 조정 (최소한만)
        if (window.motionDetector && this.currentMode === 'critical') {
            // 크리티컬 모드에서도 1분 이상 간격은 유지하지 않음 (생명 위험)
            const heartbeatInterval = Math.min(settings.heartbeatInterval, 60000);
            window.motionDetector.updateHeartbeatInterval?.(heartbeatInterval);
            console.log(`🔋 [생명구조] 하트비트 주기 조정: ${heartbeatInterval}ms`);
        }
        
        // 친구 상태 확인 주기 조정 (중요하므로 최소한만)
        if (window.friendStatusMonitor && this.currentMode === 'critical') {
            // 크리티컬 모드에서도 5분 이상은 연장하지 않음
            const friendCheckInterval = Math.min(settings.friendCheckInterval, 300000);
            window.friendStatusMonitor.updateCheckInterval?.(friendCheckInterval);
            console.log(`🔋 [생명구조] 친구 상태 확인 주기 조정: ${friendCheckInterval}ms`);
        }
        
        // UI 업데이트 주기는 자유롭게 조정 가능
        if (window.uiUpdateManager) {
            window.uiUpdateManager.setUpdateInterval?.(settings.uiUpdateInterval);
        }
    }
    
    /**
     * UI 최적화
     */
    optimizeUI(settings) {
        // 애니메이션 최적화
        if (!settings.enableAnimations) {
            document.body.style.setProperty('--animation-duration', '0s');
            document.body.classList.add('reduced-motion');
        } else {
            document.body.style.removeProperty('--animation-duration');
            document.body.classList.remove('reduced-motion');
        }
        
        // 자동 새로고침 최적화
        if (!settings.enableAutoRefresh) {
            // 자동 새로고침 비활성화
            if (window.autoRefreshManager) {
                window.autoRefreshManager.pause?.();
            }
        } else {
            if (window.autoRefreshManager) {
                window.autoRefreshManager.resume?.();
            }
        }
        
        // 화면 밝기 최적화 (Android)
        if (window.AndroidBridge?.setBrightness && this.currentMode === 'critical') {
            window.AndroidBridge.setBrightness(0.3); // 30%로 감소
        }
    }
    
    /**
     * 백그라운드 작업 제한
     */
    limitBackgroundTasks(settings) {
        // 백그라운드 작업 수 제한
        if (window.backgroundTaskManager) {
            window.backgroundTaskManager.setMaxConcurrentTasks?.(settings.maxBackgroundTasks);
        }
        
        // 불필요한 백그라운드 작업 일시 중단
        if (this.currentMode === 'critical') {
            // 이미지 프리로딩 중단
            if (window.imagePreloader) {
                window.imagePreloader.pause?.();
            }
            
            // 통계 수집 중단
            if (window.analyticsManager) {
                window.analyticsManager.pause?.();
            }
        }
    }
    
    /**
     * 네트워크 요청 최적화
     */
    optimizeNetworkRequests(settings) {
        if (this.currentMode === 'critical') {
            // 불필요한 네트워크 요청 연기
            if (window.dataSync) {
                window.dataSync.setMode?.('essential_only');
            }
            
            // 이미지 로딩 품질 최적화
            if (window.imageOptimizer) {
                window.imageOptimizer.setQuality?.(0.7); // 70% 품질
            }
        } else {
            if (window.dataSync) {
                window.dataSync.setMode?.('normal');
            }
            
            if (window.imageOptimizer) {
                window.imageOptimizer.setQuality?.(1.0); // 100% 품질
            }
        }
    }
    
    /**
     * 중요 기능 보장 (절대 차단하지 않음)
     */
    ensureCriticalFeatures() {
        // 응급 알림 시스템 확인
        if (window.notificationsManager) {
            window.notificationsManager.ensureActive?.();
        }
        
        // 푸시 알림 확인
        if (window.firebaseMessagingManager) {
            window.firebaseMessagingManager.ensureActive?.();
        }
        
        // 움직임 감지 확인
        if (window.motionDetector) {
            window.motionDetector.ensureActive?.();
        }
        
        console.log('🛡️ [생명구조] 중요 기능 보장 확인 완료');
    }
    
    /**
     * 백그라운드 최적화 설정
     */
    setupBackgroundOptimization() {
        // Service Worker에 배터리 최적화 메시지 전송
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'BATTERY_OPTIMIZATION_INIT',
                mode: this.currentMode
            });
        }
        
        // Page Visibility API 활용
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 백그라운드 진입 시 최적화
                this.enterBackgroundMode();
            } else {
                // 포그라운드 복귀 시 최적화 해제
                this.exitBackgroundMode();
            }
        });
    }
    
    /**
     * 백그라운드 모드 진입
     */
    enterBackgroundMode() {
        console.log('📱 [생명구조] 백그라운드 모드 진입 - 최적화 적용');
        
        // UI 업데이트 최소화
        if (window.uiUpdateManager) {
            window.uiUpdateManager.enterBackgroundMode?.();
        }
        
        // 불필요한 타이머 일시 중단
        this.pauseNonCriticalTimers();
        
        // 중요한 기능은 계속 실행
        this.maintainCriticalBackgroundTasks();
    }
    
    /**
     * 포그라운드 모드 복귀
     */
    exitBackgroundMode() {
        console.log('📱 [생명구조] 포그라운드 모드 복귀 - 최적화 해제');
        
        // UI 업데이트 재개
        if (window.uiUpdateManager) {
            window.uiUpdateManager.exitBackgroundMode?.();
        }
        
        // 타이머 재개
        this.resumeNonCriticalTimers();
    }
    
    /**
     * 중요하지 않은 타이머 일시 중단
     */
    pauseNonCriticalTimers() {
        // UI 애니메이션 타이머 중단
        if (window.animationManager) {
            window.animationManager.pauseAll?.();
        }
        
        // 자동 저장 주기 연장
        if (window.autoSaveManager) {
            window.autoSaveManager.extendInterval?.();
        }
    }
    
    /**
     * 중요하지 않은 타이머 재개
     */
    resumeNonCriticalTimers() {
        if (window.animationManager) {
            window.animationManager.resumeAll?.();
        }
        
        if (window.autoSaveManager) {
            window.autoSaveManager.restoreInterval?.();
        }
    }
    
    /**
     * 백그라운드에서 중요 작업 유지
     */
    maintainCriticalBackgroundTasks() {
        // 하트비트 전송 유지
        if (window.motionDetector) {
            window.motionDetector.maintainHeartbeat?.();
        }
        
        // 친구 상태 모니터링 유지
        if (window.friendStatusMonitor) {
            window.friendStatusMonitor.maintainMonitoring?.();
        }
        
        // 알림 시스템 유지
        if (window.notificationsManager) {
            window.notificationsManager.maintainNotifications?.();
        }
    }
    
    /**
     * Wake Lock 초기화
     */
    async initWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                console.log('✅ [생명구조] Wake Lock API 사용 가능');
            } else {
                console.warn('⚠️ [생명구조] Wake Lock API 사용 불가');
            }
        } catch (error) {
            console.error('❌ [생명구조] Wake Lock 초기화 실패:', error);
        }
    }
    
    /**
     * 응급상황 시 Wake Lock 활성화
     */
    async activateEmergencyWakeLock() {
        try {
            if ('wakeLock' in navigator && !this.wakeLock) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('🚨 [생명구조] 응급상황 Wake Lock 활성화');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('🚨 [생명구조] Wake Lock 해제됨');
                    this.wakeLock = null;
                });
            }
        } catch (error) {
            console.error('❌ [생명구조] Wake Lock 활성화 실패:', error);
        }
    }
    
    /**
     * Wake Lock 해제
     */
    async releaseWakeLock() {
        try {
            if (this.wakeLock) {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('✅ [생명구조] Wake Lock 해제 완료');
            }
        } catch (error) {
            console.error('❌ [생명구조] Wake Lock 해제 실패:', error);
        }
    }
    
    /**
     * 중요 기능 보호 설정
     */
    protectCriticalFeatures() {
        // 중요 기능들이 비활성화되지 않도록 보호
        this.criticalFeatures.forEach(feature => {
            if (window[feature]) {
                // 기능 보호 플래그 설정
                window[feature]._protected = true;
                window[feature]._batteryOptimizationExempt = true;
            }
        });
        
        console.log('🛡️ [생명구조] 중요 기능 보호 설정 완료');
    }
    
    /**
     * 적응형 모니터링 시작
     */
    startAdaptiveMonitoring() {
        // 사용 패턴 학습을 통한 적응형 최적화
        setInterval(() => {
            this.analyzeUsagePattern();
        }, 300000); // 5분마다 분석
        
        console.log('🧠 [생명구조] 적응형 모니터링 시작');
    }
    
    /**
     * 사용 패턴 분석
     */
    analyzeUsagePattern() {
        try {
            const now = Date.now();
            const hourOfDay = new Date().getHours();
            
            // 밤 시간(22:00-06:00) 최적화
            if (hourOfDay >= 22 || hourOfDay <= 6) {
                if (this.currentMode === 'normal') {
                    // 밤에는 절전 모드로 전환 (중요 기능은 유지)
                    this.applyNightTimeOptimization();
                }
            }
            
            // 사용자 활동 패턴 분석
            this.analyzeUserActivity();
            
        } catch (error) {
            console.error('❌ [생명구조] 사용 패턴 분석 실패:', error);
        }
    }
    
    /**
     * 야간 시간 최적화
     */
    applyNightTimeOptimization() {
        console.log('🌙 [생명구조] 야간 시간 최적화 적용');
        
        // 화면 밝기 최적화
        if (window.AndroidBridge?.setBrightness) {
            window.AndroidBridge.setBrightness(0.1); // 10%로 감소
        }
        
        // UI 업데이트 주기 연장
        if (window.uiUpdateManager) {
            window.uiUpdateManager.setNightMode?.(true);
        }
        
        // 중요 기능은 계속 유지
        this.ensureCriticalFeatures();
    }
    
    /**
     * 사용자 활동 분석
     */
    analyzeUserActivity() {
        // 최근 사용자 상호작용 분석
        const lastActivity = localStorage.getItem('lastUserActivity');
        const now = Date.now();
        
        if (lastActivity) {
            const timeSinceActivity = now - parseInt(lastActivity);
            
            // 30분 이상 비활성 시 절전 모드 고려
            if (timeSinceActivity > 1800000 && this.currentMode === 'normal') {
                console.log('😴 [생명구조] 사용자 비활성 감지 - 절전 모드 고려');
                // 단, 중요 기능은 절대 영향받지 않음
                this.applyInactivityOptimization();
            }
        }
    }
    
    /**
     * 비활성 상태 최적화
     */
    applyInactivityOptimization() {
        // UI 업데이트만 최소화 (중요 기능은 유지)
        if (window.uiUpdateManager) {
            window.uiUpdateManager.setInactiveMode?.(true);
        }
        
        // 백그라운드 동기화 연기
        if (window.backgroundSync) {
            window.backgroundSync.defer?.();
        }
    }
    
    /**
     * 모드 변경 알림
     */
    notifyModeChange() {
        const modeNames = {
            normal: '일반 모드',
            power_save: '절전 모드',
            critical: '극한 절전 모드'
        };
        
        const message = `🔋 배터리 최적화: ${modeNames[this.currentMode]}로 전환`;
        
        // 사용자에게 모드 변경 알림 (선택적)
        if (this.currentMode === 'critical') {
            if (window.notificationsManager) {
                window.notificationsManager.showBrowserNotification?.(
                    '🔋 배터리 절약 모드',
                    '배터리가 부족합니다. 생명구조 기능은 계속 작동합니다.',
                    { icon: '/icon.png', tag: 'battery-mode' }
                );
            }
        }
        
        console.log(`🔋 [생명구조] ${message}`);
    }
    
    /**
     * 현재 최적화 상태 가져오기
     */
    getCurrentStatus() {
        return {
            mode: this.currentMode,
            batteryLevel: this.batteryManager?.level || 0,
            isCharging: this.batteryManager?.charging || false,
            settings: this.optimizationSettings[this.currentMode],
            lastOptimization: this.lastOptimization,
            wakeLockActive: !!this.wakeLock,
            criticalFeaturesProtected: this.criticalFeatures.length
        };
    }
    
    /**
     * 수동 최적화 실행
     */
    async optimizeNow() {
        console.log('🔋 [생명구조] 수동 최적화 실행');
        await this.checkBatteryStatus();
        return this.getCurrentStatus();
    }
    
    /**
     * 긴급 상황 시 최대 성능 모드
     */
    async activateEmergencyMode() {
        console.log('🚨 [생명구조] 긴급 상황 - 최대 성능 모드 활성화');
        
        // 모든 최적화 일시 해제
        this.currentMode = 'normal';
        await this.applyOptimization();
        
        // Wake Lock 활성화
        await this.activateEmergencyWakeLock();
        
        // 모든 중요 기능 최대 성능으로 동작
        this.ensureCriticalFeatures();
        
        // 30분 후 자동으로 배터리 상태에 따른 모드로 복귀
        setTimeout(() => {
            this.checkBatteryStatus();
        }, 1800000); // 30분
    }
}

// 전역 인스턴스 생성
window.batteryOptimizationSystem = new BatteryOptimizationSystem();

// 사용자 활동 추적 (배터리 최적화 참고용)
document.addEventListener('click', () => {
    localStorage.setItem('lastUserActivity', Date.now().toString());
});

document.addEventListener('touchstart', () => {
    localStorage.setItem('lastUserActivity', Date.now().toString());
});

// CSS 최적화 추가
const batteryOptimizationStyles = document.createElement('style');
batteryOptimizationStyles.textContent = `
    /* 배터리 절약 모드용 애니메이션 최적화 */
    .reduced-motion * {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
    }
    
    /* 배터리 절약 모드 UI */
    .battery-save-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff9800;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        display: none;
    }
    
    .battery-save-indicator.critical {
        background: #f44336;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
`;

document.head.appendChild(batteryOptimizationStyles);

console.log('🔋 [생명구조] 배터리 최적화 시스템 로드 완료 - 생명구조 기능 최우선 보장');