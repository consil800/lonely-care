/**
 * Enhanced Motion Detector Component
 * 기존 motion-detector.js를 래핑하여 새로운 기능을 안전하게 추가하는 컴포넌트
 * 
 * 🔧 Level 4 컴포넌트: 자유롭게 수정 가능
 * 🛡️ 기존 Level 2 파일(motion-detector.js)을 건드리지 않음
 */

class EnhancedMotionDetector {
    constructor() {
        this.originalDetector = null;
        this.isInitialized = false;
        this.debugMode = true;
        
        console.log('🆕 Enhanced Motion Detector 초기화 시작');
        this.init();
    }

    async init() {
        try {
            // 원본 MotionDetector가 초기화될 때까지 대기
            await this.waitForOriginalDetector();
            
            console.log('✅ Enhanced Motion Detector 초기화 완료');
            this.isInitialized = true;
            
            // 기존 기능을 확장
            this.enhanceOriginalMethods();
            
        } catch (error) {
            console.error('❌ Enhanced Motion Detector 초기화 실패:', error);
        }
    }

    // 원본 Detector가 로드될 때까지 대기
    async waitForOriginalDetector() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5초 대기
            
            const checkDetector = () => {
                if (window.motionDetector && window.motionDetector.sendStatusToFriends) {
                    this.originalDetector = window.motionDetector;
                    console.log('🔗 원본 MotionDetector와 연결됨');
                    resolve();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(new Error('원본 MotionDetector 로드 타임아웃'));
                    } else {
                        setTimeout(checkDetector, 100);
                    }
                }
            };
            
            checkDetector();
        });
    }

    // 기존 메서드들을 확장
    enhanceOriginalMethods() {
        if (!this.originalDetector) return;

        // 원본 메서드 백업
        this.originalSendStatusToFriends = this.originalDetector.sendStatusToFriends.bind(this.originalDetector);
        
        // sendHeartbeat 메서드가 없다면 추가
        if (!this.originalDetector.sendHeartbeat) {
            this.originalDetector.sendHeartbeat = this.enhancedSendHeartbeat.bind(this);
            console.log('🆕 sendHeartbeat 메서드 추가됨');
        }

        // 기존 메서드 확장
        this.originalDetector.sendStatusToFriends = this.enhancedSendStatusToFriends.bind(this);
        
        console.log('🚀 원본 MotionDetector 메서드들이 확장됨');
    }

    // 🆕 확장된 상태 전송 (로깅 개선)
    async enhancedSendStatusToFriends() {
        try {
            if (this.debugMode) {
                console.log('📡 Enhanced: 모든 친구에게 상태 전송 시작');
            }

            // 원본 기능 실행
            await this.originalSendStatusToFriends();

            if (this.debugMode) {
                console.log('✅ Enhanced: 상태 전송 완료');
            }

            // 🆕 상태 전송 후 친구 상태 모니터에 새로고침 알림
            this.triggerStatusRefresh();

        } catch (error) {
            console.error('❌ Enhanced 상태 전송 실패:', error);
            throw error;
        }
    }

    // 🆕 즉시 하트비트 전송 (알림 확인 버튼용)
    async enhancedSendHeartbeat() {
        try {
            console.log('💗 Enhanced: 즉시 하트비트 전송 시작');
            
            const currentUser = auth?.getCurrentUser();
            if (!currentUser) {
                console.log('❌ 로그인된 사용자가 없어 하트비트 전송 불가');
                return;
            }

            // 🆕 모션 카운트를 강제로 증가시켜 정상 상태로 만들기
            if (this.originalDetector.motionCount !== undefined) {
                const originalCount = this.originalDetector.motionCount;
                this.originalDetector.motionCount = Math.max(1, this.originalDetector.motionCount);
                
                if (this.debugMode) {
                    console.log(`🔄 모션 카운트 조정: ${originalCount} → ${this.originalDetector.motionCount}`);
                }
            }

            // 움직임 기록 (있다면)
            if (this.originalDetector.recordMotion) {
                this.originalDetector.recordMotion();
            }

            // 모든 친구에게 즉시 상태 전송
            await this.enhancedSendStatusToFriends();
            
            console.log('✅ Enhanced: 즉시 하트비트 전송 완료');
            
            // 🆕 하트비트 전송 후 즉시 새로고침
            this.triggerImmediateRefresh();
            
        } catch (error) {
            console.error('❌ Enhanced 즉시 하트비트 전송 실패:', error);
        }
    }

    // 🆕 상태 새로고침 트리거
    triggerStatusRefresh() {
        // Enhanced Friend Status Monitor에 알림
        setTimeout(() => {
            if (window.enhancedFriendStatusMonitor?.refreshFriendStatus) {
                if (this.debugMode) {
                    console.log('🔄 Enhanced: Friend Status Monitor 새로고침 트리거');
                }
                window.enhancedFriendStatusMonitor.refreshFriendStatus();
            } else if (window.friendStatusMonitor?.loadFriendsStatus) {
                if (this.debugMode) {
                    console.log('🔄 기본: Friend Status Monitor 새로고침 트리거');
                }
                window.friendStatusMonitor.loadFriendsStatus();
            }
        }, 1000);
    }

    // 🆕 즉시 새로고침 트리거 (하트비트 후)
    triggerImmediateRefresh() {
        // Enhanced Friend Status Monitor에 즉시 새로고침 알림
        setTimeout(() => {
            if (window.enhancedFriendStatusMonitor?.triggerImmediateRefresh) {
                window.enhancedFriendStatusMonitor.triggerImmediateRefresh();
            } else if (window.friendStatusMonitor?.loadFriendsStatus) {
                window.friendStatusMonitor.loadFriendsStatus();
            }
        }, 2000); // 2초 후 새로고침 (서버 동기화 고려)
    }

    // 🆕 현재 움직임 상태 가져오기
    getCurrentMotionStatus() {
        if (!this.originalDetector) return null;

        return {
            motionCount: this.originalDetector.motionCount || 0,
            isActive: this.originalDetector.isActive || false,
            lastMotionTime: this.originalDetector.lastMotionTime || null,
            status: this.originalDetector.motionCount > 0 ? 'active' : 'inactive'
        };
    }

    // 🆕 수동 움직임 기록 (테스트용)
    recordManualMotion() {
        try {
            if (this.originalDetector.recordMotion) {
                this.originalDetector.recordMotion();
                console.log('✅ Enhanced: 수동 움직임 기록됨');
            }

            // 모션 카운트 증가
            if (this.originalDetector.motionCount !== undefined) {
                this.originalDetector.motionCount += 1;
                console.log(`📈 모션 카운트 증가: ${this.originalDetector.motionCount}`);
            }

        } catch (error) {
            console.error('❌ Enhanced 수동 움직임 기록 실패:', error);
        }
    }

    // 현재 상태 정보
    getStatus() {
        const motionStatus = this.getCurrentMotionStatus();
        
        return {
            initialized: this.isInitialized,
            hasOriginalDetector: !!this.originalDetector,
            motionStatus: motionStatus,
            debugMode: this.debugMode,
            component: 'EnhancedMotionDetector v1.0'
        };
    }
}

// 전역 인스턴스 생성 및 등록
let enhancedMotionDetector;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연 후 초기화 (기존 시스템이 먼저 로드되도록)
    setTimeout(() => {
        if (!enhancedMotionDetector) {
            enhancedMotionDetector = new EnhancedMotionDetector();
            window.enhancedMotionDetector = enhancedMotionDetector;
            
            console.log('🎉 Enhanced Motion Detector 전역 등록 완료');
        }
    }, 2000); // 기존 시스템들이 모두 로드된 후
});

// 테스트 함수들 등록
window.testEnhancedHeartbeat = () => {
    if (enhancedMotionDetector?.enhancedSendHeartbeat) {
        console.log('🧪 Enhanced 하트비트 테스트 시작');
        enhancedMotionDetector.enhancedSendHeartbeat();
    } else {
        console.error('Enhanced Motion Detector가 초기화되지 않았습니다');
    }
};

window.recordTestMotion = () => {
    if (enhancedMotionDetector) {
        enhancedMotionDetector.recordManualMotion();
    } else {
        console.error('Enhanced Motion Detector가 초기화되지 않았습니다');
    }
};

window.getMotionStatus = () => {
    if (enhancedMotionDetector) {
        const status = enhancedMotionDetector.getStatus();
        console.log('📊 Enhanced Motion Status:', status);
        return status;
    } else {
        console.error('Enhanced Motion Detector가 초기화되지 않았습니다');
        return null;
    }
};

console.log('📦 Enhanced Motion Detector 컴포넌트 로드됨');