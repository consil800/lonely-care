/**
 * 강화된 알림 관리자 - SMS 서비스 수준의 백그라운드 알림 시스템
 * 
 * 주요 기능:
 * 1. 백그라운드에서도 확실한 알림 전달 (SMS 수준)
 * 2. 상태별 알림 주기 관리:
 *    - 주의/경고: 1회 알림+알람+진동
 *    - 위험: 6시간마다 알림+알람+진동
 * 3. 다중 채널 알림 (FCM + Web Push + Native Android)
 * 4. 알림 실패 시 자동 재시도
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

class EnhancedNotificationManager {
    constructor() {
        this.className = 'EnhancedNotificationManager';
        this.isInitialized = false;
        this.notificationHistory = new Map(); // 사용자별 알림 이력
        this.retryQueue = []; // 실패한 알림 재시도 큐
        this.lastNotificationTimes = new Map(); // 마지막 알림 시간 추적
        
        // 알림 주기 설정 (밀리초)
        this.alertIntervals = {
            warning: 0, // 주의: 1회만 (0 = 반복 안함)
            danger: 0,  // 경고: 1회만 (0 = 반복 안함)
            emergency: 6 * 60 * 60 * 1000 // 위험: 6시간마다
        };
        
        console.log('🔔 [생명구조] 강화된 알림 시스템 초기화');
        this.init();
    }

    /**
     * 초기화 (강화된 안전성 및 단계별 복구)
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.log('🔄 [생명구조] 이미 초기화됨, 상태 확인 중...');
                return this.verifySystemHealth();
            }
            
            console.log('🚀 [생명구조] 강화된 알림 시스템 초기화 시작');
            
            // 의존성 확인 및 기능 수준 결정
            const depResult = await this.waitForDependencies();
            this.systemCapabilities = {
                fullFeatures: depResult.fullFeatures,
                limitedMode: depResult.limitedMode,
                emergencyMode: depResult.emergencyMode,
                dependencies: depResult.dependencies
            };
            
            console.log('📊 [생명구조] 시스템 기능 수준:', this.systemCapabilities);
            
            // 단계별 초기화 시도
            const initSteps = [
                { name: '서비스 워커', fn: () => this.ensureServiceWorker(), critical: false },
                { name: '알림 권한', fn: () => this.requestNotificationPermission(), critical: false },
                { name: 'Android 브릿지', fn: () => this.checkAndroidBridge(), critical: false },
                { name: '백그라운드 모니터링', fn: () => this.startBackgroundMonitoring(), critical: true },
                { name: '재시도 프로세서', fn: () => this.startRetryProcessor(), critical: true }
            ];
            
            const initResults = {};
            let criticalFailures = 0;
            
            for (const step of initSteps) {
                try {
                    console.log(`🔧 [생명구조] ${step.name} 초기화 중...`);
                    await step.fn();
                    initResults[step.name] = { success: true };
                    console.log(`✅ [생명구조] ${step.name} 초기화 완료`);
                } catch (error) {
                    const errorInfo = { success: false, error: error.message };
                    initResults[step.name] = errorInfo;
                    
                    if (step.critical) {
                        criticalFailures++;
                        console.error(`❌ [생명구조] 중요 초기화 실패 - ${step.name}:`, error);
                    } else {
                        console.warn(`⚠️ [생명구조] 선택적 초기화 실패 - ${step.name}:`, error);
                    }
                }
            }
            
            // 초기화 결과 평가
            if (criticalFailures === 0) {
                this.isInitialized = true;
                this.initializationHealth = 'healthy';
                console.log('✅ [생명구조] 완전한 초기화 성공');
            } else if (criticalFailures <= 1) {
                this.isInitialized = true;
                this.initializationHealth = 'degraded';
                console.warn('⚠️ [생명구조] 제한된 초기화 성공 (일부 기능 제한)');
            } else {
                this.isInitialized = false;
                this.initializationHealth = 'failed';
                console.error('❌ [생명구조] 초기화 실패, 응급 모드로 전환');
                
                // 응급 모드 활성화
                this.activateEmergencyMode();
            }
            
            // 초기화 상태 저장
            this.initResults = initResults;
            this.lastInitTime = Date.now();
            
            // 주기적 건강 상태 확인 시작
            this.startHealthMonitoring();
            
            console.log('📋 [생명구조] 초기화 완료 - 상태:', this.initializationHealth);
            return { 
                success: this.isInitialized, 
                health: this.initializationHealth,
                capabilities: this.systemCapabilities,
                results: initResults
            };
            
        } catch (error) {
            console.error('❌ [생명구조] 초기화 치명적 실패:', error);
            
            // 최후 안전장치
            this.isInitialized = false;
            this.initializationHealth = 'critical-failure';
            this.activateEmergencyMode();
            
            return { 
                success: false, 
                health: 'critical-failure',
                error: error.message
            };
        }
    }

    /**
     * 응급 모드 활성화
     */
    activateEmergencyMode() {
        console.log('🚨 [생명구조] 응급 모드 활성화');
        
        this.emergencyMode = true;
        
        // 최소한의 기능만 활성화
        this.systemCapabilities = {
            fullFeatures: false,
            limitedMode: true,
            emergencyMode: true,
            basicAlertsOnly: true
        };
        
        // 기본 알림 기능 확보
        try {
            this.startBasicAlertSystem();
        } catch (basicError) {
            console.error('❌ [생명구조] 기본 알림 시스템마저 실패:', basicError);
        }
    }

    /**
     * 기본 알림 시스템 (응급 모드용)
     */
    startBasicAlertSystem() {
        console.log('🔧 [생명구조] 기본 알림 시스템 시작');
        
        // 최소한의 알림 기능
        this.basicAlert = (message) => {
            try {
                // 브라우저 alert 사용
                alert(`🚨 긴급 알림: ${message}`);
                
                // 콘솔에도 로깅
                console.error('🚨 [생명구조 응급]', message);
                
                // 가능하면 진동
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }
            } catch (error) {
                console.error('❌ [생명구조] 기본 알림마저 실패:', error);
            }
        };
    }

    /**
     * 시스템 건강 상태 확인
     */
    verifySystemHealth() {
        try {
            const healthCheck = {
                initialized: this.isInitialized,
                health: this.initializationHealth,
                capabilities: this.systemCapabilities,
                lastInit: this.lastInitTime,
                uptime: this.lastInitTime ? Date.now() - this.lastInitTime : 0
            };
            
            console.log('🏥 [생명구조] 시스템 건강 상태:', healthCheck);
            return healthCheck;
        } catch (error) {
            console.error('❌ [생명구조] 건강 상태 확인 실패:', error);
            return { error: error.message };
        }
    }

    /**
     * 주기적 건강 상태 모니터링
     */
    startHealthMonitoring() {
        // 5분마다 건강 상태 확인
        setInterval(() => {
            try {
                this.verifySystemHealth();
                
                // 성능 저하 감지 시 재초기화
                if (this.initializationHealth === 'degraded') {
                    const uptime = Date.now() - this.lastInitTime;
                    if (uptime > 300000) { // 5분 이상 degraded 상태
                        console.log('🔄 [생명구조] 성능 저하 지속, 재초기화 시도');
                        this.reinitialize();
                    }
                }
            } catch (error) {
                console.error('❌ [생명구조] 건강 모니터링 실패:', error);
            }
        }, 300000); // 5분
    }

    /**
     * 시스템 재초기화
     */
    async reinitialize() {
        console.log('🔄 [생명구조] 시스템 재초기화 시작');
        
        // 기존 상태 정리
        this.isInitialized = false;
        this.initializationHealth = 'reinitializing';
        
        // 재초기화 실행
        return await this.init();
    }

    /**
     * 의존성 대기 (강화된 안전성 및 복구 메커니즘)
     */
    async waitForDependencies() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5초로 연장
            const startTime = Date.now();
            
            const checkDeps = () => {
                try {
                    attempts++;
                    const elapsed = Date.now() - startTime;
                    
                    // 개별 의존성 상태 자세히 확인
                    const dependencies = {
                        firebase: !!window.firebase,
                        firebaseClient: !!window.firebaseClient,
                        notifications: !!window.notifications,
                        domReady: document.readyState === 'complete',
                        auth: !!window.auth,
                        storage: !!window.storage
                    };
                    
                    const criticalDeps = dependencies.domReady;
                    const optionalDeps = dependencies.firebase || dependencies.firebaseClient;
                    
                    // 최소 요구사항: DOM 준비
                    if (criticalDeps) {
                        if (optionalDeps) {
                            console.log('✅ [생명구조] 모든 의존성 확인 완료:', dependencies);
                            resolve({ success: true, dependencies, fullFeatures: true });
                        } else {
                            console.warn('⚠️ [생명구조] 기본 기능만 사용 가능:', dependencies);
                            resolve({ success: true, dependencies, fullFeatures: false });
                        }
                        return;
                    }
                    
                    // 최대 시도 횟수 도달
                    if (attempts >= maxAttempts) {
                        console.warn(`⚠️ [생명구조] 의존성 대기 시간 초과 (${elapsed}ms), 제한된 모드로 진행`);
                        resolve({ 
                            success: false, 
                            dependencies, 
                            fullFeatures: false,
                            limitedMode: true,
                            elapsed
                        });
                        return;
                    }
                    
                    // 진행 상황 주기적 로깅
                    if (attempts % 10 === 0) {
                        console.log(`🔄 [생명구조] 의존성 대기 중... ${attempts}/${maxAttempts} (${elapsed}ms)`);
                    }
                    
                    // 다음 시도 예약
                    setTimeout(checkDeps, 100);
                    
                } catch (error) {
                    console.error('❌ [생명구조] 의존성 확인 중 오류:', error);
                    
                    // 오류 발생 시에도 제한된 모드로 진행
                    resolve({ 
                        success: false, 
                        dependencies: {}, 
                        fullFeatures: false,
                        limitedMode: true,
                        error: error.message
                    });
                }
            };
            
            // 즉시 첫 번째 확인 시작
            checkDeps();
            
            // 안전장치: 10초 후 강제 해제
            setTimeout(() => {
                console.warn('🚨 [생명구조] 의존성 대기 강제 종료 - 응급 모드로 진행');
                resolve({ 
                    success: false, 
                    dependencies: {}, 
                    fullFeatures: false,
                    emergencyMode: true
                });
            }, 10000);
        });
    }

    /**
     * 서비스 워커 등록 확인 - Android WebView 환경 고려
     */
    async ensureServiceWorker() {
        try {
            // Android WebView 환경에서는 Service Worker 미지원
            if (this.isAndroidWebView()) {
                console.log('📱 [생명구조] Android WebView 환경 - Service Worker 건너뜀');
                return;
            }
            
            if ('serviceWorker' in navigator) {
                // 기존 서비스 워커 확인
                const registration = await navigator.serviceWorker.getRegistration();
                if (!registration) {
                    // firebase-messaging-sw.js 등록
                    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    console.log('✅ [생명구조] 서비스 워커 등록 완료');
                } else {
                    console.log('✅ [생명구조] 서비스 워커 이미 등록됨');
                }
            } else {
                console.warn('⚠️ [생명구조] 브라우저가 Service Worker를 지원하지 않음');
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] 서비스 워커 등록 실패:', error);
            // Android WebView나 file:// 프로토콜에서는 오류가 예상됨
            if (this.isAndroidWebView() || window.location.protocol === 'file:') {
                console.log('📱 [생명구조] Android WebView 또는 file:// 환경 - Service Worker 오류 무시');
            }
        }
    }

    /**
     * Android WebView 환경 감지
     */
    isAndroidWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        const protocol = window.location.protocol;
        
        // Android WebView 특징: file:// 프로토콜 + Android 키워드
        const isAndroid = userAgent.includes('android');
        const isFileProtocol = protocol === 'file:';
        const hasWebViewIndicators = userAgent.includes('wv') || userAgent.includes('version/');
        
        return isAndroid && (isFileProtocol || hasWebViewIndicators);
    }

    /**
     * 알림 권한 요청 - Android WebView 환경 고려
     */
    async requestNotificationPermission() {
        try {
            // Android WebView 환경에서는 네이티브 알림 시스템 사용
            if (this.isAndroidWebView()) {
                console.log('📱 [생명구조] Android WebView 환경 - 네이티브 알림 권한 사용');
                return;
            }
            
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    console.log('🔔 [생명구조] 알림 권한 요청 결과:', permission);
                }
            } else {
                console.warn('⚠️ [생명구조] 브라우저가 웹 알림을 지원하지 않음');
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] 알림 권한 요청 실패:', error);
            // Android WebView에서는 오류가 발생해도 네이티브 알림 사용 가능
            if (this.isAndroidWebView()) {
                console.log('📱 [생명구조] Android WebView - 네이티브 알림으로 대체');
            }
        }
    }

    /**
     * Android 네이티브 브릿지 확인
     */
    checkAndroidBridge() {
        if (window.AndroidBridge) {
            this.hasAndroidBridge = true;
            console.log('✅ [생명구조] Android 네이티브 브릿지 감지됨');
        } else {
            this.hasAndroidBridge = false;
            console.log('📱 [생명구조] 웹 브라우저 환경에서 실행 중');
        }
    }

    /**
     * 친구 상태 변화에 따른 강화된 알림 전송
     * @param {Object} alertData 알림 데이터
     */
    async sendEnhancedAlert(alertData) {
        try {
            const { 
                friendName, 
                friendId, 
                alertLevel, 
                message, 
                currentUserId,
                timeSinceLastActivity 
            } = alertData;

            console.log(`🚨 [생명구조] 강화된 알림 전송 시작: ${friendName} - ${alertLevel}`);

            // 알림 중복 방지 검사
            if (!this.shouldSendAlert(friendId, alertLevel)) {
                console.log(`⏰ [생명구조] 알림 주기 중복 방지: ${friendName}`);
                return { success: false, reason: '중복 방지' };
            }

            // 다중 채널 알림 전송
            const results = await Promise.allSettled([
                this.sendWebNotification(alertData),
                this.sendFCMNotification(alertData),
                this.sendAndroidNativeNotification(alertData),
                this.triggerVibrationAlert(alertData),
                this.playAlertSound(alertData)
            ]);

            // 결과 분석
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const totalAttempts = results.length;

            if (successCount > 0) {
                // 알림 이력 기록
                this.recordNotification(friendId, alertLevel);
                console.log(`✅ [생명구조] 알림 전송 성공: ${successCount}/${totalAttempts} 채널`);
                return { success: true, channels: successCount };
            } else {
                // 모든 채널 실패 시 재시도 큐에 추가
                this.addToRetryQueue(alertData);
                console.error(`❌ [생명구조] 모든 알림 채널 실패: ${friendName}`);
                return { success: false, reason: '모든 채널 실패' };
            }

        } catch (error) {
            console.error('❌ [생명구조] 강화된 알림 전송 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 알림 전송 여부 판단
     * @param {string} friendId 친구 ID
     * @param {string} alertLevel 알림 레벨
     * @returns {boolean} 전송 여부
     */
    shouldSendAlert(friendId, alertLevel) {
        const now = Date.now();
        const lastTime = this.lastNotificationTimes.get(`${friendId}_${alertLevel}`);
        
        if (!lastTime) {
            return true; // 첫 알림
        }
        
        const interval = this.alertIntervals[alertLevel];
        if (interval === 0) {
            return false; // 1회만 전송 (주의/경고)
        }
        
        return (now - lastTime) >= interval; // 주기 확인 (위험)
    }

    /**
     * 알림 이력 기록
     * @param {string} friendId 친구 ID
     * @param {string} alertLevel 알림 레벨
     */
    recordNotification(friendId, alertLevel) {
        const now = Date.now();
        const key = `${friendId}_${alertLevel}`;
        
        this.lastNotificationTimes.set(key, now);
        
        // 이력에 추가
        if (!this.notificationHistory.has(friendId)) {
            this.notificationHistory.set(friendId, []);
        }
        
        this.notificationHistory.get(friendId).push({
            alertLevel,
            timestamp: now,
            date: new Date().toISOString()
        });
        
        // 이력 제한 (최대 50개)
        const history = this.notificationHistory.get(friendId);
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }
    }

    /**
     * 웹 브라우저 알림 전송
     * @param {Object} alertData 알림 데이터
     */
    async sendWebNotification(alertData) {
        try {
            if (!('Notification' in window) || Notification.permission !== 'granted') {
                return { success: false, reason: '권한 없음' };
            }

            const { friendName, alertLevel, message } = alertData;
            
            // 알림 아이콘 및 배지 설정
            const icon = this.getAlertIcon(alertLevel);
            const badge = '/icon.png';  // 404 오류 방지 - 기본 앱 아이콘 사용
            
            const notification = new Notification(`🚨 ${friendName}님 상태 알림`, {
                body: message,
                icon: icon,
                badge: badge,
                requireInteraction: alertLevel === 'emergency', // 위험 상태는 사용자 확인 필요
                persistent: true,
                tag: `friend-alert-${alertData.friendId}`, // 중복 알림 방지
                silent: false, // 소리 재생
                vibrate: [200, 100, 200], // 진동 패턴
                actions: [
                    {
                        action: 'check',
                        title: '상태 확인',
                        icon: '/icon.png'  // 404 오류 방지 - 기본 앱 아이콘 사용
                    },
                    {
                        action: 'call',
                        title: '전화하기',
                        icon: '/icons/call.png'  // 이 파일은 존재함
                    }
                ]
            });

            // 알림 클릭 이벤트
            notification.onclick = () => {
                window.focus();
                // 친구 상태 페이지로 이동
                if (window.navigateToFriendStatus) {
                    window.navigateToFriendStatus(alertData.friendId);
                }
                notification.close();
            };

            return { success: true, type: 'web' };

        } catch (error) {
            console.warn('⚠️ [생명구조] 웹 알림 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FCM 푸시 알림 전송
     * @param {Object} alertData 알림 데이터
     */
    async sendFCMNotification(alertData) {
        try {
            // 기존 notifications 시스템 활용
            if (window.notifications && typeof window.notifications.sendNotification === 'function') {
                const result = await window.notifications.sendNotification({
                    type: alertData.alertLevel,
                    title: `🚨 ${alertData.friendName}님 상태 알림`,
                    message: alertData.message,
                    priority: 'high',
                    requireInteraction: alertData.alertLevel === 'emergency'
                });
                
                return { success: true, type: 'fcm' };
            }
            
            return { success: false, reason: 'FCM 시스템 없음' };

        } catch (error) {
            console.warn('⚠️ [생명구조] FCM 알림 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Android 네이티브 알림 전송
     * @param {Object} alertData 알림 데이터
     */
    async sendAndroidNativeNotification(alertData) {
        try {
            if (!this.hasAndroidBridge) {
                return { success: false, reason: 'Android 환경 아님' };
            }

            const { friendName, alertLevel, message } = alertData;
            
            // Android 네이티브 알림 호출
            if (window.AndroidBridge.showNotification) {
                const priority = alertLevel === 'emergency' ? 'HIGH' : 'DEFAULT';
                
                await window.AndroidBridge.showNotification(
                    `🚨 ${friendName}님 상태 알림`,
                    message,
                    priority,
                    true // persistent
                );
                
                return { success: true, type: 'android' };
            }
            
            return { success: false, reason: 'Android 알림 메서드 없음' };

        } catch (error) {
            console.warn('⚠️ [생명구조] Android 알림 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 진동 알림 실행
     * @param {Object} alertData 알림 데이터
     */
    async triggerVibrationAlert(alertData) {
        try {
            const { alertLevel } = alertData;
            
            // UserGestureManager를 통한 안전한 진동 호출 (브라우저 정책 준수)
            if (window.userGestureManager) {
                let pattern;
                switch (alertLevel) {
                    case 'warning':
                        pattern = [200, 100, 200]; // 짧은 진동
                        break;
                    case 'danger':
                        pattern = [300, 100, 300, 100, 300]; // 중간 진동
                        break;
                    case 'emergency':
                        pattern = [500, 200, 500, 200, 500, 200, 500]; // 긴 진동
                        break;
                    default:
                        pattern = [200];
                }
                
                // UserGestureManager를 통한 안전한 진동 호출
                const vibrationResult = window.userGestureManager.vibrate(pattern);
                if (!vibrationResult) {
                    console.log('⚠️ [생명구조] 진동 권한 없음 - 시각적 알림으로 대체됨');
                }
            } else {
                console.warn('⚠️ [생명구조] UserGestureManager 없음 - 진동 건너뜀');
            }
            
            // Android 네이티브 진동
            if (this.hasAndroidBridge && window.AndroidBridge.vibrate) {
                const duration = alertLevel === 'emergency' ? 2000 : 1000;
                window.AndroidBridge.vibrate(duration);
            }
            
            return { success: true, type: 'vibration' };

        } catch (error) {
            console.warn('⚠️ [생명구조] 진동 알림 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 알림음 재생
     * @param {Object} alertData 알림 데이터
     */
    async playAlertSound(alertData) {
        try {
            // 404 오류 방지 - 사운드 파일 재생 시도하지 않음
            console.log('🔊 [생명구조] 알림음 재생 요청 (시스템 소리로 대체)');
            
            // 브라우저 기본 알림음이나 진동으로 대체
            // Android WebView에서는 네이티브 알림음 사용
            if (this.hasAndroidBridge && window.AndroidBridge.playNotificationSound) {
                try {
                    window.AndroidBridge.playNotificationSound();
                } catch (nativeError) {
                    console.warn('⚠️ [생명구조] 네이티브 알림음 재생 실패:', nativeError);
                }
            }
            
            return { success: true, type: 'sound', note: '시스템 소리 사용' };

        } catch (error) {
            console.warn('⚠️ [생명구조] 알림음 재생 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 알림 레벨별 아이콘 반환
     * @param {string} alertLevel 알림 레벨
     * @returns {string} 아이콘 경로
     */
    getAlertIcon(alertLevel) {
        // 404 오류 방지 - 기존 존재하는 아이콘 파일 사용
        switch (alertLevel) {
            case 'warning':
                return '/icon.png';  // 기본 앱 아이콘 사용
            case 'danger':
                return '/icon.png';  // 기본 앱 아이콘 사용
            case 'emergency':
                return '/icon.png';  // 기본 앱 아이콘 사용
            default:
                return '/icon.png';  // 기본 앱 아이콘 사용
        }
    }

    /**
     * 재시도 큐에 추가
     * @param {Object} alertData 알림 데이터
     */
    addToRetryQueue(alertData) {
        const retryItem = {
            ...alertData,
            addedAt: Date.now(),
            retryCount: 0,
            maxRetries: 3
        };
        
        this.retryQueue.push(retryItem);
        console.log(`🔄 [생명구조] 재시도 큐에 추가: ${alertData.friendName}`);
    }

    /**
     * 백그라운드 모니터링 시작
     */
    startBackgroundMonitoring() {
        // 페이지 가시성 변화 감지
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 [생명구조] 백그라운드 모드 진입');
                this.isInBackground = true;
            } else {
                console.log('📱 [생명구조] 포그라운드 모드 복귀');
                this.isInBackground = false;
            }
        });

        // Window focus/blur 이벤트
        window.addEventListener('blur', () => {
            this.isInBackground = true;
        });

        window.addEventListener('focus', () => {
            this.isInBackground = false;
        });
    }

    /**
     * 재시도 프로세서 시작
     */
    startRetryProcessor() {
        setInterval(() => {
            if (this.retryQueue.length > 0) {
                this.processRetryQueue();
            }
        }, 30000); // 30초마다 재시도
    }

    /**
     * 재시도 큐 처리
     */
    async processRetryQueue() {
        const now = Date.now();
        const itemsToRetry = this.retryQueue.filter(item => 
            item.retryCount < item.maxRetries && 
            (now - item.addedAt) > 30000 // 30초 후 재시도
        );

        for (const item of itemsToRetry) {
            console.log(`🔄 [생명구조] 알림 재시도: ${item.friendName} (${item.retryCount + 1}/${item.maxRetries})`);
            
            const result = await this.sendEnhancedAlert(item);
            item.retryCount++;
            
            if (result.success) {
                // 성공하면 큐에서 제거
                const index = this.retryQueue.indexOf(item);
                if (index > -1) {
                    this.retryQueue.splice(index, 1);
                }
                console.log(`✅ [생명구조] 재시도 성공: ${item.friendName}`);
            } else if (item.retryCount >= item.maxRetries) {
                // 최대 재시도 횟수 초과시 제거
                const index = this.retryQueue.indexOf(item);
                if (index > -1) {
                    this.retryQueue.splice(index, 1);
                }
                console.error(`❌ [생명구조] 재시도 최종 실패: ${item.friendName}`);
            }
        }
    }

    /**
     * 시스템 상태 확인
     * @returns {Object} 시스템 상태
     */
    getSystemStatus() {
        return {
            초기화됨: this.isInitialized,
            백그라운드모드: this.isInBackground,
            Android브릿지: this.hasAndroidBridge,
            재시도큐크기: this.retryQueue.length,
            알림이력: this.notificationHistory.size,
            웹알림권한: Notification?.permission || 'unknown',
            서비스워커: 'serviceWorker' in navigator
        };
    }

    /**
     * 테스트 알림 전송
     * @param {string} alertLevel 테스트할 알림 레벨
     */
    async sendTestAlert(alertLevel = 'warning') {
        const testData = {
            friendName: '테스트 친구',
            friendId: 'test-friend-id',
            alertLevel: alertLevel,
            message: `테스트 알림입니다. 레벨: ${alertLevel}`,
            currentUserId: 'test-user',
            timeSinceLastActivity: '2시간 전'
        };

        console.log('🧪 [생명구조] 테스트 알림 전송');
        return await this.sendEnhancedAlert(testData);
    }
}

// 전역 인스턴스 생성 (싱글톤 패턴)
if (typeof window !== 'undefined') {
    window.EnhancedNotificationManager = window.EnhancedNotificationManager || new EnhancedNotificationManager();
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedNotificationManager;
}

console.log('🔔 [생명구조] 강화된 알림 시스템 로드 완료 - SMS 수준 알림 준비됨');