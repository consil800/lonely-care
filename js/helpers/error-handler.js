/**
 * 통합 오류 처리 시스템
 * 프로젝트 전반에서 일관된 오류 처리를 제공
 */
class ErrorHandler {
    /**
     * 비동기 작업을 안전하게 실행
     * @param {Function} operation - 실행할 비동기 함수
     * @param {string} errorMessage - 사용자에게 표시할 오류 메시지
     * @param {boolean} showNotification - 알림 표시 여부
     * @returns {Promise<any>}
     */
    static async execute(operation, errorMessage = '작업에 실패했습니다.', showNotification = true) {
        try {
            return await operation();
        } catch (error) {
            console.error(errorMessage, error);
            
            if (showNotification && window.auth?.showNotification) {
                auth.showNotification(errorMessage, 'error');
            }
            
            throw error;
        }
    }
    
    /**
     * 컨텍스트와 함께 오류 로깅
     * @param {string} context - 오류 발생 컨텍스트
     * @param {Error} error - 오류 객체
     * @param {Object} additionalInfo - 추가 정보
     */
    static log(context, error, additionalInfo = {}) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            context,
            error: {
                message: error?.message || error,
                stack: error?.stack,
                name: error?.name
            },
            ...additionalInfo
        };
        
        console.error(`[${context}] ${timestamp}:`, logData);
        
        // 디버그 모드일 때만 상세 로그
        if (window.CONFIG?.DEBUG_MODE) {
            console.table(logData);
        }
    }
    
    /**
     * 네트워크 오류 처리
     * @param {Error} error - 오류 객체
     * @param {string} operation - 수행하려던 작업
     * @returns {string} 사용자 친화적 오류 메시지
     */
    static handleNetworkError(error, operation = '작업') {
        let userMessage = '';
        
        if (error.message?.includes('fetch')) {
            userMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
            userMessage = '로그인이 만료되었습니다. 다시 로그인해주세요.';
        } else if (error.code === '23505') {
            userMessage = '이미 존재하는 데이터입니다.';
        } else if (error.code === '23503') {
            userMessage = '관련 데이터가 존재하지 않습니다.';
        } else {
            userMessage = `${operation} 중 오류가 발생했습니다.`;
        }
        
        this.log('NetworkError', error, { operation, userMessage });
        return userMessage;
    }
    
    /**
     * DOM 관련 오류 처리
     * @param {Error} error - 오류 객체
     * @param {string} selector - DOM 선택자
     * @returns {boolean} 처리 여부
     */
    static handleDOMError(error, selector) {
        if (error.message?.includes('null')) {
            this.log('DOMError', error, { 
                selector, 
                message: `DOM 요소를 찾을 수 없습니다: ${selector}` 
            });
            return true;
        }
        return false;
    }
    
    /**
     * 인증 관련 오류 처리
     * @param {Error} error - 오류 객체
     * @param {Function} redirectCallback - 리다이렉트 콜백
     */
    static handleAuthError(error, redirectCallback) {
        const authErrorMessages = [
            'JWT',
            'unauthorized',
            '401',
            'authentication',
            'token'
        ];
        
        const isAuthError = authErrorMessages.some(keyword => 
            error.message?.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (isAuthError) {
            this.log('AuthError', error, { 
                message: '인증 오류 발생 - 로그아웃 처리' 
            });
            
            if (window.auth) {
                auth.logout();
            }
            
            if (redirectCallback) {
                redirectCallback();
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 전역 오류 핸들러 설정
     */
    static setupGlobalHandlers() {
        // 오류 수집기
        this.errorCollector = {
            errors: [],
            maxErrors: 100,
            startTime: Date.now()
        };
        
        // 전역 JavaScript 오류 처리
        window.addEventListener('error', (event) => {
            const errorInfo = {
                type: 'javascript',
                message: event.message || event.error?.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            this.collectError(errorInfo);
            this.handleCriticalError(event.error, errorInfo);
            
            this.log('GlobalError', event.error, errorInfo);
        });
        
        // Promise rejection 처리
        window.addEventListener('unhandledrejection', (event) => {
            const errorInfo = {
                type: 'promise_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            this.collectError(errorInfo);
            this.handleCriticalError(event.reason, errorInfo);
            
            this.log('UnhandledPromiseRejection', event.reason, errorInfo);
            event.preventDefault(); // 콘솔 오류 방지
        });
        
        // 리소스 로딩 오류 처리
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                const errorInfo = {
                    type: 'resource',
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    timestamp: Date.now()
                };
                
                this.collectError(errorInfo);
                this.handleResourceError(event.target, errorInfo);
            }
        }, true);
        
        // 네트워크 오류 감지
        window.addEventListener('offline', () => {
            this.handleNetworkChange(false);
        });
        
        window.addEventListener('online', () => {
            this.handleNetworkChange(true);
        });
        
        // 메모리 부족 감지 (실험적)
        if ('memory' in performance) {
            setInterval(() => {
                this.checkMemoryUsage();
            }, 30000); // 30초마다 체크
        }
        
        // 앱 크래시 방지를 위한 최후 수단
        this.setupCrashPrevention();
        
        console.log('✅ 전역 오류 핸들러 설정 완료');
    }
    
    /**
     * 오류 수집
     * @param {Object} errorInfo - 오류 정보
     */
    static collectError(errorInfo) {
        this.errorCollector.errors.push(errorInfo);
        
        // 최대 개수 초과 시 오래된 것 제거
        if (this.errorCollector.errors.length > this.errorCollector.maxErrors) {
            this.errorCollector.errors.shift();
        }
        
        // 심각한 오류 패턴 감지
        this.detectErrorPatterns();
    }
    
    /**
     * 치명적 오류 처리
     * @param {Error} error - 오류 객체
     * @param {Object} errorInfo - 오류 정보
     */
    static handleCriticalError(error, errorInfo) {
        const criticalPatterns = [
            'out of memory',
            'script error',
            'network error',
            'chunkloaderror',
            'loading css chunk'
        ];
        
        const errorMessage = String(error?.message || error).toLowerCase();
        const isCritical = criticalPatterns.some(pattern => 
            errorMessage.includes(pattern)
        );
        
        if (isCritical) {
            console.error('🚨 치명적 오류 감지:', errorInfo);
            
            // 사용자에게 알림
            if (window.NotificationHelper) {
                NotificationHelper.showError(
                    '앱에서 심각한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
                    'critical_error'
                );
            }
            
            // 자동 복구 시도
            this.attemptRecovery(errorInfo);
        }
    }
    
    /**
     * 리소스 로딩 오류 처리
     * @param {Element} element - 오류가 발생한 요소
     * @param {Object} errorInfo - 오류 정보
     */
    static handleResourceError(element, errorInfo) {
        console.warn('📦 리소스 로딩 실패:', errorInfo);
        
        // 이미지 로딩 실패 시 대체 이미지
        if (element.tagName === 'IMG') {
            if (window.imageCacheManager) {
                element.src = window.imageCacheManager.getErrorImage();
            }
        }
        
        // 스크립트 로딩 실패 시 재시도
        if (element.tagName === 'SCRIPT') {
            this.retryScriptLoading(element, errorInfo);
        }
    }
    
    /**
     * 스크립트 로딩 재시도
     * @param {Element} scriptElement - 실패한 스크립트 요소
     * @param {Object} errorInfo - 오류 정보
     */
    static retryScriptLoading(scriptElement, errorInfo) {
        const maxRetries = 3;
        const retryCount = parseInt(scriptElement.dataset.retryCount || '0');
        
        if (retryCount < maxRetries) {
            console.log(`🔄 스크립트 로딩 재시도: ${errorInfo.source} (${retryCount + 1}/${maxRetries})`);
            
            setTimeout(() => {
                const newScript = document.createElement('script');
                newScript.src = scriptElement.src;
                newScript.dataset.retryCount = (retryCount + 1).toString();
                
                scriptElement.parentNode?.replaceChild(newScript, scriptElement);
            }, Math.pow(2, retryCount) * 1000); // 지수 백오프
        }
    }
    
    /**
     * 네트워크 상태 변화 처리
     * @param {boolean} isOnline - 온라인 여부
     */
    static handleNetworkChange(isOnline) {
        console.log(`📶 네트워크 상태 변화: ${isOnline ? '온라인' : '오프라인'}`);
        
        if (isOnline) {
            // 온라인 복구 시 실패한 작업들 재시도
            this.retryFailedOperations();
        } else {
            // 오프라인 시 사용자에게 알림
            if (window.NotificationHelper) {
                NotificationHelper.showWarning('인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.');
            }
        }
    }
    
    /**
     * 메모리 사용량 체크
     */
    static checkMemoryUsage() {
        if (!performance.memory) return;
        
        const memInfo = performance.memory;
        const usedPercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        
        if (usedPercent > 80) {
            console.warn('⚠️ 메모리 사용량 높음:', Math.round(usedPercent) + '%');
            
            // 자동 정리 시도
            this.performMemoryCleanup();
        }
    }
    
    /**
     * 메모리 정리
     */
    static performMemoryCleanup() {
        console.log('🧹 메모리 정리 시작');
        
        // 캐시 정리
        if (window.imageCacheManager) {
            window.imageCacheManager.cleanExpiredCache();
        }
        
        if (window.networkOptimizer) {
            window.networkOptimizer.cleanup();
        }
        
        // 가비지 컬렉션 힌트 (Chrome)
        if (window.gc) {
            window.gc();
        }
        
        console.log('✅ 메모리 정리 완료');
    }
    
    /**
     * 오류 패턴 감지
     */
    static detectErrorPatterns() {
        const recentErrors = this.errorCollector.errors.slice(-10); // 최근 10개
        const errorTypes = {};
        
        recentErrors.forEach(error => {
            errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
        });
        
        // 동일한 타입의 오류가 많이 발생한 경우
        Object.entries(errorTypes).forEach(([type, count]) => {
            if (count >= 5) {
                console.warn(`🚨 오류 패턴 감지: ${type} 오류가 ${count}회 발생`);
                this.handleErrorPattern(type, count);
            }
        });
    }
    
    /**
     * 오류 패턴 처리
     * @param {string} type - 오류 타입
     * @param {number} count - 발생 횟수
     */
    static handleErrorPattern(type, count) {
        switch (type) {
            case 'network':
                // 네트워크 오류가 반복되면 오프라인 모드로 전환
                console.log('📵 반복적 네트워크 오류 - 오프라인 모드 검토');
                break;
                
            case 'javascript':
                // 자바스크립트 오류가 반복되면 페이지 새로고침 제안
                if (count >= 8) {
                    this.suggestPageRefresh();
                }
                break;
                
            case 'resource':
                // 리소스 로딩 오류가 반복되면 CDN 문제일 수 있음
                console.log('📦 반복적 리소스 오류 - CDN 상태 확인 필요');
                break;
        }
    }
    
    /**
     * 페이지 새로고침 제안
     */
    static suggestPageRefresh() {
        if (window.NotificationHelper) {
            NotificationHelper.showConfirm(
                '앱에서 반복적인 문제가 발생하고 있습니다. 페이지를 새로고침하시겠습니까?',
                '문제 해결'
            ).then(refresh => {
                if (refresh) {
                    window.location.reload();
                }
            });
        }
    }
    
    /**
     * 자동 복구 시도
     * @param {Object} errorInfo - 오류 정보
     */
    static attemptRecovery(errorInfo) {
        console.log('🔧 자동 복구 시도:', errorInfo.type);
        
        switch (errorInfo.type) {
            case 'javascript':
                // 중요하지 않은 기능은 비활성화
                this.disableNonCriticalFeatures();
                break;
                
            case 'promise_rejection':
                // 실패한 Promise 관련 정리
                this.cleanupFailedPromises();
                break;
                
            case 'resource':
                // 리소스 재로딩 시도
                this.reloadCriticalResources();
                break;
        }
    }
    
    /**
     * 비핵심 기능 비활성화
     */
    static disableNonCriticalFeatures() {
        console.log('⚡ 비핵심 기능 일시 비활성화');
        
        // 애니메이션 비활성화
        document.documentElement.style.setProperty('--animation-duration', '0s');
        
        // 자동 갱신 간격 증가
        if (window.motionDetector?.statusInterval) {
            clearInterval(window.motionDetector.statusInterval);
        }
    }
    
    /**
     * 실패한 Promise 정리
     */
    static cleanupFailedPromises() {
        // AsyncOptimizer의 큐 정리
        if (window.asyncOptimizer) {
            window.asyncOptimizer.clearQueue();
        }
    }
    
    /**
     * 중요 리소스 재로딩
     */
    static reloadCriticalResources() {
        const criticalScripts = [
            'js/config.js',
            'js/auth.js',
            'js/storage.js'
        ];
        
        criticalScripts.forEach(src => {
            const existingScript = document.querySelector(`script[src*="${src}"]`);
            if (existingScript) {
                const newScript = document.createElement('script');
                newScript.src = src + '?reload=' + Date.now();
                existingScript.parentNode?.appendChild(newScript);
            }
        });
    }
    
    /**
     * 실패한 작업 재시도
     */
    static retryFailedOperations() {
        console.log('🔄 실패한 작업들 재시도');
        
        // 네트워크 요청 재시도
        if (window.networkOptimizer) {
            // 캐시 무효화로 새로운 요청 유도
            window.networkOptimizer.invalidateCache('');
        }
        
        // 중요한 데이터 재로드
        if (window.auth?.isLoggedIn()) {
            const currentUser = window.auth.getCurrentUser();
            if (currentUser && window.asyncOptimizer) {
                window.asyncOptimizer.urgent(async () => {
                    return await window.networkOptimizer?.fetchFriendsData(currentUser.id);
                }, { name: 'RetryFriendsData' });
            }
        }
    }
    
    /**
     * 앱 크래시 방지
     */
    static setupCrashPrevention() {
        // 주기적 헬스체크 (5분마다)
        setInterval(() => {
            this.performHealthCheck();
        }, 5 * 60 * 1000);
        
        // 페이지 언로드 전 정리
        window.addEventListener('beforeunload', () => {
            console.log('📊 오류 통계:', this.getErrorStats());
        });
    }
    
    /**
     * 헬스체크 수행
     */
    static performHealthCheck() {
        const healthStatus = {
            timestamp: Date.now(),
            errorCount: this.errorCollector.errors.length,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null,
            isOnline: navigator.onLine,
            activeElements: document.querySelectorAll('*').length
        };
        
        console.log('💚 헬스체크:', healthStatus);
        
        // 문제 감지 시 경고
        if (healthStatus.errorCount > 50) {
            console.warn('⚠️ 오류 누적량 많음, 복구 시도');
            this.performMemoryCleanup();
        }
    }
    
    /**
     * 오류 통계 조회
     * @returns {Object} 통계 정보
     */
    static getErrorStats() {
        const errors = this.errorCollector.errors;
        const errorsByType = {};
        
        errors.forEach(error => {
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        });
        
        return {
            totalErrors: errors.length,
            errorsByType,
            uptime: Date.now() - this.errorCollector.startTime,
            crashesPrevented: Object.values(errorsByType).reduce((sum, count) => sum + count, 0)
        };
    }
    
    /**
     * 안전한 JSON 파싱
     * @param {string} jsonString - JSON 문자열
     * @param {any} defaultValue - 기본값
     * @returns {any} 파싱된 객체 또는 기본값
     */
    static safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.log('JsonParseError', error, { jsonString });
            return defaultValue;
        }
    }
    
    /**
     * 안전한 함수 실행
     * @param {Function} fn - 실행할 함수
     * @param {Array} args - 함수 인수
     * @param {any} defaultReturn - 기본 반환값
     * @returns {any} 함수 실행 결과 또는 기본값
     */
    static safeExecute(fn, args = [], defaultReturn = null) {
        try {
            return fn(...args);
        } catch (error) {
            this.log('SafeExecuteError', error, { 
                functionName: fn.name,
                args
            });
            return defaultReturn;
        }
    }
    
    /**
     * 재시도 가능한 작업 실행
     * @param {Function} operation - 실행할 작업
     * @param {Object} options - 재시도 옵션
     * @returns {Promise<any>}
     */
    static async withRetry(operation, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            backoff = 1.5,
            onRetry = null,
            shouldRetry = () => true
        } = options;
        
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt >= maxRetries || !shouldRetry(error)) {
                    break;
                }
                
                if (onRetry) {
                    onRetry(attempt, error);
                }
                
                const waitTime = delay * Math.pow(backoff, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        throw lastError;
    }
}

// 전역 설정
window.ErrorHandler = ErrorHandler;

// 앱 로드 시 전역 핸들러 설정
document.addEventListener('DOMContentLoaded', () => {
    ErrorHandler.setupGlobalHandlers();
});

// 이전 코드와의 호환성을 위한 별칭
window.SafeHandler = ErrorHandler;