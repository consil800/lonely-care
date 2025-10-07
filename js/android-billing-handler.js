/**
 * 🤖 Android Google Play Billing Handler
 * Google Play Billing API v6 완전 통합
 * 
 * 생명구조 앱용 Android 인앱 결제 시스템
 * - 구독 관리
 * - 영수증 검증  
 * - 자동갱신 제어
 * - 구매 복원
 */

class AndroidBillingHandler {
    constructor() {
        this.className = 'AndroidBillingHandler';
        this.isReady = false;
        this.billingClient = null;
        this.availableProducts = new Map();
        this.activeSubscriptions = new Map();
        
        console.log('🤖 [생명구조] Android Billing Handler 초기화');
    }
    
    /**
     * Google Play Billing 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] Google Play Billing 초기화 중...');
            
            // 환경 확인 (웹 vs Android)
            const isWebEnvironment = !window.AndroidBridge && typeof window !== 'undefined' && window.location;
            
            if (isWebEnvironment) {
                console.log('🌐 [생명구조] 웹 환경 감지 - Android Billing 비활성화 (정상)');
                this.isReady = false;
                this.isWebMode = true;
                console.log('✅ [생명구조] 웹 모드로 초기화 완료 (Android 기능 없음)');
                return; // 오류 없이 정상 종료
            }
            
            // Android Bridge 확인
            if (!window.AndroidBridge) {
                throw new Error('Android Bridge를 찾을 수 없습니다');
            }
            
            // Google Play Billing 연결
            await this.connectToBillingService();
            
            // 상품 정보 로드
            await this.loadAvailableProducts();
            
            // 기존 구매 확인
            await this.queryExistingPurchases();
            
            this.isReady = true;
            console.log('✅ [생명구조] Google Play Billing 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] Google Play Billing 초기화 실패:', error);
            this.isReady = false;
            throw error;
        }
    }
    
    /**
     * Billing Service 연결
     */
    async connectToBillingService() {
        return new Promise((resolve, reject) => {
            if (window.AndroidBridge.initializeBilling) {
                window.AndroidBridge.initializeBilling(
                    // 성공 콜백
                    () => {
                        console.log('✅ [생명구조] Billing Service 연결 성공');
                        this.billingClient = window.AndroidBridge;
                        resolve();
                    },
                    // 실패 콜백
                    (error) => {
                        console.error('❌ [생명구조] Billing Service 연결 실패:', error);
                        reject(new Error(`Billing Service 연결 실패: ${error}`));
                    }
                );
            } else {
                reject(new Error('initializeBilling 메서드를 찾을 수 없습니다'));
            }
        });
    }
    
    /**
     * 사용 가능한 상품 로드
     */
    async loadAvailableProducts() {
        try {
            console.log('🛍️ [생명구조] 구독 상품 정보 로드 중...');
            
            const subscriptionIds = [
                'lonely_care_basic_monthly',
                'lonely_care_premium_monthly'
            ];
            
            if (this.billingClient.querySkuDetails) {
                const skuDetails = await new Promise((resolve, reject) => {
                    this.billingClient.querySkuDetails(
                        subscriptionIds,
                        'subs', // 구독 상품
                        (products) => {
                            console.log('✅ [생명구조] 구독 상품 정보 로드 완료:', products);
                            resolve(products);
                        },
                        (error) => {
                            console.error('❌ [생명구조] 구독 상품 정보 로드 실패:', error);
                            reject(new Error(error));
                        }
                    );
                });
                
                // 상품 정보 저장
                for (const product of skuDetails) {
                    this.availableProducts.set(product.sku, product);
                }
                
                console.log(`✅ [생명구조] ${skuDetails.length}개 구독 상품 로드 완료`);
            } else {
                throw new Error('querySkuDetails 메서드를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 구독 상품 로드 실패:', error);
            throw error;
        }
    }
    
    /**
     * 기존 구매 확인
     */
    async queryExistingPurchases() {
        try {
            console.log('🔍 [생명구조] 기존 구매 확인 중...');
            
            if (this.billingClient.queryPurchases) {
                const purchases = await new Promise((resolve, reject) => {
                    this.billingClient.queryPurchases(
                        'subs', // 구독만 확인
                        (purchases) => {
                            resolve(purchases || []);
                        },
                        (error) => {
                            console.error('❌ [생명구조] 구매 확인 실패:', error);
                            reject(new Error(error));
                        }
                    );
                });
                
                // 활성 구독 저장
                for (const purchase of purchases) {
                    if (purchase.purchaseState === 1) { // PURCHASED
                        this.activeSubscriptions.set(purchase.sku, purchase);
                    }
                }
                
                console.log(`✅ [생명구조] ${purchases.length}개 기존 구매 확인 완료`);
                return purchases;
            } else {
                throw new Error('queryPurchases 메서드를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 기존 구매 확인 실패:', error);
            return [];
        }
    }
    
    /**
     * 구독 구매
     */
    async purchaseSubscription(productId) {
        try {
            console.log(`💳 [생명구조] 구독 구매 시작: ${productId}`);
            
            if (!this.isReady) {
                throw new Error('Billing client가 준비되지 않았습니다');
            }
            
            const product = this.availableProducts.get(productId);
            if (!product) {
                throw new Error(`상품을 찾을 수 없습니다: ${productId}`);
            }
            
            if (this.billingClient.launchBillingFlow) {
                const result = await new Promise((resolve, reject) => {
                    this.billingClient.launchBillingFlow(
                        productId,
                        'subs',
                        // 성공 콜백
                        (purchase) => {
                            console.log('✅ [생명구조] 구독 구매 성공:', purchase);
                            resolve({
                                success: true,
                                purchase: purchase,
                                purchaseToken: purchase.purchaseToken,
                                transactionId: purchase.orderId,
                                receipt: purchase.originalJson,
                                productId: productId
                            });
                        },
                        // 실패 콜백
                        (error) => {
                            console.error('❌ [생명구조] 구독 구매 실패:', error);
                            reject(new Error(error));
                        }
                    );
                });
                
                // 활성 구독에 추가
                this.activeSubscriptions.set(productId, result.purchase);
                
                return result;
            } else {
                throw new Error('launchBillingFlow 메서드를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error(`❌ [생명구조] 구독 구매 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 구독 해지
     */
    async cancelSubscription(subscriptionId) {
        try {
            console.log(`🚫 [생명구조] 구독 해지: ${subscriptionId}`);
            
            // Google Play에서는 직접 해지보다는 Play Store로 이동
            if (this.billingClient.openSubscriptionManagement) {
                await new Promise((resolve, reject) => {
                    this.billingClient.openSubscriptionManagement(
                        subscriptionId,
                        () => {
                            console.log('✅ [생명구조] 구독 관리 페이지 열기 성공');
                            resolve();
                        },
                        (error) => {
                            console.error('❌ [생명구조] 구독 관리 페이지 열기 실패:', error);
                            reject(new Error(error));
                        }
                    );
                });
                
                return { success: true, message: '구독 관리 페이지가 열렸습니다' };
            } else {
                // Fallback: Play Store URL로 이동
                const playStoreUrl = `https://play.google.com/store/account/subscriptions?sku=${subscriptionId}&package=${window.AndroidBridge.getPackageName?.() || 'com.lonelcare.app'}`;
                
                if (this.billingClient.openUrl) {
                    this.billingClient.openUrl(playStoreUrl);
                } else {
                    window.open(playStoreUrl, '_blank');
                }
                
                return { success: true, message: 'Play Store 구독 관리 페이지로 이동했습니다' };
            }
            
        } catch (error) {
            console.error(`❌ [생명구조] 구독 해지 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 자동갱신 설정
     */
    async setAutoRenew(enable) {
        try {
            console.log(`🔄 [생명구조] 자동갱신 설정: ${enable}`);
            
            // Google Play에서는 자동갱신을 앱에서 직접 제어할 수 없음
            // 사용자가 Play Store에서 직접 설정해야 함
            
            if (this.billingClient.openSubscriptionManagement) {
                // 구독 관리 페이지로 이동
                const activeSubscription = Array.from(this.activeSubscriptions.values())[0];
                if (activeSubscription) {
                    await this.cancelSubscription(activeSubscription.sku);
                    return { 
                        success: true, 
                        message: '구독 관리 페이지에서 자동갱신을 설정해주세요',
                        needsUserAction: true
                    };
                }
            }
            
            return { 
                success: false, 
                error: '활성 구독이 없습니다',
                needsUserAction: true
            };
            
        } catch (error) {
            console.error(`❌ [생명구조] 자동갱신 설정 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 플랜 업그레이드
     */
    async upgradePlan(currentSubscriptionId, newProductId) {
        try {
            console.log(`⬆️ [생명구조] 플랜 업그레이드: ${currentSubscriptionId} -> ${newProductId}`);
            
            const currentSubscription = this.activeSubscriptions.get(currentSubscriptionId);
            if (!currentSubscription) {
                throw new Error('현재 구독을 찾을 수 없습니다');
            }
            
            if (this.billingClient.upgradePlan) {
                const result = await new Promise((resolve, reject) => {
                    this.billingClient.upgradePlan(
                        newProductId,
                        currentSubscription.purchaseToken,
                        // 성공 콜백
                        (purchase) => {
                            console.log('✅ [생명구조] 플랜 업그레이드 성공:', purchase);
                            resolve({
                                success: true,
                                purchase: purchase,
                                purchaseToken: purchase.purchaseToken,
                                transactionId: purchase.orderId,
                                receipt: purchase.originalJson,
                                productId: newProductId
                            });
                        },
                        // 실패 콜백
                        (error) => {
                            console.error('❌ [생명구조] 플랜 업그레이드 실패:', error);
                            reject(new Error(error));
                        }
                    );
                });
                
                // 기존 구독 제거하고 새 구독 추가
                this.activeSubscriptions.delete(currentSubscriptionId);
                this.activeSubscriptions.set(newProductId, result.purchase);
                
                return result;
            } else {
                // Fallback: 새 구독 구매
                return await this.purchaseSubscription(newProductId);
            }
            
        } catch (error) {
            console.error(`❌ [생명구조] 플랜 업그레이드 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 구매 복원
     */
    async restorePurchases() {
        try {
            console.log('🔄 [생명구조] 구매 복원 중...');
            
            const purchases = await this.queryExistingPurchases();
            
            // 복원된 구독 정보 반환
            const subscriptions = purchases
                .filter(p => p.purchaseState === 1) // PURCHASED
                .map(purchase => ({
                    productId: purchase.sku,
                    purchaseToken: purchase.purchaseToken,
                    transactionId: purchase.orderId,
                    receipt: purchase.originalJson,
                    status: 'active',
                    autoRenew: purchase.autoRenewing || true
                }));
            
            console.log(`✅ [생명구조] 구매 복원 완료: ${subscriptions.length}개`);
            
            return {
                success: true,
                subscriptions: subscriptions
            };
            
        } catch (error) {
            console.error('❌ [생명구조] 구매 복원 실패:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 미완료 구매 확인
     */
    async getPendingPurchases() {
        try {
            const purchases = await this.queryExistingPurchases();
            
            // 미완료 구매 (acknowledged되지 않은 것들)
            const pendingPurchases = purchases.filter(p => 
                p.purchaseState === 1 && !p.acknowledged
            );
            
            return pendingPurchases.map(purchase => ({
                productId: purchase.sku,
                purchaseToken: purchase.purchaseToken,
                transactionId: purchase.orderId,
                receipt: purchase.originalJson
            }));
            
        } catch (error) {
            console.error('❌ [생명구조] 미완료 구매 확인 실패:', error);
            return [];
        }
    }
    
    /**
     * 구매 확인 (acknowledge)
     */
    async acknowledgePurchase(purchaseToken) {
        try {
            console.log(`✅ [생명구조] 구매 확인 처리: ${purchaseToken}`);
            
            if (this.billingClient.acknowledgePurchase) {
                await new Promise((resolve, reject) => {
                    this.billingClient.acknowledgePurchase(
                        purchaseToken,
                        () => {
                            console.log('✅ [생명구조] 구매 확인 완료');
                            resolve();
                        },
                        (error) => {
                            console.error('❌ [생명구조] 구매 확인 실패:', error);
                            reject(new Error(error));
                        }
                    );
                });
                
                return { success: true };
            } else {
                console.warn('⚠️ [생명구조] acknowledgePurchase 메서드를 찾을 수 없습니다');
                return { success: false, error: 'acknowledgePurchase 메서드 없음' };
            }
            
        } catch (error) {
            console.error(`❌ [생명구조] 구매 확인 실패:`, error);
            return { success: false, error: error.message };
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
        return this.availableProducts.get(productId);
    }
    
    /**
     * 시스템 상태 확인
     */
    getStatus() {
        return {
            isReady: this.isReady,
            activeSubscriptions: this.activeSubscriptions.size,
            availableProducts: this.availableProducts.size,
            billingClient: !!this.billingClient
        };
    }
}

// 전역 인스턴스 생성
window.AndroidBillingHandler = AndroidBillingHandler;

console.log('🤖 [생명구조] Android Billing Handler 로드 완료');