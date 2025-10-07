/**
 * FCM Service - 실제 FCM 알림 전송을 위한 서비스
 * Firebase Cloud Functions와 연동하여 FCM 메시지 발송
 */

class FCMService {
    constructor() {
        // Firebase Cloud Functions 엔드포인트
        this.fcmEndpoints = window.ENV_CONFIG?.fcmEndpoints || {
            sendNotification: 'https://us-central1-lonely-care-app.cloudfunctions.net/sendNotification',
            sendBroadcastNotification: 'https://us-central1-lonely-care-app.cloudfunctions.net/sendBroadcastNotification',
            updateToken: 'https://us-central1-lonely-care-app.cloudfunctions.net/updateFCMToken'
        };
        
        // Firebase 클라이언트 참조
        this.firebaseClient = window.firebaseClient;
        
        console.log('🚀 FCMService 초기화 (Firebase 기반)');
    }

    /**
     * FCM 알림 전송 (단일 사용자)
     */
    async sendNotificationToUser(userId, notification) {
        try {
            console.log('📤 FCM 알림 전송:', { userId, notification });

            // 사용자의 FCM 토큰 조회
            const token = await this.getUserFCMToken(userId);
            if (!token) {
                console.warn('⚠️ 사용자 FCM 토큰 없음:', userId);
                return false;
            }

            // FCM 메시지 구성
            const fcmMessage = {
                to: token,
                notification: {
                    title: notification.title,
                    body: notification.body || notification.message,
                    icon: notification.icon || '/icon-192x192.png',
                    badge: '/icon-192x192.png', // badge용으로 기존 아이콘 재사용
                    click_action: notification.clickAction || 'https://lonely-care.com'
                },
                data: {
                    userId: userId,
                    type: notification.type || 'general',
                    alertLevel: notification.alertLevel || 'normal',
                    friendId: notification.friendId || '',
                    timestamp: new Date().toISOString(),
                    ...notification.data
                },
                // Android 특정 설정
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true
                    }
                },
                // 웹 푸시 특정 설정
                webpush: {
                    headers: {
                        TTL: '86400'
                    },
                    notification: {
                        vibrate: [200, 100, 200],
                        requireInteraction: notification.alertLevel === 'emergency'
                    }
                }
            };

            // 백엔드 API 호출
            const response = await this.callFCMAPI(fcmMessage);
            
            if (response.success) {
                console.log('✅ FCM 알림 전송 성공');
                await this.logNotification(userId, notification, 'sent');
                return true;
            } else {
                console.error('❌ FCM 알림 전송 실패:', response.error);
                await this.logNotification(userId, notification, 'failed', response.error);
                return false;
            }

        } catch (error) {
            console.error('❌ FCM 알림 전송 오류:', error);
            await this.logNotification(userId, notification, 'error', error.message);
            return false;
        }
    }

    /**
     * FCM 알림 전송 (여러 사용자)
     */
    async sendNotificationToMultipleUsers(userIds, notification) {
        console.log('📤 다중 사용자 FCM 알림 전송:', { userIds: userIds.length, notification });

        const results = await Promise.allSettled(
            userIds.map(userId => this.sendNotificationToUser(userId, notification))
        );

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        console.log(`✅ FCM 알림 전송 완료: ${successCount}/${userIds.length}명`);

        return { total: userIds.length, success: successCount };
    }

    /**
     * 전체 사용자에게 알림 전송 (관리자 기능)
     */
    async sendBroadcastNotification(notification) {
        try {
            console.log('📢 전체 알림 전송 시작:', notification);

            // 활성 사용자 목록 조회
            const activeUsers = await this.getActiveUsers();
            if (!activeUsers || activeUsers.length === 0) {
                console.warn('⚠️ 활성 사용자가 없습니다');
                return { total: 0, success: 0 };
            }

            // 전체 알림 전송
            const userIds = activeUsers.map(user => user.user_id);
            return await this.sendNotificationToMultipleUsers(userIds, notification);

        } catch (error) {
            console.error('❌ 전체 알림 전송 실패:', error);
            return { total: 0, success: 0 };
        }
    }

    /**
     * 친구 상태 알림 전송
     */
    async sendFriendStatusAlert(userId, friendData) {
        const alertTitles = {
            warning: '⚠️ 친구 상태 주의',
            danger: '🚨 친구 상태 경고',
            emergency: '🆘 친구 상태 긴급'
        };

        const notification = {
            title: alertTitles[friendData.alert_level] || '📢 친구 알림',
            body: `${friendData.friend_name}님이 ${friendData.hours_since_heartbeat}시간째 무응답 상태입니다.`,
            type: 'friend_status',
            alertLevel: friendData.alert_level,
            friendId: friendData.friend_id,
            icon: '/lonely-care/icon-192x192.png',
            clickAction: '/lonely-care/#friends',
            data: {
                friendName: friendData.friend_name,
                hoursSinceHeartbeat: friendData.hours_since_heartbeat,
                lastActive: friendData.last_active
            }
        };

        return await this.sendNotificationToUser(userId, notification);
    }

    /**
     * 시스템 알림 전송
     */
    async sendSystemNotification(title, message, targetUserId = null) {
        const notification = {
            title: `🔔 ${title}`,
            body: message,
            type: 'system',
            alertLevel: 'normal',
            icon: '/lonely-care/icon-192x192.png'
        };

        if (targetUserId) {
            return await this.sendNotificationToUser(targetUserId, notification);
        } else {
            return await this.sendBroadcastNotification(notification);
        }
    }

    /**
     * 사용자의 FCM 토큰 조회
     */
    async getUserFCMToken(userId) {
        try {
            if (!this.firebaseClient) {
                console.error('❌ Firebase 클라이언트가 초기화되지 않았습니다');
                return null;
            }

            const { data, error } = await this.firebaseClient.queryDocuments(
                'userFCMTokens',
                [['userId', '==', userId], ['isActive', '==', true]],
                ['updatedAt', 'desc'],
                1
            );

            if (error) {
                throw error;
            }

            return data[0]?.fcmToken || null;

        } catch (error) {
            console.error('❌ FCM 토큰 조회 오류:', error);
            return null;
        }
    }

    /**
     * 활성 사용자 목록 조회
     */
    async getActiveUsers() {
        try {
            if (!this.firebaseClient) {
                console.error('❌ Firebase 클라이언트가 초기화되지 않았습니다');
                return [];
            }

            const { data, error } = await this.firebaseClient.queryDocuments(
                'userFCMTokens',
                [['isActive', '==', true]]
            );

            if (error) {
                throw error;
            }

            return data.map(token => ({ user_id: token.userId, fcm_token: token.fcmToken }));

        } catch (error) {
            console.error('❌ 활성 사용자 조회 오류:', error);
            return [];
        }
    }

    /**
     * FCM API 호출 (Firebase Cloud Functions)
     */
    async callFCMAPI(fcmMessage) {
        try {
            // 단일 사용자 전송인 경우 sendNotification 사용
            const endpoint = fcmMessage.broadcast ? 
                this.fcmEndpoints.sendBroadcastNotification : 
                this.fcmEndpoints.sendNotification;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: fcmMessage.data?.userId,
                    title: fcmMessage.notification.title,
                    body: fcmMessage.notification.body,
                    type: fcmMessage.data?.type || 'general',
                    alertLevel: fcmMessage.data?.alertLevel || 'normal',
                    data: fcmMessage.data || {}
                })
            });

            const result = await response.json();

            if (response.ok) {
                return { success: true, data: result };
            } else {
                return { success: false, error: result.error || 'FCM API 호출 실패' };
            }

        } catch (error) {
            console.error('❌ FCM API 호출 오류:', error);
            
            // Fallback: 로컬 알림으로 대체
            if (window.notificationManagerComponent) {
                try {
                    await window.notificationManagerComponent.showNotification({
                        title: fcmMessage.notification.title,
                        message: fcmMessage.notification.body,
                        level: fcmMessage.data?.alertLevel || 'normal'
                    });
                    return { success: true, data: { fallback: true } };
                } catch (fallbackError) {
                    console.error('❌ Fallback 실패:', fallbackError);
                }
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * 알림 로그 기록
     */
    async logNotification(userId, notification, status, error = null) {
        try {
            if (!this.firebaseClient) {
                console.warn('⚠️ Firebase 클라이언트가 없어 로그를 기록할 수 없습니다');
                return;
            }

            await this.firebaseClient.db.collection('notificationLogs').add({
                userId: userId,
                notificationType: notification.type,
                title: notification.title,
                body: notification.body || notification.message,
                level: notification.alertLevel || 'normal',
                status: status,
                errorMessage: error,
                metadata: {
                    alertLevel: notification.alertLevel,
                    friendId: notification.friendId,
                    data: notification.data
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (logError) {
            console.error('⚠️ 알림 로그 기록 실패:', logError);
        }
    }

    /**
     * FCM 토큰 업데이트
     */
    async updateUserFCMToken(userId, token) {
        try {
            // Firebase Cloud Function 호출
            const response = await fetch(this.fcmEndpoints.updateToken, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    fcmToken: token,
                    platform: this.detectPlatform(),
                    userAgent: navigator.userAgent
                })
            });

            const result = await response.json();
            return response.ok && result.success;

        } catch (error) {
            console.error('❌ FCM 토큰 업데이트 실패:', error);
            return false;
        }
    }

    /**
     * 플랫폼 감지
     */
    detectPlatform() {
        const userAgent = navigator.userAgent || '';
        if (window.AndroidBridge) {
            return 'android-native';
        } else if (userAgent.includes('wv')) {
            return 'webview';
        } else {
            return 'web';
        }
    }
}

// 전역 인스턴스 생성
window.fcmService = new FCMService();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FCMService;
}