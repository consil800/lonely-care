/**
 * 컴포넌트 레지스트리
 * 모든 컴포넌트의 중앙 관리 시스템
 */

class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.initOrder = [];
        this.isInitializing = false;
        this.initialized = false;
        
        console.log('🗂️ ComponentRegistry 초기화');
        this.setupRegistry();
    }

    /**
     * 컴포넌트 레지스트리 설정
     */
    setupRegistry() {
        // 컴포넌트 초기화 순서 정의
        this.initOrder = [
            'DatabaseComponent',
            'StorageComponent',
            'KakaoAuthComponent',
            'SessionComponent',
            'InviteSystemComponent',
            'FriendStatusComponent',
            'NotificationManagerComponent',
            'FCMComponent',
            'AlertSystemComponent',
            'AdBannerComponent',
            'ProfileComponent',
            'SettingsComponent'
        ];

        // 컴포넌트 경로 매핑
        this.componentPaths = {
            'DatabaseComponent': '/components/database/DatabaseComponent.js',
            'StorageComponent': '/components/core/StorageComponent.js',
            'KakaoAuthComponent': '/components/auth/KakaoAuthComponent.js',
            'SessionComponent': '/components/core/SessionComponent.js',
            'InviteSystemComponent': '/components/invite-system/InviteSystemComponent.js',
            'FriendStatusComponent': '/components/friends/FriendStatusComponent.js',
            'NotificationManagerComponent': '/components/notifications/NotificationManagerComponent.js',
            'FCMComponent': '/components/notifications/FCMComponent.js',
            'AlertSystemComponent': '/components/notifications/AlertSystemComponent.js',
            'AdBannerComponent': '/components/ui/AdBannerComponent.js',
            'ProfileComponent': '/components/ui/ProfileComponent.js',
            'SettingsComponent': '/components/ui/SettingsComponent.js'
        };
    }

    /**
     * 컴포넌트 등록
     */
    register(name, componentClass, dependencies = []) {
        this.components.set(name, {
            class: componentClass,
            instance: null,
            dependencies: dependencies,
            loaded: false,
            initialized: false
        });
        
        console.log(`📝 컴포넌트 등록: ${name}`);
    }

    /**
     * 컴포넌트 스크립트 로드
     */
    async loadScript(path) {
        return new Promise((resolve, reject) => {
            // 이미 로드된 스크립트인지 확인 (더 정확한 매칭)
            const fileName = path.split('/').pop();
            const existingScript = document.querySelector(`script[src*="${fileName}"]`);
            if (existingScript) {
                console.log(`⚠️ 스크립트 이미 로드됨: ${fileName}`);
                resolve();
                return;
            }

            // 글로벌 스코프에서 클래스가 이미 정의되었는지 확인
            const componentName = fileName.replace('.js', '');
            if (window[componentName]) {
                console.log(`⚠️ 컴포넌트 클래스 이미 존재: ${componentName}`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = path;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`스크립트 로드 실패: ${path}`));
            document.head.appendChild(script);
        });
    }

    /**
     * 모든 컴포넌트 로드
     */
    async loadAllComponents() {
        console.log('📦 컴포넌트 스크립트 로드 시작');
        
        try {
            for (const [name, path] of Object.entries(this.componentPaths)) {
                try {
                    await this.loadScript(path);
                    console.log(`✅ ${name} 스크립트 로드됨`);
                } catch (error) {
                    console.warn(`⚠️ ${name} 스크립트 로드 실패:`, error);
                }
            }
            
            console.log('✅ 컴포넌트 스크립트 로드 완료');
            return true;
            
        } catch (error) {
            console.error('❌ 컴포넌트 스크립트 로드 실패:', error);
            return false;
        }
    }

    /**
     * 컴포넌트 자동 등록
     */
    autoRegister() {
        // 글로벌 스코프에서 컴포넌트 클래스들을 찾아 자동 등록
        for (const name of this.initOrder) {
            if (window[name]) {
                this.register(name, window[name]);
                this.components.get(name).loaded = true;
            }
        }
    }

    /**
     * 의존성 해결
     */
    resolveDependencies(name) {
        const component = this.components.get(name);
        if (!component) {
            throw new Error(`컴포넌트를 찾을 수 없습니다: ${name}`);
        }

        const resolved = [];
        const visited = new Set();

        const resolve = (componentName) => {
            if (visited.has(componentName)) {
                throw new Error(`순환 의존성 발견: ${componentName}`);
            }
            
            visited.add(componentName);
            const comp = this.components.get(componentName);
            
            if (comp && comp.dependencies) {
                for (const dep of comp.dependencies) {
                    resolve(dep);
                }
            }
            
            if (!resolved.includes(componentName)) {
                resolved.push(componentName);
            }
            
            visited.delete(componentName);
        };

        resolve(name);
        return resolved;
    }

    /**
     * 모든 컴포넌트 초기화
     */
    async initializeAll() {
        if (this.isInitializing || this.initialized) {
            return this.initialized;
        }

        this.isInitializing = true;
        
        try {
            console.log('🚀 컴포넌트 시스템 초기화 시작');
            
            // 1. 스크립트 로드
            await this.loadAllComponents();
            
            // 2. 자동 등록
            this.autoRegister();
            
            // 3. 순차 초기화
            for (const name of this.initOrder) {
                if (this.components.has(name)) {
                    try {
                        await this.initializeComponent(name);
                    } catch (error) {
                        console.error(`❌ ${name} 초기화 실패:`, error);
                    }
                }
            }
            
            this.initialized = true;
            console.log('✅ 컴포넌트 시스템 초기화 완료');
            
            // 초기화 완료 이벤트 발송
            window.dispatchEvent(new CustomEvent('componentsInitialized'));
            
            return true;
            
        } catch (error) {
            console.error('❌ 컴포넌트 시스템 초기화 실패:', error);
            return false;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * 개별 컴포넌트 초기화
     */
    async initializeComponent(name) {
        const component = this.components.get(name);
        
        if (!component) {
            throw new Error(`컴포넌트를 찾을 수 없습니다: ${name}`);
        }

        if (component.initialized) {
            return component.instance;
        }

        try {
            // 의존성 먼저 초기화
            for (const dep of component.dependencies) {
                if (this.components.has(dep)) {
                    await this.initializeComponent(dep);
                }
            }

            // 컴포넌트 인스턴스 생성
            if (!component.instance) {
                component.instance = new component.class();
            }

            // 초기화 메서드 호출
            if (component.instance.init) {
                await component.instance.init();
            }

            component.initialized = true;
            
            // 글로벌 스코프에 등록
            const instanceName = name.replace('Component', '').toLowerCase() + 'Component';
            window[instanceName] = component.instance;
            
            console.log(`✅ ${name} 초기화 완료`);
            return component.instance;
            
        } catch (error) {
            console.error(`❌ ${name} 초기화 실패:`, error);
            throw error;
        }
    }

    /**
     * 컴포넌트 인스턴스 가져오기
     */
    get(name) {
        const component = this.components.get(name);
        return component ? component.instance : null;
    }

    /**
     * 컴포넌트 상태 확인
     */
    getStatus() {
        const status = {};
        
        for (const [name, component] of this.components) {
            status[name] = {
                loaded: component.loaded,
                initialized: component.initialized,
                hasInstance: !!component.instance
            };
        }
        
        return status;
    }

    /**
     * 기본 컴포넌트만 초기화 (Auth 의존성 없는 컴포넌트들)
     */
    async initializeBasicComponents() {
        if (this.isInitializing || this.initialized) {
            return this.initialized;
        }

        this.isInitializing = true;
        
        try {
            console.log('🚀 기본 컴포넌트 시스템 초기화 시작');
            
            // 1. 스크립트 로드
            await this.loadAllComponents();
            
            // 2. 자동 등록
            this.autoRegister();
            
            // 3. Auth 의존성이 없는 컴포넌트들만 초기화
            const basicComponents = [
                'DatabaseComponent',
                'StorageComponent', 
                'AdBannerComponent'
            ];
            
            for (const name of basicComponents) {
                if (this.components.has(name)) {
                    try {
                        await this.initializeComponent(name);
                    } catch (error) {
                        console.error(`❌ ${name} 초기화 실패:`, error);
                    }
                }
            }
            
            console.log('✅ 기본 컴포넌트 시스템 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ 기본 컴포넌트 시스템 초기화 실패:', error);
            return false;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * 모든 컴포넌트 정리
     */
    destroyAll() {
        console.log('🗑️ 모든 컴포넌트 정리 시작');
        
        for (const [name, component] of this.components) {
            if (component.instance && typeof component.instance.destroy === 'function') {
                try {
                    component.instance.destroy();
                } catch (error) {
                    console.error(`${name} 정리 실패:`, error);
                }
            }
            component.instance = null;
            component.initialized = false;
        }
        
        this.initialized = false;
        console.log('✅ 모든 컴포넌트 정리 완료');
    }
}

// 전역 레지스트리 인스턴스
let componentRegistry = null;

/**
 * ComponentRegistry 초기화 및 반환
 */
function getComponentRegistry() {
    if (!componentRegistry) {
        componentRegistry = new ComponentRegistry();
        window.componentRegistry = componentRegistry;
    }
    return componentRegistry;
}

/**
 * 자동 초기화 (DOM 로드 후)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 로그인 상태인 경우에만 컴포넌트 시스템 초기화
    setTimeout(async () => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            console.log('🎯 로그인 상태 감지됨, 컴포넌트 시스템 초기화');
            
            // Auth 시스템이 준비될 때까지 대기 (최대 10초)
            const waitForAuth = () => {
                return new Promise((resolve, reject) => {
                    let attempts = 0;
                    const maxAttempts = 100; // 10초 (100ms * 100회)
                    
                    const checkAuth = () => {
                        attempts++;
                        if (window.auth && window.auth.isInitialized) {
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            reject(new Error('Auth 시스템 대기 시간 초과'));
                        } else {
                            setTimeout(checkAuth, 100);
                        }
                    };
                    checkAuth();
                });
            };
            
            try {
                await waitForAuth();
                console.log('🔐 Auth 시스템 준비 완료, 컴포넌트 초기화 시작');
                const registry = getComponentRegistry();
                await registry.initializeAll();
            } catch (error) {
                console.warn('⚠️ Auth 대기 시간 초과, 기본 컴포넌트만 초기화');
                const registry = getComponentRegistry();
                await registry.initializeBasicComponents();
            }
        }
    }, 3000); // 대기 시간을 3초로 증가
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ComponentRegistry, getComponentRegistry };
} else {
    window.ComponentRegistry = ComponentRegistry;
    window.getComponentRegistry = getComponentRegistry;
}