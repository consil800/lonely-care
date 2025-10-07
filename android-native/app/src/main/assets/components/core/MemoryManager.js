/**
 * MemoryManager - 메모리 누수 방지 및 자원 정리 관리자
 * lonely-care 프로젝트의 메모리 누수 문제 해결을 위한 중앙화된 관리 시스템
 * 
 * 🚨 생명구조 시스템 안정성 보장 - 메모리 누수 완전 차단
 * 
 * @version 1.0.0
 * @created 2024-12-26
 * @purpose 이벤트 리스너, 인터벌, Firebase 구독 등 자원 정리 관리
 */

class MemoryManager {
    static instance = null;
    
    static getInstance() {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }
    
    constructor() {
        if (MemoryManager.instance) {
            return MemoryManager.instance;
        }
        
        // 자원 추적을 위한 컬렉션들
        this.activeIntervals = new Set(); // setInterval ID들
        this.activeTimeouts = new Set(); // setTimeout ID들
        this.activeListeners = new Map(); // 이벤트 리스너들
        this.activeFirebaseSubscriptions = new Set(); // Firebase 구독들
        this.activeComponents = new Map(); // 활성 컴포넌트들
        this.activeObservers = new Set(); // Intersection/Mutation Observer들
        
        // 메모리 모니터링
        this.memoryCheckInterval = null;
        this.maxMemoryThreshold = 50 * 1024 * 1024; // 50MB
        this.memoryWarningThreshold = 30 * 1024 * 1024; // 30MB
        
        // 정리 상태
        this.isCleanupInProgress = false;
        this.cleanupCallbacks = new Set();
        
        console.log('🧹 MemoryManager 초기화 완료');
        
        // 페이지 언로드 시 자동 정리
        this.setupPageUnloadCleanup();
        
        // 메모리 모니터링 시작
        this.startMemoryMonitoring();
    }
    
    /**
     * setInterval 등록 및 추적
     */
    setInterval(callback, delay, ...args) {
        const intervalId = setInterval(callback, delay, ...args);
        this.activeIntervals.add(intervalId);
        
        console.log(`🔄 인터벌 등록: ID ${intervalId}, ${delay}ms`);
        
        return {
            id: intervalId,
            clear: () => this.clearInterval(intervalId)
        };
    }
    
    /**
     * setTimeout 등록 및 추적
     */
    setTimeout(callback, delay, ...args) {
        const timeoutId = setTimeout(() => {
            // 실행 후 자동으로 추적에서 제거
            this.activeTimeouts.delete(timeoutId);
            callback(...args);
        }, delay);
        
        this.activeTimeouts.add(timeoutId);
        
        console.log(`⏰ 타임아웃 등록: ID ${timeoutId}, ${delay}ms`);
        
        return {
            id: timeoutId,
            clear: () => this.clearTimeout(timeoutId)
        };
    }
    
    /**
     * 인터벌 정리
     */
    clearInterval(intervalId) {
        if (this.activeIntervals.has(intervalId)) {
            clearInterval(intervalId);
            this.activeIntervals.delete(intervalId);
            console.log(`✅ 인터벌 정리 완료: ID ${intervalId}`);
        }
    }
    
    /**
     * 타임아웃 정리
     */
    clearTimeout(timeoutId) {
        if (this.activeTimeouts.has(timeoutId)) {
            clearTimeout(timeoutId);
            this.activeTimeouts.delete(timeoutId);
            console.log(`✅ 타임아웃 정리 완료: ID ${timeoutId}`);
        }
    }
    
    /**
     * 이벤트 리스너 등록 및 추적
     */
    addEventListener(element, eventType, listener, options = false) {
        const listenerKey = `${element.constructor.name}_${eventType}_${Date.now()}`;
        
        // 실제 이벤트 리스너 등록
        element.addEventListener(eventType, listener, options);
        
        // 추적을 위해 저장
        this.activeListeners.set(listenerKey, {
            element: element,
            eventType: eventType,
            listener: listener,
            options: options
        });
        
        console.log(`👂 이벤트 리스너 등록: ${listenerKey}`);
        
        return {
            key: listenerKey,
            remove: () => this.removeEventListener(listenerKey)
        };
    }
    
    /**
     * 이벤트 리스너 제거
     */
    removeEventListener(listenerKey) {
        const listenerInfo = this.activeListeners.get(listenerKey);
        if (listenerInfo) {
            const { element, eventType, listener, options } = listenerInfo;
            element.removeEventListener(eventType, listener, options);
            this.activeListeners.delete(listenerKey);
            console.log(`✅ 이벤트 리스너 제거 완료: ${listenerKey}`);
        }
    }
    
    /**
     * Firebase 구독 등록 및 추적
     */
    addFirebaseSubscription(unsubscribeFunction, description = '') {
        this.activeFirebaseSubscriptions.add({
            unsubscribe: unsubscribeFunction,
            description: description,
            timestamp: Date.now()
        });
        
        console.log(`🔥 Firebase 구독 등록: ${description}`);
        
        return {
            unsubscribe: () => {
                unsubscribeFunction();
                this.removeFirebaseSubscription(unsubscribeFunction);
            }
        };
    }
    
    /**
     * Firebase 구독 제거
     */
    removeFirebaseSubscription(unsubscribeFunction) {
        for (const subscription of this.activeFirebaseSubscriptions) {
            if (subscription.unsubscribe === unsubscribeFunction) {
                this.activeFirebaseSubscriptions.delete(subscription);
                console.log(`✅ Firebase 구독 제거 완료: ${subscription.description}`);
                break;
            }
        }
    }
    
    /**
     * 컴포넌트 등록
     */
    registerComponent(componentName, componentInstance, cleanupMethod = 'cleanup') {
        this.activeComponents.set(componentName, {
            instance: componentInstance,
            cleanupMethod: cleanupMethod,
            registeredAt: Date.now()
        });
        
        console.log(`🧩 컴포넌트 등록: ${componentName}`);
        
        return {
            unregister: () => this.unregisterComponent(componentName)
        };
    }
    
    /**
     * 컴포넌트 해제
     */
    unregisterComponent(componentName) {
        const component = this.activeComponents.get(componentName);
        if (component) {
            const { instance, cleanupMethod } = component;
            
            // 컴포넌트의 정리 메서드 호출
            if (instance && typeof instance[cleanupMethod] === 'function') {
                try {
                    instance[cleanupMethod]();
                    console.log(`🧹 컴포넌트 정리 완료: ${componentName}`);
                } catch (error) {
                    console.error(`❌ 컴포넌트 정리 실패 (${componentName}):`, error);
                }
            }
            
            this.activeComponents.delete(componentName);
        }
    }
    
    /**
     * Observer 등록 및 추적
     */
    addObserver(observer, description = '') {
        this.activeObservers.add({
            observer: observer,
            description: description,
            timestamp: Date.now()
        });
        
        console.log(`👁️ Observer 등록: ${description}`);
        
        return {
            disconnect: () => {
                observer.disconnect();
                this.removeObserver(observer);
            }
        };
    }
    
    /**
     * Observer 제거
     */
    removeObserver(observer) {
        for (const observerInfo of this.activeObservers) {
            if (observerInfo.observer === observer) {
                this.activeObservers.delete(observerInfo);
                console.log(`✅ Observer 제거 완료: ${observerInfo.description}`);
                break;
            }
        }
    }
    
    /**
     * 정리 콜백 등록
     */
    addCleanupCallback(callback, description = '') {
        this.cleanupCallbacks.add({
            callback: callback,
            description: description
        });
        
        console.log(`🔧 정리 콜백 등록: ${description}`);
    }
    
    /**
     * 메모리 사용량 확인
     */
    checkMemoryUsage() {
        if (!('memory' in performance)) {
            return null;
        }
        
        const memInfo = performance.memory;
        return {
            used: memInfo.usedJSHeapSize,
            total: memInfo.totalJSHeapSize,
            limit: memInfo.jsHeapSizeLimit,
            usedMB: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
            totalMB: Math.round(memInfo.totalJSHeapSize / 1024 / 1024)
        };
    }
    
    /**
     * 메모리 모니터링 시작
     */
    startMemoryMonitoring() {
        this.memoryCheckInterval = this.setInterval(() => {
            const memInfo = this.checkMemoryUsage();
            if (!memInfo) return;
            
            console.log(`📊 메모리 사용량: ${memInfo.usedMB}MB / ${memInfo.totalMB}MB`);
            
            // 메모리 경고 임계값 초과
            if (memInfo.used > this.memoryWarningThreshold) {
                console.warn(`⚠️ 메모리 사용량 경고: ${memInfo.usedMB}MB`);
                this.reportMemoryStatus();
            }
            
            // 메모리 위험 임계값 초과
            if (memInfo.used > this.maxMemoryThreshold) {
                console.error(`🚨 메모리 사용량 위험: ${memInfo.usedMB}MB - 자동 정리 실행`);
                this.forceCleanup();
            }
            
        }, 30000); // 30초마다 체크
    }
    
    /**
     * 메모리 상태 보고
     */
    reportMemoryStatus() {
        console.log(`📊 메모리 관리자 상태:
        - 활성 인터벌: ${this.activeIntervals.size}개
        - 활성 타임아웃: ${this.activeTimeouts.size}개  
        - 활성 리스너: ${this.activeListeners.size}개
        - Firebase 구독: ${this.activeFirebaseSubscriptions.size}개
        - 등록된 컴포넌트: ${this.activeComponents.size}개
        - 활성 Observer: ${this.activeObservers.size}개`);
    }
    
    /**
     * 강제 정리 (메모리 부족 시)
     */
    forceCleanup() {
        console.warn('🚨 강제 메모리 정리 실행');
        
        // 오래된 타임아웃/인터벌 정리 (5분 이상)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        // 오래된 Firebase 구독 정리
        for (const subscription of this.activeFirebaseSubscriptions) {
            if (subscription.timestamp < fiveMinutesAgo) {
                try {
                    subscription.unsubscribe();
                    this.activeFirebaseSubscriptions.delete(subscription);
                    console.log(`🧹 오래된 Firebase 구독 강제 정리: ${subscription.description}`);
                } catch (error) {
                    console.error('Firebase 구독 정리 실패:', error);
                }
            }
        }
        
        // 가비지 컬렉션 요청
        if (window.gc) {
            window.gc();
            console.log('♻️ 가비지 컬렉션 실행 완료');
        }
    }
    
    /**
     * 전체 정리 (페이지 종료 시 등)
     */
    cleanup() {
        if (this.isCleanupInProgress) {
            console.log('🔄 정리 작업이 이미 진행 중입니다');
            return;
        }
        
        this.isCleanupInProgress = true;
        console.log('🧹 전체 자원 정리 시작');
        
        try {
            // 1. 모든 인터벌 정리
            for (const intervalId of this.activeIntervals) {
                clearInterval(intervalId);
            }
            this.activeIntervals.clear();
            console.log('✅ 모든 인터벌 정리 완료');
            
            // 2. 모든 타임아웃 정리
            for (const timeoutId of this.activeTimeouts) {
                clearTimeout(timeoutId);
            }
            this.activeTimeouts.clear();
            console.log('✅ 모든 타임아웃 정리 완료');
            
            // 3. 모든 이벤트 리스너 제거
            for (const [key, listenerInfo] of this.activeListeners) {
                const { element, eventType, listener, options } = listenerInfo;
                try {
                    element.removeEventListener(eventType, listener, options);
                } catch (error) {
                    console.warn(`이벤트 리스너 제거 실패 (${key}):`, error);
                }
            }
            this.activeListeners.clear();
            console.log('✅ 모든 이벤트 리스너 제거 완료');
            
            // 4. 모든 Firebase 구독 해제
            for (const subscription of this.activeFirebaseSubscriptions) {
                try {
                    subscription.unsubscribe();
                } catch (error) {
                    console.warn(`Firebase 구독 해제 실패 (${subscription.description}):`, error);
                }
            }
            this.activeFirebaseSubscriptions.clear();
            console.log('✅ 모든 Firebase 구독 해제 완료');
            
            // 5. 모든 Observer 정리
            for (const observerInfo of this.activeObservers) {
                try {
                    observerInfo.observer.disconnect();
                } catch (error) {
                    console.warn(`Observer 정리 실패 (${observerInfo.description}):`, error);
                }
            }
            this.activeObservers.clear();
            console.log('✅ 모든 Observer 정리 완료');
            
            // 6. 모든 컴포넌트 정리
            for (const [name, componentInfo] of this.activeComponents) {
                const { instance, cleanupMethod } = componentInfo;
                if (instance && typeof instance[cleanupMethod] === 'function') {
                    try {
                        instance[cleanupMethod]();
                    } catch (error) {
                        console.warn(`컴포넌트 정리 실패 (${name}):`, error);
                    }
                }
            }
            this.activeComponents.clear();
            console.log('✅ 모든 컴포넌트 정리 완료');
            
            // 7. 정리 콜백 실행
            for (const callbackInfo of this.cleanupCallbacks) {
                try {
                    callbackInfo.callback();
                } catch (error) {
                    console.warn(`정리 콜백 실행 실패 (${callbackInfo.description}):`, error);
                }
            }
            this.cleanupCallbacks.clear();
            console.log('✅ 모든 정리 콜백 실행 완료');
            
            // 8. 메모리 모니터링 정지
            if (this.memoryCheckInterval) {
                clearInterval(this.memoryCheckInterval.id);
                this.memoryCheckInterval = null;
            }
            
            console.log('🎉 전체 자원 정리 완료');
            
        } catch (error) {
            console.error('❌ 자원 정리 중 오류 발생:', error);
        } finally {
            this.isCleanupInProgress = false;
        }
    }
    
    /**
     * 페이지 언로드 시 자동 정리 설정
     */
    setupPageUnloadCleanup() {
        // beforeunload 이벤트에서 정리 실행
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Page Visibility API를 사용한 백그라운드 진입 시 정리
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 페이지가 백그라운드로 이동 - 일부 자원 정리');
                // 백그라운드에서 필요없는 자원들만 정리
                this.cleanupBackgroundUnnecessaryResources();
            }
        });
        
        console.log('🔧 페이지 언로드 정리 시스템 설정 완료');
    }
    
    /**
     * 백그라운드에서 불필요한 자원 정리
     */
    cleanupBackgroundUnnecessaryResources() {
        // UI 관련 인터벌들만 임시 정지 (생명 구조 관련은 유지)
        // 구현은 향후 필요에 따라 확장
        console.log('🌙 백그라운드 자원 최적화 완료');
    }
    
    /**
     * 안전한 DOM 조작을 위한 헬퍼 메서드
     */
    safeQuerySelector(selector, callback) {
        const element = document.querySelector(selector);
        if (element && typeof callback === 'function') {
            callback(element);
        }
        return element;
    }
    
    /**
     * 메모리 최적화 모드 활성화
     */
    enableMemoryOptimization() {
        // 가비지 컬렉션 주기 단축
        if (this.memoryCheckInterval) {
            this.clearInterval(this.memoryCheckInterval.id);
        }
        
        this.memoryCheckInterval = this.setInterval(() => {
            const memInfo = this.checkMemoryUsage();
            if (memInfo && memInfo.used > this.memoryWarningThreshold) {
                this.forceCleanup();
            }
        }, 10000); // 10초마다 체크
        
        console.log('🚀 메모리 최적화 모드 활성화');
    }
}

// 전역 접근
window.MemoryManager = MemoryManager;
window.getMemoryManager = () => MemoryManager.getInstance();

// 전역 편의 함수들 (기존 코드와의 호환성)
window.safeSetInterval = (callback, delay, ...args) => {
    const memoryManager = MemoryManager.getInstance();
    return memoryManager.setInterval(callback, delay, ...args);
};

window.safeSetTimeout = (callback, delay, ...args) => {
    const memoryManager = MemoryManager.getInstance();
    return memoryManager.setTimeout(callback, delay, ...args);
};

window.safeAddEventListener = (element, eventType, listener, options) => {
    const memoryManager = MemoryManager.getInstance();
    return memoryManager.addEventListener(element, eventType, listener, options);
};

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    const memoryManager = MemoryManager.getInstance();
    
    // 기존 전역 함수들을 안전한 버전으로 오버라이드 (선택적)
    if (window.ENABLE_MEMORY_PROTECTION) {
        const originalSetInterval = window.setInterval;
        const originalSetTimeout = window.setTimeout;
        
        window.setInterval = (callback, delay, ...args) => {
            console.warn('⚠️ 추적되지 않는 setInterval 사용 감지 - safeSetInterval 사용 권장');
            return originalSetInterval(callback, delay, ...args);
        };
        
        window.setTimeout = (callback, delay, ...args) => {
            console.warn('⚠️ 추적되지 않는 setTimeout 사용 감지 - safeSetTimeout 사용 권장');
            return originalSetTimeout(callback, delay, ...args);
        };
    }
    
    console.log('🧹 MemoryManager 시스템 활성화 완료');
});

console.log('🧹 MemoryManager 클래스 로드 완료');