/**
 * NotificationManagerComponent v1.0
 * 통합 알림 관리를 담당하는 독립 컴포넌트
 * 
 * 기존 notifications.js와 notification-helper.js를 래핑하여 컴포넌트화
 * 친구 무응답 알림, 시스템 알림, 권한 관리 등의 고급 기능 제공
 */

class NotificationManagerComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoInit: true,
            requestPermission: true,
            enableQuietHours: true,
            enableRichNotifications: true,
            enableSound: true,
            enableVibration: true,
            fallbackToModal: true,
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.isInitialized = false;
        this.isPermissionGranted = false;
        this.isWebViewMode = false;
        this.isQuietHoursActive = false;
        this.notificationSettings = {};
        this.pendingNotifications = [];
        
        // 알림 타입별 설정
        this.notificationTypes = {
            'friend_inactive': { priority: 'high', requireInteraction: true },
            'system_update': { priority: 'normal', requireInteraction: false },
            'app_notification': { priority: 'normal', requireInteraction: false },
            'emergency': { priority: 'urgent', requireInteraction: true }
        };
        
        // 알림 레벨 정의
        this.alertLevels = {
            'normal': { icon: '🟢', color: '#28a745', sound: 600, vibration: [200] },
            'warning': { icon: '🟡', color: '#ffc107', sound: 800, vibration: [200, 100, 200] },
            'danger': { icon: '🟠', color: '#fd7e14', sound: 1000, vibration: [300, 100, 300, 100, 300] },
            'emergency': { icon: '🔴', color: '#dc3545', sound: 1200, vibration: [500, 100, 500, 100, 500] }
        };
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        this.helper = null;
        
        // 기존 NotificationsManager 참조 (호환성)
        this.legacyManager = null;
        
        // 타이머들
        this.quietHoursTimer = null;
        this.permissionRetryTimer = null;
        
        console.log('🔔 NotificationManagerComponent 초기화', this.options);
        
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
            console.log('🚀 NotificationManager 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            this.helper = window.NotificationHelper;
            
            if (!this.auth) {
                throw new Error('필수 의존성 (Auth)이 준비되지 않았습니다.');
            }
            
            // 기존 NotificationsManager 참조 (호환성)
            if (window.notificationsManager) {
                this.legacyManager = window.notificationsManager;
            }
            
            // 권한 확인 및 요청
            await this.checkAndRequestPermission();
            
            // 사용자별 알림 설정 로드
            await this.loadNotificationSettings();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 조용한 시간 체크 시작
            this.startQuietHoursCheck();
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('notification:ready', {
                detail: { component: this, hasPermission: this.isPermissionGranted }
            }));

            console.log('✅ NotificationManager 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ NotificationManager 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('notification:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 알림 권한 확인 및 요청
     */
    async checkAndRequestPermission() {
        try {
            // WebView 환경 감지
            if (!('Notification' in window)) {
                console.log('📱 WebView 환경 감지 - 네이티브 알림 모드');
                this.isWebViewMode = true;
                this.isPermissionGranted = true;
                return true;
            }

            // 기존 권한 상태 확인
            const currentPermission = Notification.permission;
            console.log('🔍 현재 알림 권한:', currentPermission);

            if (currentPermission === 'granted') {
                this.isPermissionGranted = true;
                return true;
            } else if (currentPermission === 'denied') {
                console.warn('⚠️ 알림 권한이 거부됨 - WebView 모드로 전환');
                this.isWebViewMode = true;
                this.isPermissionGranted = false;
                return false;
            }

            // 권한 요청
            if (this.options.requestPermission) {
                const permission = await Notification.requestPermission();
                this.isPermissionGranted = permission === 'granted';
                
                if (this.isPermissionGranted) {
                    console.log('✅ 알림 권한 획득');
                    this.dispatchEvent(new CustomEvent('notification:permission-granted'));
                } else {
                    console.warn('❌ 알림 권한 거부됨 - 모달 모드로 전환');
                    this.isWebViewMode = true;
                    this.dispatchEvent(new CustomEvent('notification:permission-denied'));
                }
            }

            return this.isPermissionGranted;

        } catch (error) {
            console.warn('알림 권한 확인 실패, WebView 모드로 전환:', error);
            this.isWebViewMode = true;
            this.isPermissionGranted = false;
            return false;
        }
    }

    /**
     * 사용자별 알림 설정 로드
     */
    async loadNotificationSettings() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                // 기본 설정으로 초기화
                this.setDefaultSettings();
                return;
            }

            console.log('📥 사용자 알림 설정 로드 중...');

            // 로컬 저장소에서 우선 로드
            const localKey = `notification-settings-${currentUser.kakao_id}`;
            const localSettings = localStorage.getItem(localKey);
            
            if (localSettings) {
                this.notificationSettings = JSON.parse(localSettings);
                console.log('💾 로컬 설정 로드 완료');
            } else {
                this.setDefaultSettings();
            }

            // 데이터베이스와 동기화
            await this.syncSettingsWithDatabase();

            this.dispatchEvent(new CustomEvent('notification:settings-loaded', {
                detail: { settings: this.notificationSettings }
            }));

        } catch (error) {
            console.error('❌ 알림 설정 로드 실패:', error);
            this.setDefaultSettings();
        }
    }

    /**
     * 기본 설정 설정
     */
    setDefaultSettings() {
        this.notificationSettings = {
            push_notifications: true,
            friend_notifications: true,
            warning_notifications: true,    // 24시간 무응답
            danger_notifications: true,     // 48시간 무응답
            emergency_notifications: true,  // 72시간 무응답
            emergency_call_notifications: false,
            quiet_hours_enabled: false,
            quiet_hours_start: '22:00',
            quiet_hours_end: '07:00',
            sound_enabled: this.options.enableSound,
            vibration_enabled: this.options.enableVibration,
            modal_notifications: this.options.fallbackToModal
        };

        console.log('📋 기본 알림 설정 적용');
    }

    /**
     * 데이터베이스와 설정 동기화
     */
    async syncSettingsWithDatabase() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser || !this.supabase) return;

            // 데이터베이스에서 설정 조회
            const dbResult = await this.supabase.query('notification_settings', {
                eq: { user_id: currentUser.id },
                single: true
            });

            if (dbResult.data && !dbResult.error) {
                // DB 설정과 병합
                this.notificationSettings = { 
                    ...this.notificationSettings, 
                    ...dbResult.data 
                };
                console.log('🔄 데이터베이스 설정 동기화 완료');
            } else {
                // DB에 현재 설정 저장
                await this.supabase.upsert('notification_settings', {
                    user_id: currentUser.id,
                    ...this.notificationSettings,
                    updated_at: new Date().toISOString()
                });
                console.log('💾 초기 설정 데이터베이스에 저장');
            }

        } catch (error) {
            console.warn('⚠️ 데이터베이스 동기화 실패:', error);
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 네트워크 상태 변화 감지
        window.addEventListener('online', () => {
            this.showSystemNotification('네트워크 연결 복구', '인터넷 연결이 복구되었습니다', 'success');
        });

        window.addEventListener('offline', () => {
            this.showSystemNotification('네트워크 연결 끊김', '인터넷 연결이 끊어졌습니다', 'warning');
        });

        // 페이지 가시성 변화 감지
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // 페이지가 다시 보이면 대기 중인 알림 처리
                this.processPendingNotifications();
            }
        });

        // 사용자 활동 감지 (알림 상호작용)
        document.addEventListener('click', () => {
            this.recordUserActivity();
        });

        console.log('👂 NotificationManager 이벤트 리스너 설정 완료');
    }

    /**
     * 조용한 시간 체크 시작
     */
    startQuietHoursCheck() {
        if (!this.options.enableQuietHours) return;

        // 매분마다 조용한 시간 상태 체크
        this.quietHoursTimer = setInterval(() => {
            const wasQuiet = this.isQuietHoursActive;
            this.isQuietHoursActive = this.isQuietHours();
            
            if (wasQuiet !== this.isQuietHoursActive) {
                this.dispatchEvent(new CustomEvent('notification:quiet-hours-changed', {
                    detail: { isQuietHours: this.isQuietHoursActive }
                }));
                
                if (!this.isQuietHoursActive && this.pendingNotifications.length > 0) {
                    // 조용한 시간이 끝나면 대기 알림 처리
                    this.processPendingNotifications();
                }
            }
        }, 60000); // 1분마다
    }

    /**
     * 조용한 시간 확인
     */
    isQuietHours() {
        if (!this.notificationSettings.quiet_hours_enabled) return false;

        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        const startTime = parseInt(this.notificationSettings.quiet_hours_start.replace(':', ''));
        const endTime = parseInt(this.notificationSettings.quiet_hours_end.replace(':', ''));

        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        } else {
            return currentTime >= startTime && currentTime <= endTime;
        }
    }

    /**
     * 친구 무응답 알림 발송 (핵심 기능)
     */
    async sendFriendInactiveNotification(friendData) {
        try {
            if (!this.canSendNotification('friend_notifications')) {
                return false;
            }

            const { alert_level, friend_name, hours_since_heartbeat, friend_id } = friendData;

            // 알림 레벨별 설정 확인
            const levelKey = `${alert_level}_notifications`;
            if (!this.notificationSettings[levelKey]) {
                console.log(`🔇 ${alert_level} 레벨 알림이 비활성화됨`);
                return false;
            }

            const alertConfig = this.alertLevels[alert_level] || this.alertLevels.warning;
            const notificationData = this.buildFriendNotificationData(friendData, alertConfig);

            // 조용한 시간 확인
            if (this.isQuietHours() && alert_level !== 'emergency') {
                console.log('🌙 조용한 시간대 - 알림을 대기열에 추가');
                this.pendingNotifications.push({
                    type: 'friend_inactive',
                    data: notificationData,
                    timestamp: Date.now()
                });
                return false;
            }

            // 알림 발송
            const success = await this.showNotification(notificationData);

            // 성공시 데이터베이스에 기록 저장
            if (success) {
                await this.saveNotificationRecord({
                    user_id: this.auth.getCurrentUser()?.id,
                    friend_id: friend_id,
                    friend_name: friend_name,
                    alert_level: alert_level,
                    hours_since_heartbeat: hours_since_heartbeat,
                    notification_title: notificationData.title,
                    notification_message: notificationData.message,
                    sent_at: new Date().toISOString()
                });

                this.dispatchEvent(new CustomEvent('notification:friend-inactive-sent', {
                    detail: { friendData, success: true }
                }));

                console.log(`✅ 친구 무응답 알림 발송: ${friend_name} (${alert_level})`);
            }

            return success;

        } catch (error) {
            console.error('❌ 친구 무응답 알림 발송 실패:', error);
            this.dispatchEvent(new CustomEvent('notification:send-error', {
                detail: { error, type: 'friend_inactive', data: friendData }
            }));
            return false;
        }
    }

    /**
     * 친구 알림 데이터 생성
     */
    buildFriendNotificationData(friendData, alertConfig) {
        const { alert_level, friend_name, hours_since_heartbeat } = friendData;
        
        const titles = {
            warning: '친구 상태 주의',
            danger: '친구 상태 경고',
            emergency: '친구 상태 긴급'
        };

        const messages = {
            warning: `${friend_name}님이 ${hours_since_heartbeat}시간 동안 무응답 상태입니다.`,
            danger: `${friend_name}님이 ${hours_since_heartbeat}시간 동안 무응답 상태입니다. 확인이 필요합니다.`,
            emergency: `${friend_name}님이 ${hours_since_heartbeat}시간 동안 무응답 상태입니다. 즉시 확인하세요!`
        };

        return {
            title: titles[alert_level] || titles.warning,
            message: messages[alert_level] || messages.warning,
            type: 'friend_inactive',
            level: alert_level,
            icon: alertConfig.icon,
            color: alertConfig.color,
            requireInteraction: alert_level === 'emergency',
            sound: this.notificationSettings.sound_enabled ? alertConfig.sound : null,
            vibration: this.notificationSettings.vibration_enabled ? alertConfig.vibration : null,
            tag: `friend-inactive-${friendData.friend_id}`,
            data: {
                friendId: friendData.friend_id,
                alertLevel: alert_level,
                timestamp: new Date().toISOString()
            },
            actions: alert_level === 'emergency' ? [
                { action: 'check', title: '확인하기' },
                { action: 'call', title: '전화걸기' }
            ] : []
        };
    }

    /**
     * 시스템 알림 발송
     */
    async showSystemNotification(title, message, level = 'info', options = {}) {
        try {
            if (!this.canSendNotification('push_notifications')) {
                return false;
            }

            const alertConfig = this.alertLevels[level] || this.alertLevels.normal;
            const notificationData = {
                title,
                message,
                type: 'system',
                level,
                icon: alertConfig.icon,
                color: alertConfig.color,
                requireInteraction: false,
                sound: this.notificationSettings.sound_enabled ? alertConfig.sound : null,
                vibration: this.notificationSettings.vibration_enabled ? alertConfig.vibration : null,
                tag: `system-${Date.now()}`,
                data: {
                    type: 'system',
                    level,
                    timestamp: new Date().toISOString()
                },
                ...options
            };

            return await this.showNotification(notificationData);

        } catch (error) {
            console.error('❌ 시스템 알림 발송 실패:', error);
            return false;
        }
    }

    /**
     * 통합 알림 표시
     */
    async showNotification(notificationData) {
        try {
            const { title, message, type, level, icon, color, requireInteraction, 
                    sound, vibration, tag, data, actions } = notificationData;

            // WebView 환경이거나 권한이 없는 경우
            if (this.isWebViewMode || !this.isPermissionGranted) {
                return await this.showFallbackNotification(notificationData);
            }

            // 브라우저 네이티브 알림
            const notification = new Notification(title, {
                body: message,
                icon: this.getNotificationIconUrl(level),
                badge: this.getNotificationIconUrl(level),
                tag: tag,
                requireInteraction: requireInteraction,
                vibrate: vibration || [200],
                data: data || {},
                actions: actions || []
            });

            // 알림 이벤트 처리
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();
                
                this.dispatchEvent(new CustomEvent('notification:clicked', {
                    detail: { notificationData, action: 'click' }
                }));
            };

            notification.onclose = () => {
                this.dispatchEvent(new CustomEvent('notification:closed', {
                    detail: { notificationData }
                }));
            };

            // 액션 버튼 처리
            if ('serviceWorker' in navigator && actions && actions.length > 0) {
                navigator.serviceWorker.addEventListener('notificationclick', (event) => {
                    event.notification.close();
                    
                    this.dispatchEvent(new CustomEvent('notification:action', {
                        detail: { 
                            notificationData, 
                            action: event.action || 'click' 
                        }
                    }));
                });
            }

            // 소리 재생
            if (sound && this.notificationSettings.sound_enabled) {
                this.playNotificationSound(sound);
            }

            // 자동 닫기 (상호작용 필요한 것 제외)
            if (!requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 10000);
            }

            console.log(`🔔 브라우저 알림 표시: ${title}`);
            return true;

        } catch (error) {
            console.error('❌ 브라우저 알림 표시 실패:', error);
            return await this.showFallbackNotification(notificationData);
        }
    }

    /**
     * 대체 알림 시스템 (WebView/권한없음)
     */
    async showFallbackNotification(notificationData) {
        try {
            const { title, message, level, icon, color } = notificationData;

            // Android 네이티브 알림 시도
            if (window.AndroidBridge && window.AndroidBridge.showNotification) {
                console.log('📱 Android 네이티브 알림 발송');
                const iconTitle = `${icon} ${title}`;
                window.AndroidBridge.showNotification(iconTitle, message);
                
                if (window.AndroidBridge.vibrate) {
                    window.AndroidBridge.vibrate();
                }
                return true;
            }

            // 모달 알림 표시
            if (this.options.fallbackToModal) {
                this.showModalNotification(title, message, level, color, icon);
            }

            // auth.showNotification 호출
            if (this.auth && this.auth.showNotification) {
                const alertType = level === 'emergency' ? 'error' : 
                                level === 'danger' ? 'warning' : 'info';
                this.auth.showNotification(`${title}: ${message}`, alertType);
            }

            // 소리 재생 (웹 환경에서만)
            if (notificationData.sound && !window.AndroidBridge) {
                this.playNotificationSound(notificationData.sound);
            }

            // 긴급 알림의 경우 화면 깜빡임
            if (level === 'emergency') {
                this.flashScreen();
            }

            console.log(`📱 대체 알림 표시: ${title}`);
            return true;

        } catch (error) {
            console.error('❌ 대체 알림 표시 실패:', error);
            return false;
        }
    }

    /**
     * 모달 알림 표시
     */
    showModalNotification(title, message, level = 'info', color = '#007bff', icon = '🔔') {
        // 기존 모달 제거
        const existingModal = document.getElementById('notification-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="notification-modal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7); display: flex;
                justify-content: center; align-items: center; z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
            ">
                <div style="
                    background: white; padding: 30px; border-radius: 15px;
                    max-width: 90%; text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    border-top: 5px solid ${color};
                ">
                    <div style="font-size: 48px; margin-bottom: 10px;">${icon}</div>
                    <div style="
                        font-size: 24px; margin-bottom: 15px;
                        color: ${color}; font-weight: bold;
                    ">${title}</div>
                    <div style="
                        font-size: 16px; margin-bottom: 25px;
                        color: #333; line-height: 1.5;
                    ">${message}</div>
                    <button id="modal-confirm-btn" style="
                        background: ${color}; color: white; border: none;
                        padding: 12px 30px; border-radius: 8px;
                        font-size: 16px; font-weight: bold; cursor: pointer;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    ">확인</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 확인 버튼 이벤트
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            document.getElementById('notification-modal').remove();
            
            this.dispatchEvent(new CustomEvent('notification:modal-confirmed', {
                detail: { title, message, level }
            }));

            // 알림 확인시 하트비트 전송
            if (level.includes('friend') && window.motionDetector) {
                window.motionDetector.sendHeartbeat();
            }
        });
    }

    /**
     * 화면 깜빡임 효과
     */
    flashScreen() {
        try {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: red; opacity: 0.3; z-index: 9999;
                pointer-events: none; animation: flashAlert 0.5s ease-in-out 3;
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes flashAlert {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 0.3; }
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 1500);

            console.log('📺 긴급 화면 깜빡임 효과');
        } catch (error) {
            console.warn('화면 깜빡임 실패:', error);
        }
    }

    /**
     * 소리 재생
     */
    playNotificationSound(frequency = 800, duration = 200, times = 2) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            for (let i = 0; i < times; i++) {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.value = frequency;
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration / 1000);
                }, i * (duration + 100));
            }
        } catch (error) {
            console.warn('소리 재생 실패:', error);
        }
    }

    /**
     * 알림 기록 저장
     */
    async saveNotificationRecord(data) {
        try {
            if (!this.supabase) return;

            await this.supabase.insert('notifications', {
                user_id: data.user_id,
                title: data.notification_title,
                message: data.notification_message,
                notification_type: 'friend_inactive',
                priority: data.alert_level === 'emergency' ? 'urgent' : 
                         data.alert_level === 'danger' ? 'high' : 'normal',
                is_read: false,
                metadata: {
                    friend_id: data.friend_id,
                    friend_name: data.friend_name,
                    hours_since_heartbeat: data.hours_since_heartbeat,
                    alert_level: data.alert_level
                },
                created_at: data.sent_at
            });

            console.log('📝 알림 기록 저장 완료');

        } catch (error) {
            console.warn('알림 기록 저장 실패:', error);
        }
    }

    /**
     * 대기 중인 알림 처리
     */
    async processPendingNotifications() {
        if (this.pendingNotifications.length === 0) return;

        console.log(`📨 대기 알림 ${this.pendingNotifications.length}개 처리 중...`);

        const notifications = [...this.pendingNotifications];
        this.pendingNotifications = [];

        for (const pending of notifications) {
            try {
                await this.showNotification(pending.data);
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 간격
            } catch (error) {
                console.error('대기 알림 처리 실패:', error);
            }
        }

        this.dispatchEvent(new CustomEvent('notification:pending-processed', {
            detail: { count: notifications.length }
        }));
    }

    /**
     * 유틸리티 메서드들
     */

    // 알림 발송 가능 여부 확인
    canSendNotification(settingKey) {
        return this.isInitialized && 
               this.notificationSettings[settingKey] !== false;
    }

    // 알림 아이콘 URL 생성
    getNotificationIconUrl(level) {
        const iconMap = {
            'normal': '/icon.png',
            'warning': '/icon-warning.png',
            'danger': '/icon-danger.png',
            'emergency': '/icon-emergency.png'
        };
        return iconMap[level] || iconMap.normal;
    }

    // 사용자 활동 기록
    recordUserActivity() {
        this.lastActivity = Date.now();
        
        this.dispatchEvent(new CustomEvent('notification:user-activity', {
            detail: { timestamp: this.lastActivity }
        }));
    }

    // 알림 설정 업데이트
    async updateSetting(key, value) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) return false;

            // 로컬 설정 업데이트
            this.notificationSettings[key] = value;
            
            const localKey = `notification-settings-${currentUser.kakao_id}`;
            localStorage.setItem(localKey, JSON.stringify(this.notificationSettings));

            // 데이터베이스 업데이트
            if (this.supabase) {
                await this.supabase.upsert('notification_settings', {
                    user_id: currentUser.id,
                    [key]: value,
                    updated_at: new Date().toISOString()
                });
            }

            this.dispatchEvent(new CustomEvent('notification:setting-updated', {
                detail: { key, value }
            }));

            console.log(`✅ 알림 설정 업데이트: ${key} = ${value}`);
            return true;

        } catch (error) {
            console.error('알림 설정 업데이트 실패:', error);
            return false;
        }
    }

    // 테스트 알림 발송
    async sendTestNotification(level = 'warning') {
        const testData = {
            friend_id: 'test-friend',
            friend_name: '테스트 친구',
            alert_level: level,
            hours_since_heartbeat: level === 'warning' ? 24 : 
                                  level === 'danger' ? 48 : 72
        };

        return await this.sendFriendInactiveNotification(testData);
    }

    // 상태 정보 가져오기
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasPermission: this.isPermissionGranted,
            isWebViewMode: this.isWebViewMode,
            isQuietHours: this.isQuietHoursActive,
            pendingCount: this.pendingNotifications.length,
            settings: { ...this.notificationSettings }
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // notifications.js와 완전 호환
    async sendFriendInactiveNotificationLegacy(friendData) {
        return await this.sendFriendInactiveNotification(friendData);
    }

    getNotificationSettingsLegacy() {
        return { ...this.notificationSettings };
    }

    async updateNotificationSettingLegacy(key, value) {
        return await this.updateSetting(key, value);
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('notification:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        if (this.quietHoursTimer) {
            clearInterval(this.quietHoursTimer);
        }
        
        if (this.permissionRetryTimer) {
            clearInterval(this.permissionRetryTimer);
        }
        
        this.pendingNotifications = [];
        this.isInitialized = false;
        
        console.log('🗑️ NotificationManagerComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.NotificationManagerComponent = NotificationManagerComponent;
    
    // 즉시 인스턴스 생성 (기존 코드 호환성)
    if (!window.notificationManagerComponent) {
        window.notificationManagerComponent = new NotificationManagerComponent();
        
        // 기존 변수명도 지원
        window.notificationsManager = window.notificationManagerComponent;
        
        console.log('🌐 NotificationManagerComponent 전역 등록 완료');
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManagerComponent;
}