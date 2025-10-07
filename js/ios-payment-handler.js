/**
 * 🍎 iOS App Store Payment Handler
 * Apple StoreKit 2 완전 통합
 * 
 * 생명구조 앱용 iOS 인앱 결제 시스템
 * - 구독 관리
 * - 영수증 검증
 * - 자동갱신 제어
 * - 구매 복원
 * - Family Sharing 지원
 */

class IOSPaymentHandler {
    constructor() {
        this.className = 'IOSPaymentHandler';
        this.isReady = false;
        this.storeKit = null;
        this.availableProducts = new Map();
        this.activeSubscriptions = new Map();
        this.transactionListener = null;
        
        console.log('🍎 [생명구조] iOS Payment Handler 초기화');
    }
    
    /**
     * StoreKit 2 초기화
     */
    async init() {
        try {
            console.log('🔄 [생명구조] StoreKit 2 초기화 중...');
            
            // iOS WebKit Bridge 확인
            if (!window.webkit?.messageHandlers?.storeKit) {
                throw new Error('iOS StoreKit bridge를 찾을 수 없습니다');
            }
            
            this.storeKit = window.webkit.messageHandlers.storeKit;
            
            // StoreKit 2 연결
            await this.connectToStoreKit();
            
            // 상품 정보 로드
            await this.loadAvailableProducts();
            
            // 트랜잭션 리스너 설정
            this.setupTransactionListener();
            
            // 기존 구매 확인
            await this.queryExistingSubscriptions();
            
            this.isReady = true;
            console.log('✅ [생명구조] StoreKit 2 초기화 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] StoreKit 2 초기화 실패:', error);
            this.isReady = false;
            throw error;
        }
    }
    
    /**
     * StoreKit 연결
     */
    async connectToStoreKit() {
        return new Promise((resolve, reject) => {
            // iOS 앱에 StoreKit 초기화 요청
            this.postMessage('initializeStoreKit', {}, (response) => {
                if (response.success) {
                    console.log('✅ [생명구조] StoreKit 연결 성공');
                    resolve();
                } else {
                    console.error('❌ [생명구조] StoreKit 연결 실패:', response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }
    
    /**
     * 사용 가능한 상품 로드
     */
    async loadAvailableProducts() {
        try {
            console.log('🛍️ [생명구조] 구독 상품 정보 로드 중...');
            
            const productIds = [
                'lonely_care_basic_monthly',
                'lonely_care_premium_monthly'
            ];
            
            const products = await new Promise((resolve, reject) => {
                this.postMessage('requestProducts', { productIds }, (response) => {
                    if (response.success) {
                        resolve(response.products);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            // 상품 정보 저장
            for (const product of products) {
                this.availableProducts.set(product.id, product);
            }
            
            console.log(`✅ [생명구조] ${products.length}개 구독 상품 로드 완료`);
            
        } catch (error) {
            console.error('❌ [생명구조] 구독 상품 로드 실패:', error);
            throw error;
        }
    }
    
    /**
     * 트랜잭션 리스너 설정
     */
    setupTransactionListener() {
        // iOS 앱에서 트랜잭션 업데이트를 받기 위한 글로벌 콜백 함수
        window.iosTransactionUpdate = (transaction) => {
            this.handleTransactionUpdate(transaction);
        };
        
        // iOS 앱에 트랜잭션 리스너 등록 요청
        this.postMessage('setupTransactionListener', {});
    }
    
    /**
     * 트랜잭션 업데이트 처리
     */
    handleTransactionUpdate(transaction) {
        console.log('🔄 [생명구조] 트랜잭션 업데이트:', transaction);
        
        switch (transaction.state) {
            case 'purchased':
                this.handleSuccessfulPurchase(transaction);
                break;
            case 'failed':
                this.handleFailedPurchase(transaction);
                break;
            case 'restored':
                this.handleRestoredPurchase(transaction);
                break;
            case 'deferred':
                this.handleDeferredPurchase(transaction);
                break;
        }
    }
    
    /**
     * 기존 구독 확인
     */
    async queryExistingSubscriptions() {
        try {
            console.log('🔍 [생명구조] 기존 구독 확인 중...');
            
            const subscriptions = await new Promise((resolve, reject) => {
                this.postMessage('getCurrentEntitlements', {}, (response) => {
                    if (response.success) {
                        resolve(response.subscriptions || []);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            // 활성 구독 저장
            for (const subscription of subscriptions) {
                if (subscription.state === 'subscribed') {
                    this.activeSubscriptions.set(subscription.productId, subscription);
                }
            }
            
            console.log(`✅ [생명구조] ${subscriptions.length}개 기존 구독 확인 완료`);
            return subscriptions;
            
        } catch (error) {
            console.error('❌ [생명구조] 기존 구독 확인 실패:', error);
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
                throw new Error('StoreKit이 준비되지 않았습니다');
            }
            
            const product = this.availableProducts.get(productId);
            if (!product) {
                throw new Error(`상품을 찾을 수 없습니다: ${productId}`);
            }
            
            const result = await new Promise((resolve, reject) => {
                this.postMessage('purchaseProduct', { productId }, (response) => {
                    if (response.success) {
                        console.log('✅ [생명구조] 구독 구매 성공:', response.transaction);
                        resolve({
                            success: true,
                            purchase: response.transaction,
                            purchaseToken: response.transaction.transactionId,
                            transactionId: response.transaction.transactionId,
                            receipt: response.transaction.receipt,
                            productId: productId
                        });
                    } else {
                        console.error('❌ [생명구조] 구독 구매 실패:', response.error);
                        reject(new Error(response.error));
                    }
                });
            });
            
            // 활성 구독에 추가
            this.activeSubscriptions.set(productId, result.purchase);
            
            return result;
            
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
            
            // iOS에서는 App Store 구독 관리 페이지로 이동
            const result = await new Promise((resolve, reject) => {
                this.postMessage('openSubscriptionManagement', { subscriptionId }, (response) => {
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            return { 
                success: true, 
                message: 'App Store 구독 관리 페이지가 열렸습니다',
                needsUserAction: true
            };
            
        } catch (error) {
            console.error(`❌ [생명구조] 구독 해지 실패:`, error);
            
            // Fallback: 설정 앱으로 이동
            try {
                this.postMessage('openAppStoreSubscriptions', {});
                return { 
                    success: true, 
                    message: '설정 앱의 구독 관리로 이동했습니다',
                    needsUserAction: true
                };
            } catch (fallbackError) {
                return { success: false, error: error.message };
            }
        }
    }
    
    /**
     * 자동갱신 설정
     */
    async setAutoRenew(enable) {
        try {
            console.log(`🔄 [생명구조] 자동갱신 설정: ${enable}`);
            
            // iOS에서는 자동갱신을 앱에서 직접 제어할 수 없음
            // 사용자가 App Store에서 직접 설정해야 함
            
            // 구독 관리 페이지로 이동
            const activeSubscription = Array.from(this.activeSubscriptions.values())[0];
            if (activeSubscription) {
                await this.cancelSubscription(activeSubscription.productId);
                return { 
                    success: true, 
                    message: 'App Store 구독 관리에서 자동갱신을 설정해주세요',
                    needsUserAction: true
                };
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
            
            // iOS에서 구독 업그레이드
            const result = await new Promise((resolve, reject) => {
                this.postMessage('upgradeSubscription', { 
                    currentProductId: currentSubscriptionId,
                    newProductId: newProductId
                }, (response) => {
                    if (response.success) {
                        resolve({
                            success: true,
                            purchase: response.transaction,
                            purchaseToken: response.transaction.transactionId,
                            transactionId: response.transaction.transactionId,
                            receipt: response.transaction.receipt,
                            productId: newProductId
                        });
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            // 기존 구독 제거하고 새 구독 추가
            this.activeSubscriptions.delete(currentSubscriptionId);
            this.activeSubscriptions.set(newProductId, result.purchase);
            
            return result;
            
        } catch (error) {
            console.error(`❌ [생명구조] 플랜 업그레이드 실패:`, error);
            
            // Fallback: 새 구독 구매
            try {
                return await this.purchaseSubscription(newProductId);
            } catch (fallbackError) {
                return { success: false, error: error.message };
            }
        }
    }
    
    /**
     * 구매 복원
     */
    async restorePurchases() {
        try {
            console.log('🔄 [생명구조] 구매 복원 중...');
            
            const result = await new Promise((resolve, reject) => {
                this.postMessage('restorePurchases', {}, (response) => {
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            // 복원된 구독 정보 처리
            const subscriptions = result.subscriptions?.map(subscription => ({
                productId: subscription.productId,
                purchaseToken: subscription.transactionId,
                transactionId: subscription.transactionId,
                receipt: subscription.receipt,
                status: subscription.state === 'subscribed' ? 'active' : 'inactive',
                autoRenew: subscription.autoRenewing !== false,
                expirationDate: subscription.expirationDate
            })) || [];
            
            // 활성 구독 업데이트
            for (const subscription of result.subscriptions || []) {
                if (subscription.state === 'subscribed') {
                    this.activeSubscriptions.set(subscription.productId, subscription);
                }
            }
            
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
            const result = await new Promise((resolve, reject) => {
                this.postMessage('getPendingTransactions', {}, (response) => {
                    if (response.success) {
                        resolve(response.transactions || []);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            return result.map(transaction => ({
                productId: transaction.productId,
                purchaseToken: transaction.transactionId,
                transactionId: transaction.transactionId,
                receipt: transaction.receipt
            }));
            
        } catch (error) {
            console.error('❌ [생명구조] 미완료 구매 확인 실패:', error);
            return [];
        }
    }
    
    /**
     * 구매 확인 (finish transaction)
     */
    async acknowledgePurchase(transactionId) {
        try {
            console.log(`✅ [생명구조] 트랜잭션 완료 처리: ${transactionId}`);
            
            const result = await new Promise((resolve, reject) => {
                this.postMessage('finishTransaction', { transactionId }, (response) => {
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
            
            return { success: true };
            
        } catch (error) {
            console.error(`❌ [생명구조] 트랜잭션 완료 처리 실패:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * iOS 앱으로 메시지 전송
     */
    postMessage(action, data = {}, callback = null) {
        const message = {
            action: action,
            data: data,
            callbackId: callback ? this.generateCallbackId() : null
        };
        
        // 콜백이 있는 경우 등록
        if (callback && message.callbackId) {
            window[`iosCallback_${message.callbackId}`] = (response) => {
                callback(response);
                delete window[`iosCallback_${message.callbackId}`];
            };
        }
        
        // iOS 앱으로 메시지 전송
        this.storeKit.postMessage(message);
    }
    
    /**
     * 콜백 ID 생성
     */
    generateCallbackId() {
        return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 성공한 구매 처리
     */
    handleSuccessfulPurchase(transaction) {
        console.log('✅ [생명구조] 구매 성공 처리:', transaction);
        this.activeSubscriptions.set(transaction.productId, transaction);
        
        // 구매 성공 이벤트 발생
        window.dispatchEvent(new CustomEvent('iosPurchaseSuccess', { 
            detail: transaction 
        }));
    }
    
    /**
     * 실패한 구매 처리
     */
    handleFailedPurchase(transaction) {
        console.error('❌ [생명구조] 구매 실패 처리:', transaction);
        
        // 구매 실패 이벤트 발생
        window.dispatchEvent(new CustomEvent('iosPurchaseFailure', { 
            detail: transaction 
        }));
    }
    
    /**
     * 복원된 구매 처리
     */
    handleRestoredPurchase(transaction) {
        console.log('🔄 [생명구조] 구매 복원 처리:', transaction);
        this.activeSubscriptions.set(transaction.productId, transaction);
        
        // 구매 복원 이벤트 발생
        window.dispatchEvent(new CustomEvent('iosPurchaseRestored', { 
            detail: transaction 
        }));
    }
    
    /**
     * 지연된 구매 처리 (가족 공유 등)
     */
    handleDeferredPurchase(transaction) {
        console.log('⏳ [생명구조] 구매 지연 처리:', transaction);
        
        // 구매 지연 이벤트 발생
        window.dispatchEvent(new CustomEvent('iosPurchaseDeferred', { 
            detail: transaction 
        }));
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
            storeKit: !!this.storeKit
        };
    }
}

// 전역 인스턴스 생성
window.IOSPaymentHandler = IOSPaymentHandler;

console.log('🍎 [생명구조] iOS Payment Handler 로드 완료');