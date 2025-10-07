/**
 * 알림 시스템 관리자 - 카카오 로그인과 완전 분리
 * 이 모듈을 수정해도 카카오 로그인에는 영향 없음
 */
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.settings = {
            enabled: true,
            sound: true,
            desktop: true,
            mobile: true
        };
        
        this.init();
    }
    
    log(message) {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] NotificationManager: ${message}`);
    }
    
    async init() {
        try {
            // 알림 권한 요청
            await this.requestPermission();
            
            // 설정 로드
            this.loadSettings();
            
            this.log('✅ 알림 시스템 초기화 완료');
        } catch (error) {
            this.log('❌ 알림 시스템 초기화 실패: ' + error.message);
        }
    }
    
    /**
     * 알림 권한 요청
     */
    async requestPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                this.log('📢 알림 권한 결과: ' + permission);
                return permission === 'granted';
            }
            return Notification.permission === 'granted';
        }
        return false;
    }
    
    /**
     * 설정 로드
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                this.log('✅ 알림 설정 로드 완료');
            } catch (error) {
                this.log('⚠️ 알림 설정 로드 실패, 기본값 사용');
            }
        }
    }
    
    /**
     * 설정 저장
     */
    saveSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
        this.log('💾 알림 설정 저장 완료');
    }
    
    /**
     * 알림 표시
     */
    show(title, message, options = {}) {
        if (!this.settings.enabled) {
            this.log('⚠️ 알림이 비활성화됨');
            return;
        }
        
        const notification = {
            id: Date.now(),
            title: title,
            message: message,
            timestamp: new Date(),
            ...options
        };
        
        this.notifications.unshift(notification);
        
        // 데스크톱 알림
        if (this.settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
            const desktopNotification = new Notification(title, {
                body: message,
                icon: options.icon || '/icon.png'
            });
            
            // 자동 닫기
            setTimeout(() => {
                desktopNotification.close();
            }, options.duration || 5000);
        }
        
        // 사운드 재생
        if (this.settings.sound && options.sound !== false) {
            this.playSound();
        }
        
        // 이벤트 발생
        this.emit('notificationShown', notification);
        
        this.log(`📢 알림 표시: ${title}`);
        return notification;
    }
    
    /**
     * 사운드 재생
     */
    playSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+v..');
        } catch (error) {
            // 사운드 재생 실패는 무시
        }
    }
    
    /**
     * 친구 무응답 알림
     */
    notifyFriendInactive(friendName, hours) {
        return this.show(
            '친구 무응답 알림',
            `${friendName}님이 ${hours}시간째 응답하지 않고 있습니다.`,
            {
                type: 'warning',
                priority: 'high',
                icon: '/icon.png'
            }
        );
    }
    
    /**
     * 긴급 상황 알림
     */
    notifyEmergency(friendName, reason) {
        return this.show(
            '긴급 상황 발생!',
            `${friendName}님에게 긴급 상황이 발생했을 수 있습니다. (${reason})`,
            {
                type: 'emergency',
                priority: 'critical',
                icon: '/icon.png',
                sound: true
            }
        );
    }
    
    /**
     * 일반 알림
     */
    notifyInfo(title, message) {
        return this.show(title, message, {
            type: 'info',
            priority: 'normal'
        });
    }
    
    /**
     * 알림 목록 가져오기
     */
    getNotifications() {
        return this.notifications;
    }
    
    /**
     * 알림 삭제
     */
    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.emit('notificationRemoved', { id });
    }
    
    /**
     * 모든 알림 삭제
     */
    clearAll() {
        this.notifications = [];
        this.emit('allNotificationsCleared');
        this.log('🗑️ 모든 알림 삭제');
    }
    
    /**
     * 설정 업데이트
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        this.emit('settingsUpdated', this.settings);
        this.log('⚙️ 설정 업데이트 완료');
    }
    
    /**
     * 이벤트 발생
     */
    emit(eventName, data) {
        const event = new CustomEvent(`notification:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }
    
    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback) {
        window.addEventListener(`notification:${eventName}`, (e) => callback(e.detail));
    }
}

// 전역으로 내보내기
window.NotificationManager = NotificationManager;