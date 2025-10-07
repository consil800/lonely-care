/**
 * AlertSystemIntegration v1.0
 * AlertSystemComponent와 기존 알림 시스템을 연결하는 통합 계층
 * 
 * 기존 친구 상태 모니터링, 관리자 설정과 완벽 통합하여 고급 알림 로직 제공
 */

class AlertSystemIntegration {
    constructor() {
        this.component = null;
        this.integrations = {
            friendStatusMonitor: null,
            notificationManager: null,
            adminSettings: null
        };
        this.isIntegrated = false;
        
        console.log('🔗 AlertSystem 통합 계층 초기화');
        
        this.init();
    }

    async init() {
        try {
            // 컴포넌트 대기
            await this.waitForComponent();
            
            // 기존 시스템들 참조
            this.integrations = {
                friendStatusMonitor: window.friendStatusMonitor,
                notificationManager: window.notificationManagerComponent || window.notificationsManager,
                adminSettings: window.adminManager
            };
            
            // 통합 설정
            this.setupIntegration();
            
            // 이벤트 연결
            this.connectEvents();
            
            // 관리자 설정 연동
            this.setupAdminIntegration();
            
            this.isIntegrated = true;
            console.log('✅ AlertSystem 통합 완료');
            
        } catch (error) {
            console.error('❌ AlertSystem 통합 실패:', error);
        }
    }

    async waitForComponent() {
        return new Promise((resolve) => {
            const checkComponent = () => {
                if (window.alertSystemComponent) {
                    this.component = window.alertSystemComponent;
                    resolve();
                } else {
                    setTimeout(checkComponent, 100);
                }
            };
            checkComponent();
        });
    }

    setupIntegration() {
        if (!this.component) return;

        const component = this.component;

        // FriendStatusMonitor와 통합
        if (this.integrations.friendStatusMonitor) {
            const monitor = this.integrations.friendStatusMonitor;
            
            // 기존 알림 발송 로직을 AlertSystem으로 래핑
            const originalSendNotification = monitor.sendNotification;
            if (originalSendNotification) {
                monitor.sendNotification = async function(friendData) {
                    console.log('🔄 기존 sendNotification 호출 -> AlertSystem으로 전달');
                    try {
                        // AlertSystem의 고급 로직 사용
                        const result = await component.processFriendAlert(friendData);
                        if (result) return result;
                        
                        // 실패시 기존 방식 fallback
                        return await originalSendNotification.call(this, friendData);
                    } catch (error) {
                        console.warn('AlertSystem 처리 실패, 기존 방식 사용:', error);
                        return await originalSendNotification.call(this, friendData);
                    }
                }.bind(monitor);
            }

            // 친구 상태 체크 로직 향상
            const originalCheckFriendStatus = monitor.checkFriendStatus;
            if (originalCheckFriendStatus) {
                monitor.checkFriendStatus = async function(friendData) {
                    console.log('🔍 친구 상태 체크 - AlertSystem 규칙 적용');
                    try {
                        // 기존 체크 먼저 실행
                        const basicResult = await originalCheckFriendStatus.call(this, friendData);
                        
                        // AlertSystem의 스마트 필터링 적용
                        const alertId = `friend-${friendData.friend_id}-${friendData.user_id}`;
                        const alertLevel = component.calculateAlertLevel(friendData);
                        
                        // 알림 억제 여부 확인
                        const shouldSuppress = await component.shouldSuppressAlert(alertId, alertLevel, friendData);
                        
                        if (shouldSuppress) {
                            console.log('🔇 AlertSystem에 의해 알림 억제됨');
                            return false;
                        }
                        
                        return basicResult;
                    } catch (error) {
                        console.warn('AlertSystem 상태 체크 실패, 기존 방식 사용:', error);
                        return await originalCheckFriendStatus.call(this, friendData);
                    }
                }.bind(monitor);
            }
        }

        // NotificationManager와 통합
        if (this.integrations.notificationManager) {
            const notifManager = this.integrations.notificationManager;
            
            // 친구 무응답 알림을 AlertSystem을 통해 처리
            const originalSendFriendInactive = notifManager.sendFriendInactiveNotification;
            if (originalSendFriendInactive) {
                notifManager.sendFriendInactiveNotification = async function(friendData) {
                    console.log('🔄 기존 sendFriendInactiveNotification -> AlertSystem으로 전달');
                    try {
                        // AlertSystem의 규칙 기반 처리
                        const alertProcessed = await component.processFriendAlert(friendData);
                        
                        if (alertProcessed) {
                            console.log('✅ AlertSystem에서 알림 처리 완료');
                            return true;
                        }
                        
                        // AlertSystem에서 처리하지 않은 경우 기존 방식 사용
                        return await originalSendFriendInactive.call(this, friendData);
                    } catch (error) {
                        console.warn('AlertSystem 처리 실패, 기존 방식 사용:', error);
                        return await originalSendFriendInactive.call(this, friendData);
                    }
                }.bind(notifManager);
            }
        }

        console.log('🔗 기존 시스템들과 AlertSystem 통합 완료');
    }

    connectEvents() {
        if (!this.component) return;

        // AlertSystem 이벤트를 기존 시스템들에 전파
        this.component.addEventListener('alert:sent', (e) => {
            console.log('📤 AlertSystem 알림 발송:', e.detail.alertId);
            
            // 친구 상태 모니터에 알림
            if (this.integrations.friendStatusMonitor) {
                this.integrations.friendStatusMonitor.dispatchEvent(new CustomEvent('alert:sent', {
                    detail: e.detail
                }));
            }
        });

        this.component.addEventListener('alert:escalated', (e) => {
            console.log('🚨 AlertSystem 에스컬레이션:', e.detail.alertId);
            
            // 관리자 시스템에 에스컬레이션 알림
            if (this.integrations.adminSettings) {
                console.log('📞 관리자에게 에스컬레이션 알림');
            }
        });

        this.component.addEventListener('alert:rules-updated', (e) => {
            console.log('📋 AlertSystem 규칙 업데이트:', e.detail);
            
            // 친구 상태 모니터 새로고침
            if (this.integrations.friendStatusMonitor && this.integrations.friendStatusMonitor.loadFriendsStatus) {
                setTimeout(() => {
                    this.integrations.friendStatusMonitor.loadFriendsStatus();
                }, 1000);
            }
        });

        this.component.addEventListener('alert:system-ready', (e) => {
            console.log('✅ AlertSystem 준비 완료 - 규칙:', e.detail.rulesLoaded);
        });

        // 기존 시스템 이벤트를 AlertSystem에 전달
        if (this.integrations.friendStatusMonitor) {
            // 친구 상태 변화를 AlertSystem에 알림
            if (typeof this.integrations.friendStatusMonitor.addEventListener === 'function') {
                this.integrations.friendStatusMonitor.addEventListener('friend:status-changed', (e) => {
                    this.component.processFriendStatusChange(e.detail);
                });
            }
        }

        console.log('🔗 AlertSystem 이벤트 연결 완료');
    }

    setupAdminIntegration() {
        if (!this.component) return;

        // 관리자 설정 변경 이벤트 리스닝
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('admin-notification') || e.key.includes('adminEmergency'))) {
                console.log('🔧 관리자 설정 변경 감지 - AlertSystem 규칙 업데이트');
                setTimeout(() => {
                    this.component.loadAdminSettings();
                }, 500);
            }
        });

        // 관리자 페이지에서 설정 변경시 실시간 업데이트
        if (typeof window.dispatchEvent === 'function') {
            const originalLocalStorageSetItem = localStorage.setItem;
            localStorage.setItem = function(key, value) {
                originalLocalStorageSetItem.call(this, key, value);
                
                if (key.includes('admin-notification') || key.includes('adminEmergency')) {
                    window.dispatchEvent(new CustomEvent('admin:settings-changed', {
                        detail: { key, value }
                    }));
                }
            };
        }

        console.log('🔧 관리자 설정 통합 완료');
    }

    // 기존 코드에서 사용할 수 있는 향상된 기능들
    getEnhancedFeatures() {
        if (!this.component) return {};

        return {
            // 고급 알림 규칙 설정
            setCustomRule: async (userId, ruleName, ruleValue) => {
                const userRules = this.component.alertRules.userCustomRules.get(userId) || {};
                userRules[ruleName] = ruleValue;
                this.component.alertRules.userCustomRules.set(userId, userRules);
                
                this.component.dispatchEvent(new CustomEvent('alert:custom-rule-set', {
                    detail: { userId, ruleName, ruleValue }
                }));
            },

            // 알림 억제
            suppressAlert: (alertId, duration = 60 * 60 * 1000) => {
                this.component.suppressedAlerts.add(alertId);
                setTimeout(() => {
                    this.component.suppressedAlerts.delete(alertId);
                }, duration);
            },

            // 에스컬레이션 강제 실행
            forceEscalation: async (alertId, alertData) => {
                return await this.component.executeEscalation(alertId, alertData);
            },

            // 알림 히스토리 조회
            getAlertHistory: (friendId, days = 7) => {
                const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
                const history = [];
                
                for (const [alertId, alert] of this.component.alertHistory) {
                    if (alert.friend_id === friendId && 
                        new Date(alert.created_at).getTime() > cutoff) {
                        history.push(alert);
                    }
                }
                
                return history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            },

            // 알림 통계
            getAlertStats: () => {
                const stats = {
                    totalAlerts: this.component.alertHistory.size,
                    suppressedAlerts: this.component.suppressedAlerts.size,
                    escalatedAlerts: this.component.pendingEscalations.size,
                    levelBreakdown: { warning: 0, danger: 0, emergency: 0 }
                };

                for (const [alertId, alert] of this.component.alertHistory) {
                    if (stats.levelBreakdown[alert.alert_level] !== undefined) {
                        stats.levelBreakdown[alert.alert_level]++;
                    }
                }

                return stats;
            },

            // 규칙 엔진 상태
            getRulesEngineStatus: () => {
                return {
                    isActive: this.component.isInitialized,
                    currentRules: this.component.alertRules,
                    userRulesCount: this.component.alertRules.userCustomRules.size,
                    lastRulesUpdate: this.component.lastRulesUpdate
                };
            },

            // 테스트 알림 (관리자용)
            sendTestAlert: async (friendData, alertLevel = 'warning') => {
                const testData = {
                    ...friendData,
                    alert_level: alertLevel,
                    test_mode: true
                };
                
                return await this.component.sendAlert(testData);
            },

            // 이벤트 리스너 추가
            onAlertEvent: (event, callback) => {
                this.component.addEventListener(event, callback);
            }
        };
    }

    // 디버깅 및 모니터링
    getIntegrationStatus() {
        return {
            isIntegrated: this.isIntegrated,
            hasComponent: !!this.component,
            integrations: {
                friendStatusMonitor: !!this.integrations.friendStatusMonitor,
                notificationManager: !!this.integrations.notificationManager,
                adminSettings: !!this.integrations.adminSettings
            },
            componentStatus: this.component ? this.component.getStatus() : null
        };
    }

    // 진단 도구
    async runDiagnostics() {
        if (!this.component) {
            return { error: 'AlertSystemComponent not available' };
        }

        const diagnostics = {
            timestamp: new Date().toISOString(),
            component: this.component.getStatus(),
            integrations: this.getIntegrationStatus(),
            rules: {
                timeBasedRules: this.component.alertRules.timeBasedRules,
                conditionalRules: this.component.alertRules.conditionalRules,
                userRulesCount: this.component.alertRules.userCustomRules.size,
                escalationEnabled: this.component.alertRules.escalationRules.enabled
            },
            performance: {
                activeAlerts: this.component.activeAlerts.size,
                alertHistory: this.component.alertHistory.size,
                suppressedAlerts: this.component.suppressedAlerts.size,
                memoryUsage: this.estimateMemoryUsage()
            }
        };

        console.log('🔍 AlertSystem 진단 결과:', diagnostics);
        return diagnostics;
    }

    estimateMemoryUsage() {
        if (!this.component) return 0;
        
        const maps = [
            this.component.activeAlerts,
            this.component.alertHistory,
            this.component.pendingEscalations,
            this.component.alertRules.userCustomRules,
            this.component.alertRules.groupRules,
            this.component.ruleCache
        ];

        return maps.reduce((total, map) => total + map.size, 0);
    }
}

// 전역 초기화 함수
window.initAlertSystemIntegration = () => {
    if (window.__alertSystemIntegrationInitialized) {
        console.log('⚠️ AlertSystem 통합이 이미 초기화됨');
        return;
    }

    console.log('🚀 AlertSystem 통합 초기화 시작');
    
    const integration = new AlertSystemIntegration();
    window.alertSystemIntegration = integration;
    window.__alertSystemIntegrationInitialized = true;

    // 향상된 기능을 전역에서 사용 가능하게
    window.alertSystemEnhancements = integration.getEnhancedFeatures();
    
    console.log('✅ AlertSystem 통합 초기화 완료');
    
    return integration;
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.initAlertSystemIntegration();
    }, 1500); // 다른 컴포넌트들이 모두 로드된 후 실행
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertSystemIntegration;
}