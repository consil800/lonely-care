/**
 * InputValidator - 입력 검증 보안 유틸리티
 * lonely-care 프로젝트의 XSS, SQL Injection 등 보안 위협 방지
 * 
 * 🚨 생명구조 시스템 입력 보안 강화
 * 
 * @version 1.0.0
 * @created 2024-12-26
 * @purpose 사용자 입력 검증, XSS 방지, 데이터 무결성 보장
 */

class InputValidator {
    static instance = null;
    
    static getInstance() {
        if (!InputValidator.instance) {
            InputValidator.instance = new InputValidator();
        }
        return InputValidator.instance;
    }
    
    constructor() {
        if (InputValidator.instance) {
            return InputValidator.instance;
        }
        
        // 정규식 패턴들
        this.patterns = {
            // 기본 패턴
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            phone: /^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$/,
            korean: /^[가-힣\s]+$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            
            // 보안 패턴
            inviteCode: /^[A-Z0-9]{6}$/,
            username: /^[a-zA-Z0-9가-힣_-]{3,20}$/,
            password: /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,20}$/,
            
            // 위험한 패턴들 (블랙리스트)
            xssScript: /<script[^>]*>.*?<\/script>/gi,
            xssOnerror: /on\w+\s*=\s*["'][^"']*["']/gi,
            sqlInjection: /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
            htmlTags: /<[^>]*>/g,
            
            // URL 검증
            validUrl: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
            suspiciousUrl: /(javascript:|data:|vbscript:)/i
        };
        
        // 허용된 HTML 태그 (화이트리스트)
        this.allowedHtmlTags = ['b', 'i', 'em', 'strong', 'br', 'p'];
        
        // 민감한 필드 목록
        this.sensitiveFields = new Set(['password', 'token', 'key', 'secret']);
        
        console.log('🛡️ InputValidator 초기화 완료');
    }
    
    /**
     * 초대코드 검증
     */
    validateInviteCode(code) {
        if (!code || typeof code !== 'string') {
            return {
                isValid: false,
                error: '초대코드를 입력해주세요.',
                sanitized: ''
            };
        }
        
        const sanitized = this.sanitizeInput(code).toUpperCase();
        
        if (!this.patterns.inviteCode.test(sanitized)) {
            return {
                isValid: false,
                error: '초대코드는 6자리 영문 대문자와 숫자만 가능합니다. (예: ABC123)',
                sanitized: sanitized
            };
        }
        
        return {
            isValid: true,
            error: null,
            sanitized: sanitized
        };
    }
    
    /**
     * 사용자명 검증
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return {
                isValid: false,
                error: '사용자명을 입력해주세요.',
                sanitized: ''
            };
        }
        
        const sanitized = this.sanitizeInput(username);
        
        if (sanitized.length < 3 || sanitized.length > 20) {
            return {
                isValid: false,
                error: '사용자명은 3-20자 이내로 입력해주세요.',
                sanitized: sanitized
            };
        }
        
        if (!this.patterns.username.test(sanitized)) {
            return {
                isValid: false,
                error: '사용자명은 한글, 영문, 숫자, _,- 만 사용 가능합니다.',
                sanitized: sanitized
            };
        }
        
        return {
            isValid: true,
            error: null,
            sanitized: sanitized
        };
    }
    
    /**
     * 이메일 검증
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return {
                isValid: false,
                error: '이메일을 입력해주세요.',
                sanitized: ''
            };
        }
        
        const sanitized = this.sanitizeInput(email).toLowerCase();
        
        if (!this.patterns.email.test(sanitized)) {
            return {
                isValid: false,
                error: '올바른 이메일 형식이 아닙니다.',
                sanitized: sanitized
            };
        }
        
        // 이메일 도메인 검증 (안전한 도메인만 허용)
        const suspiciousDomains = ['tempmail', '10minutemail', 'throwaway'];
        const domain = sanitized.split('@')[1];
        
        if (suspiciousDomains.some(sus => domain.includes(sus))) {
            return {
                isValid: false,
                error: '임시 이메일 주소는 사용할 수 없습니다.',
                sanitized: sanitized
            };
        }
        
        return {
            isValid: true,
            error: null,
            sanitized: sanitized
        };
    }
    
    /**
     * URL 검증
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return {
                isValid: false,
                error: 'URL을 입력해주세요.',
                sanitized: ''
            };
        }
        
        const sanitized = this.sanitizeInput(url);
        
        // 의심스러운 프로토콜 검증
        if (this.patterns.suspiciousUrl.test(sanitized)) {
            return {
                isValid: false,
                error: '안전하지 않은 URL입니다.',
                sanitized: sanitized
            };
        }
        
        if (!this.patterns.validUrl.test(sanitized)) {
            return {
                isValid: false,
                error: '올바른 URL 형식이 아닙니다.',
                sanitized: sanitized
            };
        }
        
        return {
            isValid: true,
            error: null,
            sanitized: sanitized
        };
    }
    
    /**
     * 기본 입력 무결성 검사
     */
    sanitizeInput(input, options = {}) {
        if (typeof input !== 'string') {
            return String(input);
        }
        
        let sanitized = input;
        
        // XSS 공격 패턴 제거
        sanitized = sanitized.replace(this.patterns.xssScript, '');
        sanitized = sanitized.replace(this.patterns.xssOnerror, '');
        
        // SQL Injection 패턴 감지 및 로깅
        if (this.patterns.sqlInjection.test(sanitized)) {
            console.warn('🚨 SQL Injection 시도 감지:', this.maskSensitiveData(sanitized));
            this.securityLog('SQL_INJECTION_ATTEMPT', { input: this.maskSensitiveData(sanitized) });
        }
        
        // HTML 태그 처리
        if (options.allowHtml) {
            sanitized = this.sanitizeHtml(sanitized);
        } else {
            sanitized = sanitized.replace(this.patterns.htmlTags, '');
        }
        
        // 양쪽 공백 제거
        sanitized = sanitized.trim();
        
        // 길이 제한
        if (options.maxLength) {
            sanitized = sanitized.substring(0, options.maxLength);
        }
        
        return sanitized;
    }
    
    /**
     * HTML 태그 화이트리스트 방식 정리
     */
    sanitizeHtml(html) {
        const allowedTagsRegex = new RegExp(`<(?!\/?(${this.allowedHtmlTags.join('|')})\s*\/?>)[^>]+>`, 'gi');
        return html.replace(allowedTagsRegex, '');
    }
    
    /**
     * 폼 전체 검증
     */
    validateForm(formData, rules) {
        const results = {};
        let isFormValid = true;
        
        for (const [fieldName, value] of Object.entries(formData)) {
            const fieldRules = rules[fieldName] || {};
            let fieldResult = { isValid: true, error: null, sanitized: value };
            
            // 필수 필드 검증
            if (fieldRules.required && (!value || value.toString().trim() === '')) {
                fieldResult = {
                    isValid: false,
                    error: `${fieldRules.label || fieldName}은(는) 필수 입력 항목입니다.`,
                    sanitized: ''
                };
            } else if (value) {
                // 타입별 검증
                switch (fieldRules.type) {
                    case 'inviteCode':
                        fieldResult = this.validateInviteCode(value);
                        break;
                    case 'email':
                        fieldResult = this.validateEmail(value);
                        break;
                    case 'username':
                        fieldResult = this.validateUsername(value);
                        break;
                    case 'url':
                        fieldResult = this.validateUrl(value);
                        break;
                    default:
                        fieldResult.sanitized = this.sanitizeInput(value, fieldRules.options);
                }
                
                // 추가 규칙 적용
                if (fieldResult.isValid && fieldRules.minLength && fieldResult.sanitized.length < fieldRules.minLength) {
                    fieldResult = {
                        isValid: false,
                        error: `${fieldRules.label || fieldName}은(는) ${fieldRules.minLength}자 이상이어야 합니다.`,
                        sanitized: fieldResult.sanitized
                    };
                }
                
                if (fieldResult.isValid && fieldRules.maxLength && fieldResult.sanitized.length > fieldRules.maxLength) {
                    fieldResult = {
                        isValid: false,
                        error: `${fieldRules.label || fieldName}은(는) ${fieldRules.maxLength}자 이하여야 합니다.`,
                        sanitized: fieldResult.sanitized
                    };
                }
            }
            
            results[fieldName] = fieldResult;
            if (!fieldResult.isValid) {
                isFormValid = false;
            }
        }
        
        return {
            isValid: isFormValid,
            fields: results
        };
    }
    
    /**
     * 실시간 입력 검증 (이벤트 리스너용)
     */
    bindRealTimeValidation(inputElement, validationType, options = {}) {
        if (!inputElement || typeof inputElement.addEventListener !== 'function') {
            console.error('유효하지 않은 input 요소입니다.');
            return;
        }
        
        const validateAndShow = () => {
            const value = inputElement.value;
            let result;
            
            switch (validationType) {
                case 'inviteCode':
                    result = this.validateInviteCode(value);
                    break;
                case 'email':
                    result = this.validateEmail(value);
                    break;
                case 'username':
                    result = this.validateUsername(value);
                    break;
                default:
                    result = {
                        isValid: true,
                        error: null,
                        sanitized: this.sanitizeInput(value, options)
                    };
            }
            
            // UI 업데이트
            inputElement.value = result.sanitized;
            
            // 오류 표시
            const errorElement = options.errorElement || 
                inputElement.parentNode.querySelector('.validation-error') ||
                this.createErrorElement(inputElement);
                
            if (result.isValid) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
                inputElement.classList.remove('validation-error');
            } else {
                errorElement.textContent = result.error;
                errorElement.style.display = 'block';
                inputElement.classList.add('validation-error');
            }
            
            return result;
        };
        
        // 이벤트 리스너 등록
        inputElement.addEventListener('blur', validateAndShow);
        inputElement.addEventListener('input', () => {
            // 실시간으로는 sanitize만 수행
            inputElement.value = this.sanitizeInput(inputElement.value, options);
        });
        
        return validateAndShow;
    }
    
    /**
     * 오류 표시 요소 생성
     */
    createErrorElement(inputElement) {
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error';
        errorElement.style.cssText = 'color: #dc3545; font-size: 12px; margin-top: 4px; display: none;';
        
        inputElement.parentNode.appendChild(errorElement);
        return errorElement;
    }
    
    /**
     * 민감한 데이터 마스킹
     */
    maskSensitiveData(data) {
        if (typeof data !== 'string') return data;
        
        // 이메일 마스킹
        if (this.patterns.email.test(data)) {
            const [local, domain] = data.split('@');
            return `${local.substring(0, 2)}***@${domain}`;
        }
        
        // 일반적인 민감한 데이터는 길이에 따라 마스킹
        if (data.length > 10) {
            return `${data.substring(0, 3)}***${data.substring(data.length - 3)}`;
        } else if (data.length > 3) {
            return `${data.substring(0, 1)}***`;
        }
        
        return '***';
    }
    
    /**
     * 보안 이벤트 로깅
     */
    securityLog(eventType, data = {}) {
        const logData = {
            timestamp: new Date().toISOString(),
            type: eventType,
            url: window.location.href,
            userAgent: navigator.userAgent,
            data: data
        };
        
        // 개발 환경에서만 콘솔 출력
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('🚨 보안 이벤트:', logData);
        }
        
        // TODO: 프로덕션에서는 서버로 전송
        // this.sendSecurityLog(logData);
    }
    
    /**
     * CSP 위반 감지 및 처리
     */
    handleCspViolation(event) {
        this.securityLog('CSP_VIOLATION', {
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
            sourceFile: event.sourceFile,
            lineNumber: event.lineNumber
        });
        
        console.warn('🚨 CSP 위반 감지:', event);
    }
}

// 전역 접근
window.InputValidator = InputValidator;
window.getInputValidator = () => InputValidator.getInstance();

// CSP 위반 이벤트 리스너 등록
document.addEventListener('securitypolicyviolation', (event) => {
    const validator = InputValidator.getInstance();
    validator.handleCspViolation(event);
});

// 폼 자동 보안 강화 (옵션)
document.addEventListener('DOMContentLoaded', () => {
    const validator = InputValidator.getInstance();
    
    // 모든 input 요소에 기본 보안 적용
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(input => {
        // XSS 공격 실시간 방지
        input.addEventListener('input', (e) => {
            e.target.value = validator.sanitizeInput(e.target.value);
        });
    });
    
    console.log('🛡️ InputValidator 보안 시스템 활성화');
});

console.log('🛡️ InputValidator 클래스 로드 완료');