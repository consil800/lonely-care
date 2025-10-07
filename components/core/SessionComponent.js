/**
 * SessionComponent v1.0
 * 세션 관리를 독립적으로 처리하는 컴포넌트
 * 
 * 기존 auth.js의 세션 관리 기능을 래핑하여 컴포넌트화
 * 자동 복원, 세션 유지, 만료 처리 등의 세션 라이프사이클을 관리
 */

class SessionComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            maxAge: 24 * 60 * 60 * 1000, // 24시간 (기본값)
            keepAliveInterval: 5 * 60 * 1000, // 5분마다 갱신
            autoRestore: true,
            persistKey: 'currentUser',
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.currentUser = null;
        this.sessionData = null;
        this.isActive = false;
        this.keepAliveTimer = null;
        this.lastActivity = null;
        
        // 기존 auth 인스턴스 참조 (호환성)
        this.legacyAuth = null;
        
        console.log('🎫 SessionComponent 초기화', this.options);
        
        // 자동 초기화
        this.init();
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 Session 초기화 시작');
            
            // 기존 auth 인스턴스 참조 (호환성)
            if (window.auth) {
                this.legacyAuth = window.auth;
            }
            
            // 자동 세션 복원
            if (this.options.autoRestore) {
                await this.restoreSession();
            }
            
            // 활동 감지 리스너 설정
            this.setupActivityDetection();
            
            // 페이지 포커스/블러 감지
            this.setupVisibilityHandlers();
            
            this.dispatchEvent(new CustomEvent('session:ready', {
                detail: { component: this, user: this.currentUser }
            }));

            console.log('✅ Session 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ Session 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('session:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 새 세션 생성
     */
    async createSession(userData) {
        try {
            if (!userData || !userData.id) {
                throw new Error('유효하지 않은 사용자 데이터입니다.');
            }

            console.log('🎫 새 세션 생성:', userData.name || userData.nickname);

            // 세션 데이터 구성
            this.sessionData = {
                userId: userData.id,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.options.maxAge).toISOString(),
                sessionId: this.generateSessionId()
            };

            this.currentUser = userData;
            this.lastActivity = Date.now();
            this.isActive = true;

            // 세션 데이터 저장
            await this.saveSession();

            // Keep Alive 시작
            this.startKeepAlive();

            // 이벤트 발송
            this.dispatchEvent(new CustomEvent('session:created', {
                detail: { 
                    user: userData, 
                    sessionData: this.sessionData 
                }
            }));

            console.log('✅ 세션 생성 완료:', this.sessionData.sessionId);
            return { success: true, sessionData: this.sessionData };

        } catch (error) {
            console.error('❌ 세션 생성 실패:', error);
            this.dispatchEvent(new CustomEvent('session:create-error', {
                detail: { error: error.message }
            }));
            return { success: false, error: error.message };
        }
    }

    /**
     * 세션 복원
     */
    async restoreSession() {
        try {
            console.log('🔄 세션 복원 시도');

            // 저장된 데이터 로드
            const savedUser = localStorage.getItem(this.options.persistKey);
            const savedSession = localStorage.getItem(this.options.persistKey + '_session');
            
            if (!savedUser) {
                console.log('💾 저장된 사용자 데이터 없음');
                return false;
            }

            const userData = JSON.parse(savedUser);
            let sessionData = null;
            
            if (savedSession) {
                sessionData = JSON.parse(savedSession);
            }

            // 세션 만료 확인
            if (sessionData && sessionData.expiresAt) {
                if (new Date(sessionData.expiresAt) <= new Date()) {
                    console.log('⏰ 세션 만료됨');
                    await this.clearSession();
                    return false;
                }
            } else {
                // 레거시 세션 확인 (타임스탬프 기반)
                const loginTimestamp = localStorage.getItem('loginTimestamp');
                if (loginTimestamp) {
                    if (Date.now() - parseInt(loginTimestamp) > this.options.maxAge) {
                        console.log('⏰ 레거시 세션 만료됨');
                        await this.clearSession();
                        return false;
                    }
                }
            }

            // 세션 데이터 복원
            this.currentUser = userData;
            this.sessionData = sessionData || {
                userId: userData.id,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.options.maxAge).toISOString(),
                sessionId: this.generateSessionId()
            };
            
            this.lastActivity = Date.now();
            this.isActive = true;

            // Keep Alive 시작
            this.startKeepAlive();

            this.dispatchEvent(new CustomEvent('session:restored', {
                detail: { user: userData, sessionData: this.sessionData }
            }));

            console.log('✅ 세션 복원 완료:', userData.name || userData.nickname);
            return true;

        } catch (error) {
            console.error('❌ 세션 복원 실패:', error);
            await this.clearSession();
            return false;
        }
    }

    /**
     * 세션 갱신
     */
    async refreshSession() {
        try {
            if (!this.isActive || !this.currentUser) {
                return false;
            }

            console.log('🔄 세션 갱신:', new Date().toLocaleTimeString());

            // 세션 데이터 업데이트
            this.sessionData.lastActivity = new Date().toISOString();
            this.sessionData.expiresAt = new Date(Date.now() + this.options.maxAge).toISOString();
            this.lastActivity = Date.now();

            // 사용자 데이터에도 활동 시간 기록
            if (this.currentUser) {
                this.currentUser.lastActivity = new Date().toISOString();
            }

            // 저장
            await this.saveSession();

            // 기존 storage 인터페이스와의 호환성
            if (this.currentUser && this.currentUser.kakao_id && window.storage) {
                try {
                    await window.storage.updateUserStatus(this.currentUser.kakao_id, 'active');
                } catch (error) {
                    console.log('상태 업데이트 실패 (무시):', error.message);
                }
            }

            this.dispatchEvent(new CustomEvent('session:refreshed', {
                detail: { 
                    user: this.currentUser, 
                    sessionData: this.sessionData,
                    timestamp: this.lastActivity
                }
            }));

            return true;

        } catch (error) {
            console.error('❌ 세션 갱신 실패:', error);
            return false;
        }
    }

    /**
     * 세션 종료
     */
    async destroySession() {
        try {
            console.log('🚪 세션 종료 시작');

            const user = this.currentUser;
            
            // Keep Alive 중단
            this.stopKeepAlive();

            // 상태 초기화
            this.currentUser = null;
            this.sessionData = null;
            this.isActive = false;
            this.lastActivity = null;

            // 저장된 데이터 삭제
            await this.clearSession();

            this.dispatchEvent(new CustomEvent('session:destroyed', {
                detail: { previousUser: user }
            }));

            console.log('✅ 세션 종료 완료');
            return true;

        } catch (error) {
            console.error('❌ 세션 종료 실패:', error);
            return false;
        }
    }

    /**
     * Keep Alive 시스템 시작
     */
    startKeepAlive() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
        }

        console.log('🔄 Keep Alive 시스템 시작');

        this.keepAliveTimer = setInterval(async () => {
            if (this.isActive && this.currentUser) {
                await this.refreshSession();
            } else {
                console.log('⚠️ 비활성 세션 - Keep Alive 중단');
                this.stopKeepAlive();
            }
        }, this.options.keepAliveInterval);
    }

    /**
     * Keep Alive 시스템 중단
     */
    stopKeepAlive() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
            console.log('🛑 Keep Alive 시스템 중단');
        }
    }

    /**
     * 세션 데이터 저장
     */
    async saveSession() {
        try {
            if (this.currentUser) {
                localStorage.setItem(this.options.persistKey, JSON.stringify(this.currentUser));
            }
            
            if (this.sessionData) {
                localStorage.setItem(this.options.persistKey + '_session', JSON.stringify(this.sessionData));
            }

            // 레거시 호환성을 위한 타임스탬프 저장
            localStorage.setItem('loginTimestamp', Date.now().toString());

            if (this.options.debug) {
                console.log('💾 세션 저장됨:', this.sessionData?.sessionId);
            }

        } catch (error) {
            console.error('❌ 세션 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 저장된 세션 데이터 삭제
     */
    async clearSession() {
        try {
            localStorage.removeItem(this.options.persistKey);
            localStorage.removeItem(this.options.persistKey + '_session');
            localStorage.removeItem('loginTimestamp');
            
            console.log('🗑️ 세션 데이터 삭제 완료');

        } catch (error) {
            console.error('❌ 세션 데이터 삭제 실패:', error);
        }
    }

    /**
     * 활동 감지 설정
     */
    setupActivityDetection() {
        const activityEvents = ['click', 'scroll', 'keypress', 'mousemove', 'touchstart'];
        let activityTimeout;

        const recordActivity = () => {
            clearTimeout(activityTimeout);
            
            // 짧은 시간 내 중복 활동은 무시 (성능 최적화)
            activityTimeout = setTimeout(() => {
                if (this.isActive) {
                    this.lastActivity = Date.now();
                    
                    // 세션이 곧 만료될 때만 즉시 갱신
                    if (this.sessionData && this.sessionData.expiresAt) {
                        const timeUntilExpiry = new Date(this.sessionData.expiresAt).getTime() - Date.now();
                        if (timeUntilExpiry < this.options.keepAliveInterval) {
                            this.refreshSession();
                        }
                    }
                }
            }, 1000); // 1초 디바운싱
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, recordActivity, { passive: true });
        });

        console.log('👀 활동 감지 시스템 설정 완료');
    }

    /**
     * 페이지 visibility 핸들러 설정
     */
    setupVisibilityHandlers() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 페이지가 백그라운드로 갈 때
                this.dispatchEvent(new CustomEvent('session:background'));
            } else {
                // 페이지가 포그라운드로 올 때
                if (this.isActive) {
                    this.refreshSession();
                }
                this.dispatchEvent(new CustomEvent('session:foreground'));
            }
        });

        // 페이지 언로드 시 세션 상태 저장
        window.addEventListener('beforeunload', () => {
            if (this.isActive) {
                this.saveSession();
            }
        });

        console.log('📱 Visibility 핸들러 설정 완료');
    }

    /**
     * 세션 ID 생성
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    /**
     * 현재 사용자 반환
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 세션 활성 상태 확인
     */
    isSessionActive() {
        return this.isActive && this.currentUser !== null;
    }

    /**
     * 세션 만료 시간 확인
     */
    getSessionExpiryTime() {
        if (!this.sessionData || !this.sessionData.expiresAt) {
            return null;
        }
        return new Date(this.sessionData.expiresAt);
    }

    /**
     * 세션 남은 시간 (밀리초)
     */
    getTimeUntilExpiry() {
        const expiryTime = this.getSessionExpiryTime();
        if (!expiryTime) return null;
        
        return Math.max(0, expiryTime.getTime() - Date.now());
    }

    /**
     * 세션 정보 반환
     */
    getSessionInfo() {
        return {
            isActive: this.isActive,
            currentUser: this.currentUser,
            sessionData: this.sessionData,
            lastActivity: this.lastActivity,
            expiryTime: this.getSessionExpiryTime(),
            timeUntilExpiry: this.getTimeUntilExpiry()
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // auth.js 호환성
    setCurrentUser(user) {
        if (user) {
            this.createSession(user);
        } else {
            this.destroySession();
        }
    }

    // storage.js 호환성  
    startSessionKeepAlive() {
        this.startKeepAlive();
    }

    stopSessionKeepAlive() {
        this.stopKeepAlive();
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('session:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.stopKeepAlive();
        this.currentUser = null;
        this.sessionData = null;
        this.isActive = false;
        this.lastActivity = null;
        
        console.log('🗑️ SessionComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.SessionComponent = SessionComponent;
    
    // 즉시 인스턴스 생성 (기존 코드 호환성)
    if (!window.sessionComponent) {
        window.sessionComponent = new SessionComponent();
        
        // 기존 전역 변수와 호환성 유지
        // auth.js의 세션 관리 기능을 대체
        
        console.log('🌐 SessionComponent 전역 등록 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionComponent;
}