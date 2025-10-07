/**
 * SettingsIntegration v1.0
 * SettingsComponent와 기존 시스템을 연결하는 통합 계층
 * 
 * 기존 알림 설정, 사용자 인증, 프로필과 완벽 통합하여 설정 시스템 제공
 */

class SettingsIntegration {
    constructor() {
        this.component = null;
        this.integrations = {
            notificationManager: null,
            profileComponent: null,
            auth: null,
            storage: null
        };
        this.isIntegrated = false;
        
        console.log('🔗 Settings 통합 계층 초기화');
        
        this.init();
    }

    async init() {
        try {
            // 컴포넌트 대기
            await this.waitForComponent();
            
            // 기존 시스템들 참조
            this.integrations = {
                notificationManager: window.notificationManagerComponent || window.notificationsManager,
                profileComponent: window.profileComponent,
                auth: window.auth,
                storage: window.storageComponent || window.storage
            };
            
            // 통합 설정
            this.setupIntegration();
            
            // 이벤트 연결
            this.connectEvents();
            
            // 기존 알림 설정 페이지 업그레이드
            this.upgradeNotificationsPage();
            
            this.isIntegrated = true;
            console.log('✅ Settings 통합 완료');
            
        } catch (error) {
            console.error('❌ Settings 통합 실패:', error);
        }
    }

    async waitForComponent() {
        return new Promise((resolve) => {
            const checkComponent = () => {
                if (window.settingsComponent) {
                    this.component = window.settingsComponent;
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

        // 기존 알림 설정과 통합
        if (this.integrations.notificationManager) {
            const notifManager = this.integrations.notificationManager;
            
            // 기존 알림 설정 메서드를 SettingsComponent로 래핑
            const originalUpdateNotificationSettings = notifManager.updateSettings || notifManager.updateNotificationSettings;
            if (originalUpdateNotificationSettings) {
                notifManager.updateSettings = function(newSettings) {
                    console.log('🔄 기존 알림 설정 업데이트 -> Settings 시스템으로 전달');
                    
                    try {
                        // Settings 시스템으로 설정 전달
                        Object.entries(newSettings).forEach(([key, value]) => {
                            const settingKey = `notifications.${key}`;
                            if (component.currentSettings.has(settingKey)) {
                                component.updateSetting(settingKey, value);
                            }
                        });
                        
                        // 기존 메서드도 호출 (호환성)
                        return originalUpdateNotificationSettings.call(this, newSettings);
                    } catch (error) {
                        console.warn('Settings 통합 실패, 기존 방식 사용:', error);
                        return originalUpdateNotificationSettings.call(this, newSettings);
                    }
                }.bind(notifManager);
            }

            // 조용한 시간 설정 연동
            const originalSetQuietHours = notifManager.setQuietHours;
            if (originalSetQuietHours) {
                notifManager.setQuietHours = function(enabled, startTime, endTime) {
                    console.log('🔄 조용한 시간 설정 -> Settings 시스템으로 전달');
                    
                    component.updateSetting('notifications.quietHoursEnabled', enabled);
                    if (startTime) component.updateSetting('notifications.quietHoursStart', startTime);
                    if (endTime) component.updateSetting('notifications.quietHoursEnd', endTime);
                    
                    return originalSetQuietHours.call(this, enabled, startTime, endTime);
                }.bind(notifManager);
            }
        }

        // 프로필 컴포넌트와 통합
        if (this.integrations.profileComponent) {
            const profileComp = this.integrations.profileComponent;
            
            // 프로필 개인정보 설정과 연동
            const originalUpdatePrivacySettings = profileComp.updatePrivacySettings;
            if (originalUpdatePrivacySettings) {
                profileComp.updatePrivacySettings = function(newSettings) {
                    console.log('🔄 프로필 개인정보 설정 -> Settings 시스템으로 전달');
                    
                    Object.entries(newSettings).forEach(([key, value]) => {
                        const settingKey = `privacy.${key}`;
                        if (component.currentSettings.has(settingKey)) {
                            component.updateSetting(settingKey, value);
                        }
                    });
                    
                    return originalUpdatePrivacySettings.call(this, newSettings);
                }.bind(profileComp);
            }
        }

        console.log('🔗 기존 시스템들과 Settings 통합 완료');
    }

    connectEvents() {
        if (!this.component) return;

        // Settings 이벤트를 기존 시스템들에 전파
        this.component.addEventListener('settings:changed', (e) => {
            const { settingKey, value } = e.detail;
            console.log('⚙️ Settings 변경:', settingKey, '=', value);
            
            // 알림 관련 설정을 NotificationManager에 전파
            if (settingKey.startsWith('notifications.') && this.integrations.notificationManager) {
                const notificationSetting = settingKey.substring('notifications.'.length);
                this.propagateToNotificationManager(notificationSetting, value);
            }
            
            // 개인정보 설정을 ProfileComponent에 전파
            if (settingKey.startsWith('privacy.') && this.integrations.profileComponent) {
                const privacySetting = settingKey.substring('privacy.'.length);
                this.propagateToProfileComponent(privacySetting, value);
            }
        });

        this.component.addEventListener('settings:saved', (e) => {
            console.log('💾 Settings 저장 완료:', Object.keys(e.detail.settingsData).length, '개 설정');
            
            // 다른 시스템들에 설정 변경 알림
            if (this.integrations.notificationManager) {
                this.integrations.notificationManager.dispatchEvent(new CustomEvent('settings:updated', {
                    detail: { source: 'SettingsComponent', settings: e.detail.settingsData }
                }));
            }
        });

        this.component.addEventListener('settings:reset', (e) => {
            console.log('🔄 Settings 초기화 완료');
            
            // 기존 시스템들도 초기화
            this.resetIntegratedSystems();
        });

        // 기존 시스템 이벤트를 Settings에 전달
        
        // 알림 권한 변경 감지
        if (this.integrations.notificationManager) {
            this.integrations.notificationManager.addEventListener('permission:changed', (e) => {
                const hasPermission = e.detail.permission === 'granted';
                this.component.updateSetting('notifications.enablePushNotifications', hasPermission);
            });
        }

        // 프로필 변경 감지
        if (this.integrations.profileComponent) {
            this.integrations.profileComponent.addEventListener('profile:saved', (e) => {
                // 프로필의 개인정보 설정을 Settings에 반영
                const privacySettings = e.detail.profileData.privacySettings;
                if (privacySettings) {
                    Object.entries(privacySettings).forEach(([key, value]) => {
                        const settingKey = `privacy.${this.mapPrivacySettingKey(key)}`;
                        if (this.component.currentSettings.has(settingKey)) {
                            this.component.updateSetting(settingKey, value);
                        }
                    });
                }
            });
        }

        console.log('🔗 Settings 이벤트 연결 완료');
    }

    propagateToNotificationManager(settingKey, value) {
        const notifManager = this.integrations.notificationManager;
        if (!notifManager) return;

        try {
            switch (settingKey) {
                case 'enablePushNotifications':
                    if (value) {
                        notifManager.requestPermission();
                    } else {
                        console.log('푸시 알림 비활성화');
                    }
                    break;

                case 'quietHoursEnabled':
                case 'quietHoursStart':
                case 'quietHoursEnd':
                    const quietEnabled = this.component.getSetting('notifications.quietHoursEnabled');
                    const startTime = this.component.getSetting('notifications.quietHoursStart');
                    const endTime = this.component.getSetting('notifications.quietHoursEnd');
                    
                    if (notifManager.setQuietHours) {
                        notifManager.setQuietHours(quietEnabled, startTime, endTime);
                    }
                    break;

                case 'alertFrequencyLimit':
                    if (notifManager.setFrequencyLimit) {
                        notifManager.setFrequencyLimit(value);
                    }
                    break;
            }
        } catch (error) {
            console.warn('알림 설정 전파 실패:', error);
        }
    }

    propagateToProfileComponent(settingKey, value) {
        const profileComp = this.integrations.profileComponent;
        if (!profileComp) return;

        try {
            const profilePrivacyKey = this.mapSettingToProfileKey(settingKey);
            if (profilePrivacyKey && profileComp.profileData?.privacySettings) {
                profileComp.profileData.privacySettings[profilePrivacyKey] = value;
                profileComp.markAsDirty?.();
            }
        } catch (error) {
            console.warn('프로필 설정 전파 실패:', error);
        }
    }

    mapPrivacySettingKey(profileKey) {
        const mapping = {
            'shareLocationWithFriends': 'shareLocationData',
            'shareActivityStatus': 'shareActivityData',
            'allowDataAnalytics': 'allowAnalytics',
            'showOnlineStatus': 'showOnlineStatus',
            'allowFriendRequests': 'allowFriendRequests'
        };
        return mapping[profileKey] || profileKey;
    }

    mapSettingToProfileKey(settingKey) {
        const mapping = {
            'shareLocationData': 'shareLocationWithFriends',
            'shareActivityData': 'shareActivityStatus',
            'allowAnalytics': 'allowDataAnalytics',
            'showOnlineStatus': 'showOnlineStatus',
            'allowFriendRequests': 'allowFriendRequests'
        };
        return mapping[settingKey] || settingKey;
    }

    upgradeNotificationsPage() {
        // 기존 알림 설정 페이지를 Settings 시스템으로 업그레이드
        const notificationsPage = document.getElementById('notifications-page');
        if (!notificationsPage) return;

        // 기존 내용 백업
        const originalContent = notificationsPage.innerHTML;
        
        // Settings 시스템이 로드되면 페이지 업그레이드
        if (this.component && this.component.isInitialized) {
            console.log('📱 알림 설정 페이지 업그레이드');
            
            // 기존 헤더 유지하고 Settings UI로 교체
            const header = notificationsPage.querySelector('.header');
            let headerHTML = '';
            if (header) {
                headerHTML = header.outerHTML;
            }
            
            // Settings 컨테이너 생성 및 알림 카테고리로 설정
            this.component.currentCategory = 'notifications';
            notificationsPage.innerHTML = headerHTML;
            
            // Settings UI 추가
            const settingsContainer = this.component.createSettingsContainer(notificationsPage);
            this.component.renderSettingsUI();
            
            // 네비게이션 버튼 이벤트 재연결
            this.reconnectNavigationEvents();
        }
    }

    reconnectNavigationEvents() {
        // 네비게이션 버튼과 설정 페이지 연결
        const navNotifications = document.getElementById('nav-notifications');
        if (navNotifications) {
            navNotifications.addEventListener('click', () => {
                if (this.component) {
                    this.component.currentCategory = 'notifications';
                    setTimeout(() => {
                        this.component.renderSettingsUI();
                    }, 100);
                }
            });
        }
    }

    resetIntegratedSystems() {
        try {
            // 알림 매니저 초기화
            if (this.integrations.notificationManager && this.integrations.notificationManager.resetToDefaults) {
                this.integrations.notificationManager.resetToDefaults();
            }

            // 프로필 개인정보 설정 초기화
            if (this.integrations.profileComponent && this.integrations.profileComponent.profileData) {
                this.integrations.profileComponent.profileData.privacySettings = {
                    shareLocationWithFriends: true,
                    allowFriendRequests: true,
                    showOnlineStatus: true,
                    shareActivityStatus: true,
                    allowDataAnalytics: true
                };
            }

            console.log('✅ 통합된 시스템들 초기화 완료');
        } catch (error) {
            console.error('❌ 통합 시스템 초기화 실패:', error);
        }
    }

    // 기존 코드에서 사용할 수 있는 향상된 기능들
    getEnhancedFeatures() {
        if (!this.component) return {};

        return {
            // 통합된 알림 설정 관리
            updateNotificationSettings: (settings) => {
                Object.entries(settings).forEach(([key, value]) => {
                    this.component.updateSetting(`notifications.${key}`, value);
                });
            },

            // 통합된 개인정보 설정 관리
            updatePrivacySettings: (settings) => {
                Object.entries(settings).forEach(([key, value]) => {
                    this.component.updateSetting(`privacy.${key}`, value);
                });
            },

            // 테마 변경
            setTheme: (theme) => {
                this.component.updateSetting('appearance.theme', theme);
            },

            // 디버그 모드 토글
            toggleDebugMode: () => {
                const current = this.component.getSetting('advanced.enableDebugMode');
                this.component.updateSetting('advanced.enableDebugMode', !current);
            },

            // 설정 카테고리 직접 이동
            goToCategory: (category) => {
                if (this.component.settingsCategories[category]) {
                    this.component.switchCategory(category);
                }
            },

            // 특정 설정값 조회
            getSetting: (key) => {
                return this.component.getSetting(key);
            },

            // 카테고리별 설정 조회
            getCategorySettings: (category) => {
                return this.component.getSettingsByCategory(category);
            },

            // 설정 내보내기/가져오기
            exportSettings: () => {
                return this.component.exportSettings();
            },

            importSettings: (settingsData) => {
                Object.entries(settingsData).forEach(([key, value]) => {
                    if (this.component.currentSettings.has(key)) {
                        this.component.updateSetting(key, value);
                    }
                });
            },

            // 이벤트 리스너 추가
            onSettingsEvent: (event, callback) => {
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
                notificationManager: !!this.integrations.notificationManager,
                profileComponent: !!this.integrations.profileComponent,
                auth: !!this.integrations.auth,
                storage: !!this.integrations.storage
            },
            componentStatus: this.component ? this.component.getStatus() : null
        };
    }

    // 진단 도구
    async runDiagnostics() {
        if (!this.component) {
            return { error: 'SettingsComponent not available' };
        }

        const diagnostics = {
            timestamp: new Date().toISOString(),
            component: this.component.getStatus(),
            integrations: this.getIntegrationStatus(),
            settings: {
                total: this.component.currentSettings.size,
                categories: Object.keys(this.component.settingsCategories).length,
                isDirty: this.component.isDirty,
                autoSaveEnabled: this.component.options.autoSave
            },
            compatibility: {
                notificationManagerConnected: !!this.integrations.notificationManager,
                profileComponentConnected: !!this.integrations.profileComponent,
                localStorageAvailable: typeof localStorage !== 'undefined',
                supabaseConnected: !!this.integrations.storage?.supabase
            }
        };

        console.log('🔍 Settings 통합 진단 결과:', diagnostics);
        return diagnostics;
    }
}

// 전역 초기화 함수
window.initSettingsIntegration = () => {
    if (window.__settingsIntegrationInitialized) {
        console.log('⚠️ Settings 통합이 이미 초기화됨');
        return;
    }

    console.log('🚀 Settings 통합 초기화 시작');
    
    const integration = new SettingsIntegration();
    window.settingsIntegration = integration;
    window.__settingsIntegrationInitialized = true;

    // 향상된 기능을 전역에서 사용 가능하게
    window.settingsEnhancements = integration.getEnhancedFeatures();
    
    console.log('✅ Settings 통합 초기화 완료');
    
    return integration;
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.initSettingsIntegration();
    }, 3000); // 다른 모든 컴포넌트들이 로드된 후 실행
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsIntegration;
}