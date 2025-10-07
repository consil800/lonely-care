class InviteCodeManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.myInviteCode = null;
        this.isLoadingFriends = false; // 중복 로드 방지 플래그
        this.init();
    }

    // 초기화
    async init() {
        await this.loadMyInviteCode();
        this.setupEventListeners();
    }

    // 나의 초대코드 로드
    async loadMyInviteCode() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return;

            // 데이터베이스에서 기존 초대코드 조회 (Firebase 호환)
            if (this.storage.isInitialized) {
                const data = await this.storage.getMyInviteCode(currentUser.id);
                const error = null;

                if (data && !error) {
                    this.myInviteCode = data.invite_code;
                } else {
                    // 초대코드가 없으면 새로 생성
                    await this.generateNewInviteCode();
                }
            } else {
                // Supabase 연결이 안 되어 있으면 임시 코드 생성
                this.myInviteCode = this.generateRandomCode();
            }

            this.updateCodeDisplay();

        } catch (error) {
            console.error('초대코드 로드 실패:', error);
            // 오류 발생시 임시 코드 생성
            this.myInviteCode = this.generateRandomCode();
            this.updateCodeDisplay();
        }
    }

    // 새 초대코드 생성 (Firebase 버전)
    async generateNewInviteCode() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다');
            }

            if (!this.storage.isInitialized) {
                throw new Error('데이터베이스에 연결할 수 없습니다');
            }

            console.log('🔄 새 초대코드 생성 중...');
            
            // Firebase에서 새 초대코드 생성
            const data = await this.storage.generateInviteCode(currentUser.id);
            
            if (data && data.invite_code) {
                this.myInviteCode = data.invite_code;
                console.log('✅ 새 초대코드 생성 완료:', this.myInviteCode);
                this.updateCodeDisplay();
                
                if (auth) {
                    auth.showNotification('새 초대코드가 생성되었습니다.');
                }
                
                return this.myInviteCode;
            } else {
                throw new Error('초대코드 생성에 실패했습니다');
            }

        } catch (error) {
            console.error('초대코드 생성 실패:', error);
            if (auth) {
                auth.showNotification('초대코드 생성에 실패했습니다.', 'error');
            }
        }
    }

    // 랜덤 초대코드 생성
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 초대코드 화면 업데이트
    updateCodeDisplay() {
        const codeInput = document.getElementById('my-invite-code');
        if (codeInput && this.myInviteCode) {
            codeInput.value = this.myInviteCode;
        }
    }

    // 초대코드 복사
    async copyInviteCode() {
        try {
            if (!this.myInviteCode) return;

            if (navigator.clipboard) {
                await navigator.clipboard.writeText(this.myInviteCode);
            } else {
                // 구형 브라우저 지원
                const codeInput = document.getElementById('my-invite-code');
                codeInput.select();
                document.execCommand('copy');
            }

            if (auth) {
                auth.showNotification('초대코드가 복사되었습니다!');
            }

        } catch (error) {
            console.error('초대코드 복사 실패:', error);
            if (auth) {
                auth.showNotification('초대코드 복사에 실패했습니다.', 'error');
            }
        }
    }

    // 친구 초대코드로 친구 추가
    async addFriendByCode(inviteCode) {
        try {
            if (!inviteCode || inviteCode.trim().length === 0) {
                throw new Error('초대코드를 입력해주세요.');
            }

            const currentUser = auth.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다.');
            }

            const cleanCode = inviteCode.trim().toUpperCase();

            if (cleanCode === this.myInviteCode) {
                throw new Error('자신의 초대코드는 입력할 수 없습니다.');
            }

            if (!this.storage.isInitialized) {
                throw new Error('데이터베이스에 연결할 수 없습니다.');
            }

            // Firebase에서 초대코드로 사용자 찾기
            console.log('🔍 초대코드로 사용자 검색 중:', cleanCode);
            
            const inviteData = await this.storage.findUserByInviteCode(cleanCode);
            
            if (!inviteData) {
                throw new Error('유효하지 않거나 만료된 초대코드입니다.');
            }
            
            const friendUser = inviteData.user;
            console.log('🔍 초대코드 사용자 찾음:', friendUser.name);
            
            // 이미 친구인지 확인
            console.log('🔍 기존 친구 관계 확인 중...');
            const isAlreadyFriend = await this.storage.checkFriendshipExists(currentUser.id, friendUser.id);
            
            if (isAlreadyFriend) {
                throw new Error('이미 친구로 등록되어 있습니다.');
            }
            
            // 양방향 친구 관계 생성
            const currentTime = firebase.firestore.FieldValue.serverTimestamp();
            
            const friendships = [
                {
                    user_id: currentUser.id,
                    friend_id: friendUser.id,
                    status: 'active',
                    created_at: currentTime
                },
                {
                    user_id: friendUser.id,
                    friend_id: currentUser.id,
                    status: 'active', 
                    created_at: currentTime
                }
            ];
            
            console.log('🔄 친구 관계 생성 중...');
            
            // 배치로 양방향 친구 관계 생성
            for (const friendship of friendships) {
                await this.storage.addFriend(friendship.user_id, friendship.friend_id, friendship.status);
            }
            
            console.log('✅ 친구 관계 생성 완료');
            
            // 성공 처리
            if (auth) {
                auth.showNotification(`${friendUser.name}님이 친구로 추가되었습니다!`);
            }
            
            // 친구 목록 새로고침
            await this.loadCurrentFriends();
            
            // 입력 필드 초기화
            const codeInput = document.getElementById('friend-invite-code');
            if (codeInput) {
                codeInput.value = '';
            }

        } catch (error) {
            console.error('친구 추가 실패:', error);
            if (auth) {
                auth.showNotification(error.message, 'error');
            }
        }
    }

    // 현재 친구 목록 로드
    async loadCurrentFriends(maxRetries = 3, baseDelay = 1000, retryCount = 0) {
        // 중복 로드 방지
        if (this.isLoadingFriends) {
            console.log('⚠️ 친구 목록이 이미 로드 중 - 중복 요청 방지');
            return;
        }
        
        console.log('🔄 친구 목록 로드 시작...');
        this.isLoadingFriends = true; // 로딩 플래그 설정
        
        try {
            // 준비 상태 확인
            if (!this.isReadyForFriendsLoad()) {
                // 무한 루프 방지: 최대 5회 재시도
                if (retryCount >= 5) {
                    console.error('❌ 친구 목록 로드 준비 실패 - 사용자가 로그인되지 않았습니다');
                    console.log('🚪 로그인 화면으로 이동...');
                    
                    // 로그인 화면으로 강제 이동
                    if (auth && typeof auth.showAuthContainer === 'function') {
                        auth.showAuthContainer();
                    }
                    return;
                }
                
                console.log('🚨 invite-code.js 무한루프 방지를 위해 재시도 중단');
                return; // 재시도 중단
            }

            // 친구 목록 로드 시도
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`📊 친구 목록 로드 시도 ${attempt}/${maxRetries}`);
                    await this.doLoadCurrentFriends();
                    console.log('✅ 친구 목록 로드 성공');
                    return; // 성공 시 반복 종료
                    
                } catch (error) {
                    console.error(`❌ 친구 목록 로드 실패 (시도 ${attempt}/${maxRetries}):`, error);
                    
                    if (attempt >= maxRetries) {
                        console.error('💥 친구 목록 로드 최종 실패');
                        this.showFriendsLoadError();
                        return;
                    }
                    
                    // 🚨 긴급 조치: 재시도 대기 중단
                    console.log('🚨 재시도 루프 무한루프 방지를 위해 중단');
                    return;
                }
            }
        } finally {
            // 모든 경우에 플래그 리셋 보장
            this.isLoadingFriends = false;
        }
    }

    // 친구 목록 로드 준비 상태 확인 (Firebase 호환)
    isReadyForFriendsLoad() {
        return auth?.getCurrentUser() && 
               this.storage?.isInitialized && 
               document.getElementById('current-friends-list');
    }

    // 실제 친구 목록 로드 로직
    async doLoadCurrentFriends() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser || !this.storage.isInitialized) {
                throw new Error('사용자 인증 또는 데이터베이스 연결 실패');
            }

            // 먼저 친구 관계만 조회 (Firebase 호환)
            console.log('🔍 친구 관계 조회 중... 사용자 ID:', currentUser.id);
            
            const friendRelations = await this.storage.getFriends(currentUser.id);
            const relError = null;
                
            console.log('🔍 친구 관계 조회 결과:', { friendRelations, relError });

            if (relError) throw relError;

            if (!friendRelations || friendRelations.length === 0) {
                const friendsList = document.getElementById('current-friends-list');
                if (friendsList) {
                    console.log('📭 친구 관계 없음');
                    friendsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">등록된 친구가 없습니다.</p>';
                }
                return;
            }

            // 친구 ID 목록 추출
            const friendIds = friendRelations.map(rel => rel.friend_id);
            
            // Firebase에서 친구들의 실제 사용자 정보 조회
            console.log('🔍 친구들의 사용자 정보 조회 중...');
            
            const friends = [];
            
            for (const rel of friendRelations) {
                try {
                    // 각 친구의 사용자 정보 조회
                    const friendUser = await window.firebaseClient.getUser(rel.friend_id);
                    
                    if (friendUser.data) {
                        // 🚨 생명구조: Firebase 전화번호 데이터 확인 로그
                        console.log(`📞 [Firebase-Invite] ${friendUser.data.name} 전화번호 데이터:`, {
                            phone: friendUser.data.phone,
                            phoneNumber: friendUser.data.phoneNumber,
                            emergency_contact1: friendUser.data.emergency_contact1,
                            emergency_contact2: friendUser.data.emergency_contact2
                        });
                        
                        friends.push({
                            ...rel,
                            friend: {
                                id: friendUser.data.id || rel.friend_id,
                                name: friendUser.data.name || '알 수 없는 사용자',
                                email: friendUser.data.email || '',
                                phone: friendUser.data.phone || '',
                                phoneNumber: friendUser.data.phoneNumber || '',
                                emergency_contact1: friendUser.data.emergency_contact1 || '',
                                emergency_contact2: friendUser.data.emergency_contact2 || '',
                                profile_image: friendUser.data.profile_image || ''
                            }
                        });
                    } else {
                        // 사용자 정보를 찾을 수 없는 경우 기본값 사용
                        friends.push({
                            ...rel,
                            friend: { 
                                id: rel.friend_id, 
                                name: '알 수 없는 사용자', 
                                email: '',
                                phone: '',
                                phoneNumber: '',
                                emergency_contact1: '',
                                emergency_contact2: ''
                            }
                        });
                    }
                } catch (error) {
                    console.warn('친구 정보 조회 실패:', rel.friend_id, error);
                    // 에러 시에도 기본값으로 표시
                    friends.push({
                        ...rel,
                        friend: { 
                            id: rel.friend_id, 
                            name: '친구', 
                            email: '',
                            phone: '',
                            phoneNumber: '',
                            emergency_contact1: '',
                            emergency_contact2: ''
                        }
                    });
                }
            }

            const friendsList = document.getElementById('current-friends-list');
            if (!friendsList) return;

            // 🔧 수정: 데이터 타입 확인 및 안전한 처리
            if (!friends || !Array.isArray(friends) || friends.length === 0) {
                console.log('📭 친구 데이터 없음:', friends);
                friendsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">등록된 친구가 없습니다.</p>';
                return;
            }

            // 🚨 실제 하트비트 데이터 조회 (랜덤값 제거)
            const friendsWithHeartbeat = [];
            
            for (const friendship of friends) {
                const friend = friendship.friend;
                
                try {
                    // 🚨 Firebase 인덱스 오류 해결: 단순 쿼리 + 클라이언트 정렬
                    const heartbeatsResult = await window.firebaseClient.queryDocuments('heartbeats', [
                        ['user_id', '==', friend.id]
                    ]); // 정렬 제거하여 인덱스 오류 방지
                    
                    let lastActivity = null;
                    let heartbeatHours = 0;
                    
                    if (heartbeatsResult.data && heartbeatsResult.data.length > 0) {
                        // 클라이언트 사이드에서 최신 순으로 정렬
                        const sortedHeartbeats = heartbeatsResult.data.sort((a, b) => {
                            const timestampA = new Date(a.timestamp).getTime();
                            const timestampB = new Date(b.timestamp).getTime();
                            return timestampB - timestampA; // 내림차순 (최신 순)
                        });
                        
                        lastActivity = sortedHeartbeats[0].timestamp;
                        
                        // RealTimeStatusManager 사용하여 일관된 시간 계산
                        if (window.realTimeStatusManager) {
                            const timeText = window.realTimeStatusManager.formatTimeDifference(lastActivity);
                            // "X시간 전" 형식에서 숫자만 추출
                            const hoursMatch = timeText.match(/(\d+)시간/);
                            if (hoursMatch) {
                                heartbeatHours = parseInt(hoursMatch[1]);
                            } else if (timeText.includes('분 전')) {
                                heartbeatHours = 0; // 1시간 미만
                            } else if (timeText.includes('일 전')) {
                                const daysMatch = timeText.match(/(\d+)일/);
                                if (daysMatch) {
                                    heartbeatHours = parseInt(daysMatch[1]) * 24;
                                }
                            }
                        } else {
                            // 백업: 직접 계산
                            const now = new Date();
                            const last = new Date(lastActivity);
                            const diffMs = now - last;
                            heartbeatHours = Math.floor(diffMs / (1000 * 60 * 60));
                        }
                    } else {
                        // 하트비트 데이터가 없으면 매우 오래된 것으로 처리
                        heartbeatHours = 999;
                        lastActivity = null;
                    }
                    
                    friendsWithHeartbeat.push({
                        ...friendship,
                        heartbeat_hours: heartbeatHours,
                        last_activity: lastActivity
                    });
                    
                } catch (error) {
                    console.warn(`${friend.name} 하트비트 조회 실패:`, error);
                    // 오류 시 안전한 기본값
                    friendsWithHeartbeat.push({
                        ...friendship,
                        heartbeat_hours: 999,
                        last_activity: null
                    });
                }
            }

            // 🚨 생명구조: 스피너 안전 교체 로직 (충돌 방지)
            const spinnerContainer = document.getElementById('friends-loading-container');
            if (spinnerContainer && !window.friendsSpinnerHandled) {
                console.log('🔄 [Invite-Code] 스피너를 친구 목록으로 안전하게 교체 중...');
                spinnerContainer.style.display = 'none';
                window.friendsSpinnerHandled = true; // 전역 플래그로 중복 방지
            }

            friendsList.innerHTML = friendsWithHeartbeat.map(friendship => {
                const friend = friendship.friend;
                
                // 🚨 생명구조 시스템: 정확한 상태 매핑 적용
                let statusColor = '#28a745'; // 초록색 (안전)
                let statusText = '안전';
                let statusIcon = '🟢';
                
                // 정확한 시간 기준 적용
                if (friendship.heartbeat_hours >= 72) {
                    statusColor = '#dc3545'; // 빨간색 (위험)
                    statusText = '위험';
                    statusIcon = '🔴';
                } else if (friendship.heartbeat_hours >= 48) {
                    statusColor = '#fd7e14'; // 주황색 (경고) ← 2일이면 경고!
                    statusText = '경고';
                    statusIcon = '🟠';
                } else if (friendship.heartbeat_hours >= 24) {
                    statusColor = '#ffc107'; // 노란색 (주의)
                    statusText = '주의';
                    statusIcon = '🟡';
                }
                
                console.log(`🔍 ${friend.name} 상태: ${friendship.heartbeat_hours}시간 → ${statusText}`);
                
                // 🚨 생명구조: 3가지 수정사항 적용된 친구 카드 구조
                return `
                    <div class="friend-status-card ${friendship.alert_level || 'normal'}" data-status="${friendship.alert_level || 'normal'}" style="background: #fff; padding: 15px; border: 2px solid #e9ecef; border-radius: 8px; margin-bottom: 20px; min-height: unset;">
                        <!-- 🚨 수정 1: 헤더 구조 - 안전 배지 옆에 삭제 버튼 배치 -->
                        <div class="friend-status-header">
                            <div class="friend-name">${friend.name}</div>
                            <div class="flex items-center gap-2">
                                <span class="friend-alert-badge" style="color: ${statusColor}; font-weight: bold;">
                                    ${statusIcon} ${statusText}
                                </span>
                                <button onclick="deleteFriendGlobal('${friend.id || 'unknown'}', '${friend.name || '친구'}')" 
                                        class="text-xs text-gray-600 hover:text-red-500 transition-colors"
                                        style="font-size: 12px; color: #6b7280;">
                                    삭제
                                </button>
                            </div>
                        </div>
                        
                        <!-- 🚨 수정 2: 컴팩트한 정보 구조 -->
                        <div class="friend-status-info" style="margin-top: 8px;">
                            <div class="friend-email">✉️ ${friend.email || '이메일 없음'}</div>
                            
                            <!-- 🚨 활동 시간만 표시 (삭제 버튼은 헤더로 이동) -->
                            <div class="friend-time-actions" style="justify-content: flex-start;">
                                <div class="friend-time" data-timestamp="${friendship.last_activity || ''}" data-realtime-update="true">
                                    ${this.getFormattedTime(friendship.last_activity, friendship.heartbeat_hours)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('친구 목록 로드 실패:', error);
            throw error; // 재시도를 위해 에러 다시 던지기
        }
    }

    // 친구 목록 로드 오류 표시
    showFriendsLoadError() {
        const friendsList = document.getElementById('current-friends-list');
        if (friendsList) {
            friendsList.innerHTML = `
                <div style="text-align: center; color: #dc3545; padding: 20px;">
                    <p>🔄 친구 목록을 불러오는데 실패했습니다.</p>
                    <p style="font-size: 14px; color: #666;">네트워크 연결을 확인해주세요.</p>
                    <button class="btn" onclick="inviteCodeManager.loadCurrentFriends()" style="margin-top: 10px;">
                        다시 시도
                    </button>
                </div>
            `;
        }
    }

    // 🚨 실시간 시간 표시 함수 (RealTimeStatusManager 사용)
    getFormattedTime(lastActivity, heartbeatHours) {
        if (!lastActivity || heartbeatHours === 999) {
            return '활동 기록 없음';
        }
        
        // RealTimeStatusManager 사용하여 일관된 시간 표시
        if (window.realTimeStatusManager) {
            return window.realTimeStatusManager.formatTimeDifference(lastActivity);
        }
        
        // 백업: 기본 시간 표시 (프라이버시 보호 포함)
        if (heartbeatHours < 24) {
            // 🚨 프라이버시 보호: 24시간 이내는 "활동중"
            return '활동중';
        } else {
            const days = Math.floor(heartbeatHours / 24);
            if (days === 1) {
                return '1일 전 활동';
            } else if (days === 2) {
                return '2일 전 활동';
            } else if (days === 3) {
                return '3일 전 활동';
            } else {
                return `${days}일 전 활동`;
            }
        }
    }

    // 친구 삭제
    async removeFriend(friendId, friendName) {
        try {
            if (!confirm(`${friendName}님을 친구에서 삭제하시겠습니까?`)) {
                return;
            }

            const currentUser = auth.getCurrentUser();
            if (!currentUser || !this.storage.isInitialized) return;

            // Firebase에서 친구 관계 삭제
            console.log('🔄 친구 관계 삭제 중...');
            
            const success = await this.storage.deleteFriend(currentUser.id, friendId);
            
            if (success) {
                console.log('✅ 친구 관계 삭제 완료');
            } else {
                throw new Error('친구 삭제에 실패했습니다');
            }

            if (auth) {
                auth.showNotification(`${friendName}님이 친구에서 삭제되었습니다.`);
            }

            // 친구 목록 새로고침
            await this.loadCurrentFriends();

        } catch (error) {
            console.error('친구 삭제 실패:', error);
            if (auth) {
                auth.showNotification('친구 삭제에 실패했습니다.', 'error');
            }
        }
    }

    // 이벤트 리스너 설정 (기본 리스너가 이미 있으므로 설정하지 않음)
    setupEventListeners() {
        console.log('🔧 초대코드 매니저 이벤트 리스너 설정 (기본 리스너 사용)');
        
        // 기본 이벤트 리스너가 이미 설정되어 있으므로
        // InviteCodeManager는 이벤트 리스너를 추가로 설정하지 않음
        // 대신 전역 핸들러 함수들이 inviteCodeManager 인스턴스를 확인하여
        // 적절한 메서드를 호출함
        
        console.log('✅ 초대코드 매니저 이벤트 설정 완료 (전역 핸들러 사용)');
    }
}

// 전역 인스턴스
let inviteCodeManager;

// 기본 이벤트 리스너가 이미 설정되었는지 추적
let basicListenersSet = false;

// 기본 이벤트 리스너 설정 (storage 없이도 작동)
function setupBasicEventListeners() {
    if (basicListenersSet) {
        console.log('🔄 기본 이벤트 리스너가 이미 설정되어 있음');
        return;
    }
    
    console.log('🔧 기본 이벤트 리스너 설정 (storage 없이)');
    
    // 초대코드 복사 버튼
    const copyBtn = document.getElementById('copy-code-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', handleCopyCode);
        console.log('✅ 복사 버튼 기본 이벤트 리스너 등록');
    }

    // 새 코드 생성 버튼
    const generateBtn = document.getElementById('generate-code-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateCode);
        console.log('✅ 새 코드 생성 버튼 기본 이벤트 리스너 등록');
    }

    // 친구 추가 버튼
    const addFriendBtn = document.getElementById('add-friend-btn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', handleAddFriend);
        console.log('✅ 친구 추가 버튼 기본 이벤트 리스너 등록');
    }

    // Enter 키로 친구 추가
    const codeInput = document.getElementById('friend-invite-code');
    if (codeInput) {
        codeInput.addEventListener('keypress', handleEnterKey);
        console.log('✅ Enter키 기본 이벤트 리스너 등록');
    }
    
    basicListenersSet = true;
}

// 개별 핸들러 함수들
function handleCopyCode(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (inviteCodeManager) {
        // 매니저가 있으면 매니저의 메서드 사용
        inviteCodeManager.copyInviteCode();
    } else {
        // 매니저가 없으면 기본 복사 기능
        const codeInput = document.getElementById('my-invite-code');
        if (codeInput && codeInput.value) {
            navigator.clipboard.writeText(codeInput.value).then(() => {
                alert('초대코드가 복사되었습니다!');
            }).catch(() => {
                codeInput.select();
                document.execCommand('copy');
                alert('초대코드가 복사되었습니다!');
            });
        } else {
            alert('복사할 초대코드가 없습니다.');
        }
    }
}

function handleGenerateCode(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (inviteCodeManager) {
        // 매니저가 있으면 매니저의 메서드 사용 (데이터베이스 저장)
        inviteCodeManager.generateNewInviteCode();
    } else {
        // 매니저가 없으면 기본 생성 기능 (로컬만)
        const newCode = generateRandomCode();
        const codeInput = document.getElementById('my-invite-code');
        if (codeInput) {
            codeInput.value = newCode;
            alert('새 초대코드가 생성되었습니다: ' + newCode + '\n(데이터베이스 저장 안됨)');
        }
    }
}

function handleAddFriend(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const codeInput = document.getElementById('friend-invite-code');
    if (!codeInput || !codeInput.value.trim()) {
        alert('초대코드를 입력해주세요.');
        return;
    }
    
    if (inviteCodeManager) {
        // 매니저가 있으면 매니저의 메서드 사용
        inviteCodeManager.addFriendByCode(codeInput.value);
    } else {
        // 매니저가 없으면 안내 메시지
        alert('현재 데이터베이스에 연결되지 않아 친구 추가가 불가능합니다.\n페이지를 새로고침하여 다시 시도해주세요.');
    }
}

function handleEnterKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            handleAddFriend(e);
        }
    }
}

// 랜덤 초대코드 생성 함수 (storage 없이도 사용 가능)
function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 초기화 함수 (중복 방지)
window.initializeInviteCodeManager = () => {
    // 중복 초기화 방지
    if (window.__inviteManagerInitialized) {
        console.log('⚠️ 초대코드 매니저가 이미 초기화되어 있음');
        return;
    }
    
    console.log('🚀 초대코드 매니저 초기화 시작');
    console.log('📊 storage 상태:', !!window.storage);
    console.log('📊 global storage 상태:', !!storage);
    
    const storageObject = window.storage || storage;
    
    if (storageObject && (storageObject.isInitialized || window.firebaseStorage)) {
        if (!inviteCodeManager) {
            console.log('📝 InviteCodeManager 인스턴스 생성');
            inviteCodeManager = new InviteCodeManager(storageObject);
            window.inviteCodeManager = inviteCodeManager; // 전역 접근을 위해
            window.__inviteManagerInitialized = true; // 초기화 플래그 설정
            console.log('✅ 초대코드 매니저 초기화 완료');
            
            // 친구 목록 로드
            setTimeout(() => {
                if (inviteCodeManager) {
                    inviteCodeManager.loadCurrentFriends();
                }
            }, 1000);
            
        } else {
            console.log('✅ 초대코드 매니저가 이미 초기화되어 있음');
        }
    } else {
        console.warn('⚠️ storage 또는 Firebase 클라이언트가 준비되지 않음');
        
        // 즉시 기본 이벤트 리스너라도 설정
        setupBasicEventListeners();
    }
};

// DOM 로드 완료 후 로그인 상태 확인 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 로드 완료 - 기본 이벤트 리스너 설정');
    
    // 즉시 기본 이벤트 리스너 설정 (로그인 상태와 관계없이 필요)
    setupBasicEventListeners();
    
    // 초대코드 매니저 초기화는 로그인 상태 확인 후에만
    setTimeout(() => {
        // 로그인 상태 확인
        const savedUser = localStorage.getItem('currentUser');
        const isLoggedIn = savedUser && auth?.getCurrentUser();
        
        if (!isLoggedIn) {
            console.log('⚠️ Invite Code Manager: 로그인 상태가 아니므로 초기화 안함');
            return;
        }
        
        console.log('✅ Invite Code Manager: 로그인 상태 확인됨, 초기화 진행');
        window.initializeInviteCodeManager();
    }, 3000);
});

// 전역 친구 삭제 함수 (HTML에서 호출용)
window.deleteFriendGlobal = async (friendId, friendName) => {
    try {
        if (inviteCodeManager) {
            await inviteCodeManager.removeFriend(friendId, friendName);
        } else {
            console.warn('⚠️ 초대코드 매니저가 초기화되지 않았습니다');
            alert('시스템이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        }
    } catch (error) {
        console.error('전역 친구 삭제 실패:', error);
        alert('친구 삭제에 실패했습니다.');
    }
};