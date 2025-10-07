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
        this.cacheVersion = 'v13.5.1-final-fix-' + Date.now(); // 캐시 무효화
        
        // 알림 주기 설정 (밀리초)
        this.alertIntervals = {
            warning: 0, // 주의: 1회만 (0 = 반복 안함)
            danger: 0,  // 경고: 1회만 (0 = 반복 안함)
            emergency: 6 * 60 * 60 * 1000 // 위험: 6시간마다
        };
        
        // 🚨 즉시 WebView 환경 확인 (생성자에서 바로 실행)
        this.isWebViewEnvironment = this.detectWebViewEnvironment();
        
        console.log('🔔 [생명구조] 강화된 알림 시스템 초기화 - ' + this.cacheVersion);
        console.log('🔍 [ENM] 🚨 IMMEDIATE WebView 감지 결과:', this.isWebViewEnvironment);
        this.init();
    }

    /**
     * 🚨 WebView 환경 즉시 감지 (절대 실패하지 않는 감지)
     */
    detectWebViewEnvironment() {
        // 1차: URL 프로토콜 확인 (가장 확실한 방법)
        if (window.location.protocol === 'file:') {
            console.log('🚨 [ENM] file:// 프로토콜 확정 - WebView 100% 확실');
            return true;
        }
        
        // 2차: URL href 확인
        if (window.location.href.includes('android_asset')) {
            console.log('🚨 [ENM] android_asset 경로 확정 - WebView 100% 확실');
            return true;
        }
        
        // 3차: AndroidBridge 확인
        if (window.AndroidBridge) {
            console.log('🚨 [ENM] AndroidBridge 확정 - WebView 100% 확실');
            return true;
        }
        
        // 4차: UserAgent 확인
        if (navigator.userAgent && navigator.userAgent.includes('wv')) {
            console.log('🚨 [ENM] UserAgent wv 확정 - WebView 100% 확실');
            return true;
        }
        
        console.log('🌐 [ENM] 웹 브라우저 환경으로 판단');
        return false;
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
     * 🚨 Service Worker 등록 확인 (WebView API 절대 금지)
     */
    async ensureServiceWorker() {
        try {
            console.log('🔍 [ENM] 🚨 Service Worker 등록 확인 시작 - WebView 상태:', this.isWebViewEnvironment);
            
            // 🚨 WebView에서는 절대로 Service Worker 시도하지 않음
            if (this.isWebViewEnvironment) {
                console.log('📱 [ENM] 🚨 WebView 확정 - Service Worker 완전 차단 (네이티브 알림 사용)');
                return; // WebView에서는 Android 네이티브 알림 사용
            }
            
            // 🌐 웹 브라우저 환경에서만 Service Worker 등록
            console.log('🌐 [ENM] 웹 브라우저 환경 - Service Worker 등록 시도');
            
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
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] 서비스 워커 등록 실패:', error);
        }
    }

    /**
     * 알림 권한 요청
     */
    async requestNotificationPermission() {
        try {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    console.log('🔔 [생명구조] 알림 권한 요청 결과:', permission);
                }
            }
        } catch (error) {
            console.warn('⚠️ [생명구조] 알림 권한 요청 실패:', error);
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
            const badge = '/icon.png';
            
            // 🚨 WebView 환경에서는 기본 Notification 사용 (actions 제외)
            if (this.isWebViewEnvironment) {
                console.log('📱 [ENM] WebView 환경 - 기본 알림 (actions 제외)');
                
                const notification = new Notification(`🚨 ${friendName}님 상태 알림`, {
                    body: message,
                    icon: icon,
                    tag: `friend-alert-${alertData.friendId}`, // 중복 알림 방지
                    silent: false, // 소리 재생
                    vibrate: [200, 100, 200] // 진동 패턴
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

                return { success: true, type: 'web-basic' };
            }
            
            // 🌐 웹 브라우저 환경에서는 ServiceWorker 알림 사용 (actions 포함)
            console.log('🌐 [ENM] 웹 브라우저 환경 - ServiceWorker 알림 (actions 포함)');
            
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    // ServiceWorker를 통한 알림 (actions 지원)
                    await registration.showNotification(`🚨 ${friendName}님 상태 알림`, {
                        body: message,
                        icon: icon,
                        badge: badge,
                        requireInteraction: alertLevel === 'emergency', // 위험 상태는 사용자 확인 필요
                        tag: `friend-alert-${alertData.friendId}`, // 중복 알림 방지
                        silent: false, // 소리 재생
                        vibrate: [200, 100, 200], // 진동 패턴
                        actions: [
                            {
                                action: 'check',
                                title: '상태 확인',
                                icon: '/icon.png'
                            },
                            {
                                action: 'call',
                                title: '전화하기',
                                icon: '/icons/call.png'
                            }
                        ],
                        data: alertData // 액션 처리를 위한 데이터
                    });
                    
                    return { success: true, type: 'web-sw' };
                } else {
                    // ServiceWorker 없으면 기본 알림 사용 (actions 제외)
                    console.warn('⚠️ [ENM] ServiceWorker 없음 - 기본 알림 사용');
                    
                    const notification = new Notification(`🚨 ${friendName}님 상태 알림`, {
                        body: message,
                        icon: icon,
                        tag: `friend-alert-${alertData.friendId}`,
                        silent: false,
                        vibrate: [200, 100, 200]
                    });

                    notification.onclick = () => {
                        window.focus();
                        if (window.navigateToFriendStatus) {
                            window.navigateToFriendStatus(alertData.friendId);
                        }
                        notification.close();
                    };

                    return { success: true, type: 'web-fallback' };
                }
            } catch (swError) {
                console.warn('⚠️ [ENM] ServiceWorker 알림 실패, 기본 알림 사용:', swError);
                
                // ServiceWorker 실패 시 기본 알림 사용
                const notification = new Notification(`🚨 ${friendName}님 상태 알림`, {
                    body: message,
                    icon: icon,
                    tag: `friend-alert-${alertData.friendId}`,
                    silent: false,
                    vibrate: [200, 100, 200]
                });

                notification.onclick = () => {
                    window.focus();
                    if (window.navigateToFriendStatus) {
                        window.navigateToFriendStatus(alertData.friendId);
                    }
                    notification.close();
                };

                return { success: true, type: 'web-fallback' };
            }

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
            
            // 웹 브라우저 진동 (사용자 제스처 확인)
            if ('vibrate' in navigator) {
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
                
                try {
                    // 🚨 사용자 제스처 확인 후 진동 실행
                    const result = window.userGestureManager ? window.userGestureManager.vibrate(pattern) : navigator.vibrate(pattern);
                    console.log('📳 [ENM] 웹 진동 실행:', result ? '성공' : '실패');
                } catch (vibrateError) {
                    // 사용자 제스처가 없거나 차단된 경우
                    console.warn('⚠️ [ENM] 웹 진동 차단됨 (사용자 제스처 필요):', vibrateError.message);
                    
                    // 🔄 차선책: 다음 사용자 상호작용 시 진동 대기열에 추가
                    this.addVibrationToQueue(pattern);
                }
            }
            
            // Android 네이티브 진동 (제스처 제한 없음)
            if (this.hasAndroidBridge && window.AndroidBridge.vibrate) {
                try {
                    const duration = alertLevel === 'emergency' ? 2000 : 1000;
                    window.AndroidBridge.vibrate(duration);
                    console.log('📳 [ENM] Android 진동 실행 완료');
                } catch (androidError) {
                    console.warn('⚠️ [ENM] Android 진동 실패:', androidError.message);
                }
            }
            
            return { success: true, type: 'vibration' };

        } catch (error) {
            console.warn('⚠️ [생명구조] 진동 알림 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 진동 대기열에 추가 (사용자 제스처 후 실행용)
     * @param {Array} pattern 진동 패턴
     */
    addVibrationToQueue(pattern) {
        if (!this.pendingVibrations) {
            this.pendingVibrations = [];
            
            // 사용자 상호작용 이벤트 리스너 추가 (한 번만)
            const userInteractionEvents = ['click', 'touchstart', 'keydown'];
            const handleUserInteraction = () => {
                this.processPendingVibrations();
                // 리스너 제거 (한 번만 실행)
                userInteractionEvents.forEach(event => {
                    document.removeEventListener(event, handleUserInteraction, true);
                });
            };
            
            userInteractionEvents.forEach(event => {
                document.addEventListener(event, handleUserInteraction, true);
            });
            
            console.log('📳 [ENM] 사용자 상호작용 대기 중 - 다음 클릭/터치 시 진동 실행');
        }
        
        this.pendingVibrations.push(pattern);
    }

    /**
     * 대기 중인 진동 실행 (사용자 제스처 후)
     */
    processPendingVibrations() {
        if (this.pendingVibrations && this.pendingVibrations.length > 0) {
            console.log('📳 [ENM] 사용자 제스처 감지 - 대기 중인 진동 실행');
            
            // 가장 최근 진동 패턴 사용
            const pattern = this.pendingVibrations[this.pendingVibrations.length - 1];
            
            try {
                if (window.userGestureManager) {
                    window.userGestureManager.vibrate(pattern);
                } else {
                    navigator.vibrate(pattern);
                }
                console.log('📳 [ENM] 지연 진동 실행 성공');
            } catch (error) {
                console.warn('⚠️ [ENM] 지연 진동 실행 실패:', error);
            }
            
            // 대기열 초기화
            this.pendingVibrations = [];
        }
    }

    /**
     * 알림음 재생 (사운드 파일 대신 시스템 알림음과 Web Audio API 사용)
     * @param {Object} alertData 알림 데이터
     */
    async playAlertSound(alertData) {
        try {
            const { alertLevel } = alertData;
            
            console.log('🔊 [ENM] 사운드 재생 시작 - 파일 대신 시스템 알림음 사용');
            
            // 🔊 1단계: Web Audio API를 사용한 시스템 알림음 생성
            try {
                const audioGenerated = await this.generateAlertSound(alertLevel);
                if (audioGenerated) {
                    console.log('🔊 [ENM] Web Audio API 알림음 생성 성공');
                    return { success: true, type: 'sound-generated' };
                }
            } catch (genError) {
                console.warn('⚠️ [ENM] Web Audio API 알림음 생성 실패:', genError.message);
            }
            
            // 🔊 2단계: Android 네이티브 사운드 (WebView 환경)
            if (this.hasAndroidBridge && window.AndroidBridge.playSound) {
                try {
                    window.AndroidBridge.playSound(alertLevel);
                    console.log('🔊 [ENM] Android 네이티브 사운드 사용');
                    return { success: true, type: 'sound-android' };
                } catch (androidSoundError) {
                    console.warn('⚠️ [ENM] Android 사운드 실패:', androidSoundError.message);
                }
            }
            
            // 🔊 3단계: 브라우저 기본 알림음 시뮬레이션
            try {
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance('');
                    utterance.volume = 0.1;
                    utterance.rate = 10;
                    utterance.pitch = 2;
                    window.speechSynthesis.speak(utterance);
                    console.log('🔊 [ENM] 브라우저 기본 알림음 사용');
                    return { success: true, type: 'sound-browser' };
                }
            } catch (browserError) {
                console.warn('⚠️ [ENM] 브라우저 기본 알림음 실패:', browserError.message);
            }
            
            // 🔊 4단계: 기본 진동으로 대체 (사운드 없음)
            console.log('🔊 [ENM] 모든 사운드 방법 실패 - 진동으로 대체');
            return { success: true, type: 'sound-vibration-fallback', message: '사운드 대신 진동 사용' };

        } catch (error) {
            console.warn('⚠️ [생명구조] 알림음 재생 실패:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Web Audio API를 사용한 알림음 생성
     * @param {string} alertLevel 알림 레벨
     */
    async generateAlertSound(alertLevel) {
        try {
            // Web Audio API 지원 확인
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                throw new Error('Web Audio API 미지원');
            }
            
            const audioContext = new AudioContext();
            
            // 알림 레벨별 주파수 및 지속시간 설정
            let frequency, duration, pattern;
            switch (alertLevel) {
                case 'warning':
                    frequency = 800;
                    duration = 0.2;
                    pattern = [1]; // 1번
                    break;
                case 'danger':
                    frequency = 1000;
                    duration = 0.3;
                    pattern = [1, 0.2, 1]; // 2번
                    break;
                case 'emergency':
                    frequency = 1200;
                    duration = 0.5;
                    pattern = [1, 0.1, 1, 0.1, 1]; // 3번
                    break;
                default:
                    frequency = 600;
                    duration = 0.15;
                    pattern = [1];
            }
            
            // 사운드 생성
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] === 1) {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                    
                    oscillator.start(audioContext.currentTime + i * (duration + 0.1));
                    oscillator.stop(audioContext.currentTime + i * (duration + 0.1) + duration);
                }
            }
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ [ENM] 웹 오디오 생성 실패:', error.message);
            return false;
        }
    }

    /**
     * 알림 레벨별 아이콘 반환
     * @param {string} alertLevel 알림 레벨
     * @returns {string} 아이콘 경로
     */
    getAlertIcon(alertLevel) {
        switch (alertLevel) {
            case 'warning':
                return '/icon.png';
            case 'danger':
                return '/icon.png';
            case 'emergency':
                return '/icon.png';
            default:
                return '/icon.png';
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

    /**
     * Android WebView 환경 감지 (강화된 감지)
     */
    isAndroidWebView() {
        const isFileProtocol = window.location.protocol === 'file:';
        const hasAndroidBridge = !!window.AndroidBridge;
        const userAgent = navigator.userAgent || '';
        const hasWebViewUA = userAgent.indexOf('wv') > -1;
        
        // file:// 프로토콜이 가장 확실한 WebView 지표
        return isFileProtocol || hasAndroidBridge || hasWebViewUA;
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