/**
 * 스토리지 매니저 - 기존 storage.js 보호 래퍼
 * 원본 storage.js는 절대 수정하지 않고, 이 래퍼를 통해서만 접근
 */
class StorageManager {
    constructor() {
        this.originalStorage = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    log(message) {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] StorageManager: ${message}`);
    }
    
    /**
     * 기존 storage 시스템과 연결
     */
    async init() {
        try {
            // 기존 전역 storage 객체 대기
            await this.waitForOriginalStorage();
            
            this.originalStorage = window.storage;
            this.isInitialized = true;
            
            this.log('✅ 기존 스토리지 시스템과 연결 완료');
            this.emit('ready');
            
        } catch (error) {
            this.log('❌ 스토리지 시스템 연결 실패: ' + error.message);
        }
    }
    
    /**
     * 원본 storage 객체 로드 대기
     */
    waitForOriginalStorage() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const check = () => {
                if (window.storage && typeof window.storage === 'object') {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(check, 100);
                } else {
                    reject(new Error('원본 storage 객체 로드 타임아웃'));
                }
            };
            
            check();
        });
    }
    
    /**
     * 사용자 정보 가져오기 (원본 함수 보호)
     */
    getCurrentUser() {
        if (!this.isInitialized || !this.originalStorage) {
            this.log('⚠️ 스토리지가 초기화되지 않음');
            return null;
        }
        
        try {
            // 원본 함수 그대로 사용
            return this.originalStorage.getCurrentUser();
        } catch (error) {
            this.log('❌ 사용자 정보 가져오기 실패: ' + error.message);
            return null;
        }
    }
    
    /**
     * 사용자 정보 저장 (원본 함수 보호)
     */
    saveCurrentUser(user) {
        if (!this.isInitialized || !this.originalStorage) {
            this.log('⚠️ 스토리지가 초기화되지 않음');
            return false;
        }
        
        try {
            // 원본 함수 그대로 사용
            this.originalStorage.saveCurrentUser(user);
            this.log('✅ 사용자 정보 저장 완료: ' + user.nickname);
            this.emit('userSaved', user);
            return true;
        } catch (error) {
            this.log('❌ 사용자 정보 저장 실패: ' + error.message);
            return false;
        }
    }
    
    /**
     * 로그아웃 (원본 함수 보호)
     */
    logout() {
        if (!this.isInitialized || !this.originalStorage) {
            this.log('⚠️ 스토리지가 초기화되지 않음');
            return false;
        }
        
        try {
            // 원본 함수 그대로 사용
            this.originalStorage.logout();
            this.log('✅ 사용자 정보 삭제 완료');
            this.emit('userLoggedOut');
            return true;
        } catch (error) {
            this.log('❌ 로그아웃 실패: ' + error.message);
            return false;
        }
    }
    
    /**
     * 로그인 상태 확인
     */
    isLoggedIn() {
        const user = this.getCurrentUser();
        return user !== null && user !== undefined;
    }
    
    /**
     * 안전한 데이터 접근
     */
    safeGet(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            this.log('❌ 데이터 읽기 실패: ' + error.message);
            return defaultValue;
        }
    }
    
    /**
     * 안전한 데이터 저장
     */
    safeSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            this.log('✅ 데이터 저장 완료: ' + key);
            return true;
        } catch (error) {
            this.log('❌ 데이터 저장 실패: ' + error.message);
            return false;
        }
    }
    
    /**
     * 이벤트 발생
     */
    emit(eventName, data) {
        const event = new CustomEvent(`storage:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }
    
    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback) {
        window.addEventListener(`storage:${eventName}`, (e) => callback(e.detail));
    }
    
    /**
     * 시스템 상태 확인
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            originalStorage: !!this.originalStorage,
            currentUser: this.isLoggedIn(),
            timestamp: new Date().toISOString()
        };
    }
}

// 전역으로 내보내기
window.StorageManager = StorageManager;