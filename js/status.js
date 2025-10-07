class StatusManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.alertThresholds = {
            warning: 24 * 60 * 60 * 1000,    // 24시간 (밀리초)
            critical: 48 * 60 * 60 * 1000,   // 48시간
            emergency: 72 * 60 * 60 * 1000   // 72시간
        };
        this.lastNotificationSent = {};
    }

    // 친구들의 상태 로드 및 표시
    async loadFriendsStatus() {
        console.log('🔍 친구 상태 로드 시작');
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            console.log('❌ 현재 사용자가 없습니다');
            return;
        }

        try {
            console.log('📡 Firebase에서 친구 목록 조회 중...');
            // Firebase에서 친구 목록 조회
            const friendships = await this.storage.query('friendships', {
                where: [
                    ['userId', '==', currentUser.id],
                    ['status', '==', 'accepted']
                ]
            });
            
            const friends = [];
            for (const friendship of friendships) {
                const friendUser = await this.storage.getById('users', friendship.friendId);
                if (friendUser) {
                    friends.push(friendUser);
                }
            }
            console.log(`📊 조회된 친구 수: ${friends.length}`, friends);
            
            const friendsStatusContainer = document.getElementById('friends-status');
            
            if (!friendsStatusContainer) {
                console.log('❌ friends-status 컨테이너를 찾을 수 없습니다');
                return;
            }

            if (friends.length === 0) {
                console.log('⚠️ 등록된 친구가 없습니다');
                friendsStatusContainer.innerHTML = `
                    <div class="no-friends-status">
                        <p style="text-align: center; color: #999; padding: 40px;">등록된 친구가 없습니다.<br>친구 관리에서 친구를 추가해주세요.</p>
                    </div>
                `;
                return;
            }

            // 친구들의 활동 상태 확인
            const friendsWithStatus = [];
            for (const friend of friends) {
                try {
                    const activityCheck = await this.checkUserActivity(friend.id);
                    friendsWithStatus.push({
                        user: friend,
                        activityCheck: activityCheck
                    });
                } catch (error) {
                    console.error(`친구 ${friend.name} 상태 확인 실패:`, error);
                    // 오류가 있어도 기본 정보는 표시
                    friendsWithStatus.push({
                        user: friend,
                        activityCheck: { alertLevel: null, hoursSinceActivity: 0 }
                    });
                }
            }

            // 상태에 따라 정렬 (위험한 순서대로)
            friendsWithStatus.sort((a, b) => {
                const alertOrder = { 'emergency': 4, 'danger': 3, 'warning': 2, 'normal': 1, null: 0 };
                const aLevel = alertOrder[a.activityCheck?.alertLevel] || 0;
                const bLevel = alertOrder[b.activityCheck?.alertLevel] || 0;
                return bLevel - aLevel;
            });

            // 상태별 카운트 업데이트
            this.updateStatusCounts(friendsWithStatus);

            // 상태 목록 HTML 생성
            friendsStatusContainer.innerHTML = friendsWithStatus.map(friend => {
                return this.generateStatusItemHTML(friend);
            }).join('');

            // 마지막 업데이트 시간 표시
            document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString('ko-KR');

        } catch (error) {
            console.error('친구 상태 로드 실패:', error);
            document.getElementById('friends-status').innerHTML = `
                <div style="text-align: center; color: #dc3545; padding: 40px;">
                    <p>친구 상태를 불러오는데 실패했습니다.</p>
                    <p>잠시 후 다시 시도해주세요.</p>
                </div>
            `;
        }
    }

    // 사용자 활동 상태 확인 (Firebase 호환)
    async checkUserActivity(userId) {
        try {
            // Firebase 기반 활동 기록 조회
            const now = new Date();
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            // 최근 하트비트 기록 조회
            const heartbeats = await this.storage.query('heartbeats', {
                where: [
                    ['userId', '==', userId],
                    ['timestamp', '>=', dayAgo.toISOString()]
                ],
                orderBy: [['timestamp', 'desc']],
                limit: 1
            });

            // 최근 움직임 기록 조회
            const motionData = await this.storage.query('motionData', {
                where: [
                    ['userId', '==', userId],
                    ['timestamp', '>=', dayAgo.toISOString()]
                ],
                orderBy: [['timestamp', 'desc']],
                limit: 1
            });

            // 가장 최근 활동 시간 계산
            let lastActivity = null;
            
            if (heartbeats.length > 0) {
                lastActivity = new Date(heartbeats[0].timestamp);
            }
            
            if (motionData.length > 0) {
                const motionTime = new Date(motionData[0].timestamp);
                if (!lastActivity || motionTime > lastActivity) {
                    lastActivity = motionTime;
                }
            }

            if (!lastActivity) {
                // 활동 기록이 없으면 사용자 정보의 lastActivity 사용
                const user = await this.storage.getById('users', userId);
                if (user && user.lastActivity) {
                    lastActivity = new Date(user.lastActivity);
                }
            }

            // 활동 없음 시간 계산
            const hoursSinceActivity = lastActivity ? 
                (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60) : 999;

            // 경고 레벨 결정
            let alertLevel = 'normal';
            if (hoursSinceActivity >= 72) {
                alertLevel = 'emergency';
            } else if (hoursSinceActivity >= 48) {
                alertLevel = 'danger';
            } else if (hoursSinceActivity >= 24) {
                alertLevel = 'warning';
            }

            return {
                alertLevel,
                hoursSinceActivity: Math.floor(hoursSinceActivity),
                lastActivity: lastActivity ? lastActivity.toISOString() : null
            };

        } catch (error) {
            console.error('활동 상태 확인 실패:', error);
            return { 
                alertLevel: null, 
                hoursSinceActivity: 0,
                lastActivity: null 
            };
        }
    }

    // 상태별 카운트 업데이트
    updateStatusCounts(friendsWithStatus) {
        const counts = {
            all: friendsWithStatus.length,
            normal: 0,
            warning: 0,
            danger: 0,
            emergency: 0
        };

        friendsWithStatus.forEach(friend => {
            const level = friend.activityCheck?.alertLevel;
            if (level && counts[level] !== undefined) {
                counts[level]++;
            } else {
                counts.normal++;
            }
        });

        // UI 업데이트
        Object.keys(counts).forEach(status => {
            const element = document.getElementById(`count-${status}`);
            if (element) {
                element.textContent = counts[status];
            }
        });
    }

    // 상태 아이템 HTML 생성
    generateStatusItemHTML(friend) {
        const alertLevel = friend.activityCheck?.alertLevel || 'normal';
        const hoursSinceActivity = friend.activityCheck?.hoursSinceActivity || 0;
        const lastActivity = friend.activityCheck?.lastActivity;
        
        let statusMessage = '🟢 정상';
        let statusColor = '#28a745';
        let statusIcon = '🟢';
        let cardClass = 'friend-status-card';
        
        if (alertLevel === 'warning') {
            statusMessage = '🟡 주의 - 24시간 무응답';
            statusColor = '#ffc107';
            statusIcon = '🟡';
            cardClass = 'friend-status-card status-warning';
        } else if (alertLevel === 'danger') {
            statusMessage = '🟠 경고 - 48시간 무응답';
            statusColor = '#fd7e14';
            statusIcon = '🟠';
            cardClass = 'friend-status-card status-danger';
        } else if (alertLevel === 'emergency') {
            statusMessage = '🔴 위험 - 72시간 무응답';
            statusColor = '#dc3545';
            statusIcon = '🔴';
            cardClass = 'friend-status-card status-emergency';
        }

        const lastActivityText = lastActivity ? this.getTimeAgo(lastActivity) : '기록 없음';
        
        return `
            <div class="${cardClass}" data-status="${alertLevel}" data-friend-id="${friend.user.id}">
                <div class="friend-status-header">
                    <div class="friend-status-name">${friend.user.name}</div>
                    <div class="friend-status-badge" style="background-color: ${statusColor};">
                        ${statusIcon}
                    </div>
                </div>
                
                <div class="friend-status-info">
                    <div class="status-item">
                        <span class="status-label">상태:</span>
                        <span class="status-value" style="color: ${statusColor}; font-weight: bold;">
                            ${statusMessage}
                        </span>
                    </div>
                    
                    <div class="status-item">
                        <span class="status-label">마지막 활동:</span>
                        <span class="status-value">${lastActivityText}</span>
                    </div>
                    
                    <div class="status-item">
                        <span class="status-label">무응답 시간:</span>
                        <span class="status-value">
                            ${hoursSinceActivity > 0 ? `${hoursSinceActivity}시간` : '1시간 미만'}
                        </span>
                    </div>
                </div>
                
                ${alertLevel !== 'normal' ? `
                    <div class="friend-status-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="statusManager.sendCheckupMessage('${friend.user.id}')">
                            📞 연락하기
                        </button>
                        ${alertLevel === 'emergency' ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="statusManager.contactEmergencyServices('${friend.user.id}')">
                                🚨 응급신고
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 활동 경고 수준 확인
    async checkActivityAlert(username) {
        try {
            const userStatus = await this.storage.getUserStatus(username);
            if (!userStatus || !userStatus.lastActivity) {
                return null;
            }

            const now = new Date();
            const lastActivity = new Date(userStatus.lastActivity);
            const timeSinceActivity = now - lastActivity;
            const hoursSinceActivity = Math.floor(timeSinceActivity / (1000 * 60 * 60));

            let alertLevel = null;
            if (timeSinceActivity >= this.alertThresholds.emergency) {
                alertLevel = 'emergency';
            } else if (timeSinceActivity >= this.alertThresholds.critical) {
                alertLevel = 'critical';
            } else if (timeSinceActivity >= this.alertThresholds.warning) {
                alertLevel = 'warning';
            }

            return {
                alertLevel: alertLevel,
                hoursSinceActivity: hoursSinceActivity,
                timeSinceActivity: timeSinceActivity,
                lastActivity: userStatus.lastActivity
            };

        } catch (error) {
            console.error(`활동 경고 확인 실패 (${username}):`, error);
            return null;
        }
    }

    // 모든 친구들의 활동 확인 및 알림 발송
    async checkFriendsActivity() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        try {
            const friendships = await this.storage.getFriends(currentUser.username);
            
            for (const friendship of friendships) {
                const activityCheck = await this.checkActivityAlert(friendship.friend);
                if (activityCheck && activityCheck.alertLevel) {
                    await this.handleActivityAlert(friendship.friend, activityCheck);
                }
            }

            // 상태 페이지가 현재 활성화되어 있다면 새로고침
            if (appManager && appManager.currentPage === 'status') {
                await this.loadFriendsStatus();
            }

        } catch (error) {
            console.error('친구 활동 확인 실패:', error);
        }
    }

    // 활동 경고 처리
    async handleActivityAlert(username, activityCheck) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        const alertKey = `${username}_${activityCheck.alertLevel}`;
        const now = Date.now();

        // 같은 수준의 알림을 너무 자주 보내지 않도록 제한 (12시간마다)
        if (this.lastNotificationSent[alertKey] && 
            (now - this.lastNotificationSent[alertKey]) < 12 * 60 * 60 * 1000) {
            return;
        }

        try {
            const friendUser = await this.storage.getUser(username);
            const friendName = friendUser?.name || username;

            // 알림 메시지 생성
            let message = '';
            let notificationType = 'warning';

            switch (activityCheck.alertLevel) {
                case 'warning':
                    message = `${friendName}님이 24시간 이상 활동하지 않았습니다.`;
                    notificationType = 'warning';
                    break;
                case 'critical':
                    message = `${friendName}님이 48시간 이상 활동하지 않았습니다. 확인이 필요합니다.`;
                    notificationType = 'critical';
                    break;
                case 'emergency':
                    message = `${friendName}님이 72시간 이상 활동하지 않았습니다. 응급상황일 수 있습니다.`;
                    notificationType = 'emergency';
                    await this.notifyEmergencyServices(friendUser, activityCheck);
                    break;
            }

            // 알림 저장
            await this.storage.addNotification({
                user: currentUser.username,
                type: notificationType,
                message: message,
                level: activityCheck.alertLevel === 'warning' ? 1 : 
                       activityCheck.alertLevel === 'critical' ? 2 : 3
            });

            // 브라우저 알림 표시 (권한이 있는 경우)
            if (Notification.permission === 'granted') {
                new Notification('lonely-care 알림', {
                    body: message,
                    icon: '/assets/icon.png' // 아이콘 파일이 있는 경우
                });
            }

            // UI 알림 표시
            auth.showNotification(message, notificationType === 'emergency' ? 'error' : 'warning');

            this.lastNotificationSent[alertKey] = now;

        } catch (error) {
            console.error('활동 경고 처리 실패:', error);
        }
    }

    // 응급 서비스 알림 (72시간 경고시)
    async notifyEmergencyServices(friendUser, activityCheck) {
        if (!friendUser) return;

        try {
            // 관리자 설정에서 응급 연락처 정보 가져오기
            console.log('응급 서비스 알림:', friendUser.name, '72시간 무응답');
            
            // 실제 응급 서비스 연동 (응급 서비스 API 사용)
            if (window.reportEmergencyToService) {
                const emergencyData = {
                    reason: '72시간 이상 무응답',
                    friendUser: friendUser,
                    activityCheck: activityCheck,
                    timestamp: new Date().toISOString()
                };
                
                await window.reportEmergencyToService(emergencyData);
                console.log('✅ 응급 서비스 신고 완료:', friendUser.name);
            } else {
                console.warn('⚠️ 응급 서비스 API를 찾을 수 없습니다');
            }
            
        } catch (error) {
            console.error('응급 서비스 알림 실패:', error);
        }
    }

    // 시간 차이를 사용자 친화적 문자열로 변환 (통합된 함수 사용)
    // @deprecated 이 함수는 RealTimeStatusManager.formatTimeDifference()로 통합되었습니다.
    getTimeAgo(timestamp) {
        // 실시간 시간 관리자가 있으면 그것을 우선 사용
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(timestamp);
        }
        
        // alert-level-manager의 통합된 함수 사용 (2차 백업)
        if (window.alertLevelManager) {
            return window.alertLevelManager.formatTimeDifference(timestamp);
        }
        
        // 최종 백업: 기존 로직 유지 (호환성)
        console.warn('⚠️ 통합된 시간 관리자를 찾을 수 없음, 백업 시간 계산 사용');
        
        const now = new Date();
        const past = new Date(timestamp);
        
        // 유효하지 않은 날짜 처리
        if (isNaN(past.getTime())) {
            console.warn('⚠️ 유효하지 않은 timestamp:', timestamp);
            return '알 수 없음';
        }
        
        const diff = now - past;
        
        // 음수 시간 차이 처리 (미래 시간)
        if (diff < 0) {
            return '방금 전';
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days > 0) {
            return `${days}일 전`;
        } else if (hours > 0) {
            return `${hours}시간 전`;
        } else if (minutes > 0) {
            return `${minutes}분 전`;
        } else if (seconds > 30) {
            return '1분 미만';
        } else {
            return '방금 전';
        }
    }

    // 연락하기 기능
    async sendCheckupMessage(friendId) {
        try {
            const friend = await this.storage.getById('users', friendId);
            if (friend && friend.phone) {
                // Android 환경에서 전화 걸기
                if (window.AndroidBridge) {
                    window.AndroidBridge.makePhoneCall(friend.phone);
                } else {
                    // 웹 환경에서는 전화 링크 열기
                    window.open(`tel:${friend.phone}`);
                }
            } else {
                auth.showNotification('친구의 연락처가 없습니다.', 'warning');
            }
        } catch (error) {
            console.error('연락하기 실패:', error);
            auth.showNotification('연락하기에 실패했습니다.', 'error');
        }
    }

    // 응급신고 기능
    async contactEmergencyServices(friendId) {
        try {
            const friend = await this.storage.getById('users', friendId);
            if (friend) {
                const message = `lonely-care 응급신고\n\n` +
                               `이름: ${friend.name}\n` +
                               `주소: ${friend.address || '정보 없음'}\n` +
                               `전화: ${friend.phone || '정보 없음'}\n` +
                               `72시간 이상 무응답 상태`;
                
                // 119 응급신고
                if (window.AndroidBridge) {
                    window.AndroidBridge.makePhoneCall('119');
                } else {
                    window.open('tel:119');
                }
                
                console.log('응급신고 정보:', message);
                auth.showNotification('119에 연결됩니다. 친구 정보를 전달해주세요.', 'info');
            }
        } catch (error) {
            console.error('응급신고 실패:', error);
            auth.showNotification('응급신고에 실패했습니다.', 'error');
        }
    }

    // 상태 새로고침
    async refreshStatus() {
        console.log('🔄 친구 상태 새로고침');
        await this.loadFriendsStatus();
    }
}

// 전역 인스턴스 생성
window.statusManager = new StatusManager(window.storage);