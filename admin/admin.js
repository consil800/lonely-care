class AdminManager {
    constructor() {
        this.currentPage = 'overview';
        this.isLoggedIn = true; // 로컬 환경에서는 항상 로그인 상태
        this.firebaseClient = null;
        this.ads = {
            insurance: [],
            funeral: [],
            lawyer: []
        };
    }

    // 페이지 네비게이션
    navigateToPage(pageId) {
        console.log(`네비게이션: ${pageId} 페이지로 이동`);
        
        // 모든 네비게이션 버튼 비활성화
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 모든 페이지 숨김
        document.querySelectorAll('.admin-page').forEach(page => {
            page.classList.add('hidden');
        });

        // 선택된 네비게이션 버튼 활성화
        document.getElementById(`nav-${pageId}`).classList.add('active');

        // 선택된 페이지 표시
        document.getElementById(`${pageId}-page`).classList.remove('hidden');

        this.currentPage = pageId;

        // 페이지별 데이터 로드
        this.loadPageData(pageId);
    }

    // 페이지별 데이터 로드
    async loadPageData(pageId) {
        console.log(`페이지 데이터 로딩: ${pageId}`);
        try {
            switch (pageId) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'users':
                    await this.loadUsersData();
                    break;
                case 'alerts':
                    await this.loadAlertsData();
                    break;
                case 'ads':
                    await this.loadAdsData();
                    break;
                case 'settings':
                    await this.loadSettingsData();
                    break;
            }
        } catch (error) {
            console.error(`페이지 ${pageId} 데이터 로드 실패:`, error);
        }
    }

    // 개요 페이지 데이터 로드 - Supabase 연동
    async loadOverviewData() {
        console.log('개요 페이지 데이터 로딩 시작');
        try {
            if (!this.supabaseClient?.client) {
                console.log('Supabase 클라이언트가 없어서 기본값으로 설정');
                this.showDefaultOverviewData();
                return;
            }

            // 전체 사용자 수 조회
            const { data: users, error: usersError } = await this.supabaseClient.client
                .from('users')
                .select('id, created_at');

            if (usersError) throw usersError;

            // 사용자 상태 조회
            const { data: statuses, error: statusError } = await this.supabaseClient.client
                .from('user_status')
                .select('user_id, status, last_active');

            if (statusError) throw statusError;

            // 최근 알림 조회
            const { data: notifications, error: notifyError } = await this.supabaseClient.client
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (notifyError) throw notifyError;

            // 통계 계산
            const totalUsers = users?.length || 0;
            let activeUsers = 0;
            let warningUsers = 0;
            let emergencyUsers = 0;

            const now = new Date();
            if (statuses) {
                for (const status of statuses) {
                    if (status.last_active) {
                        const lastActivity = new Date(status.last_active);
                        const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

                        if (hoursSinceActivity < 1) {
                            activeUsers++;
                        } else if (hoursSinceActivity >= 72) {
                            emergencyUsers++;
                        } else if (hoursSinceActivity >= 24) {
                            warningUsers++;
                        }
                    }
                }
            }

            // UI 업데이트
            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('active-users').textContent = activeUsers;
            document.getElementById('warning-users').textContent = warningUsers;
            document.getElementById('emergency-users').textContent = emergencyUsers;

            // 최근 알림 표시
            this.displayRecentAlerts(notifications || []);

            console.log('개요 페이지 데이터 로딩 완료:', { totalUsers, activeUsers, warningUsers, emergencyUsers });

        } catch (error) {
            console.error('개요 데이터 로드 실패:', error);
            this.showDefaultOverviewData();
        }
    }

    // 기본 개요 데이터 표시
    showDefaultOverviewData() {
        document.getElementById('total-users').textContent = '0';
        document.getElementById('active-users').textContent = '0';
        document.getElementById('warning-users').textContent = '0';
        document.getElementById('emergency-users').textContent = '0';

        const alertsList = document.getElementById('recent-alerts-list');
        alertsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">데이터베이스에 연결되지 않았습니다.</p>';
    }

    // 최근 알림 표시
    displayRecentAlerts(alerts) {
        const alertsList = document.getElementById('recent-alerts-list');
        
        if (!alerts || alerts.length === 0) {
            alertsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">최근 알림이 없습니다.</p>';
            return;
        }

        alertsList.innerHTML = alerts.map(alert => {
            const alertClass = alert.type === 'emergency' ? 'emergency' : 
                              alert.type === 'danger' ? 'danger' : 'warning';
            
            return `
                <div class="alert-item ${alertClass}">
                    <h4>사용자 ID: ${alert.user_id}</h4>
                    <p>${alert.message}</p>
                    <div class="alert-time">${this.formatDate(alert.created_at)}</div>
                </div>
            `;
        }).join('');
    }

    // 회원 관리 데이터 로드 - Supabase 연동
    async loadUsersData() {
        console.log('회원 데이터 로딩 시작');
        try {
            if (!this.supabaseClient?.client) {
                this.showNoDataMessage('users-table-body');
                return;
            }

            // 사용자와 상태 정보 조인하여 조회
            const { data: users, error } = await this.supabaseClient.client
                .from('users')
                .select(`
                    *,
                    user_status(status, last_active)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.displayUsersTable(users || []);
            console.log('회원 데이터 로딩 완료:', users?.length);

        } catch (error) {
            console.error('회원 데이터 로드 실패:', error);
            this.showNoDataMessage('users-table-body');
        }
    }

    // 회원 테이블 표시
    displayUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999;">등록된 회원이 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            const userStatus = user.user_status?.[0];
            const lastActivity = userStatus?.last_active ? 
                this.formatDate(userStatus.last_active) : '활동 없음';
            
            let statusClass = 'status-inactive';
            let statusText = '비활성';
            
            if (userStatus?.last_active) {
                const now = new Date();
                const lastActivityDate = new Date(userStatus.last_active);
                const hoursSinceActivity = (now - lastActivityDate) / (1000 * 60 * 60);
                
                if (hoursSinceActivity < 1) {
                    statusClass = 'status-active';
                    statusText = '활성';
                } else if (hoursSinceActivity >= 24) {
                    statusClass = 'status-warning';
                    statusText = '경고';
                }
            }

            return `
                <tr>
                    <td>${user.kakao_id || 'N/A'}</td>
                    <td>${user.name || '이름 없음'}</td>
                    <td>${user.email || '이메일 없음'}</td>
                    <td>${user.phone || '전화번호 없음'}</td>
                    <td>${this.formatDate(user.created_at)}</td>
                    <td>${lastActivity}</td>
                    <td class="${statusClass}">${statusText}</td>
                    <td>
                        <button onclick="adminManager.viewUserDetails('${user.id}')" class="btn-small">상세보기</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 알림 관리 데이터 로드 - Supabase 연동
    async loadAlertsData() {
        console.log('알림 데이터 로딩 시작');
        try {
            if (!this.supabaseClient?.client) {
                this.showNoDataMessage('alerts-table-body');
                return;
            }

            const { data: alerts, error } = await this.supabaseClient.client
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            this.displayAlertsTable(alerts || []);
            console.log('알림 데이터 로딩 완료:', alerts?.length);

        } catch (error) {
            console.error('알림 데이터 로드 실패:', error);
            this.showNoDataMessage('alerts-table-body');
        }
    }

    // 알림 테이블 표시
    displayAlertsTable(alerts) {
        const tbody = document.getElementById('alerts-table-body');
        
        if (!alerts || alerts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">알림이 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = alerts.map(alert => {
            const levelText = alert.type === 'emergency' ? '응급' : 
                            alert.type === 'danger' ? '위험' : 
                            alert.type === 'warning' ? '경고' : '일반';
            const levelClass = alert.type === 'emergency' ? 'emergency' : 
                             alert.type === 'danger' ? 'danger' : 'warning';

            return `
                <tr>
                    <td>${this.formatDate(alert.created_at)}</td>
                    <td>사용자 ID: ${alert.user_id}</td>
                    <td>${alert.type}</td>
                    <td class="alert-item ${levelClass}">${levelText}</td>
                    <td>${alert.message}</td>
                    <td>
                        <button onclick="adminManager.deleteAlert('${alert.id}')" class="btn-small danger-btn">삭제</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 광고 관리 데이터 로드 - Supabase 연동
    async loadAdsData() {
        console.log('광고 데이터 로딩 시작');
        try {
            if (!this.supabaseClient?.client) {
                console.log('Supabase 클라이언트가 없어서 기본 광고 표시');
                this.loadDefaultAds();
                // 기본 광고 로드 후 반드시 로컬스토리지에 저장 확인
                this.ensureAdsDataInLocalStorage();
                return;
            }

            const { data: ads, error } = await this.supabaseClient.client
                .from('admin_banners')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 카테고리별로 분류
            this.ads = {
                insurance: ads?.filter(ad => ad.category === 'insurance') || [],
                funeral: ads?.filter(ad => ad.category === 'funeral') || [],
                lawyer: ads?.filter(ad => ad.category === 'lawyer') || []
            };

            // 메인 앱에서 사용할 수 있도록 로컬스토리지에 저장
            const adsForMainApp = ads?.filter(ad => ad.is_active) || [];
            localStorage.setItem('lonelycare_ads', JSON.stringify(adsForMainApp));
            console.log('✅ 메인 앱용 광고 데이터 로컬스토리지 저장 완료:', adsForMainApp.length, '개');

            this.displayAds();
            console.log('광고 데이터 로딩 완료:', ads?.length);

        } catch (error) {
            console.error('광고 데이터 로드 실패:', error);
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
                    description: "고객 맞춤형 생명보험으로 가족을 보호하세요.",
                    url: "https://example.com/insurance",
                    button_text: "보험 상담받기",
                    is_active: true
                }
            ],
            funeral: [
                {
                    id: 'default-2',
                    title: "상조서비스",
                    description: "품격 있는 장례 문화를 위한 종합 상조서비스",
                    url: "https://example.com/funeral",
                    button_text: "상담 신청",
                    is_active: true
                }
            ],
            lawyer: [
                {
                    id: 'default-3',
                    title: "상속 전문 변호사",
                    description: "복잡한 상속 절차를 전문가가 도와드립니다.",
                    url: "https://example.com/inheritance",
                    button_text: "법률 상담",
                    is_active: true
                }
            ]
        };
        
        // 메인 앱용 로컬스토리지에 기본 광고 저장
        const allDefaultAds = [...this.ads.insurance, ...this.ads.funeral, ...this.ads.lawyer];
        const activeDefaultAds = allDefaultAds.filter(ad => ad.is_active !== false);
        localStorage.setItem('lonelycare_ads', JSON.stringify(activeDefaultAds));
        console.log('✅ 기본 광고 데이터를 메인 앱용 로컬스토리지에 저장 완료:', activeDefaultAds.length, '개');
        
        this.displayAds();
    }

    // 새 광고 추가 함수
    addNewAd() {
        const category = document.getElementById('ad-category').value;
        const title = document.getElementById('ad-title').value;
        const description = document.getElementById('ad-description').value;
        const url = document.getElementById('ad-url').value;
        const buttonText = document.getElementById('ad-button-text').value;
        const priority = document.getElementById('ad-priority').value;
        const colorScheme = document.getElementById('ad-color-scheme').value;
        const bannerType = document.getElementById('ad-banner-type').value;

        if (!title || !description || !url || !buttonText) {
            alert('모든 필수 필드를 입력해주세요.');
            return;
        }

        const adData = {
            id: 'local-' + Date.now(),
            title: title,
            description: description,
            url: url,
            button_text: buttonText,
            category: category,
            priority: parseInt(priority),
            color_scheme: colorScheme,
            banner_type: bannerType,
            is_active: true,
            created_at: new Date().toISOString()
        };

        if (!this.ads[category]) this.ads[category] = [];
        this.ads[category].push(adData);
        this.ads[category].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        // 메인 앱용 로컬스토리지 업데이트
        const allAds = [...this.ads.insurance, ...this.ads.funeral, ...this.ads.lawyer];
        const activeAds = allAds.filter(ad => ad.is_active);
        localStorage.setItem('lonelycare_ads', JSON.stringify(activeAds));
        console.log('✅ 새 광고 추가 후 메인 앱용 데이터 업데이트 완료');
        
        this.displayAds();
        
        // 폼 초기화
        document.getElementById('ad-title').value = '';
        document.getElementById('ad-description').value = '';
        document.getElementById('ad-url').value = '';
        document.getElementById('ad-button-text').value = '';
        document.getElementById('ad-priority').value = '0';
        document.getElementById('ad-color-scheme').value = 'default';
        document.getElementById('ad-banner-type').value = 'info';

        console.log(`새 광고 추가됨: ${category} - ${title}`);
        alert('광고가 성공적으로 추가되었습니다!');
    }

    // 광고 표시
    displayAds() {
        Object.keys(this.ads).forEach(category => {
            const container = document.getElementById(`${category}-ads`);
            const ads = this.ads[category];

            if (!container) return;

            if (!ads || ads.length === 0) {
                container.innerHTML = '<p style="color: #999; padding: 10px;">등록된 광고가 없습니다.</p>';
                return;
            }

            container.innerHTML = ads.map(ad => `
                <div class="ad-item ${ad.is_active ? '' : 'inactive'}">
                    <h4>${ad.title}</h4>
                    <p>${ad.description}</p>
                    <p><strong>링크:</strong> ${ad.url}</p>
                    <p><strong>버튼 텍스트:</strong> ${ad.button_text}</p>
                    <p><strong>상태:</strong> ${ad.is_active ? '활성' : '비활성'}</p>
                    <div class="ad-item-actions">
                        <button class="btn-small" onclick="adminManager.editAd('${category}', '${ad.id}')">편집</button>
                        <button class="btn-small danger-btn" onclick="adminManager.deleteAd('${category}', '${ad.id}')">삭제</button>
                        <button class="btn-small" onclick="adminManager.toggleAdStatus('${category}', '${ad.id}', ${ad.is_active})">
                            ${ad.is_active ? '비활성화' : '활성화'}
                        </button>
                    </div>
                </div>
            `).join('');
        });
    }

    // 설정 데이터 로드
    async loadSettingsData() {
        console.log('설정 데이터 로딩');
        // 현재 설정 로드 (localStorage 기반)
        const settings = {
            emergencyContacts: JSON.parse(localStorage.getItem('adminEmergencyContacts') || '{}'),
            notifications: {
                warning24h: localStorage.getItem('adminWarning24h') !== 'false',
                warning48h: localStorage.getItem('adminWarning48h') !== 'false',
                emergency72h: localStorage.getItem('adminEmergency72h') !== 'false'
            }
        };

        // UI에 설정 값 반영
        document.getElementById('fire-dept').value = settings.emergencyContacts.fireDept || '119';
        document.getElementById('police').value = settings.emergencyContacts.police || '112';
        document.getElementById('city-hall').value = settings.emergencyContacts.cityHall || '';

        document.getElementById('fire-dept-enabled').checked = settings.emergencyContacts.fireDeptEnabled !== false;
        document.getElementById('police-enabled').checked = settings.emergencyContacts.policeEnabled !== false;
        document.getElementById('city-hall-enabled').checked = settings.emergencyContacts.cityHallEnabled || false;

        document.getElementById('warning-24h').checked = settings.notifications.warning24h;
        document.getElementById('warning-48h').checked = settings.notifications.warning48h;
        document.getElementById('emergency-72h').checked = settings.notifications.emergency72h;
    }

    // 데이터 없음 메시지 표시
    showNoDataMessage(containerId) {
        const container = document.getElementById(containerId);
        if (container.tagName === 'TBODY') {
            container.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #999; padding: 20px;">데이터베이스에 연결되지 않았습니다.</td></tr>';
        } else {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">데이터베이스에 연결되지 않았습니다.</p>';
        }
    }

    // 사용자 상세보기
    async viewUserDetails(userId) {
        try {
            if (!this.supabaseClient?.client) {
                alert('데이터베이스에 연결되지 않았습니다.');
                return;
            }

            const { data: user, error } = await this.supabaseClient.client
                .from('users')
                .select(`
                    *,
                    user_status(*),
                    friends!user_id(*)
                `)
                .eq('id', userId)
                .single();

            if (error) throw error;

            let details = `사용자 ID: ${user.id}\n`;
            details += `카카오 ID: ${user.kakao_id}\n`;
            details += `이름: ${user.name}\n`;
            details += `이메일: ${user.email}\n`;
            details += `전화번호: ${user.phone || '없음'}\n`;
            details += `주소: ${user.address || '없음'} ${user.detail_address || ''}\n`;
            details += `가입일: ${this.formatDate(user.created_at)}\n`;
            
            if (user.user_status?.[0]) {
                details += `마지막 활동: ${this.formatDate(user.user_status[0].last_active)}\n`;
            }
            
            details += `친구 수: ${user.friends?.length || 0}`;

            alert(details);

        } catch (error) {
            console.error('사용자 상세 정보 로드 실패:', error);
            alert('사용자 정보를 불러올 수 없습니다.');
        }
    }

    // 알림 삭제
    async deleteAlert(alertId) {
        if (!confirm('이 알림을 삭제하시겠습니까?')) return;

        try {
            if (!this.supabaseClient?.client) {
                alert('데이터베이스에 연결되지 않았습니다.');
                return;
            }

            const { error } = await this.supabaseClient.client
                .from('notifications')
                .delete()
                .eq('id', alertId);

            if (error) throw error;

            alert('알림이 삭제되었습니다.');
            await this.loadAlertsData();

        } catch (error) {
            console.error('알림 삭제 실패:', error);
            alert('알림 삭제에 실패했습니다.');
        }
    }

    // 광고 편집
    editAd(category, adId) {
        const ad = this.ads[category]?.find(a => a.id === adId);
        if (ad) {
            this.showAdModal('편집', category, ad);
        }
    }

    // 광고 삭제
    async deleteAd(category, adId) {
        if (!confirm('이 광고를 삭제하시겠습니까?')) return;

        try {
            if (!this.supabaseClient?.client) {
                // 로컬 데이터에서 삭제
                this.ads[category] = this.ads[category].filter(a => a.id !== adId);
                this.displayAds();
                return;
            }

            const { error } = await this.supabaseClient.client
                .from('admin_banners')
                .delete()
                .eq('id', adId);

            if (error) throw error;

            alert('광고가 삭제되었습니다.');
            await this.loadAdsData();

        } catch (error) {
            console.error('광고 삭제 실패:', error);
            alert('광고 삭제에 실패했습니다.');
        }
    }

    // 광고 상태 토글
    async toggleAdStatus(category, adId, currentStatus) {
        try {
            if (!this.supabaseClient?.client) {
                // 로컬 데이터에서 상태 변경
                const ad = this.ads[category]?.find(a => a.id === adId);
                if (ad) {
                    ad.is_active = !currentStatus;
                    this.displayAds();
                }
                return;
            }

            const { error } = await this.supabaseClient.client
                .from('admin_banners')
                .update({ is_active: !currentStatus })
                .eq('id', adId);

            if (error) throw error;

            alert(`광고가 ${currentStatus ? '비활성화' : '활성화'}되었습니다.`);
            await this.loadAdsData();

        } catch (error) {
            console.error('광고 상태 변경 실패:', error);
            alert('광고 상태 변경에 실패했습니다.');
        }
    }

    // 광고 모달 표시
    showAdModal(mode = '추가', category = '', ad = null) {
        const modal = document.getElementById('ad-modal');
        const title = document.getElementById('ad-modal-title');
        const form = document.getElementById('ad-form');

        title.textContent = mode === '추가' ? '새 광고 추가' : '광고 편집';

        if (ad) {
            document.getElementById('ad-category').value = category;
            document.getElementById('ad-title').value = ad.title;
            document.getElementById('ad-description').value = ad.description;
            document.getElementById('ad-link').value = ad.url;
            document.getElementById('ad-button-text').value = ad.button_text;
        } else {
            form.reset();
        }

        modal.classList.remove('hidden');
        modal.setAttribute('data-mode', mode);
        modal.setAttribute('data-category', category);
        if (ad) modal.setAttribute('data-ad-id', ad.id);
    }

    // 광고 모달 숨김
    hideAdModal() {
        document.getElementById('ad-modal').classList.add('hidden');
        document.getElementById('ad-form').reset();
    }

    // 광고 저장
    async saveAd(formData) {
        const modal = document.getElementById('ad-modal');
        const mode = modal.getAttribute('data-mode');
        const category = formData.get('category');

        const adData = {
            title: formData.get('title'),
            description: formData.get('description'),
            url: formData.get('link'),
            button_text: formData.get('buttonText'),
            category: category,
            is_active: true
        };

        try {
            if (!this.supabaseClient?.client) {
                // 로컬 데이터에 추가
                if (mode === '추가') {
                    adData.id = 'local-' + Date.now();
                    if (!this.ads[category]) this.ads[category] = [];
                    this.ads[category].push(adData);
                } else {
                    const adId = modal.getAttribute('data-ad-id');
                    const adIndex = this.ads[category].findIndex(a => a.id === adId);
                    if (adIndex !== -1) {
                        this.ads[category][adIndex] = { ...adData, id: adId };
                    }
                }
                
                // 메인 앱용 로컬스토리지 업데이트
                const allAds = [...this.ads.insurance, ...this.ads.funeral, ...this.ads.lawyer];
                const activeAds = allAds.filter(ad => ad.is_active);
                localStorage.setItem('lonelycare_ads', JSON.stringify(activeAds));
                console.log('✅ 로컬 광고 추가/수정 후 메인 앱용 데이터 업데이트 완료');
                
                this.displayAds();
                this.hideAdModal();
                alert(`광고가 ${mode === '추가' ? '추가' : '수정'}되었습니다.`);
                return;
            }

            let result;
            if (mode === '추가') {
                result = await this.supabaseClient.client
                    .from('admin_banners')
                    .insert([adData]);
            } else {
                const adId = modal.getAttribute('data-ad-id');
                result = await this.supabaseClient.client
                    .from('admin_banners')
                    .update(adData)
                    .eq('id', adId);
            }

            if (result.error) throw result.error;

            alert(`광고가 ${mode === '추가' ? '추가' : '수정'}되었습니다.`);
            await this.loadAdsData();
            this.hideAdModal();

        } catch (error) {
            console.error('광고 저장 실패:', error);
            alert('광고 저장에 실패했습니다.');
        }
    }

    // 설정 저장
    async saveSettings() {
        try {
            const emergencyContacts = {
                fireDept: document.getElementById('fire-dept').value,
                police: document.getElementById('police').value,
                cityHall: document.getElementById('city-hall').value,
                fireDeptEnabled: document.getElementById('fire-dept-enabled').checked,
                policeEnabled: document.getElementById('police-enabled').checked,
                cityHallEnabled: document.getElementById('city-hall-enabled').checked
            };

            // localStorage에 저장
            localStorage.setItem('adminEmergencyContacts', JSON.stringify(emergencyContacts));
            localStorage.setItem('adminWarning24h', document.getElementById('warning-24h').checked);
            localStorage.setItem('adminWarning48h', document.getElementById('warning-48h').checked);
            localStorage.setItem('adminEmergency72h', document.getElementById('emergency-72h').checked);

            alert('설정이 저장되었습니다.');

        } catch (error) {
            console.error('설정 저장 실패:', error);
            alert('설정 저장에 실패했습니다.');
        }
    }

    // 데이터 내보내기
    async exportAllData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                users: [],
                notifications: [],
                ads: this.ads
            };

            if (this.supabaseClient?.client) {
                // Supabase에서 데이터 조회
                const { data: users } = await this.supabaseClient.client.from('users').select('*');
                const { data: notifications } = await this.supabaseClient.client.from('notifications').select('*');
                
                exportData.users = users || [];
                exportData.notifications = notifications || [];
            }

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `lonely-care-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            alert('데이터 내보내기가 완료되었습니다.');

        } catch (error) {
            console.error('데이터 내보내기 실패:', error);
            alert('데이터 내보내기에 실패했습니다.');
        }
    }

    // 날짜 포맷팅
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

    // 이벤트 리스너 설정
    setupEventListeners() {
        console.log('이벤트 리스너 설정 시작');

        // 네비게이션 버튼들
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pageId = e.target.id.replace('nav-', '');
                this.navigateToPage(pageId);
            });
        });

        // 광고 관련 버튼들
        const addAdBtn = document.getElementById('add-new-ad');
        if (addAdBtn) {
            addAdBtn.addEventListener('click', () => {
                this.showAdModal('추가');
            });
        }

        const cancelModalBtn = document.getElementById('cancel-ad-modal');
        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', () => {
                this.hideAdModal();
            });
        }

        const adForm = document.getElementById('ad-form');
        if (adForm) {
            adForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                this.saveAd(formData);
            });
        }

        // 설정 저장 버튼
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // 데이터 관리 버튼들
        const exportBtn = document.getElementById('export-all-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAllData();
            });
        }

        const exportUsersBtn = document.getElementById('export-users');
        if (exportUsersBtn) {
            exportUsersBtn.addEventListener('click', async () => {
                try {
                    let users = [];
                    if (this.supabaseClient?.client) {
                        const { data } = await this.supabaseClient.client.from('users').select('*');
                        users = data || [];
                    }
                    
                    const dataStr = JSON.stringify(users, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(dataBlob);
                    link.download = `lonely-care-users-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                } catch (error) {
                    console.error('회원 데이터 내보내기 실패:', error);
                    alert('회원 데이터 내보내기에 실패했습니다.');
                }
            });
        }

        // 모달 배경 클릭시 닫기
        const modal = document.getElementById('ad-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.hideAdModal();
                }
            });
        }

        console.log('이벤트 리스너 설정 완료');
    }

    // 초기화
    async init() {
        console.log('AdminManager 초기화 시작');
        
        // Firebase 초기화 대기
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.storage?.db) {
                this.firebaseClient = window.storage;
                console.log('Firebase 클라이언트 연결 완료');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!this.firebaseClient) {
            console.log('Firebase 클라이언트 연결 실패 - 로컬 모드로 실행');
        }

        this.setupEventListeners();
        // 개요 페이지 기본 로드
        await this.loadOverviewData();
        
        // 알림 시간 설정 로드
        await this.loadNotificationSettings();
        
        console.log('AdminManager 초기화 완료');
    }

    // 알림 시간 설정 관련 메서드들
    async loadNotificationSettings() {
        try {
            if (this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('notification_settings_admin')
                    .select('*')
                    .limit(1);
                
                if (!error && data && data.length > 0) {
                    const settings = data[0];
                    document.getElementById('warning-time').value = settings.warning_minutes || 1440;
                    document.getElementById('danger-time').value = settings.danger_minutes || 2880;
                    document.getElementById('emergency-time').value = settings.emergency_minutes || 4320;
                    this.updateCurrentSettingsDisplay(settings);
                }
            }
        } catch (error) {
            console.log('알림 설정 로드 실패 (로컬 환경):', error);
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
            warning_minutes: warningTime,
            danger_minutes: dangerTime,
            emergency_minutes: emergencyTime,
            updated_at: new Date().toISOString()
        };

        try {
            if (this.supabaseClient) {
                // 기존 설정 삭제 후 새로 삽입
                await this.supabaseClient.from('notification_settings_admin').delete().neq('id', 0);
                
                const { error } = await this.supabaseClient
                    .from('notification_settings_admin')
                    .insert(settings);
                
                if (error) throw error;
                console.log('✅ 알림 설정이 데이터베이스에 저장되었습니다.');
            } else {
                throw new Error('Supabase 연결 없음');
            }
        } catch (error) {
            console.log('데이터베이스 저장 실패, 로컬 저장소 사용:', error);
            localStorage.setItem('admin-notification-settings', JSON.stringify(settings));
        }

        this.updateCurrentSettingsDisplay(settings);
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

    // 초기화 메소드 추가
    async init() {
        console.log('AdminManager 초기화 시작');
        try {
            // 기본 데이터 로드
            await this.loadPageData('overview'); // 개요 페이지부터 시작
            
            // 메인 앱용 광고 데이터 확실히 저장
            this.ensureAdsDataInLocalStorage();
            
            console.log('✅ AdminManager 초기화 완료');
        } catch (error) {
            console.error('❌ AdminManager 초기화 실패:', error);
            // 초기화 실패해도 기본 광고는 저장
            this.ensureAdsDataInLocalStorage();
        }
    }
    
    // 메인 앱용 광고 데이터가 로컬스토리지에 있는지 확인하고 없으면 강제 저장
    ensureAdsDataInLocalStorage() {
        try {
            const existingAds = localStorage.getItem('lonelycare_ads');
            
            if (!existingAds || existingAds === 'null' || existingAds === '[]') {
                console.log('🔄 로컬스토리지에 광고 데이터 없음 - 기본 광고 강제 저장');
                
                // 기본 광고 생성 및 저장
                const defaultAds = [
                    {
                        id: 'default-1',
                        title: '생명보험 추천',
                        description: '고객 맞춤형 생명보험으로 가족을 보호하세요.',
                        url: 'https://example.com/insurance',
                        button_text: '보험 상담받기',
                        category: 'insurance',
                        is_active: true,
                        priority: 1
                    },
                    {
                        id: 'default-2',
                        title: '상조서비스',
                        description: '품격 있는 장례 문화를 위한 종합 상조서비스',
                        url: 'https://example.com/funeral',
                        button_text: '상담 신청',
                        category: 'funeral',
                        is_active: true,
                        priority: 1
                    },
                    {
                        id: 'default-3',
                        title: '상속 전문 변호사',
                        description: '복잡한 상속 절차를 전문가가 도와드립니다.',
                        url: 'https://example.com/inheritance',
                        button_text: '법률 상담',
                        category: 'lawyer',
                        is_active: true,
                        priority: 1
                    }
                ];
                
                localStorage.setItem('lonelycare_ads', JSON.stringify(defaultAds));
                console.log('✅ 메인 앱용 기본 광고 데이터 강제 저장 완료:', defaultAds.length, '개');
                console.log('📋 저장된 광고 목록:', defaultAds.map(ad => ({ title: ad.title, category: ad.category })));
                
                // 관리자 페이지에도 동일한 데이터 설정
                this.ads = {
                    insurance: defaultAds.filter(ad => ad.category === 'insurance'),
                    funeral: defaultAds.filter(ad => ad.category === 'funeral'),
                    lawyer: defaultAds.filter(ad => ad.category === 'lawyer')
                };
                
            } else {
                try {
                    const existingData = JSON.parse(existingAds);
                    console.log('✅ 로컬스토리지에 광고 데이터 이미 존재:', existingData.length, '개');
                } catch (parseError) {
                    console.error('❌ 기존 로컬스토리지 데이터 파싱 실패, 기본 광고로 교체');
                    this.ensureAdsDataInLocalStorage(); // 재귀 호출로 다시 저장
                }
            }
        } catch (error) {
            console.error('❌ 로컬스토리지 광고 데이터 확인/저장 실패:', error);
        }
    }
}

// 전역 관리자 매니저 인스턴스
let adminManager;

// DOM 로드 완료시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM 로드 완료 - AdminManager 시작');
    adminManager = new AdminManager();
    await adminManager.init();
});