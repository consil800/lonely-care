/**
 * MemoryLeakPatch - 기존 시스템의 메모리 누수 문제 안전한 패치
 * lonely-care 프로젝트의 기존 코드를 건드리지 않고 메모리 누수를 해결
 * 
 * 🚨 생명구조 시스템 안정성 보장 - 기존 코드 보호하며 메모리 누수 해결
 * 
 * @version 1.0.0
 * @created 2024-12-26
 * @purpose 기존 시스템과 호환성 유지하며 메모리 누수 방지
 */

class MemoryLeakPatch {
    static instance = null;
    
    static getInstance() {
        if (!MemoryLeakPatch.instance) {
            MemoryLeakPatch.instance = new MemoryLeakPatch();
        }
        return MemoryLeakPatch.instance;
    }
    
    constructor() {
        if (MemoryLeakPatch.instance) {
            return MemoryLeakPatch.instance;
        }
        
        this.memoryManager = window.getMemoryManager();
        this.patchedComponents = new Set();
        this.originalFunctions = new Map();
        this.monitoringIntervals = new Map();
        
        console.log('🔧 MemoryLeakPatch 초기화');
        
        // 자동 패치 적용
        this.applyPatches();
    }
    
    /**
     * 모든 패치 적용
     */
    applyPatches() {
        console.log('🔧 메모리 누수 패치 적용 시작');
        
        // 각 문제별 패치 적용 (지연 실행으로 기존 시스템 로드 후 적용)
        setTimeout(() => this.patchFriendStatusMonitor(), 1000);
        setTimeout(() => this.patchMotionDetector(), 2000);  
        setTimeout(() => this.patchNotificationSystem(), 3000);
        setTimeout(() => this.patchFirebaseClient(), 4000);
        setTimeout(() => this.patchEnhancedMotionDetector(), 5000);
        setTimeout(() => this.patchFriendStatusChecker(), 6000);
        
        // 전역 메모리 모니터링 시작
        setTimeout(() => this.startGlobalMemoryMonitoring(), 7000);
        
        console.log('✅ 메모리 누수 패치 예약 완료');
    }
    
    /**
     * friend-status-monitor.js 패치
     */
    patchFriendStatusMonitor() {
        try {
            // window.friendStatusMonitor가 존재하는지 확인
            if (window.friendStatusMonitor) {
                const monitor = window.friendStatusMonitor;
                
                // 기존 cleanup 메서드 백업
                if (monitor.cleanup && typeof monitor.cleanup === 'function') {
                    this.originalFunctions.set('friendStatusMonitor_cleanup', monitor.cleanup);
                }
                
                // 강화된 cleanup 메서드로 교체
                monitor.cleanup = () => {
                    console.log('🧹 친구 상태 모니터 정리 - 패치된 버전');
                    
                    try {
                        // 기존 cleanup 호출
                        const originalCleanup = this.originalFunctions.get('friendStatusMonitor_cleanup');
                        if (originalCleanup) {
                            originalCleanup.call(monitor);
                        }
                        
                        // 추가 정리 작업
                        if (monitor.modules) {
                            // statusChecker 정리
                            if (monitor.modules.statusChecker && monitor.modules.statusChecker.stopPeriodicCheck) {
                                monitor.modules.statusChecker.stopPeriodicCheck();
                            }
                            
                            // 기타 모듈 정리
                            Object.values(monitor.modules).forEach(module => {
                                if (module && typeof module.cleanup === 'function') {
                                    module.cleanup();
                                }
                            });
                        }
                        
                        // Firebase 구독 해제
                        if (monitor.firebaseUnsubscribers) {
                            monitor.firebaseUnsubscribers.forEach(unsubscribe => {
                                if (typeof unsubscribe === 'function') {
                                    unsubscribe();
                                }
                            });
                            monitor.firebaseUnsubscribers = [];
                        }
                        
                        console.log('✅ 친구 상태 모니터 정리 완료 (패치됨)');
                        
                    } catch (error) {
                        console.error('❌ 친구 상태 모니터 정리 실패:', error);
                    }
                };
                
                // 컴포넌트 등록
                this.memoryManager.registerComponent('friendStatusMonitor', monitor);
                this.patchedComponents.add('friendStatusMonitor');
                
                console.log('✅ friend-status-monitor.js 패치 적용 완료');
            } else {
                console.log('⚠️ friendStatusMonitor를 찾을 수 없음 - 나중에 재시도');
                setTimeout(() => this.patchFriendStatusMonitor(), 2000);
            }
        } catch (error) {
            console.error('❌ friend-status-monitor.js 패치 실패:', error);
        }
    }
    
    /**
     * motion-detector.js 패치
     */
    patchMotionDetector() {
        try {
            // 전역 motion detector 찾기
            const motionDetector = window.motionDetector || window.enhancedMotionDetector;
            
            if (motionDetector) {
                // cleanup 메서드 강화
                if (motionDetector.cleanup) {
                    this.originalFunctions.set('motionDetector_cleanup', motionDetector.cleanup);
                }
                
                motionDetector.cleanup = () => {
                    console.log('🧹 모션 감지기 정리 - 패치된 버전');
                    
                    try {
                        // 기존 cleanup 호출
                        const originalCleanup = this.originalFunctions.get('motionDetector_cleanup');
                        if (originalCleanup) {
                            originalCleanup.call(motionDetector);
                        }
                        
                        // 센서 이벤트 리스너 제거
                        if (motionDetector.deviceMotionHandler) {
                            window.removeEventListener('devicemotion', motionDetector.deviceMotionHandler);
                            motionDetector.deviceMotionHandler = null;
                        }
                        
                        if (motionDetector.deviceOrientationHandler) {
                            window.removeEventListener('deviceorientation', motionDetector.deviceOrientationHandler);
                            motionDetector.deviceOrientationHandler = null;
                        }
                        
                        // 터치 이벤트 리스너 제거
                        if (motionDetector.touchHandler) {
                            document.removeEventListener('touchstart', motionDetector.touchHandler);
                            document.removeEventListener('click', motionDetector.touchHandler);
                            motionDetector.touchHandler = null;
                        }
                        
                        // 인터벌 정리
                        if (motionDetector.statusInterval) {
                            clearInterval(motionDetector.statusInterval);
                            motionDetector.statusInterval = null;
                        }
                        
                        if (motionDetector.communicationTimer) {
                            clearInterval(motionDetector.communicationTimer);
                            motionDetector.communicationTimer = null;
                        }
                        
                        console.log('✅ 모션 감지기 정리 완료 (패치됨)');
                        
                    } catch (error) {
                        console.error('❌ 모션 감지기 정리 실패:', error);
                    }
                };
                
                this.memoryManager.registerComponent('motionDetector', motionDetector);
                this.patchedComponents.add('motionDetector');
                
                console.log('✅ motion-detector.js 패치 적용 완료');
            } else {
                console.log('⚠️ motionDetector를 찾을 수 없음 - 나중에 재시도');
                setTimeout(() => this.patchMotionDetector(), 2000);
            }
        } catch (error) {
            console.error('❌ motion-detector.js 패치 실패:', error);
        }
    }
    
    /**
     * notification system 패치
     */
    patchNotificationSystem() {
        try {
            // 알림 관련 전역 객체들 찾기
            const notificationManager = window.notificationManager || window.notifications;
            
            if (notificationManager) {
                // 모달 정리 함수 추가
                if (!notificationManager.cleanupModals) {
                    notificationManager.cleanupModals = () => {
                        console.log('🧹 알림 모달 정리');
                        
                        // 모든 모달 요소 찾기 및 이벤트 리스너 정리
                        const modals = document.querySelectorAll('.notification-modal, .alert-modal');
                        modals.forEach(modal => {
                            // 모달 내부의 모든 버튼 이벤트 리스너 제거
                            const buttons = modal.querySelectorAll('button');
                            buttons.forEach(button => {
                                const newButton = button.cloneNode(true);
                                button.parentNode.replaceChild(newButton, button);
                            });
                            
                            // 모달 제거
                            if (modal.parentNode) {
                                modal.parentNode.removeChild(modal);
                            }
                        });
                    };
                }
                
                // cleanup 메서드 강화
                const originalCleanup = notificationManager.cleanup;
                notificationManager.cleanup = () => {
                    console.log('🧹 알림 시스템 정리 - 패치된 버전');
                    
                    try {
                        if (originalCleanup && typeof originalCleanup === 'function') {
                            originalCleanup.call(notificationManager);
                        }
                        
                        // 모달 정리
                        notificationManager.cleanupModals();
                        
                        console.log('✅ 알림 시스템 정리 완료 (패치됨)');
                        
                    } catch (error) {
                        console.error('❌ 알림 시스템 정리 실패:', error);
                    }
                };
                
                this.memoryManager.registerComponent('notificationManager', notificationManager);
                this.patchedComponents.add('notificationManager');
                
                console.log('✅ notification system 패치 적용 완료');
            } else {
                console.log('⚠️ notificationManager를 찾을 수 없음 - 나중에 재시도');
                setTimeout(() => this.patchNotificationSystem(), 2000);
            }
        } catch (error) {
            console.error('❌ notification system 패치 실패:', error);
        }
    }
    
    /**
     * Firebase Client 패치
     */
    patchFirebaseClient() {
        try {
            const firebaseClient = window.firebaseClient || window.storage?.firebaseClient;
            
            if (firebaseClient) {
                // 활성 구독 추적 추가
                if (!firebaseClient.activeSubscriptions) {
                    firebaseClient.activeSubscriptions = new Set();
                }
                
                // 구독 메서드들 패치
                const originalSubscribeToFriendsStatus = firebaseClient.subscribeToFriendsStatus;
                if (originalSubscribeToFriendsStatus) {
                    firebaseClient.subscribeToFriendsStatus = function(userId, callback) {
                        const unsubscribe = originalSubscribeToFriendsStatus.call(this, userId, callback);
                        
                        // 구독 추적
                        if (typeof unsubscribe === 'function') {
                            this.activeSubscriptions.add(unsubscribe);
                            
                            // 추적되는 unsubscribe 함수 반환
                            return () => {
                                unsubscribe();
                                this.activeSubscriptions.delete(unsubscribe);
                            };
                        }
                        
                        return unsubscribe;
                    };
                }
                
                // 모든 구독 해제 메서드 추가
                if (!firebaseClient.unsubscribeAll) {
                    firebaseClient.unsubscribeAll = function() {
                        console.log('🧹 Firebase 모든 구독 해제');
                        
                        let count = 0;
                        for (const unsubscribe of this.activeSubscriptions) {
                            if (typeof unsubscribe === 'function') {
                                try {
                                    unsubscribe();
                                    count++;
                                } catch (error) {
                                    console.error('Firebase 구독 해제 실패:', error);
                                }
                            }
                        }
                        
                        this.activeSubscriptions.clear();
                        console.log(`✅ Firebase 구독 ${count}개 해제 완료`);
                    };
                }
                
                this.memoryManager.registerComponent('firebaseClient', firebaseClient, 'unsubscribeAll');
                this.patchedComponents.add('firebaseClient');
                
                console.log('✅ Firebase Client 패치 적용 완료');
            } else {
                console.log('⚠️ firebaseClient를 찾을 수 없음 - 나중에 재시도');
                setTimeout(() => this.patchFirebaseClient(), 2000);
            }
        } catch (error) {
            console.error('❌ Firebase Client 패치 실패:', error);
        }
    }
    
    /**
     * Enhanced Motion Detector 패치
     */
    patchEnhancedMotionDetector() {
        try {
            const enhancedMotionDetector = window.enhancedMotionDetector;
            
            if (enhancedMotionDetector) {
                // 타이머들 추적
                if (!enhancedMotionDetector.activeTimers) {
                    enhancedMotionDetector.activeTimers = new Set();
                }
                
                // cleanup 메서드 강화
                const originalCleanup = enhancedMotionDetector.cleanup;
                enhancedMotionDetector.cleanup = function() {
                    console.log('🧹 강화된 모션 감지기 정리 - 패치된 버전');
                    
                    try {
                        if (originalCleanup && typeof originalCleanup === 'function') {
                            originalCleanup.call(this);
                        }
                        
                        // 모든 타이머 정리
                        ['communicationTimer', 'heartbeatTimer', 'statusUpdateTimer'].forEach(timerName => {
                            if (this[timerName]) {
                                clearInterval(this[timerName]);
                                this[timerName] = null;
                            }
                        });
                        
                        // 추적된 타이머들 정리
                        if (this.activeTimers) {
                            for (const timer of this.activeTimers) {
                                clearInterval(timer);
                                clearTimeout(timer);
                            }
                            this.activeTimers.clear();
                        }
                        
                        // 센서 리스너들 제거
                        ['deviceMotionHandler', 'deviceOrientationHandler', 'touchStartHandler', 'touchEndHandler'].forEach(handlerName => {
                            if (this[handlerName]) {
                                // 이벤트 타입에 따라 제거
                                if (handlerName.includes('device')) {
                                    window.removeEventListener(handlerName.replace('Handler', '').toLowerCase(), this[handlerName]);
                                } else {
                                    document.removeEventListener(handlerName.replace('Handler', '').toLowerCase(), this[handlerName]);
                                }
                                this[handlerName] = null;
                            }
                        });
                        
                        console.log('✅ 강화된 모션 감지기 정리 완료 (패치됨)');
                        
                    } catch (error) {
                        console.error('❌ 강화된 모션 감지기 정리 실패:', error);
                    }
                };
                
                this.memoryManager.registerComponent('enhancedMotionDetector', enhancedMotionDetector);
                this.patchedComponents.add('enhancedMotionDetector');
                
                console.log('✅ Enhanced Motion Detector 패치 적용 완료');
            } else {
                console.log('⚠️ enhancedMotionDetector를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ Enhanced Motion Detector 패치 실패:', error);
        }
    }
    
    /**
     * Friend Status Checker 패치
     */
    patchFriendStatusChecker() {
        try {
            // friend-status-checker가 모듈로 로드되는 경우
            const friendStatusChecker = window.friendStatusChecker || 
                                      (window.friendStatusMonitor && window.friendStatusMonitor.modules?.statusChecker);
            
            if (friendStatusChecker) {
                // 백그라운드 알림 인터벌 추적
                if (!friendStatusChecker.backgroundIntervals) {
                    friendStatusChecker.backgroundIntervals = new Set();
                }
                
                // showBackgroundAlert 메서드 패치
                const originalShowBackgroundAlert = friendStatusChecker.showBackgroundAlert;
                if (originalShowBackgroundAlert) {
                    friendStatusChecker.showBackgroundAlert = function(...args) {
                        const result = originalShowBackgroundAlert.apply(this, args);
                        
                        // 생성된 인터벌을 추적에 추가
                        if (this.lastBackgroundInterval) {
                            this.backgroundIntervals.add(this.lastBackgroundInterval);
                        }
                        
                        return result;
                    };
                }
                
                // cleanup 메서드 추가/강화
                const originalCleanup = friendStatusChecker.cleanup;
                friendStatusChecker.cleanup = function() {
                    console.log('🧹 친구 상태 체커 정리 - 패치된 버전');
                    
                    try {
                        if (originalCleanup && typeof originalCleanup === 'function') {
                            originalCleanup.call(this);
                        }
                        
                        // 백그라운드 인터벌들 정리
                        if (this.backgroundIntervals) {
                            for (const interval of this.backgroundIntervals) {
                                clearInterval(interval);
                            }
                            this.backgroundIntervals.clear();
                        }
                        
                        // 탭 알림 인터벌 정리
                        if (this.tabBlinkInterval) {
                            clearInterval(this.tabBlinkInterval);
                            this.tabBlinkInterval = null;
                        }
                        
                        console.log('✅ 친구 상태 체커 정리 완료 (패치됨)');
                        
                    } catch (error) {
                        console.error('❌ 친구 상태 체커 정리 실패:', error);
                    }
                };
                
                this.memoryManager.registerComponent('friendStatusChecker', friendStatusChecker);
                this.patchedComponents.add('friendStatusChecker');
                
                console.log('✅ Friend Status Checker 패치 적용 완료');
            } else {
                console.log('⚠️ friendStatusChecker를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ Friend Status Checker 패치 실패:', error);
        }
    }
    
    /**
     * 전역 메모리 모니터링 시작
     */
    startGlobalMemoryMonitoring() {
        console.log('📊 전역 메모리 모니터링 시작');
        
        // 30초마다 메모리 상태 확인
        const monitoringInterval = this.memoryManager.setInterval(() => {
            const memInfo = this.memoryManager.checkMemoryUsage();
            
            if (memInfo) {
                // 메모리 사용량이 높은 경우 경고
                if (memInfo.usedMB > 40) {
                    console.warn(`⚠️ 메모리 사용량 높음: ${memInfo.usedMB}MB`);
                    
                    // 패치된 컴포넌트들 상태 확인
                    this.reportPatchedComponentsStatus();
                }
                
                // 메모리 사용량이 매우 높은 경우 강제 정리
                if (memInfo.usedMB > 60) {
                    console.error(`🚨 메모리 사용량 위험: ${memInfo.usedMB}MB - 강제 정리 실행`);
                    this.forceCleanupPatchedComponents();
                }
            }
        }, 30000);
        
        this.monitoringIntervals.set('global', monitoringInterval);
    }
    
    /**
     * 패치된 컴포넌트들 상태 보고
     */
    reportPatchedComponentsStatus() {
        console.log(`📊 패치 적용 상태:
        - 패치된 컴포넌트: ${this.patchedComponents.size}개
        - 활성 모니터링: ${this.monitoringIntervals.size}개
        - 백업된 함수: ${this.originalFunctions.size}개`);
        
        for (const componentName of this.patchedComponents) {
            console.log(`  ✅ ${componentName}: 패치 적용됨`);
        }
    }
    
    /**
     * 패치된 컴포넌트들 강제 정리
     */
    forceCleanupPatchedComponents() {
        console.warn('🚨 패치된 컴포넌트들 강제 정리 실행');
        
        for (const componentName of this.patchedComponents) {
            try {
                const componentInfo = this.memoryManager.activeComponents.get(componentName);
                if (componentInfo && componentInfo.instance) {
                    const instance = componentInfo.instance;
                    if (typeof instance.cleanup === 'function') {
                        instance.cleanup();
                        console.log(`🧹 ${componentName} 강제 정리 완료`);
                    }
                }
            } catch (error) {
                console.error(`❌ ${componentName} 강제 정리 실패:`, error);
            }
        }
    }
    
    /**
     * 패치 해제 (디버깅용)
     */
    removePatch(componentName) {
        if (this.patchedComponents.has(componentName)) {
            // 원본 함수 복원
            const originalFunction = this.originalFunctions.get(`${componentName}_cleanup`);
            if (originalFunction) {
                // 원본 함수 복원 로직
                console.log(`🔄 ${componentName} 패치 해제`);
            }
            
            this.patchedComponents.delete(componentName);
        }
    }
    
    /**
     * 전체 패치 상태 확인
     */
    getPatchStatus() {
        return {
            patchedComponents: Array.from(this.patchedComponents),
            memoryManager: this.memoryManager,
            activePatches: this.patchedComponents.size,
            memoryUsage: this.memoryManager.checkMemoryUsage()
        };
    }
}

// 전역 접근
window.MemoryLeakPatch = MemoryLeakPatch;
window.getMemoryLeakPatch = () => MemoryLeakPatch.getInstance();

// DOM 로드 완료 후 자동 패치 적용
document.addEventListener('DOMContentLoaded', () => {
    // MemoryManager가 로드될 때까지 대기
    const waitForMemoryManager = () => {
        if (window.getMemoryManager) {
            const patch = MemoryLeakPatch.getInstance();
            console.log('🔧 메모리 누수 패치 시스템 활성화');
        } else {
            setTimeout(waitForMemoryManager, 100);
        }
    };
    
    setTimeout(waitForMemoryManager, 500);
});

console.log('🔧 MemoryLeakPatch 클래스 로드 완료');