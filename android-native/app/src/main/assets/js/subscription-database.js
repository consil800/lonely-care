/**
 * 🎯 Subscription Database Schema
 * 요금제 시스템을 위한 Firebase 데이터베이스 스키마 및 초기화
 */

class SubscriptionDatabase {
    constructor() {
        this.firebaseClient = window.firebaseClient;
        this.collections = {
            subscriptions: 'subscriptions',
            paymentHistory: 'payment_history',
            paymentFailures: 'payment_failures',
            adminAlerts: 'admin_alerts',
            planUsage: 'plan_usage'
        };
    }
    
    /**
     * 데이터베이스 스키마 초기화
     */
    async initializeSchema() {
        try {
            console.log('💾 요금제 데이터베이스 스키마 초기화 중...');
            
            // 구독 컬렉션 인덱스 생성
            await this.createSubscriptionIndexes();
            
            // 결제 내역 컬렉션 인덱스 생성
            await this.createPaymentIndexes();
            
            // 기본 플랜 데이터 생성
            await this.createDefaultPlans();
            
            console.log('✅ 요금제 데이터베이스 스키마 초기화 완료');
            
        } catch (error) {
            console.error('❌ 데이터베이스 스키마 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 구독 컬렉션 문서 구조
     */
    getSubscriptionSchema() {
        return {
            userId: '', // string - 사용자 ID
            plan: '', // string - FREE, BASIC, PREMIUM
            status: '', // string - active, pending_cancellation, cancelled, expired
            startDate: '', // ISO string - 구독 시작일
            endDate: '', // ISO string - 구독 만료일 (null이면 무제한)
            paymentMethod: '', // string - card, kakao, naver, phone
            autoRenew: false, // boolean - 자동 갱신 여부
            lastPayment: {
                impUid: '', // 아임포트 결제 고유번호
                merchantUid: '', // 가맹점 주문번호
                amount: 0, // number - 결제 금액
                paidAt: '' // ISO string - 결제일시
            },
            scheduledPlan: '', // string - 예약된 플랜 (다운그레이드용)
            scheduledAt: '', // ISO string - 플랜 변경 예약일
            cancelledAt: '', // ISO string - 해지 신청일
            createdAt: '', // ISO string - 생성일
            updatedAt: '' // ISO string - 수정일
        };
    }
    
    /**
     * 결제 내역 문서 구조
     */
    getPaymentHistorySchema() {
        return {
            userId: '', // string - 사용자 ID
            planId: '', // string - 플랜 ID
            impUid: '', // string - 아임포트 결제 고유번호
            merchantUid: '', // string - 가맹점 주문번호
            amount: 0, // number - 결제 금액
            payMethod: '', // string - 결제 수단
            status: '', // string - paid, failed, cancelled, refunded
            paidAt: '', // ISO string - 결제일시
            refundedAt: '', // ISO string - 환불일시 (해당시)
            createdAt: '' // ISO string - 생성일
        };
    }
    
    /**
     * 플랜 사용량 추적 문서 구조
     */
    getPlanUsageSchema() {
        return {
            userId: '', // string - 사용자 ID
            plan: '', // string - 현재 플랜
            friendsCount: 0, // number - 현재 친구 수
            maxFriendsUsed: 0, // number - 최대 사용한 친구 수
            lastUpdated: '', // ISO string - 마지막 업데이트
            monthlyStats: {
                year: 0, // number - 연도
                month: 0, // number - 월
                averageFriends: 0, // number - 월 평균 친구 수
                peakFriends: 0, // number - 월 최대 친구 수
                planChangeCount: 0 // number - 월 플랜 변경 횟수
            }
        };
    }
    
    /**
     * 구독 컬렉션 인덱스 생성
     */
    async createSubscriptionIndexes() {
        // Firebase에서는 복합 인덱스가 필요한 쿼리를 미리 정의해야 함
        const indexQueries = [
            // 사용자별 활성 구독 조회
            { collection: 'subscriptions', fields: ['userId', 'status'] },
            // 만료 예정 구독 조회
            { collection: 'subscriptions', fields: ['status', 'endDate'] },
            // 자동 갱신 대상 조회
            { collection: 'subscriptions', fields: ['autoRenew', 'endDate'] }
        ];
        
        console.log('📊 구독 인덱스 설정 정보:', indexQueries);
        // 실제 인덱스는 Firebase Console 또는 firestore.indexes.json에서 설정
    }
    
    /**
     * 결제 내역 인덱스 생성
     */
    async createPaymentIndexes() {
        const indexQueries = [
            // 사용자별 결제 내역 조회
            { collection: 'payment_history', fields: ['userId', 'paidAt'] },
            // 결제 상태별 조회
            { collection: 'payment_history', fields: ['status', 'paidAt'] },
            // 플랜별 결제 통계
            { collection: 'payment_history', fields: ['planId', 'status', 'paidAt'] }
        ];
        
        console.log('💳 결제 인덱스 설정 정보:', indexQueries);
    }
    
    /**
     * 기본 플랜 데이터 생성
     */
    async createDefaultPlans() {
        const defaultPlans = {
            FREE: {
                id: 'FREE',
                name: '무료 플랜',
                price: 0,
                maxFriends: 1,
                features: [
                    '친구 1명 모니터링',
                    '기본 알림 기능',
                    '24/48/72시간 알림'
                ],
                active: true,
                createdAt: new Date().toISOString()
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
                ],
                active: true,
                createdAt: new Date().toISOString()
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
                ],
                active: true,
                createdAt: new Date().toISOString()
            }
        };
        
        try {
            // plans 컬렉션에 기본 플랜 저장
            for (const [planId, planData] of Object.entries(defaultPlans)) {
                await this.firebaseClient.setDocument('plans', planId, planData);
            }
            
            console.log('✅ 기본 플랜 데이터 생성 완료');
            
        } catch (error) {
            console.error('기본 플랜 생성 실패:', error);
        }
    }
    
    /**
     * 사용자 구독 생성
     */
    async createSubscription(userId, subscriptionData) {
        try {
            const subscription = {
                ...this.getSubscriptionSchema(),
                ...subscriptionData,
                userId: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await this.firebaseClient.setDocument(
                this.collections.subscriptions, 
                userId, 
                subscription
            );
            
            console.log('✅ 구독 생성 완료:', userId);
            return { success: true, data: subscription };
            
        } catch (error) {
            console.error('구독 생성 실패:', error);
            return { success: false, error };
        }
    }
    
    /**
     * 구독 업데이트
     */
    async updateSubscription(userId, updateData) {
        try {
            const updates = {
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            await this.firebaseClient.setDocument(
                this.collections.subscriptions,
                userId,
                updates,
                true // merge: true
            );
            
            console.log('✅ 구독 업데이트 완료:', userId);
            return { success: true };
            
        } catch (error) {
            console.error('구독 업데이트 실패:', error);
            return { success: false, error };
        }
    }
    
    /**
     * 결제 내역 저장
     */
    async savePaymentHistory(paymentData) {
        try {
            const payment = {
                ...this.getPaymentHistorySchema(),
                ...paymentData,
                createdAt: new Date().toISOString()
            };
            
            await this.firebaseClient.setDocument(
                this.collections.paymentHistory,
                paymentData.merchantUid,
                payment
            );
            
            console.log('✅ 결제 내역 저장 완료:', paymentData.merchantUid);
            return { success: true, data: payment };
            
        } catch (error) {
            console.error('결제 내역 저장 실패:', error);
            return { success: false, error };
        }
    }
    
    /**
     * 플랜 사용량 업데이트
     */
    async updatePlanUsage(userId, friendsCount) {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            
            const currentUser = window.auth?.getCurrentUser();
            const plan = window.subscriptionManager?.subscriptionStatus?.plan || 'FREE';
            
            const usageData = {
                userId: userId,
                plan: plan,
                friendsCount: friendsCount,
                maxFriendsUsed: friendsCount, // 나중에 max 계산 로직 추가
                lastUpdated: now.toISOString(),
                monthlyStats: {
                    year: year,
                    month: month,
                    averageFriends: friendsCount, // 나중에 평균 계산 로직 추가
                    peakFriends: friendsCount,
                    planChangeCount: 0
                }
            };
            
            await this.firebaseClient.setDocument(
                this.collections.planUsage,
                `${userId}_${year}_${month}`,
                usageData
            );
            
            console.log('✅ 플랜 사용량 업데이트 완료');
            return { success: true };
            
        } catch (error) {
            console.error('플랜 사용량 업데이트 실패:', error);
            return { success: false, error };
        }
    }
    
    /**
     * 구독 통계 조회
     */
    async getSubscriptionStats() {
        try {
            // 전체 구독 통계
            const stats = {
                totalUsers: 0,
                activeSubscriptions: 0,
                planDistribution: {
                    FREE: 0,
                    BASIC: 0,
                    PREMIUM: 0
                },
                monthlyRevenue: 0,
                churnRate: 0
            };
            
            // Firebase에서 실제 통계 데이터 조회
            // 복잡한 집계는 Cloud Functions에서 처리하는 것이 좋음
            
            return { success: true, data: stats };
            
        } catch (error) {
            console.error('구독 통계 조회 실패:', error);
            return { success: false, error };
        }
    }
    
    /**
     * 만료 예정 구독 조회
     */
    async getExpiringSubscriptions(daysFromNow = 3) {
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysFromNow);
            
            // Firebase 쿼리는 실제 구현에서 추가
            const result = await this.firebaseClient.queryDocuments(
                this.collections.subscriptions,
                [
                    ['status', '==', 'active'],
                    ['endDate', '<=', expiryDate.toISOString()]
                ]
            );
            
            return result;
            
        } catch (error) {
            console.error('만료 예정 구독 조회 실패:', error);
            return { data: [], error };
        }
    }
}

// 전역 인스턴스 생성
window.subscriptionDatabase = new SubscriptionDatabase();

console.log('💾 Subscription Database 모듈 로드 완료');