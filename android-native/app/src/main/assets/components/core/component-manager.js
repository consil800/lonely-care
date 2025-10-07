/**
 * Component Manager - Enhanced 컴포넌트들의 통합 관리자
 * 모든 Enhanced 컴포넌트들을 로드하고 초기화를 관리하는 핵심 컴포넌트
 * 
 * 🔧 Level 4 컴포넌트: 자유롭게 수정 가능
 * 🛡️ 기존 시스템을 건드리지 않음
 */

class ComponentManager {
    constructor() {
        this.components = {
            notification: null,
            friendStatus: null,
            motion: null
        };
        this.isInitialized = false;
        this.loadedComponents = [];
        
        console.log('🎯 Component Manager 초기화 시작');
        this.init();
    }

    async init() {
        try {
            console.log('📦 Enhanced 컴포넌트들 로드 시작...');
            
            // 컴포넌트들의 초기화를 모니터링
            this.startComponentMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Component Manager 초기화 완료');
            
        } catch (error) {
            console.error('❌ Component Manager 초기화 실패:', error);
        }
    }

    // 컴포넌트들의 초기화 상태 모니터링
    startComponentMonitoring() {
        const checkInterval = setInterval(() => {
            this.checkComponentStatus();
            
            // 모든 컴포넌트가 초기화되면 모니터링 중단
            if (this.areAllComponentsReady()) {
                clearInterval(checkInterval);
                this.onAllComponentsReady();
            }
        }, 500);

        // 최대 15초 후 타임아웃
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.areAllComponentsReady()) {
                console.warn('⚠️ 일부 Enhanced 컴포넌트 초기화 타임아웃');
            }
        }, 15000);
    }

    // 컴포넌트 상태 확인
    checkComponentStatus() {
        // Enhanced Notification Manager 확인
        if (!this.components.notification && window.enhancedNotificationManager?.isInitialized) {
            this.components.notification = window.enhancedNotificationManager;
            this.loadedComponents.push('NotificationManager');
            console.log('✅ Enhanced Notification Manager 연결됨');
        }

        // Enhanced Friend Status Monitor 확인
        if (!this.components.friendStatus && window.enhancedFriendStatusMonitor?.isInitialized) {
            this.components.friendStatus = window.enhancedFriendStatusMonitor;
            this.loadedComponents.push('FriendStatusMonitor');
            console.log('✅ Enhanced Friend Status Monitor 연결됨');
        }

        // Enhanced Motion Detector 확인
        if (!this.components.motion && window.enhancedMotionDetector?.isInitialized) {
            this.components.motion = window.enhancedMotionDetector;
            this.loadedComponents.push('MotionDetector');
            console.log('✅ Enhanced Motion Detector 연결됨');
        }
    }

    // 모든 컴포넌트가 준비되었는지 확인
    areAllComponentsReady() {
        return this.components.notification?.isInitialized &&
               this.components.friendStatus?.isInitialized &&
               this.components.motion?.isInitialized;
    }

    // 모든 컴포넌트가 준비된 후 실행
    onAllComponentsReady() {
        console.log('🎉 모든 Enhanced 컴포넌트 초기화 완료!');
        console.log('📋 로드된 컴포넌트들:', this.loadedComponents);
        
        // 🆕 컴포넌트 간 연동 설정
        this.setupComponentIntegration();
        
        // 🆕 전역 테스트 함수들 등록
        this.registerGlobalTestFunctions();
        
        // 사용자에게 알림
        this.showReadyNotification();
    }

    // 컴포넌트 간 연동 설정
    setupComponentIntegration() {
        console.log('🔗 Enhanced 컴포넌트 간 연동 설정...');
        
        // Motion Detector의 하트비트 전송이 Friend Status Monitor에 영향을 주도록 설정
        // (이미 각 컴포넌트에서 구현됨)
        
        console.log('✅ 컴포넌트 간 연동 설정 완료');
    }

    // 전역 테스트 함수들 등록
    registerGlobalTestFunctions() {
        // 🧪 통합 테스트 함수
        window.testEnhancedSystem = async () => {
            console.log('🧪 Enhanced 시스템 통합 테스트 시작');
            console.log('=======================================');
            
            // 1. 컴포넌트 상태 확인
            console.log('1. 컴포넌트 상태:');
            const status = this.getSystemStatus();
            console.log(status);
            
            // 2. 테스트 알림 발송
            console.log('\n2. 테스트 알림 발송:');
            if (this.components.notification) {
                await this.components.notification.sendTestNotification('warning');
            }
            
            // 3. 친구 카드 테스트
            console.log('\n3. 친구 카드 테스트:');
            if (window.testEnhancedFriendCard) {
                window.testEnhancedFriendCard();
            }
            
            // 4. 모션 테스트
            console.log('\n4. 모션 시스템 테스트:');
            if (window.recordTestMotion) {
                window.recordTestMotion();
            }
            
            console.log('\n✅ Enhanced 시스템 통합 테스트 완료');
        };

        // 🆕 전체 시스템 상태 확인
        window.getEnhancedSystemStatus = () => {
            return this.getSystemStatus();
        };

        // 🆕 하트비트 즉시 전송 (Enhanced 버전)
        window.sendEnhancedHeartbeat = () => {
            if (this.components.motion?.enhancedSendHeartbeat) {
                this.components.motion.enhancedSendHeartbeat();
            } else {
                console.error('Enhanced Motion Detector가 준비되지 않았습니다');
            }
        };

        console.log('🎮 Enhanced 시스템 테스트 함수들 등록 완료');
        console.log('   - testEnhancedSystem(): 통합 시스템 테스트');
        console.log('   - getEnhancedSystemStatus(): 시스템 상태 확인');
        console.log('   - sendEnhancedHeartbeat(): Enhanced 하트비트 전송');
    }

    // 시스템 상태 정보
    getSystemStatus() {
        return {
            componentManager: {
                initialized: this.isInitialized,
                loadedComponents: this.loadedComponents,
                allReady: this.areAllComponentsReady()
            },
            notification: this.components.notification?.getStatus() || null,
            friendStatus: this.components.friendStatus?.getStatus() || null,
            motion: this.components.motion?.getStatus() || null,
            timestamp: new Date().toISOString()
        };
    }

    // 준비 완료 알림
    showReadyNotification() {
        // 개발 환경에서만 표시
        if (window.auth?.showNotification) {
            setTimeout(() => {
                window.auth.showNotification(
                    '🎉 Enhanced 시스템 준비완료! testEnhancedSystem() 으로 테스트 가능', 
                    'success'
                );
            }, 1000);
        }
    }

    // 특정 컴포넌트 재시작
    async restartComponent(componentName) {
        console.log(`🔄 ${componentName} 컴포넌트 재시작 시도...`);
        
        try {
            switch (componentName) {
                case 'notification':
                    if (window.enhancedNotificationManager) {
                        await window.enhancedNotificationManager.init();
                    }
                    break;
                case 'friendStatus':
                    if (window.enhancedFriendStatusMonitor) {
                        await window.enhancedFriendStatusMonitor.init();
                    }
                    break;
                case 'motion':
                    if (window.enhancedMotionDetector) {
                        await window.enhancedMotionDetector.init();
                    }
                    break;
                default:
                    console.error('알 수 없는 컴포넌트:', componentName);
                    return false;
            }
            
            console.log(`✅ ${componentName} 컴포넌트 재시작 완료`);
            return true;
            
        } catch (error) {
            console.error(`❌ ${componentName} 컴포넌트 재시작 실패:`, error);
            return false;
        }
    }
}

// 전역 인스턴스 생성 및 등록
let componentManager;

// DOM 로드 후 초기화 (가장 나중에)
document.addEventListener('DOMContentLoaded', () => {
    // 다른 컴포넌트들이 먼저 로드되도록 충분한 지연
    setTimeout(() => {
        if (!componentManager) {
            componentManager = new ComponentManager();
            window.componentManager = componentManager;
            
            console.log('🎯 Component Manager 전역 등록 완료');
        }
    }, 3000); // 3초 지연
});

console.log('📦 Component Manager 로드됨');