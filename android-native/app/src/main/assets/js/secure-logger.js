/**
 * 보안 로거 - 프로덕션 환경에서 민감한 정보 로그 방지
 * Google Play Store 배포를 위한 보안 강화
 */

class SecureLogger {
    constructor() {
        this.isProduction = CONFIG?.APP?.ENVIRONMENT === 'production' || 
                           CONFIG?.APP?.BUILD_TYPE === 'release' ||
                           !CONFIG?.SECURITY?.ENABLE_DEBUG_LOGS;
        
        this.sensitiveFields = [
            'password', 'token', 'key', 'secret', 'auth',
            'kakao_id', 'phone', 'email', 'address',
            'medical', 'blood', 'emergency', 'profile_image'
        ];
    }

    // 민감한 데이터 마스킹
    maskSensitiveData(data) {
        if (!data || typeof data !== 'object') return data;
        
        const masked = {...data};
        
        for (const key in masked) {
            if (this.isSensitiveField(key)) {
                masked[key] = '***MASKED***';
            } else if (typeof masked[key] === 'object') {
                masked[key] = this.maskSensitiveData(masked[key]);
            }
        }
        
        return masked;
    }

    // 민감한 필드인지 확인
    isSensitiveField(fieldName) {
        return this.sensitiveFields.some(sensitive => 
            fieldName.toLowerCase().includes(sensitive.toLowerCase())
        );
    }

    // 안전한 로그 출력
    log(message, data = null) {
        if (this.isProduction) return; // 프로덕션에서는 로그 비활성화
        
        if (data) {
            console.log(message, this.maskSensitiveData(data));
        } else {
            console.log(message);
        }
    }

    // 에러 로그 (프로덕션에서도 허용, 단 민감정보 마스킹)
    error(message, error = null) {
        if (error) {
            const safeError = {
                message: error.message,
                name: error.name,
                // 스택 트레이스는 프로덕션에서 제외
                ...(this.isProduction ? {} : { stack: error.stack })
            };
            console.error(message, safeError);
        } else {
            console.error(message);
        }
    }

    // 경고 로그
    warn(message, data = null) {
        if (data) {
            console.warn(message, this.maskSensitiveData(data));
        } else {
            console.warn(message);
        }
    }

    // 중요 정보 (항상 출력하지만 마스킹)
    info(message, data = null) {
        if (data) {
            console.info(message, this.maskSensitiveData(data));
        } else {
            console.info(message);
        }
    }

    // 성공 로그 (프로덕션에서는 간단하게)
    success(message, data = null) {
        if (this.isProduction) {
            console.info('✅ ' + message);
        } else {
            if (data) {
                console.log('✅ ' + message, this.maskSensitiveData(data));
            } else {
                console.log('✅ ' + message);
            }
        }
    }
}

// 전역 보안 로거 인스턴스
window.secureLogger = new SecureLogger();

// 기존 console.log를 대체하는 안전한 래퍼
window.safeLog = function(message, data = null) {
    window.secureLogger.log(message, data);
};

// 프로덕션 모드에서 console.log 오버라이드 (선택적)
if (window.secureLogger.isProduction) {
    // 개발자가 실수로 console.log를 사용해도 민감정보가 노출되지 않도록
    const originalLog = console.log;
    console.log = function(...args) {
        // 민감한 키워드가 포함된 로그는 필터링
        const logString = args.join(' ');
        const hasSensitive = window.secureLogger.sensitiveFields.some(field => 
            logString.toLowerCase().includes(field.toLowerCase())
        );
        
        if (!hasSensitive) {
            originalLog.apply(console, args);
        } else {
            console.info('🔒 민감정보 로그가 필터링되었습니다.');
        }
    };
}

console.info('🛡️ 보안 로거 초기화 완료', {
    isProduction: window.secureLogger.isProduction,
    debugLogsEnabled: CONFIG?.SECURITY?.ENABLE_DEBUG_LOGS
});