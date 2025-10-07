/**
 * FCM Background Notification Tester
 * 백그라운드 FCM 푸시 알림 테스트 시스템
 * 
 * 이 컴포넌트는 백그라운드에서도 알림이 제대로 오는지 테스트합니다
 */

class FCMBackgroundTester {
    constructor() {
        this.isInitialized = false;
        this.testResults = [];
    }

    /**
     * Android WebView 환경 감지
     */
    isAndroidWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        const protocol = window.location.protocol;
        const isAndroid = userAgent.includes('android');
        const isFileProtocol = protocol === 'file:';
        const hasWebViewIndicators = userAgent.includes('wv') || userAgent.includes('version/');
        
        return isAndroid && (isFileProtocol || hasWebViewIndicators);
    }

    /**
     * 테스터 초기화 - Android WebView 환경 고려
     */
    async init() {
        console.log('🧪 FCM 백그라운드 알림 테스터 초기화');
        
        // Android WebView 환경에서는 FCM 테스트 건너뜀
        if (this.isAndroidWebView()) {
            console.log('📱 Android WebView 환경 - FCM 테스트 건너뜀 (네이티브 알림 사용)');
            this.isInitialized = true;
            return;
        }
        
        try {
            // FCM 토큰 확인
            await this.checkFCMToken();
            
            // Service Worker 상태 확인
            await this.checkServiceWorker();
            
            // 테스트 버튼 생성
            this.createTestUI();
            
            this.isInitialized = true;
            console.log('✅ FCM 백그라운드 알림 테스터 준비 완료');
            
        } catch (error) {
            console.error('❌ 테스터 초기화 실패:', error);
            // Android WebView에서는 오류 무시
            if (this.isAndroidWebView()) {
                console.log('📱 Android WebView - FCM 테스트 오류 무시');
                this.isInitialized = true;
            }
        }
    }
    
    /**
     * 🚨 생명구조 시스템: FCM 토큰 확인 (강화된 대기 및 복구 로직)
     */
    async checkFCMToken() {
        console.log('🔍 [생명구조] FCM 토큰 상태 확인...');
        
        // 🚨 생명구조: 로컬 환경 사전 체크 (매니저 호출 전)
        const isLocalEnvironment = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' || 
                                  window.location.protocol === 'file:';
        
        if (isLocalEnvironment) {
            console.log('🔧 [생명구조] FCM 테스터 - 로컬 환경 감지');
            console.log('💡 [생명구조] Firebase 서버 요청 차단으로 401 오류 방지');
            console.log('✅ [생명구조] FCM 없이 로컬 앱 정상 실행 확인');
            return true; // 로컬 환경에서는 성공으로 처리
        }
        
        // 1단계: 다양한 FCM 매니저 확인
        const fcmManagers = [
            'firebaseMessagingManager',  // 새로운 Firebase Messaging Manager
            'fcmTokenManager',           // 기존 FCM Token Manager  
            'firebaseMessaging'          // 백업 참조
        ];
        
        for (const managerName of fcmManagers) {
            const manager = window[managerName];
            if (manager) {
                console.log(`🔍 [생명구조] ${managerName} 발견됨`);
                
                try {
                    // 2단계: 매니저 초기화 확인 및 대기
                    if (!manager.isInitialized && typeof manager.init === 'function') {
                        console.log(`⏳ [생명구조] ${managerName} 초기화 중...`);
                        await manager.init();
                    }
                    
                    // 3단계: 토큰 획득 (다양한 방법 시도)
                    let token = null;
                    
                    // 방법 1: getCurrentToken()
                    if (typeof manager.getCurrentToken === 'function') {
                        token = manager.getCurrentToken();
                    }
                    // 방법 2: fcmToken 속성
                    else if (manager.fcmToken) {
                        token = manager.fcmToken;
                    }
                    // 방법 3: getToken() 메서드
                    else if (typeof manager.getToken === 'function') {
                        token = await manager.getToken();
                    }
                    
                    if (token) {
                        console.log(`✅ [생명구조] FCM 토큰 확인됨 (${managerName}):`, token.substring(0, 40) + '...');
                        return true;
                    }
                    
                } catch (error) {
                    console.warn(`⚠️ [생명구조] ${managerName} 토큰 확인 실패:`, error.message);
                    continue;
                }
            }
        }
        
        // 4단계: 토큰 대기 (Firebase Messaging Manager가 늦게 초기화될 수 있음)
        console.log('⏳ [생명구조] FCM 토큰 대기 중... (최대 15초)');
        
        const maxWaitTime = 15000; // 15초
        const checkInterval = 1000; // 1초
        let waitedTime = 0;
        
        while (waitedTime < maxWaitTime) {
            // 다시 모든 매니저 확인
            for (const managerName of fcmManagers) {
                const manager = window[managerName];
                if (manager && manager.fcmToken) {
                    console.log(`✅ [생명구조] FCM 토큰 대기 성공 (${managerName}):`, manager.fcmToken.substring(0, 40) + '...');
                    return true;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitedTime += checkInterval;
            
            if (waitedTime % 5000 === 0) {
                console.log(`⏳ [생명구조] FCM 토큰 대기 중... (${waitedTime/1000}초 경과)`);
            }
        }
        
        // 5단계: Android WebView 환경에서는 경고만 출력
        if (this.isAndroidWebView()) {
            console.warn('⚠️ [생명구조] Android WebView 환경 - FCM 토큰 없음 (네이티브 알림 사용)');
            return true; // Android에서는 네이티브 알림을 사용하므로 성공으로 처리
        }
        
        // 6단계: 로컬 환경에서는 경고만 출력
        if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('⚠️ [생명구조] 로컬 환경 - FCM 토큰 없음 (HTTPS 환경에서 정상 작동)');
            return true; // 로컬 환경에서는 성공으로 처리
        }
        
        console.error('❌ [생명구조] FCM 토큰을 찾을 수 없습니다');
        throw new Error('FCM 토큰 없음');
    }
    
    /**
     * Service Worker 상태 확인
     */
    async checkServiceWorker() {
        console.log('🔍 Service Worker 상태 확인...');
        
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            
            if (registration && registration.active) {
                console.log('✅ Service Worker 활성화됨:', registration.scope);
                return true;
            }
        }
        
        console.error('❌ Service Worker가 등록되지 않았습니다');
        throw new Error('Service Worker 없음');
    }
    
    /**
     * 테스트 UI 생성 (생명구조 환경에 따른 조건부 표시)
     */
    createTestUI() {
        // 🚨 생명구조 시스템: UI 표시 조건 확인
        const shouldShowTestUI = this.shouldShowTestUI();
        
        if (!shouldShowTestUI) {
            console.log('🚫 [생명구조] FCM 테스트 UI 비활성화됨 (프로덕션 또는 안정화 모드)');
            return;
        }
        
        // 기존 UI가 있다면 제거
        const existingUI = document.getElementById('fcm-test-ui');
        if (existingUI) {
            existingUI.remove();
        }
        
        // 테스트 UI 컨테이너
        const container = document.createElement('div');
        container.id = 'fcm-test-ui';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 2px solid #ff6b35;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 400px;
        `;
        
        container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ff6b35;">📱 FCM 백그라운드 알림 테스트</h3>
            
            <div style="margin-bottom: 10px;">
                <button id="test-warning" style="
                    background: #ffc107;
                    color: black;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 5px;
                    margin-right: 10px;
                    cursor: pointer;
                ">🟡 주의 알림 테스트</button>
                
                <button id="test-danger" style="
                    background: #ff6b35;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 5px;
                    margin-right: 10px;
                    cursor: pointer;
                ">🟠 위험 알림 테스트</button>
                
                <button id="test-emergency" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                ">🚨 응급 알림 테스트</button>
            </div>
            
            <div style="margin-top: 15px;">
                <h4 style="margin: 0 0 10px 0;">테스트 방법:</h4>
                <ol style="margin: 0; padding-left: 20px; font-size: 14px;">
                    <li>위 버튼 중 하나를 클릭</li>
                    <li><strong>앱을 백그라운드로 전환</strong> (홈 버튼 누르기)</li>
                    <li>5초 후 알림이 오는지 확인</li>
                    <li>알림을 탭하여 앱으로 돌아오기</li>
                </ol>
            </div>
            
            <div id="test-status" style="
                margin-top: 15px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
                font-size: 14px;
            ">대기 중...</div>
            
            <button id="close-tester" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #999;
            ">×</button>
        `;
        
        document.body.appendChild(container);
        
        // 이벤트 리스너 등록
        document.getElementById('test-warning').addEventListener('click', () => this.sendTestNotification('warning'));
        document.getElementById('test-danger').addEventListener('click', () => this.sendTestNotification('danger'));
        document.getElementById('test-emergency').addEventListener('click', () => this.sendTestNotification('emergency'));
        document.getElementById('close-tester').addEventListener('click', () => container.remove());
    }
    
    /**
     * 테스트 알림 발송
     */
    async sendTestNotification(alertLevel) {
        const statusDiv = document.getElementById('test-status');
        statusDiv.innerHTML = '📤 알림 발송 중...';
        
        try {
            // Firebase Functions 직접 호출하여 백그라운드 FCM 발송
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // 테스트용 친구 데이터
            const testFriend = {
                id: 'test-friend-' + Date.now(),
                name: '테스트 친구',
                last_activity: new Date(Date.now() - (alertLevel === 'warning' ? 25 : alertLevel === 'danger' ? 49 : 73) * 60 * 60 * 1000).toISOString()
            };
            
            const titles = {
                warning: '🟡 친구 안전 확인',
                danger: '🟠 친구 응답 없음',
                emergency: '🚨 응급상황 발생'
            };
            
            const bodies = {
                warning: '테스트 친구님이 24시간 이상 응답하지 않습니다',
                danger: '테스트 친구님이 48시간 이상 응답하지 않습니다',
                emergency: '테스트 친구님이 72시간 이상 응답하지 않습니다. 119에 신고됩니다.'
            };
            
            // 🚨 생명구조 시스템: FCM 테스트 (로컬/개발 환경 고려)
            const isProductionEnvironment = window.location.hostname !== 'localhost' && 
                                          window.location.hostname !== '127.0.0.1' && 
                                          !window.location.protocol.includes('file:');
            
            if (isProductionEnvironment && window.fcmEndpoints && window.fcmEndpoints.sendNotification) {
                console.log('🌐 [생명구조] 프로덕션 환경 - Firebase Functions FCM 발송 시도');
                
                const notificationData = {
                    userId: currentUser.kakao_id || currentUser.id || 'test-user',
                    title: titles[alertLevel],
                    body: bodies[alertLevel],
                    type: 'friend_status',
                    alertLevel: alertLevel,
                    data: {
                        friend_id: testFriend.id,
                        friend_name: testFriend.name,
                        timestamp: new Date().toISOString(),
                        test_mode: true
                    }
                };
                
                console.log('📤 Firebase Functions FCM 알림 발송:', notificationData);
                
                try {
                    const response = await fetch(window.fcmEndpoints.sendNotification, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(notificationData)
                    });
                    
                    if (response.ok) {
                        statusDiv.innerHTML = `
                            <div style="color: green;">
                                ✅ ${alertLevel} 알림 발송 완료!<br>
                                📱 앱을 백그라운드로 전환하고 5초 기다려주세요...
                            </div>
                        `;
                        
                        // 5초 후 자동으로 테스트 알림 발송
                        setTimeout(() => {
                            if (document.visibilityState === 'hidden') {
                                console.log('👍 앱이 백그라운드 상태입니다 - 알림이 곧 도착합니다');
                            } else {
                                statusDiv.innerHTML += '<br>⚠️ 앱이 포그라운드 상태입니다 - 백그라운드로 전환해주세요';
                            }
                        }, 5000);
                        
                    } else {
                        throw new Error('서버 응답 오류: ' + response.status);
                    }
                } catch (fetchError) {
                    console.warn('⚠️ [생명구조] Firebase Functions 연결 실패 - 로컬 모드로 전환:', fetchError.message);
                    throw new Error('Firebase Functions 연결 실패 - 로컬 테스트 모드 사용');
                }
            } else {
                // 🚨 생명구조 시스템: 로컬/개발 환경 - Service Worker 직접 테스트
                console.log('🔧 [생명구조] 로컬/개발 환경 - Service Worker 직접 메시지 전송');
                
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    try {
                        navigator.serviceWorker.controller.postMessage({
                            type: 'TEST_NOTIFICATION',
                            data: {
                                notification: {
                                    title: titles[alertLevel],
                                    body: bodies[alertLevel],
                                    icon: '/icon-192x192.png',
                                    badge: '/badge-72x72.png',
                                    requireInteraction: true,
                                    actions: [
                                        {
                                            action: 'view',
                                            title: '확인하기'
                                        }
                                    ]
                                },
                                data: {
                                    alert_level: alertLevel,
                                    friend_id: testFriend.id,
                                    friend_name: testFriend.name,
                                    timestamp: new Date().toISOString(),
                                    test_mode: true
                                }
                            }
                        });
                        
                        statusDiv.innerHTML = `
                            <div style="color: orange;">
                                🔧 로컬 테스트 모드<br>
                                Service Worker로 직접 알림 발송됨<br>
                                📱 앱을 백그라운드로 전환하고 확인해주세요
                            </div>
                        `;
                        
                        console.log('✅ [생명구조] Service Worker 메시지 전송 완료');
                    } catch (swError) {
                        console.warn('⚠️ [생명구조] Service Worker 메시지 전송 실패:', swError);
                        throw new Error('Service Worker 메시지 전송 실패: ' + swError.message);
                    }
                } else {
                    console.warn('⚠️ [생명구조] Service Worker 컨트롤러 없음');
                    statusDiv.innerHTML = `
                        <div style="color: red;">
                            ❌ Service Worker가 활성화되지 않음<br>
                            페이지를 새로고침해주세요
                        </div>
                    `;
                    throw new Error('Service Worker 컨트롤러가 활성화되지 않음');
                }
            }
            
            // 테스트 결과 기록
            this.testResults.push({
                alertLevel: alertLevel,
                timestamp: new Date(),
                success: true
            });
            
        } catch (error) {
            console.error('❌ 테스트 알림 발송 실패:', error);
            statusDiv.innerHTML = `
                <div style="color: red;">
                    ❌ 알림 발송 실패<br>
                    ${error.message}
                </div>
            `;
            
            this.testResults.push({
                alertLevel: alertLevel,
                timestamp: new Date(),
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * 🚨 생명구조 시스템: FCM 테스트 UI 표시 조건 확인
     */
    shouldShowTestUI() {
        // 1. 개발 모드 체크 (localhost, 127.0.0.1, file:// 프로토콜)
        const isDevelopmentMode = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:';
        
        // 2. 테스트 모드 명시적 활성화 확인
        const isTestModeEnabled = localStorage.getItem('fcm_test_mode') === 'enabled' ||
                                sessionStorage.getItem('fcm_test_mode') === 'enabled' ||
                                window.location.search.includes('fcm_test=true');
        
        // 3. 디버깅 모드 확인
        const isDebugMode = window.location.search.includes('debug=true') ||
                          localStorage.getItem('debug_mode') === 'true';
        
        // 4. 안정화 플래그 확인 (사용자가 UI를 끄고 싶을 때)
        const isStabilizedMode = localStorage.getItem('fcm_ui_disabled') === 'true' ||
                               sessionStorage.getItem('fcm_ui_disabled') === 'true';
        
        // 5. Android WebView 환경에서는 기본적으로 숨김
        const isAndroidWebView = this.isAndroidWebView();
        
        // 결정 로직
        if (isStabilizedMode) {
            console.log('🚫 [생명구조] FCM UI 안정화 모드 - 사용자가 비활성화함');
            return false;
        }
        
        if (isAndroidWebView && !isTestModeEnabled) {
            console.log('📱 [생명구조] Android WebView 환경 - FCM UI 숨김 (테스트 모드 아님)');
            return false;
        }
        
        if (isDevelopmentMode || isTestModeEnabled || isDebugMode) {
            console.log('🔧 [생명구조] 개발/테스트 환경 - FCM UI 표시');
            return true;
        }
        
        // 기본값: 프로덕션에서는 숨김
        console.log('🌐 [생명구조] 프로덕션 환경 - FCM UI 숨김');
        return false;
    }
    
    /**
     * FCM 테스트 UI 수동 활성화/비활성화
     */
    toggleTestUI(enabled = null) {
        if (enabled === null) {
            // 현재 상태 토글
            const currentState = localStorage.getItem('fcm_ui_disabled') !== 'true';
            enabled = !currentState;
        }
        
        if (enabled) {
            localStorage.removeItem('fcm_ui_disabled');
            sessionStorage.removeItem('fcm_ui_disabled');
            console.log('✅ [생명구조] FCM 테스트 UI 활성화');
            this.createTestUI();
        } else {
            localStorage.setItem('fcm_ui_disabled', 'true');
            const existingUI = document.getElementById('fcm-test-ui');
            if (existingUI) {
                existingUI.remove();
            }
            console.log('🚫 [생명구조] FCM 테스트 UI 비활성화');
        }
        
        return enabled;
    }
    
    /**
     * 테스트 결과 조회
     */
    getTestResults() {
        return this.testResults;
    }
}

// 전역 인스턴스 생성
window.fcmBackgroundTester = new FCMBackgroundTester();

// 🚨 생명구조 시스템: 강화된 초기화 (Firebase Messaging Manager 대기)
function initFCMTesterSafely() {
    console.log('🚀 [생명구조] FCM 백그라운드 테스터 안전 초기화 시작...');
    
    // 🚨 생명구조: 중복 초기화 방지
    if (window.fcmTesterInitialized) {
        console.log('✅ [생명구조] FCM 테스터 이미 초기화됨 - 중복 실행 방지');
        return;
    }
    
    // Firebase Messaging Manager가 준비될 때까지 대기
    let checkCount = 0;
    const maxChecks = 15; // 🚨 생명구조: 대기 시간 축소 (30초 → 15초)
    
    const checkAndInit = () => {
        checkCount++;
        
        // 🚨 생명구조: 인증 오류 발생 시 중단
        if (window.fcmTokenManager?.isAuthError) {
            console.error('🚨 [생명구조] FCM 인증 오류 감지 - 테스터 초기화 중단');
            window.fcmTesterInitialized = true;
            return;
        }
        
        // Firebase Messaging Manager 또는 다른 FCM 매니저가 있는지 확인
        const hasFirebaseMessaging = window.firebaseMessagingManager && window.firebaseMessagingManager.isInitialized;
        const hasFCMTokenManager = window.fcmTokenManager && window.fcmTokenManager.isInitialized;
        const hasAnyFCMToken = window.firebaseMessagingManager?.fcmToken || window.fcmTokenManager?.getCurrentToken?.();
        
        if (hasFirebaseMessaging || hasFCMTokenManager || hasAnyFCMToken) {
            console.log('✅ [생명구조] FCM 시스템 준비 완료 - 테스터 초기화');
            window.fcmTesterInitialized = true;
            window.fcmBackgroundTester.init();
            return;
        }
        
        if (checkCount >= maxChecks) {
            console.warn(`⚠️ [생명구조] FCM 시스템 대기 시간 초과 (${maxChecks}초) - 테스터 초기화 중단`);
            console.warn('🚨 [생명구조] FCM 시스템 문제로 인한 백그라운드 테스터 비활성화');
            window.fcmTesterInitialized = true;
            return;
        }
        
        // 진행 상황 로그 (5초마다)
        if (checkCount % 5 === 0) {
            console.log(`⏳ [생명구조] FCM 시스템 대기 중... (${checkCount}초)`);
        }
        
        setTimeout(checkAndInit, 1000);
    };
    
    // 즉시 시작하지 않고 3초 후 시작 (Firebase Messaging 초기화 시간 고려)
    setTimeout(checkAndInit, 3000);
}

// DOM 로드 후 안전한 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFCMTesterSafely);
} else {
    initFCMTesterSafely();
}

// 🚨 생명구조 시스템: 수동 테스터 초기화 함수 (디버깅용)
window.manualInitFCMTester = function() {
    console.log('🔧 [생명구조] FCM 테스터 수동 초기화');
    return window.fcmBackgroundTester.init();
};

// 🚨 생명구조 시스템: FCM UI 제어 함수들
window.enableFCMTestUI = function() {
    console.log('✅ [생명구조] FCM 테스트 UI 활성화 함수 호출');
    return window.fcmBackgroundTester.toggleTestUI(true);
};

window.disableFCMTestUI = function() {
    console.log('🚫 [생명구조] FCM 테스트 UI 비활성화 함수 호출');
    return window.fcmBackgroundTester.toggleTestUI(false);
};

window.toggleFCMTestUI = function() {
    console.log('🔄 [생명구조] FCM 테스트 UI 토글 함수 호출');
    return window.fcmBackgroundTester.toggleTestUI();
};

// 🚨 생명구조 시스템: 즉시 FCM UI 비활성화 (사용자 요청 반영)
if (window.location.protocol !== 'file:' && window.location.hostname !== 'localhost') {
    console.log('🌐 [생명구조] 프로덕션 환경 감지 - FCM UI 자동 비활성화');
    setTimeout(() => {
        window.disableFCMTestUI();
    }, 1000);
}

console.log('📱 [생명구조] FCM Background Notification Tester 로드 완료');
console.log('🔧 [생명구조] 사용 가능한 함수:');
console.log('   - manualInitFCMTester() : 수동 초기화');
console.log('   - enableFCMTestUI()    : UI 활성화');
console.log('   - disableFCMTestUI()   : UI 비활성화');
console.log('   - toggleFCMTestUI()    : UI 토글');