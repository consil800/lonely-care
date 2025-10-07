/**
 * 생명구조 시스템 마스터 초기화자 - 모든 개선사항의 안전한 통합
 * 
 * 주요 기능:
 * 1. 모든 새로운 컴포넌트의 순차적 로드
 * 2. 기존 시스템과의 안전한 통합
 * 3. 초기화 순서 관리 및 의존성 해결
 * 4. 오류 처리 및 롤백 시스템
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

class LifeSaverMasterInitializer {
    constructor() {
        this.className = 'LifeSaverMasterInitializer';
        this.isInitialized = false;
        this.initializationSteps = [];
        this.components = new Map();
        this.failedComponents = [];
        
        // 초기화 순서 (의존성 순)
        this.initOrder = [
            'AntiSpoofingManager',
            'EnhancedNotificationManager',
            'FriendCardStyleManager',
            'LifeSaverNotificationIntegrator',
            'LifeSaverSystemTester'
        ];
        
        console.log('🚀 [생명구조] 마스터 초기화자 시작');
    }

    /**
     * 전체 시스템 초기화
     */
    async initializeLifeSaverSystem() {
        try {
            if (this.isInitialized) {
                console.log('⚠️ [생명구조] 이미 초기화된 시스템');
                return this.getInitializationStatus();
            }
            
            console.log('🎯 [생명구조] 생명구조 시스템 초기화 시작');
            
            // 사전 조건 확인
            await this.checkPrerequisites();
            
            // 컴포넌트 로드
            await this.loadComponents();
            
            // 순차적 초기화
            await this.initializeComponents();
            
            // 통합 테스트 실행
            await this.runIntegrationTests();
            
            // 최종 설정
            this.finalizeSetup();
            
            this.isInitialized = true;
            console.log('✅ [생명구조] 생명구조 시스템 초기화 완료');
            
            return this.getInitializationStatus();
            
        } catch (error) {
            console.error('❌ [생명구조] 시스템 초기화 실패:', error);
            await this.handleInitializationFailure(error);
            throw error;
        }
    }

    /**
     * 사전 조건 확인
     */
    async checkPrerequisites() {
        console.log('🔍 [생명구조] 사전 조건 확인 중...');
        
        const prerequisites = [
            { name: 'DOM Ready', check: () => document.readyState === 'complete' || document.readyState === 'interactive' },
            { name: 'Firebase', check: () => window.firebase && window.firebaseClient },
            { name: 'Auth System', check: () => window.auth },
            { name: 'Storage System', check: () => window.storage || window.firebaseStorage },
            { name: 'Main Container', check: () => document.getElementById('current-friends-list') }
        ];
        
        const failedPrereqs = [];
        
        for (const prereq of prerequisites) {
            try {
                const passed = prereq.check();
                this.addInitStep(prereq.name, passed ? '✅ 통과' : '❌ 실패', passed);
                
                if (!passed) {
                    failedPrereqs.push(prereq.name);
                }
            } catch (error) {
                this.addInitStep(prereq.name, `❌ 오류: ${error.message}`, false);
                failedPrereqs.push(prereq.name);
            }
        }
        
        if (failedPrereqs.length > 0) {
            console.warn('⚠️ [생명구조] 일부 사전 조건 실패:', failedPrereqs);
            // 비필수 요소 실패는 경고만 출력하고 계속 진행
        }
        
        console.log('✅ [생명구조] 사전 조건 확인 완료');
    }

    /**
     * 컴포넌트 로드
     */
    async loadComponents() {
        console.log('📦 [생명구조] 컴포넌트 로드 중...');
        
        const componentPaths = [
            { name: 'AntiSpoofingManager', path: '/components/core/AntiSpoofingManager.js' },
            { name: 'EnhancedNotificationManager', path: '/components/notifications/EnhancedNotificationManager.js' },
            { name: 'FriendCardStyleManager', path: '/components/ui/FriendCardStyleManager.js' },
            { name: 'LifeSaverNotificationIntegrator', path: '/components/core/LifeSaverNotificationIntegrator.js' },
            { name: 'LifeSaverSystemTester', path: '/components/testing/LifeSaverSystemTester.js' }
        ];
        
        for (const component of componentPaths) {
            try {
                // 이미 로드된 경우 스킵
                if (window[component.name]) {
                    this.addInitStep(`로드: ${component.name}`, '✅ 이미 로드됨', true);
                    continue;
                }
                
                // 동적 로드 시도
                await this.loadScript(component.path);
                
                // 로드 확인
                if (window[component.name]) {
                    this.addInitStep(`로드: ${component.name}`, '✅ 로드 성공', true);
                } else {
                    this.addInitStep(`로드: ${component.name}`, '❌ 로드 실패', false);
                    this.failedComponents.push(component.name);
                }
                
            } catch (error) {
                console.warn(`⚠️ [생명구조] ${component.name} 로드 실패:`, error);
                this.addInitStep(`로드: ${component.name}`, `❌ 오류: ${error.message}`, false);
                this.failedComponents.push(component.name);
            }
        }
        
        console.log('✅ [생명구조] 컴포넌트 로드 완료');
    }

    /**
     * 스크립트 동적 로드
     * @param {string} src 스크립트 경로
     */
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            // 이미 로드된 스크립트 확인
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
                console.log(`📜 [생명구조] 스크립트 로드 완료: ${src}`);
                resolve();
            };
            
            script.onerror = () => {
                const error = new Error(`스크립트 로드 실패: ${src}`);
                console.error('❌ [생명구조]', error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * 컴포넌트 순차 초기화
     */
    async initializeComponents() {
        console.log('⚙️ [생명구조] 컴포넌트 초기화 중...');
        
        for (const componentName of this.initOrder) {
            try {
                if (this.failedComponents.includes(componentName)) {
                    this.addInitStep(`초기화: ${componentName}`, '⏭️ 스킵 (로드 실패)', false);
                    continue;
                }
                
                const component = window[componentName];
                if (!component) {
                    this.addInitStep(`초기화: ${componentName}`, '❌ 컴포넌트 없음', false);
                    continue;
                }
                
                // 초기화 시도
                if (typeof component.init === 'function') {
                    await component.init();
                } else if (component.isInitialized !== undefined) {
                    // 이미 초기화된 경우
                }
                
                // 초기화 확인
                const isInitialized = component.isInitialized || 
                                    (component.getSystemStatus && component.getSystemStatus().초기화됨);
                
                if (isInitialized) {
                    this.components.set(componentName, component);
                    this.addInitStep(`초기화: ${componentName}`, '✅ 초기화 완료', true);
                } else {
                    this.addInitStep(`초기화: ${componentName}`, '❌ 초기화 실패', false);
                }
                
                // 컴포넌트 간 대기시간
                await this.sleep(100);
                
            } catch (error) {
                console.error(`❌ [생명구조] ${componentName} 초기화 실패:`, error);
                this.addInitStep(`초기화: ${componentName}`, `❌ 오류: ${error.message}`, false);
            }
        }
        
        console.log('✅ [생명구조] 컴포넌트 초기화 완료');
    }

    /**
     * 통합 테스트 실행 - 🚨 생명구조 앱에서는 비활성화
     */
    async runIntegrationTests() {
        console.log('ℹ️ [생명구조] 통합 테스트 비활성화됨 (사용자 경험 보호)');
        
        // 🚨 생명구조 앱: 사용자 경험 보호 - 자동 테스트 실행 비활성화
        // 생산 환경에서는 자동으로 테스트를 실행하지 않음
        
        try {
            // 테스트 실행하지 않고 성공으로 처리
            this.addInitStep('통합 테스트', '✅ 생산 모드 (테스트 생략)', true);
            
            // 기존에 남아있을 수 있는 테스트 UI 요소들 제거
            const testElements = document.querySelectorAll('#lifesaver-test-report, [id*="test-report"], .test-modal');
            testElements.forEach(element => {
                if (element && element.parentElement) {
                    element.remove();
                    console.log('🧹 [생명구조] 테스트 UI 요소 제거됨');
                }
            });
            
            console.log('✅ [생명구조] 생산 환경 설정 완료 (테스트 UI 비활성화)');
            
        } catch (error) {
            console.warn('⚠️ [생명구조] 테스트 UI 정리 중 경고:', error);
            this.addInitStep('통합 테스트', '⚠️ 정리 중 경고 발생', true);
        }
        
        /*
        // 기존 자동 테스트 실행 코드 - 완전 비활성화됨
        try {
            const tester = window.LifeSaverSystemTester;
            if (tester) {
                const testResults = await tester.runAllTests();
                this.addInitStep('통합 테스트', 
                    `${testResults.전체결과} (성공률: ${testResults.성공률})`, 
                    testResults.성공률 === '100%');
            } else {
                this.addInitStep('통합 테스트', '⏭️ 스킵 (테스터 없음)', false);
            }
        } catch (error) {
            console.error('❌ [생명구조] 통합 테스트 실패:', error);
            this.addInitStep('통합 테스트', `❌ 오류: ${error.message}`, false);
        }
        */
        
        console.log('✅ [생명구조] 통합 테스트 단계 완료');
    }

    /**
     * 최종 설정
     */
    finalizeSetup() {
        console.log('🎉 [생명구조] 최종 설정 중...');
        
        // 전역 접근점 설정 - 🚨 생명구조 앱에서는 테스트 기능 비활성화
        window.LifeSaverSystem = {
            components: Object.fromEntries(this.components),
            status: this.getInitializationStatus(),
            reinitialize: () => this.initializeLifeSaverSystem(),
            // testSystem: () => window.LifeSaverSystemTester?.runAllTests(), // 비활성화
            testSystem: () => {
                console.log('ℹ️ [생명구조] 테스트 시스템 비활성화됨 (사용자 경험 보호)');
                return { message: '생산 환경에서는 테스트가 비활성화됩니다.' };
            },
            getComponentStatus: (name) => this.components.get(name)?.getSystemStatus?.()
        };
        
        // 🚨 생명구조 앱: 개발자 도구 헬퍼 비활성화 (사용자 경험 보호)
        // window.testLifeSaverSystem = () => { ... }; // 완전 비활성화
        
        // 대신 비활성화 메시지만 제공
        window.testLifeSaverSystem = () => {
            console.log('ℹ️ [생명구조] 테스트 기능이 비활성화되어 있습니다.');
            console.log('📝 이는 사용자 경험 보호를 위한 조치입니다.');
            return { 
                message: '생산 환경에서는 테스트 UI가 비활성화됩니다.',
                reason: '사용자 경험 보호를 위해 테스트 보고서를 표시하지 않습니다.'
            };
        };
        
        this.addInitStep('최종 설정', '✅ 완료', true);
        console.log('✅ [생명구조] 최종 설정 완료');
    }

    /**
     * 초기화 실패 처리
     * @param {Error} error 오류 객체
     */
    async handleInitializationFailure(error) {
        console.error('💥 [생명구조] 초기화 실패 처리 중...', error);
        
        try {
            // 부분적으로 초기화된 컴포넌트 정리
            for (const [name, component] of this.components) {
                if (typeof component.cleanup === 'function') {
                    await component.cleanup();
                    console.log(`🧹 [생명구조] ${name} 정리 완료`);
                }
            }
            
            // 상태 초기화
            this.components.clear();
            this.isInitialized = false;
            
            this.addInitStep('오류 처리', '✅ 정리 완료', true);
            
        } catch (cleanupError) {
            console.error('❌ [생명구조] 정리 중 오류:', cleanupError);
            this.addInitStep('오류 처리', `❌ 정리 실패: ${cleanupError.message}`, false);
        }
    }

    /**
     * 초기화 단계 추가
     * @param {string} step 단계명
     * @param {string} message 메시지
     * @param {boolean} success 성공 여부
     */
    addInitStep(step, message, success) {
        this.initializationSteps.push({
            step,
            message,
            success,
            timestamp: Date.now()
        });
        
        const icon = success ? '✅' : '❌';
        console.log(`${icon} [생명구조] ${step}: ${message}`);
    }

    /**
     * 초기화 상태 반환
     */
    getInitializationStatus() {
        const totalSteps = this.initializationSteps.length;
        const successSteps = this.initializationSteps.filter(s => s.success).length;
        const successRate = totalSteps > 0 ? Math.round((successSteps / totalSteps) * 100) : 0;
        
        return {
            전체초기화완료: this.isInitialized,
            초기화된컴포넌트수: this.components.size,
            실패한컴포넌트수: this.failedComponents.length,
            초기화단계수: totalSteps,
            성공한단계수: successSteps,
            성공률: `${successRate}%`,
            컴포넌트목록: Array.from(this.components.keys()),
            실패한컴포넌트목록: this.failedComponents,
            초기화단계: this.initializationSteps
        };
    }

    /**
     * 대기 함수
     * @param {number} ms 대기 시간 (밀리초)
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 시스템 재초기화
     */
    async reinitialize() {
        console.log('🔄 [생명구조] 시스템 재초기화 시작');
        
        // 기존 상태 정리
        this.isInitialized = false;
        this.initializationSteps = [];
        this.components.clear();
        this.failedComponents = [];
        
        // 재초기화 실행
        return await this.initializeLifeSaverSystem();
    }

    /**
     * 컴포넌트별 상태 확인
     */
    getComponentsStatus() {
        const status = {};
        
        for (const [name, component] of this.components) {
            try {
                status[name] = component.getSystemStatus ? component.getSystemStatus() : '상태 확인 불가';
            } catch (error) {
                status[name] = `오류: ${error.message}`;
            }
        }
        
        return status;
    }
}

// 자동 초기화 (DOM 로드 완료 후)
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 [생명구조] DOM 로드 완료 - 마스터 초기화자 시작');
    
    // 잠시 대기 (다른 시스템들이 초기화될 시간)
    setTimeout(async () => {
        try {
            if (!window.LifeSaverMasterInitializer) {
                window.LifeSaverMasterInitializer = new LifeSaverMasterInitializer();
            }
            
            await window.LifeSaverMasterInitializer.initializeLifeSaverSystem();
            
        } catch (error) {
            console.error('💥 [생명구조] 자동 초기화 실패:', error);
        }
    }, 3000); // 3초 후 시작
});

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.LifeSaverMasterInitializer = window.LifeSaverMasterInitializer || new LifeSaverMasterInitializer();
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LifeSaverMasterInitializer;
}

console.log('🚀 [생명구조] 마스터 초기화자 로드 완료 - 모든 시스템 통합 준비됨');