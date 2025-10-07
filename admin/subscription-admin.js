/**
 * 🎯 Subscription Admin Panel
 * 관리자용 요금제 및 결제 관리 시스템
 */

class SubscriptionAdmin {
    constructor() {
        this.firebaseClient = null;
        this.subscriptionStats = {
            totalRevenue: 0,
            activeSubscriptions: 0,
            totalUsers: 0,
            planDistribution: { FREE: 0, BASIC: 0, PREMIUM: 0 }
        };
        this.initialize();
    }
    
    /**
     * 초기화
     */
    async initialize() {
        try {
            console.log('💼 관리자 요금제 시스템 초기화...');
            
            // Firebase 클라이언트 대기
            await this.waitForFirebase();
            
            // 통계 데이터 로드
            await this.loadSubscriptionStats();
            
            console.log('✅ 관리자 요금제 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 관리자 요금제 시스템 초기화 실패:', error);
        }
    }
    
    /**
     * Firebase 클라이언트 대기
     */
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseClient && window.firebaseClient.isInitialized) {
                    this.firebaseClient = window.firebaseClient;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 500);
                }
            };
            checkFirebase();
        });
    }
    
    /**
     * 구독 통계 로드
     */
    async loadSubscriptionStats() {
        try {
            // 모든 구독 정보 조회
            const subscriptionsResult = await this.firebaseClient.queryDocuments('subscriptions');
            const subscriptions = subscriptionsResult.data || [];
            
            // 결제 내역 조회
            const paymentsResult = await this.firebaseClient.queryDocuments('payment_history');
            const payments = paymentsResult.data || [];
            
            // 통계 계산
            this.calculateStats(subscriptions, payments);
            
            // UI 업데이트
            this.updateStatsUI();
            
        } catch (error) {
            console.error('구독 통계 로드 실패:', error);
            this.showDefaultStats();
        }
    }
    
    /**
     * 통계 계산
     */
    calculateStats(subscriptions, payments) {
        // 기본값 초기화
        this.subscriptionStats = {
            totalRevenue: 0,
            monthlyRevenue: 0,
            activeSubscriptions: 0,
            totalUsers: subscriptions.length,
            planDistribution: { FREE: 0, BASIC: 0, PREMIUM: 0 },
            churnRate: 0,
            averageRevenuePerUser: 0
        };
        
        // 구독 통계
        subscriptions.forEach(sub => {
            if (sub.status === 'active') {
                this.subscriptionStats.activeSubscriptions++;
            }
            
            if (this.subscriptionStats.planDistribution[sub.plan] !== undefined) {
                this.subscriptionStats.planDistribution[sub.plan]++;
            }
        });
        
        // 결제 통계
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        payments.forEach(payment => {
            if (payment.status === 'paid') {
                this.subscriptionStats.totalRevenue += payment.amount;
                
                // 이번 달 매출
                const paymentDate = new Date(payment.paidAt);
                if (paymentDate >= thisMonth) {
                    this.subscriptionStats.monthlyRevenue += payment.amount;
                }
            }
        });
        
        // ARPU 계산
        if (this.subscriptionStats.activeSubscriptions > 0) {
            this.subscriptionStats.averageRevenuePerUser = 
                this.subscriptionStats.monthlyRevenue / this.subscriptionStats.activeSubscriptions;
        }
        
        console.log('📊 계산된 구독 통계:', this.subscriptionStats);
    }
    
    /**
     * 통계 UI 업데이트
     */
    updateStatsUI() {
        const stats = this.subscriptionStats;
        
        // 메인 통계 카드들
        document.getElementById('total-revenue').textContent = 
            `${stats.totalRevenue.toLocaleString()}원`;
        document.getElementById('monthly-revenue').textContent = 
            `${stats.monthlyRevenue.toLocaleString()}원`;
        document.getElementById('active-subscriptions').textContent = 
            stats.activeSubscriptions.toLocaleString();
        document.getElementById('total-users').textContent = 
            stats.totalUsers.toLocaleString();
        document.getElementById('average-arpu').textContent = 
            `${Math.round(stats.averageRevenuePerUser).toLocaleString()}원`;
        
        // 플랜 분포 차트 업데이트
        this.updatePlanDistributionChart();
        
        // 매출 트렌드 차트 업데이트
        this.updateRevenueChart();
    }
    
    /**
     * 플랜 분포 차트 업데이트
     */
    updatePlanDistributionChart() {
        const planChart = document.getElementById('plan-distribution-chart');
        if (!planChart) return;
        
        const stats = this.subscriptionStats;
        const total = stats.totalUsers || 1;
        
        const freePercent = (stats.planDistribution.FREE / total) * 100;
        const basicPercent = (stats.planDistribution.BASIC / total) * 100;
        const premiumPercent = (stats.planDistribution.PREMIUM / total) * 100;
        
        planChart.innerHTML = `
            <div class="chart-item">
                <div class="chart-bar" style="width: ${freePercent}%; background: #6c757d;"></div>
                <span>무료 (${stats.planDistribution.FREE}명, ${freePercent.toFixed(1)}%)</span>
            </div>
            <div class="chart-item">
                <div class="chart-bar" style="width: ${basicPercent}%; background: #17a2b8;"></div>
                <span>베이직 (${stats.planDistribution.BASIC}명, ${basicPercent.toFixed(1)}%)</span>
            </div>
            <div class="chart-item">
                <div class="chart-bar" style="width: ${premiumPercent}%; background: #ffc107;"></div>
                <span>프리미엄 (${stats.planDistribution.PREMIUM}명, ${premiumPercent.toFixed(1)}%)</span>
            </div>
        `;
    }
    
    /**
     * 매출 트렌드 차트 업데이트
     */
    updateRevenueChart() {
        // 간단한 매출 추이 표시
        const revenueChart = document.getElementById('revenue-trend-chart');
        if (!revenueChart) return;
        
        // 실제로는 지난 12개월 데이터를 조회해야 함
        revenueChart.innerHTML = `
            <div class="chart-placeholder">
                <p>이번 달 매출: ${this.subscriptionStats.monthlyRevenue.toLocaleString()}원</p>
                <p>전체 누적 매출: ${this.subscriptionStats.totalRevenue.toLocaleString()}원</p>
            </div>
        `;
    }
    
    /**
     * 기본 통계 표시 (Firebase 연결 실패시)
     */
    showDefaultStats() {
        console.log('기본 통계 데이터 표시');
        
        this.subscriptionStats = {
            totalRevenue: 0,
            monthlyRevenue: 0,
            activeSubscriptions: 0,
            totalUsers: 0,
            planDistribution: { FREE: 0, BASIC: 0, PREMIUM: 0 },
            averageRevenuePerUser: 0
        };
        
        this.updateStatsUI();
    }
    
    /**
     * 구독 목록 조회
     */
    async loadSubscriptionsList() {
        try {
            const result = await this.firebaseClient.queryDocuments('subscriptions', [], ['updatedAt', 'desc'], 50);
            const subscriptions = result.data || [];
            
            this.renderSubscriptionsList(subscriptions);
            
        } catch (error) {
            console.error('구독 목록 조회 실패:', error);
            this.showEmptySubscriptionsList();
        }
    }
    
    /**
     * 구독 목록 렌더링
     */
    renderSubscriptionsList(subscriptions) {
        const container = document.getElementById('subscriptions-list');
        if (!container) return;
        
        if (subscriptions.length === 0) {
            container.innerHTML = '<p>구독 정보가 없습니다.</p>';
            return;
        }
        
        container.innerHTML = subscriptions.map(sub => `
            <div class="subscription-item" data-user-id="${sub.userId}">
                <div class="subscription-info">
                    <div class="user-id">${sub.userId}</div>
                    <div class="plan-info">
                        <span class="plan-badge ${sub.plan.toLowerCase()}">${sub.plan}</span>
                        <span class="status-badge ${sub.status}">${this.getStatusText(sub.status)}</span>
                    </div>
                    <div class="subscription-details">
                        <span>시작일: ${new Date(sub.startDate).toLocaleDateString()}</span>
                        ${sub.endDate ? `<span>만료일: ${new Date(sub.endDate).toLocaleDateString()}</span>` : ''}
                        <span>자동갱신: ${sub.autoRenew ? '활성' : '비활성'}</span>
                    </div>
                </div>
                <div class="subscription-actions">
                    <button class="btn-secondary" onclick="subscriptionAdmin.viewSubscriptionDetails('${sub.userId}')">
                        상세보기
                    </button>
                    ${sub.status === 'active' ? `
                        <button class="btn-danger" onclick="subscriptionAdmin.cancelSubscription('${sub.userId}')">
                            구독해지
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 상태 텍스트 변환
     */
    getStatusText(status) {
        const statusMap = {
            'active': '활성',
            'pending_cancellation': '해지예정',
            'cancelled': '해지됨',
            'expired': '만료됨'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 구독 상세 정보 보기
     */
    async viewSubscriptionDetails(userId) {
        try {
            // 구독 정보 조회
            const subResult = await this.firebaseClient.getDocument('subscriptions', userId);
            const subscription = subResult.data;
            
            if (!subscription) {
                alert('구독 정보를 찾을 수 없습니다.');
                return;
            }
            
            // 결제 내역 조회
            const paymentResult = await this.firebaseClient.queryDocuments(
                'payment_history',
                [['userId', '==', userId]],
                ['paidAt', 'desc']
            );
            const payments = paymentResult.data || [];
            
            // 상세 모달 표시
            this.showSubscriptionModal(subscription, payments);
            
        } catch (error) {
            console.error('구독 상세 정보 조회 실패:', error);
            alert('구독 정보 조회에 실패했습니다.');
        }
    }
    
    /**
     * 구독 상세 모달 표시
     */
    showSubscriptionModal(subscription, payments) {
        const modal = document.createElement('div');
        modal.className = 'subscription-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <h2>구독 상세 정보</h2>
                
                <div class="subscription-details-section">
                    <h3>기본 정보</h3>
                    <table class="details-table">
                        <tr><td>사용자 ID:</td><td>${subscription.userId}</td></tr>
                        <tr><td>플랜:</td><td><span class="plan-badge ${subscription.plan.toLowerCase()}">${subscription.plan}</span></td></tr>
                        <tr><td>상태:</td><td><span class="status-badge ${subscription.status}">${this.getStatusText(subscription.status)}</span></td></tr>
                        <tr><td>시작일:</td><td>${new Date(subscription.startDate).toLocaleString()}</td></tr>
                        ${subscription.endDate ? `<tr><td>만료일:</td><td>${new Date(subscription.endDate).toLocaleString()}</td></tr>` : ''}
                        <tr><td>결제 수단:</td><td>${subscription.paymentMethod || '없음'}</td></tr>
                        <tr><td>자동 갱신:</td><td>${subscription.autoRenew ? '활성' : '비활성'}</td></tr>
                    </table>
                </div>
                
                <div class="payment-history-section">
                    <h3>결제 내역</h3>
                    <div class="payment-history">
                        ${payments.length > 0 ? payments.map(payment => `
                            <div class="payment-item">
                                <div class="payment-info">
                                    <span class="payment-amount">${payment.amount.toLocaleString()}원</span>
                                    <span class="payment-date">${new Date(payment.paidAt).toLocaleDateString()}</span>
                                    <span class="payment-status ${payment.status}">${payment.status}</span>
                                </div>
                                <div class="payment-method">${payment.payMethod}</div>
                            </div>
                        `).join('') : '<p>결제 내역이 없습니다.</p>'}
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="this.closest('.subscription-modal').remove()">
                        닫기
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * 구독 해지
     */
    async cancelSubscription(userId) {
        if (!confirm('정말로 이 사용자의 구독을 해지하시겠습니까?')) {
            return;
        }
        
        try {
            await this.firebaseClient.setDocument(
                'subscriptions',
                userId,
                {
                    status: 'cancelled',
                    cancelledAt: new Date().toISOString(),
                    autoRenew: false
                },
                true // merge
            );
            
            alert('구독이 해지되었습니다.');
            
            // 목록 새로고침
            await this.loadSubscriptionsList();
            await this.loadSubscriptionStats();
            
        } catch (error) {
            console.error('구독 해지 실패:', error);
            alert('구독 해지에 실패했습니다.');
        }
    }
    
    /**
     * 결제 내역 조회
     */
    async loadPaymentHistory() {
        try {
            const result = await this.firebaseClient.queryDocuments(
                'payment_history',
                [],
                ['paidAt', 'desc'],
                100
            );
            const payments = result.data || [];
            
            this.renderPaymentHistory(payments);
            
        } catch (error) {
            console.error('결제 내역 조회 실패:', error);
        }
    }
    
    /**
     * 결제 내역 렌더링
     */
    renderPaymentHistory(payments) {
        const container = document.getElementById('payment-history-list');
        if (!container) return;
        
        if (payments.length === 0) {
            container.innerHTML = '<p>결제 내역이 없습니다.</p>';
            return;
        }
        
        container.innerHTML = payments.map(payment => `
            <div class="payment-history-item">
                <div class="payment-info">
                    <div class="payment-amount">${payment.amount.toLocaleString()}원</div>
                    <div class="payment-details">
                        <span>사용자: ${payment.userId}</span>
                        <span>플랜: ${payment.planId}</span>
                        <span>방법: ${payment.payMethod}</span>
                    </div>
                    <div class="payment-date">${new Date(payment.paidAt).toLocaleString()}</div>
                </div>
                <div class="payment-status">
                    <span class="status-badge ${payment.status}">${payment.status}</span>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 매출 리포트 생성
     */
    async generateRevenueReport() {
        try {
            // 월별 매출 데이터 생성
            const monthlyData = await this.getMonthlyRevenueData();
            
            // CSV 다운로드
            this.downloadCSV(monthlyData, 'revenue_report.csv');
            
        } catch (error) {
            console.error('매출 리포트 생성 실패:', error);
            alert('매출 리포트 생성에 실패했습니다.');
        }
    }
    
    /**
     * 월별 매출 데이터 조회
     */
    async getMonthlyRevenueData() {
        // 실제 구현에서는 Firebase에서 집계 데이터 조회
        return [
            { month: '2025-01', revenue: 1000000, users: 500 },
            { month: '2025-02', revenue: 1500000, users: 750 },
            { month: '2025-03', revenue: 2000000, users: 1000 }
        ];
    }
    
    /**
     * CSV 다운로드
     */
    downloadCSV(data, filename) {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "월,매출,사용자수\n"
            + data.map(row => `${row.month},${row.revenue},${row.users}`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 전역 인스턴스 생성
window.subscriptionAdmin = new SubscriptionAdmin();

// CSS 스타일 추가
const subscriptionStyle = document.createElement('style');
subscriptionStyle.textContent = `
    /* 구독 관리 스타일 */
    .subscription-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        margin-bottom: 10px;
        background: white;
    }
    
    .subscription-info {
        flex: 1;
    }
    
    .user-id {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 5px;
    }
    
    .plan-info {
        display: flex;
        gap: 10px;
        margin-bottom: 5px;
    }
    
    .plan-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .plan-badge.free { background: #6c757d; color: white; }
    .plan-badge.basic { background: #17a2b8; color: white; }
    .plan-badge.premium { background: #ffc107; color: #000; }
    
    .status-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .status-badge.active { background: #28a745; color: white; }
    .status-badge.pending_cancellation { background: #ffc107; color: #000; }
    .status-badge.cancelled { background: #dc3545; color: white; }
    .status-badge.expired { background: #6c757d; color: white; }
    
    .subscription-details {
        font-size: 12px;
        color: #666;
    }
    
    .subscription-details span {
        margin-right: 15px;
    }
    
    .subscription-actions {
        display: flex;
        gap: 10px;
    }
    
    .btn-secondary {
        background: #6c757d;
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .btn-danger {
        background: #dc3545;
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    /* 모달 스타일 */
    .subscription-modal {
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
    
    .modal-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .details-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }
    
    .details-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
    }
    
    .details-table td:first-child {
        font-weight: bold;
        background: #f8f9fa;
    }
    
    .payment-history {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 10px;
    }
    
    .payment-item {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        border-bottom: 1px solid #eee;
    }
    
    .payment-item:last-child {
        border-bottom: none;
    }
    
    .payment-amount {
        font-weight: bold;
        color: #007bff;
    }
    
    .chart-item {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }
    
    .chart-bar {
        height: 20px;
        margin-right: 10px;
        border-radius: 4px;
        min-width: 20px;
    }
    
    .chart-placeholder {
        text-align: center;
        padding: 40px;
        background: #f8f9fa;
        border-radius: 8px;
        color: #666;
    }
    
    .btn-primary {
        background: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
`;
document.head.appendChild(subscriptionStyle);

console.log('💼 Subscription Admin 로드 완료');