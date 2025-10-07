/**
 * StatusManager - Firebase 호환 버전
 * 기존 Supabase 코드를 Firebase로 완전 마이그레이션
 */
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

    // 친구들의 상태 로드 및 표시 (Firebase 호환)
    async loadFriendsStatus() {
        console.log('🔍 친구 상태 로드 시작 (Firebase)');
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            console.log('❌ 현재 사용자가 없습니다');
            return;
        }

        try {
            console.log('📡 Firebase에서 친구 목록 조회 중...');
            
            // ✅ Firebase 호환 API 사용
            const friends = await this.storage.query('friendships', {
                where: [
                    ['userId', '==', currentUser.id],
                    ['status', '==', 'accepted']
                ]
            });
            
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
            for (const friendship of friends) {
                try {
                    // 친구 정보 조회
                    const friendUser = await this.storage.getById('users', friendship.friendId);
                    const activityCheck = await this.checkUserActivity(friendship.friendId);
                    
                    friendsWithStatus.push({
                        user: friendUser,
                        activityCheck: activityCheck
                    });
                } catch (error) {
                    console.error(`친구 상태 확인 실패:`, error);
                    // 오류가 있어도 기본 정보는 표시
                    friendsWithStatus.push({
                        user: { id: friendship.friendId, name: '알 수 없음' },
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
            const lastUpdateElement = document.getElementById('last-update-time');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = new Date().toLocaleTimeString('ko-KR');
            }

        } catch (error) {
            console.error('친구 상태 로드 실패:', error);
            const statusContainer = document.getElementById('friends-status');
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <div style="text-align: center; color: #dc3545; padding: 40px;">
                        <p>친구 상태를 불러오는데 실패했습니다.</p>
                        <p>잠시 후 다시 시도해주세요.</p>
                    </div>
                `;
            }
        }
    }

    // 사용자 활동 상태 확인 (Firebase 호환)
    async checkUserActivity(userId) {
        try {
            // ✅ Firebase 기반 활동 기록 조회
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
            console.error('사용자 활동 확인 실패:', error);
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
            normal: 0,
            warning: 0,
            danger: 0,
            emergency: 0
        };

        friendsWithStatus.forEach(friend => {
            const level = friend.activityCheck?.alertLevel || 'normal';
            if (counts[level] !== undefined) {
                counts[level]++;
            }
        });

        // DOM 업데이트
        Object.keys(counts).forEach(level => {
            const element = document.getElementById(`${level}-count`);
            if (element) {
                element.textContent = counts[level];
            }
        });
    }

    // 상태 아이템 HTML 생성
    generateStatusItemHTML(friend) {
        const { user, activityCheck } = friend;
        const { alertLevel, hoursSinceActivity, lastActivity } = activityCheck;
        
        const statusConfig = {
            normal: { icon: '🟢', text: '정상', class: 'status-normal' },
            warning: { icon: '🟡', text: '주의', class: 'status-warning' },
            danger: { icon: '🟠', text: '경고', class: 'status-danger' },
            emergency: { icon: '🔴', text: '응급', class: 'status-emergency' }
        };

        const config = statusConfig[alertLevel] || statusConfig.normal;
        const timeText = hoursSinceActivity > 0 ? 
            `${hoursSinceActivity}시간 전` : '방금 전';

        return `
            <div class="friend-status-item ${config.class}">
                <div class="friend-info">
                    <div class="friend-avatar">
                        <img src="${user.profile_image || '/icon.png'}" 
                             alt="${user.name}" 
                             onerror="this.src='/icon.png'">
                    </div>
                    <div class="friend-details">
                        <div class="friend-name">${user.name || '이름 없음'}</div>
                        <div class="last-activity">마지막 활동: ${timeText}</div>
                    </div>
                </div>
                <div class="status-indicator">
                    <span class="status-icon">${config.icon}</span>
                    <span class="status-text">${config.text}</span>
                </div>
            </div>
        `;
    }

    // 상태 새로고침
    async refreshStatus() {
        console.log('🔄 친구 상태 새로고침');
        await this.loadFriendsStatus();
    }
}

// 전역 인스턴스 생성 (기존 코드와 호환)
window.statusManager = new StatusManager(window.storage);