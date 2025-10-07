/**
 * Advanced Notification Manager v2.0 - Independent System
 * Complete notification system for Lonely Care
 * Supports WebView, Web Browser, PWA platforms
 */
class AdvancedNotificationManager {
    constructor(options = {}) {
        this.options = {
            enableWebNotifications: true,
            enableInAppNotifications: true,
            enableWebViewNotifications: true,
            quietHours: { start: 22, end: 8 },
            maxPendingNotifications: 10,
            notificationTimeout: 30000,
            cooldownPeriods: {
                normal: 30 * 60 * 1000,      // 30분
                warning: 15 * 60 * 1000,     // 15분  
                danger: 10 * 60 * 1000,      // 10분
                emergency: 5 * 60 * 1000     // 5분
            },
            watcherInterval: 30000,          // 30초마다 친구 상태 확인
            ...options
        };
        
        this.platform = this.detectPlatform();
        this.permissions = {
            webNotification: 'default',
            webViewNotification: false
        };
        
        this.activeNotifications = new Map();
        this.notificationQueue = [];
        this.notificationHistory = [];
        this.eventListeners = new Map();
        this.isInitialized = false;
        this.serviceWorkerRegistered = false;
        
        // Friend Status Watcher
        this.friendWatcher = null;
        this.watcherInterval = null;
        this.lastCheckedFriends = new Map();
        
        console.log('🔔 Advanced Notification Manager v2.0 초기화', {
            platform: this.platform,
            options: this.options
        });
        
        this.init();
    }

    /**
     * 플랫폼 감지
     */
    detectPlatform() {
        const userAgent = navigator.userAgent || '';
        
        if (userAgent.indexOf('wv') > -1 || window.AndroidBridge || window.webkit?.messageHandlers) {
            return 'webview';
        }
        
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return 'pwa';
        }
        
        return 'web';
    }

    /**
     * 초기화
     */
    async init() {
        try {
            console.log('🚀 Advanced Notification System v2.0 초기화 시작...');
            
            // 1. 권한 확인 및 요청
            await this.checkPermissions();
            
            // 2. Service Worker 등록 (PWA/Web)
            if (this.platform !== 'webview') {
                await this.registerServiceWorker();
            }
            
            // 3. 플랫폼별 초기화
            await this.initPlatformSpecific();
            
            // 4. 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 5. 설정 로드
            this.loadSettings();
            
            // 6. 친구 상태 감시 시작
            this.startFriendWatcher();
            
            this.isInitialized = true;
            this.emit('ready', { 
                platform: this.platform, 
                permissions: this.permissions,
                version: '2.0'
            });
            
            console.log('✅ Advanced Notification System v2.0 초기화 완료', {
                platform: this.platform,
                permissions: this.permissions
            });
            
        } catch (error) {
            console.error('❌ 알림 시스템 초기화 실패:', error);
            this.emit('init-error', error);
        }
    }

    /**
     * 권한 확인 및 요청
     */
    async checkPermissions() {
        // Web Notification API 권한
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                console.log('🔔 웹 알림 권한 요청...');
                const permission = await Notification.requestPermission();
                this.permissions.webNotification = permission;
                console.log(`📋 웹 알림 권한: ${permission}`);
            } else {
                this.permissions.webNotification = Notification.permission;
            }
        }
        
        // WebView 네이티브 알림 권한
        if (this.platform === 'webview' && window.AndroidBridge) {
            try {
                this.permissions.webViewNotification = await new Promise((resolve) => {
                    window.AndroidBridge.checkNotificationPermission();
                    window.onNotificationPermissionResult = resolve;
                    setTimeout(() => resolve(false), 3000);
                });
            } catch (error) {
                console.warn('⚠️ WebView 알림 권한 확인 실패:', error);
                this.permissions.webViewNotification = false;
            }
        }
    }

    /**
     * Service Worker 등록
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('📵 Service Worker 미지원');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/lonely-care/sw-notifications.js');
            console.log('✅ Service Worker 등록 성공:', registration.scope);
            this.serviceWorkerRegistered = true;
            
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
            
        } catch (error) {
            console.warn('⚠️ Service Worker 등록 실패 - 기본 알림으로 동작:', error);
        }
    }

    /**
     * 플랫폼별 초기화
     */
    async initPlatformSpecific() {
        switch (this.platform) {
            case 'webview':
                await this.initWebViewNotifications();
                break;
            case 'pwa':
                await this.initPWANotifications();
                break;
            case 'web':
                await this.initWebNotifications();
                break;
        }
    }

    /**
     * WebView 알림 초기화
     */
    async initWebViewNotifications() {
        console.log('📱 WebView 알림 시스템 초기화');
        
        if (window.AndroidBridge) {
            window.onNotificationClick = (notificationId) => {
                this.handleNotificationClick(notificationId);
            };
            
            window.onNotificationDismiss = (notificationId) => {
                this.handleNotificationDismiss(notificationId);
            };
        }
    }

    /**
     * PWA 알림 초기화
     */
    async initPWANotifications() {
        console.log('📱 PWA 알림 시스템 초기화');
        await this.initWebNotifications();
    }

    /**
     * 웹 알림 초기화
     */
    async initWebNotifications() {
        console.log('🌐 웹 알림 시스템 초기화');
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 페이지 가시성 변경
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.emit('page-hidden');
            } else {
                this.emit('page-visible');
                this.clearOldNotifications();
            }
        });

        // 온라인/오프라인 상태
        window.addEventListener('online', () => {
            this.emit('online');
            this.processQueuedNotifications();
        });

        window.addEventListener('offline', () => {
            this.emit('offline');
        });
    }

    /**
     * 설정 로드
     */
    loadSettings() {
        const saved = localStorage.getItem('advancedNotificationSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.options = { ...this.options, ...settings };
                console.log('✅ 알림 설정 로드 완료');
            } catch (error) {
                console.warn('⚠️ 설정 로드 실패 - 기본값 사용');
            }
        }
    }

    /**
     * 설정 저장
     */
    saveSettings() {
        localStorage.setItem('advancedNotificationSettings', JSON.stringify(this.options));
        console.log('💾 알림 설정 저장 완료');
    }

    /**
     * 친구 상태 감시 시작
     */
    startFriendWatcher() {
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
        }

        console.log('👥 친구 상태 감시 시작 (30초 간격)');
        
        this.watcherInterval = setInterval(() => {
            this.checkFriendsStatus();
        }, this.options.watcherInterval);

        // 즉시 한 번 체크
        setTimeout(() => this.checkFriendsStatus(), 2000);
    }

    /**
     * 친구 상태 확인
     */
    async checkFriendsStatus() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.id) {
                return;
            }

            // FriendStatusComponent가 있으면 사용
            if (window.lonelyCareApp?.components?.friendStatus) {
                const friendStatus = window.lonelyCareApp.components.friendStatus;
                const friends = await friendStatus.getFriendsData();
                
                if (friends && friends.length > 0) {
                    this.processFriendsData(friends);
                }
            }
        } catch (error) {
            console.warn('⚠️ 친구 상태 확인 실패:', error);
        }
    }

    /**
     * 친구 데이터 처리 및 알림 생성
     */
    processFriendsData(friends) {
        friends.forEach(friend => {
            const friendKey = friend.id || friend.friend_id;
            const hoursInactive = friend.hours_since_heartbeat || 0;
            const lastAlert = this.lastCheckedFriends.get(friendKey);
            
            // Alert Level 결정
            let alertLevel = 'normal';
            if (hoursInactive >= 72) {
                alertLevel = 'emergency';
            } else if (hoursInactive >= 48) {
                alertLevel = 'danger';
            } else if (hoursInactive >= 24) {
                alertLevel = 'warning';
            }

            // 상태가 변경되었거나 쿨다운 시간이 지났을 때만 알림
            const now = Date.now();
            const shouldAlert = !lastAlert || 
                               lastAlert.level !== alertLevel || 
                               (now - lastAlert.timestamp) > this.options.cooldownPeriods[alertLevel];

            if (shouldAlert && hoursInactive >= 24) {
                this.showFriendAlert(friend, alertLevel, hoursInactive);
                
                this.lastCheckedFriends.set(friendKey, {
                    level: alertLevel,
                    timestamp: now,
                    hours: hoursInactive
                });
            }
        });
    }

    /**
     * 친구 알림 표시
     */
    showFriendAlert(friend, level, hours) {
        const friendName = friend.nickname || friend.name || '친구';
        
        let title, message, icon;
        
        switch (level) {
            case 'emergency':
                title = '🚨 긴급: 친구 안전 확인 필요';
                message = `${friendName}님이 ${hours}시간째 무응답입니다. 안전 확인이 필요합니다.`;
                icon = '🚨';
                break;
            case 'danger':
                title = '⚠️ 위험: 친구 장기간 무응답';
                message = `${friendName}님이 ${hours}시간째 무응답 상태입니다.`;
                icon = '⚠️';
                break;
            case 'warning':
                title = '📢 주의: 친구 무응답 알림';
                message = `${friendName}님이 ${hours}시간째 활동하지 않습니다.`;
                icon = '📢';
                break;
            default:
                return;
        }

        this.show({
            id: `friend-${friend.id}-${level}-${Date.now()}`,
            title,
            message,
            level,
            friendId: friend.id,
            friendName,
            hours,
            persistent: level === 'emergency',
            actions: this.getFriendAlertActions(friend, level)
        });
    }

    /**
     * 친구 알림 액션 버튼
     */
    getFriendAlertActions(friend, level) {
        const actions = [];
        
        if (level === 'emergency') {
            actions.push(
                { id: 'call-emergency', title: '긴급연락', icon: '📞' },
                { id: 'check-friend', title: '확인하기', icon: '👀' }
            );
        } else if (level === 'danger' || level === 'warning') {
            actions.push(
                { id: 'check-friend', title: '확인하기', icon: '👀' },
                { id: 'dismiss', title: '확인함', icon: '✓' }
            );
        }
        
        return actions;
    }

    /**
     * 알림 표시 (메인 메서드)
     */
    async show(notification) {
        if (!this.isInitialized) {
            console.warn('⚠️ 알림 시스템이 아직 초기화되지 않았습니다');
            return false;
        }

        const validatedNotification = this.validateNotification(notification);
        if (!validatedNotification) {
            console.error('❌ 유효하지 않은 알림 데이터');
            return false;
        }

        // 조용한 시간 확인 (응급 알림 제외)
        if (this.isQuietHour() && validatedNotification.level !== 'emergency') {
            console.log('🔇 조용한 시간 - 대기열에 추가');
            this.queueNotification(validatedNotification);
            return true;
        }

        // 중복 알림 확인
        if (this.isDuplicateNotification(validatedNotification)) {
            console.log('🔁 중복 알림 무시');
            return false;
        }

        // 플랫폼별 알림 표시
        return await this.showPlatformNotification(validatedNotification);
    }

    /**
     * 알림 데이터 검증
     */
    validateNotification(notification) {
        const required = ['title', 'message'];
        
        for (const field of required) {
            if (!notification[field]) {
                console.error(`❌ 필수 필드 누락: ${field}`);
                return null;
            }
        }

        return {
            id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: notification.title,
            message: notification.message,
            level: notification.level || 'normal',
            friendId: notification.friendId || null,
            friendName: notification.friendName || '친구',
            timestamp: notification.timestamp || Date.now(),
            actions: notification.actions || [],
            silent: notification.silent || false,
            persistent: notification.persistent || false,
            icon: notification.icon || '/lonely-care/icon.png',
            badge: notification.badge || '/lonely-care/badge.png',
            tag: notification.tag || `lonely-care-${notification.level}`,
            data: notification.data || {}
        };
    }

    /**
     * 조용한 시간 확인
     */
    isQuietHour() {
        const now = new Date();
        const hour = now.getHours();
        const { start, end } = this.options.quietHours;
        
        if (start > end) {
            return hour >= start || hour < end;
        } else {
            return hour >= start && hour < end;
        }
    }

    /**
     * 중복 알림 확인
     */
    isDuplicateNotification(notification) {
        const existingKey = `${notification.friendId}-${notification.level}`;
        const existing = this.activeNotifications.get(existingKey);
        
        if (existing) {
            const timeDiff = Date.now() - existing.timestamp;
            const cooldownTime = this.options.cooldownPeriods[notification.level] || this.options.cooldownPeriods.normal;
            
            if (timeDiff < cooldownTime) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 플랫폼별 알림 표시
     */
    async showPlatformNotification(notification) {
        let success = false;

        // 1차: WebView 네이티브 알림
        if (this.platform === 'webview' && this.permissions.webViewNotification) {
            success = await this.showWebViewNotification(notification);
            if (success) {
                this.trackNotification(notification, 'webview');
                return true;
            }
        }

        // 2차: 웹 브라우저 알림
        if (this.permissions.webNotification === 'granted') {
            success = await this.showWebNotification(notification);
            if (success) {
                this.trackNotification(notification, 'web');
                return true;
            }
        }

        // 3차: 인앱 알림 (폴백)
        if (this.options.enableInAppNotifications) {
            success = await this.showInAppNotification(notification);
            if (success) {
                this.trackNotification(notification, 'inapp');
                return true;
            }
        }

        console.warn('⚠️ 모든 알림 방법 실패');
        return false;
    }

    /**
     * WebView 네이티브 알림
     */
    async showWebViewNotification(notification) {
        if (!window.AndroidBridge) {
            return false;
        }

        try {
            const notificationData = {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                level: notification.level,
                icon: notification.icon,
                actions: notification.actions,
                data: notification.data
            };

            window.AndroidBridge.showNotification(JSON.stringify(notificationData));
            console.log('📱 WebView 네이티브 알림 표시:', notification.id);
            return true;
            
        } catch (error) {
            console.error('❌ WebView 알림 실패:', error);
            return false;
        }
    }

    /**
     * 웹 브라우저 알림
     */
    async showWebNotification(notification) {
        if (!('Notification' in window)) {
            return false;
        }

        try {
            const webNotification = new Notification(notification.title, {
                body: notification.message,
                icon: notification.icon,
                badge: notification.badge,
                tag: notification.tag,
                silent: notification.silent,
                requireInteraction: notification.persistent || notification.level === 'emergency',
                data: {
                    ...notification.data,
                    notificationId: notification.id,
                    level: notification.level,
                    friendId: notification.friendId
                }
            });

            webNotification.onclick = () => {
                this.handleNotificationClick(notification.id);
                webNotification.close();
            };

            webNotification.onclose = () => {
                this.handleNotificationDismiss(notification.id);
            };

            // 자동 닫기 (응급 알림 제외)
            if (notification.level !== 'emergency' && !notification.persistent) {
                setTimeout(() => {
                    webNotification.close();
                }, this.options.notificationTimeout);
            }

            console.log('🌐 웹 알림 표시:', notification.id);
            return true;
            
        } catch (error) {
            console.error('❌ 웹 알림 실패:', error);
            return false;
        }
    }

    /**
     * 인앱 알림
     */
    async showInAppNotification(notification) {
        try {
            this.clearInAppNotifications();

            const alertElement = this.createInAppAlert(notification);
            document.body.appendChild(alertElement);

            requestAnimationFrame(() => {
                alertElement.classList.add('show');
            });

            // 자동 닫기 (응급 알림 제외)
            if (notification.level !== 'emergency' && !notification.persistent) {
                setTimeout(() => {
                    this.removeInAppNotification(alertElement);
                }, this.options.notificationTimeout);
            }

            console.log('📱 인앱 알림 표시:', notification.id);
            return true;
            
        } catch (error) {
            console.error('❌ 인앱 알림 실패:', error);
            return false;
        }
    }

    /**
     * 인앱 알림 엘리먼트 생성
     */
    createInAppAlert(notification) {
        const alertElement = document.createElement('div');
        alertElement.className = `notification-alert alert-${notification.level}`;
        alertElement.setAttribute('data-notification-id', notification.id);
        
        const colors = {
            normal: '#28a745',
            warning: '#ffc107',
            danger: '#fd7e14',
            emergency: '#dc3545'
        };
        
        const icons = {
            normal: '✅',
            warning: '⚠️',
            danger: '🚨',
            emergency: '🆘'
        };

        alertElement.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">${icons[notification.level] || '📢'}</div>
                <div class="alert-text">
                    <div class="alert-title">${notification.title}</div>
                    <div class="alert-message">${notification.message}</div>
                    <div class="alert-time">${new Date(notification.timestamp).toLocaleTimeString()}</div>
                </div>
                <div class="alert-actions">
                    ${notification.actions.map(action => 
                        `<button class="alert-action" data-action="${action.id}">${action.title}</button>`
                    ).join('')}
                    <button class="alert-close" data-action="close">×</button>
                </div>
            </div>
        `;

        // 스타일 적용
        alertElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            background: white;
            border: 2px solid ${colors[notification.level]};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // 이벤트 리스너
        alertElement.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'close') {
                this.removeInAppNotification(alertElement);
                this.handleNotificationDismiss(notification.id);
            } else if (action) {
                this.handleNotificationAction(notification.id, action);
                this.removeInAppNotification(alertElement);
            } else if (e.target.closest('.alert-content')) {
                this.handleNotificationClick(notification.id);
                this.removeInAppNotification(alertElement);
            }
        });

        return alertElement;
    }

    /**
     * 인앱 알림 제거
     */
    removeInAppNotification(alertElement) {
        alertElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 300);
    }

    /**
     * 모든 인앱 알림 제거
     */
    clearInAppNotifications() {
        const existingAlerts = document.querySelectorAll('.notification-alert');
        existingAlerts.forEach(alert => {
            this.removeInAppNotification(alert);
        });
    }

    /**
     * 알림 추적
     */
    trackNotification(notification, method) {
        const key = `${notification.friendId}-${notification.level}`;
        this.activeNotifications.set(key, {
            ...notification,
            method,
            shownAt: Date.now()
        });

        // 히스토리에 추가
        this.notificationHistory.push({
            ...notification,
            method,
            shownAt: Date.now()
        });

        // 히스토리 크기 제한 (최근 100개)
        if (this.notificationHistory.length > 100) {
            this.notificationHistory = this.notificationHistory.slice(-100);
        }

        this.cleanupOldNotifications();
        this.emit('notification-shown', { notification, method });
    }

    /**
     * 오래된 알림 정리
     */
    cleanupOldNotifications() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1시간

        for (const [key, notification] of this.activeNotifications.entries()) {
            if (now - notification.shownAt > maxAge) {
                this.activeNotifications.delete(key);
            }
        }
    }

    /**
     * 대기열 알림 처리
     */
    processQueuedNotifications() {
        if (this.notificationQueue.length === 0) {
            return;
        }

        console.log(`📋 대기열 알림 처리: ${this.notificationQueue.length}개`);
        
        const notifications = [...this.notificationQueue];
        this.notificationQueue = [];

        notifications.forEach(notification => {
            this.show(notification);
        });
    }

    /**
     * 대기열에 알림 추가
     */
    queueNotification(notification) {
        if (this.notificationQueue.length >= this.options.maxPendingNotifications) {
            const oldestIndex = this.notificationQueue.findIndex(n => n.level !== 'emergency');
            if (oldestIndex >= 0) {
                this.notificationQueue.splice(oldestIndex, 1);
            }
        }

        this.notificationQueue.push(notification);
        this.emit('notification-queued', notification);
    }

    /**
     * 이벤트 핸들러들
     */
    handleNotificationClick(notificationId) {
        console.log('👆 알림 클릭:', notificationId);
        this.emit('notification-click', notificationId);
    }

    handleNotificationDismiss(notificationId) {
        console.log('❌ 알림 닫음:', notificationId);
        this.emit('notification-dismiss', notificationId);
    }

    handleNotificationAction(notificationId, actionId) {
        console.log('⚡ 알림 액션:', notificationId, actionId);
        this.emit('notification-action', { notificationId, actionId });
    }

    handleServiceWorkerMessage(data) {
        console.log('📨 Service Worker 메시지:', data);
        this.emit('service-worker-message', data);
    }

    /**
     * 이벤트 시스템
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }

    emit(event, data) {
        const handlers = this.eventListeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ 이벤트 핸들러 오류 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 설정 업데이트
     */
    updateSettings(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.saveSettings();
        this.emit('settings-updated', this.options);
        console.log('⚙️ 알림 설정 업데이트:', newOptions);
    }

    /**
     * 통계 및 상태
     */
    getStats() {
        return {
            platform: this.platform,
            permissions: this.permissions,
            isInitialized: this.isInitialized,
            activeNotifications: this.activeNotifications.size,
            queuedNotifications: this.notificationQueue.length,
            historyCount: this.notificationHistory.length,
            serviceWorkerRegistered: this.serviceWorkerRegistered,
            watcherActive: !!this.watcherInterval
        };
    }

    /**
     * 알림 히스토리 반환
     */
    getHistory(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.notificationHistory.filter(n => n.shownAt >= cutoff);
    }

    /**
     * 테스트 알림
     */
    testNotification(level = 'normal') {
        const testMessages = {
            normal: { title: '테스트 알림', message: '일반 테스트 메시지입니다.' },
            warning: { title: '⚠️ 테스트 경고', message: '경고 테스트 메시지입니다.' },
            danger: { title: '🚨 테스트 위험', message: '위험 테스트 메시지입니다.' },
            emergency: { title: '🆘 테스트 응급', message: '응급 테스트 메시지입니다.' }
        };

        const testMsg = testMessages[level] || testMessages.normal;
        
        return this.show({
            ...testMsg,
            level,
            friendName: '테스트 친구',
            actions: [
                { id: 'test-action', title: '테스트 액션', icon: '🧪' }
            ]
        });
    }

    /**
     * 정리
     */
    destroy() {
        if (this.watcherInterval) {
            clearInterval(this.watcherInterval);
            this.watcherInterval = null;
        }

        this.clearInAppNotifications();
        this.activeNotifications.clear();
        this.notificationQueue = [];
        this.notificationHistory = [];
        this.eventListeners.clear();
        this.lastCheckedFriends.clear();
        this.isInitialized = false;
        
        console.log('🗑️ Advanced Notification Manager v2.0 정리 완료');
    }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedNotificationManager;
} else {
    window.AdvancedNotificationManager = AdvancedNotificationManager;
}