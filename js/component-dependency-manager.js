/**
 * 컴포넌트 의존성 관리자
 * Auth가 준비된 후 다른 컴포넌트들을 초기화
 */

class ComponentDependencyManager {
    constructor() {
        this.authReady = false;
        this.waitingComponents = [];
        this.retryAttempts = new Map();
        this.maxRetries = 2; // 무한 루프 방지를 위해 재시도 횟수 제한
        
        // Auth 준비 신호 대기
        window.addEventListener('authReady', (event) => {
            console.log('📡 Auth 준비 신호 수신:', event.detail);
            this.authReady = true;
            this.initializeWaitingComponents();
        });
        
        console.log('🔧 ComponentDependencyManager 초기화');
    }
    
    /**
     * Auth가 준비될 때까지 기다리는 컴포넌트 등록
     */
    registerComponent(componentName, initFunction) {
        if (this.authReady) {
            // Auth가 이미 준비됨
            this.tryInitializeComponent(componentName, initFunction);
        } else {
            // Auth 준비를 기다림
            this.waitingComponents.push({ name: componentName, init: initFunction });
            console.log(`⏳ ${componentName} Auth 대기 중...`);
        }
    }
    
    /**
     * 대기 중인 컴포넌트들 초기화
     */
    async initializeWaitingComponents() {
        console.log(`🚀 Auth 준비됨 - ${this.waitingComponents.length}개 컴포넌트 초기화 시작`);
        
        for (const component of this.waitingComponents) {
            await this.tryInitializeComponent(component.name, component.init);
        }
        
        this.waitingComponents = [];
    }
    
    /**
     * 컴포넌트 초기화 시도
     */
    async tryInitializeComponent(name, initFunction) {
        const retryKey = name;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        try {
            console.log(`🔧 ${name} 초기화 시도 (${attempts + 1}/${this.maxRetries})`);
            await initFunction();
            console.log(`✅ ${name} 초기화 완료`);
            this.retryAttempts.delete(retryKey);
        } catch (error) {
            console.error(`❌ ${name} 초기화 실패:`, error);
            
            // Auth 의존성 에러면 즉시 포기 (무한 루프 방지)
            if (error.message?.includes('Auth') && !this.authReady) {
                console.warn(`⚠️ ${name} 초기화 중단 - Auth 미준비 (무한 루프 방지)`);
                this.retryAttempts.delete(retryKey);
                return;
            }
            
            if (attempts < this.maxRetries - 1) {
                this.retryAttempts.set(retryKey, attempts + 1);
                
                const delay = 2000; // 2초로 고정
                console.log(`🔄 ${name} ${delay/1000}초 후 재시도 (${attempts + 1}/${this.maxRetries})`);
                
                setTimeout(() => {
                    this.tryInitializeComponent(name, initFunction);
                }, delay);
            } else {
                console.warn(`⚠️ ${name} 초기화 포기 (${this.maxRetries}회 시도 후) - 앱은 계속 실행됨`);
                this.retryAttempts.delete(retryKey);
            }
        }
    }
    
    /**
     * Auth 상태 강제 확인
     */
    checkAuthStatus() {
        const authStatus = {
            windowAuth: !!window.auth,
            globalAuth: typeof auth !== 'undefined' ? !!auth : false,
            authReady: this.authReady,
            waitingComponents: this.waitingComponents.length,
            currentUser: window.auth?.getCurrentUser?.() || null
        };
        
        console.log('📊 Auth 상태 체크:', authStatus);
        return authStatus;
    }
    
    /**
     * Auth 준비 강제 트리거 (디버깅용)
     */
    forceAuthReady() {
        if (!this.authReady && (window.auth || (typeof auth !== 'undefined' && auth))) {
            console.log('🔧 Auth 준비 강제 트리거');
            const authInstance = window.auth || auth;
            window.dispatchEvent(new CustomEvent('authReady', { 
                detail: { auth: authInstance, isLoggedIn: true } 
            }));
        }
    }
}

// 전역 인스턴스 생성
window.componentDependencyManager = new ComponentDependencyManager();

// 디버깅 함수들
window.checkAuthStatus = () => window.componentDependencyManager.checkAuthStatus();
window.forceAuthReady = () => window.componentDependencyManager.forceAuthReady();

console.log('🔧 Component Dependency Manager 로드 완료');
console.log('💡 디버깅: checkAuthStatus(), forceAuthReady() 사용 가능');