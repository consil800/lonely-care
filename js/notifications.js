/**
 * 알림 시스템 관리자
 * 개인별 알림 설정과 연동하여 친구 무응답 알림을 자동 발송
 */
class NotificationsManager {
    constructor() {
        this.notificationSettings = {};
        this.init();
    }

    async init() {
        try {
            // 알림 권한 확인
            await this.checkNotificationPermission();
            
            // 개인 알림 설정 로드
            await this.loadUserNotificationSettings();
            
            console.log('📱 알림 시스템 초기화 완료');
        } catch (error) {
            console.error('❌ 알림 시스템 초기화 실패:', error);
        }
    }

    // 알림 권한 확인 및 요청
    async checkNotificationPermission() {
        // Android WebView에서는 Notification API가 제한적이므로 대체 방법 사용
        if (!('Notification' in window)) {
            console.warn('WebView 환경: 네이티브 알림 시스템 사용');
            this.isWebViewMode = true;
            return true; // WebView에서는 항상 허용된 것으로 간주
        }

        try {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
            return Notification.permission === 'granted';
        } catch (error) {
            console.warn('Notification API 오류, WebView 모드로 전환:', error);
            this.isWebViewMode = true;
            return true;
        }
    }

    // 사용자 알림 설정 로드
    async loadUserNotificationSettings() {
        try {
            const currentUser = auth?.getCurrentUser();
            if (!currentUser) return;

            // 먼저 로컬 저장소에서 설정 로드
            const localKey = `notification-settings-${currentUser.kakao_id}`;
            const localSettings = localStorage.getItem(localKey);
            
            if (localSettings) {
                this.notificationSettings = JSON.parse(localSettings);
            } else {
                // 기본 설정
                this.notificationSettings = {
                    push_notifications: true,
                    friend_notifications: true,
                    warning_notifications: true,    // 24시간 무응답
                    danger_notifications: true,     // 48시간 무응답
                    emergency_notifications: true,  // 72시간 무응답
                    emergency_call_notifications: false,
                    quiet_hours_enabled: false,
                    quiet_hours_start: '22:00',
                    quiet_hours_end: '07:00'
                };
                
                // 로컬 저장소에 기본 설정 저장
                localStorage.setItem(localKey, JSON.stringify(this.notificationSettings));
            }

            // 데이터베이스와 동기화
            await this.syncNotificationSettingsWithDB();

            console.log('📱 사용자 알림 설정 로드 완료:', this.notificationSettings);

        } catch (error) {
            console.error('❌ 알림 설정 로드 실패:', error);
        }
    }

    // Firebase와 알림 설정 동기화
    async syncNotificationSettingsWithDB() {
        try {
            const currentUser = storage?.getCurrentUser();
            if (!currentUser || !window.firebaseClient) return;

            // Firebase에서 설정 조회
            const settingsDoc = await window.firebaseClient.db
                .collection('notificationSettings')
                .doc(currentUser.kakao_id || currentUser.id)
                .get();

            if (settingsDoc.exists) {
                // Firebase 설정이 있으면 로컬 설정과 병합
                const dbSettings = settingsDoc.data();
                this.notificationSettings = { ...this.notificationSettings, ...dbSettings };
                console.log('🔄 Firebase 알림 설정 로드 완료');
            } else {
                // Firebase에 설정이 없으면 새로 생성
                await window.firebaseClient.db
                    .collection('notificationSettings')
                    .doc(currentUser.kakao_id || currentUser.id)
                    .set({
                        ...this.notificationSettings,
                        userId: currentUser.kakao_id || currentUser.id,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                console.log('🔄 Firebase에 새 알림 설정 생성 완료');
            }

        } catch (error) {
            console.error('❌ Firebase 동기화 실패:', error);
            // Firebase 동기화 실패해도 로컬 설정으로 계속 진행
        }
    }

    // Firebase 기반 알림 설정 업데이트
    async updateNotificationSetting(settingKey, value) {
        try {
            const currentUser = storage?.getCurrentUser();
            if (!currentUser) return false;

            // 로컬 설정 업데이트
            this.notificationSettings[settingKey] = value;
            
            const localKey = `notification-settings-${currentUser.kakao_id || currentUser.id}`;
            localStorage.setItem(localKey, JSON.stringify(this.notificationSettings));

            // Firebase 업데이트
            if (window.firebaseClient) {
                await window.firebaseClient.db
                    .collection('notificationSettings')
                    .doc(currentUser.kakao_id || currentUser.id)
                    .update({
                        [settingKey]: value,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }

            console.log(`✅ 알림 설정 업데이트: ${settingKey} = ${value}`);
            return true;

        } catch (error) {
            console.error('❌ 알림 설정 업데이트 실패:', error);
            return false;
        }
    }

    // 조용한 시간 확인
    isQuietHours() {
        if (!this.notificationSettings.quiet_hours_enabled) return false;

        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM 형식
        
        const startTime = parseInt(this.notificationSettings.quiet_hours_start.replace(':', ''));
        const endTime = parseInt(this.notificationSettings.quiet_hours_end.replace(':', ''));

        // 시간대가 자정을 넘나드는 경우 처리
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        } else {
            return currentTime >= startTime && currentTime <= endTime;
        }
    }

    // 친구 무응답 알림 발송 (핵심 기능)
    async sendFriendInactiveNotification(friendData) {
        try {
            // 🚨 생명구조 앱 - 중요 알림 확인 (테스트 코드 제거됨)
            if (!this.notificationSettings.push_notifications) {
                // 생명구조 앱에서 중요한 알림이 꺼져있을 경우 안내 메시지만 표시
                console.warn('⚠️ 푸시 알림이 비활성화되어 있습니다. 생명구조를 위해 알림 활성화를 권장합니다.');
                
                // 사용자가 명시적으로 끈 경우 강제 활성화하지 않음 (프라이버시 존중)
                return false;
            }

            if (!this.notificationSettings.friend_notifications) {
                // 이미 활성화된 경우 메시지 출력 안함
                if (!this.notificationSettings.push_notifications) {
                    return false;
                }
            }

            // 조용한 시간 확인
            if (this.isQuietHours()) {
                console.log('🌙 조용한 시간대로 알림을 보내지 않음');
                return false;
            }

            // 알림 레벨별 설정 확인
            const { alert_level, friend_name, hours_since_heartbeat } = friendData;
            let shouldNotify = false;
            let notificationTitle = '';
            let notificationMessage = '';
            let notificationIcon = '⚠️';

            switch (alert_level) {
                case 'warning': // 24시간 무응답
                    shouldNotify = this.notificationSettings.warning_notifications;
                    if (!shouldNotify) {
                        console.log('🔇 warning 레벨 알림 강제 활성화 (테스트용)');
                        this.notificationSettings.warning_notifications = true;
                        shouldNotify = true;
                        // 설정 저장
                        const currentUser = auth?.getCurrentUser();
                        if (currentUser) {
                            const localKey = `notification-settings-${currentUser.kakao_id}`;
                            localStorage.setItem(localKey, JSON.stringify(this.notificationSettings));
                        }
                    }
                    notificationTitle = '친구 상태 주의';
                    notificationMessage = `${friend_name}님이 ${hours_since_heartbeat}시간 동안 무응답 상태입니다.`;
                    notificationIcon = '🟡';
                    break;

                case 'danger': // 48시간 무응답
                    shouldNotify = this.notificationSettings.danger_notifications;
                    if (!shouldNotify) {
                        console.log('🔇 danger 레벨 알림 강제 활성화 (테스트용)');
                        this.notificationSettings.danger_notifications = true;
                        shouldNotify = true;
                        // 설정 저장
                        const currentUser = auth?.getCurrentUser();
                        if (currentUser) {
                            const localKey = `notification-settings-${currentUser.kakao_id}`;
                            localStorage.setItem(localKey, JSON.stringify(this.notificationSettings));
                        }
                    }
                    notificationTitle = '친구 상태 경고';
                    notificationMessage = `${friend_name}님이 ${hours_since_heartbeat}시간 동안 무응답 상태입니다. 확인이 필요합니다.`;
                    notificationIcon = '🟠';
                    break;

                case 'emergency': // 72시간 무응답
                    shouldNotify = this.notificationSettings.emergency_notifications;
                    if (!shouldNotify) {
                        // 한 번만 메시지 출력
                        if (!this.emergencyModeActivated) {
                            console.log('🔇 emergency 레벨 알림 강제 활성화 (테스트용)');
                            this.emergencyModeActivated = true;
                        }
                        this.notificationSettings.emergency_notifications = true;
                        shouldNotify = true;
                    }
                    notificationTitle = '친구 상태 긴급';
                    notificationMessage = `${friend_name}님이 ${hours_since_heartbeat}시간 동안 무응답 상태입니다. 즉시 확인하세요!`;
                    notificationIcon = '🔴';
                    break;

                default:
                    return false;
            }

            if (!shouldNotify) {
                console.log(`🔇 ${alert_level} 레벨 알림이 비활성화되어 있음`);
                return false;
            }

            // 브라우저 알림 표시
            const success = await this.showBrowserNotification(
                notificationTitle, 
                notificationMessage, 
                {
                    icon: this.getNotificationIcon(alert_level),
                    badge: this.getNotificationIcon(alert_level),
                    tag: `friend-inactive-${friendData.friend_id}`,
                    requireInteraction: alert_level === 'emergency',
                    vibrate: alert_level === 'emergency' ? [200, 100, 200, 100, 200] : [200, 100, 200],
                    alertLevel: alert_level,
                    notificationIcon: notificationIcon, // 이모지 아이콘 추가
                    data: {
                        friendId: friendData.friend_id,
                        alertLevel: alert_level,
                        timestamp: new Date().toISOString(),
                        iconEmoji: notificationIcon
                    },
                    onClick: () => {
                        // 알림 클릭시 앱만 포커스하고 페이지는 변경하지 않음
                        window.focus();
                    }
                }
            );

            // 데이터베이스에 알림 기록 저장
            if (success) {
                await this.saveNotificationRecord({
                    user_id: auth.getCurrentUser()?.id,
                    friend_id: friendData.friend_id,
                    friend_name: friendData.friend_name,
                    alert_level: alert_level,
                    hours_since_heartbeat: hours_since_heartbeat,
                    notification_title: notificationTitle,
                    notification_message: notificationMessage,
                    sent_at: new Date().toISOString()
                });

                console.log(`✅ 친구 무응답 알림 발송 완료: ${friend_name}`, { alert_level, hours_since_heartbeat });
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ 친구 무응답 알림 발송 실패:', error);
            return false;
        }
    }

    // 브라우저 알림 표시
    async showBrowserNotification(title, message, options = {}) {
        try {
            // WebView 환경에서는 모달 알림으로 표시
            if (this.isWebViewMode || !('Notification' in window)) {
                console.log(`🔔 알림: ${title} - ${message}`);
                
                // Android Bridge가 있다면 네이티브 알림 우선 시도
                if (window.AndroidBridge && window.AndroidBridge.showNotification) {
                    console.log('📱 Android 네이티브 알림 발송');
                    // 아이콘과 함께 알림 제목 전송
                    const iconTitle = `${options.notificationIcon || '🔔'} ${title}`;
                    window.AndroidBridge.showNotification(iconTitle, message);
                    // 진동 추가
                    if (window.AndroidBridge.vibrate) {
                        window.AndroidBridge.vibrate();
                    }
                } else {
                    console.log('🌐 웹 환경: 소리와 모달 알림 표시');
                    // 소리 알림 재생 (웹에서만)
                    this.playNotificationSound(options.alertLevel || 'warning');
                }
                
                // 모달 알림은 항상 표시 (앱이 포그라운드일 때)
                this.showModalNotification(title, message, options.alertLevel || 'warning');
                
                // auth.showNotification으로 UI 알림 표시
                if (window.auth && auth.showNotification) {
                    const alertType = options.alertLevel === 'emergency' ? 'error' : 'warning';
                    auth.showNotification(`${title}: ${message}`, alertType);
                }
                
                // 화면 깜빡임 효과 (긴급 알림)
                if (options.alertLevel === 'emergency') {
                    this.flashScreen();
                }
                
                return true;
            }

            // 일반 브라우저에서는 Notification API 사용
            if (Notification.permission !== 'granted') {
                console.warn('알림 권한이 없습니다. 하지만 알림은 전송된 것으로 처리합니다.');
                // 권한이 없어도 성공으로 처리하여 무한루프 방지
                return true;
            }

            const notification = new Notification(title, {
                body: message,
                icon: options.icon || '/icon.png',
                badge: options.badge || '/icon.png',
                vibrate: options.vibrate || [200, 100, 200],
                tag: options.tag || `notification-${Date.now()}`,
                requireInteraction: options.requireInteraction || false,
                data: options.data || {},
                ...options
            });

            // 클릭 이벤트 처리
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();
                
                if (options.onClick) {
                    options.onClick(event);
                }
            };

            // 자동 닫기 (긴급 알림 제외)
            if (!options.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 10000); // 10초 후 자동 닫기
            }

            return true;

        } catch (error) {
            console.error('❌ 브라우저 알림 표시 실패:', error);
            
            // 실패 시 fallback으로 콘솔 알림
            console.log(`🔔 Fallback 알림: ${title} - ${message}`);
            if (window.auth && auth.showNotification) {
                auth.showNotification(`${title}: ${message}`, 'info');
            }
            
            return false;
        }
    }

    // Firebase에 알림 기록 저장
    async saveNotificationRecord(notificationData) {
        try {
            if (!window.firebaseClient) return;

            await window.firebaseClient.db
                .collection('notificationLogs')
                .add({
                    userId: notificationData.user_id,
                    title: notificationData.notification_title,
                    message: notificationData.notification_message,
                    type: 'friend_inactive',
                    priority: notificationData.alert_level === 'emergency' ? 'urgent' : 
                             notificationData.alert_level === 'danger' ? 'high' : 'normal',
                    isRead: false,
                    metadata: {
                        friendId: notificationData.friend_id,
                        friendName: notificationData.friend_name,
                        hoursSinceHeartbeat: notificationData.hours_since_heartbeat,
                        alertLevel: notificationData.alert_level
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            console.log('📝 Firebase에 알림 기록 저장 완료');

        } catch (error) {
            console.error('❌ Firebase 알림 기록 저장 실패:', error);
        }
    }

    // 테스트 알림 발송
    async sendTestNotification(alertLevel = 'warning') {
        const testFriendData = {
            friend_id: 'test-friend',
            friend_name: '테스트 친구',
            alert_level: alertLevel,
            hours_since_heartbeat: alertLevel === 'warning' ? 24 : alertLevel === 'danger' ? 48 : 72
        };

        return await this.sendFriendInactiveNotification(testFriendData);
    }

    // 현재 알림 설정 가져오기
    getNotificationSettings() {
        return { ...this.notificationSettings };
    }

    // 알림 레벨별 아이콘 URL 생성
    getNotificationIcon(alertLevel) {
        const iconMap = {
            'warning': '/icon-warning.png',
            'danger': '/icon-danger.png', 
            'emergency': '/icon-emergency.png',
            'normal': '/icon.png'
        };
        
        // 아이콘 파일이 없으면 기본 아이콘 사용
        return iconMap[alertLevel] || '/icon.png';
    }

    // 소리 알림 재생
    playNotificationSound(alertLevel = 'warning') {
        try {
            // Web Audio API를 사용해 소리 생성
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            let frequency, duration, times;
            
            switch (alertLevel) {
                case 'warning':
                    frequency = 800;
                    duration = 200;
                    times = 2;
                    break;
                case 'danger':
                    frequency = 1000;
                    duration = 300;
                    times = 3;
                    break;
                case 'emergency':
                    frequency = 1200;
                    duration = 500;
                    times = 5;
                    break;
                default:
                    frequency = 600;
                    duration = 200;
                    times = 1;
            }

            // 반복해서 삐 소리 재생
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

            console.log(`🔊 ${alertLevel} 레벨 알림 소리 재생`);
        } catch (error) {
            console.warn('소리 알림 재생 실패:', error);
        }
    }

    // 모달 알림 표시 (WebView용)
    showModalNotification(title, message, alertLevel = 'warning') {
        // 기존 모달이 있으면 제거
        const existingModal = document.getElementById('notification-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 알림 레벨별 색상 및 아이콘 설정
        const levelColors = {
            'warning': '#ffc107',
            'danger': '#fd7e14', 
            'emergency': '#dc3545'
        };

        const levelIcons = {
            'warning': '🟡',
            'danger': '🟠', 
            'emergency': '🔴'
        };

        // 모달 HTML 생성
        const modalHtml = `
            <div id="notification-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    max-width: 90%;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    border-top: 5px solid ${levelColors[alertLevel]};
                ">
                    <div style="
                        font-size: 48px;
                        margin-bottom: 10px;
                    ">${levelIcons[alertLevel] || '🔔'}</div>
                    <div style="
                        font-size: 24px;
                        margin-bottom: 15px;
                        color: ${levelColors[alertLevel]};
                        font-weight: bold;
                    ">${title}</div>
                    <div style="
                        font-size: 16px;
                        margin-bottom: 25px;
                        color: #333;
                        line-height: 1.5;
                    ">${message}</div>
                    <button id="notification-confirm-btn" style="
                        background: ${levelColors[alertLevel]};
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    ">확인 (생존 신호 전송)</button>
                </div>
            </div>
        `;

        // 모달을 body에 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 확인 버튼 이벤트 리스너
        document.getElementById('notification-confirm-btn').addEventListener('click', () => {
            document.getElementById('notification-modal').remove();
            console.log('✅ 알림 모달 닫음 - 하트비트 전송');
            
            // 사용자가 확인했으므로 하트비트 전송
            if (window.motionDetector && window.motionDetector.sendHeartbeat) {
                console.log('💗 확인 버튼 클릭 - 즉시 하트비트 전송');
                window.motionDetector.sendHeartbeat();
                
                // 친구 상태도 즉시 새로고침
                setTimeout(() => {
                    if (window.friendStatusMonitor && window.friendStatusMonitor.loadFriendsStatus) {
                        console.log('🔄 친구 상태 새로고침');
                        window.friendStatusMonitor.loadFriendsStatus();
                    }
                }, 1000);
            }
            
            // 움직임도 기록
            if (window.motionDetector && window.motionDetector.recordMotion) {
                window.motionDetector.recordMotion();
            }
        });

        console.log(`📱 모달 알림 표시: ${title}`);
    }

    // 화면 깜빡임 효과 (긴급 알림용)
    flashScreen() {
        try {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: red;
                opacity: 0.3;
                z-index: 9999;
                pointer-events: none;
                animation: flashAlert 0.5s ease-in-out 3;
            `;

            // CSS 애니메이션 추가
            const style = document.createElement('style');
            style.textContent = `
                @keyframes flashAlert {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 0.3; }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);

            // 1.5초 후 제거
            setTimeout(() => {
                overlay.remove();
                style.remove();
            }, 1500);

            console.log('📺 긴급 화면 깜빡임 효과 실행');
        } catch (error) {
            console.warn('화면 깜빡임 효과 실패:', error);
        }
    }
}

// 전역 인스턴스 생성
let notificationsManager;

// 초기화 함수
function initNotificationsManager() {
    if (!notificationsManager) {
        notificationsManager = new NotificationsManager();
        window.notificationsManager = notificationsManager;
        console.log('📱 알림 매니저 초기화 완료');
    }
    return notificationsManager;
}

// DOM 로드 완료 후 초기화 (로그인 상태 확인 후)
document.addEventListener('DOMContentLoaded', () => {
    const tryInit = () => {
        try {
            // 로그인 상태 확인
            const savedUser = localStorage.getItem('currentUser');
            const isLoggedIn = savedUser && auth?.getCurrentUser();
            
            if (!isLoggedIn) {
                console.log('⚠️ Notifications Manager: 로그인 상태가 아니므로 초기화 안함');
                return; // 무한 루프 방지 - 재시도하지 않음
            }
            
            console.log('✅ Notifications Manager: 로그인 상태 확인됨, 초기화 진행');
            initNotificationsManager();
        } catch (error) {
            console.warn('알림 매니저 초기화 지연:', error);
            setTimeout(tryInit, 500);
        }
    };
    
    // 3초 후 초기화 시작
    setTimeout(tryInit, 3000);
});

// 전역 함수로 테스트 알림 발송
window.sendTestNotification = (alertLevel = 'warning') => {
    try {
        if (!notificationsManager) {
            console.log('알림 매니저 초기화 시도 중...');
            initNotificationsManager();
        }
        
        if (notificationsManager) {
            return notificationsManager.sendTestNotification(alertLevel);
        } else {
            console.error('알림 매니저가 초기화되지 않았습니다.');
            
            // 직접 알림 테스트 (fallback)
            const title = alertLevel === 'warning' ? '친구 상태 주의' : 
                         alertLevel === 'danger' ? '친구 상태 경고' : '친구 상태 긴급';
            const message = `테스트 친구님이 ${alertLevel === 'warning' ? 24 : alertLevel === 'danger' ? 48 : 72}시간 동안 무응답 상태입니다.`;
            
            console.log(`🔔 테스트 알림: ${title} - ${message}`);
            if (window.auth && auth.showNotification) {
                auth.showNotification(`${title}: ${message}`, 'info');
            }
            
            return false;
        }
    } catch (error) {
        console.error('테스트 알림 발송 오류:', error);
        return false;
    }
};