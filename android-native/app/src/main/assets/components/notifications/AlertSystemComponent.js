/**
 * AlertSystemComponent v1.0
 * 고급 알림 로직 및 규칙 엔진을 담당하는 독립 컴포넌트
 * 
 * 친구 상태 알림의 스마트 규칙, 에스컬레이션, 필터링, 스케줄링 등
 * 관리자 설정 기반 동적 알림 규칙 적용
 */

class AlertSystemComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoInit: true,
            enableRulesEngine: true,
            enableEscalation: true,
            enableSmartFiltering: true,
            enableScheduling: true,
            ruleUpdateInterval: 5 * 60 * 1000, // 5분마다 규칙 업데이트
            escalationDelay: 60 * 60 * 1000, // 1시간 에스컬레이션 지연
            maxRetries: 3,
            debug: options.debug || false,
            ...options
        };

        // 알림 규칙 시스템
        this.alertRules = {
            // 기본 시간 기반 규칙 (분 단위)
            timeBasedRules: {
                warning: 1440,   // 24시간 (관리자 설정으로 덮어씀)
                danger: 2880,    // 48시간 (관리자 설정으로 덮어씀)
                emergency: 4320  // 72시간 (관리자 설정으로 덮어씀)
            },
            
            // 조건부 규칙
            conditionalRules: {
                weekendMultiplier: 1.5,  // 주말엔 1.5배 더 느리게
                nightModeDelay: 0.8,     // 밤시간엔 20% 더 빠르게
                holidayMultiplier: 2.0   // 공휴일엔 2배 더 느리게
            },
            
            // 사용자별 커스텀 규칙
            userCustomRules: new Map(),
            
            // 그룹별 규칙
            groupRules: new Map(),
            
            // 에스컬레이션 규칙
            escalationRules: {
                retryCount: 3,
                retryInterval: 30 * 60 * 1000, // 30분
                escalationChain: ['friend', 'emergency_contact', 'admin'],
                emergencyContacts: {
                    fireDept: { number: '119', enabled: true },
                    police: { number: '112', enabled: false },
                    cityHall: { number: '', enabled: false }
                }
            }
        };

        // 상태 관리
        this.isInitialized = false;
        this.activeAlerts = new Map(); // 활성 알림 추적
        this.alertHistory = new Map(); // 알림 히스토리
        this.pendingEscalations = new Map(); // 대기 중인 에스컬레이션
        this.suppressedAlerts = new Set(); // 억제된 알림
        this.ruleCache = new Map(); // 규칙 캐시
        
        // 스케줄러 및 타이머
        this.ruleUpdateTimer = null;
        this.escalationTimer = null;
        this.alertCleanupTimer = null;
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        this.notificationManager = null;
        this.fcmComponent = null;
        this.friendStatusComponent = null;
        
        console.log('⚠️ AlertSystemComponent 초기화', this.options);
        
        // 자동 초기화
        if (this.options.autoInit) {
            this.init();
        }
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 AlertSystem 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            this.notificationManager = window.notificationManagerComponent;
            this.fcmComponent = window.fcmComponent;
            this.friendStatusComponent = window.friendStatusComponent;
            
            if (!this.auth) {
                throw new Error('필수 의존성 (Auth)이 준비되지 않았습니다.');
            }
            
            // 관리자 설정 로드
            await this.loadAdminSettings();
            
            // 사용자별 규칙 로드
            await this.loadUserRules();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 규칙 엔진 시작
            if (this.options.enableRulesEngine) {
                this.startRulesEngine();
            }
            
            // 에스컬레이션 시스템 시작
            if (this.options.enableEscalation) {
                this.startEscalationSystem();
            }
            
            // 정리 작업 스케줄러 시작
            this.startCleanupScheduler();
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('alert:system-ready', {
                detail: { component: this, rulesLoaded: this.ruleCache.size }
            }));

            console.log('✅ AlertSystem 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ AlertSystem 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('alert:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 관리자 설정 로드
     */
    async loadAdminSettings() {
        try {
            console.log('🔧 관리자 알림 설정 로드 중...');

            // Supabase에서 관리자 설정 조회
            if (this.supabase) {
                const settingsResult = await this.supabase.query('notification_settings_admin', {
                    order: { updated_at: 'desc' },
                    limit: 1,
                    single: true
                });

                if (settingsResult.data && !settingsResult.error) {
                    const settings = settingsResult.data;
                    
                    // 시간 기반 규칙 업데이트
                    this.alertRules.timeBasedRules = {
                        warning: settings.warning_minutes || this.alertRules.timeBasedRules.warning,
                        danger: settings.danger_minutes || this.alertRules.timeBasedRules.danger,
                        emergency: settings.emergency_minutes || this.alertRules.timeBasedRules.emergency
                    };

                    // 에스컬레이션 설정 업데이트
                    if (settings.escalation_enabled !== undefined) {
                        this.alertRules.escalationRules.enabled = settings.escalation_enabled;
                    }

                    console.log('✅ Supabase 관리자 설정 로드 완료:', this.alertRules.timeBasedRules);
                }
            }

            // 로컬 저장소에서 백업 설정 로드
            const localAdminSettings = JSON.parse(localStorage.getItem('admin-notification-settings') || '{}');
            if (localAdminSettings.warning_minutes) {
                this.alertRules.timeBasedRules.warning = localAdminSettings.warning_minutes;
                this.alertRules.timeBasedRules.danger = localAdminSettings.danger_minutes;
                this.alertRules.timeBasedRules.emergency = localAdminSettings.emergency_minutes;
                console.log('📱 로컬 관리자 설정 적용:', this.alertRules.timeBasedRules);
            }

            // 응급 연락처 설정 로드
            const emergencyContacts = JSON.parse(localStorage.getItem('adminEmergencyContacts') || '{}');
            if (Object.keys(emergencyContacts).length > 0) {
                this.alertRules.escalationRules.emergencyContacts = {
                    fireDept: { 
                        number: emergencyContacts.fireDept || '119', 
                        enabled: emergencyContacts.fireDeptEnabled !== false 
                    },
                    police: { 
                        number: emergencyContacts.police || '112', 
                        enabled: emergencyContacts.policeEnabled || false 
                    },
                    cityHall: { 
                        number: emergencyContacts.cityHall || '', 
                        enabled: emergencyContacts.cityHallEnabled || false 
                    }
                };
            }

        } catch (error) {
            console.warn('⚠️ 관리자 설정 로드 실패, 기본값 사용:', error);
        }
    }

    /**
     * 사용자별 규칙 로드
     */
    async loadUserRules() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser || !this.supabase) return;

            console.log('👤 사용자별 알림 규칙 로드 중...');

            // 사용자별 알림 설정 조회
            const userSettingsResult = await this.supabase.query('notification_settings', {
                eq: { user_id: currentUser.id },
                single: true
            });

            if (userSettingsResult.data && !userSettingsResult.error) {
                const userRules = {
                    quietHoursEnabled: userSettingsResult.data.quiet_hours_enabled,
                    quietHoursStart: userSettingsResult.data.quiet_hours_start,
                    quietHoursEnd: userSettingsResult.data.quiet_hours_end,
                    customThresholds: {
                        warning: userSettingsResult.data.custom_warning_minutes,
                        danger: userSettingsResult.data.custom_danger_minutes,
                        emergency: userSettingsResult.data.custom_emergency_minutes
                    },
                    alertFrequencyLimit: userSettingsResult.data.max_alerts_per_hour || 5
                };

                this.alertRules.userCustomRules.set(currentUser.id, userRules);
                console.log('✅ 사용자별 규칙 로드 완료');
            }

        } catch (error) {
            console.warn('⚠️ 사용자 규칙 로드 실패:', error);
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 친구 상태 변화 감지
        if (this.friendStatusComponent) {
            this.friendStatusComponent.addEventListener('friend:status-changed', (e) => {
                this.processFriendStatusChange(e.detail);
            });
        }

        // 관리자 설정 변경 감지
        window.addEventListener('admin:settings-changed', (e) => {
            this.loadAdminSettings();
        });

        // 사용자 설정 변경 감지
        if (this.notificationManager) {
            this.notificationManager.addEventListener('notification:setting-updated', (e) => {
                if (e.detail.key.includes('quiet_hours') || e.detail.key.includes('custom_')) {
                    this.loadUserRules();
                }
            });
        }

        // 페이지 가시성 변화 (백그라운드/포그라운드)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 포그라운드로 돌아왔을 때 억제된 알림 처리
                this.processSuppressedAlerts();
            }
        });

        console.log('👂 AlertSystem 이벤트 리스너 설정 완료');
    }

    /**
     * 친구 상태 알림 처리 (메인 로직)
     */
    async processFriendAlert(friendData) {
        try {
            const { friend_id, friend_name, hours_since_heartbeat, user_id } = friendData;
            const alertId = `friend-${friend_id}-${user_id}`;

            console.log('⚠️ 친구 상태 알림 처리 시작:', alertId);

            // 1. 규칙 기반 알림 레벨 결정
            const alertLevel = this.calculateAlertLevel(friendData);
            
            // 2. 스마트 필터링 적용
            if (await this.shouldSuppressAlert(alertId, alertLevel, friendData)) {
                console.log('🔇 알림 억제됨:', alertId);
                return false;
            }

            // 3. 조용한 시간 확인
            if (this.isInQuietHours(user_id)) {
                console.log('🌙 조용한 시간 - 알림 대기열에 추가:', alertId);
                this.addToQuietHoursQueue(alertId, { ...friendData, alert_level: alertLevel });
                return false;
            }

            // 4. 빈도 제한 확인
            if (this.isFrequencyLimitExceeded(user_id, alertLevel)) {
                console.log('📊 빈도 제한 초과 - 알림 억제:', alertId);
                this.suppressedAlerts.add(alertId);
                return false;
            }

            // 5. 알림 발송
            const alertData = {
                ...friendData,
                alert_level: alertLevel,
                escalation_level: 0,
                created_at: new Date().toISOString()
            };

            const success = await this.sendAlert(alertData);

            if (success) {
                // 6. 알림 히스토리에 기록
                this.recordAlertHistory(alertId, alertData);
                
                // 7. 에스컬레이션 스케줄링
                if (this.options.enableEscalation && alertLevel === 'emergency') {
                    this.scheduleEscalation(alertId, alertData);
                }

                this.dispatchEvent(new CustomEvent('alert:sent', {
                    detail: { alertId, alertData, success }
                }));

                console.log('✅ 친구 상태 알림 처리 완료:', alertId);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ 친구 상태 알림 처리 실패:', error);
            this.dispatchEvent(new CustomEvent('alert:error', {
                detail: { friendData, error }
            }));
            return false;
        }
    }

    /**
     * 규칙 기반 알림 레벨 계산
     */
    calculateAlertLevel(friendData) {
        const { hours_since_heartbeat, user_id } = friendData;
        const minutesSinceHeartbeat = hours_since_heartbeat * 60;

        // 사용자별 커스텀 규칙 적용
        let rules = { ...this.alertRules.timeBasedRules };
        
        const userRules = this.alertRules.userCustomRules.get(user_id);
        if (userRules && userRules.customThresholds) {
            if (userRules.customThresholds.warning) rules.warning = userRules.customThresholds.warning;
            if (userRules.customThresholds.danger) rules.danger = userRules.customThresholds.danger;
            if (userRules.customThresholds.emergency) rules.emergency = userRules.customThresholds.emergency;
        }

        // 조건부 규칙 적용
        const now = new Date();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const isNightTime = now.getHours() >= 22 || now.getHours() <= 6;
        const isHoliday = this.isHoliday(now);

        // 배수 적용
        if (isWeekend) {
            rules.warning *= this.alertRules.conditionalRules.weekendMultiplier;
            rules.danger *= this.alertRules.conditionalRules.weekendMultiplier;
            rules.emergency *= this.alertRules.conditionalRules.weekendMultiplier;
        }

        if (isNightTime) {
            rules.warning *= this.alertRules.conditionalRules.nightModeDelay;
            rules.danger *= this.alertRules.conditionalRules.nightModeDelay;
            rules.emergency *= this.alertRules.conditionalRules.nightModeDelay;
        }

        if (isHoliday) {
            rules.warning *= this.alertRules.conditionalRules.holidayMultiplier;
            rules.danger *= this.alertRules.conditionalRules.holidayMultiplier;
            rules.emergency *= this.alertRules.conditionalRules.holidayMultiplier;
        }

        // 레벨 결정
        if (minutesSinceHeartbeat >= rules.emergency) {
            return 'emergency';
        } else if (minutesSinceHeartbeat >= rules.danger) {
            return 'danger';
        } else if (minutesSinceHeartbeat >= rules.warning) {
            return 'warning';
        } else {
            return 'normal';
        }
    }

    /**
     * 스마트 필터링 - 알림 억제 여부 결정
     */
    async shouldSuppressAlert(alertId, alertLevel, friendData) {
        try {
            // 1. 이미 억제된 알림인지 확인
            if (this.suppressedAlerts.has(alertId)) {
                return true;
            }

            // 2. 최근 동일 알림 발송 확인 (중복 방지)
            const recentAlert = this.alertHistory.get(alertId);
            if (recentAlert) {
                const timeSinceLastAlert = Date.now() - new Date(recentAlert.created_at).getTime();
                const suppressionPeriod = this.getSuppressionPeriod(alertLevel);
                
                if (timeSinceLastAlert < suppressionPeriod) {
                    console.log('🔄 최근 동일 알림 발송으로 억제:', timeSinceLastAlert, 'ms');
                    return true;
                }
            }

            // 3. 친구가 최근에 활동했는지 확인 (실시간 체크)
            if (await this.hasRecentActivity(friendData.friend_id)) {
                console.log('🟢 친구 최근 활동 감지 - 알림 억제');
                this.suppressedAlerts.add(alertId);
                return true;
            }

            // 4. 사용자 상호작용 패턴 분석
            if (await this.shouldDelayBasedOnUserPattern(friendData.user_id, alertLevel)) {
                console.log('📈 사용자 패턴 기반 지연 적용');
                return true;
            }

            return false;

        } catch (error) {
            console.warn('⚠️ 스마트 필터링 오류:', error);
            return false; // 오류 시 알림 허용
        }
    }

    /**
     * 알림 발송
     */
    async sendAlert(alertData) {
        try {
            let success = false;

            // 1. NotificationManager를 통한 로컬 알림
            if (this.notificationManager) {
                success = await this.notificationManager.sendFriendInactiveNotification(alertData);
            }

            // 2. FCM을 통한 푸시 알림 (백그라운드용)
            if (this.fcmComponent && alertData.user_id) {
                const fcmSuccess = await this.fcmComponent.sendFriendStatusAlert(alertData, alertData.user_id);
                if (fcmSuccess) success = true;
            }

            // 3. 데이터베이스에 알림 기록
            if (this.supabase && success) {
                await this.supabase.insert('alert_system_logs', {
                    alert_id: `friend-${alertData.friend_id}-${alertData.user_id}`,
                    user_id: alertData.user_id,
                    friend_id: alertData.friend_id,
                    alert_level: alertData.alert_level,
                    message: `${alertData.friend_name}님이 ${alertData.hours_since_heartbeat}시간째 무응답`,
                    rules_applied: JSON.stringify(this.getAppliedRules(alertData)),
                    sent_at: new Date().toISOString()
                });
            }

            return success;

        } catch (error) {
            console.error('❌ 알림 발송 실패:', error);
            return false;
        }
    }

    /**
     * 에스컬레이션 스케줄링
     */
    scheduleEscalation(alertId, alertData) {
        if (!this.options.enableEscalation) return;

        console.log('📈 에스컬레이션 스케줄링:', alertId);

        setTimeout(async () => {
            // 친구가 여전히 무응답인지 확인
            if (await this.shouldEscalate(alertId, alertData)) {
                await this.executeEscalation(alertId, alertData);
            }
        }, this.options.escalationDelay);
    }

    /**
     * 에스컬레이션 실행
     */
    async executeEscalation(alertId, alertData) {
        try {
            console.log('🚨 에스컬레이션 실행:', alertId);

            const escalationData = {
                ...alertData,
                escalation_level: (alertData.escalation_level || 0) + 1,
                escalated_at: new Date().toISOString()
            };

            // 1. 관리자에게 알림
            await this.notifyAdmin(escalationData);

            // 2. 응급 연락처로 연락 (설정된 경우)
            if (escalationData.escalation_level >= 2) {
                await this.contactEmergencyServices(escalationData);
            }

            // 3. 에스컬레이션 기록
            if (this.supabase) {
                await this.supabase.insert('alert_escalations', {
                    alert_id: alertId,
                    escalation_level: escalationData.escalation_level,
                    action_taken: 'emergency_contact',
                    created_at: escalationData.escalated_at
                });
            }

            this.dispatchEvent(new CustomEvent('alert:escalated', {
                detail: { alertId, escalationData }
            }));

        } catch (error) {
            console.error('❌ 에스컬레이션 실행 실패:', error);
        }
    }

    /**
     * 유틸리티 메서드들
     */

    // 조용한 시간 확인
    isInQuietHours(userId) {
        const userRules = this.alertRules.userCustomRules.get(userId);
        if (!userRules || !userRules.quietHoursEnabled) return false;

        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const startTime = parseInt(userRules.quietHoursStart.replace(':', ''));
        const endTime = parseInt(userRules.quietHoursEnd.replace(':', ''));

        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        } else {
            return currentTime >= startTime && currentTime <= endTime;
        }
    }

    // 빈도 제한 확인
    isFrequencyLimitExceeded(userId, alertLevel) {
        const userRules = this.alertRules.userCustomRules.get(userId);
        if (!userRules) return false;

        const limit = userRules.alertFrequencyLimit || 5;
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        let count = 0;
        for (const [alertId, alert] of this.alertHistory) {
            if (alert.user_id === userId && 
                new Date(alert.created_at).getTime() > oneHourAgo) {
                count++;
            }
        }

        return count >= limit;
    }

    // 최근 활동 확인
    async hasRecentActivity(friendId) {
        try {
            if (!this.supabase) return false;

            const result = await this.supabase.query('user_status', {
                select: 'last_heartbeat',
                eq: { user_id: friendId },
                order: { last_heartbeat: 'desc' },
                limit: 1,
                single: true
            });

            if (result.data && result.data.last_heartbeat) {
                const lastActivity = new Date(result.data.last_heartbeat);
                const minutesSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60);
                return minutesSinceActivity < 5; // 5분 이내 활동
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    // 공휴일 확인
    isHoliday(date) {
        // 간단한 공휴일 확인 (실제로는 더 복잡한 로직 필요)
        const holidays = [
            '01-01', // 신정
            '02-09', '02-10', '02-11', // 설날 (예시)
            '03-01', // 삼일절
            '05-05', // 어린이날
            '06-06', // 현충일
            '08-15', // 광복절
            '09-16', '09-17', '09-18', // 추석 (예시)
            '10-03', // 개천절
            '10-09', // 한글날
            '12-25'  // 크리스마스
        ];

        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${month}-${day}`;

        return holidays.includes(dateStr);
    }

    // 알림 히스토리 기록
    recordAlertHistory(alertId, alertData) {
        this.alertHistory.set(alertId, {
            ...alertData,
            created_at: new Date().toISOString()
        });

        // 메모리 관리: 오래된 히스토리 제거 (24시간)
        setTimeout(() => {
            this.alertHistory.delete(alertId);
        }, 24 * 60 * 60 * 1000);
    }

    // 규칙 엔진 시작
    startRulesEngine() {
        this.ruleUpdateTimer = setInterval(() => {
            this.loadAdminSettings();
            this.loadUserRules();
        }, this.options.ruleUpdateInterval);
    }

    // 에스컬레이션 시스템 시작
    startEscalationSystem() {
        // 에스컬레이션 처리 로직은 scheduleEscalation에서 개별적으로 처리
        console.log('🚨 에스컬레이션 시스템 시작됨');
    }

    // 정리 작업 스케줄러
    startCleanupScheduler() {
        this.alertCleanupTimer = setInterval(() => {
            this.cleanupOldData();
        }, 60 * 60 * 1000); // 1시간마다
    }

    // 오래된 데이터 정리
    cleanupOldData() {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // 오래된 알림 히스토리 제거
        for (const [alertId, alert] of this.alertHistory) {
            if (new Date(alert.created_at).getTime() < oneDayAgo) {
                this.alertHistory.delete(alertId);
            }
        }

        // 오래된 억제 알림 제거
        this.suppressedAlerts.clear();

        console.log('🧹 오래된 알림 데이터 정리 완료');
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            activeAlerts: this.activeAlerts.size,
            alertHistory: this.alertHistory.size,
            suppressedAlerts: this.suppressedAlerts.size,
            pendingEscalations: this.pendingEscalations.size,
            currentRules: this.alertRules,
            rulesEngineActive: !!this.ruleUpdateTimer,
            escalationSystemActive: this.options.enableEscalation
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // 친구 상태 알림 처리 (외부 호출용)
    async processFriendStatusChange(friendData) {
        return await this.processFriendAlert(friendData);
    }

    // 관리자 설정 업데이트
    async updateAdminRules(newRules) {
        this.alertRules = { ...this.alertRules, ...newRules };
        await this.loadAdminSettings();
        
        this.dispatchEvent(new CustomEvent('alert:rules-updated', {
            detail: { newRules }
        }));
    }

    // 전역 이벤트 리스너 지원
    onAlertEvent(event, callback) {
        this.addEventListener(event.replace('alert:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        if (this.ruleUpdateTimer) {
            clearInterval(this.ruleUpdateTimer);
        }
        
        if (this.escalationTimer) {
            clearInterval(this.escalationTimer);
        }
        
        if (this.alertCleanupTimer) {
            clearInterval(this.alertCleanupTimer);
        }
        
        this.activeAlerts.clear();
        this.alertHistory.clear();
        this.pendingEscalations.clear();
        this.suppressedAlerts.clear();
        this.ruleCache.clear();
        
        this.isInitialized = false;
        
        console.log('🗑️ AlertSystemComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.AlertSystemComponent = AlertSystemComponent;
    
    // 즉시 인스턴스 생성 (기존 코드 호환성)
    if (!window.alertSystemComponent) {
        window.alertSystemComponent = new AlertSystemComponent();
        
        console.log('🌐 AlertSystemComponent 전역 등록 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertSystemComponent;
}