/**
 * 🚨 실시간 모니터링 대시보드 (관리자용)
 * 생명구조 앱 전체 시스템 모니터링 및 관리
 * 
 * 주요 기능:
 * - 실시간 시스템 상태 표시
 * - 사용자 위험 상황 모니터링
 * - 알림 및 응급 상황 관리
 * - 자동복구 시스템 제어
 * - 성능 지표 대시보드
 */

class MonitoringDashboard {
    constructor() {
        this.className = 'MonitoringDashboard';
        this.isInitialized = false;
        this.updateInterval = null;
        this.monitoringSystem = null;
        
        // 대시보드 상태
        this.dashboardState = {
            autoRefresh: true,
            refreshInterval: 30000, // 30초
            selectedTab: 'overview',
            filters: {
                alertLevel: 'all',
                timeRange: '24h'
            }
        };
        
        console.log('📊 [관리자] 모니터링 대시보드 초기화');
        this.init();
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            console.log('🔄 [관리자] 모니터링 대시보드 초기화 중...');
            
            // 실시간 모니터링 시스템 대기
            await this.waitForMonitoringSystem();
            
            // UI 렌더링
            this.renderDashboard();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 자동 새로고침 시작
            this.startAutoRefresh();
            
            this.isInitialized = true;
            console.log('✅ [관리자] 모니터링 대시보드 초기화 완료');
            
        } catch (error) {
            console.error('❌ [관리자] 모니터링 대시보드 초기화 실패:', error);
        }
    }
    
    /**
     * 실시간 모니터링 시스템 대기
     */
    async waitForMonitoringSystem() {
        return new Promise((resolve) => {
            const checkSystem = () => {
                if (window.realTimeMonitoringSystem && window.realTimeMonitoringSystem.isInitialized) {
                    this.monitoringSystem = window.realTimeMonitoringSystem;
                    console.log('✅ [관리자] 실시간 모니터링 시스템 연결됨');
                    resolve();
                } else {
                    setTimeout(checkSystem, 1000);
                }
            };
            checkSystem();
        });
    }
    
    /**
     * 대시보드 UI 렌더링
     */
    renderDashboard() {
        const dashboardContainer = document.getElementById('monitoring-dashboard');
        if (!dashboardContainer) {
            console.warn('⚠️ [관리자] 모니터링 대시보드 컨테이너를 찾을 수 없음');
            return;
        }
        
        dashboardContainer.innerHTML = `
            <div class="monitoring-dashboard">
                <!-- 대시보드 헤더 -->
                <div class="dashboard-header">
                    <h2>🚨 실시간 모니터링 시스템</h2>
                    <div class="dashboard-controls">
                        <button id="refresh-dashboard" class="btn btn-secondary">
                            🔄 새로고침
                        </button>
                        <label class="auto-refresh-toggle">
                            <input type="checkbox" id="auto-refresh" ${this.dashboardState.autoRefresh ? 'checked' : ''}>
                            자동새로고침
                        </label>
                        <select id="refresh-interval">
                            <option value="10000">10초</option>
                            <option value="30000" selected>30초</option>
                            <option value="60000">1분</option>
                        </select>
                    </div>
                </div>
                
                <!-- 시스템 상태 개요 -->
                <div class="system-overview">
                    <div class="status-cards">
                        <div class="status-card" id="system-health-card">
                            <div class="status-icon">🏥</div>
                            <div class="status-info">
                                <div class="status-title">시스템 상태</div>
                                <div class="status-value" id="system-health-status">확인 중...</div>
                            </div>
                        </div>
                        
                        <div class="status-card" id="active-users-card">
                            <div class="status-icon">👥</div>
                            <div class="status-info">
                                <div class="status-title">활성 사용자</div>
                                <div class="status-value" id="active-users-count">-</div>
                            </div>
                        </div>
                        
                        <div class="status-card" id="active-alerts-card">
                            <div class="status-icon">🚨</div>
                            <div class="status-info">
                                <div class="status-title">활성 알림</div>
                                <div class="status-value" id="active-alerts-count">-</div>
                            </div>
                        </div>
                        
                        <div class="status-card" id="emergency-count-card">
                            <div class="status-icon">💀</div>
                            <div class="status-info">
                                <div class="status-title">응급 상황</div>
                                <div class="status-value" id="emergency-count">-</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 탭 네비게이션 -->
                <div class="dashboard-tabs">
                    <button class="tab-button active" data-tab="overview">개요</button>
                    <button class="tab-button" data-tab="users">사용자 상태</button>
                    <button class="tab-button" data-tab="alerts">알림 관리</button>
                    <button class="tab-button" data-tab="system">시스템 상태</button>
                    <button class="tab-button" data-tab="recovery">자동복구</button>
                </div>
                
                <!-- 탭 콘텐츠 -->
                <div class="tab-content">
                    <!-- 개요 탭 -->
                    <div id="overview-tab" class="tab-panel active">
                        <div class="overview-grid">
                            <div class="overview-section">
                                <h3>🔥 Firebase 상태</h3>
                                <div id="firebase-status" class="service-status">
                                    <div class="status-indicator"></div>
                                    <span class="status-text">확인 중...</span>
                                </div>
                            </div>
                            
                            <div class="overview-section">
                                <h3>🚑 119 API 상태</h3>
                                <div id="api119-status" class="service-status">
                                    <div class="status-indicator"></div>
                                    <span class="status-text">확인 중...</span>
                                </div>
                            </div>
                            
                            <div class="overview-section">
                                <h3>🔔 알림 시스템</h3>
                                <div id="notification-status" class="service-status">
                                    <div class="status-indicator"></div>
                                    <span class="status-text">확인 중...</span>
                                </div>
                            </div>
                            
                            <div class="overview-section">
                                <h3>🔋 시스템 리소스</h3>
                                <div class="resource-info">
                                    <div class="resource-item">
                                        <span>배터리:</span>
                                        <span id="battery-level">-</span>
                                    </div>
                                    <div class="resource-item">
                                        <span>메모리:</span>
                                        <span id="memory-usage">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 최근 활동 -->
                        <div class="recent-activity">
                            <h3>📋 최근 활동</h3>
                            <div id="recent-activity-list" class="activity-list">
                                <!-- 동적으로 생성됨 -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- 사용자 상태 탭 -->
                    <div id="users-tab" class="tab-panel">
                        <div class="users-header">
                            <h3>👥 사용자 상태 모니터링</h3>
                            <div class="users-filters">
                                <select id="user-status-filter">
                                    <option value="all">전체</option>
                                    <option value="normal">정상</option>
                                    <option value="caution">주의</option>
                                    <option value="warning">경고</option>
                                    <option value="danger">위험</option>
                                    <option value="emergency">응급</option>
                                </select>
                            </div>
                        </div>
                        <div id="users-list" class="users-list">
                            <!-- 동적으로 생성됨 -->
                        </div>
                    </div>
                    
                    <!-- 알림 관리 탭 -->
                    <div id="alerts-tab" class="tab-panel">
                        <div class="alerts-header">
                            <h3>🚨 알림 관리</h3>
                            <div class="alerts-actions">
                                <button id="clear-all-alerts" class="btn btn-danger">모든 알림 지우기</button>
                                <button id="export-alerts" class="btn btn-secondary">알림 내보내기</button>
                            </div>
                        </div>
                        <div id="alerts-list" class="alerts-list">
                            <!-- 동적으로 생성됨 -->
                        </div>
                    </div>
                    
                    <!-- 시스템 상태 탭 -->
                    <div id="system-tab" class="tab-panel">
                        <div class="system-metrics">
                            <h3>📊 시스템 성능 지표</h3>
                            <div class="metrics-grid">
                                <div class="metric-card">
                                    <h4>CPU 사용률</h4>
                                    <div id="cpu-usage" class="metric-value">-</div>
                                </div>
                                <div class="metric-card">
                                    <h4>메모리 사용률</h4>
                                    <div id="memory-usage-detailed" class="metric-value">-</div>
                                </div>
                                <div class="metric-card">
                                    <h4>네트워크 지연시간</h4>
                                    <div id="network-latency" class="metric-value">-</div>
                                </div>
                                <div class="metric-card">
                                    <h4>마지막 헬스체크</h4>
                                    <div id="last-health-check" class="metric-value">-</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 자동복구 탭 -->
                    <div id="recovery-tab" class="tab-panel">
                        <div class="recovery-controls">
                            <h3>🔧 자동복구 시스템</h3>
                            <div class="recovery-actions">
                                <button id="trigger-recovery" class="btn btn-warning">수동 복구 실행</button>
                                <button id="restart-monitoring" class="btn btn-primary">모니터링 재시작</button>
                            </div>
                        </div>
                        <div id="recovery-log" class="recovery-log">
                            <h4>복구 작업 로그</h4>
                            <div id="recovery-log-list" class="log-list">
                                <!-- 동적으로 생성됨 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 새로고침 버튼
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.refreshDashboard();
        });
        
        // 자동새로고침 토글
        document.getElementById('auto-refresh')?.addEventListener('change', (e) => {
            this.dashboardState.autoRefresh = e.target.checked;
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });
        
        // 새로고침 간격 변경
        document.getElementById('refresh-interval')?.addEventListener('change', (e) => {
            this.dashboardState.refreshInterval = parseInt(e.target.value);
            if (this.dashboardState.autoRefresh) {
                this.stopAutoRefresh();
                this.startAutoRefresh();
            }
        });
        
        // 탭 클릭
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 수동 복구 실행
        document.getElementById('trigger-recovery')?.addEventListener('click', () => {
            this.triggerManualRecovery();
        });
        
        // 모니터링 재시작
        document.getElementById('restart-monitoring')?.addEventListener('click', () => {
            this.restartMonitoring();
        });
        
        // 알림 지우기
        document.getElementById('clear-all-alerts')?.addEventListener('click', () => {
            this.clearAllAlerts();
        });
    }
    
    /**
     * 자동 새로고침 시작
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // 기존 타이머 정리
        
        this.updateInterval = setInterval(() => {
            this.refreshDashboard();
        }, this.dashboardState.refreshInterval);
        
        // 즉시 첫 새로고침 실행
        this.refreshDashboard();
    }
    
    /**
     * 자동 새로고침 중지
     */
    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * 대시보드 새로고침
     */
    async refreshDashboard() {
        try {
            if (!this.monitoringSystem) return;
            
            const status = this.monitoringSystem.getMonitoringStatus();
            
            // 시스템 상태 업데이트
            this.updateSystemStatus(status);
            
            // 현재 탭에 따라 상세 정보 업데이트
            switch (this.dashboardState.selectedTab) {
                case 'overview':
                    await this.updateOverviewTab();
                    break;
                case 'users':
                    await this.updateUsersTab();
                    break;
                case 'alerts':
                    await this.updateAlertsTab();
                    break;
                case 'system':
                    await this.updateSystemTab();
                    break;
                case 'recovery':
                    await this.updateRecoveryTab();
                    break;
            }
            
            console.log('🔄 [관리자] 대시보드 새로고침 완료');
            
        } catch (error) {
            console.error('❌ [관리자] 대시보드 새로고침 실패:', error);
        }
    }
    
    /**
     * 시스템 상태 업데이트
     */
    updateSystemStatus(status) {
        // 시스템 건강 상태
        const healthElement = document.getElementById('system-health-status');
        if (healthElement) {
            healthElement.textContent = status.systemHealth.overall ? '정상' : '이상';
            healthElement.className = status.systemHealth.overall ? 'status-healthy' : 'status-unhealthy';
        }
        
        // 활성 사용자 수
        const usersElement = document.getElementById('active-users-count');
        if (usersElement) {
            usersElement.textContent = status.activeUsers.toLocaleString();
        }
        
        // 활성 알림 수
        const alertsElement = document.getElementById('active-alerts-count');
        if (alertsElement) {
            alertsElement.textContent = status.activeAlerts.toLocaleString();
        }
        
        // 응급 상황 수 (사용자 상태에서 emergency 카운트)
        const emergencyUsers = Array.from(this.monitoringSystem.monitoringState.users.values())
            .filter(user => user.alertLevel === 'emergency').length;
        const emergencyElement = document.getElementById('emergency-count');
        if (emergencyElement) {
            emergencyElement.textContent = emergencyUsers.toLocaleString();
            emergencyElement.className = emergencyUsers > 0 ? 'status-emergency' : '';
        }
    }
    
    /**
     * 개요 탭 업데이트
     */
    async updateOverviewTab() {
        const systemHealth = this.monitoringSystem.monitoringState.systemHealth;
        
        // Firebase 상태
        this.updateServiceStatus('firebase-status', systemHealth.firebase);
        
        // 119 API 상태
        this.updateServiceStatus('api119-status', systemHealth.api119);
        
        // 알림 시스템 상태
        this.updateServiceStatus('notification-status', systemHealth.notifications);
        
        // 배터리 레벨
        const batteryElement = document.getElementById('battery-level');
        if (batteryElement) {
            batteryElement.textContent = `${systemHealth.battery}%`;
        }
        
        // 메모리 사용량
        const memoryElement = document.getElementById('memory-usage');
        if (memoryElement) {
            memoryElement.textContent = `${systemHealth.memory}%`;
        }
        
        // 최근 활동 업데이트
        this.updateRecentActivity();
    }
    
    /**
     * 서비스 상태 업데이트
     */
    updateServiceStatus(elementId, isHealthy) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const indicator = element.querySelector('.status-indicator');
        const text = element.querySelector('.status-text');
        
        if (indicator) {
            indicator.className = `status-indicator ${isHealthy ? 'healthy' : 'unhealthy'}`;
        }
        
        if (text) {
            text.textContent = isHealthy ? '정상' : '이상';
        }
    }
    
    /**
     * 최근 활동 업데이트
     */
    updateRecentActivity() {
        const activityList = document.getElementById('recent-activity-list');
        if (!activityList) return;
        
        const activities = this.getRecentActivities();
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <div class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
                <div class="activity-message">${activity.message}</div>
            </div>
        `).join('');
    }
    
    /**
     * 최근 활동 가져오기
     */
    getRecentActivities() {
        const activities = [];
        
        // 복구 작업에서 최근 활동 가져오기
        const recoveryActions = this.monitoringSystem.monitoringState.recoveryActions.slice(-10);
        recoveryActions.forEach(action => {
            activities.push({
                timestamp: action.timestamp,
                type: action.success ? 'success' : 'error',
                message: `복구 작업: ${action.action} - ${action.success ? '성공' : '실패'}`
            });
        });
        
        // 알림에서 최근 활동 가져오기
        const recentAlerts = this.monitoringSystem.monitoringState.alerts.slice(-5);
        recentAlerts.forEach(alert => {
            activities.push({
                timestamp: alert.createdAt,
                type: 'alert',
                message: `알림 생성: ${alert.type}/${alert.code}`
            });
        });
        
        // 시간순 정렬
        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    }
    
    /**
     * 사용자 탭 업데이트
     */
    async updateUsersTab() {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        const users = Array.from(this.monitoringSystem.monitoringState.users.entries());
        const filter = document.getElementById('user-status-filter')?.value || 'all';
        
        const filteredUsers = users.filter(([userId, status]) => {
            return filter === 'all' || status.alertLevel === filter;
        });
        
        usersList.innerHTML = filteredUsers.map(([userId, status]) => `
            <div class="user-item ${status.alertLevel}">
                <div class="user-info">
                    <div class="user-id">${userId}</div>
                    <div class="user-status">
                        <span class="status-badge ${status.alertLevel}">${this.getStatusText(status.alertLevel)}</span>
                        <span class="last-activity">마지막 활동: ${this.formatTimeAgo(status.lastActivity)}</span>
                    </div>
                </div>
                <div class="user-actions">
                    ${status.alertLevel === 'emergency' ? `
                        <button class="btn btn-danger btn-sm" onclick="monitoringDashboard.handleEmergencyUser('${userId}')">
                            응급 처리
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="monitoringDashboard.viewUserDetails('${userId}')">
                        상세보기
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 상태 텍스트 변환
     */
    getStatusText(alertLevel) {
        const statusMap = {
            'normal': '정상',
            'caution': '주의',
            'warning': '경고',
            'danger': '위험',
            'emergency': '응급'
        };
        return statusMap[alertLevel] || alertLevel;
    }
    
    /**
     * 시간 경과 포맷
     */
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) {
            return '방금 전';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}분 전`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}시간 전`;
        } else {
            return `${Math.floor(diff / 86400000)}일 전`;
        }
    }
    
    /**
     * 탭 전환
     */
    switchTab(tabName) {
        // 탭 버튼 활성화 상태 변경
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });
        
        // 탭 패널 표시/숨김
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-tab`);
        });
        
        this.dashboardState.selectedTab = tabName;
        
        // 새로 선택된 탭 데이터 즉시 업데이트
        this.refreshDashboard();
    }
    
    /**
     * 수동 복구 실행
     */
    async triggerManualRecovery() {
        try {
            console.log('🔧 [관리자] 수동 복구 실행');
            
            if (this.monitoringSystem && this.monitoringSystem.performAutoRecovery) {
                await this.monitoringSystem.performAutoRecovery();
                alert('복구 작업이 실행되었습니다.');
            } else {
                alert('모니터링 시스템에 연결할 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ [관리자] 수동 복구 실행 실패:', error);
            alert('복구 작업 실행에 실패했습니다.');
        }
    }
    
    /**
     * 모니터링 재시작
     */
    async restartMonitoring() {
        try {
            console.log('🔄 [관리자] 모니터링 시스템 재시작');
            
            if (this.monitoringSystem) {
                this.monitoringSystem.stop();
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.monitoringSystem.init();
                alert('모니터링 시스템이 재시작되었습니다.');
            } else {
                alert('모니터링 시스템에 연결할 수 없습니다.');
            }
        } catch (error) {
            console.error('❌ [관리자] 모니터링 재시작 실패:', error);
            alert('모니터링 시스템 재시작에 실패했습니다.');
        }
    }
    
    /**
     * 모든 알림 지우기
     */
    clearAllAlerts() {
        if (!confirm('정말로 모든 알림을 지우시겠습니까?')) {
            return;
        }
        
        try {
            if (this.monitoringSystem) {
                this.monitoringSystem.monitoringState.alerts = [];
                this.refreshDashboard();
                alert('모든 알림이 지워졌습니다.');
            }
        } catch (error) {
            console.error('❌ [관리자] 알림 지우기 실패:', error);
            alert('알림 지우기에 실패했습니다.');
        }
    }
}

// 전역 인스턴스 생성
window.monitoringDashboard = new MonitoringDashboard();

// CSS 스타일 추가
const monitoringDashboardStyle = document.createElement('style');
monitoringDashboardStyle.textContent = `
    /* 모니터링 대시보드 스타일 */
    .monitoring-dashboard {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #eee;
    }
    
    .dashboard-controls {
        display: flex;
        gap: 15px;
        align-items: center;
    }
    
    .auto-refresh-toggle {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 14px;
    }
    
    .system-overview {
        margin-bottom: 30px;
    }
    
    .status-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .status-card {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        border: 2px solid transparent;
        transition: all 0.3s ease;
    }
    
    .status-card:hover {
        border-color: #007bff;
        transform: translateY(-2px);
    }
    
    .status-icon {
        font-size: 32px;
    }
    
    .status-info {
        flex: 1;
    }
    
    .status-title {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
    }
    
    .status-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
    }
    
    .status-healthy {
        color: #28a745 !important;
    }
    
    .status-unhealthy {
        color: #dc3545 !important;
    }
    
    .status-emergency {
        color: #dc3545 !important;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .dashboard-tabs {
        display: flex;
        gap: 2px;
        margin-bottom: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 4px;
    }
    
    .tab-button {
        flex: 1;
        padding: 12px 20px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #666;
        transition: all 0.3s ease;
    }
    
    .tab-button.active {
        background: white;
        color: #007bff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .tab-button:hover:not(.active) {
        color: #007bff;
    }
    
    .tab-content {
        min-height: 400px;
    }
    
    .tab-panel {
        display: none;
    }
    
    .tab-panel.active {
        display: block;
    }
    
    .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .overview-section {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
    }
    
    .overview-section h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #333;
    }
    
    .service-status {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ccc;
    }
    
    .status-indicator.healthy {
        background: #28a745;
    }
    
    .status-indicator.unhealthy {
        background: #dc3545;
        animation: blink 1s infinite;
    }
    
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
    }
    
    .resource-info {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .resource-item {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
    }
    
    .recent-activity {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
    }
    
    .recent-activity h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #333;
    }
    
    .activity-list {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .activity-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
    }
    
    .activity-item:last-child {
        border-bottom: none;
    }
    
    .activity-item.success {
        border-left: 4px solid #28a745;
    }
    
    .activity-item.error {
        border-left: 4px solid #dc3545;
    }
    
    .activity-item.alert {
        border-left: 4px solid #ffc107;
    }
    
    .activity-time {
        color: #666;
        font-size: 12px;
    }
    
    .users-header,
    .alerts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .users-list,
    .alerts-list {
        max-height: 500px;
        overflow-y: auto;
    }
    
    .user-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #eee;
        border-radius: 8px;
        margin-bottom: 10px;
        background: white;
    }
    
    .user-item.emergency {
        border-color: #dc3545;
        background: #fff5f5;
    }
    
    .user-item.danger {
        border-color: #fd7e14;
        background: #fff8f0;
    }
    
    .user-item.warning {
        border-color: #ffc107;
        background: #fffbf0;
    }
    
    .user-info {
        flex: 1;
    }
    
    .user-id {
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .user-status {
        display: flex;
        gap: 15px;
        align-items: center;
        font-size: 14px;
    }
    
    .status-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .status-badge.normal { background: #d4edda; color: #155724; }
    .status-badge.caution { background: #fff3cd; color: #856404; }
    .status-badge.warning { background: #ffeaa7; color: #b45309; }
    .status-badge.danger { background: #f8d7da; color: #721c24; }
    .status-badge.emergency { background: #dc3545; color: white; }
    
    .user-actions {
        display: flex;
        gap: 10px;
    }
    
    .btn-sm {
        padding: 6px 12px;
        font-size: 12px;
    }
    
    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }
    
    .metric-card {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
    }
    
    .metric-card h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #666;
    }
    
    .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: #007bff;
    }
    
    .recovery-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .recovery-actions {
        display: flex;
        gap: 10px;
    }
    
    .recovery-log {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
    }
    
    .log-list {
        max-height: 400px;
        overflow-y: auto;
        background: white;
        border-radius: 6px;
        padding: 10px;
    }
`;
document.head.appendChild(monitoringDashboardStyle);

console.log('📊 [관리자] 모니터링 대시보드 로드 완료');