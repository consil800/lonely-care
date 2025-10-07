/**
 * 🚨 생명구조 앱 생산 환경 정리 스크립트
 * 
 * 목적: 사용자 경험을 방해하는 테스트 UI 요소들을 완전히 제거
 * 실행: 페이지 로드 시 자동 실행
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-01
 */

(function() {
    'use strict';
    
    console.log('🧹 [생명구조] 생산 환경 정리 스크립트 시작');
    
    /**
     * 테스트 UI 요소들을 완전히 제거
     */
    function removeTestUIElements() {
        try {
            // 제거할 요소들의 선택자
            const testSelectors = [
                '#lifesaver-test-report',
                '[id*="test-report"]',
                '.test-modal',
                '.subscription-upgrade-modal',
                '.payment-modal',
                '[class*="test-"]',
                '[data-test="true"]'
            ];
            
            let removedCount = 0;
            
            testSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        if (element && element.parentElement) {
                            element.remove();
                            removedCount++;
                            console.log(`🗑️ [생명구조] 테스트 UI 요소 제거: ${selector}`);
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ [생명구조] 요소 제거 중 경고:', selector, error);
                }
            });
            
            if (removedCount > 0) {
                console.log(`✅ [생명구조] 총 ${removedCount}개 테스트 UI 요소 제거 완료`);
            }
            // 제거할 요소가 없을 때는 조용히 처리 (로그 스팸 방지)
            
            return removedCount;
            
        } catch (error) {
            console.error('❌ [생명구조] 테스트 UI 제거 실패:', error);
            return 0;
        }
    }
    
    /**
     * 구독 관련 UI 요소 제거
     */
    function removeSubscriptionUI() {
        try {
            const subscriptionSelectors = [
                '#subscription-status',
                '.subscription-status',
                '.plan-badge',
                '.friends-limit',
                '.upgrade-hint',
                '.subscription-upgrade-modal'
            ];
            
            let removedCount = 0;
            
            subscriptionSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        if (element && element.parentElement) {
                            element.remove();
                            removedCount++;
                            console.log(`🗑️ [생명구조] 구독 UI 요소 제거: ${selector}`);
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ [생명구조] 구독 요소 제거 중 경고:', selector, error);
                }
            });
            
            if (removedCount > 0) {
                console.log(`✅ [생명구조] 총 ${removedCount}개 구독 UI 요소 제거 완료`);
            }
            
            return removedCount;
            
        } catch (error) {
            console.error('❌ [생명구조] 구독 UI 제거 실패:', error);
            return 0;
        }
    }
    
    /**
     * 주기적 정리 함수 (조용한 모드)
     */
    function periodicCleanup() {
        const testRemoved = removeTestUIElements();
        const subscriptionRemoved = removeSubscriptionUI();
        
        // 실제로 제거된 요소가 있을 때만 로그 출력
        if (testRemoved > 0 || subscriptionRemoved > 0) {
            console.log(`🧹 [생명구조] 주기적 정리 완료 (${testRemoved + subscriptionRemoved}개 요소 정리)`);
        }
        // 제거할 요소가 없으면 조용히 통과
    }
    
    /**
     * DOM 변화 감시
     */
    function setupCleanupObserver() {
        try {
            const observer = new MutationObserver((mutations) => {
                let needsCleanup = false;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // 테스트 관련 요소가 추가되었는지 확인
                                if (node.id && (
                                    node.id.includes('test-report') ||
                                    node.id.includes('lifesaver-test') ||
                                    node.id.includes('subscription-status')
                                )) {
                                    needsCleanup = true;
                                }
                                
                                // 클래스명으로도 확인
                                if (node.className && (
                                    node.className.includes('test-modal') ||
                                    node.className.includes('subscription-upgrade') ||
                                    node.className.includes('payment-modal')
                                )) {
                                    needsCleanup = true;
                                }
                            }
                        });
                    }
                });
                
                if (needsCleanup) {
                    setTimeout(periodicCleanup, 100);
                }
            });
            
            // 전체 문서 감시
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            console.log('👁️ [생명구조] DOM 변화 감시 시작 (테스트 UI 방지)');
            
        } catch (error) {
            console.error('❌ [생명구조] DOM 감시 설정 실패:', error);
        }
    }
    
    /**
     * 초기 정리 실행
     */
    function initialize() {
        console.log('🚀 [생명구조] 생산 환경 정리 초기화');
        
        // 즉시 한 번 정리
        setTimeout(periodicCleanup, 500);
        
        // DOM 감시 시작
        setTimeout(setupCleanupObserver, 1000);
        
        // 주기적 정리 (5초마다)
        setInterval(periodicCleanup, 5000);
        
        console.log('✅ [생명구조] 생산 환경 정리 시스템 활성화');
    }
    
    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // 전역 정리 함수 노출 (필요 시 수동 실행)
    window.cleanupTestUI = periodicCleanup;
    
    console.log('✅ [생명구조] 생산 환경 정리 스크립트 로드 완료');
    
})();