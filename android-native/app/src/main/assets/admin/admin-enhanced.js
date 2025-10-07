class AdminManager {
    constructor() {
        this.currentPage = 'overview';
        this.isLoggedIn = true; // 로컬 환경에서는 항상 로그인 상태
        this.currentUserTab = 'all';
        this.currentAdTab = 'insurance';
        this.currentNotificationTab = 'all';
        this.emergencyContacts = [];
        this.currentUsers = [];
        this.ads = {
            insurance: [],
            funeral: [],
            lawyer: []
        };
        
        // 🚨 Chrome 확장 프로그램 오류 방지
        this.setupErrorHandling();
    }
    
    // Chrome 확장 프로그램 오류 방지 시스템
    setupErrorHandling() {
        // Promise rejection 처리
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message) {
                const message = event.reason.message.toLowerCase();
                if (message.includes('message channel closed') || 
                    message.includes('extension context invalidated') ||
                    message.includes('listener indicated an asynchronous response')) {
                    console.log('🔧 Chrome 확장 프로그램 관련 오류 무시됨:', event.reason.message);
                    event.preventDefault();
                    return false;
                }
            }
        });
        
        // 전역 오류 처리
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('message channel closed')) {
                console.log('🔧 Chrome 확장 프로그램 스크립트 오류 무시됨');
                event.preventDefault();
                return false;
            }
        });
        
        console.log('✅ Chrome 확장 프로그램 오류 방지 시스템 활성화');
    }

    // 초기화
    async init() {
        console.log('AdminManager 초기화 시작');
        
        try {
            // Firebase 연결 상태 확인
            if (window.firebaseDb && window.adminApi) {
                console.log('✅ Firebase 데이터베이스 연결 완료');
                console.log('🔗 Firebase 연결 상태:', {
                    firebaseDb: !!window.firebaseDb,
                    adminApi: !!window.adminApi,
                    collection: typeof window.firebaseDb?.collection === 'function'
                });
            } else {
                console.error('❌ Firebase 데이터베이스 연결 실패 - 로컬 모드로 실행');
                console.log('디버깅 정보:', {
                    firebaseDb: !!window.firebaseDb,
                    adminApi: !!window.adminApi,
                    firebase: !!window.firebase
                });
                
                // Firebase 재초기화 시도
                if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
                    console.log('🔄 Firebase 재연결 시도...');
                    window.firebaseDb = window.firebase.firestore();
                    console.log('🔗 Firebase 재연결 결과:', !!window.firebaseDb);
                }
            }
        } catch (initError) {
            console.warn('⚠️ 초기화 중 오류 발생:', initError.message);
            // 오류가 발생해도 계속 진행
        }

        try {
            this.setupEventListeners();
            
            // 로딩 화면 숨김
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // 전체 데이터 로드 (안전한 처리)
            await this.safeLoadAllData();
            
            // 설정 로드 (안전한 처리)
            await this.safeLoadSettings();
            
            console.log('AdminManager 초기화 완료');
        } catch (finalError) {
            console.error('❌ AdminManager 초기화 최종 오류:', finalError);
            // 최소한의 UI라도 표시
            this.showBasicUI();
        }
        
        // 디버그: 수동 광고 데이터 로딩 함수
        window.debugLoadAds = () => {
            console.log('🔧 수동 광고 데이터 로딩 시작...');
            this.loadAdsData();
        };
        
        window.debugShowAds = () => {
            console.log('🔧 현재 광고 데이터:', this.ads);
            this.displayAds();
        };
        
        // 디버그: Firebase에서 모든 광고 표시
        window.debugShowAllAds = async () => {
            console.log('🔧 Firebase에서 모든 광고를 가져와서 표시...');
            try {
                const snapshot = await window.firebaseDb.collection('adBanners').get();
                const allAds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // 모든 광고를 insurance 카테고리에 강제로 배치
                this.ads.insurance = allAds;
                console.log('Firebase에서 가져온 광고:', allAds);
                this.displayAds();
            } catch (error) {
                console.error('❌ Firebase 광고 조회 실패:', error);
            }
        };
    }

    // 안전한 데이터 로드
    async safeLoadAllData() {
        const operations = [
            { name: 'Overview', fn: () => this.loadOverviewData() },
            { name: 'Users', fn: () => this.loadUsersData() },
            { name: 'Ads', fn: () => this.loadAdsData() },
            { name: 'Emergency Contacts', fn: () => this.loadEmergencyContacts() },
            { name: 'Notifications', fn: () => this.loadNotificationsData() },
            { name: 'Recent Activities', fn: () => this.loadRecentActivities() }
        ];
        
        for (const operation of operations) {
            try {
                await operation.fn();
                console.log(`✅ ${operation.name} 로드 완료`);
            } catch (error) {
                console.warn(`⚠️ ${operation.name} 로드 실패:`, error.message);
                // 개별 오류는 무시하고 계속 진행
            }
        }
    }
    
    // 안전한 설정 로드
    async safeLoadSettings() {
        try {
            await this.loadSettingsData();
            console.log('✅ 설정 데이터 로드 완료');
        } catch (error) {
            console.warn('⚠️ 설정 데이터 로드 실패:', error.message);
        }
        
        try {
            await this.loadNotificationSettings();
            console.log('✅ 알림 설정 로드 완료');
        } catch (error) {
            console.warn('⚠️ 알림 설정 로드 실패:', error.message);
        }
    }
    
    // 기본 UI 표시
    showBasicUI() {
        console.log('🔧 최소 UI 모드 활성화');
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h3>관리자 페이지</h3>
                    <p>일부 기능에 제한이 있을 수 있습니다.</p>
                    <p>페이지를 새로고침해보세요.</p>
                </div>
            `;
            loadingScreen.style.display = 'block';
        }
    }
    
    // 전체 데이터 로드 (기존 호환성 유지)
    async loadAllData() {
        return this.safeLoadAllData();
    }

    // 개요 페이지 데이터 로드 - 실제 Firebase 데이터 직접 조회
    async loadOverviewData() {
        console.log('🔍 개요 페이지 데이터 로딩 시작 - 실제 Firebase 조회');
        
        try {
            // Firebase에서 직접 실제 사용자 수 조회
            console.log('🔥 Firebase 직접 조회 시작...');
            
            if (!window.firebaseDb) {
                console.error('❌ Firebase DB 연결이 없습니다');
                this.showDefaultOverviewData();
                return;
            }

            // 1. 실제 users 컬렉션에서 사용자 수 조회
            console.log('👥 users 컬렉션 조회 중...');
            const usersSnapshot = await window.firebaseDb.collection('users').get();
            const realUserCount = usersSnapshot.size;
            console.log(`✅ 실제 Firebase users 컬렉션 사용자 수: ${realUserCount}`);
            
            // 사용자 데이터 상세 확인
            const userData = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('👤 실제 사용자 데이터 샘플:', userData.slice(0, 3));

            // 2. heartbeats 컬렉션에서 최근 활동 확인
            console.log('💓 heartbeats 컬렉션 조회 중...');
            let activeUsers = 0;
            let warningUsers = 0;
            let emergencyUsers = 0;
            
            try {
                const heartbeatsSnapshot = await window.firebaseDb
                    .collection('heartbeats')
                    .orderBy('timestamp', 'desc')
                    .limit(1000)
                    .get();
                
                console.log(`💓 heartbeats 컬렉션 데이터: ${heartbeatsSnapshot.size}개`);
                
                // 사용자별 최근 활동 시간 집계 (안전한 timestamp 처리)
                const userLastActivity = {};
                heartbeatsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const userId = data.userId;
                    
                    // 안전한 timestamp 변환
                    let timestamp;
                    try {
                        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                            // Firebase Timestamp 객체
                            timestamp = data.timestamp.toDate();
                        } else if (data.timestamp instanceof Date) {
                            // JavaScript Date 객체
                            timestamp = data.timestamp;
                        } else if (data.timestamp) {
                            // 문자열 또는 숫자 timestamp
                            timestamp = new Date(data.timestamp);
                        } else {
                            // timestamp가 없는 경우 현재 시간 사용
                            console.warn('⚠️ heartbeat 문서에 timestamp 없음, 현재 시간 사용:', doc.id);
                            timestamp = new Date();
                        }
                    } catch (error) {
                        console.error('❌ timestamp 변환 실패:', error, 'data:', data);
                        timestamp = new Date(); // fallback to current time
                    }
                    
                    if (!userLastActivity[userId] || timestamp > userLastActivity[userId]) {
                        userLastActivity[userId] = timestamp;
                    }
                });
                
                // 현재 시간 기준으로 상태 분류
                const now = new Date();
                Object.entries(userLastActivity).forEach(([userId, lastActivity]) => {
                    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
                    
                    if (hoursSinceActivity < 24) {
                        activeUsers++;
                    } else if (hoursSinceActivity >= 72) {
                        emergencyUsers++;
                    } else if (hoursSinceActivity >= 24) {
                        warningUsers++;
                    }
                });
                
                console.log('📊 활동 통계:', { activeUsers, warningUsers, emergencyUsers });
                
            } catch (heartbeatError) {
                console.warn('⚠️ heartbeats 컬렉션 조회 실패:', heartbeatError);
                console.warn('🛡️ heartbeat 오류 상세:', {
                    message: heartbeatError.message,
                    code: heartbeatError.code,
                    type: typeof heartbeatError
                });
                // heartbeat 데이터가 없으면 모든 사용자를 활성으로 간주
                activeUsers = realUserCount;
            }

            // 3. notifications 컬렉션에서 알림 수 조회
            console.log('🔔 notificationLogs 컬렉션 조회 중...');
            let totalNotifications = 0;
            try {
                const notificationsSnapshot = await window.firebaseDb
                    .collection('notificationLogs')
                    .limit(1000)
                    .get();
                totalNotifications = notificationsSnapshot.size;
                console.log(`🔔 총 알림 수: ${totalNotifications}`);
            } catch (notificationError) {
                console.warn('⚠️ notificationLogs 조회 실패:', notificationError);
            }

            // 4. friendships 컬렉션에서 친구 관계 수 조회
            console.log('👫 friendships 컬렉션 조회 중...');
            let friendPairs = 0;
            try {
                const friendshipsSnapshot = await window.firebaseDb
                    .collection('friendships')
                    .where('status', '==', 'active')
                    .get();
                friendPairs = Math.floor(friendshipsSnapshot.size / 2); // 양방향 관계이므로 2로 나눔
                console.log(`👫 활성 친구 관계: ${friendPairs}쌍`);
            } catch (friendError) {
                console.warn('⚠️ friendships 조회 실패:', friendError);
            }

            // UI 업데이트
            console.log('🎯 UI 업데이트:', { 
                realUserCount, 
                activeUsers, 
                warningUsers, 
                emergencyUsers, 
                totalNotifications, 
                friendPairs 
            });
            
            // 실제 데이터로 UI 업데이트
            this.updateStatsUI({
                totalUsers: realUserCount,
                activeUsers: activeUsers || realUserCount, // 데이터가 없으면 전체를 활성으로
                warningUsers: warningUsers,
                emergencyUsers: emergencyUsers,
                totalNotifications: totalNotifications,
                friendPairs: friendPairs
            });

            console.log('✅ 실제 Firebase 데이터 로딩 완료');

        } catch (error) {
            console.error('❌ Firebase 직접 조회 실패:', error);
            console.error('오류 세부사항:', error.message, error.stack);
            
            // 완전 실패 시 기본값 표시
            this.showDefaultOverviewData();
        }
    }

    // UI 업데이트 헬퍼 함수
    updateStatsUI(stats) {
        const elements = {
            'total-users': stats.totalUsers || 0,
            'active-users': stats.activeUsers || 0,
            'warning-users': stats.warningUsers || 0,
            'emergency-users': stats.emergencyUsers || 0,
            'total-notifications': stats.totalNotifications || 0,
            'friend-pairs': stats.friendPairs || 0,
            'motion-events': stats.motionEvents || 0,
            'heartbeat-count': stats.heartbeatCount || stats.totalNotifications || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`📊 ${id}: ${value}`);
            } else {
                console.warn(`⚠️ 요소를 찾을 수 없음: ${id}`);
            }
        });
    }

    // 기본 개요 데이터 표시
    showDefaultOverviewData() {
        console.log('⚠️ 기본 데이터 표시 - Firebase 연결 실패');
        const defaultStats = {
            totalUsers: 1, // 현재 관리자 본인
            activeUsers: 1,
            warningUsers: 0,
            emergencyUsers: 0,
            totalNotifications: 0,
            friendPairs: 0,
            motionEvents: 0,
            heartbeatCount: 0
        };
        
        this.updateStatsUI(defaultStats);
        console.log('📊 기본 통계 표시 완료 - 관리자 본인만 표시');
    }

    // 회원 관리 데이터 로드 - Firebase 사용
    async loadUsersData(searchFilters = {}) {
        console.log('회원 데이터 로딩 시작');
        try {
            const container = document.getElementById('users-container');
            
            // Firebase API 확인
            if (!window.adminApi || !window.adminApi.getUsers) {
                console.log('Firebase API 없음, 대기 중...');
                container.innerHTML = '<div class="loading-message">데이터베이스 연결 중...</div>';
                
                // 2초 대기 후 재시도
                setTimeout(() => {
                    this.loadUsersData(searchFilters);
                }, 2000);
                return;
            }

            // Firebase에서 사용자 데이터 가져오기
            console.log('📡 Firebase에서 사용자 데이터 가져오기...');
            const rawUsers = await window.adminApi.getUsers(100); // 최대 100명

            // 중복 제거 (kakao_id 또는 id 기준)
            const uniqueUsers = [];
            const seenIds = new Set();
            
            (rawUsers || []).forEach(user => {
                const uniqueId = user.kakao_id || user.id;
                if (uniqueId && !seenIds.has(uniqueId)) {
                    seenIds.add(uniqueId);
                    uniqueUsers.push(user);
                }
            });

            console.log('✅ 중복 제거 전 사용자 수:', rawUsers?.length || 0);
            console.log('✅ 중복 제거 후 사용자 수:', uniqueUsers.length);

            // 검색 필터 적용 (클라이언트 측)
            let filteredUsers = uniqueUsers;
            if (searchFilters.name) {
                filteredUsers = filteredUsers.filter(user => 
                    user.name?.toLowerCase().includes(searchFilters.name.toLowerCase())
                );
            }
            if (searchFilters.email) {
                filteredUsers = filteredUsers.filter(user => 
                    user.email?.toLowerCase().includes(searchFilters.email.toLowerCase())
                );
            }

            this.currentUsers = filteredUsers;
            this.displayUsersTable(this.currentUsers);

        } catch (error) {
            console.error('회원 데이터 로드 실패:', error);
            const container = document.getElementById('users-container');
            container.innerHTML = `
                <div class="loading-message" style="color: red;">
                    <strong>데이터 로드 실패</strong><br>
                    에러: ${error.message}<br>
                    <button onclick="adminManager.loadUsersData()" style="margin-top: 10px;">다시 시도</button>
                </div>
            `;
        }
    }

    // 회원 테이블 표시 (중복 방지 개선 버전)
    displayUsersTable(users) {
        const container = document.getElementById('users-container');
        
        console.log('📊 displayUsersTable 호출됨, 사용자 수:', users?.length || 0);
        
        // 컨테이너 완전 초기화
        container.innerHTML = '';
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>등록된 회원이 없습니다</h3>
                    <p>데이터베이스에 사용자가 없거나 로딩에 실패했습니다.</p>
                    <button onclick="adminManager.loadUsersData()" style="margin-top: 10px;">새로고침</button>
                </div>
            `;
            return;
        }

        // 탭 필터링 (단순화)
        let filteredUsers = users;
        if (this.currentUserTab === 'active') {
            // 최근 생성된 사용자를 활성으로 간주
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            filteredUsers = users.filter(user => new Date(user.created_at) > oneDayAgo);
        } else if (this.currentUserTab === 'inactive') {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            filteredUsers = users.filter(user => new Date(user.created_at) <= oneDayAgo);
        }

        console.log(`📋 ${this.currentUserTab} 탭에서 필터링된 사용자 수:`, filteredUsers.length);

        container.innerHTML = filteredUsers.map(user => {
            const createdDate = new Date(user.created_at);
            const isRecent = (Date.now() - createdDate.getTime()) < (24 * 60 * 60 * 1000);
            const statusClass = isRecent ? 'active' : 'inactive';
            const statusText = isRecent ? '최근 가입' : '기존 회원';

            return `
                <div class="user-item ${statusClass}" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                    <div class="user-info">
                        <h4 style="margin: 0 0 10px 0; color: #333;">
                            ${user.name || '이름 없음'} 
                            ${user.kakao_id ? `(ID: ${user.kakao_id})` : ''}
                        </h4>
                        <p style="margin: 5px 0;"><strong>이메일:</strong> ${user.email || '이메일 없음'}</p>
                        <p style="margin: 5px 0;"><strong>전화번호:</strong> ${user.phone || '전화번호 없음'}</p>
                        <p style="margin: 5px 0;"><strong>가입일:</strong> ${this.formatDate(user.created_at)}</p>
                        <p style="margin: 5px 0;"><strong>상태:</strong> 
                            <span style="color: ${statusClass === 'active' ? '#28a745' : '#6c757d'}">${statusText}</span>
                        </p>
                        ${user.address ? `<p style="margin: 5px 0;"><strong>주소:</strong> ${user.address}</p>` : ''}
                    </div>
                    <div class="user-actions" style="margin-top: 10px; display: flex; gap: 10px;">
                        <button onclick="adminManager.viewUserDetails('${user.id}')" 
                                style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            상세보기
                        </button>
                        <button onclick="adminManager.deleteUser('${user.id}', '${user.name || '이름없음'}')" 
                                style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ 사용자 테이블 렌더링 완료');
    }

    // 광고 관리 데이터 로드 - Supabase 연동
    async loadAdsData() {
        console.log('🎯 광고 데이터 로딩 시작');
        
        try {
            // Firebase를 사용하여 광고 데이터 로드
            if (window.adminApi && window.adminApi.getAdBanners) {
                console.log('📡 Firebase에서 광고 데이터 가져오기...');
                const ads = await window.adminApi.getAdBanners();
                
                console.log('📊 Firebase 광고 데이터:', ads);

                // 카테고리별로 분류
                this.ads = {
                    insurance: ads?.filter(ad => ad.category === 'insurance') || [],
                    funeral: ads?.filter(ad => ad.category === 'funeral') || [],
                    lawyer: ads?.filter(ad => ad.category === 'lawyer') || []
                };

                console.log('📋 광고 데이터 카테고리별 분류:', {
                    totalAds: ads?.length || 0,
                    insurance: this.ads.insurance.length,
                    funeral: this.ads.funeral.length,
                    lawyer: this.ads.lawyer.length
                });

                this.displayAds();
                console.log('✅ 광고 데이터 로딩 및 표시 완료');
            } else {
                console.warn('⚠️ Firebase API가 없어서 기본 광고 표시');
                this.loadDefaultAds();
            }

        } catch (error) {
            console.error('❌ 광고 데이터 로드 실패:', error);
            console.log('🔄 기본 광고 데이터로 대체...');
            this.loadDefaultAds();
        }
    }

    // 기본 광고 데이터 로드
    loadDefaultAds() {
        this.ads = {
            insurance: [
                {
                    id: 'default-1',
                    title: "생명보험 추천",
                    content: "고객 맞춤형 생명보험으로 가족을 보호하세요.",
                    url: "https://example.com/insurance",
                    button_text: "보험 상담받기",
                    banner_type: "info",
                    priority: 1,
                    target_audience: "all",
                    is_active: true
                }
            ],
            funeral: [
                {
                    id: 'default-2',
                    title: "상조서비스",
                    content: "품격 있는 장례 문화를 위한 종합 상조서비스",
                    url: "https://example.com/funeral",
                    button_text: "상담 신청",
                    banner_type: "info",
                    priority: 1,
                    target_audience: "all",
                    is_active: true
                }
            ],
            lawyer: [
                {
                    id: 'default-3',
                    title: "상속 전문 변호사",
                    content: "복잡한 상속 절차를 전문가가 도와드립니다.",
                    url: "https://example.com/lawyer",
                    button_text: "법률 상담",
                    banner_type: "info",
                    priority: 1,
                    target_audience: "all",
                    is_active: true
                }
            ]
        };
        this.displayAds();
    }

    // 광고 표시
    displayAds() {
        Object.keys(this.ads).forEach(category => {
            const container = document.getElementById(`${category}-ads`);
            const ads = this.ads[category];

            if (!container) return;

            if (!ads || ads.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>등록된 광고가 없습니다</h3><p>새 광고를 추가해보세요.</p></div>';
                return;
            }

            container.innerHTML = ads.map(ad => `
                <div class="ad-item ${ad.is_active ? '' : 'inactive'}">
                    <h4>${ad.title}</h4>
                    <p>${ad.content || ad.description}</p>
                    ${ad.url ? `<p><strong>링크:</strong> <a href="${ad.url}" target="_blank">${ad.url}</a></p>` : ''}
                    ${ad.button_text ? `<p><strong>버튼:</strong> ${ad.button_text}</p>` : ''}
                    <p><strong>타입:</strong> ${ad.banner_type || 'info'}</p>
                    <p><strong>우선순위:</strong> ${ad.priority || 0}</p>
                    <p><strong>상태:</strong> <span class="${(ad.isActive !== undefined ? ad.isActive : ad.is_active) ? 'text-success' : 'text-muted'}">${(ad.isActive !== undefined ? ad.isActive : ad.is_active) ? '활성' : '비활성'}</span></p>
                    <div class="ad-item-actions">
                        <button class="btn-small" onclick="adminManager.editAd('${category}', '${ad.id}')">편집</button>
                        <button class="btn-small danger-btn" onclick="adminManager.deleteAd('${category}', '${ad.id}')">삭제</button>
                        <button class="btn-small ${(ad.isActive !== undefined ? ad.isActive : ad.is_active) ? 'btn-secondary' : 'btn-primary'}" onclick="adminManager.toggleAdStatus('${category}', '${ad.id}', ${ad.isActive !== undefined ? ad.isActive : ad.is_active})">
                            ${(ad.isActive !== undefined ? ad.isActive : ad.is_active) ? '비활성화' : '활성화'}
                        </button>
                    </div>
                </div>
            `).join('');
        });
    }

    // 새 광고 추가 (폼에서 직접)
    async addNewAd() {
        const category = document.getElementById('ad-category').value;
        const title = document.getElementById('ad-title').value;
        const description = document.getElementById('ad-description').value;
        const url = document.getElementById('ad-url').value;
        const buttonText = document.getElementById('ad-button-text').value;
        const bannerType = document.getElementById('ad-banner-type').value;
        const priority = document.getElementById('ad-priority').value;

        if (!title || !description) {
            alert('제목과 설명은 필수 입력 항목입니다.');
            return;
        }

        const colorScheme = document.getElementById('ad-color-scheme').value;
        
        const adData = {
            category: category, // 카테고리 필드 추가
            title: title,
            content: description,
            url: url || null,
            button_text: buttonText || null,
            banner_type: bannerType || 'info',
            priority: parseInt(priority) || 0,
            custom_colors: colorScheme && colorScheme !== 'default' ? colorScheme : null,
            is_active: true,
            target_audience: 'all'
        };

        try {
            // Firebase를 사용하여 광고 추가
            if (window.adminApi && window.adminApi.addAdBanner) {
                console.log('📝 Firebase에 광고 추가 중...');
                
                // Firebase 형식으로 변환
                const firebaseAdData = {
                    category: category,
                    title: title,
                    description: description,
                    url: url || null,
                    buttonText: buttonText || null,
                    bannerType: bannerType || 'info',
                    priority: parseInt(priority) || 0,
                    colorScheme: colorScheme && colorScheme !== 'default' ? colorScheme : null,
                    isActive: true,
                    targetAudience: 'all'
                };
                
                const result = await window.adminApi.addAdBanner(firebaseAdData);
                
                if (!result.success) {
                    throw new Error(result.error || '광고 추가 실패');
                }
                
                console.log('✅ Firebase에 광고 추가 성공:', result.id);
            } else {
                // 로컬 데이터에 추가
                adData.id = 'local-' + Date.now();
                if (!this.ads[category]) this.ads[category] = [];
                this.ads[category].push(adData);
                console.log('💾 로컬에 광고 추가됨');
            }

            // 폼 초기화
            document.getElementById('ad-title').value = '';
            document.getElementById('ad-description').value = '';
            document.getElementById('ad-url').value = '';
            document.getElementById('ad-button-text').value = '';
            document.getElementById('ad-banner-type').value = 'info';
            document.getElementById('ad-priority').value = '0';

            alert('광고가 추가되었습니다.');
            await this.loadAdsData();
            this.showAdTab(category);

        } catch (error) {
            console.error('광고 추가 실패:', error);
            alert('광고 추가에 실패했습니다.');
        }
    }

    // 광고 편집 기능
    editAd(category, adId) {
        console.log('📝 광고 편집 시도:', category, adId);
        
        try {
            let ad = null;
            
            // Supabase 데이터에서 광고 찾기
            if (this.allAdsData && Array.isArray(this.allAdsData)) {
                ad = this.allAdsData.find(a => a.id === adId);
            }
            
            // 로컬 데이터에서 광고 찾기 (백업)
            if (!ad && this.ads && this.ads[category]) {
                ad = this.ads[category].find(a => a.id === adId);
            }
            
            if (!ad) {
                console.error('❌ 광고를 찾을 수 없습니다:', adId);
                alert('편집할 광고를 찾을 수 없습니다.');
                return;
            }
            
            console.log('✅ 편집할 광고 찾음:', ad);
            
            // 편집 폼에 현재 값 채우기
            document.getElementById('ad-category').value = ad.category || category;
            document.getElementById('ad-title').value = ad.title || '';
            document.getElementById('ad-description').value = ad.content || ad.description || '';
            document.getElementById('ad-url').value = ad.url || ad.link || '';
            document.getElementById('ad-button-text').value = ad.button_text || ad.buttonText || '';
            document.getElementById('ad-banner-type').value = ad.banner_type || 'info';
            document.getElementById('ad-priority').value = ad.priority || 0;
            document.getElementById('ad-color-scheme').value = ad.color_scheme || 'default';
            
            // 편집 모드로 전환
            this.editingAdId = adId;
            this.editingAdCategory = category;
            
            // 버튼 텍스트 변경
            const addButton = document.querySelector('button[onclick*="addNewAd"]');
            if (addButton) {
                addButton.textContent = '광고 수정 완료';
                addButton.onclick = () => this.updateAd();
            }
            
            // 폼 상단으로 스크롤
            document.getElementById('ad-category').scrollIntoView({ behavior: 'smooth' });
            
            alert('편집 모드로 전환되었습니다. 수정 후 "광고 수정 완료" 버튼을 클릭하세요.');
            
        } catch (error) {
            console.error('❌ 광고 편집 오류:', error);
            alert('광고 편집 중 오류가 발생했습니다.');
        }
    }

    // 광고 수정 완료
    async updateAd() {
        if (!this.editingAdId) {
            alert('편집 중인 광고가 없습니다.');
            return;
        }
        
        try {
            const category = document.getElementById('ad-category').value;
            const title = document.getElementById('ad-title').value;
            const description = document.getElementById('ad-description').value;
            const url = document.getElementById('ad-url').value;
            const buttonText = document.getElementById('ad-button-text').value;
            const bannerType = document.getElementById('ad-banner-type').value;
            const priority = document.getElementById('ad-priority').value;
            const colorScheme = document.getElementById('ad-color-scheme').value;

            if (!title || !description) {
                alert('제목과 설명은 필수 입력 항목입니다.');
                return;
            }

            // 테이블 스키마에 맞는 필드만 업데이트
            const updateData = {
                title: title,
                content: description,
                url: url || null,
                button_text: buttonText || null,
                banner_type: bannerType || 'info',
                priority: parseInt(priority) || 0,
                updated_at: new Date().toISOString()
            };
            
            // category는 일반적으로 수정하지 않음 (있을 경우에만)
            if (category !== this.editingAdCategory) {
                updateData.category = category;
            }
            
            // 색상 정보를 custom_colors 필드에 저장
            if (colorScheme && colorScheme !== 'default') {
                updateData.custom_colors = colorScheme; // 색상 코드 CSV로 저장
            }

            // Firebase를 사용하여 광고 업데이트
            if (window.firebaseDb) {
                console.log('📤 Firebase 업데이트 시도:', updateData);
                console.log('🎯 광고 ID:', this.editingAdId);
                
                try {
                    // Firebase에 맞는 필드명으로 변환
                    const firebaseUpdateData = {
                        title: updateData.title,
                        description: updateData.content, // content -> description
                        url: updateData.url,
                        buttonText: updateData.button_text, // button_text -> buttonText
                        bannerType: updateData.banner_type, // banner_type -> bannerType
                        priority: updateData.priority,
                        customColors: updateData.custom_colors || null, // custom_colors -> customColors
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    await window.firebaseDb.collection('adBanners')
                        .doc(this.editingAdId)
                        .update(firebaseUpdateData);

                    console.log('✅ Firebase 업데이트 성공');
                    
                } catch (firebaseError) {
                    console.error('❌ Firebase 업데이트 에러:', firebaseError);
                    alert(`데이터베이스 오류: ${firebaseError.message}`);
                    return;
                }
            } else {
                console.warn('⚠️ Firebase 클라이언트가 없어서 로컬에서만 수정');
                // 로컬 데이터 업데이트
                if (this.ads && this.ads[category]) {
                    const adIndex = this.ads[category].findIndex(a => a.id === this.editingAdId);
                    if (adIndex !== -1) {
                        this.ads[category][adIndex] = { ...this.ads[category][adIndex], ...updateData };
                    }
                }
            }

            // 편집 모드 해제
            this.editingAdId = null;
            this.editingAdCategory = null;
            
            // 버튼 원복
            const addButton = document.querySelector('button[onclick*="updateAd"]');
            if (addButton) {
                addButton.textContent = '광고 배너 추가';
                addButton.onclick = () => this.addNewAd();
            }
            
            // 폼 초기화
            document.getElementById('ad-title').value = '';
            document.getElementById('ad-description').value = '';
            document.getElementById('ad-url').value = '';
            document.getElementById('ad-button-text').value = '';
            document.getElementById('ad-banner-type').value = 'info';
            document.getElementById('ad-priority').value = '0';
            document.getElementById('ad-color-scheme').value = 'default';

            alert('광고가 수정되었습니다.');
            await this.loadAdsData();
            this.showAdTab(category);

        } catch (error) {
            console.error('❌ 광고 수정 실패:', error);
            alert('광고 수정에 실패했습니다.');
        }
    }

    // 사용자 정의 색상 적용
    applyCustomColors() {
        const bgColor1 = document.getElementById('ad-bg-color1').value;
        const bgColor2 = document.getElementById('ad-bg-color2').value;
        const accentColor = document.getElementById('ad-accent-color').value;
        
        // 색상 코드를 CSV 형태로 색상 선택 박스에 설정
        const customColorValue = `${bgColor1},${bgColor2},${accentColor}`;
        
        // 새로운 옵션을 select에 추가
        const colorSelect = document.getElementById('ad-color-scheme');
        
        // 기존 사용자 정의 옵션 제거
        const existingCustom = colorSelect.querySelector('option[value*="사용자 정의"]');
        if (existingCustom) {
            existingCustom.remove();
        }
        
        // 새 사용자 정의 옵션 추가
        const customOption = document.createElement('option');
        customOption.value = customColorValue;
        customOption.textContent = `사용자 정의 (${bgColor1}, ${bgColor2}, ${accentColor})`;
        customOption.selected = true;
        colorSelect.appendChild(customOption);
        
        console.log('🎨 사용자 정의 색상 적용:', customColorValue);
        alert('사용자 정의 색상이 적용되었습니다.');
    }

    // 비상 연락처 추가
    async addEmergencyContact() {
        const name = document.getElementById('emergency-name').value;
        const phone = document.getElementById('emergency-phone').value;
        const type = document.getElementById('emergency-type').value;
        const url = document.getElementById('emergency-url').value;

        if (!name || !phone || !type) {
            alert('기관명, 전화번호, 유형은 필수 입력 항목입니다.');
            return;
        }

        const contactData = {
            name: name,
            phone: phone,
            type: type,
            url: url || null,
            is_active: true,
            created_at: new Date().toISOString()
        };

        try {
            // localStorage에 저장 (실제 구현시 데이터베이스에 저장)
            let contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
            contactData.id = 'emergency-' + Date.now();
            contacts.push(contactData);
            localStorage.setItem('emergencyContacts', JSON.stringify(contacts));

            // 폼 초기화
            document.getElementById('emergency-name').value = '';
            document.getElementById('emergency-phone').value = '';
            document.getElementById('emergency-url').value = '';
            document.getElementById('emergency-type').value = 'fire';

            alert('비상 연락처가 추가되었습니다.');
            await this.loadEmergencyContacts();

        } catch (error) {
            console.error('비상 연락처 추가 실패:', error);
            alert('비상 연락처 추가에 실패했습니다.');
        }
    }

    // 비상 연락처 로드
    async loadEmergencyContacts() {
        try {
            // localStorage에서 로드 (실제 구현시 데이터베이스에서 조회)
            const contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
            this.emergencyContacts = contacts;
            
            const container = document.getElementById('emergency-contacts-container');
            
            if (contacts.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>등록된 비상 연락처가 없습니다</h3><p>새 비상 연락처를 추가해보세요.</p></div>';
                return;
            }

            container.innerHTML = contacts.map(contact => {
                const typeNames = {
                    fire: '소방서',
                    police: '경찰서', 
                    admin: '행정기관',
                    medical: '의료기관',
                    other: '기타'
                };

                return `
                    <div class="emergency-item">
                        <div class="emergency-info">
                            <h4>${contact.name}</h4>
                            <p><strong>전화:</strong> ${contact.phone}</p>
                            ${contact.url ? `<p><strong>URL:</strong> <a href="${contact.url}" target="_blank">${contact.url}</a></p>` : ''}
                            <span class="emergency-type">${typeNames[contact.type]}</span>
                        </div>
                        <div class="emergency-actions">
                            <button class="btn-small" onclick="adminManager.editEmergencyContact('${contact.id}')">편집</button>
                            <button class="btn-small danger-btn" onclick="adminManager.deleteEmergencyContact('${contact.id}')">삭제</button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('비상 연락처 로드 실패:', error);
            document.getElementById('emergency-contacts-container').innerHTML = 
                '<div class="loading-message">비상 연락처를 불러올 수 없습니다.</div>';
        }
    }

    // 비상 연락처 삭제
    async deleteEmergencyContact(contactId) {
        if (!confirm('이 비상 연락처를 삭제하시겠습니까?')) return;

        try {
            let contacts = JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
            contacts = contacts.filter(c => c.id !== contactId);
            localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
            
            alert('비상 연락처가 삭제되었습니다.');
            await this.loadEmergencyContacts();

        } catch (error) {
            console.error('비상 연락처 삭제 실패:', error);
            alert('비상 연락처 삭제에 실패했습니다.');
        }
    }

    // 알림 데이터 로드
    async loadNotificationsData() {
        try {
            const container = document.getElementById('notifications-container');
            
            // Firebase API 확인
            if (!window.adminApi || !window.adminApi.getNotifications) {
                container.innerHTML = '<div class="loading-message">데이터베이스에 연결되지 않았습니다.</div>';
                return;
            }

            console.log('📡 Firebase에서 알림 데이터 가져오기...');
            const notifications = await window.adminApi.getNotifications(50);

            // 클라이언트에서 탭별 필터링
            let filteredNotifications = notifications || [];
            
            if (this.currentNotificationTab === 'warning') {
                filteredNotifications = filteredNotifications.filter(n => 
                    n.notificationType === 'heartbeat_warning' || n.type === 'warning'
                );
            } else if (this.currentNotificationTab === 'danger') {
                filteredNotifications = filteredNotifications.filter(n => 
                    n.notificationType === 'emergency_alert' || n.type === 'danger'
                );
            } else if (this.currentNotificationTab === 'emergency') {
                filteredNotifications = filteredNotifications.filter(n => 
                    n.notificationType === 'emergency_alert' || n.type === 'emergency'
                );
            } else if (this.currentNotificationTab === 'recent') {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                filteredNotifications = filteredNotifications.filter(n => {
                    const createdAt = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
                    return createdAt > yesterday;
                });
            }

            if (filteredNotifications.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>알림이 없습니다</h3><p>조건에 맞는 알림이 없습니다.</p></div>';
                return;
            }

            container.innerHTML = filteredNotifications.map(notification => `
                <div class="notification-item ${notification.type || 'info'}">
                    <div class="notification-content">
                        <h4>사용자 ID: ${notification.userId || notification.user_id || '-'}</h4>
                        <p>${notification.message || '알림 내용 없음'}</p>
                        <div class="notification-time">${this.formatDate(notification.createdAt || notification.created_at)}</div>
                    </div>
                    <div class="notification-actions">
                        <button class="btn-small danger-btn" onclick="adminManager.deleteAlert('${notification.id}')">삭제</button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('알림 데이터 로드 실패:', error);
            document.getElementById('notifications-container').innerHTML = 
                '<div class="loading-message">알림을 불러올 수 없습니다.</div>';
        }
    }

    // 시스템 알림 발송
    async sendSystemNotification() {
        const message = document.getElementById('system-message').value;
        const type = document.getElementById('system-notification-type').value;

        if (!message.trim()) {
            alert('시스템 메시지를 입력해주세요.');
            return;
        }

        if (!confirm('모든 사용자에게 알림을 발송하시겠습니까?')) return;

        let users = null; // 함수 시작 부분에서 미리 선언
        let successCount = 0; // 성공 카운트 변수도 미리 선언
        let errorCount = 0; // 실패 카운트 변수도 미리 선언
        
        try {
            if (this.supabaseClient?.client) {
                // 먼저 notifications 테이블 스키마 확인을 위한 테스트 쿼리
                try {
                    const { data: schemaTest, error: schemaError } = await this.supabaseClient.client
                        .from('notifications')
                        .select('*')
                        .limit(1);
                    
                    if (schemaTest && schemaTest.length > 0) {
                        console.log('📝 notifications 테이블 스키마:', Object.keys(schemaTest[0]));
                        console.log('📋 첫 번째 레코드 예시:', schemaTest[0]);
                    } else {
                        console.log('📝 notifications 테이블이 비어있음');
                        // 테이블이 비어있어도 컬럼 정보를 얻기 위해 더미 데이터로 시도
                        console.log('🔍 notification_type 허용 값 탐지를 위해 다양한 값 시도...');
                    }
                } catch (schemaErr) {
                    console.log('📝 스키마 확인 실패:', schemaErr.message);
                }
                
                // 사용자 목록 조회
                const { data: usersData, error: usersError } = await this.supabaseClient.client
                    .from('users')
                    .select('id');

                if (usersError) throw usersError;
                
                users = usersData; // 외부에서 선언한 변수에 할당
                
                console.log(`📤 ${users.length}명의 사용자에게 알림 발송 시작...`);

                // supabase-client.js의 createNotification 함수 사용
                // successCount와 errorCount는 이미 함수 시작 부분에서 선언됨

                for (const user of users) {
                    try {
                        // 정확한 스키마 사용 (notification_type이 실제 컬럼명)
                        const { data, error } = await this.supabaseClient.client
                            .from('notifications')
                            .insert([{
                                user_id: user.id,
                                title: '🔔 시스템 알림',
                                message: message,
                                notification_type: 'system_message', // 실제 컬럼명은 'notification_type'
                                priority: 'normal', // priority 컬럼 추가
                                is_read: false,
                                created_at: new Date().toISOString()
                            }])
                            .select();
                        
                        // 데이터베이스에 저장만 하면 앱에서 5초마다 폴링하여 알림 표시
                        
                        if (error) throw error;
                        console.log(`✅ 사용자 ${user.id} 알림 성공`);
                        successCount++;
                    } catch (error) {
                        console.error(`❌ 사용자 ${user.id} 알림 실패:`, error.message);
                        
                        // 점진적으로 컬럼 제거하며 재시도
                        if (error.message.includes('not-null constraint') || error.message.includes('violates') || error.message.includes('schema cache')) {
                            // 정확한 스키마 기반으로 재시도 (notification_type과 priority 컬럼 사용)
                            const retryAttempts = [
                                // 시도 1: 다른 notification_type 값들
                                {
                                    user_id: user.id,
                                    title: '시스템 알림',  
                                    message: message,
                                    notification_type: 'friend_inactive',
                                    priority: 'high',
                                    is_read: false
                                },
                                // 시도 2: priority 값 변경
                                {
                                    user_id: user.id,
                                    title: '시스템 알림',
                                    message: message, 
                                    notification_type: 'emergency_alert',
                                    priority: 'urgent',
                                    is_read: false
                                },
                                // 시도 3: heartbeat_warning으로
                                {
                                    user_id: user.id,
                                    title: '시스템 알림',
                                    message: message,
                                    notification_type: 'heartbeat_warning', 
                                    priority: 'medium',
                                    is_read: false
                                },
                                // 시도 4: priority 없이 (기본값 사용)
                                {
                                    user_id: user.id,
                                    title: '시스템 알림',
                                    message: message,
                                    notification_type: 'system_message',
                                    is_read: false
                                }
                            ];
                            
                            let retrySuccess = false;
                            for (let i = 0; i < retryAttempts.length; i++) {
                                try {
                                    console.log(`🔄 사용자 ${user.id} 재시도 ${i + 1}/${retryAttempts.length}...`);
                                    const { data, error: retryError } = await this.supabaseClient.client
                                        .from('notifications')
                                        .insert([retryAttempts[i]])
                                        .select();
                                    
                                    if (retryError) throw retryError;
                                    console.log(`✅ 사용자 ${user.id} 재시도 ${i + 1} 성공!`);
                                    successCount++;
                                    retrySuccess = true;
                                    break;
                                } catch (retryError) {
                                    console.log(`❌ 재시도 ${i + 1} 실패:`, retryError.message);
                                    if (i === retryAttempts.length - 1) {
                                        console.error(`❌ 사용자 ${user.id} 모든 재시도 실패:`, retryError.message);
                                        errorCount++;
                                    }
                                }
                            }
                            
                            if (!retrySuccess) {
                                console.error(`❌ 사용자 ${user.id}: 모든 재시도 실패`);
                                errorCount++;
                            }
                        } else {
                            errorCount++;
                        }
                    }
                }

                console.log(`📊 알림 전송 결과: 성공 ${successCount}건, 실패 ${errorCount}건`);

                if (successCount === 0) {
                    throw new Error(`모든 알림 전송 실패 (${errorCount}건)`);
                }
            }

            // 폼 초기화
            document.getElementById('system-message').value = '';
            document.getElementById('system-notification-type').value = 'info';

            const userCount = users?.length || 0;
            alert(`시스템 알림이 전송되었습니다.\n대상: 전체 사용자 (${userCount}명)\n성공: ${successCount || 0}건, 실패: ${errorCount || 0}건`);
            await this.loadNotificationsData();
            await this.loadOverviewData(); // 통계 업데이트

        } catch (error) {
            console.error('시스템 알림 발송 실패:', error);
            alert('시스템 알림 발송에 실패했습니다.');
        }
    }

    // 최근 활동 로드 (Firebase 기반)
    async loadRecentActivities() {
        try {
            const container = document.getElementById('recent-activities');
            console.log('📈 최근 활동 로딩 시작');
            
            let realActivities = [];
            
            // Firebase를 사용한 간단한 활동 표시
            if (window.adminApi) {
                try {
                    // 최근 사용자 활동
                    const users = await window.adminApi.getUsers(10);
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    
                    users.forEach(user => {
                        const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                        if (createdAt > yesterday) {
                            realActivities.push({
                                type: 'user_registration',
                                message: `${user.name || '새 사용자'}님이 회원가입했습니다`,
                                time: user.createdAt
                            });
                        }
                    });
                    
                    // 최근 알림
                    const notifications = await window.adminApi.getNotifications(10);
                    notifications.forEach(notif => {
                        const createdAt = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);
                        if (createdAt > yesterday) {
                            realActivities.push({
                                type: 'system_notification',
                                message: `알림 발송: ${notif.message?.substring(0, 30) || '알림'}...`,
                                time: notif.createdAt
                            });
                        }
                    });
                    
                    // 최근 사용자 상태
                    const statuses = await window.adminApi.getUserStatuses();
                    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                    
                    statuses.forEach(status => {
                        const updatedAt = status.updatedAt?.toDate ? status.updatedAt.toDate() : new Date(status.updatedAt);
                        if (updatedAt > oneHourAgo) {
                            realActivities.push({
                                type: 'heartbeat_activity',
                                message: `사용자 상태 업데이트 (${status.status || '정상'})`,
                                time: status.updatedAt
                            });
                        }
                    });
                    
                } catch (dbError) {
                    console.log('Firebase 조회 중 일부 실패:', dbError);
                }
            }

            // 시간순으로 정렬
            realActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
            
            // 최대 10개 항목만 표시
            realActivities = realActivities.slice(0, 10);

            if (realActivities.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>최근 24시간 내 활동이 없습니다</h3>
                        <p>사용자 활동, 응급신고, 알림 등의 기록이 표시됩니다.</p>
                    </div>
                `;
                return;
            }

            const typeNames = {
                'user_registration': '회원 가입',
                'emergency_report': '응급 신고', 
                'system_notification': '시스템 알림',
                'heartbeat_activity': '하트비트'
            };

            container.innerHTML = realActivities.map(activity => `
                <div class="notification-item">
                    <div class="notification-content">
                        <h4>${typeNames[activity.type] || activity.type.toUpperCase()}</h4>
                        <p>${activity.message}</p>
                        <div class="notification-time">${this.formatDate(activity.time)}</div>
                    </div>
                </div>
            `).join('');

            console.log('✅ 최근 활동 로딩 완료:', realActivities.length, '개 항목');

        } catch (error) {
            console.error('최근 활동 로드 실패:', error);
            document.getElementById('recent-activities').innerHTML = 
                '<div class="loading-message">최근 활동을 불러올 수 없습니다.</div>';
        }
    }

    // 설정 데이터 로드
    async loadSettingsData() {
        console.log('설정 데이터 로딩');
        try {
            // 현재 설정 로드 (localStorage 기반)
            const settings = JSON.parse(localStorage.getItem('adminSystemSettings') || '{}');

            // UI에 설정 값 반영 (기본값 설정)
            document.getElementById('warning-24h').checked = settings.warning24h !== false;
            document.getElementById('warning-48h').checked = settings.warning48h !== false;
            document.getElementById('emergency-72h').checked = settings.emergency72h !== false;
            
            console.log('설정 로드 완료:', settings);
        } catch (error) {
            console.error('설정 로드 실패:', error);
        }
    }

    // 모든 설정 저장
    async saveAllSettings() {
        try {
            const settings = {
                warning24h: document.getElementById('warning-24h').checked,
                warning48h: document.getElementById('warning-48h').checked,
                emergency72h: document.getElementById('emergency-72h').checked
            };

            localStorage.setItem('adminSystemSettings', JSON.stringify(settings));
            alert('모든 설정이 저장되었습니다.');

        } catch (error) {
            console.error('설정 저장 실패:', error);
            alert('설정 저장에 실패했습니다.');
        }
    }

    // 탭 관련 메서드들
    showUserTab(tabType) {
        console.log(`사용자 탭 변경: ${tabType}`);
        this.currentUserTab = tabType;
        
        // 탭 버튼 업데이트
        document.querySelectorAll('.section:nth-child(2) .tabs .tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[onclick="adminManager.showUserTab('${tabType}')"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.displayUsersTable(this.currentUsers || []);
    }

    showAdTab(category) {
        console.log(`광고 탭 변경: ${category}`);
        this.currentAdTab = category;
        
        // 모든 광고 리스트 숨기기
        document.querySelectorAll('.ads-list').forEach(list => {
            list.classList.add('hidden');
        });
        
        // 선택된 카테고리 광고 표시
        const targetList = document.getElementById(`${category}-ads`);
        if (targetList) {
            targetList.classList.remove('hidden');
        }

        // 탭 버튼 업데이트
        document.querySelectorAll('.ads-management .tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[onclick="adminManager.showAdTab('${category}')"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    showNotificationTab(tabType) {
        console.log(`알림 탭 변경: ${tabType}`);
        this.currentNotificationTab = tabType;
        
        // 탭 버튼 업데이트
        document.querySelectorAll('.section:nth-child(5) .tabs .tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[onclick="adminManager.showNotificationTab('${tabType}')"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.loadNotificationsData();
    }

    // 사용자 검색
    async searchUsers() {
        const name = document.getElementById('user-search-name').value;
        const email = document.getElementById('user-search-email').value;
        const status = document.getElementById('user-search-status').value;

        console.log('사용자 검색:', { name, email, status });
        await this.loadUsersData({ name, email, status });
    }

    // 사용자 검색 초기화
    async resetUserSearch() {
        document.getElementById('user-search-name').value = '';
        document.getElementById('user-search-email').value = '';
        document.getElementById('user-search-status').value = '';
        
        await this.loadUsersData();
    }

    // 사용자 상세보기 (Firebase 버전)
    async viewUserDetails(userId) {
        try {
            console.log('🔍 사용자 상세 조회 시작, userId:', userId);
            
            if (!window.firebaseDb) {
                alert('데이터베이스에 연결되지 않았습니다.');
                return;
            }

            // 기본 사용자 정보 조회
            const userDoc = await window.firebaseDb.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                throw new Error('사용자를 찾을 수 없습니다.');
            }
            
            const user = { id: userDoc.id, ...userDoc.data() };
            console.log('✅ 사용자 정보 조회 성공:', user);

            // 친구 수 별도 조회
            let friendCount = 0;
            try {
                const friendsSnapshot = await window.firebaseDb.collection('friends')
                    .where('userId', '==', userId)
                    .get();
                friendCount = friendsSnapshot.size;
            } catch (friendsErr) {
                console.log('친구 수 조회 실패:', friendsErr);
            }

            // 사용자 상태 별도 조회
            let lastActivity = '알 수 없음';
            try {
                const statusSnapshot = await window.firebaseDb.collection('userStatus')
                    .where('userId', '==', userId)
                    .orderBy('updatedAt', 'desc')
                    .limit(1)
                    .get();
                
                if (!statusSnapshot.empty) {
                    const status = statusSnapshot.docs[0].data();
                    lastActivity = this.formatDate(status.lastActive || status.lastReportTime);
                }
            } catch (statusErr) {
                console.log('상태 조회 실패:', statusErr);
            }

            // 상세 정보 문자열 생성
            let details = `📋 사용자 상세 정보\n`;
            details += `\n🆔 사용자 ID: ${user.id}\n`;
            details += `📱 카카오 ID: ${user.kakaoId || user.kakao_id || '없음'}\n`;
            details += `👤 이름: ${user.name || '없음'}\n`;
            details += `📧 이메일: ${user.email || '없음'}\n`;
            details += `📞 전화번호: ${user.phone || '없음'}\n`;
            details += `🏠 주소: ${user.address || '없음'}`;
            if (user.detailAddress || user.detail_address) {
                details += ` ${user.detailAddress || user.detail_address}`;
            }
            details += `\n📅 가입일: ${this.formatDate(user.createdAt || user.created_at)}\n`;
            details += `⏰ 마지막 활동: ${lastActivity}\n`;
            details += `👥 친구 수: ${friendCount}명\n`;
            
            if (user.bloodType || user.blood_type) {
                details += `🩸 혈액형: ${user.bloodType || user.blood_type}\n`;
            }
            if (user.medicalConditions || user.medical_conditions) {
                details += `💊 지병/복용약물: ${user.medicalConditions || user.medical_conditions}\n`;
            }
            if (user.emergencyContact1 || user.emergency_contact1) {
                details += `🚨 비상연락처: ${user.emergencyContact1 || user.emergency_contact1}`;
                if (user.emergencyName1 || user.emergency_name1) {
                    details += ` (${user.emergencyName1 || user.emergency_name1})`;
                }
                details += `\n`;
            }

            alert(details);

        } catch (error) {
            console.error('사용자 상세 정보 로드 실패:', error);
            alert(`사용자 정보를 불러올 수 없습니다.\n\n에러: ${error.message || '알 수 없는 오류'}`);
        }
    }

    // 사용자 삭제
    async deleteUser(userId, userName) {
        try {
            // 확인 대화상자
            const confirmMessage = `정말로 '${userName}' 사용자를 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없습니다.\n- 사용자의 모든 데이터가 삭제됩니다\n- 친구 관계, 초대코드, 알림 등 모든 연관 데이터도 함께 삭제됩니다`;
            
            if (!confirm(confirmMessage)) {
                return;
            }

            // 추가 확인
            const doubleConfirm = prompt(`확인을 위해 사용자 이름 '${userName}'을(를) 정확히 입력해주세요:`);
            if (doubleConfirm !== userName) {
                alert('사용자 이름이 일치하지 않습니다. 삭제가 취소되었습니다.');
                return;
            }

            console.log('🗑️ 사용자 삭제 시작:', { userId, userName });

            if (!window.firebaseDb) {
                alert('데이터베이스에 연결되지 않았습니다.');
                return;
            }

            // Firebase에서 관련 데이터 모두 삭제
            const batch = window.firebaseDb.batch();

            // 1. 사용자 문서 삭제
            const userRef = window.firebaseDb.collection('users').doc(userId);
            batch.delete(userRef);

            // 2. 친구 관계 삭제 (사용자가 추가한 친구들)
            const friendsQuery = await window.firebaseDb.collection('friends')
                .where('userId', '==', userId).get();
            friendsQuery.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 3. 친구 관계 삭제 (다른 사용자가 이 사용자를 친구로 추가한 경우)
            const friendOfQuery = await window.firebaseDb.collection('friends')
                .where('friendId', '==', userId).get();
            friendOfQuery.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 4. 사용자 상태 삭제
            const userStatusRef = window.firebaseDb.collection('userStatus').doc(userId);
            batch.delete(userStatusRef);

            // 5. 초대코드 삭제
            const inviteQuery = await window.firebaseDb.collection('inviteCodes')
                .where('userId', '==', userId).get();
            inviteQuery.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 6. 알림 삭제
            const notificationsQuery = await window.firebaseDb.collection('notifications')
                .where('userId', '==', userId).get();
            notificationsQuery.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 배치 실행
            await batch.commit();

            console.log('✅ 사용자 및 관련 데이터 삭제 완료');
            alert(`'${userName}' 사용자가 완전히 삭제되었습니다.`);

            // 사용자 목록 새로고침
            await this.loadUsersData();

        } catch (error) {
            console.error('❌ 사용자 삭제 실패:', error);
            alert(`사용자 삭제에 실패했습니다.\n\n에러: ${error.message || '알 수 없는 오류'}`);
        }
    }

    async deleteAlert(alertId) {
        if (!confirm('이 알림을 삭제하시겠습니까?')) return;

        try {
            if (!window.firebaseDb) {
                alert('데이터베이스에 연결되지 않았습니다.');
                return;
            }

            await window.firebaseDb.collection('notifications').doc(alertId).delete();

            alert('알림이 삭제되었습니다.');
            await this.loadNotificationsData();

        } catch (error) {
            console.error('알림 삭제 실패:', error);
            alert('알림 삭제에 실패했습니다.');
        }
    }

    async deleteAd(category, adId) {
        if (!confirm('이 광고를 삭제하시겠습니까?')) return;

        try {
            // Firebase를 사용하여 광고 삭제
            if (window.adminApi && window.adminApi.deleteAdBanner) {
                console.log('🗑️ Firebase에서 광고 삭제 중...', adId);
                const result = await window.adminApi.deleteAdBanner(adId);
                
                if (!result.success) {
                    throw new Error(result.error || '광고 삭제 실패');
                }
                
                console.log('✅ Firebase에서 광고 삭제 성공');
                alert('광고가 삭제되었습니다.');
                await this.loadAdsData();
            } else {
                // 로컬 데이터에서 삭제
                this.ads[category] = this.ads[category].filter(a => a.id !== adId);
                this.displayAds();
                console.log('💾 로컬에서 광고 삭제됨');
            }

        } catch (error) {
            console.error('광고 삭제 실패:', error);
            alert('광고 삭제에 실패했습니다.');
        }
    }

    async toggleAdStatus(category, adId, currentStatus) {
        try {
            console.log('🔄 광고 상태 토글 시작:', { category, adId, currentStatus });
            
            // Firebase를 사용하여 광고 상태 토글
            if (window.adminApi && window.adminApi.toggleAdBannerStatus) {
                console.log('🔄 Firebase에서 광고 상태 변경 중...', adId, !currentStatus);
                const result = await window.adminApi.toggleAdBannerStatus(adId, !currentStatus);
                
                if (!result.success) {
                    throw new Error(result.error || '상태 변경 실패');
                }
                
                console.log('✅ Firebase에서 광고 상태 변경 성공');
                
                // 즉시 로컬 데이터 업데이트 (UI 즉시 반영)
                if (this.ads[category]) {
                    const ad = this.ads[category].find(a => a.id === adId);
                    if (ad) {
                        ad.isActive = !currentStatus;
                        ad.is_active = !currentStatus; // 양쪽 형식 지원
                        console.log('💾 로컬 데이터 상태 업데이트:', ad);
                    }
                }
                
                // UI 즉시 업데이트
                this.displayAds();
                
                // 대기 후 데이터 재로드
                setTimeout(() => {
                    this.loadAdsData();
                }, 500);
                
            } else {
                // 로컬 데이터에서 상태 변경
                const ad = this.ads[category]?.find(a => a.id === adId);
                if (ad) {
                    ad.isActive = !currentStatus;
                    ad.is_active = !currentStatus;
                    this.displayAds();
                }
                console.log('💾 로컬에서 광고 상태 변경됨');
            }

            const statusText = currentStatus ? '비활성화' : '활성화';
            alert(`광고가 ${statusText}되었습니다.`);
            console.log('✅ 광고 상태 토글 완료:', statusText);

        } catch (error) {
            console.error('❌ 광고 상태 변경 실패:', error);
            alert('광고 상태 변경에 실패했습니다: ' + error.message);
        }
    }

    // 데이터 내보내기 메서드들
    async exportAllData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                users: [],
                notifications: [],
                ads: this.ads,
                emergencyContacts: this.emergencyContacts
            };

            if (window.firebaseDb) {
                const usersSnapshot = await window.firebaseDb.collection('users').get();
                const notificationsSnapshot = await window.firebaseDb.collection('notifications').get();
                
                exportData.users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                exportData.notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            const dataStr = JSON.stringify(exportData, null, 2);
            this.downloadFile(dataStr, `lonely-care-backup-${new Date().toISOString().split('T')[0]}.json`);

            alert('데이터 내보내기가 완료되었습니다.');

        } catch (error) {
            console.error('데이터 내보내기 실패:', error);
            alert('데이터 내보내기에 실패했습니다.');
        }
    }

    async exportUsersData() {
        try {
            let users = [];
            if (this.supabaseClient?.client) {
                const { data } = await this.supabaseClient.client.from('users').select('*');
                users = data || [];
            }
            
            const dataStr = JSON.stringify({ users, timestamp: new Date().toISOString() }, null, 2);
            this.downloadFile(dataStr, `lonely-care-users-${new Date().toISOString().split('T')[0]}.json`);
            
        } catch (error) {
            console.error('회원 데이터 내보내기 실패:', error);
            alert('회원 데이터 내보내기에 실패했습니다.');
        }
    }

    async exportNotificationsData() {
        try {
            let notifications = [];
            if (window.firebaseDb) {
                const snapshot = await window.firebaseDb.collection('notifications').get();
                notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            
            const dataStr = JSON.stringify({ notifications, timestamp: new Date().toISOString() }, null, 2);
            this.downloadFile(dataStr, `lonely-care-notifications-${new Date().toISOString().split('T')[0]}.json`);
            
        } catch (error) {
            console.error('알림 데이터 내보내기 실패:', error);
            alert('알림 데이터 내보내기에 실패했습니다.');
        }
    }

    async clearOldData() {
        if (!confirm('30일 이상 오래된 데이터를 정리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        try {
            if (window.firebaseDb) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                // Firebase는 직접적인 삭제 연산을 지원하지 않으므로 개별 삭제 필요
                const snapshot = await window.firebaseDb.collection('notifications')
                    .where('createdAt', '<', thirtyDaysAgo)
                    .get();
                    
                const batch = window.firebaseDb.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                console.log(`${snapshot.size}개의 오래된 알림이 삭제되었습니다.`);
            }

            alert('오래된 데이터가 정리되었습니다.');
            await this.loadOverviewData();
            
        } catch (error) {
            console.error('데이터 정리 실패:', error);
            alert('데이터 정리에 실패했습니다.');
        }
    }

    // 유틸리티 메서드들
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    formatDate(dateString) {
        if (!dateString) return '알 수 없음';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '알 수 없음';
        }
    }

    setupEventListeners() {
        console.log('이벤트 리스너 설정 시작');
        // 기본 이벤트 리스너만 설정 (기존 코드에서 복사)
        console.log('이벤트 리스너 설정 완료');
    }

    // 알림 시간 설정 관련 메서드들
    async loadNotificationSettings() {
        try {
            // Firebase API 사용
            if (window.adminApi && window.adminApi.getNotificationSettings) {
                console.log('📡 Firebase에서 알림 설정 가져오기...');
                const settings = await window.adminApi.getNotificationSettings();
                
                if (settings) {
                    document.getElementById('warning-time').value = settings.warningMinutes || 1440;
                    document.getElementById('danger-time').value = settings.dangerMinutes || 2880;
                    document.getElementById('emergency-time').value = settings.emergencyMinutes || 4320;
                    this.updateCurrentSettingsDisplay({
                        warning_minutes: settings.warningMinutes,
                        danger_minutes: settings.dangerMinutes,
                        emergency_minutes: settings.emergencyMinutes,
                        updated_at: settings.updatedAt
                    });
                }
            } else {
                // 로컬 저장소에서 설정 로드
                this.loadLocalNotificationSettings();
            }
        } catch (error) {
            console.log('알림 설정 로드 실패:', error);
            // 로컬 저장소에서 설정 로드
            this.loadLocalNotificationSettings();
        }
    }

    loadLocalNotificationSettings() {
        const settings = JSON.parse(localStorage.getItem('admin-notification-settings') || '{}');
        document.getElementById('warning-time').value = settings.warning_minutes || 1440;
        document.getElementById('danger-time').value = settings.danger_minutes || 2880;
        document.getElementById('emergency-time').value = settings.emergency_minutes || 4320;
        this.updateCurrentSettingsDisplay(settings);
    }

    async saveNotificationSettings() {
        const warningTime = parseInt(document.getElementById('warning-time').value) || 1440;
        const dangerTime = parseInt(document.getElementById('danger-time').value) || 2880;
        const emergencyTime = parseInt(document.getElementById('emergency-time').value) || 4320;
        
        // 유효성 검사
        if (warningTime >= dangerTime || dangerTime >= emergencyTime) {
            alert('경고: 주의 < 위험 < 응급 순서로 시간을 설정해주세요.');
            return;
        }

        const settings = {
            warningMinutes: warningTime,
            dangerMinutes: dangerTime,
            emergencyMinutes: emergencyTime,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (window.adminApi && window.adminApi.saveNotificationSettings) {
                const result = await window.adminApi.saveNotificationSettings(settings);
                if (result.success) {
                    console.log('✅ 알림 설정이 Firebase에 저장되었습니다.');
                } else {
                    throw new Error(result.error || '저장 실패');
                }
                
                // 로컬 저장소에도 백업
                localStorage.setItem('admin-notification-settings', JSON.stringify({
                    warning_minutes: warningTime,
                    danger_minutes: dangerTime,
                    emergency_minutes: emergencyTime,
                    updated_at: new Date().toISOString()
                }));
            } else {
                throw new Error('Firebase API 연결 없음');
            }
        } catch (error) {
            console.log('Firebase 저장 실패, 로컬 저장소만 사용:', error);
            localStorage.setItem('admin-notification-settings', JSON.stringify({
                warning_minutes: warningTime,
                danger_minutes: dangerTime,
                emergency_minutes: emergencyTime,
                updated_at: new Date().toISOString()
            }));
        }

        this.updateCurrentSettingsDisplay({
            warning_minutes: warningTime,
            danger_minutes: dangerTime,
            emergency_minutes: emergencyTime,
            updated_at: new Date().toISOString()
        });
        alert('✅ 알림 시간 설정이 저장되었습니다.');
    }

    resetToDefaults() {
        document.getElementById('warning-time').value = 1440;
        document.getElementById('danger-time').value = 2880;
        document.getElementById('emergency-time').value = 4320;
    }

    testNotificationSettings() {
        document.getElementById('warning-time').value = 1;
        document.getElementById('danger-time').value = 2;
        document.getElementById('emergency-time').value = 3;
        alert('테스트 설정이 적용되었습니다.\n주의: 1분, 위험: 2분, 응급: 3분');
    }

    quickTestSettings() {
        document.getElementById('warning-time').value = 5;
        document.getElementById('danger-time').value = 10;
        document.getElementById('emergency-time').value = 20;
        alert('빠른 테스트 설정이 적용되었습니다.\n주의: 5분, 위험: 10분, 응급: 20분');
    }

    updateCurrentSettingsDisplay(settings) {
        const warningMinutes = settings.warning_minutes || 1440;
        const dangerMinutes = settings.danger_minutes || 2880;
        const emergencyMinutes = settings.emergency_minutes || 4320;
        
        document.getElementById('current-warning').textContent = 
            `${warningMinutes}분 (${Math.floor(warningMinutes/60)}시간)`;
        document.getElementById('current-danger').textContent = 
            `${dangerMinutes}분 (${Math.floor(dangerMinutes/60)}시간)`;
        document.getElementById('current-emergency').textContent = 
            `${emergencyMinutes}분 (${Math.floor(emergencyMinutes/60)}시간)`;
        document.getElementById('last-modified').textContent = 
            settings.updated_at ? new Date(settings.updated_at).toLocaleString('ko-KR') : '-';
    }
}

// 전역 관리자 매니저 인스턴스
let adminManager;

// AdminManager 초기화
console.log('📱 AdminManager 스크립트 로드됨');

// DOM이 완전히 로드된 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminManager);
} else {
    // 이미 로드된 경우 즉시 실행
    setTimeout(initAdminManager, 100);
}

function initAdminManager() {
    console.log('🚀 AdminManager 초기화 시작');
    try {
        adminManager = new AdminManager();
        adminManager.init().then(() => {
            console.log('✅ AdminManager 초기화 완료');
        }).catch((error) => {
            console.error('❌ AdminManager 초기화 실패:', error);
        });
    } catch (error) {
        console.error('❌ AdminManager 생성 실패:', error);
    }
}