/**
 * SettingsComponent v1.0
 * 앱 설정 및 환경 관리 시스템을 담당하는 독립 컴포넌트
 * 
 * 알림 설정, 테마, 언어, 개인정보, 데이터 관리, 계정 설정 등
 * 모든 설정의 중앙 집중식 관리
 */

class SettingsComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoInit: true,
            enableThemeSettings: true,
            enableNotificationSettings: true,
            enablePrivacySettings: true,
            enableDataManagement: true,
            enableAdvancedSettings: true,
            autoSave: true,
            autoSaveDelay: 2000, // 2초 지연 후 자동 저장
            debug: options.debug || false,
            ...options
        };

        // 설정 카테고리
        this.settingsCategories = {
            notifications: {
                name: '알림 설정',
                icon: '🔔',
                priority: 1,
                settings: {
                    enablePushNotifications: { type: 'toggle', default: true, label: '푸시 알림 활성화' },
                    enableFriendStatusAlerts: { type: 'toggle', default: true, label: '친구 상태 알림' },
                    enableEmergencyAlerts: { type: 'toggle', default: true, label: '응급 알림' },
                    enableSystemNotifications: { type: 'toggle', default: true, label: '시스템 알림' },
                    quietHoursEnabled: { type: 'toggle', default: false, label: '조용한 시간 활성화' },
                    quietHoursStart: { type: 'time', default: '22:00', label: '조용한 시간 시작' },
                    quietHoursEnd: { type: 'time', default: '07:00', label: '조용한 시간 종료' },
                    alertFrequencyLimit: { type: 'number', default: 5, min: 1, max: 20, label: '시간당 최대 알림 수' }
                }
            },
            appearance: {
                name: '화면 설정',
                icon: '🎨',
                priority: 2,
                settings: {
                    theme: { type: 'select', default: 'auto', options: ['light', 'dark', 'auto'], label: '테마' },
                    fontSize: { type: 'select', default: 'medium', options: ['small', 'medium', 'large'], label: '글자 크기' },
                    enableAnimations: { type: 'toggle', default: true, label: '애니메이션 효과' },
                    showProfileImages: { type: 'toggle', default: true, label: '프로필 이미지 표시' },
                    enableHighContrast: { type: 'toggle', default: false, label: '고대비 모드' }
                }
            },
            privacy: {
                name: '개인정보',
                icon: '🔒',
                priority: 3,
                settings: {
                    shareLocationData: { type: 'toggle', default: false, label: '위치 데이터 공유' },
                    shareActivityData: { type: 'toggle', default: true, label: '활동 데이터 공유' },
                    allowAnalytics: { type: 'toggle', default: true, label: '분석 데이터 수집 허용' },
                    allowPersonalization: { type: 'toggle', default: true, label: '개인화 서비스 허용' },
                    showOnlineStatus: { type: 'toggle', default: true, label: '온라인 상태 표시' },
                    allowFriendRequests: { type: 'toggle', default: true, label: '친구 요청 허용' }
                }
            },
            data: {
                name: '데이터 관리',
                icon: '💾',
                priority: 4,
                settings: {
                    enableAutoBackup: { type: 'toggle', default: true, label: '자동 백업' },
                    backupFrequency: { type: 'select', default: 'daily', options: ['hourly', 'daily', 'weekly'], label: '백업 주기' },
                    enableOfflineMode: { type: 'toggle', default: true, label: '오프라인 모드' },
                    cacheSize: { type: 'select', default: 'medium', options: ['small', 'medium', 'large'], label: '캐시 크기' },
                    enableDataCompression: { type: 'toggle', default: true, label: '데이터 압축' }
                }
            },
            security: {
                name: '보안',
                icon: '🛡️',
                priority: 5,
                settings: {
                    enableTwoFactorAuth: { type: 'toggle', default: false, label: '2단계 인증' },
                    sessionTimeout: { type: 'select', default: '24h', options: ['1h', '6h', '12h', '24h', '7d'], label: '세션 유지 시간' },
                    enableBiometric: { type: 'toggle', default: false, label: '생체 인증' },
                    autoLockEnabled: { type: 'toggle', default: false, label: '자동 화면 잠금' },
                    autoLockTime: { type: 'select', default: '5min', options: ['1min', '5min', '10min', '30min'], label: '잠금 시간' }
                }
            },
            advanced: {
                name: '고급 설정',
                icon: '⚙️',
                priority: 6,
                settings: {
                    enableDebugMode: { type: 'toggle', default: false, label: '디버그 모드' },
                    enableBetaFeatures: { type: 'toggle', default: false, label: '베타 기능 활성화' },
                    apiTimeout: { type: 'number', default: 30, min: 5, max: 120, label: 'API 타임아웃 (초)' },
                    maxRetryAttempts: { type: 'number', default: 3, min: 1, max: 10, label: '최대 재시도 횟수' },
                    enableDeveloperMode: { type: 'toggle', default: false, label: '개발자 모드' }
                }
            }
        };

        // 현재 설정값
        this.currentSettings = new Map();
        
        // 기본값으로 초기화
        this.initializeDefaultSettings();

        // 상태 관리
        this.isInitialized = false;
        this.isDirty = false;
        this.currentCategory = 'notifications';
        this.settingsCache = new Map();
        this.autoSaveTimer = null;
        
        // UI 요소들
        this.settingsContainer = null;
        this.categoryTabs = null;
        this.settingsContent = null;
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        this.notificationManager = null;
        
        console.log('⚙️ SettingsComponent 초기화', this.options);
        
        // 자동 초기화 비활성화 (UI 간섭 방지)
        // if (this.options.autoInit) {
        //     this.init();
        // }
        console.log('⚠️ SettingsComponent 자동 초기화 비활성화됨 (UI 보호)');
    }

    /**
     * 기본 설정값 초기화
     */
    initializeDefaultSettings() {
        Object.entries(this.settingsCategories).forEach(([categoryKey, category]) => {
            Object.entries(category.settings).forEach(([settingKey, setting]) => {
                const fullKey = `${categoryKey}.${settingKey}`;
                this.currentSettings.set(fullKey, setting.default);
            });
        });
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 Settings 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            this.notificationManager = window.notificationManagerComponent;
            
            // UI 요소 초기화
            this.initializeUIElements();
            
            // 저장된 설정 로드
            await this.loadSettings();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 설정 UI 렌더링
            this.renderSettingsUI();
            
            // 설정 적용
            this.applyCurrentSettings();
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('settings:system-ready', {
                detail: { component: this, settingsCount: this.currentSettings.size }
            }));

            console.log('✅ Settings 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ Settings 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('settings:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * UI 요소 초기화
     */
    initializeUIElements() {
        // 알림 설정 페이지 확인
        const notificationsPage = document.getElementById('notifications-page');
        if (!notificationsPage) {
            console.warn('알림 설정 페이지를 찾을 수 없습니다');
            return;
        }

        // 설정 컨테이너 생성/확인
        this.settingsContainer = notificationsPage.querySelector('.settings-container') || 
                               this.createSettingsContainer(notificationsPage);

        console.log('🎨 Settings UI 요소 초기화 완료');
    }

    /**
     * 설정 컨테이너 생성
     */
    createSettingsContainer(container) {
        const settingsHTML = `
            <div class="settings-container">
                <style>
                .settings-container {
                    max-width: 400px;
                    margin: 0 auto;
                    background: white;
                }
                
                .settings-tabs {
                    display: flex;
                    overflow-x: auto;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    padding: 4px;
                }
                
                .settings-tab {
                    flex: 1;
                    min-width: 80px;
                    padding: 8px 12px;
                    background: none;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    text-align: center;
                    color: #6c757d;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                
                .settings-tab.active {
                    background: #74c0fc;
                    color: white;
                }
                
                .settings-tab:hover:not(.active) {
                    background: #e9ecef;
                }
                
                .settings-content {
                    background: white;
                }
                
                .settings-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    color: #495057;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .setting-item:last-child {
                    border-bottom: none;
                }
                
                .setting-label {
                    flex: 1;
                    font-size: 14px;
                    color: #495057;
                    padding-right: 10px;
                }
                
                .setting-label.subtitle {
                    font-size: 12px;
                    color: #6c757d;
                    margin-top: 2px;
                }
                
                .setting-control {
                    display: flex;
                    align-items: center;
                }
                
                .setting-toggle {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    background: #ccc;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                
                .setting-toggle.active {
                    background: #74c0fc;
                }
                
                .setting-toggle::after {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.3s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                
                .setting-toggle.active::after {
                    transform: translateX(20px);
                }
                
                .setting-select {
                    padding: 6px 10px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 13px;
                    background: white;
                    min-width: 80px;
                }
                
                .setting-number {
                    width: 70px;
                    padding: 6px 8px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 13px;
                    text-align: center;
                }
                
                .setting-time {
                    padding: 6px 10px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 13px;
                    min-width: 70px;
                }
                
                .settings-actions {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .action-btn {
                    width: 100%;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-bottom: 8px;
                    transition: background 0.2s;
                }
                
                .action-btn.primary {
                    background: #74c0fc;
                    color: white;
                }
                
                .action-btn.primary:hover {
                    background: #4dabf7;
                }
                
                .action-btn.secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .action-btn.secondary:hover {
                    background: #5a6268;
                }
                
                .action-btn.danger {
                    background: #dc3545;
                    color: white;
                }
                
                .action-btn.danger:hover {
                    background: #c82333;
                }
                
                .save-indicator {
                    display: none;
                    text-align: center;
                    padding: 8px;
                    background: #d4edda;
                    color: #155724;
                    border-radius: 4px;
                    margin-top: 10px;
                    font-size: 12px;
                }
                
                .save-indicator.show {
                    display: block;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .loading-settings {
                    text-align: center;
                    padding: 40px;
                    color: #6c757d;
                }
                
                @media (max-width: 480px) {
                    .settings-tabs {
                        flex-wrap: wrap;
                    }
                    
                    .settings-tab {
                        min-width: 60px;
                        font-size: 10px;
                    }
                }
                </style>
                
                <div class="settings-tabs" id="settings-tabs">
                    <!-- 탭들이 여기에 동적 생성됨 -->
                </div>
                
                <div class="settings-content" id="settings-content">
                    <div class="loading-settings">
                        ⚙️ 설정을 불러오는 중...
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="action-btn primary" onclick="window.settingsComponent.saveAllSettings()">
                        💾 모든 설정 저장
                    </button>
                    <button class="action-btn secondary" onclick="window.settingsComponent.resetToDefaults()">
                        🔄 기본값으로 초기화
                    </button>
                    <button class="action-btn secondary" onclick="window.settingsComponent.exportSettings()">
                        📤 설정 내보내기
                    </button>
                    <button class="action-btn danger" onclick="window.settingsComponent.clearAllData()">
                        🗑️ 모든 데이터 삭제
                    </button>
                    
                    <div class="save-indicator" id="save-indicator">
                        ✅ 설정이 저장되었습니다
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = settingsHTML;
        return container.querySelector('.settings-container');
    }

    /**
     * 저장된 설정 로드
     */
    async loadSettings() {
        try {
            console.log('📥 설정 로딩 중...');

            const currentUser = this.auth?.getCurrentUser();
            if (!currentUser) {
                console.log('로그인된 사용자가 없어 기본 설정 사용');
                return;
            }

            // Supabase에서 사용자 설정 로드
            if (this.supabase) {
                const settingsResult = await this.supabase.query('user_settings', {
                    eq: { user_id: currentUser.id },
                    single: true
                });

                if (settingsResult.data && !settingsResult.error) {
                    this.mergeSettings(settingsResult.data.settings || {});
                    console.log('✅ Supabase에서 설정 로드 완료');
                }
            }

            // 로컬 저장소에서 설정 로드
            const localSettings = JSON.parse(localStorage.getItem(`user-settings-${currentUser.id}`) || '{}');
            if (Object.keys(localSettings).length > 0) {
                this.mergeSettings(localSettings);
                console.log('📱 로컬 저장소에서 설정 로드 완료');
            }

            // 캐시 업데이트
            this.settingsCache.set(currentUser.id, Object.fromEntries(this.currentSettings));

        } catch (error) {
            console.error('❌ 설정 로드 실패:', error);
        }
    }

    /**
     * 설정값 병합
     */
    mergeSettings(newSettings) {
        Object.entries(newSettings).forEach(([key, value]) => {
            if (this.currentSettings.has(key)) {
                this.currentSettings.set(key, value);
            }
        });
    }

    /**
     * 설정 UI 렌더링
     */
    renderSettingsUI() {
        try {
            console.log('🎨 설정 UI 렌더링 시작');

            this.renderTabs();
            this.renderCurrentCategory();

            console.log('✅ 설정 UI 렌더링 완료');

        } catch (error) {
            console.error('❌ 설정 UI 렌더링 실패:', error);
        }
    }

    /**
     * 탭 렌더링
     */
    renderTabs() {
        const tabsContainer = document.getElementById('settings-tabs');
        if (!tabsContainer) return;

        const sortedCategories = Object.entries(this.settingsCategories)
            .sort(([,a], [,b]) => a.priority - b.priority);

        tabsContainer.innerHTML = sortedCategories.map(([key, category]) => `
            <button class="settings-tab ${key === this.currentCategory ? 'active' : ''}" 
                    data-category="${key}">
                <div>${category.icon}</div>
                <div>${category.name}</div>
            </button>
        `).join('');

        // 탭 클릭 이벤트
        tabsContainer.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.currentTarget.getAttribute('data-category');
                this.switchCategory(category);
            });
        });
    }

    /**
     * 현재 카테고리 렌더링
     */
    renderCurrentCategory() {
        const contentContainer = document.getElementById('settings-content');
        if (!contentContainer) return;

        const category = this.settingsCategories[this.currentCategory];
        if (!category) return;

        contentContainer.innerHTML = `
            <div class="settings-section">
                <div class="section-title">
                    ${category.icon} ${category.name}
                </div>
                ${this.renderCategorySettings(this.currentCategory, category.settings)}
            </div>
        `;

        this.setupSettingControls();
    }

    /**
     * 카테고리 설정 렌더링
     */
    renderCategorySettings(categoryKey, settings) {
        return Object.entries(settings).map(([settingKey, setting]) => {
            const fullKey = `${categoryKey}.${settingKey}`;
            const currentValue = this.currentSettings.get(fullKey);

            return `
                <div class="setting-item">
                    <div class="setting-label">
                        ${setting.label}
                        ${setting.subtitle ? `<div class="subtitle">${setting.subtitle}</div>` : ''}
                    </div>
                    <div class="setting-control">
                        ${this.renderSettingControl(fullKey, setting, currentValue)}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 설정 컨트롤 렌더링
     */
    renderSettingControl(settingKey, setting, currentValue) {
        switch (setting.type) {
            case 'toggle':
                return `
                    <div class="setting-toggle ${currentValue ? 'active' : ''}" 
                         data-setting="${settingKey}">
                    </div>
                `;

            case 'select':
                return `
                    <select class="setting-select" data-setting="${settingKey}">
                        ${setting.options.map(option => `
                            <option value="${option}" ${option === currentValue ? 'selected' : ''}>
                                ${this.getOptionLabel(option)}
                            </option>
                        `).join('')}
                    </select>
                `;

            case 'number':
                return `
                    <input type="number" class="setting-number" 
                           data-setting="${settingKey}" 
                           value="${currentValue}"
                           min="${setting.min || 0}"
                           max="${setting.max || 100}">
                `;

            case 'time':
                return `
                    <input type="time" class="setting-time" 
                           data-setting="${settingKey}" 
                           value="${currentValue}">
                `;

            default:
                return `<span>알 수 없는 설정 타입: ${setting.type}</span>`;
        }
    }

    /**
     * 옵션 라벨 변환
     */
    getOptionLabel(option) {
        const labels = {
            // 테마
            'light': '밝은 테마',
            'dark': '어두운 테마',
            'auto': '시스템 설정',

            // 글자 크기
            'small': '작게',
            'medium': '보통',
            'large': '크게',

            // 백업 주기
            'hourly': '매시간',
            'daily': '매일',
            'weekly': '매주',

            // 캐시 크기
            'small': '작음',
            'medium': '보통',
            'large': '큼',

            // 세션 유지 시간
            '1h': '1시간',
            '6h': '6시간',
            '12h': '12시간',
            '24h': '24시간',
            '7d': '7일',

            // 자동 잠금 시간
            '1min': '1분',
            '5min': '5분',
            '10min': '10분',
            '30min': '30분'
        };

        return labels[option] || option;
    }

    /**
     * 설정 컨트롤 이벤트 설정
     */
    setupSettingControls() {
        // 토글 컨트롤
        document.querySelectorAll('.setting-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const settingKey = e.target.getAttribute('data-setting');
                const isActive = e.target.classList.contains('active');
                
                e.target.classList.toggle('active');
                this.updateSetting(settingKey, !isActive);
            });
        });

        // 선택 컨트롤
        document.querySelectorAll('.setting-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const settingKey = e.target.getAttribute('data-setting');
                this.updateSetting(settingKey, e.target.value);
            });
        });

        // 숫자 입력 컨트롤
        document.querySelectorAll('.setting-number').forEach(input => {
            input.addEventListener('input', (e) => {
                const settingKey = e.target.getAttribute('data-setting');
                this.updateSetting(settingKey, parseInt(e.target.value) || 0);
            });
        });

        // 시간 입력 컨트롤
        document.querySelectorAll('.setting-time').forEach(input => {
            input.addEventListener('change', (e) => {
                const settingKey = e.target.getAttribute('data-setting');
                this.updateSetting(settingKey, e.target.value);
            });
        });
    }

    /**
     * 카테고리 전환
     */
    switchCategory(categoryKey) {
        if (this.currentCategory === categoryKey) return;

        this.currentCategory = categoryKey;

        // 탭 활성 상태 업데이트
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-category') === categoryKey);
        });

        // 콘텐츠 렌더링
        this.renderCurrentCategory();

        this.dispatchEvent(new CustomEvent('settings:category-changed', {
            detail: { category: categoryKey }
        }));
    }

    /**
     * 설정값 업데이트
     */
    updateSetting(settingKey, value) {
        try {
            console.log(`⚙️ 설정 업데이트: ${settingKey} = ${value}`);

            const oldValue = this.currentSettings.get(settingKey);
            this.currentSettings.set(settingKey, value);

            this.isDirty = true;

            // 자동 저장 스케줄링
            if (this.options.autoSave) {
                this.scheduleAutoSave();
            }

            // 설정 즉시 적용
            this.applySetting(settingKey, value, oldValue);

            this.dispatchEvent(new CustomEvent('settings:changed', {
                detail: { settingKey, value, oldValue }
            }));

        } catch (error) {
            console.error('❌ 설정 업데이트 실패:', error);
        }
    }

    /**
     * 자동 저장 스케줄링
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            this.saveAllSettings();
        }, this.options.autoSaveDelay);
    }

    /**
     * 개별 설정 적용
     */
    applySetting(settingKey, value, oldValue) {
        try {
            const [category, setting] = settingKey.split('.');

            switch (settingKey) {
                case 'appearance.theme':
                    this.applyTheme(value);
                    break;
                
                case 'appearance.fontSize':
                    this.applyFontSize(value);
                    break;
                
                case 'appearance.enableAnimations':
                    this.applyAnimations(value);
                    break;
                
                case 'notifications.enablePushNotifications':
                    this.applyPushNotifications(value);
                    break;
                
                case 'privacy.shareLocationData':
                    this.applyLocationSharing(value);
                    break;
                
                case 'advanced.enableDebugMode':
                    this.applyDebugMode(value);
                    break;

                default:
                    console.log(`설정 ${settingKey}는 즉시 적용이 필요하지 않습니다`);
                    break;
            }

        } catch (error) {
            console.error('❌ 설정 적용 실패:', error);
        }
    }

    /**
     * 현재 설정 적용
     */
    applyCurrentSettings() {
        try {
            console.log('🔧 현재 설정 적용 시작');

            // 테마 적용
            const theme = this.currentSettings.get('appearance.theme');
            if (theme) this.applyTheme(theme);

            // 글자 크기 적용
            const fontSize = this.currentSettings.get('appearance.fontSize');
            if (fontSize) this.applyFontSize(fontSize);

            // 애니메이션 적용
            const enableAnimations = this.currentSettings.get('appearance.enableAnimations');
            if (enableAnimations !== undefined) this.applyAnimations(enableAnimations);

            // 푸시 알림 적용
            const enablePushNotifications = this.currentSettings.get('notifications.enablePushNotifications');
            if (enablePushNotifications !== undefined) this.applyPushNotifications(enablePushNotifications);

            console.log('✅ 현재 설정 적용 완료');

        } catch (error) {
            console.error('❌ 설정 적용 실패:', error);
        }
    }

    /**
     * 설정 적용 메서드들
     */

    // 테마 적용
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    // 글자 크기 적용
    applyFontSize(fontSize) {
        const sizes = { small: '12px', medium: '14px', large: '16px' };
        document.documentElement.style.setProperty('--base-font-size', sizes[fontSize] || sizes.medium);
    }

    // 애니메이션 적용
    applyAnimations(enabled) {
        if (enabled) {
            document.documentElement.style.removeProperty('--animation-duration');
        } else {
            document.documentElement.style.setProperty('--animation-duration', '0s');
        }
    }

    // 푸시 알림 적용
    applyPushNotifications(enabled) {
        if (this.notificationManager) {
            if (enabled) {
                this.notificationManager.requestPermission();
            } else {
                // 알림 비활성화 처리
                console.log('푸시 알림이 비활성화되었습니다');
            }
        }
    }

    // 위치 공유 적용
    applyLocationSharing(enabled) {
        if (enabled) {
            navigator.geolocation?.getCurrentPosition(
                () => console.log('위치 정보 공유가 활성화되었습니다'),
                () => console.warn('위치 정보 접근이 거부되었습니다')
            );
        } else {
            console.log('위치 정보 공유가 비활성화되었습니다');
        }
    }

    // 디버그 모드 적용
    applyDebugMode(enabled) {
        if (enabled) {
            console.log('🐛 디버그 모드 활성화');
            window.debugMode = true;
        } else {
            console.log('디버그 모드 비활성화');
            window.debugMode = false;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 시스템 테마 변경 감지
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.currentSettings.get('appearance.theme') === 'auto') {
                this.applyTheme('auto');
            }
        });

        console.log('👂 Settings 이벤트 리스너 설정 완료');
    }

    /**
     * 모든 설정 저장
     */
    async saveAllSettings() {
        try {
            console.log('💾 모든 설정 저장 시작');

            const currentUser = this.auth?.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인된 사용자가 없습니다.');
            }

            const settingsData = Object.fromEntries(this.currentSettings);

            // Supabase에 저장
            if (this.supabase) {
                const result = await this.supabase.upsert('user_settings', {
                    user_id: currentUser.id,
                    settings: settingsData,
                    updated_at: new Date().toISOString()
                });

                if (result.error) {
                    throw new Error('데이터베이스 저장 실패: ' + result.error.message);
                }
            }

            // 로컬 저장소에 백업 저장
            localStorage.setItem(`user-settings-${currentUser.id}`, JSON.stringify(settingsData));

            // 캐시 업데이트
            this.settingsCache.set(currentUser.id, settingsData);

            this.isDirty = false;

            // 저장 완료 표시
            this.showSaveIndicator();

            this.dispatchEvent(new CustomEvent('settings:saved', {
                detail: { settingsData }
            }));

            console.log('✅ 모든 설정 저장 완료');

        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
            alert('설정 저장에 실패했습니다: ' + error.message);

            this.dispatchEvent(new CustomEvent('settings:save-error', {
                detail: { error }
            }));
        }
    }

    /**
     * 저장 완료 표시
     */
    showSaveIndicator() {
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.classList.add('show');
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 3000);
        }
    }

    /**
     * 기본값으로 초기화
     */
    resetToDefaults() {
        if (!confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
            return;
        }

        try {
            console.log('🔄 설정 기본값 초기화');

            this.initializeDefaultSettings();
            this.applyCurrentSettings();
            this.renderCurrentCategory();
            this.saveAllSettings();

            this.dispatchEvent(new CustomEvent('settings:reset', {
                detail: { settings: Object.fromEntries(this.currentSettings) }
            }));

            alert('모든 설정이 기본값으로 초기화되었습니다.');

        } catch (error) {
            console.error('❌ 설정 초기화 실패:', error);
            alert('설정 초기화에 실패했습니다.');
        }
    }

    /**
     * 설정 내보내기
     */
    exportSettings() {
        try {
            const exportData = {
                settings: Object.fromEntries(this.currentSettings),
                exportedAt: new Date().toISOString(),
                appVersion: '13.5.1',
                userId: this.auth?.getCurrentUser()?.id
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `lonely-care-settings-${new Date().toISOString().split('T')[0]}.json`;
            downloadLink.click();

            URL.revokeObjectURL(url);

            this.dispatchEvent(new CustomEvent('settings:exported', {
                detail: { exportData }
            }));

        } catch (error) {
            console.error('❌ 설정 내보내기 실패:', error);
            alert('설정 내보내기에 실패했습니다.');
        }
    }

    /**
     * 모든 데이터 삭제
     */
    clearAllData() {
        const confirmation = prompt(
            '모든 데이터를 삭제하시겠습니까?\n삭제하려면 "DELETE"를 입력하세요:'
        );

        if (confirmation !== 'DELETE') {
            return;
        }

        try {
            console.log('🗑️ 모든 데이터 삭제 시작');

            const currentUser = this.auth?.getCurrentUser();
            if (currentUser) {
                // 로컬 저장소에서 사용자 데이터 삭제
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.includes(currentUser.id)) {
                        keysToDelete.push(key);
                    }
                }
                
                keysToDelete.forEach(key => localStorage.removeItem(key));

                // 캐시 삭제
                this.settingsCache.clear();
            }

            // 설정 초기화
            this.initializeDefaultSettings();
            this.applyCurrentSettings();
            this.renderCurrentCategory();

            this.dispatchEvent(new CustomEvent('settings:data-cleared'));

            alert('모든 데이터가 삭제되었습니다. 페이지를 새로고침합니다.');
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error('❌ 데이터 삭제 실패:', error);
            alert('데이터 삭제에 실패했습니다.');
        }
    }

    /**
     * 설정값 조회 메서드들
     */
    getSetting(key) {
        return this.currentSettings.get(key);
    }

    getSettingsByCategory(category) {
        const categorySettings = {};
        this.currentSettings.forEach((value, key) => {
            if (key.startsWith(`${category}.`)) {
                const settingKey = key.substring(category.length + 1);
                categorySettings[settingKey] = value;
            }
        });
        return categorySettings;
    }

    getAllSettings() {
        return Object.fromEntries(this.currentSettings);
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isDirty: this.isDirty,
            currentCategory: this.currentCategory,
            totalSettings: this.currentSettings.size,
            categoriesCount: Object.keys(this.settingsCategories).length,
            autoSaveEnabled: this.options.autoSave,
            cacheSize: this.settingsCache.size
        };
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        // 타이머 정리
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // 데이터 정리
        this.currentSettings.clear();
        this.settingsCache.clear();

        // UI 요소 참조 제거
        this.settingsContainer = null;
        this.categoryTabs = null;
        this.settingsContent = null;

        this.isInitialized = false;
        this.isDirty = false;

        console.log('🗑️ SettingsComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.SettingsComponent = SettingsComponent;
    
    // 즉시 인스턴스 생성 비활성화 (UI 간섭 방지)
    // if (!window.settingsComponent) {
    //     window.settingsComponent = new SettingsComponent({ autoInit: false });
    //     
    //     console.log('🌐 SettingsComponent 전역 등록 완룼');
    // }
    console.log('⚠️ SettingsComponent 자동 인스턴스 생성 비활성화됨 (UI 보호)');
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsComponent;
}