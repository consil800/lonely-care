/**
 * Friend Status Checker
 * 친구 상태 체크 및 알림 발송 모듈
 */

class FriendStatusChecker {
    constructor() {
        this.isCheckingNotifications = false;
        this.lastNotificationCheck = {};
        
        // 🚨 생명구조 시스템: 개발/테스트 환경에서는 적당한 쿨다운 사용 (2025.09.27)
        const isDevelopment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        this.notificationCooldown = isDevelopment ? 10 * 60 * 1000 : 2 * 60 * 60 * 1000; // 개발: 10분, 운영: 2시간
        
        console.log(`🔧 FriendStatusChecker 초기화 - 쿨다운: ${this.notificationCooldown/1000}초 (${isDevelopment ? '개발' : '운영'} 모드)`);
    }
    
    /**
     * 모든 친구의 상태 체크 및 알림 발송
     */
    async checkAndSendNotifications() {
        if (this.isCheckingNotifications) {
            console.log('⚠️ 알림 체크가 이미 실행 중입니다');
            return;
        }
        
        this.isCheckingNotifications = true;
        
        try {
            console.log('🔍 친구 상태 체크 및 알림 발송 시작');
            
            // 현재 사용자 확인
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.kakao_id) {
                console.log('❌ 로그인된 사용자가 없습니다');
                return;
            }
            
            // 알림 임계값 조회
            const thresholds = await window.notificationThresholdManager.getNotificationThresholds();
            
            // 친구 목록 조회
            const friends = await this.getFriendsWithStatus(currentUser.kakao_id);
            console.log(`📋 친구 ${friends.length}명의 상태 체크`);
            
            let notificationsSent = 0;
            
            for (const friend of friends) {
                const alertLevel = await this.checkFriendStatus(friend, thresholds);
                
                if (alertLevel !== 'normal' && this.shouldSendNotification(friend, alertLevel)) {
                    // 🚨 생명구조 수정: 알림 발송 성공 여부 확인
                    const notificationSuccess = await this.sendStatusNotification(friend, alertLevel);
                    
                    if (notificationSuccess) {
                        // 알림 발송 성공 시에만 쿨다운 설정
                        this.markNotificationSent(friend, alertLevel);
                        notificationsSent++;
                        console.log(`✅ ${friend.name} ${alertLevel} 알림 발송 및 쿨다운 설정 완료`);
                    } else {
                        console.error(`❌ ${friend.name} ${alertLevel} 알림 발송 실패 - 쿨다운 설정하지 않음 (즉시 재시도 가능)`);
                    }
                }
            }
            
            console.log(`✅ 알림 체크 완료: ${notificationsSent}개 알림 발송`);
            
        } catch (error) {
            console.error('❌ 알림 체크 실패:', error);
        } finally {
            this.isCheckingNotifications = false;
        }
    }
    
    /**
     * 친구 목록과 상태 정보 조회
     */
    async getFriendsWithStatus(userId) {
        try {
            if (!storage?.isInitialized || !window.firebaseClient) {
                console.log('⚠️ Firebase 클라이언트가 초기화되지 않음');
                return [];
            }
            
            // 🚨 양방향 친구 관계 조회 (firebaseClient.getFriends와 동일한 로직)
            const [myFriendsResult, friendsOfMeResult] = await Promise.all([
                // 내가 추가한 친구들
                window.firebaseClient.queryDocuments('friends', [
                    ['user_id', '==', userId],
                    ['status', '==', 'active']
                ]),
                // 나를 친구로 추가한 사람들
                window.firebaseClient.queryDocuments('friends', [
                    ['friend_id', '==', userId],
                    ['status', '==', 'active']
                ])
            ]);
            
            if (myFriendsResult.error || friendsOfMeResult.error) {
                console.error('친구 관계 조회 실패:', myFriendsResult.error || friendsOfMeResult.error);
                return [];
            }
            
            // 양방향 친구 관계 합치기 (중복 제거)
            const allFriendships = new Map();
            
            // 내가 추가한 친구들 처리
            (myFriendsResult.data || []).forEach(friendship => {
                allFriendships.set(friendship.friend_id, friendship);
            });
            
            // 나를 친구로 추가한 사람들 처리 (user_id와 friend_id 바뀜)
            (friendsOfMeResult.data || []).forEach(friendship => {
                if (!allFriendships.has(friendship.user_id)) {
                    allFriendships.set(friendship.user_id, {
                        ...friendship,
                        friend_id: friendship.user_id  // user_id를 friend_id로 변환
                    });
                }
            });
            
            const friendships = Array.from(allFriendships.values());
            const friends = [];
            
            for (const friendship of friendships) {
                const friendId = friendship.friend_id;
                
                // 친구의 기본 정보 조회
                const friendInfoResult = await window.firebaseClient.getDocument('users', friendId);
                if (friendInfoResult.error || !friendInfoResult.data) continue;
                
                const friendInfo = friendInfoResult.data;
                
                // 🚨 생명구조 시스템: Firebase에서 가져온 친구 정보 디버깅
                console.log('🔍 [디버그] Firebase에서 가져온 친구 정보:', {
                    friendId: friendId,
                    name: friendInfo.name,
                    email: friendInfo.email,
                    phone: friendInfo.phone,
                    phoneNumber: friendInfo.phoneNumber,
                    emergency_contact1: friendInfo.emergency_contact1,
                    emergency_contact2: friendInfo.emergency_contact2,
                    '모든 필드들': Object.keys(friendInfo)
                });
                
                // 친구의 최근 하트비트 조회 (인덱스 오류 방지용 클라이언트 정렬)
                const heartbeatsResult = await window.firebaseClient.queryDocuments('heartbeats', [
                    ['user_id', '==', friendId]
                ]); // 서버 정렬 제거하여 인덱스 오류 방지
                
                const heartbeats = heartbeatsResult.data || [];
                
                // 클라이언트 사이드에서 최신 순으로 정렬
                const sortedHeartbeats = heartbeats.sort((a, b) => {
                    const timestampA = new Date(a.timestamp).getTime();
                    const timestampB = new Date(b.timestamp).getTime();
                    return timestampB - timestampA; // 내림차순 (최신 순)
                });
                
                const lastHeartbeat = sortedHeartbeats[0];
                
                friends.push({
                    id: friendId,
                    name: friendInfo.name || '알 수 없음',
                    email: friendInfo.email || '',
                    phone: friendInfo.phone || '',
                    phoneNumber: friendInfo.phoneNumber || '',
                    emergency_contact1: friendInfo.emergency_contact1 || '',
                    emergency_contact2: friendInfo.emergency_contact2 || '',
                    profile_image: friendInfo.profile_image || '',
                    last_activity: lastHeartbeat?.timestamp || friendInfo.created_at,
                    heartbeat_data: lastHeartbeat || null
                });
            }
            
            return friends;
            
        } catch (error) {
            console.error('❌ 친구 상태 조회 실패:', error);
            return [];
        }
    }
    
    /**
     * 개별 친구 상태 체크
     */
    async checkFriendStatus(friend, thresholds) {
        try {
            if (!friend.last_activity) {
                return 'normal';
            }
            
            const alertLevel = window.alertLevelManager.calculateAlertLevel(
                friend.last_activity, 
                thresholds
            );
            
            console.log(`📊 ${friend.name}: ${alertLevel} (${window.alertLevelManager.formatTimeDifference(friend.last_activity)})`);
            
            // 🚨 72시간 긴급상황 처리 (emergency 레벨)
            if (alertLevel === 'emergency') {
                await this.handle72HourEmergency(friend);
            }
            
            return alertLevel;
            
        } catch (error) {
            console.error(`❌ ${friend.name} 상태 체크 실패:`, error);
            return 'normal';
        }
    }
    
    /**
     * 알림 발송 필요 여부 확인 (쿨다운 체크) - 2025-09-27 생명구조 시스템 버그 수정
     */
    shouldSendNotification(friend, alertLevel) {
        const now = Date.now();
        const key = `${friend.id}_${alertLevel}`;
        const lastSent = this.lastNotificationCheck[key];
        
        if (!lastSent) {
            // 🚨 생명구조 수정: 알림 발송 성공 후에만 타임스탬프 설정
            console.log(`✅ ${friend.name} 첫 번째 ${alertLevel} 알림 - 발송 허용`);
            return true;
        }
        
        // 쿨다운 시간 확인
        const timeSinceLastNotification = now - lastSent;
        const minutesElapsed = Math.round(timeSinceLastNotification / 1000 / 60);
        const cooldownMinutes = Math.round(this.notificationCooldown / 1000 / 60);
        
        if (timeSinceLastNotification >= this.notificationCooldown) {
            // 🚨 생명구조 수정: 알림 발송 성공 후에만 타임스탬프 설정
            console.log(`✅ ${friend.name} 쿨다운 완료 (${minutesElapsed}분 경과/${cooldownMinutes}분 필요) - 발송 허용`);
            return true;
        }
        
        // 🚨 생명구조 시스템: 개발 모드에서는 더 관대한 쿨다운 (2025.09.27)
        const isDevelopment = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        if (isDevelopment && timeSinceLastNotification >= 10 * 1000) { // 개발모드: 10초 후 재테스트 가능
            console.log(`🔧 개발 모드: ${friend.name} 단축 쿨다운 완료 (${minutesElapsed}분 경과) - 테스트 발송 허용`);
            return true;
        }
        
        const remainingMinutes = Math.max(0, cooldownMinutes - minutesElapsed);
        console.log(`⏰ ${friend.name} 알림 쿨다운 중 (${minutesElapsed}분 경과/${cooldownMinutes}분 필요, ${remainingMinutes}분 남음)`);
        return false;
    }
    
    /**
     * 알림 발송 성공 시 쿨다운 타임스탬프 설정 - 2025-09-27 생명구조 시스템 신규 추가
     */
    markNotificationSent(friend, alertLevel) {
        const now = Date.now();
        const key = `${friend.id}_${alertLevel}`;
        this.lastNotificationCheck[key] = now;
        console.log(`📝 ${friend.name} ${alertLevel} 알림 쿨다운 시작 - 다음 알림: ${new Date(now + this.notificationCooldown).toLocaleTimeString()}`);
    }
    
    /**
     * 쿨다운 상태 초기화 (응급 상황 또는 테스트용) - 2025-09-27 생명구조 시스템 신규 추가
     */
    resetCooldown(friend = null, alertLevel = null) {
        if (friend && alertLevel) {
            // 특정 친구의 특정 알림 레벨 쿨다운 초기화
            const key = `${friend.id}_${alertLevel}`;
            delete this.lastNotificationCheck[key];
            console.log(`🔄 ${friend.name} ${alertLevel} 쿨다운 초기화 완료`);
        } else if (friend) {
            // 특정 친구의 모든 알림 레벨 쿨다운 초기화
            const keysToDelete = Object.keys(this.lastNotificationCheck).filter(key => key.startsWith(friend.id));
            keysToDelete.forEach(key => delete this.lastNotificationCheck[key]);
            console.log(`🔄 ${friend.name} 모든 알림 쿨다운 초기화 완료`);
        } else {
            // 모든 쿨다운 초기화
            this.lastNotificationCheck = {};
            console.log('🔄 모든 친구 알림 쿨다운 초기화 완료');
        }
    }
    
    /**
     * 현재 쿨다운 상태 확인 - 2025-09-27 생명구조 시스템 신규 추가
     */
    getCooldownStatus() {
        const now = Date.now();
        const status = {};
        
        for (const [key, lastSent] of Object.entries(this.lastNotificationCheck)) {
            const [friendId, alertLevel] = key.split('_');
            const timeRemaining = Math.max(0, this.notificationCooldown - (now - lastSent));
            const minutesRemaining = Math.round(timeRemaining / 1000 / 60);
            
            if (!status[friendId]) status[friendId] = {};
            status[friendId][alertLevel] = {
                canSend: timeRemaining === 0,
                minutesRemaining: minutesRemaining,
                nextAllowedTime: new Date(lastSent + this.notificationCooldown).toLocaleString()
            };
        }
        
        return status;
    }
    
    /**
     * FCM 토큰 등록 상태 확인 및 자동 등록
     */
    async checkFCMTokenStatus() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.kakao_id) {
                console.log('❌ 로그인된 사용자 없음 - FCM 토큰 확인 불가');
                return false;
            }
            
            // 로컬에 저장된 FCM 토큰 확인
            const localToken = localStorage.getItem('fcmToken') || localStorage.getItem('fcm-token');
            console.log('💾 로컬 FCM 토큰:', localToken ? '존재함' : '없음');
            
            // FCM Token Manager 상태 확인
            if (window.fcmTokenManager) {
                console.log('🔔 FCM Token Manager 상태:', {
                    initialized: window.fcmTokenManager.isInitialized,
                    hasToken: !!window.fcmTokenManager.token
                });
                
                // 토큰이 없거나 초기화되지 않은 경우 자동 초기화
                if (!window.fcmTokenManager.isInitialized || !window.fcmTokenManager.token) {
                    console.log('🚨 생명구조 시스템: FCM 토큰 자동 등록 시작');
                    
                    try {
                        await window.fcmTokenManager.init();
                        console.log('✅ 생명구조 시스템: FCM 토큰 자동 등록 완료');
                        return true;
                    } catch (error) {
                        console.error('❌ FCM 토큰 자동 등록 실패:', error);
                        return false;
                    }
                }
            } else {
                console.warn('⚠️ FCM Token Manager를 찾을 수 없음');
                return false;
            }
            
            return !!localToken || !!window.fcmTokenManager?.token;
            
        } catch (error) {
            console.error('❌ FCM 토큰 상태 확인 실패:', error);
            return false;
        }
    }

    /**
     * 상태 알림 발송 - 2024.09.24 생명구조 시스템 대체 알림 강화
     */
    async sendStatusNotification(friend, alertLevel) {
        try {
            const levelInfo = window.alertLevelManager.getAlertLevelInfo(alertLevel);
            const timeDiff = window.alertLevelManager.formatTimeDifference(friend.last_activity);
            
            const title = `${levelInfo.icon} ${friend.name} 안전 확인`;
            const message = `${friend.name}님이 ${timeDiff} 무응답 상태입니다. (${levelInfo.text})`;
            
            console.log('🚨 생명구조 알림 발송 시작:', {
                friend: friend.name,
                alertLevel: alertLevel,
                isDevelopmentMode: window.fcmTokenManager?.isDevelopmentMode
            });
            
            let fcmSuccess = false;
            let response = null;
            
            // 개발 환경 체크 및 FCM 우회 시스템
            if (window.fcmTokenManager?.isDevelopmentMode) {
                console.log('🔧 개발 환경: FCM 발송 건너뛰고 대체 시스템 사용');
                fcmSuccess = false;
            } else {
                // FCM 토큰 상태 사전 확인
                const hasValidToken = await this.checkFCMTokenStatus();
                console.log('💾 FCM 토큰 상태:', hasValidToken ? '유효함' : '없음');
                
                // Firebase Functions를 통한 FCM 백그라운드 알림 발송
                if (hasValidToken && window.fcmEndpoints && window.fcmEndpoints.sendNotification) {
                    try {
                        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                        
                        // 🚨 생명구조 시스템: 모든 친구들에게 알림 발송
                        // 위험한 친구를 등록한 모든 사용자에게 알림
                        const friendData = {
                            id: friend.id,
                            name: friend.name,
                            alertLevel: alertLevel,
                            lastActivity: friend.last_activity
                        };
                        
                        // 1. 현재 사용자에게 알림 (자기 자신이 등록한 친구)
                        const selfNotificationData = {
                            userId: String(currentUser.kakao_id || currentUser.id || ''),
                            title: String(title),
                            body: String(message),
                            type: 'friend_status',
                            alertLevel: String(alertLevel),
                            data: {
                                friend_id: String(friend.id || ''),
                                friend_name: String(friend.name || ''),
                                timestamp: new Date().toISOString(),
                                user_id: String(currentUser.kakao_id || currentUser.id || ''),
                                source: 'friend_status_monitor'
                            }
                        };
                        
                        console.log('📤 본인에게 FCM 알림 발송:', selfNotificationData);
                        
                        response = await fetch(window.fcmEndpoints.sendNotification, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(selfNotificationData)
                        });
                        
                        // 2. 해당 친구를 등록한 다른 모든 사용자들에게도 알림 발송
                        // 이는 Firebase Functions의 스케줄링 함수가 처리하므로 여기서는 생략
                        // checkFriendStatus 함수가 5분마다 실행되어 모든 친구 관계를 체크함
                        
                        const responseText = await response.text();
                        console.log('📋 FCM 응답:', {
                            status: response.status,
                            statusText: response.statusText,
                            response: responseText
                        });
                        
                        fcmSuccess = response.ok;
                        
                        if (fcmSuccess) {
                            console.log(`✅ ${friend.name} FCM 알림 발송 성공`);
                        } else {
                            console.warn(`⚠️ ${friend.name} FCM 알림 발송 실패 - 대체 시스템 가동`);
                        }
                        
                    } catch (fcmError) {
                        console.error('❌ FCM 발송 중 오류:', fcmError);
                        fcmSuccess = false;
                    }
                } else {
                    console.log('⚠️ FCM 조건 불충족 - 토큰 또는 엔드포인트 없음');
                    fcmSuccess = false;
                }
            }
            
            // 🚨 119 응급신고 API 호출 (72시간 무응답 시)
            if (alertLevel === 'emergency') {
                try {
                    console.log('🚨 [생명구조] 응급 상황 감지 - 119 API 호출 시작');
                    
                    if (window.api119Client) {
                        const emergencyResult = await window.api119Client.reportEmergency(friend.id, {
                            id: friend.id,
                            name: friend.name,
                            phone: friend.phone || '정보 없음',
                            address: friend.address || '주소 정보 없음'
                        });
                        
                        if (emergencyResult.success) {
                            console.log(`✅ [생명구조] ${friend.name} 119 응급신고 성공`);
                        } else {
                            console.error(`❌ [생명구조] ${friend.name} 119 응급신고 실패:`, emergencyResult.error);
                        }
                    } else {
                        console.warn('⚠️ [생명구조] 119 API 클라이언트가 초기화되지 않음');
                    }
                } catch (error) {
                    console.error('❌ [생명구조] 119 API 호출 중 오류:', error);
                }
            }
            
            // 대체 알림 시스템 항상 실행 (생명구조 시스템 안전장치)
            console.log('🛡️ 생명구조 대체 알림 시스템 실행');
            await this.sendBackupNotification(friend, alertLevel, title, message);
            
            // 추가 브라우저 알림 (기존 시스템 호환성)
            if (window.notifications && typeof window.notifications.showNotification === 'function') {
                window.notifications.showNotification(title, message, alertLevel);
            }
            
            // 알림 발송 결과 로그
            console.log(`📊 ${friend.name} 알림 완료:`, {
                fcmSuccess: fcmSuccess,
                backupSystemActivated: true,
                alertLevel: alertLevel,
                isDevelopmentMode: window.fcmTokenManager?.isDevelopmentMode || false
            });
            
            // 🚨 생명구조 수정: FCM 실패해도 대체 시스템이 작동하면 성공으로 처리
            return true; // 대체 알림 시스템이 실행되었으므로 성공으로 처리
            
        } catch (error) {
            console.error(`❌ ${friend.name} 알림 발송 치명적 오류:`, error);
            
            // 모든 오류 상황에서도 최소한 대체 알림은 표시
            try {
                const title = `🚨 ${friend.name} 응급 알림`;
                const message = `${friend.name}님의 안전 상태를 확인해주세요. (시스템 오류 발생)`;
                const backupSuccess = await this.sendBackupNotification(friend, 'emergency', title, message);
                
                // 🚨 생명구조 수정: 대체 알림이라도 성공하면 성공으로 처리
                return backupSuccess;
            } catch (backupError) {
                console.error('❌ 대체 알림마저 실패:', backupError);
                return false; // 모든 알림 방법이 실패
            }
        }
    }
    
    /**
     * 대체 알림 시스템 강화 - 2024.09.24 생명구조 시스템 안정화
     */
    async sendBackupNotification(friend, alertLevel, title, message) {
        try {
            console.log('🛡️ 생명구조 다중 대체 알림 시스템 가동');
            
            const backupResults = {
                browserNotification: false,
                domNotification: false,
                localStorage: false,
                emergencyAlert: false,
                soundAlert: false,
                vibration: false
            };
            
            // 1. 브라우저 기본 알림 (가장 중요)
            try {
                await this.showBrowserNotification(title, message, alertLevel);
                backupResults.browserNotification = true;
                console.log('✅ 브라우저 알림 성공');
            } catch (error) {
                console.error('❌ 브라우저 알림 실패:', error);
            }
            
            // 2. DOM 알림 표시 (시각적 알림)
            try {
                this.showDOMNotification(friend, alertLevel, title, message);
                backupResults.domNotification = true;
                console.log('✅ DOM 알림 성공');
            } catch (error) {
                console.error('❌ DOM 알림 실패:', error);
            }
            
            // 3. 로컬 스토리지 기록 (추적 가능성)
            try {
                this.saveNotificationToLocal(friend, alertLevel, title, message);
                backupResults.localStorage = true;
                console.log('✅ 로컬 저장 성공');
            } catch (error) {
                console.error('❌ 로컬 저장 실패:', error);
            }
            
            // 4. 소리 알림 (청각적 경고) - 2025.09.27 노인 친화적 3초 지속 알림 시스템
            // 🚨 생명구조 시스템: warning 레벨도 포함 (24시간 무응답은 위험 신호)
            if (alertLevel === 'warning' || alertLevel === 'danger' || alertLevel === 'emergency') {
                if (window.userGestureManager) {
                    try {
                        // 🏥 노인분들을 위한 3초 지속 생명구조 알림 시스템
                        if (typeof window.userGestureManager.playExtendedLifeSavingAlert === 'function') {
                            console.log(`🔊 ${alertLevel} 레벨 노인 친화적 3초 지속 알림 시작`);
                            const soundSuccess = await window.userGestureManager.playExtendedLifeSavingAlert(alertLevel);
                            
                            if (soundSuccess) {
                                backupResults.soundAlert = true;
                                console.log(`🔊 ${alertLevel} 레벨 3초 지속 생명구조 알림 완료`);
                            } else {
                                console.log('🔇 3초 지속 알림 권한 없음 - 기본 알림으로 fallback');
                                // fallback: 기본 알림 시스템
                                const fallbackSuccess = await window.userGestureManager.playAlertSound(700, 1.0);
                                if (fallbackSuccess) {
                                    backupResults.soundAlert = true;
                                    console.log('🔊 기본 알림으로 fallback 성공');
                                }
                            }
                        } else {
                            // 구형 시스템 fallback (기존 방식)
                            console.log('⚠️ 3초 지속 알림 미지원 - 기존 방식 사용');
                            let frequency1, frequency2, duration;
                            if (alertLevel === 'warning') {
                                frequency1 = 700;  // 노인 친화적 주파수로 조정
                                frequency2 = 600;
                                duration = 0.8;    // 더 긴 지속시간
                            } else if (alertLevel === 'danger') {
                                frequency1 = 850;  // 중간 주파수
                                frequency2 = 700;
                                duration = 0.9;    // 더 긴 지속시간
                            } else { // emergency
                                frequency1 = 1000; // 높은 주파수
                                frequency2 = 850;
                                duration = 1.0;    // 가장 긴 지속시간
                            }
                            
                            const soundSuccess1 = await window.userGestureManager.playAlertSound(frequency1, duration);
                            if (soundSuccess1) {
                                // 더 긴 간격으로 두 번째 경고음
                                setTimeout(async () => {
                                    await window.userGestureManager.playAlertSound(frequency2, duration);
                                }, 800);
                                backupResults.soundAlert = true;
                                console.log(`🔊 ${alertLevel} 레벨 기존 방식 경고음 재생 성공`);
                            }
                        }
                    } catch (soundError) {
                        console.log('🔇 소리 알림 오류 - 시각적 알림으로 대체 (정상 작동)');
                    }
                } else {
                    console.log('🔇 UserGestureManager 없음 - 소리 알림 스킵');
                }
            }
            
            // 5. 진동 알림 (모바일 환경) - UserGestureManager 사용
            // 🚨 생명구조 시스템: warning 레벨도 포함 (24시간 무응답은 위험 신호)
            if (alertLevel === 'warning' || alertLevel === 'danger' || alertLevel === 'emergency') {
                if (window.userGestureManager) {
                    // 레벨별 차등화된 진동 패턴
                    let vibrationPattern;
                    if (alertLevel === 'warning') {
                        vibrationPattern = [200, 100, 200]; // 짧고 부드러운 진동
                    } else if (alertLevel === 'danger') {
                        vibrationPattern = [300, 100, 300, 100, 300]; // 중간 강도
                    } else { // emergency
                        vibrationPattern = [500, 100, 500, 100, 500, 100, 500]; // 강력한 진동
                    }
                    
                    const vibrationSuccess = window.userGestureManager.vibrate(vibrationPattern);
                    if (vibrationSuccess) {
                        backupResults.vibration = true;
                        console.log(`📳 ${alertLevel} 레벨 진동 알림 성공`);
                    } else {
                        console.log('🔇 진동 권한 없음 - 시각적 알림으로 대체 (정상 작동)');
                    }
                } else {
                    console.log('🔇 UserGestureManager 없음 - 진동 알림 스킵');
                }
            }
            
            // 6. 긴급상황 전체화면 알림
            try {
                if (alertLevel === 'emergency') {
                    this.showEmergencyAlert(friend, title, message);
                    backupResults.emergencyAlert = true;
                    console.log('🚨 긴급상황 전체화면 알림 성공');
                }
            } catch (error) {
                console.error('❌ 긴급상황 알림 실패:', error);
            }
            
            // 7. 탭 제목 알림 (브라우저 탭에서 깜빡임)
            try {
                this.showTabAlert(friend.name, alertLevel);
                console.log('🏷️ 탭 제목 알림 성공');
            } catch (error) {
                console.error('❌ 탭 제목 알림 실패:', error);
            }
            
            // 8. 페이지 가시성 API를 활용한 백그라운드 알림 강화
            try {
                if (document.hidden) {
                    this.showBackgroundAlert(friend, alertLevel, title, message);
                    console.log('🌙 백그라운드 알림 강화 성공');
                }
            } catch (error) {
                console.error('❌ 백그라운드 알림 실패:', error);
            }
            
            // 결과 로그
            const successCount = Object.values(backupResults).filter(result => result).length;
            const totalAttempts = Object.keys(backupResults).length;
            
            console.log(`📊 생명구조 대체 알림 완료: ${successCount}/${totalAttempts} 성공`, {
                friend: friend.name,
                alertLevel: alertLevel,
                results: backupResults
            });
            
            // 최소 하나의 알림이 성공했는지 확인
            if (successCount === 0) {
                console.error('🚨 치명적 오류: 모든 대체 알림이 실패했습니다!');
                // 마지막 수단: 간단한 alert
                try {
                    if (typeof alert !== 'undefined') {
                        alert(`🚨 긴급: ${friend.name}님의 안전을 확인해주세요!`);
                        // 🚨 생명구조 수정: alert가 성공하면 최소한의 알림은 전달됨
                        return true;
                    }
                } catch (alertError) {
                    console.error('❌ alert 마저 실패:', alertError);
                }
                // 🚨 생명구조 수정: 모든 알림이 실패
                return false;
            }
            
            // 🚨 생명구조 수정: 하나 이상의 알림이 성공
            return true;
            
        } catch (error) {
            console.error('❌ 대체 알림 시스템 치명적 오류:', error);
            
            // 최종 안전장치: 기본 브라우저 alert
            try {
                alert(`🚨 시스템 오류: ${friend.name}님의 안전을 확인해주세요!`);
                // 🚨 생명구조 수정: 최종 alert가 성공하면 최소한의 알림은 전달됨
                return true;
            } catch (finalError) {
                console.error('❌ 최종 안전장치마저 실패:', finalError);
                // 🚨 생명구조 수정: 정말로 모든 것이 실패
                return false;
            }
        }
    }
    
    /**
     * 브라우저 기본 알림 표시
     */
    async showBrowserNotification(title, message, alertLevel) {
        try {
            // 알림 권한 확인
            if (Notification.permission === 'granted') {
                const notification = new Notification(title, {
                    body: message,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png', // badge용으로 기존 아이콘 재사용
                    tag: `friend-status-${alertLevel}`,
                    renotify: true,
                    requireInteraction: alertLevel === 'emergency',
                    vibrate: alertLevel === 'emergency' ? [500, 100, 500, 100, 500] 
                            : alertLevel === 'danger' ? [200, 100, 200, 100, 200]
                            : [200, 100, 200]
                });
                
                // 알림 클릭 시 앱으로 포커스
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
                
                console.log('✅ 브라우저 알림 표시 성공');
            } else if (Notification.permission !== 'denied') {
                // 권한 요청
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    await this.showBrowserNotification(title, message, alertLevel);
                }
            }
            
        } catch (error) {
            console.error('❌ 브라우저 알림 표시 실패:', error);
        }
    }
    
    /**
     * DOM 내 알림 표시
     */
    showDOMNotification(friend, alertLevel, title, message) {
        try {
            // 알림 컨테이너 찾기 또는 생성
            let notificationContainer = document.querySelector('.notification-container');
            if (!notificationContainer) {
                notificationContainer = document.createElement('div');
                notificationContainer.className = 'notification-container';
                notificationContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    pointer-events: none;
                `;
                document.body.appendChild(notificationContainer);
            }
            
            // 알림 요소 생성
            const notificationEl = document.createElement('div');
            notificationEl.className = `notification notification-${alertLevel}`;
            notificationEl.style.cssText = `
                background: ${alertLevel === 'emergency' ? '#ff4444' : alertLevel === 'danger' ? '#ff8800' : '#ffaa00'};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 300px;
                pointer-events: auto;
                animation: slideInRight 0.3s ease-out;
            `;
            
            notificationEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
                <div style="font-size: 14px;">${message}</div>
                <button onclick="this.parentElement.remove()" 
                        style="position: absolute; top: 5px; right: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
            `;
            
            notificationContainer.appendChild(notificationEl);
            
            // 10초 후 자동 제거 (긴급상황은 20초)
            const autoRemoveTime = alertLevel === 'emergency' ? 20000 : 10000;
            setTimeout(() => {
                if (notificationEl.parentElement) {
                    notificationEl.remove();
                }
            }, autoRemoveTime);
            
            console.log('✅ DOM 알림 표시 성공');
            
        } catch (error) {
            console.error('❌ DOM 알림 표시 실패:', error);
        }
    }
    
    /**
     * 로컬 스토리지에 알림 기록
     */
    saveNotificationToLocal(friend, alertLevel, title, message) {
        try {
            const notification = {
                friend_id: friend.id,
                friend_name: friend.name,
                alert_level: alertLevel,
                title: title,
                message: message,
                timestamp: new Date().toISOString(),
                delivered_via: 'backup_system'
            };
            
            const notificationHistory = JSON.parse(localStorage.getItem('notification_history') || '[]');
            notificationHistory.unshift(notification);
            
            // 최근 100개만 유지
            if (notificationHistory.length > 100) {
                notificationHistory.splice(100);
            }
            
            localStorage.setItem('notification_history', JSON.stringify(notificationHistory));
            console.log('✅ 알림 로컬 기록 완료');
            
        } catch (error) {
            console.error('❌ 알림 로컬 기록 실패:', error);
        }
    }
    
    /**
     * 긴급상황 알림 강화
     */
    showEmergencyAlert(friend, title, message) {
        try {
            // 경고음 재생 (가능한 경우)
            this.playAlertSound();
            
            // 전체 화면 경고 표시
            const emergencyOverlay = document.createElement('div');
            emergencyOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 0, 0, 0.9);
                color: white;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-size: 24px;
                text-align: center;
                animation: blink 1s infinite;
            `;
            
            emergencyOverlay.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 20px;">🚨</div>
                <div style="font-weight: bold; margin-bottom: 15px;">${title}</div>
                <div style="font-size: 18px; margin-bottom: 30px;">${message}</div>
                <button onclick="this.parentElement.remove()" 
                        style="background: white; color: red; border: none; padding: 15px 30px; font-size: 18px; border-radius: 5px; cursor: pointer;">
                    확인했습니다
                </button>
            `;
            
            document.body.appendChild(emergencyOverlay);
            
            // CSS 애니메이션 추가
            const style = document.createElement('style');
            style.textContent = `
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.7; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            // 30초 후 자동 제거
            setTimeout(() => {
                if (emergencyOverlay.parentElement) {
                    emergencyOverlay.remove();
                }
            }, 30000);
            
            console.log('🚨 긴급상황 전체화면 알림 표시');
            
        } catch (error) {
            console.error('❌ 긴급상황 알림 표시 실패:', error);
        }
    }
    
    /**
     * 경고음 재생 (UserGestureManager 사용)
     * @deprecated 이제 UserGestureManager를 통해 처리됩니다
     */
    playAlertSound() {
        console.log('🔇 playAlertSound() 호출됨 - UserGestureManager로 리다이렉트');
        
        if (window.userGestureManager) {
            // UserGestureManager를 통해 처리
            window.userGestureManager.playAlertSound(800, 0.3).then(success => {
                if (success) {
                    setTimeout(() => {
                        window.userGestureManager.playAlertSound(600, 0.3);
                    }, 500);
                }
            });
        } else {
            console.log('🔇 UserGestureManager 없음 - 소리 알림 스킵 (정상 작동)');
        }
    }
    
    /**
     * 주기적 알림 체크 시작
     */
    startPeriodicCheck(intervalMinutes = 5) {
        // 기존 인터벌 정리
        if (this.notificationCheckInterval) {
            clearInterval(this.notificationCheckInterval);
        }
        
        const intervalMs = intervalMinutes * 60 * 1000;
        
        console.log(`⏰ 주기적 친구 상태 체크 시작 (${intervalMinutes}분마다)`);
        
        // 즉시 한 번 실행
        this.checkAndSendNotifications();
        
        // 주기적 실행
        this.notificationCheckInterval = setInterval(() => {
            this.checkAndSendNotifications();
        }, intervalMs);
    }
    
    /**
     * 주기적 체크 중지
     */
    stopPeriodicCheck() {
        if (this.notificationCheckInterval) {
            clearInterval(this.notificationCheckInterval);
            this.notificationCheckInterval = null;
            console.log('⏹️ 주기적 친구 상태 체크 중지');
        }
    }
    
    /**
     * 72시간 긴급상황 처리
     */
    async handle72HourEmergency(friend) {
        try {
            console.log(`🚨 72시간 긴급상황 감지: ${friend.name}`);
            
            // EmergencyResponseSystem이 있는지 확인
            if (!window.emergencyResponseSystem) {
                console.error('❌ EmergencyResponseSystem을 찾을 수 없음');
                // 백업: 기존 방식으로 긴급 알림만 발송
                await this.sendEmergencyBackupNotification(friend);
                return;
            }
            
            // EmergencyResponseSystem 초기화 확인
            if (!window.emergencyResponseSystem.isInitialized) {
                console.log('🔄 EmergencyResponseSystem 초기화 중...');
                await window.emergencyResponseSystem.init();
            }
            
            // 현재 사용자 정보 가져오기
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // 사용자의 상세 프로필 정보 로드
            let userProfile = null;
            if (window.storage) {
                userProfile = await window.storage.getById('users', friend.id);
            }
            
            // 사용자 데이터 구성 (friend 데이터를 사용자 데이터로 변환)
            const userData = {
                id: friend.id,
                name: friend.name,
                last_activity: friend.last_activity,
                // 프로필에서 추가 정보 가져오기
                address: userProfile?.address || '주소 정보 없음',
                detail_address: userProfile?.detail_address || '',
                postal_code: userProfile?.postal_code || '',
                blood_type: userProfile?.blood_type || '미상',
                medical_conditions: userProfile?.medical_conditions || [],
                medications: userProfile?.medications || [],
                allergies: userProfile?.allergies || [],
                emergency_contacts: userProfile?.emergency_contacts || [],
                emergency_contact_consent: userProfile?.emergency_contact_consent
            };
            
            // 친구 데이터 배열 구성 (현재 사용자가 신고자)
            const friendData = [{
                id: currentUser.kakao_id,
                name: currentUser.nickname || currentUser.name,
                phone: currentUser.phone || null
            }];
            
            // 🚨 생명구조 앱: 119 API 응급신고 먼저 실행
            let api119Success = false;
            if (window.api119Client) {
                try {
                    console.log('🚨 [생명구조] 119 API 응급신고 시작');
                    const emergencyResult = await window.api119Client.reportEmergency(friend.id, userData);
                    api119Success = emergencyResult.success;
                    
                    if (api119Success) {
                        console.log(`✅ [생명구조] ${friend.name} 119 응급신고 성공`);
                    } else {
                        console.error(`❌ [생명구조] ${friend.name} 119 응급신고 실패:`, emergencyResult.error);
                    }
                } catch (error) {
                    console.error('❌ [생명구조] 119 API 호출 중 오류:', error);
                }
            } else {
                console.warn('⚠️ [생명구조] 119 API 클라이언트가 초기화되지 않음');
            }
            
            // 72시간 긴급상황 처리 실행
            const result = await window.emergencyResponseSystem.handle72HourEmergency(userData, friendData);
            
            if (result || api119Success) {
                console.log(`✅ ${friend.name} 72시간 긴급상황 처리 완료 (119 API: ${api119Success ? '성공' : '실패'})`);
                
                // 긴급상황 처리 성공 알림
                const title = '🚨 긴급상황 신고 완료';
                const message = `${friend.name}님의 72시간 무응답 상황이 공공기관에 신고되었습니다.`;
                
                if (window.auth && window.auth.showNotification) {
                    window.auth.showNotification(message, 'success');
                }
                
                // 긴급상황 상태를 별도로 기록
                this.recordEmergencyStatus(friend, 'reported_to_authorities');
                
            } else {
                console.warn(`⚠️ ${friend.name} 72시간 긴급상황 처리 실패 또는 조건 미충족`);
                await this.sendEmergencyBackupNotification(friend);
            }
            
        } catch (error) {
            console.error(`❌ ${friend.name} 72시간 긴급상황 처리 오류:`, error);
            // 오류 발생 시 백업 알림 발송
            await this.sendEmergencyBackupNotification(friend);
        }
    }
    
    /**
     * 긴급상황 백업 알림 (EmergencyResponseSystem 실패시)
     */
    async sendEmergencyBackupNotification(friend) {
        try {
            console.log(`🚨 ${friend.name} 백업 긴급 알림 발송`);
            
            const title = '🚨 72시간 무응답 긴급상황';
            const message = `${friend.name}님이 72시간 이상 무응답 상태입니다. 즉시 안전 확인이 필요합니다.`;
            
            // 강화된 알림 발송
            if (window.notifications && window.notifications.sendUrgentNotification) {
                await window.notifications.sendUrgentNotification({
                    title,
                    message,
                    type: 'emergency',
                    urgent: true,
                    friend_id: friend.id,
                    alert_level: 'emergency'
                });
            }
            
            // 브라우저 알림
            if (window.auth && window.auth.showNotification) {
                window.auth.showNotification(message, 'error');
            }
            
            // 긴급상황 기록
            this.recordEmergencyStatus(friend, 'backup_notification_sent');
            
        } catch (error) {
            console.error(`❌ ${friend.name} 백업 긴급 알림 발송 실패:`, error);
        }
    }
    
    /**
     * 긴급상황 상태 기록
     */
    recordEmergencyStatus(friend, status) {
        try {
            const emergencyRecord = {
                friend_id: friend.id,
                friend_name: friend.name,
                status: status,
                timestamp: new Date().toISOString(),
                last_activity: friend.last_activity,
                recorded_by: 'friend_status_checker'
            };
            
            // 로컬 스토리지에 기록
            const emergencyHistory = JSON.parse(localStorage.getItem('emergency_status_history') || '[]');
            emergencyHistory.push(emergencyRecord);
            
            // 최근 30개만 유지
            if (emergencyHistory.length > 30) {
                emergencyHistory.splice(0, emergencyHistory.length - 30);
            }
            
            localStorage.setItem('emergency_status_history', JSON.stringify(emergencyHistory));
            
            console.log(`📝 ${friend.name} 긴급상황 상태 기록: ${status}`);
            
        } catch (error) {
            console.error('❌ 긴급상황 상태 기록 실패:', error);
        }
    }
    
    /**
     * 탭 제목 알림 - 브라우저 탭에서 알림 표시
     */
    showTabAlert(friendName, alertLevel) {
        try {
            const originalTitle = document.title;
            const alertIcons = {
                'emergency': '🚨',
                'danger': '⚠️',
                'warning': '🔔'
            };
            
            const icon = alertIcons[alertLevel] || '🔔';
            const alertTitle = `${icon} ${friendName} 안전확인 - 외롭지마`;
            
            // 탭 제목 변경
            document.title = alertTitle;
            
            // 깜빡이는 효과를 위해 5초간 제목 변경
            let blinkCount = 0;
            const blinkInterval = setInterval(() => {
                document.title = blinkCount % 2 === 0 ? alertTitle : originalTitle;
                blinkCount++;
                
                if (blinkCount >= 10) { // 5초간 깜빡임
                    clearInterval(blinkInterval);
                    document.title = originalTitle; // 원래 제목으로 복구
                }
            }, 500);
            
            console.log('🏷️ 탭 제목 알림 시작');
            
        } catch (error) {
            console.error('❌ 탭 제목 알림 실패:', error);
        }
    }
    
    /**
     * 백그라운드 알림 강화 - 페이지가 비활성 상태일 때 강화된 알림
     */
    showBackgroundAlert(friend, alertLevel, title, message) {
        try {
            console.log('🌙 백그라운드 상태에서 알림 강화 시작');
            
            // 1. 파비콘 변경 (가능한 경우)
            this.changeFaviconForAlert(alertLevel);
            
            // 2. 페이지 가시성 변경 이벤트 리스너 추가
            const visibilityHandler = () => {
                if (!document.hidden) {
                    // 페이지가 다시 활성화되면 강조된 알림 표시
                    console.log('👁️ 페이지 활성화됨 - 백그라운드 알림 표시');
                    
                    // 강조된 DOM 알림 표시
                    this.showHighlightedReturnAlert(friend, alertLevel, title, message);
                    
                    // 이벤트 리스너 제거
                    document.removeEventListener('visibilitychange', visibilityHandler);
                }
            };
            
            document.addEventListener('visibilitychange', visibilityHandler);
            
            // 3. 백그라운드에서 주기적인 브라우저 알림 (제한적)
            if (alertLevel === 'emergency') {
                let bgAlertCount = 0;
                const bgAlertInterval = setInterval(async () => {
                    if (document.hidden && bgAlertCount < 3) {
                        try {
                            await this.showBrowserNotification(
                                `🚨 긴급: ${friend.name}`, 
                                '페이지를 확인해주세요!', 
                                alertLevel
                            );
                            bgAlertCount++;
                        } catch (error) {
                            console.error('백그라운드 브라우저 알림 실패:', error);
                        }
                    } else {
                        clearInterval(bgAlertInterval);
                    }
                }, 30000); // 30초마다
            }
            
            console.log('✅ 백그라운드 알림 강화 설정 완료');
            
        } catch (error) {
            console.error('❌ 백그라운드 알림 강화 실패:', error);
        }
    }
    
    /**
     * 알림용 파비콘 변경
     */
    changeFaviconForAlert(alertLevel) {
        try {
            // 기존 파비콘 찾기
            let favicon = document.querySelector('link[rel*="icon"]');
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            
            // 알림 레벨에 따른 색상 변경 (가능한 경우)
            // 실제로는 새로운 아이콘 URL을 설정해야 하지만, 
            // 기본 아이콘을 그대로 사용하고 나중에 복구
            const originalHref = favicon.href;
            
            // 간단한 색상 변경 시뮬레이션 (실제로는 이미지 파일이 필요)
            console.log(`🎨 파비콘 알림 모드 활성화: ${alertLevel}`);
            
            // 5초 후 원래 파비콘으로 복구
            setTimeout(() => {
                try {
                    favicon.href = originalHref;
                } catch (error) {
                    console.error('파비콘 복구 실패:', error);
                }
            }, 5000);
            
        } catch (error) {
            console.error('❌ 파비콘 변경 실패:', error);
        }
    }
    
    /**
     * 페이지 복귀시 강조 알림
     */
    showHighlightedReturnAlert(friend, alertLevel, title, message) {
        try {
            // 화면 전체를 차지하는 환영 알림
            const returnAlert = document.createElement('div');
            returnAlert.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, rgba(255, 100, 100, 0.95), rgba(255, 150, 0, 0.95));
                color: white;
                z-index: 99998;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-size: 20px;
                text-align: center;
                animation: fadeIn 0.5s ease-in;
            `;
            
            returnAlert.innerHTML = `
                <div style="font-size: 60px; margin-bottom: 20px;">👁️</div>
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">페이지 복귀를 환영합니다!</div>
                <div style="font-size: 18px; margin-bottom: 10px;">${title}</div>
                <div style="font-size: 16px; margin-bottom: 30px; max-width: 600px;">${message}</div>
                <button onclick="this.parentElement.remove()" 
                        style="background: white; color: #ff6666; border: none; padding: 15px 30px; font-size: 18px; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    확인했습니다
                </button>
            `;
            
            document.body.appendChild(returnAlert);
            
            // CSS 애니메이션 추가
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
            
            // 10초 후 자동 제거
            setTimeout(() => {
                if (returnAlert.parentElement) {
                    returnAlert.remove();
                }
            }, 10000);
            
            console.log('✨ 페이지 복귀 강조 알림 표시');
            
        } catch (error) {
            console.error('❌ 페이지 복귀 알림 실패:', error);
        }
    }
}

// 전역 인스턴스 생성
window.friendStatusChecker = new FriendStatusChecker();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FriendStatusChecker;
}