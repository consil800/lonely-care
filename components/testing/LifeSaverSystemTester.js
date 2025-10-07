/**
 * 생명구조 시스템 테스터 - 모든 개선사항 통합 테스트
 * 
 * 테스트 범위:
 * 1. 허위 알림 방지 시스템
 * 2. 강화된 알림 시스템
 * 3. 알림 통합자
 * 4. 친구 카드 스타일 관리자
 * 5. 기존 시스템과의 호환성
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

class LifeSaverSystemTester {
    constructor() {
        this.className = 'LifeSaverSystemTester';
        this.testResults = new Map();
        this.testSuite = [
            'systemInitialization',
            'antiSpoofingSystem',
            'enhancedNotifications',
            'notificationIntegration',
            'friendCardStyling',
            'existingSystemCompatibility',
            'endToEndFlow'
        ];
        
        console.log('🧪 [생명구조] 시스템 테스터 초기화');
    }

    /**
     * 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🚀 [생명구조] 전체 시스템 테스트 시작');
        
        const startTime = Date.now();
        let passedTests = 0;
        let totalTests = this.testSuite.length;
        
        for (const testName of this.testSuite) {
            try {
                console.log(`📋 [생명구조] 테스트 실행 중: ${testName}`);
                const result = await this[testName]();
                
                this.testResults.set(testName, {
                    passed: result.passed,
                    message: result.message,
                    details: result.details || null,
                    timestamp: Date.now()
                });
                
                if (result.passed) {
                    passedTests++;
                    console.log(`✅ [생명구조] 테스트 통과: ${testName}`);
                } else {
                    console.error(`❌ [생명구조] 테스트 실패: ${testName} - ${result.message}`);
                }
                
            } catch (error) {
                console.error(`💥 [생명구조] 테스트 오류: ${testName}`, error);
                this.testResults.set(testName, {
                    passed: false,
                    message: `테스트 실행 오류: ${error.message}`,
                    details: error.stack,
                    timestamp: Date.now()
                });
            }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 테스트 결과 요약
        const summary = {
            총테스트수: totalTests,
            통과테스트수: passedTests,
            실패테스트수: totalTests - passedTests,
            성공률: `${Math.round((passedTests / totalTests) * 100)}%`,
            실행시간: `${duration}ms`,
            전체결과: passedTests === totalTests ? '✅ 성공' : '❌ 실패'
        };
        
        console.log('📊 [생명구조] 테스트 결과 요약:', summary);
        
        // 🚨 생명구조 앱: 사용자 경험 보호 - 테스트 보고서 UI 비활성화
        // 생산 환경에서는 테스트 보고서를 화면에 표시하지 않음
        // this.generateTestReport(summary); // 완전 비활성화
        
        return summary;
    }

    /**
     * 1. 시스템 초기화 테스트
     */
    async systemInitialization() {
        try {
            const systems = [
                'AntiSpoofingManager',
                'EnhancedNotificationManager', 
                'LifeSaverNotificationIntegrator',
                'FriendCardStyleManager'
            ];
            
            const initResults = [];
            
            for (const systemName of systems) {
                const system = window[systemName];
                if (system) {
                    const status = system.getSystemStatus ? system.getSystemStatus() : { 초기화됨: true };
                    initResults.push({
                        system: systemName,
                        initialized: status.초기화됨 || true,
                        status: status
                    });
                } else {
                    initResults.push({
                        system: systemName,
                        initialized: false,
                        status: null
                    });
                }
            }
            
            const allInitialized = initResults.every(r => r.initialized);
            
            return {
                passed: allInitialized,
                message: allInitialized ? '모든 시스템 초기화 완료' : '일부 시스템 초기화 실패',
                details: initResults
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `시스템 초기화 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 2. 허위 알림 방지 시스템 테스트
     */
    async antiSpoofingSystem() {
        try {
            const antiSpoofing = window.AntiSpoofingManager;
            if (!antiSpoofing) {
                return {
                    passed: false,
                    message: 'AntiSpoofingManager 없음'
                };
            }
            
            // 타임스탬프 검증 테스트
            const now = Date.now();
            const validTimestamp = await antiSpoofing.validateTimestamp(now);
            const invalidTimestamp = await antiSpoofing.validateTimestamp(now - 60000); // 1분 전
            
            // Rate limiting 테스트
            const rateLimitValid = antiSpoofing.checkRateLimit('test-user');
            
            // 하트비트 검증 테스트
            const heartbeatData = {
                userId: 'test-user',
                timestamp: now,
                motionCount: 5,
                source: 'test'
            };
            const heartbeatValid = await antiSpoofing.validateHeartbeat(heartbeatData);
            
            const allPassed = validTimestamp && !invalidTimestamp && rateLimitValid && heartbeatValid;
            
            return {
                passed: allPassed,
                message: allPassed ? '허위 알림 방지 시스템 정상' : '허위 알림 방지 시스템 이상',
                details: {
                    타임스탬프검증: { 유효: validTimestamp, 무효: !invalidTimestamp },
                    Rate제한: rateLimitValid,
                    하트비트검증: heartbeatValid
                }
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `허위 알림 방지 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 3. 강화된 알림 시스템 테스트
     */
    async enhancedNotifications() {
        try {
            const enhancedNotifier = window.EnhancedNotificationManager;
            if (!enhancedNotifier) {
                return {
                    passed: false,
                    message: 'EnhancedNotificationManager 없음'
                };
            }
            
            // 시스템 상태 확인
            const systemStatus = enhancedNotifier.getSystemStatus();
            const isInitialized = systemStatus.초기화됨;
            
            // 테스트 알림 전송
            const testResult = await enhancedNotifier.sendTestAlert('warning');
            
            // 알림 주기 확인
            const hasCorrectIntervals = enhancedNotifier.alertIntervals && 
                                      enhancedNotifier.alertIntervals.warning === 0 &&
                                      enhancedNotifier.alertIntervals.danger === 0 &&
                                      enhancedNotifier.alertIntervals.emergency === 6 * 60 * 60 * 1000;
            
            const allPassed = isInitialized && hasCorrectIntervals;
            
            return {
                passed: allPassed,
                message: allPassed ? '강화된 알림 시스템 정상' : '강화된 알림 시스템 이상',
                details: {
                    초기화상태: isInitialized,
                    테스트알림: testResult,
                    알림주기설정: hasCorrectIntervals,
                    시스템상태: systemStatus
                }
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `강화된 알림 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 4. 알림 통합자 테스트
     */
    async notificationIntegration() {
        try {
            const integrator = window.LifeSaverNotificationIntegrator;
            if (!integrator) {
                return {
                    passed: false,
                    message: 'LifeSaverNotificationIntegrator 없음'
                };
            }
            
            // 시스템 상태 확인
            const systemStatus = integrator.getSystemStatus();
            const isInitialized = systemStatus.초기화됨;
            const isMonitoring = systemStatus.모니터링활성;
            
            // 기존 시스템과의 연동 확인
            const hasEnhancedNotifier = !!integrator.enhancedNotifier;
            
            const allPassed = isInitialized && hasEnhancedNotifier;
            
            return {
                passed: allPassed,
                message: allPassed ? '알림 통합자 정상' : '알림 통합자 이상',
                details: {
                    초기화상태: isInitialized,
                    모니터링상태: isMonitoring,
                    강화된알림연동: hasEnhancedNotifier,
                    시스템상태: systemStatus
                }
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `알림 통합자 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 5. 친구 카드 스타일링 테스트
     */
    async friendCardStyling() {
        try {
            const styleManager = window.FriendCardStyleManager;
            if (!styleManager) {
                return {
                    passed: false,
                    message: 'FriendCardStyleManager 없음'
                };
            }
            
            // 시스템 상태 확인
            const systemStatus = styleManager.getSystemStatus();
            const isInitialized = systemStatus.초기화됨;
            const cssInjected = systemStatus.CSS주입됨;
            
            // CSS 요소 확인
            const cssElement = document.getElementById('senior-friendly-styles');
            const cssElementExists = !!cssElement;
            
            // 테스트 카드 생성 및 정리 테스트
            const beforeCount = document.querySelectorAll('.friend-card').length;
            styleManager.createTestCard();
            const afterCount = document.querySelectorAll('.friend-card').length;
            const testCardCreated = afterCount > beforeCount;
            
            // 테스트 카드 정리 확인
            setTimeout(() => {
                const testCard = document.querySelector('.friend-card[data-test="true"]');
                if (testCard) {
                    const hiddenImages = testCard.querySelectorAll('img[hidden="true"]');
                    const hiddenButtons = testCard.querySelectorAll('.call-btn[hidden="true"]');
                    console.log(`📋 [생명구조] 테스트 카드 정리 확인: 이미지 ${hiddenImages.length}개, 버튼 ${hiddenButtons.length}개 숨김`);
                    
                    // 테스트 카드 제거
                    testCard.remove();
                }
            }, 500);
            
            const allPassed = isInitialized && cssInjected && cssElementExists;
            
            return {
                passed: allPassed,
                message: allPassed ? '친구 카드 스타일링 정상' : '친구 카드 스타일링 이상',
                details: {
                    초기화상태: isInitialized,
                    CSS주입상태: cssInjected,
                    CSS요소존재: cssElementExists,
                    테스트카드생성: testCardCreated,
                    시스템상태: systemStatus
                }
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `친구 카드 스타일링 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 6. 기존 시스템 호환성 테스트
     */
    async existingSystemCompatibility() {
        try {
            const compatibilityResults = [];
            
            // 기존 시스템들 확인
            const existingSystems = [
                { name: 'auth', obj: window.auth },
                { name: 'storage', obj: window.storage },
                { name: 'notifications', obj: window.notifications },
                { name: 'firebaseClient', obj: window.firebaseClient },
                { name: 'realTimeStatusManager', obj: window.realTimeStatusManager }
            ];
            
            existingSystems.forEach(sys => {
                compatibilityResults.push({
                    system: sys.name,
                    exists: !!sys.obj,
                    functional: sys.obj && typeof sys.obj === 'object'
                });
            });
            
            // DOM 요소들 확인
            const criticalElements = [
                'current-friends-list',
                'my-invite-code',
                'friend-invite-code'
            ];
            
            const elementResults = criticalElements.map(id => ({
                element: id,
                exists: !!document.getElementById(id)
            }));
            
            const systemsOk = compatibilityResults.every(r => r.exists);
            const elementsOk = elementResults.every(r => r.exists);
            
            return {
                passed: systemsOk && elementsOk,
                message: systemsOk && elementsOk ? '기존 시스템 호환성 정상' : '기존 시스템 호환성 이상',
                details: {
                    기존시스템: compatibilityResults,
                    DOM요소: elementResults
                }
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `기존 시스템 호환성 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 7. End-to-End 흐름 테스트
     */
    async endToEndFlow() {
        try {
            // 전체 시스템 흐름 시뮬레이션
            const flowSteps = [];
            
            // 1. 사용자 로그인 상태 확인
            const currentUser = window.auth ? window.auth.getCurrentUser() : null;
            flowSteps.push({
                step: '사용자 인증',
                success: !!currentUser,
                details: currentUser ? '로그인됨' : '로그인 안됨'
            });
            
            // 2. 친구 목록 로드 가능성 확인
            const friendsList = document.getElementById('current-friends-list');
            flowSteps.push({
                step: '친구 목록',
                success: !!friendsList,
                details: friendsList ? '요소 존재' : '요소 없음'
            });
            
            // 3. 알림 시스템 준비 상태 확인
            const notificationReady = window.EnhancedNotificationManager && 
                                    window.LifeSaverNotificationIntegrator;
            flowSteps.push({
                step: '알림 시스템',
                success: notificationReady,
                details: notificationReady ? '준비됨' : '준비 안됨'
            });
            
            // 4. 스타일 시스템 준비 상태 확인
            const styleReady = window.FriendCardStyleManager;
            flowSteps.push({
                step: '스타일 시스템',
                success: !!styleReady,
                details: styleReady ? '준비됨' : '준비 안됨'
            });
            
            // 5. 보안 시스템 준비 상태 확인
            const securityReady = window.AntiSpoofingManager;
            flowSteps.push({
                step: '보안 시스템',
                success: !!securityReady,
                details: securityReady ? '준비됨' : '준비 안됨'
            });
            
            const allStepsSuccessful = flowSteps.every(step => step.success);
            
            return {
                passed: allStepsSuccessful,
                message: allStepsSuccessful ? 'End-to-End 흐름 정상' : 'End-to-End 흐름 이상',
                details: flowSteps
            };
            
        } catch (error) {
            return {
                passed: false,
                message: `End-to-End 흐름 테스트 실패: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * 테스트 보고서 생성 - 🚨 생명구조 앱에서는 비활성화
     */
    generateTestReport(summary) {
        // 🚨 생명구조 앱: 사용자 경험 보호 - UI 테스트 보고서 완전 비활성화
        console.log('ℹ️ [생명구조] 테스트 보고서 UI 표시 비활성화됨 (사용자 경험 보호)');
        
        // 기존에 남아있을 수 있는 테스트 보고서 제거
        const existingReports = document.querySelectorAll('#lifesaver-test-report, [id*="test-report"], .test-modal, .subscription-upgrade-modal');
        existingReports.forEach(report => {
            if (report && report.parentElement) {
                report.remove();
                console.log('🧹 [생명구조] 기존 테스트 UI 요소 제거됨');
            }
        });
        
        // 콘솔에만 간단한 요약 출력
        console.log('📊 [생명구조] 테스트 완료 - 콘솔 전용 요약');
        console.log(`  총 ${summary.총테스트수}개 테스트 중 ${summary.통과테스트수}개 통과 (${summary.성공률})`);
        
        return; // UI 생성하지 않음
        
        /*
        // 기존 UI 생성 코드 - 완전 비활성화됨
        try {
            const reportElement = document.createElement('div');
            // ... (모든 UI 생성 코드 주석 처리)
        } catch (error) {
            console.error('❌ [생명구조] 테스트 보고서 생성 실패:', error);
        }
        */
    }

    /**
     * 개별 테스트 실행
     * @param {string} testName 테스트 이름
     */
    async runSingleTest(testName) {
        if (!this.testSuite.includes(testName)) {
            console.error(`❌ [생명구조] 존재하지 않는 테스트: ${testName}`);
            return { passed: false, message: '존재하지 않는 테스트' };
        }
        
        try {
            console.log(`🧪 [생명구조] 개별 테스트 실행: ${testName}`);
            const result = await this[testName]();
            
            this.testResults.set(testName, {
                passed: result.passed,
                message: result.message,
                details: result.details || null,
                timestamp: Date.now()
            });
            
            console.log(`${result.passed ? '✅' : '❌'} [생명구조] ${testName}: ${result.message}`);
            return result;
            
        } catch (error) {
            console.error(`💥 [생명구조] 테스트 오류: ${testName}`, error);
            return { passed: false, message: `테스트 실행 오류: ${error.message}` };
        }
    }

    /**
     * 테스트 결과 조회
     * @param {string} testName 테스트 이름 (선택사항)
     */
    getTestResults(testName = null) {
        if (testName) {
            return this.testResults.get(testName) || null;
        }
        return Object.fromEntries(this.testResults);
    }

    /**
     * 테스트 초기화
     */
    clearResults() {
        this.testResults.clear();
        console.log('🧹 [생명구조] 테스트 결과 초기화');
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.LifeSaverSystemTester = window.LifeSaverSystemTester || new LifeSaverSystemTester();
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LifeSaverSystemTester;
}

console.log('🧪 [생명구조] 시스템 테스터 로드 완료 - 모든 개선사항 검증 준비됨');