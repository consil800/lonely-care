/**
 * 🛠️ 결제 시스템 수정 및 초기화 파일
 * 프로필 설정 섹션의 결제 관련 기능 문제 해결
 * 
 * 생명구조 앱용 결제 시스템 안정화
 */

class PaymentFixInitializer {
    constructor() {
        this.isInitialized = false;
        this.fixApplied = false;
        
        console.log('🛠️ [생명구조] 결제 시스템 수정 초기화기 생성');
    }
    
    /**
     * 결제 시스템 문제 수정 적용
     */
    async applyPaymentFixes() {
        try {
            if (this.fixApplied) {
                console.log('✅ [생명구조] 결제 시스템 수정이 이미 적용됨');
                return true;
            }
            
            console.log('🔧 [생명구조] 결제 시스템 문제 수정 시작...');
            
            // 1. 크로스 플랫폼 결제 시스템 초기화 대기
            await this.waitForCrossPlatformPayment();
            
            // 2. 구독 매니저 초기화 대기
            await this.waitForSubscriptionManager();
            
            // 3. 프로필 컴포넌트 활성화
            await this.activateProfileComponent();
            
            // 4. 결제 관련 이벤트 리스너 설정
            this.setupPaymentEventListeners();
            
            // 5. UI 요소 활성화
            this.activatePaymentUI();
            
            this.fixApplied = true;
            this.isInitialized = true;
            
            console.log('✅ [생명구조] 결제 시스템 문제 수정 완료');
            return true;
            
        } catch (error) {
            console.error('❌ [생명구조] 결제 시스템 수정 실패:', error);
            return false;
        }
    }
    
    /**
     * 크로스 플랫폼 결제 시스템 초기화 대기
     */
    async waitForCrossPlatformPayment() {
        console.log('⏳ [생명구조] 크로스 플랫폼 결제 시스템 대기 중...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30; // 3초 (100ms * 30)
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                if (window.crossPlatformPayment) {
                    clearInterval(checkInterval);
                    
                    // 초기화가 안 되어 있다면 강제 초기화
                    if (!window.crossPlatformPayment.isInitialized) {
                        console.log('🔄 [생명구조] 크로스 플랫폼 결제 시스템 강제 초기화');
                        window.crossPlatformPayment.init().then(() => {
                            console.log('✅ [생명구조] 크로스 플랫폼 결제 시스템 초기화 완료');
                            resolve();
                        }).catch(error => {
                            console.warn('⚠️ [생명구조] 크로스 플랫폼 결제 시스템 초기화 실패, 계속 진행:', error);
                            resolve();
                        });
                    } else {
                        console.log('✅ [생명구조] 크로스 플랫폼 결제 시스템 이미 초기화됨');
                        resolve();
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ [생명구조] 크로스 플랫폼 결제 시스템 대기 타임아웃 (3초 경과)');
                    console.log('💡 [생명구조] 결제 시스템이 로드되지 않았지만 계속 진행합니다');
                    resolve();
                }
            }, 100);
        });
    }
    
    /**
     * 구독 매니저 초기화 대기
     */
    async waitForSubscriptionManager() {
        console.log('⏳ [생명구조] 구독 매니저 대기 중...');
        
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.subscriptionManager) {
                    clearInterval(checkInterval);
                    console.log('✅ [생명구조] 구독 매니저 발견');
                    resolve();
                }
            }, 100);
            
            // 5초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ [생명구조] 구독 매니저 대기 타임아웃');
                resolve();
            }, 5000);
        });
    }
    
    /**
     * 프로필 컴포넌트 활성화
     */
    async activateProfileComponent() {
        console.log('🎯 [생명구조] 프로필 컴포넌트 활성화 시도...');
        
        try {
            // ProfileComponent가 있는지 확인
            if (typeof ProfileComponent !== 'undefined') {
                // 전역 인스턴스가 없다면 생성
                if (!window.profileComponent) {
                    window.profileComponent = new ProfileComponent({ autoInit: true });
                    console.log('✅ [생명구조] 프로필 컴포넌트 인스턴스 생성');
                }
                
                // 초기화가 안 되어 있다면 초기화
                if (!window.profileComponent.isInitialized) {
                    const initResult = await window.profileComponent.init();
                    if (initResult) {
                        console.log('✅ [생명구조] 프로필 컴포넌트 초기화 완료');
                    } else {
                        console.warn('⚠️ [생명구조] 프로필 컴포넌트 초기화 실패');
                    }
                }
            } else {
                console.warn('⚠️ [생명구조] ProfileComponent 클래스를 찾을 수 없음');
            }
        } catch (error) {
            console.error('❌ [생명구조] 프로필 컴포넌트 활성화 실패:', error);
        }
    }
    
    /**
     * 결제 관련 이벤트 리스너 설정
     */
    setupPaymentEventListeners() {
        console.log('🎧 [생명구조] 결제 관련 이벤트 리스너 설정...');
        
        // 구독 관리 버튼 이벤트
        this.setupSubscriptionButtons();
        
        // 플랜 업그레이드 버튼 이벤트
        this.setupUpgradeButtons();
        
        // 결제 관련 설정 메뉴 이벤트
        this.setupPaymentSettings();
        
        console.log('✅ [생명구조] 결제 관련 이벤트 리스너 설정 완료');
    }
    
    /**
     * 구독 관리 버튼 이벤트 설정
     */
    setupSubscriptionButtons() {
        // 베이직 플랜 업그레이드 버튼
        const basicBtn = document.getElementById('basic-upgrade-btn');
        if (basicBtn) {
            basicBtn.addEventListener('click', async () => {
                if (window.subscriptionManager) {
                    await window.subscriptionManager.startUpgrade('BASIC');
                }
            });
        }
        
        // 프리미엄 플랜 업그레이드 버튼
        const premiumBtn = document.getElementById('premium-upgrade-btn');
        if (premiumBtn) {
            premiumBtn.addEventListener('click', async () => {
                if (window.subscriptionManager) {
                    await window.subscriptionManager.startUpgrade('PREMIUM');
                }
            });
        }
        
        // 자동갱신 토글 버튼
        const autoRenewBtn = document.getElementById('auto-renew-toggle-btn');
        if (autoRenewBtn) {
            autoRenewBtn.addEventListener('click', async () => {
                if (window.subscriptionManager) {
                    await window.subscriptionManager.toggleAutoRenew();
                }
            });
        }
        
        // 구독 해지 버튼
        const cancelBtn = document.getElementById('cancel-subscription-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                if (window.subscriptionManager) {
                    await window.subscriptionManager.cancelSubscription();
                }
            });
        }
    }
    
    /**
     * 플랜 업그레이드 버튼 이벤트 설정
     */
    setupUpgradeButtons() {
        // 일반적인 업그레이드 버튼들
        document.querySelectorAll('[data-plan-upgrade]').forEach(button => {
            button.addEventListener('click', async (e) => {
                const planId = e.target.getAttribute('data-plan-upgrade');
                if (planId && window.subscriptionManager) {
                    await window.subscriptionManager.startUpgrade(planId);
                }
            });
        });
        
        // 플랜 카드 클릭 이벤트
        document.querySelectorAll('.plan-card button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const planCard = e.target.closest('.plan-card');
                const planId = planCard ? planCard.getAttribute('data-plan-id') : null;
                
                if (planId && window.subscriptionManager) {
                    await window.subscriptionManager.startUpgrade(planId);
                }
            });
        });
    }
    
    /**
     * 결제 관련 설정 메뉴 이벤트 설정
     */
    setupPaymentSettings() {
        // 구독 관리 메뉴 항목
        const subscriptionMenuItem = document.querySelector('[data-action="subscription-management"]');
        if (subscriptionMenuItem) {
            subscriptionMenuItem.addEventListener('click', () => {
                if (window.subscriptionManager) {
                    window.subscriptionManager.showSubscriptionManagement();
                }
            });
        }
        
        // 설정 페이지의 구독 관련 버튼들
        document.querySelectorAll('[data-subscription-action]').forEach(element => {
            element.addEventListener('click', async (e) => {
                const action = e.target.getAttribute('data-subscription-action');
                
                if (window.subscriptionManager) {
                    switch (action) {
                        case 'show-management':
                            window.subscriptionManager.showSubscriptionManagement();
                            break;
                        case 'toggle-auto-renew':
                            await window.subscriptionManager.toggleAutoRenew();
                            break;
                        case 'cancel-subscription':
                            await window.subscriptionManager.cancelSubscription();
                            break;
                    }
                }
            });
        });
    }
    
    /**
     * 결제 관련 UI 요소 활성화
     */
    activatePaymentUI() {
        console.log('🎨 [생명구조] 결제 관련 UI 활성화...');
        
        // 숨겨진 구독 관리 요소들 표시
        document.querySelectorAll('.subscription-hidden').forEach(element => {
            element.classList.remove('subscription-hidden');
            element.style.display = '';
        });
        
        // 결제 관련 버튼들 활성화
        document.querySelectorAll('button[disabled][data-payment-button]').forEach(button => {
            button.disabled = false;
            button.textContent = button.getAttribute('data-enabled-text') || button.textContent;
        });
        
        // 구독 상태 UI 업데이트
        if (window.subscriptionManager) {
            window.subscriptionManager.updateUI();
        }
        
        console.log('✅ [생명구조] 결제 관련 UI 활성화 완료');
    }
    
    /**
     * 시스템 상태 확인
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            fixApplied: this.fixApplied,
            crossPlatformPayment: {
                exists: !!window.crossPlatformPayment,
                initialized: window.crossPlatformPayment?.isInitialized || false
            },
            subscriptionManager: {
                exists: !!window.subscriptionManager,
                initialized: window.subscriptionManager?.isInitialized || false
            },
            profileComponent: {
                exists: !!window.profileComponent,
                initialized: window.profileComponent?.isInitialized || false
            }
        };
    }
}

// 전역 인스턴스 생성 및 자동 초기화
if (!window.paymentFixInitializer) {
    window.paymentFixInitializer = new PaymentFixInitializer();
    
    // DOM 로드 후 자동 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                window.paymentFixInitializer.applyPaymentFixes();
            }, 2000); // 2초 후 실행 (다른 컴포넌트들이 로드될 시간 확보)
        });
    } else {
        // 이미 DOM이 로드되어 있다면 즉시 실행
        setTimeout(() => {
            window.paymentFixInitializer.applyPaymentFixes();
        }, 1000);
    }
    
    console.log('🛠️ [생명구조] 결제 시스템 수정 초기화기 로드 완료');
} else {
    console.log('ℹ️ [생명구조] 결제 시스템 수정 초기화기 이미 로드됨');
}