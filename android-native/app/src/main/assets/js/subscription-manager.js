/**
 * 🎯 Subscription Manager
 * 요금제 관리 시스템 - 생명구조 서비스의 지속가능성을 위한 핵심 모듈
 * 
 * 요금제 정책:
 * - 친구 1명: 무료
 * - 친구 2-3명: 월 2,000원
 * - 친구 4-10명: 월 5,000원
 * - 최대 친구 수: 10명
 */

class SubscriptionManager {
    constructor() {
        this.currentUser = null;
        this.subscriptionStatus = null;
        this.friendsCount = 0;
        this.maxFriendsLimit = 10;
        
        // 요금제 정의
        this.plans = {
            FREE: {
                id: 'FREE',
                name: '무료 플랜',
                price: 0,
                maxFriends: 1,
                features: [
                    '친구 1명 모니터링',
                    '기본 알림 기능',
                    '24/48/72시간 알림'
                ]
            },
            BASIC: {
                id: 'BASIC',
                name: '베이직 플랜',
                price: 2000,
                maxFriends: 3,
                features: [
                    '친구 최대 3명 모니터링',
                    '우선순위 알림',
                    '상세 상태 리포트',
                    '이메일/SMS 알림'
                ]
            },
            PREMIUM: {
                id: 'PREMIUM',
                name: '프리미엄 플랜',
                price: 5000,
                maxFriends: 10,
                features: [
                    '친구 최대 10명 모니터링',
                    '최우선 알림',
                    '상세 분석 리포트',
                    '모든 알림 채널',
                    '가족 공유 기능',
                    '응급 연락망 자동 연결'
                ]
            }
        };
        
        this.initialize();
    }
    
    /**
     * 초기화
     */
    async initialize() {
        try {
            console.log('💳 요금제 시스템 초기화...');
            
            // 환경 정보 표시
            const isWebEnv = !window.AndroidBridge && typeof window !== 'undefined' && window.location;
            const hasAndroidBridge = !!window.AndroidBridge;
            const hasIOSBridge = !!window.webkit?.messageHandlers;
            
            if (isWebEnv) {
                console.log('🌐 [생명구조] 결제 환경: 웹 브라우저 (카드결제, 계좌이체 지원)');
                console.log('📱 [생명구조] 앱 설치 시: Google Play Billing, App Store Connect 자동 활성화');
            } else if (hasAndroidBridge) {
                console.log('🤖 [생명구조] 결제 환경: Android 앱 (Google Play Billing 활성화)');
            } else if (hasIOSBridge) {
                console.log('🍎 [생명구조] 결제 환경: iOS 앱 (App Store Connect 활성화)');
            }
            
            // 현재 사용자 확인
            this.currentUser = window.auth?.getCurrentUser();
            if (!this.currentUser) {
                console.log('⚠️ 로그인되지 않은 상태');
                return;
            }
            
            // 구독 상태 로드
            await this.loadSubscriptionStatus();
            
            // 친구 수 확인
            await this.updateFriendsCount();
            
            // 요금제 UI 초기화
            this.initializeUI();
            
            // 구독 관리 UI 업데이트
            this.updateUI();
            
            console.log('✅ 요금제 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 요금제 시스템 초기화 실패:', error);
            ErrorHandler.handle(error, 'subscription_init');
        }
    }
    
    /**
     * 구독 상태 로드
     */
    async loadSubscriptionStatus() {
        try {
            if (!this.currentUser?.id) return;
            
            // Firebase에서 구독 정보 조회
            const result = await window.firebaseClient.getDocument('subscriptions', this.currentUser.id);
            
            if (result.data) {
                this.subscriptionStatus = result.data;
                console.log('📊 현재 구독 상태:', this.subscriptionStatus);
            } else {
                // 신규 사용자 - 무료 플랜으로 초기화
                await this.createInitialSubscription();
            }
            
        } catch (error) {
            console.error('구독 상태 로드 실패:', error);
            // 오류 시에도 무료 플랜 사용
            this.subscriptionStatus = {
                plan: 'FREE',
                status: 'active',
                startDate: new Date().toISOString()
            };
        }
    }
    
    /**
     * 초기 구독 생성 (무료 플랜)
     */
    async createInitialSubscription() {
        const subscription = {
            userId: this.currentUser.id,
            plan: 'FREE',
            status: 'active',
            startDate: new Date().toISOString(),
            endDate: null, // 무료는 무제한
            paymentMethod: null,
            autoRenew: false,
            createdAt: new Date().toISOString()
        };
        
        try {
            await window.firebaseClient.setDocument('subscriptions', this.currentUser.id, subscription);
            this.subscriptionStatus = subscription;
            console.log('✅ 무료 구독 생성 완료');
        } catch (error) {
            console.error('초기 구독 생성 실패:', error);
        }
    }
    
    /**
     * 친구 수 업데이트
     */
    async updateFriendsCount() {
        try {
            const friendsResult = await window.firebaseClient.getFriends(this.currentUser.id);
            this.friendsCount = friendsResult.data ? friendsResult.data.length : 0;
            console.log(`👥 현재 친구 수: ${this.friendsCount}명`);
            
            // 요금제 확인
            this.checkPlanRequirement();
            
        } catch (error) {
            console.error('친구 수 확인 실패:', error);
            this.friendsCount = 0;
        }
    }
    
    /**
     * 필요한 요금제 확인
     */
    checkPlanRequirement() {
        const currentPlan = this.plans[this.subscriptionStatus?.plan || 'FREE'];
        
        if (this.friendsCount > currentPlan.maxFriends) {
            console.warn(`⚠️ 현재 플랜(${currentPlan.name})의 친구 수 제한(${currentPlan.maxFriends}명)을 초과했습니다!`);
            this.showUpgradePrompt();
            return false;
        }
        
        return true;
    }
    
    /**
     * 친구 추가 가능 여부 확인
     */
    canAddFriend() {
        const currentPlan = this.plans[this.subscriptionStatus?.plan || 'FREE'];
        
        // 현재 플랜의 최대 친구 수 확인
        if (this.friendsCount >= currentPlan.maxFriends) {
            this.showUpgradePrompt();
            return false;
        }
        
        // 전체 최대 제한 확인
        if (this.friendsCount >= this.maxFriendsLimit) {
            this.showMaxLimitReached();
            return false;
        }
        
        return true;
    }
    
    /**
     * 요금제 업그레이드 필요 안내
     */
    showUpgradePrompt() {
        const recommendedPlan = this.getRecommendedPlan();
        
        const modal = document.createElement('div');
        modal.className = 'subscription-upgrade-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <h2>🎯 더 많은 친구를 보호하세요</h2>
                <div class="current-status">
                    <p>현재 친구: <strong>${this.friendsCount}명</strong></p>
                    <p>현재 플랜: <strong>${this.plans[this.subscriptionStatus?.plan || 'FREE'].name}</strong></p>
                </div>
                
                <div class="upgrade-recommendation">
                    <h3>추천 플랜: ${recommendedPlan.name}</h3>
                    <div class="plan-price">${recommendedPlan.price.toLocaleString()}원/월</div>
                    <ul class="plan-features">
                        ${recommendedPlan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-upgrade" onclick="subscriptionManager.startUpgrade('${recommendedPlan.id}')">
                        업그레이드하기
                    </button>
                    <button class="btn-cancel" onclick="this.closest('.subscription-upgrade-modal').remove()">
                        나중에
                    </button>
                </div>
                
                <p class="upgrade-note">💝 더 많은 소중한 사람들을 지켜주세요</p>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * 추천 플랜 계산
     */
    getRecommendedPlan() {
        if (this.friendsCount <= 1) return this.plans.FREE;
        if (this.friendsCount <= 3) return this.plans.BASIC;
        return this.plans.PREMIUM;
    }
    
    /**
     * 최대 제한 도달 안내
     */
    showMaxLimitReached() {
        if (window.NotificationHelper) {
            NotificationHelper.showWarning(
                '친구 수 최대 제한(10명)에 도달했습니다. 가장 중요한 사람들을 선택해주세요.',
                'max_friends_limit'
            );
        }
    }
    
    /**
     * 업그레이드 시작 - 크로스 플랫폼 결제 시스템 사용
     */
    async startUpgrade(planId) {
        try {
            console.log(`🚀 [생명구조] 플랜 업그레이드 시작: ${planId}`);
            
            // 현재 모달 닫기
            document.querySelector('.subscription-upgrade-modal')?.remove();
            
            // 크로스 플랫폼 결제 시스템 사용 (개선된 처리)
            if (window.crossPlatformPayment) {
                // 초기화 대기 및 재시도
                if (!window.crossPlatformPayment.isInitialized) {
                    console.log('🔄 [생명구조] 결제 시스템 초기화 중...');
                    try {
                        await window.crossPlatformPayment.init();
                    } catch (initError) {
                        console.error('❌ [생명구조] 결제 시스템 초기화 실패:', initError);
                        // 초기화 실패 시 웹 결제로 대체
                        console.log('🌐 [생명구조] 웹 결제 시스템으로 대체');
                        this.showPaymentPage(planId);
                        return;
                    }
                }
                
                const result = await window.crossPlatformPayment.startSubscription(planId);
                
                if (result.success) {
                    // 성공 처리
                    await this.handleUpgradeSuccess(planId);
                    this.showSuccessMessage(planId);
                } else {
                    // 실패 처리
                    this.handleUpgradeFailure(result.error);
                }
            } else {
                // 웹 환경: 웹 결제 시스템 사용 (정상)
                console.log('🌐 [생명구조] 웹 환경 감지 - 웹 결제 시스템으로 진행');
                console.log('📱 [생명구조] 앱 설치 시 Google Play/App Store 결제 자동 활성화됩니다');
                this.showPaymentPage(planId);
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 업그레이드 시작 실패:', error);
            this.handleUpgradeFailure(error.message);
            ErrorHandler.handle(error, 'upgrade_start');
        }
    }
    
    /**
     * 결제 페이지 표시
     */
    showPaymentPage(planId) {
        const plan = this.plans[planId];
        
        const paymentModal = document.createElement('div');
        paymentModal.className = 'payment-modal';
        paymentModal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="payment-content">
                <h2>💳 결제 정보 입력</h2>
                
                <div class="selected-plan">
                    <h3>${plan.name}</h3>
                    <div class="plan-price">${plan.price.toLocaleString()}원/월</div>
                </div>
                
                <form id="payment-form" onsubmit="return false;">
                    <div class="payment-methods">
                        <h4>결제 수단 선택</h4>
                        <label class="payment-method">
                            <input type="radio" name="payment" value="card" checked>
                            <span>💳 신용/체크카드</span>
                        </label>
                        <label class="payment-method">
                            <input type="radio" name="payment" value="kakao">
                            <span>🟨 카카오페이</span>
                        </label>
                        <label class="payment-method">
                            <input type="radio" name="payment" value="naver">
                            <span>🟩 네이버페이</span>
                        </label>
                        <label class="payment-method">
                            <input type="radio" name="payment" value="phone">
                            <span>📱 휴대폰 결제</span>
                        </label>
                    </div>
                    
                    <div class="auto-renew">
                        <label>
                            <input type="checkbox" id="auto-renew" checked>
                            자동 갱신 (언제든 해지 가능)
                        </label>
                    </div>
                    
                    <div class="environment-info" style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #2196f3;">
                        <h5 style="margin: 0 0 8px 0; color: #1976d2;">🌐 웹 브라우저 결제 환경</h5>
                        <p style="margin: 0; font-size: 13px; color: #424242;">
                            현재 웹에서 이용 중입니다. 카드결제, 간편결제 등을 지원합니다.<br>
                            📱 <strong>앱 설치 시</strong> Google Play/App Store 결제로 자동 전환됩니다.
                        </p>
                    </div>
                    
                    <div class="payment-info">
                        <p>🔒 결제 정보는 안전하게 암호화됩니다</p>
                        <p>💰 첫 결제 후 30일마다 자동 청구됩니다</p>
                        <p>🚫 언제든지 구독을 해지할 수 있습니다</p>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-pay" onclick="subscriptionManager.processPayment('${planId}')">
                            결제하기
                        </button>
                        <button type="button" class="btn-cancel" onclick="this.closest('.payment-modal').remove()">
                            취소
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(paymentModal);
    }
    
    /**
     * 결제 처리
     */
    async processPayment(planId) {
        try {
            const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
            const autoRenew = document.getElementById('auto-renew').checked;
            
            console.log(`💳 결제 처리 중... 플랜: ${planId}, 방법: ${paymentMethod}`);
            
            // 아임포트 결제 초기화
            await this.initializePayment(planId, paymentMethod, autoRenew);
            
        } catch (error) {
            console.error('결제 처리 실패:', error);
            ErrorHandler.handle(error, 'payment_process');
        }
    }
    
    /**
     * 아임포트 결제 초기화
     */
    async initializePayment(planId, paymentMethod, autoRenew) {
        const plan = this.plans[planId];
        
        // 아임포트 가맹점 식별코드 (실제 서비스에서는 환경변수로 관리)
        const IMP_CODE = 'imp00000000'; // 테스트용 코드
        
        // 주문 번호 생성
        const merchantUid = `lonely_care_${Date.now()}_${this.currentUser.id}`;
        
        // 결제 요청 데이터
        const paymentData = {
            pg: this.getPgProvider(paymentMethod),
            pay_method: paymentMethod,
            merchant_uid: merchantUid,
            name: `lonely-care ${plan.name}`,
            amount: plan.price,
            buyer_email: this.currentUser.email || '',
            buyer_name: this.currentUser.name || '',
            buyer_tel: this.currentUser.phone || '',
            m_redirect_url: `${window.location.origin}/lonely-care/payment-complete.html`
        };
        
        // 아임포트 SDK 로드 확인
        if (!window.IMP) {
            console.log('🔄 아임포트 SDK 로드 중...');
            await this.loadIamportSDK();
        }
        
        // 아임포트 초기화
        window.IMP.init(IMP_CODE);
        
        // 결제 요청
        window.IMP.request_pay(paymentData, async (response) => {
            if (response.success) {
                await this.onPaymentSuccess(response, planId, autoRenew);
            } else {
                this.onPaymentFailure(response);
            }
        });
    }
    
    /**
     * PG사 제공자 매핑
     */
    getPgProvider(paymentMethod) {
        const providers = {
            'card': 'nice',
            'kakao': 'kakaopay',
            'naver': 'naverpay',
            'phone': 'danal'
        };
        return providers[paymentMethod] || 'nice';
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
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 결제 성공 처리
     */
    async onPaymentSuccess(response, planId, autoRenew) {
        console.log('✅ 결제 성공:', response);
        
        try {
            // 구독 정보 업데이트
            const subscription = {
                userId: this.currentUser.id,
                plan: planId,
                status: 'active',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
                paymentMethod: response.pay_method,
                autoRenew: autoRenew,
                lastPayment: {
                    impUid: response.imp_uid,
                    merchantUid: response.merchant_uid,
                    amount: response.paid_amount,
                    paidAt: new Date(response.paid_at * 1000).toISOString()
                },
                updatedAt: new Date().toISOString()
            };
            
            // Firebase에 저장
            await window.firebaseClient.setDocument('subscriptions', this.currentUser.id, subscription);
            
            // 결제 내역 저장
            await this.savePaymentHistory(response, planId);
            
            // 상태 업데이트
            this.subscriptionStatus = subscription;
            
            // UI 업데이트
            this.updateUI();
            
            // 모달 닫기
            document.querySelector('.payment-modal')?.remove();
            
            // 성공 메시지
            this.showSuccessMessage(planId);
            
        } catch (error) {
            console.error('구독 정보 저장 실패:', error);
            // 결제는 성공했으나 DB 저장 실패 시 관리자에게 알림
            this.notifyAdminPaymentIssue(response, error);
        }
    }
    
    /**
     * 결제 실패 처리
     */
    onPaymentFailure(response) {
        console.error('❌ 결제 실패:', response);
        
        let errorMessage = '결제에 실패했습니다.';
        if (response.error_msg) {
            errorMessage += ` (${response.error_msg})`;
        }
        
        if (window.NotificationHelper) {
            NotificationHelper.showError(errorMessage, 'payment_failed');
        }
        
        // 실패 로그 저장
        this.logPaymentFailure(response);
    }
    
    /**
     * 결제 내역 저장
     */
    async savePaymentHistory(paymentResponse, planId) {
        const history = {
            userId: this.currentUser.id,
            planId: planId,
            impUid: paymentResponse.imp_uid,
            merchantUid: paymentResponse.merchant_uid,
            amount: paymentResponse.paid_amount,
            payMethod: paymentResponse.pay_method,
            status: 'paid',
            paidAt: new Date(paymentResponse.paid_at * 1000).toISOString(),
            createdAt: new Date().toISOString()
        };
        
        try {
            await window.firebaseClient.setDocument(
                'payment_history', 
                paymentResponse.merchant_uid, 
                history
            );
            console.log('💾 결제 내역 저장 완료');
        } catch (error) {
            console.error('결제 내역 저장 실패:', error);
        }
    }
    
    /**
     * 성공 메시지 표시
     */
    showSuccessMessage(planId) {
        const plan = this.plans[planId];
        
        const successModal = document.createElement('div');
        successModal.className = 'success-modal';
        successModal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="success-content">
                <div class="success-icon">🎉</div>
                <h2>결제가 완료되었습니다!</h2>
                <p>${plan.name}으로 업그레이드되었습니다</p>
                <p>이제 최대 ${plan.maxFriends}명의 친구를 보호할 수 있습니다</p>
                <button class="btn-confirm" onclick="this.closest('.success-modal').remove()">
                    확인
                </button>
            </div>
        `;
        
        document.body.appendChild(successModal);
        
        // 3초 후 자동으로 닫기
        setTimeout(() => {
            successModal.remove();
        }, 3000);
    }
    
    /**
     * 업그레이드 성공 처리
     */
    async handleUpgradeSuccess(planId) {
        try {
            // 구독 상태 새로고침
            await this.loadSubscriptionStatus();
            
            // 친구 수 업데이트
            await this.updateFriendsCount();
            
            // UI 업데이트
            this.updateUI();
            
            console.log(`✅ [생명구조] 업그레이드 성공 처리 완료: ${planId}`);
            
        } catch (error) {
            console.error('❌ [생명구조] 업그레이드 성공 처리 실패:', error);
        }
    }
    
    /**
     * 업그레이드 실패 처리
     */
    handleUpgradeFailure(errorMessage) {
        console.error('❌ [생명구조] 업그레이드 실패:', errorMessage);
        
        if (window.NotificationHelper) {
            NotificationHelper.showError(
                `플랜 업그레이드에 실패했습니다: ${errorMessage}`,
                'upgrade_failed'
            );
        } else {
            alert(`플랜 업그레이드에 실패했습니다: ${errorMessage}`);
        }
    }
    
    /**
     * UI 초기화
     */
    initializeUI() {
        // 요금제 상태 표시 요소 추가
        this.addSubscriptionStatusUI();
        
        // 친구 추가 버튼 이벤트 수정
        this.modifyAddFriendButton();
        
        // 설정 메뉴에 구독 관리 추가
        this.addSubscriptionMenuItem();
    }
    
    /**
     * 구독 상태 UI 추가 - 생명구조 앱에서는 비활성화
     */
    addSubscriptionStatusUI() {
        // 🚨 생명구조 앱: 구독 상태 UI 표시 안함
        // 사용자가 생명 구조에 집중할 수 있도록 불필요한 플랜 정보는 숨김
        console.log('ℹ️ 생명구조 앱: 구독 상태 UI 표시 비활성화됨');
        return;
        
        // 기존 코드 주석 처리
        /*
        const statusContainer = document.createElement('div');
        statusContainer.id = 'subscription-status';
        statusContainer.className = 'subscription-status';
        
        this.updateStatusUI(statusContainer);
        
        // 헤더에 추가
        const header = document.querySelector('.app-header');
        if (header) {
            header.appendChild(statusContainer);
        }
        */
    }
    
    /**
     * 상태 UI 업데이트
     */
    updateStatusUI(container = null) {
        if (!container) {
            container = document.getElementById('subscription-status');
        }
        if (!container) return;
        
        const plan = this.plans[this.subscriptionStatus?.plan || 'FREE'];
        const remainingFriends = plan.maxFriends - this.friendsCount;
        
        container.innerHTML = `
            <div class="plan-badge ${plan.id.toLowerCase()}">
                ${plan.name}
            </div>
            <div class="friends-limit">
                친구 ${this.friendsCount}/${plan.maxFriends}명
            </div>
            ${remainingFriends > 0 ? 
                `<div class="remaining">${remainingFriends}명 더 추가 가능</div>` : 
                `<div class="upgrade-hint">업그레이드 필요</div>`
            }
        `;
    }
    
    /**
     * 친구 추가 버튼 수정
     */
    modifyAddFriendButton() {
        // 기존 친구 추가 버튼에 제한 체크 추가
        const originalAddFriend = window.addFriendByInviteCode;
        
        window.addFriendByInviteCode = async () => {
            // 친구 추가 가능 여부 확인
            if (!this.canAddFriend()) {
                return;
            }
            
            // 원래 함수 실행
            if (originalAddFriend) {
                await originalAddFriend();
                
                // 친구 수 업데이트
                await this.updateFriendsCount();
            }
        };
    }
    
    /**
     * 구독 관리 메뉴 추가
     */
    addSubscriptionMenuItem() {
        const settingsMenu = document.querySelector('.settings-menu');
        if (!settingsMenu) return;
        
        const subscriptionItem = document.createElement('div');
        subscriptionItem.className = 'settings-item';
        subscriptionItem.innerHTML = `
            <i class="icon-subscription">💳</i>
            <span>구독 관리</span>
        `;
        
        subscriptionItem.onclick = () => this.showSubscriptionManagement();
        
        settingsMenu.insertBefore(subscriptionItem, settingsMenu.firstChild);
    }
    
    /**
     * 구독 관리 페이지 표시
     */
    showSubscriptionManagement() {
        const modal = document.createElement('div');
        modal.className = 'subscription-management-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="management-content">
                <h2>💳 구독 관리</h2>
                
                ${this.renderCurrentPlan()}
                ${this.renderAvailablePlans()}
                ${this.renderPaymentHistory()}
                
                <div class="modal-actions">
                    <button class="btn-close" onclick="this.closest('.subscription-management-modal').remove()">
                        닫기
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * 현재 플랜 렌더링
     */
    renderCurrentPlan() {
        const plan = this.plans[this.subscriptionStatus?.plan || 'FREE'];
        const endDate = this.subscriptionStatus?.endDate ? 
            new Date(this.subscriptionStatus.endDate).toLocaleDateString() : 
            '무제한';
        
        return `
            <div class="current-plan-section">
                <h3>현재 이용 중인 플랜</h3>
                <div class="current-plan-card">
                    <div class="plan-header">
                        <h4>${plan.name}</h4>
                        <div class="plan-price">${plan.price.toLocaleString()}원/월</div>
                    </div>
                    <div class="plan-details">
                        <p>친구 제한: ${plan.maxFriends}명</p>
                        <p>만료일: ${endDate}</p>
                        <p>자동갱신: ${this.subscriptionStatus?.autoRenew ? '활성' : '비활성'}</p>
                    </div>
                    ${this.subscriptionStatus?.plan !== 'FREE' ? `
                        <div class="plan-actions">
                            <button class="btn-secondary" onclick="subscriptionManager.toggleAutoRenew()">
                                자동갱신 ${this.subscriptionStatus?.autoRenew ? '해제' : '설정'}
                            </button>
                            <button class="btn-danger" onclick="subscriptionManager.cancelSubscription()">
                                구독 해지
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 사용 가능한 플랜 렌더링
     */
    renderAvailablePlans() {
        const currentPlanId = this.subscriptionStatus?.plan || 'FREE';
        
        return `
            <div class="available-plans-section">
                <h3>플랜 변경</h3>
                <div class="plans-grid">
                    ${Object.values(this.plans).map(plan => `
                        <div class="plan-card ${plan.id === currentPlanId ? 'current' : ''}">
                            <h4>${plan.name}</h4>
                            <div class="plan-price">${plan.price.toLocaleString()}원/월</div>
                            <ul class="plan-features">
                                ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                            </ul>
                            ${plan.id !== currentPlanId ? `
                                <button class="btn-primary" onclick="subscriptionManager.changePlan('${plan.id}')">
                                    ${plan.price > this.plans[currentPlanId].price ? '업그레이드' : '변경'}
                                </button>
                            ` : '<div class="current-badge">현재 플랜</div>'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * 결제 내역 렌더링
     */
    renderPaymentHistory() {
        return `
            <div class="payment-history-section">
                <h3>결제 내역</h3>
                <div id="payment-history-list" class="payment-history-list">
                    <div class="loading">불러오는 중...</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 자동갱신 토글 - 크로스 플랫폼 결제 시스템 사용
     */
    async toggleAutoRenew() {
        try {
            const newAutoRenew = !this.subscriptionStatus.autoRenew;
            console.log(`🔄 [생명구조] 자동갱신 토글: ${newAutoRenew}`);
            
            // 크로스 플랫폼 결제 시스템 사용 (개선된 처리)
            if (window.crossPlatformPayment) {
                // 초기화 대기 및 재시도
                if (!window.crossPlatformPayment.isInitialized) {
                    console.log('🔄 [생명구조] 결제 시스템 초기화 중...');
                    try {
                        await window.crossPlatformPayment.init();
                    } catch (initError) {
                        console.warn('⚠️ [생명구조] 결제 시스템 초기화 실패, Firebase로 대체:', initError);
                        // 초기화 실패 시 Firebase로 대체
                        await this.fallbackToggleAutoRenew(newAutoRenew);
                        return;
                    }
                }
                
                const result = await window.crossPlatformPayment.toggleAutoRenew(newAutoRenew);
                
                if (result.success) {
                    this.subscriptionStatus.autoRenew = result.autoRenew;
                    
                    // UI 업데이트
                    this.showSubscriptionManagement();
                    
                    if (window.NotificationHelper) {
                        NotificationHelper.showSuccess(
                            `자동갱신이 ${result.autoRenew ? '활성화' : '비활성화'}되었습니다`
                        );
                    }
                } else {
                    // 플랫폼별 추가 동작이 필요한 경우
                    if (result.needsUserAction) {
                        if (window.NotificationHelper) {
                            NotificationHelper.showInfo(result.message || '앱스토어에서 자동갱신을 설정해주세요');
                        }
                    } else {
                        throw new Error(result.error);
                    }
                }
            } else {
                // Fallback: Firebase만 업데이트
                await this.fallbackToggleAutoRenew(newAutoRenew);
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 자동갱신 설정 변경 실패:', error);
            ErrorHandler.handle(error, 'toggle_autorenew');
        }
    }
    
    /**
     * 구독 해지 - 크로스 플랫폼 결제 시스템 사용
     */
    async cancelSubscription() {
        if (!confirm('정말로 구독을 해지하시겠습니까?\n남은 기간 동안은 계속 이용하실 수 있습니다.')) {
            return;
        }
        
        try {
            console.log('🚫 [생명구조] 구독 해지 시작');
            
            // 크로스 플랫폼 결제 시스템 사용 (개선된 처리)
            if (window.crossPlatformPayment) {
                // 초기화 대기 및 재시도
                if (!window.crossPlatformPayment.isInitialized) {
                    console.log('🔄 [생명구조] 결제 시스템 초기화 중...');
                    try {
                        await window.crossPlatformPayment.init();
                    } catch (initError) {
                        console.warn('⚠️ [생명구조] 결제 시스템 초기화 실패, Firebase로 대체:', initError);
                        // 초기화 실패 시 Firebase로 대체
                        await this.fallbackCancelSubscription();
                        return;
                    }
                }
                
                const currentSubscription = this.subscriptionStatus;
                const subscriptionId = currentSubscription?.lastPayment?.merchantUid || 
                                      currentSubscription?.planId;
                
                const result = await window.crossPlatformPayment.cancelSubscription(subscriptionId);
                
                if (result.success) {
                    // 로컬 상태 업데이트
                    this.subscriptionStatus.autoRenew = false;
                    this.subscriptionStatus.status = 'pending_cancellation';
                    this.subscriptionStatus.cancelledAt = new Date().toISOString();
                    
                    // UI 업데이트
                    document.querySelector('.subscription-management-modal')?.remove();
                    this.updateUI();
                    
                    if (window.NotificationHelper) {
                        const message = result.needsUserAction ? 
                            result.message :
                            `구독이 해지되었습니다. ${this.subscriptionStatus.endDate}까지 이용 가능합니다.`;
                        NotificationHelper.showInfo(message);
                    }
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback: Firebase만 업데이트
                await this.fallbackCancelSubscription();
            }
            
        } catch (error) {
            console.error('❌ [생명구조] 구독 해지 실패:', error);
            ErrorHandler.handle(error, 'cancel_subscription');
        }
    }
    
    /**
     * 플랜 변경
     */
    async changePlan(newPlanId) {
        const currentPlanId = this.subscriptionStatus?.plan || 'FREE';
        const newPlan = this.plans[newPlanId];
        const currentPlan = this.plans[currentPlanId];
        
        // 다운그레이드 시 친구 수 확인
        if (newPlan.maxFriends < this.friendsCount) {
            alert(`현재 친구 수(${this.friendsCount}명)가 선택한 플랜의 제한(${newPlan.maxFriends}명)을 초과합니다.\n먼저 친구 수를 줄여주세요.`);
            return;
        }
        
        // 업그레이드 또는 다운그레이드 처리
        if (newPlan.price > currentPlan.price || currentPlanId === 'FREE') {
            // 업그레이드 - 즉시 결제
            await this.startUpgrade(newPlanId);
        } else {
            // 다운그레이드 - 다음 결제일부터 적용
            await this.scheduleDowngrade(newPlanId);
        }
    }
    
    /**
     * 다운그레이드 예약
     */
    async scheduleDowngrade(newPlanId) {
        if (!confirm('다운그레이드는 다음 결제일부터 적용됩니다.\n계속하시겠습니까?')) {
            return;
        }
        
        try {
            await window.firebaseClient.updateDocument(
                'subscriptions', 
                this.currentUser.id, 
                { 
                    scheduledPlan: newPlanId,
                    scheduledAt: new Date().toISOString()
                }
            );
            
            if (window.NotificationHelper) {
                NotificationHelper.showSuccess(
                    `다음 결제일부터 ${this.plans[newPlanId].name}으로 변경됩니다`
                );
            }
            
            // 모달 닫기
            document.querySelector('.subscription-management-modal')?.remove();
            
        } catch (error) {
            console.error('다운그레이드 예약 실패:', error);
            ErrorHandler.handle(error, 'schedule_downgrade');
        }
    }
    
    /**
     * UI 전체 업데이트
     */
    updateUI() {
        this.updateStatusUI();
        this.updateSubscriptionUI();
        
        // 친구 목록 UI 업데이트
        if (window.friendStatusMonitor) {
            window.friendStatusMonitor.loadFriendsStatus();
        }
    }
    
    /**
     * 구독 관리 UI 업데이트
     */
    updateSubscriptionUI() {
        try {
            const plan = this.plans[this.subscriptionStatus?.plan || 'FREE'];
            
            // 현재 플랜 이름 업데이트
            const planNameElement = document.getElementById('current-plan-name');
            if (planNameElement) {
                planNameElement.textContent = plan.name;
            }
            
            // 구독 상세 정보 업데이트
            const detailsElement = document.getElementById('subscription-details-text');
            if (detailsElement) {
                detailsElement.textContent = `친구 ${plan.maxFriends}명까지 모니터링 가능`;
            }
            
            // 만료일 정보 업데이트
            const expiryElement = document.getElementById('subscription-expiry');
            const expiryDateElement = document.getElementById('expiry-date');
            if (expiryElement && expiryDateElement) {
                if (this.subscriptionStatus?.endDate && this.subscriptionStatus.plan !== 'FREE') {
                    expiryElement.style.display = 'block';
                    const endDate = new Date(this.subscriptionStatus.endDate);
                    expiryDateElement.textContent = endDate.toLocaleDateString('ko-KR');
                } else {
                    expiryElement.style.display = 'none';
                }
            }
            
            // 버튼 상태 업데이트
            this.updateSubscriptionButtons();
            
            console.log('✅ [생명구조] 구독 UI 업데이트 완료');
            
        } catch (error) {
            console.error('❌ [생명구조] 구독 UI 업데이트 실패:', error);
        }
    }
    
    /**
     * 구독 관리 버튼 상태 업데이트
     */
    updateSubscriptionButtons() {
        const currentPlan = this.subscriptionStatus?.plan || 'FREE';
        
        // 업그레이드 버튼들
        const basicBtn = document.getElementById('basic-upgrade-btn');
        const premiumBtn = document.getElementById('premium-upgrade-btn');
        const autoRenewBtn = document.getElementById('auto-renew-toggle-btn');
        const cancelBtn = document.getElementById('cancel-subscription-btn');
        
        if (basicBtn) {
            if (currentPlan === 'FREE') {
                basicBtn.style.display = 'block';
                basicBtn.textContent = '🚀 베이직 플랜 업그레이드 (월 2,000원)';
            } else if (currentPlan === 'BASIC') {
                basicBtn.style.display = 'none';
            } else if (currentPlan === 'PREMIUM') {
                basicBtn.style.display = 'block';
                basicBtn.textContent = '⬇️ 베이직 플랜으로 다운그레이드';
            }
        }
        
        if (premiumBtn) {
            if (currentPlan === 'FREE' || currentPlan === 'BASIC') {
                premiumBtn.style.display = 'block';
                premiumBtn.textContent = '⭐ 프리미엄 플랜 업그레이드 (월 5,000원)';
            } else if (currentPlan === 'PREMIUM') {
                premiumBtn.style.display = 'none';
            }
        }
        
        // 자동갱신 및 해지 버튼 (유료 플랜만)
        if (autoRenewBtn && cancelBtn) {
            if (currentPlan !== 'FREE') {
                autoRenewBtn.style.display = 'block';
                cancelBtn.style.display = 'block';
                
                // 자동갱신 버튼 텍스트 업데이트
                const isAutoRenew = this.subscriptionStatus?.autoRenew !== false;
                autoRenewBtn.textContent = isAutoRenew ? 
                    '🔄 자동갱신 끄기' : 
                    '🔄 자동갱신 켜기';
                autoRenewBtn.style.background = isAutoRenew ? '#dc3545' : '#28a745';
            } else {
                autoRenewBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
            }
        }
        
        // 플랜 카드 강조 표시
        this.highlightCurrentPlan(currentPlan);
    }
    
    /**
     * 현재 플랜 카드 강조 표시
     */
    highlightCurrentPlan(currentPlan) {
        const planCards = document.querySelectorAll('.plan-card');
        planCards.forEach((card, index) => {
            const planIds = ['FREE', 'BASIC', 'PREMIUM'];
            const cardPlan = planIds[index];
            
            if (cardPlan === currentPlan) {
                card.style.borderColor = '#28a745';
                card.style.borderWidth = '3px';
                card.style.background = '#e8f5e9';
                
                // "현재 플랜" 배지 추가
                const existingBadge = card.querySelector('.current-plan-badge');
                if (!existingBadge) {
                    const badge = document.createElement('div');
                    badge.className = 'current-plan-badge';
                    badge.style.cssText = `
                        background: #28a745;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: bold;
                        margin-top: 8px;
                    `;
                    badge.textContent = '현재 플랜';
                    card.appendChild(badge);
                }
            } else {
                card.style.borderColor = '#ddd';
                card.style.borderWidth = '2px';
                card.style.background = 'white';
                
                // 기존 배지 제거
                const existingBadge = card.querySelector('.current-plan-badge');
                if (existingBadge) {
                    existingBadge.remove();
                }
            }
        });
    }
    
    /**
     * 결제 실패 로그
     */
    async logPaymentFailure(response) {
        try {
            await window.firebaseClient.setDocument(
                'payment_failures',
                `failure_${Date.now()}_${this.currentUser.id}`,
                {
                    userId: this.currentUser.id,
                    response: response,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('결제 실패 로그 저장 실패:', error);
        }
    }
    
    /**
     * 관리자에게 결제 이슈 알림
     */
    async notifyAdminPaymentIssue(paymentResponse, error) {
        try {
            await window.firebaseClient.setDocument(
                'admin_alerts',
                `payment_issue_${Date.now()}`,
                {
                    type: 'payment_db_error',
                    userId: this.currentUser.id,
                    paymentResponse: paymentResponse,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    resolved: false
                }
            );
        } catch (e) {
            console.error('관리자 알림 실패:', e);
        }
    }
    
    /**
     * Firebase 대체 자동갱신 토글
     */
    async fallbackToggleAutoRenew(newAutoRenew) {
        await window.firebaseClient.updateDocument(
            'subscriptions', 
            this.currentUser.id, 
            { autoRenew: newAutoRenew }
        );
        
        this.subscriptionStatus.autoRenew = newAutoRenew;
        
        // UI 업데이트
        this.showSubscriptionManagement();
        
        if (window.NotificationHelper) {
            NotificationHelper.showSuccess(
                `자동갱신이 ${newAutoRenew ? '활성화' : '비활성화'}되었습니다`
            );
        }
    }
    
    /**
     * Firebase 대체 구독 해지
     */
    async fallbackCancelSubscription() {
        await window.firebaseClient.updateDocument(
            'subscriptions', 
            this.currentUser.id, 
            { 
                autoRenew: false,
                cancelledAt: new Date().toISOString(),
                status: 'pending_cancellation'
            }
        );
        
        this.subscriptionStatus.autoRenew = false;
        this.subscriptionStatus.status = 'pending_cancellation';
        
        // UI 업데이트
        document.querySelector('.subscription-management-modal')?.remove();
        this.updateUI();
        
        if (window.NotificationHelper) {
            NotificationHelper.showInfo(
                `구독이 해지되었습니다. ${this.subscriptionStatus.endDate}까지 이용 가능합니다.`
            );
        }
    }
}

// 전역 인스턴스 생성
window.subscriptionManager = new SubscriptionManager();

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
    /* 구독 상태 UI */
    .subscription-status {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        font-size: 14px;
    }
    
    .plan-badge {
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 12px;
    }
    
    .plan-badge.free {
        background: #6c757d;
        color: white;
    }
    
    .plan-badge.basic {
        background: #17a2b8;
        color: white;
    }
    
    .plan-badge.premium {
        background: #ffc107;
        color: #000;
    }
    
    .friends-limit {
        color: #666;
    }
    
    .remaining {
        color: #28a745;
        font-size: 12px;
    }
    
    .upgrade-hint {
        color: #dc3545;
        font-size: 12px;
        cursor: pointer;
    }
    
    /* 업그레이드 모달 */
    .subscription-upgrade-modal,
    .payment-modal,
    .success-modal,
    .subscription-management-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
    }
    
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content,
    .payment-content,
    .success-content,
    .management-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .current-status {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
    }
    
    .current-status p {
        margin: 5px 0;
    }
    
    .upgrade-recommendation {
        border: 2px solid #007bff;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
    }
    
    .plan-price {
        font-size: 24px;
        font-weight: bold;
        color: #007bff;
        margin: 10px 0;
    }
    
    .plan-features {
        list-style: none;
        padding: 0;
    }
    
    .plan-features li {
        padding: 8px 0;
        border-bottom: 1px solid #eee;
    }
    
    .modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 30px;
        justify-content: center;
    }
    
    .btn-upgrade,
    .btn-pay {
        background: #007bff;
        color: white;
        padding: 12px 30px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
    }
    
    .btn-cancel {
        background: #6c757d;
        color: white;
        padding: 12px 30px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }
    
    .upgrade-note {
        text-align: center;
        color: #666;
        font-style: italic;
        margin-top: 20px;
    }
    
    /* 결제 페이지 */
    .selected-plan {
        background: #e3f2fd;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
    }
    
    .payment-methods {
        margin: 20px 0;
    }
    
    .payment-method {
        display: block;
        padding: 15px;
        margin: 10px 0;
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .payment-method:hover {
        border-color: #007bff;
        background: #f8f9fa;
    }
    
    .payment-method input[type="radio"] {
        margin-right: 10px;
    }
    
    .auto-renew {
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .payment-info {
        background: #e8f5e9;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        font-size: 14px;
    }
    
    .payment-info p {
        margin: 5px 0;
    }
    
    /* 성공 모달 */
    .success-icon {
        font-size: 72px;
        text-align: center;
        margin-bottom: 20px;
    }
    
    .success-content {
        text-align: center;
    }
    
    .btn-confirm {
        background: #28a745;
        color: white;
        padding: 12px 30px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
    }
    
    /* 구독 관리 */
    .current-plan-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin: 10px 0;
    }
    
    .plan-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .plan-details p {
        margin: 5px 0;
        color: #666;
    }
    
    .plan-actions {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }
    
    .btn-secondary {
        background: #6c757d;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .btn-danger {
        background: #dc3545;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 20px 0;
    }
    
    .plan-card {
        border: 2px solid #ddd;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        transition: all 0.3s;
    }
    
    .plan-card.current {
        border-color: #28a745;
        background: #e8f5e9;
    }
    
    .plan-card:hover:not(.current) {
        border-color: #007bff;
        transform: translateY(-2px);
    }
    
    .current-badge {
        background: #28a745;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        margin-top: 15px;
        display: inline-block;
    }
    
    .btn-primary {
        background: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        margin-top: 15px;
    }
    
    .payment-history-list {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
    }
    
    /* 반응형 디자인 */
    @media (max-width: 768px) {
        .subscription-status {
            font-size: 12px;
            padding: 6px 12px;
        }
        
        .plans-grid {
            grid-template-columns: 1fr;
        }
        
        .modal-content,
        .payment-content,
        .success-content,
        .management-content {
            width: 95%;
            padding: 20px;
        }
    }
`;

// CSS 스타일 추가
document.head.appendChild(style);

// 전역 인스턴스 생성 (안전한 초기화)
if (!window.subscriptionManager) {
    window.subscriptionManager = new SubscriptionManager();
    console.log('💳 Subscription Manager 로드 완료');
} else {
    console.log('ℹ️ Subscription Manager 이미 로드됨');
}