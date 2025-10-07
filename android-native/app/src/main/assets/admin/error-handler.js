/**
 * 관리자 패널 에러 핸들러
 * Firebase 연결 오류, 404 에러, 네트워크 에러 등을 처리
 */

class AdminErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxErrorLog = 100;
        this.isInitialized = false;
        
        console.log('🛡️ AdminErrorHandler 초기화');
        this.init();
    }

    /**
     * 에러 핸들러 초기화
     */
    init() {
        // 글로벌 에러 핸들러 설정
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, event.filename, event.lineno);
        });

        // Promise rejection 핸들러
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
        });

        // Firebase 에러 핸들러
        this.setupFirebaseErrorHandler();

        this.isInitialized = true;
        console.log('✅ AdminErrorHandler 초기화 완료');
    }

    /**
     * Firebase 에러 핸들러 설정
     */
    setupFirebaseErrorHandler() {
        // Firebase 연결 체크 및 재시도 로직
        window.adminFirebaseCheck = async () => {
            try {
                if (!window.firebaseDb) {
                    throw new Error('Firebase DB가 초기화되지 않았습니다');
                }

                // 테스트 컬렉션 접근으로 연결 확인
                await window.firebaseDb.collection('users').limit(1).get();
                return true;
                
            } catch (error) {
                this.logError('FIREBASE_CONNECTION', error);
                return false;
            }
        };

        // Firebase 재연결 시도
        window.adminFirebaseReconnect = async () => {
            try {
                if (window.firebase && window.firebase.apps.length > 0) {
                    window.firebaseDb = window.firebase.firestore();
                    
                    // 연결 테스트
                    await window.firebaseDb.collection('users').limit(1).get();
                    
                    console.log('🔄 Firebase 재연결 성공');
                    return true;
                }
                return false;
                
            } catch (error) {
                this.logError('FIREBASE_RECONNECT', error);
                return false;
            }
        };
    }

    /**
     * 글로벌 에러 처리 (생명구조 앱용 강화)
     */
    handleGlobalError(error, filename, lineno) {
        // 🚨 생명구조 앱: 더 상세한 에러 정보 수집
        let errorMessage = '알 수 없는 에러';
        
        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error.message) {
                errorMessage = error.message;
            } else if (error.toString && typeof error.toString === 'function') {
                errorMessage = error.toString();
            } else if (error.name) {
                errorMessage = `${error.name}: ${error.description || '설명 없음'}`;
            }
        }
        
        const errorInfo = {
            type: 'GLOBAL_ERROR',
            message: errorMessage,
            filename: filename || 'unknown',
            lineno: lineno || 0,
            timestamp: new Date().toISOString(),
            errorType: error?.constructor?.name || 'Unknown',
            stack: error?.stack || 'Stack trace 없음'
        };

        // 🚨 생명구조 앱: Chrome 확장 프로그램 오류 필터링
        if (this.isChromeExtensionError(errorInfo)) {
            console.log('🔧 Chrome 확장 프로그램 오류 필터링됨:', errorInfo.message);
            return; // Chrome 확장 프로그램 오류는 무시
        }
        
        // 🚨 생명구조 앱: Persistence 관련 오류 필터링
        if (this.isFirebasePersistenceError(errorInfo)) {
            console.log('🔧 Firebase Persistence 오류 필터링됨:', errorInfo.message);
            return; // 이미 해결된 persistence 오류는 무시
        }

        this.logError(errorInfo.type, errorInfo);

        // 404 에러 특별 처리
        if (errorInfo.message.includes('404') || errorInfo.message.includes('Not Found')) {
            this.handle404Error(errorInfo);
        }
    }
    
    /**
     * Chrome 확장 프로그램 오류 확인
     */
    isChromeExtensionError(errorInfo) {
        const message = errorInfo.message.toLowerCase();
        const filename = errorInfo.filename.toLowerCase();
        
        return message.includes('message channel closed') ||
               message.includes('chrome-extension') ||
               filename.includes('chrome-extension') ||
               message.includes('extension context invalidated');
    }
    
    /**
     * Firebase Persistence 관련 오류 확인
     */
    isFirebasePersistenceError(errorInfo) {
        const message = errorInfo.message.toLowerCase();
        
        return message.includes('persistence can no longer be enabled') ||
               message.includes('already been started') ||
               message.includes('enablepersistence');
    }

    /**
     * Promise rejection 처리 (생명구조 앱용 강화)
     */
    handlePromiseRejection(reason) {
        // 🚨 생명구조 앱: 더 상세한 Promise 오류 정보 수집
        let reasonMessage = '알 수 없는 Promise 에러';
        
        if (reason) {
            if (typeof reason === 'string') {
                reasonMessage = reason;
            } else if (reason.message) {
                reasonMessage = reason.message;
            } else if (reason.toString && typeof reason.toString === 'function') {
                reasonMessage = reason.toString();
            } else if (reason.name) {
                reasonMessage = `${reason.name}: ${reason.description || '설명 없음'}`;
            }
        }
        
        const errorInfo = {
            type: 'PROMISE_REJECTION',
            message: reasonMessage,
            timestamp: new Date().toISOString(),
            reasonType: reason?.constructor?.name || 'Unknown',
            stack: reason?.stack || 'Stack trace 없음'
        };

        // 🚨 생명구조 앱: Chrome 확장 프로그램 Promise 오류 필터링
        if (this.isChromeExtensionError(errorInfo)) {
            console.log('🔧 Chrome 확장 프로그램 Promise 오류 필터링됨:', errorInfo.message);
            return; // Chrome 확장 프로그램 오류는 무시
        }
        
        // 🚨 생명구조 앱: Firebase Persistence Promise 오류 필터링
        if (this.isFirebasePersistenceError(errorInfo)) {
            console.log('🔧 Firebase Persistence Promise 오류 필터링됨:', errorInfo.message);
            return; // 이미 해결된 persistence 오류는 무시
        }

        this.logError(errorInfo.type, errorInfo);

        // Firebase 관련 에러 체크
        if (this.isFirebaseError(reason)) {
            this.handleFirebaseError(reason);
        }
    }

    /**
     * 404 에러 처리
     */
    handle404Error(errorInfo) {
        console.warn('🔍 404 에러 감지:', errorInfo);

        // 관리자 패널에 404 알림 표시
        this.showErrorNotification('파일을 찾을 수 없습니다', 
            `리소스 로드 실패: ${errorInfo.filename}`, 'warning');

        // 대체 리소스 제안
        if (errorInfo.filename.includes('icon-192x192.png')) {
            console.log('💡 아이콘 파일 대체 제안: /lonely-care/icon.png 사용');
        }
    }

    /**
     * Firebase 에러 확인
     */
    isFirebaseError(error) {
        const errorStr = error?.toString() || '';
        return errorStr.includes('firebase') || 
               errorStr.includes('firestore') || 
               error?.code?.startsWith('firestore/');
    }

    /**
     * Firebase 에러 처리
     */
    async handleFirebaseError(error) {
        console.warn('🔥 Firebase 에러 감지:', error);

        const errorCode = error?.code || 'unknown';
        let message = 'Firebase 연결 오류';
        let suggestion = '';

        switch (errorCode) {
            case 'firestore/permission-denied':
                message = '데이터베이스 접근 권한이 없습니다';
                suggestion = '로그인 상태를 확인하거나 관리자에게 문의하세요';
                break;
                
            case 'firestore/unavailable':
                message = 'Firebase 서비스를 사용할 수 없습니다';
                suggestion = '잠시 후 다시 시도하거나 네트워크 연결을 확인하세요';
                // 자동 재연결 시도
                setTimeout(() => window.adminFirebaseReconnect?.(), 5000);
                break;
                
            case 'firestore/not-found':
                message = '요청한 데이터를 찾을 수 없습니다';
                suggestion = '데이터가 삭제되었거나 존재하지 않을 수 있습니다';
                break;
                
            default:
                suggestion = '개발자 도구 콘솔에서 자세한 내용을 확인하세요';
        }

        this.showErrorNotification(message, suggestion, 'error');
    }

    /**
     * 안전한 Firebase 컬렉션 접근
     */
    async safeCollectionAccess(collectionName, operation, options = {}) {
        try {
            // Firebase 연결 확인
            if (!window.firebaseDb) {
                throw new Error('Firebase DB가 초기화되지 않았습니다');
            }

            const collection = window.firebaseDb.collection(collectionName);
            let query = collection;

            // 쿼리 옵션 적용
            if (options.where) {
                for (const condition of options.where) {
                    query = query.where(condition.field, condition.operator, condition.value);
                }
            }

            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            // 작업 실행
            const result = await query.get();
            return result.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {
            this.logError('COLLECTION_ACCESS', {
                collection: collectionName,
                operation: operation,
                error: error.message
            });

            // 빈 배열 반환 (UI 깨짐 방지)
            return [];
        }
    }

    /**
     * 에러 로그 기록
     */
    logError(type, error) {
        const logEntry = {
            type: type,
            error: error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errorLog.push(logEntry);
        
        // 로그 크기 제한
        if (this.errorLog.length > this.maxErrorLog) {
            this.errorLog.shift();
        }

        // 콘솔에 에러 출력
        console.error(`[${type}]`, error);
    }

    /**
     * 에러 알림 표시
     */
    showErrorNotification(title, message, type = 'error') {
        // 관리자 패널에 알림 표시
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${type === 'error' ? '❌' : '⚠️'}</span>
                <span class="notification-title">${title}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notification-message">${message}</div>
        `;

        // 페이지 상단에 알림 추가
        const container = document.getElementById('notification-container') || 
                         document.querySelector('.admin-container') || 
                         document.body;
        
        container.insertAdjacentElement('afterbegin', notification);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 에러 로그 내보내기
     */
    exportErrorLog() {
        const logData = {
            timestamp: new Date().toISOString(),
            errors: this.errorLog,
            systemInfo: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                firebase: !!window.firebase,
                firebaseDb: !!window.firebaseDb
            }
        };

        const dataStr = JSON.stringify(logData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `admin-error-log-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * 에러 로그 조회
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * 에러 로그 지우기
     */
    clearErrorLog() {
        this.errorLog = [];
        console.log('🗑️ 에러 로그가 지워졌습니다');
    }
}

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
    .admin-notification {
        background: white;
        border-left: 4px solid #dc3545;
        border-radius: 4px;
        padding: 16px;
        margin: 8px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 500px;
        z-index: 9999;
    }
    
    .admin-notification.warning {
        border-left-color: #ffc107;
    }
    
    .admin-notification.error {
        border-left-color: #dc3545;
    }
    
    .notification-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }
    
    .notification-title {
        font-weight: bold;
        color: #333;
        margin-left: 8px;
        flex-grow: 1;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #666;
    }
    
    .notification-message {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
    }
`;
document.head.appendChild(style);

// 전역 인스턴스 생성
let adminErrorHandler = null;

/**
 * AdminErrorHandler 초기화 및 반환
 */
function getAdminErrorHandler() {
    if (!adminErrorHandler) {
        adminErrorHandler = new AdminErrorHandler();
        window.adminErrorHandler = adminErrorHandler;
    }
    return adminErrorHandler;
}

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    getAdminErrorHandler();
});

// 글로벌 스코프에 추가
window.AdminErrorHandler = AdminErrorHandler;
window.getAdminErrorHandler = getAdminErrorHandler;