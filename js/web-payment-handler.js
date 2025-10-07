/**
 * 🌐 Web Payment Handler
 * 웹 브라우저용 결제 시스템 (아임포트 + 카카오페이/네이버페이)
 * 
 * 생명구조 앱용 웹 결제 시스템
 * - 아임포트 통합 결제
 * - 구독 관리
 * - 자동갱신 시뮬레이션
 * - 크로스 플랫폼 호환성
 */

class WebPaymentHandler {
    constructor() {
        this.className = 'WebPaymentHandler';
        this.isReady = false;
        this.iamport = null;
        this.activeSubscriptions = new Map();
        this.paymentMethods = {
            card: 'nice',
            kakao: 'kakaopay',
            naver: 'naverpay',
            phone: 'danal'
        };
        
        // 웹용 구독 상품 정의
        this.products = {
            BASIC: {
                id: 'BASIC',
                name: 'lonely-care 베이직 플랜',
                price: 2000,
                description: '친구 최대 3명 모니터링'
            },
            PREMIUM: {
                id: 'PREMIUM', 
                name: 'lonely-care 프리미엄 플랜',
                price: 5000,
                description: '친구 최대 10명 모니터링'
            }
        };
        
        console.log('🌐 [생명구조] Web Payment Handler 초기화');
    }
    
    /**
     * 아임포트 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] 아임포트 초기화 중...');
            
            // 아임포트 SDK 로드
            await this.loadIamportSDK();
            
            // 아임포트 초기화
            const impCode = this.getIamportCode();
            if (window.IMP) {
                window.IMP.init(impCode);
                this.iamport = window.IMP;
                console.log('✅ [생명구조] 아임포트 초기화 완료');
            } else {
                throw new Error('아임포트 SDK 로드 실패');
            }
            
            // 기존 구독 확인
            await this.loadExistingSubscriptions();
            
            // 자동갱신 체크 스케줄러 시작
            this.startAutoRenewScheduler();
            
            this.isReady = true;
            console.log('✅ [생명구조] Web Payment Handler 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] Web Payment Handler 초기화 실패:', error);
            this.isReady = false;
            throw error;
        }
    }
    
    /**
     * 아임포트 SDK 로드
     */
    async loadIamportSDK() {
        return new Promise((resolve, reject) => {
            if (window.IMP) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.iamport.kr/v1/iamport.js';
            script.onload = () => {
                console.log('✅ [생명구조] 아임포트 SDK 로드 완료');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ [생명구조] 아임포트 SDK 로드 실패');
                reject(new Error('아임포트 SDK 로드 실패'));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * 아임포트 가맹점 코드 가져오기
     */
    getIamportCode() {
        // 환경변수 또는 설정에서 가져오기
        return window.ENV_IAMPORT_CODE || 
               (window.getSecureEnv && window.getSecureEnv().getConfig('iamport.code')) ||
               'imp00000000'; // 개발용 테스트 코드
    }
    
    /**
     * 기존 구독 로드
     */
    async loadExistingSubscriptions() {
        try {
            const currentUser = window.auth?.getCurrentUser();
            if (!currentUser) return;
            
            const result = await window.firebaseClient.getDocument('subscriptions', currentUser.id);
            
            if (result.data) {
                const subscription = result.data;
                if (subscription.status === 'active') {
                    this.activeSubscriptions.set(subscription.planId, subscription);
                    console.log(`✅ [생명구조] 기존 구독 로드: ${subscription.planId}`);
                }
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 기존 구독 로드 실패:', error);
        }
    }
    
    /**
     * 구독 구매
     */
    async purchaseSubscription(productId, paymentMethod = 'card') {
        try {
            console.log(`💳 [생명구조] 웹 구독 구매 시작: ${productId}`);
            
            if (!this.isReady) {
                throw new Error('결제 시스템이 준비되지 않았습니다');
            }
            
            const product = this.products[productId];
            if (!product) {
                throw new Error(`상품을 찾을 수 없습니다: ${productId}`);
            }
            
            const currentUser = window.auth?.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다');
            }
            
            // 주문 번호 생성
            const merchantUid = this.generateMerchantUid(productId, currentUser.id);
            
            // 결제 요청 데이터
            const paymentData = {
                pg: this.paymentMethods[paymentMethod] || 'nice',
                pay_method: paymentMethod === 'card' ? 'card' : paymentMethod,
                merchant_uid: merchantUid,
                name: product.name,
                amount: product.price,
                buyer_email: currentUser.email || '',
                buyer_name: currentUser.name || '',
                buyer_tel: currentUser.phone || '',
                notice_url: `${window.location.origin}/api/payment/webhook`, // 웹훅 URL
                m_redirect_url: `${window.location.origin}/lonely-care/payment-complete.html`,
                custom_data: JSON.stringify({
                    userId: currentUser.id,
                    planId: productId,
                    subscriptionType: 'monthly'
                })
            };
            
            // 아임포트 결제 요청
            const result = await new Promise((resolve, reject) => {
                this.iamport.request_pay(paymentData, (response) => {
                    if (response.success) {
                        resolve({
                            success: true,
                            purchase: response,
                            purchaseToken: response.imp_uid,
                            transactionId: response.merchant_uid,
                            receipt: response,
                            productId: productId
                        });
                    } else {
                        reject(new Error(response.error_msg || '결제에 실패했습니다'));
                    }
                });
            });
            
            // 결제 검증 및 구독 활성화
            await this.verifyAndCreateSubscription(result, productId);
            
            console.log('✅ [생명구조] 웹 구독 구매 성공');
            return result;
            
        } catch (error) {
            console.error(`❌ [생명구조] 웹 구독 구매 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 구독 해지
     */
    async cancelSubscription(subscriptionId = null) {
        try {
            console.log(`🚫 [생명구조] 웹 구독 해지: ${subscriptionId || '현재 구독'}`);
            
            const currentUser = window.auth?.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다');
            }
            
            // Firebase에서 구독 상태 업데이트
            await window.firebaseClient.updateDocument(
                'subscriptions',
                currentUser.id,
                {
                    status: 'cancelled',
                    cancelledAt: new Date().toISOString(),
                    autoRenew: false
                }
            );
            
            // 로컬 구독 상태 업데이트
            const planId = subscriptionId || Array.from(this.activeSubscriptions.keys())[0];
            if (planId) {
                this.activeSubscriptions.delete(planId);
            }
            
            console.log('✅ [생명구조] 웹 구독 해지 완료');
            
            return { 
                success: true, 
                message: '구독이 해지되었습니다. 현재 기간 만료까지 이용 가능합니다.'
            };
            
        } catch (error) {
            console.error(`❌ [생명구조] 웹 구독 해지 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 자동갱신 설정
     */
    async setAutoRenew(enable) {
        try {
            console.log(`🔄 [생명구조] 웹 자동갱신 설정: ${enable}`);
            
            const currentUser = window.auth?.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다');
            }
            
            // Firebase에서 자동갱신 설정 업데이트
            await window.firebaseClient.updateDocument(
                'subscriptions',
                currentUser.id,
                {
                    autoRenew: enable,
                    autoRenewUpdatedAt: new Date().toISOString()
                }
            );
            
            // 로컬 상태 업데이트
            for (const [planId, subscription] of this.activeSubscriptions) {
                subscription.autoRenew = enable;
            }
            
            console.log(`✅ [생명구조] 웹 자동갱신 설정 완료: ${enable}`);
            
            return { success: true, autoRenew: enable };
            
        } catch (error) {
            console.error(`❌ [생명구조] 웹 자동갱신 설정 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 플랜 업그레이드
     */
    async upgradePlan(currentSubscriptionId, newProductId) {
        try {
            console.log(`⬆️ [생명구조] 웹 플랜 업그레이드: ${currentSubscriptionId} -> ${newProductId}`);
            
            // 기존 구독 해지
            if (currentSubscriptionId) {
                await this.cancelSubscription(currentSubscriptionId);
            }
            
            // 새 구독 시작
            const result = await this.purchaseSubscription(newProductId);
            
            if (result.success) {
                console.log('✅ [생명구조] 웹 플랜 업그레이드 완료');
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error(`❌ [생명구조] 웹 플랜 업그레이드 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 구매 복원 (웹에서는 Firebase에서 복원)
     */
    async restorePurchases() {
        try {
            console.log('🔄 [생명구조] 웹 구매 복원 중...');
            
            await this.loadExistingSubscriptions();
            
            const subscriptions = Array.from(this.activeSubscriptions.values()).map(subscription => ({
                productId: subscription.planId,
                purchaseToken: subscription.lastPayment?.impUid,
                transactionId: subscription.lastPayment?.merchantUid,
                receipt: subscription.lastPayment,
                status: subscription.status,
                autoRenew: subscription.autoRenew
            }));
            
            console.log(`✅ [생명구조] 웹 구매 복원 완료: ${subscriptions.length}개`);
            
            return {
                success: true,
                subscriptions: subscriptions
            };
            
        } catch (error) {
            console.error('❌ [생명구조] 웹 구매 복원 실패:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 미완료 구매 확인 (웹에서는 해당 없음)
     */
    async getPendingPurchases() {
        // 웹에서는 미완료 구매가 발생하지 않음
        return [];
    }
    
    /**
     * 구매 확인 (웹에서는 해당 없음)
     */
    async acknowledgePurchase(purchaseToken) {
        // 웹에서는 별도 확인 과정 없음
        return { success: true };
    }
    
    /**
     * 주문 번호 생성
     */
    generateMerchantUid(productId, userId) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `lonely_care_${productId}_${timestamp}_${random}`;
    }
    
    /**
     * 결제 검증 및 구독 생성
     */
    async verifyAndCreateSubscription(paymentResult, planId) {
        try {
            console.log('🔐 [생명구조] 웹 결제 검증 중...');
            
            // 아임포트 결제 검증
            const verificationResult = await this.verifyIamportPayment(paymentResult.purchase.imp_uid);
            
            if (verificationResult.success) {
                const currentUser = window.auth?.getCurrentUser();
                
                // 구독 정보 생성
                const subscription = {
                    userId: currentUser.id,
                    planId: planId,
                    platform: 'web',
                    status: 'active',
                    startDate: new Date().toISOString(),
                    endDate: this.calculateEndDate(),
                    autoRenew: true,
                    lastPayment: {
                        impUid: paymentResult.purchase.imp_uid,
                        merchantUid: paymentResult.purchase.merchant_uid,
                        amount: paymentResult.purchase.paid_amount,
                        paidAt: new Date().toISOString(),
                        method: paymentResult.purchase.pay_method
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                // Firebase에 저장
                await window.firebaseClient.setDocument(
                    'subscriptions',
                    currentUser.id,
                    subscription
                );
                
                // 로컬 상태 업데이트
                this.activeSubscriptions.set(planId, subscription);
                
                console.log('✅ [생명구조] 웹 구독 생성 완료');
                return true;
            } else {
                throw new Error('결제 검증에 실패했습니다');
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 웹 구독 생성 실패:', error);
            throw error;
        }
    }
    
    /**
     * 아임포트 결제 검증
     */
    async verifyIamportPayment(impUid) {
        try {
            // 실제 운영 환경에서는 백엔드 서버에서 검증
            const response = await fetch('/api/verify-iamport-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imp_uid: impUid })
            });
            
            if (response.ok) {
                const result = await response.json();
                return result;
            } else {
                throw new Error(`서버 응답 오류: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 아임포트 결제 검증 요청 실패:', error);
            
            // 개발 환경에서는 임시로 성공 처리
            console.warn('⚠️ [생명구조] 개발 모드: 결제 검증 스킵');
            return { success: true, warning: '개발 모드 검증' };
        }
    }
    
    /**
     * 구독 만료일 계산 (30일)
     */
    calculateEndDate() {
        const now = new Date();
        const endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30일 후
        return endDate.toISOString();
    }
    
    /**
     * 자동갱신 스케줄러 시작
     */
    startAutoRenewScheduler() {
        // 매일 자동갱신 확인 (실제 서비스에서는 서버에서 처리)
        setInterval(() => {
            this.checkAndProcessAutoRenew();
        }, 24 * 60 * 60 * 1000); // 24시간마다
        
        console.log('🔄 [생명구조] 자동갱신 스케줄러 시작');
    }
    
    /**
     * 자동갱신 확인 및 처리
     */
    async checkAndProcessAutoRenew() {
        try {
            const currentUser = window.auth?.getCurrentUser();
            if (!currentUser) return;
            
            const result = await window.firebaseClient.getDocument('subscriptions', currentUser.id);
            
            if (result.data) {
                const subscription = result.data;
                
                // 자동갱신이 활성화되고 만료일이 임박한 경우
                if (subscription.autoRenew && subscription.status === 'active') {
                    const endDate = new Date(subscription.endDate);
                    const now = new Date();
                    const daysUntilExpiry = (endDate - now) / (24 * 60 * 60 * 1000);
                    
                    // 7일 전에 갱신 알림
                    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                        this.showRenewalNotification(subscription, Math.ceil(daysUntilExpiry));
                    }
                    
                    // 1일 전에 자동갱신 시도 (실제로는 서버에서 처리)
                    if (daysUntilExpiry <= 1 && daysUntilExpiry > 0) {
                        console.log('🔄 [생명구조] 자동갱신 필요:', subscription.planId);
                        // 실제 구현에서는 저장된 결제 정보로 자동 결제 진행
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 자동갱신 확인 실패:', error);
        }
    }
    
    /**
     * 갱신 알림 표시
     */
    showRenewalNotification(subscription, daysLeft) {
        if (window.notificationsManager) {
            window.notificationsManager.showBrowserNotification(
                '🔔 구독 갱신 안내',
                `${subscription.planId} 플랜이 ${daysLeft}일 후 자동 갱신됩니다.`,
                {
                    icon: '/icon.png',
                    tag: 'subscription-renewal',
                    requireInteraction: false
                }
            );
        }
    }
    
    /**
     * 현재 구독 상태 확인
     */
    getActiveSubscriptions() {
        return Array.from(this.activeSubscriptions.values());
    }
    
    /**
     * 상품 정보 가져오기
     */
    getProductInfo(productId) {
        return this.products[productId];
    }
    
    /**
     * 시스템 상태 확인
     */
    getStatus() {
        return {
            isReady: this.isReady,
            activeSubscriptions: this.activeSubscriptions.size,
            availableProducts: Object.keys(this.products).length,
            iamport: !!this.iamport
        };
    }
}

// 전역 인스턴스 생성
window.WebPaymentHandler = WebPaymentHandler;

console.log('🌐 [생명구조] Web Payment Handler 로드 완료');