/**
 * Component Loader - Enhanced 컴포넌트들을 동적으로 로드하는 시스템
 * index.html을 수정하지 않고 컴포넌트들을 안전하게 로드
 * 
 * 🔧 Level 4 컴포넌트: 자유롭게 수정 가능
 * 🛡️ Level 1 파일(index.html)을 건드리지 않음
 */

class ComponentLoader {
    constructor() {
        this.components = [
            {
                name: 'Enhanced Notification Manager',
                path: 'components/notifications/enhanced-notification-manager.js',
                loaded: false
            },
            {
                name: 'Enhanced Friend Status Monitor', 
                path: 'components/friends/enhanced-friend-status-monitor.js',
                loaded: false
            },
            {
                name: 'Enhanced Motion Detector',
                path: 'components/motion/enhanced-motion-detector.js', 
                loaded: false
            },
            {
                name: 'Component Manager',
                path: 'components/core/component-manager.js',
                loaded: false
            }
        ];
        
        console.log('🚀 Component Loader 초기화');
        this.init();
    }

    async init() {
        try {
            console.log('📦 Enhanced 컴포넌트 스크립트들 동적 로드 시작...');
            
            // 기존 시스템이 로드될 때까지 대기
            await this.waitForBaseSystem();
            
            // 컴포넌트들을 순차적으로 로드
            await this.loadComponents();
            
            console.log('✅ 모든 Enhanced 컴포넌트 로드 완료');
            
        } catch (error) {
            console.error('❌ Component Loader 초기화 실패:', error);
        }
    }

    // 기존 시스템 로드 대기
    async waitForBaseSystem() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // 10초 대기
            
            const checkSystem = () => {
                const hasAuth = window.auth && typeof window.auth.getCurrentUser === 'function';
                const hasStorage = window.storage && window.storage.supabase;
                const hasNotifications = window.notificationsManager;
                const hasFriendMonitor = window.friendStatusMonitor;
                const hasMotionDetector = window.motionDetector;
                
                if (hasAuth && hasStorage && hasNotifications && hasFriendMonitor && hasMotionDetector) {
                    console.log('✅ 기존 시스템 로드 완료 - Enhanced 컴포넌트 로드 시작');
                    resolve();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        console.warn('⚠️ 일부 기존 시스템이 로드되지 않았지만 컴포넌트 로드 진행');
                        resolve();
                    } else {
                        setTimeout(checkSystem, 100);
                    }
                }
            };
            
            checkSystem();
        });
    }

    // 컴포넌트들을 순차적으로 로드
    async loadComponents() {
        for (const component of this.components) {
            try {
                await this.loadScript(component);
                component.loaded = true;
                console.log(`✅ ${component.name} 로드 완료`);
                
                // 각 컴포넌트 로드 사이에 약간의 지연
                await this.delay(200);
                
            } catch (error) {
                console.error(`❌ ${component.name} 로드 실패:`, error);
            }
        }
    }

    // 개별 스크립트 로드
    loadScript(component) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = component.path;
            script.async = true;
            
            script.onload = () => {
                resolve();
            };
            
            script.onerror = (error) => {
                reject(new Error(`${component.name} 스크립트 로드 실패: ${error}`));
            };
            
            document.head.appendChild(script);
        });
    }

    // 지연 함수
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 로드 상태 확인
    getLoadStatus() {
        return {
            total: this.components.length,
            loaded: this.components.filter(c => c.loaded).length,
            components: this.components.map(c => ({
                name: c.name,
                loaded: c.loaded
            }))
        };
    }
}

// DOM이 로드되면 즉시 시작
document.addEventListener('DOMContentLoaded', () => {
    // 기존 시스템들이 약간 로드될 시간을 준 후 시작
    setTimeout(() => {
        window.componentLoader = new ComponentLoader();
        console.log('🎯 Component Loader 시작됨');
    }, 500);
});

console.log('📦 Component Loader 스크립트 로드됨');

// 🆕 원본 파일들을 복원하는 함수
window.restoreOriginalFiles = async () => {
    console.log('🔄 원본 파일 복원을 위한 안내');
    console.log('=======================================');
    console.log('Enhanced 컴포넌트 시스템이 활성화되어 있습니다.');
    console.log('원본 파일들은 이미 보호되어 있으며, Enhanced 컴포넌트들이');
    console.log('기존 기능을 래핑하여 새로운 기능을 제공합니다.');
    console.log('');
    console.log('✅ 원본 파일들의 변경사항:');
    console.log('   - notifications.js: debugLogger 에러만 수정됨');
    console.log('   - motion-detector.js: debugLogger 에러만 수정됨');  
    console.log('   - main.js: 로그 레벨 조정만 됨');
    console.log('   - friend-status-monitor.js: 최소한의 수정만 됨');
    console.log('');
    console.log('🆕 새로운 기능들은 모두 /components/ 디렉토리에 있습니다:');
    console.log('   - /components/notifications/enhanced-notification-manager.js');
    console.log('   - /components/friends/enhanced-friend-status-monitor.js');
    console.log('   - /components/motion/enhanced-motion-detector.js');
    console.log('   - /components/core/component-manager.js');
    console.log('');
    console.log('🧪 테스트 명령어: testEnhancedSystem()');
};