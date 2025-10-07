/**
 * 전역 에러 핸들러 - 웹 에러 최소화 (Firebase 최적화 버전)
 */
class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 50;
        this.errorLog = [];
        this.reportedErrors = new Set(); // 중복 방지
        
        this.init();
    }
    
    init() {
        // 전역 에러 처리
        window.addEventListener('error', (event) => {
            this.handleError('JavaScript Error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Promise 에러 처리
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled Promise', event.reason);
            event.preventDefault(); // 콘솔 출력 방지
        });
        
        // Firebase 특정 에러 처리
        this.setupFirebaseErrorHandler();
        
        console.log('✅ 글로벌 에러 핸들러 초기화 완료 (Firebase 최적화)');
    }
    
    handleError(type, error, details = {}) {
        // 에러 정보 수집 (민감한 정보 제거)
        const errorInfo = {
            type: type,
            message: this.sanitizeErrorMessage(error?.message || error),
            timestamp: new Date().toISOString(),
            // URL과 UserAgent에서 민감한 정보 제거
            page: window.location.pathname,
            ...details
        };
        
        // 🚨 생명구조 우선: 스팸 에러 조기 필터링 (로그 추가 전에)
        if (this.shouldIgnoreError(errorInfo)) {
            // 디버깅용 (개발 환경에서만)
            if (window.location.hostname === '127.0.0.1' && window.ENV_DEBUG) {
                console.log(`🔇 에러 필터링됨: ${errorInfo.message}`);
            }
            return; // 아예 처리하지 않음
        }
        
        this.errorCount++;
        
        // 중복 에러 방지
        const errorKey = `${errorInfo.type}:${errorInfo.message}`;
        if (this.reportedErrors.has(errorKey)) {
            return;
        }
        this.reportedErrors.add(errorKey);
        
        // 에러 로그에 추가 (중요한 에러만)
        this.errorLog.unshift(errorInfo);
        if (this.errorLog.length > this.maxErrors) {
            this.errorLog = this.errorLog.slice(0, this.maxErrors);
            // 오래된 에러 키도 정리
            if (this.reportedErrors.size > this.maxErrors * 2) {
                this.reportedErrors.clear();
            }
        }
        
        // 중요한 에러만 로깅
        if (this.isCriticalError(errorInfo)) {
            console.error(`🚨 [${type}] ${errorInfo.message}`, errorInfo);
        } else {
            console.warn(`⚠️ [${type}] ${errorInfo.message}`);
        }
    }
    
    /**
     * 에러 메시지에서 민감한 정보 제거
     */
    sanitizeErrorMessage(message) {
        if (typeof message !== 'string') {
            return message;
        }
        
        // API 키, 토큰 등 민감한 정보 마스킹
        return message
            .replace(/[A-Za-z0-9]{20,}/g, '[MASKED_TOKEN]')
            .replace(/eyJ[A-Za-z0-9\-_\.]+/g, '[MASKED_JWT]')
            .replace(/AIza[A-Za-z0-9\-_]{35}/g, '[MASKED_API_KEY]');
    }
    
    shouldIgnoreError(errorInfo) {
        const ignoredErrors = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Script error',
            'script error',
            'Script Error',
            'SCRIPT ERROR',
            'Network request failed',
            'Loading chunk',
            'ChunkLoadError',
            'The quota has been exceeded', // Storage quota
            'Connection failed', // Network issues
            'Firebase: Error', // Firebase 일반적인 에러 (너무 많음)
            'closeAd', // AdBannerComponent closeAd 함수 오류 (이미 수정됨)
            'Cannot read properties of undefined (reading \'closeAd\')', // 구체적인 closeAd 오류
            'TypeError: Error in event handler', // 일반적인 이벤트 핸들러 에러
            'SecurityError', // CORS 관련 에러
        ];
        
        const message = errorInfo.message?.toString().toLowerCase() || '';
        
        // 더 강력한 필터링: 정확한 매치와 포함 매치 둘 다
        return ignoredErrors.some(ignored => {
            const ignoredLower = ignored.toLowerCase();
            return message === ignoredLower || message.includes(ignoredLower);
        });
    }
    
    isCriticalError(errorInfo) {
        const criticalErrors = [
            'kakao',
            'authentication', 
            'login',
            'firebase',
            'initialization',
            'heartbeat',
            'motion detection',
            'fcm token'
        ];
        
        return criticalErrors.some(critical => 
            errorInfo.message?.toLowerCase().includes(critical.toLowerCase())
        );
    }
    
    setupFirebaseErrorHandler() {
        // Firebase 에러 처리를 위한 fetch 래퍼
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Firebase 관련 에러 특별 처리
                if (!response.ok && args[0]?.includes('googleapis.com')) {
                    const errorData = await response.text();
                    console.warn(`⚠️ Firebase API 에러 (${response.status}):`, errorData);
                    
                    // 401 Unauthorized는 토큰 갱신 필요
                    if (response.status === 401) {
                        console.warn('🔑 Firebase 인증 토큰 갱신이 필요할 수 있습니다');
                    }
                    
                    // 429 Rate Limit은 잠시 대기 필요
                    if (response.status === 429) {
                        console.warn('⏱️ Firebase Rate Limit - 잠시 후 재시도하세요');
                    }
                }
                
                return response;
            } catch (error) {
                // 네트워크 에러는 조용히 처리
                if (args[0]?.includes('googleapis.com') || args[0]?.includes('firebaseapp.com')) {
                    console.warn('⚠️ Firebase 네트워크 에러 (재시도 대기)');
                }
                throw error;
            }
        };
    }
    
    // 에러 통계 (민감한 정보 제거된 버전)
    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorLog.slice(0, 5).map(error => ({
                type: error.type,
                message: this.sanitizeErrorMessage(error.message),
                timestamp: error.timestamp
            })),
            errorTypes: this.getErrorTypeCounts(),
            reportedErrorsCount: this.reportedErrors.size
        };
    }
    
    getErrorTypeCounts() {
        const counts = {};
        this.errorLog.forEach(error => {
            counts[error.type] = (counts[error.type] || 0) + 1;
        });
        return counts;
    }
    
    // 에러 로그 지우기
    clearErrorLog() {
        this.errorLog = [];
        this.errorCount = 0;
        this.reportedErrors.clear();
        console.log('🗑️ 에러 로그 지워짐');
    }
    
    /**
     * Firebase 특화 에러 리포팅
     */
    reportFirebaseError(operation, error) {
        const errorInfo = {
            operation: operation,
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString()
        };
        
        this.handleError('Firebase Operation', errorInfo);
    }
    
    /**
     * 디버그 정보 조회
     */
    getDebugInfo() {
        return {
            isActive: true,
            errorHandlerVersion: 'Firebase Optimized v2.0',
            totalErrors: this.errorCount,
            ignoredErrorPatterns: 9,
            criticalErrorPatterns: 7,
            hasFetchWrapper: typeof window.fetch === 'function',
            reportedErrorsCount: this.reportedErrors.size
        };
    }
}

// 즉시 초기화
if (!window.errorHandler) {
    window.errorHandler = new ErrorHandler();
}