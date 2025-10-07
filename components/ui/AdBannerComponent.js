/**
 * AdBannerComponent v1.0
 * 광고 배너 시스템을 관리하는 독립 컴포넌트
 * 
 * 보험, 장례, 법무 등 타겟 광고 노출 및 관리자 설정 기반 광고 운영
 * 사용자 행동 분석 기반 스마트 광고 추천
 */

class AdBannerComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoInit: true,
            enableAnalytics: true,
            enableSmartRecommendation: true,
            enableClickTracking: true,
            refreshInterval: 5 * 60 * 1000, // 5분마다 광고 새로고침 (무한루프 방지)
            maxBannersPerPage: 3,
            defaultAdDuration: 30 * 1000, // 30초 표시 (사용자 경험 개선)
            debug: options.debug || false,
            ...options
        };

        // 광고 카테고리
        this.adCategories = {
            insurance: {
                name: '보험',
                priority: 1,
                targetAge: [50, 80],
                keywords: ['보험', '생명보험', '실버보험', '노인보험'],
                defaultAds: [
                    {
                        id: 'insurance-1',
                        title: '시니어 전용 생명보험',
                        description: '50대 이상 맞춤 보험 상품',
                        imageUrl: 'assets/ads/insurance-banner-1.jpg',
                        linkUrl: 'https://example.com/insurance',
                        priority: 1
                    }
                ]
            },
            funeral: {
                name: '장례',
                priority: 2,
                targetAge: [60, 90],
                keywords: ['장례', '장례식장', '상조', '묘지'],
                defaultAds: [
                    {
                        id: 'funeral-1',
                        title: '믿을 수 있는 상조 서비스',
                        description: '평생 안심 상조 서비스',
                        imageUrl: 'assets/ads/funeral-banner-1.jpg',
                        linkUrl: 'https://example.com/funeral',
                        priority: 1
                    }
                ]
            },
            lawyer: {
                name: '법무',
                priority: 3,
                targetAge: [40, 80],
                keywords: ['변호사', '법무', '상속', '유언'],
                defaultAds: [
                    {
                        id: 'lawyer-1',
                        title: '상속 전문 변호사',
                        description: '상속 및 유언 상담',
                        imageUrl: 'assets/ads/lawyer-banner-1.jpg',
                        linkUrl: 'https://example.com/lawyer',
                        priority: 1
                    }
                ]
            },
            healthcare: {
                name: '건강관리',
                priority: 4,
                targetAge: [50, 85],
                keywords: ['건강', '의료', '병원', '검진'],
                defaultAds: []
            }
        };

        // 상태 관리
        this.isInitialized = false;
        this.activeAds = new Map(); // 현재 활성화된 광고
        this.adHistory = new Map(); // 광고 노출 히스토리
        this.clickStats = new Map(); // 클릭 통계
        this.userPreferences = new Map(); // 사용자 선호도
        this.bannersContainer = null;
        
        // 스케줄러 및 타이머
        this.refreshTimer = null;
        this.rotationTimer = null;
        this.analyticsTimer = null;
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        
        console.log('📢 AdBannerComponent 초기화', this.options);
        
        // 자동 초기화 활성화 (main.js에서 제어)
        if (this.options.autoInit) {
            console.log('🚀 AdBannerComponent 자동 초기화 예약됨');
            // DOM 로드 후 초기화 (안전한 방식)
            setTimeout(() => {
                this.init().catch(error => {
                    console.error('❌ AdBannerComponent 자동 초기화 실패:', error);
                });
            }, 1000); // 1초 대기 후 초기화
        }
        console.log('✅ AdBannerComponent 자동 초기화 활성화됨');
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        if (this.isInitialized) {
            console.log('✅ AdBannerComponent 이미 초기화됨');
            return true;
        }
        
        // 초기화 활성화 (제어된 방식으로)
        try {
            console.log('🚀 AdBanner 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            
            // UI 컨테이너 생성
            await this.createBannerContainer();
            
            // 관리자 광고 데이터 로드
            await this.loadAdminAds();
            
            // 사용자 선호도 로드
            await this.loadUserPreferences();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 광고 표시
            await this.displayInitialAds();
            
            // 광고 새로고침 스케줄러 시작
            if (this.options.refreshInterval > 0) {
                this.startRefreshScheduler();
            }
            
            // 분석 시스템 시작
            if (this.options.enableAnalytics) {
                this.startAnalyticsSystem();
            }
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('ad:system-ready', {
                detail: { component: this, activeAdsCount: this.activeAds.size }
            }));

            console.log('✅ AdBanner 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ AdBanner 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('ad:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 광고 배너 컨테이너 생성
     */
    async createBannerContainer() {
        // 기존 컨테이너 확인
        this.bannersContainer = document.getElementById('ad-banners-container');
        
        if (!this.bannersContainer) {
            // 새 컨테이너 생성
            this.bannersContainer = document.createElement('div');
            this.bannersContainer.id = 'ad-banners-container';
            this.bannersContainer.className = 'ad-banners-container';
            
            // 스타일 적용
            this.bannersContainer.innerHTML = `
                <style>
                .ad-banners-container {
                    position: relative;
                    width: 100%;
                    margin: 10px 0;
                    z-index: 100;
                }
                
                .ad-banner {
                    display: none;
                    width: 100%;
                    max-width: 400px;
                    margin: 8px auto;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    position: relative;
                }
                
                .ad-banner:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                }
                
                .ad-banner.show {
                    display: block;
                    animation: fadeInUp 0.5s ease-out;
                }
                
                .ad-banner-content {
                    padding: 12px 16px;
                    color: white;
                    position: relative;
                }
                
                .ad-banner-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 4px;
                    line-height: 1.3;
                }
                
                .ad-banner-description {
                    font-size: 12px;
                    opacity: 0.9;
                    line-height: 1.4;
                }
                
                .ad-banner-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 20px;
                    height: 20px;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                
                .ad-banner-close:hover {
                    opacity: 1;
                    background: rgba(255,255,255,0.3);
                }
                
                .ad-banner-category {
                    position: absolute;
                    bottom: 4px;
                    right: 8px;
                    font-size: 10px;
                    opacity: 0.6;
                    text-transform: uppercase;
                }
                
                .ad-banner-insurance {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                
                .ad-banner-funeral {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }
                
                .ad-banner-lawyer {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }
                
                .ad-banner-healthcare {
                    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .ad-banner-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 60px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin: 8px auto;
                    max-width: 400px;
                    color: #6c757d;
                    font-size: 12px;
                }
                </style>
                <div class="ad-banner-loading">
                    <div class="loading-spinner" style="
                        width: 24px;
                        height: 24px;
                        border: 2px solid #f3f3f3;
                        border-top: 2px solid #74c0fc;
                        border-radius: 50%;
                        animation: spinner-spin 1s linear infinite;
                        margin-right: 12px;
                    "></div>
                    광고 데이터 로딩 중...
                </div>
                <style>
                    @keyframes spinner-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            // 🚨 광고는 광고 페이지에서만 표시 (다른 페이지 오염 방지)
            const adsPage = document.querySelector('#ads-page');
            const adContent = document.querySelector('#ad-content');
            
            if (adsPage && adContent) {
                // 광고 페이지 내부의 ad-content에만 삽입
                adContent.appendChild(this.bannersContainer);
                console.log('✅ 광고 배너를 광고 페이지에만 삽입');
            } else {
                console.warn('⚠️ 광고 페이지를 찾을 수 없음 - 광고 배너 표시 중단');
                return false;
            }
        }
        
        console.log('📱 광고 배너 컨테이너 생성 완료');
    }

    /**
     * 관리자 광고 데이터 로드
     */
    async loadAdminAds() {
        try {
            console.log('🔧 관리자 광고 데이터 로딩 중...');

            // Supabase에서 관리자 광고 조회
            if (this.supabase) {
                const adsResult = await this.supabase.query('admin_ads', {
                    eq: { active: true },
                    order: { priority: 'asc', created_at: 'desc' }
                });

                if (adsResult.data && !adsResult.error) {
                    // 카테고리별로 광고 분류
                    adsResult.data.forEach(ad => {
                        const category = ad.category || 'insurance';
                        if (this.adCategories[category]) {
                            if (!this.adCategories[category].adminAds) {
                                this.adCategories[category].adminAds = [];
                            }
                            this.adCategories[category].adminAds.push(ad);
                        }
                    });
                    
                    console.log('✅ Supabase 관리자 광고 데이터 로드 완료');
                }
            }

            // 로컬 저장소에서 백업 광고 로드
            const localAds = JSON.parse(localStorage.getItem('admin-ads-data') || '{}');
            if (Object.keys(localAds).length > 0) {
                Object.keys(localAds).forEach(category => {
                    if (this.adCategories[category] && localAds[category]) {
                        this.adCategories[category].adminAds = localAds[category];
                    }
                });
                console.log('📱 로컬 관리자 광고 데이터 적용');
            }

        } catch (error) {
            console.warn('⚠️ 관리자 광고 데이터 로드 실패, 기본값 사용:', error);
        }
    }

    /**
     * 사용자 선호도 로드
     */
    async loadUserPreferences() {
        try {
            const currentUser = this.auth?.getCurrentUser();
            if (!currentUser) return;

            console.log('👤 사용자 광고 선호도 로딩 중...');

            // Supabase에서 사용자 광고 선호도 조회
            if (this.supabase) {
                const prefsResult = await this.supabase.query('user_ad_preferences', {
                    eq: { user_id: currentUser.id },
                    single: true
                });

                if (prefsResult.data && !prefsResult.error) {
                    const prefs = {
                        preferredCategories: prefsResult.data.preferred_categories || [],
                        blockedCategories: prefsResult.data.blocked_categories || [],
                        clickHistory: prefsResult.data.click_history || {},
                        lastAdInteraction: prefsResult.data.last_interaction
                    };
                    
                    this.userPreferences.set(currentUser.id, prefs);
                    console.log('✅ 사용자 선호도 로드 완료');
                }
            }

            // 로컬 저장소에서 백업 선호도 로드
            const localPrefs = JSON.parse(localStorage.getItem(`user-ad-prefs-${currentUser.id}`) || '{}');
            if (Object.keys(localPrefs).length > 0) {
                this.userPreferences.set(currentUser.id, {
                    preferredCategories: localPrefs.preferred || [],
                    blockedCategories: localPrefs.blocked || [],
                    clickHistory: localPrefs.clicks || {},
                    lastAdInteraction: localPrefs.lastInteraction
                });
            }

        } catch (error) {
            console.warn('⚠️ 사용자 선호도 로드 실패:', error);
        }
    }

    /**
     * 초기 광고 표시
     */
    async displayInitialAds() {
        try {
            // 🚨 광고 페이지에서만 광고 표시 (다른 페이지 오염 방지)
            const adsPage = document.querySelector('#ads-page');
            if (!adsPage || !adsPage.classList.contains('active')) {
                console.log('⚠️ 현재 페이지가 광고 페이지가 아님 - 광고 표시 중단');
                return;
            }
            
            console.log('📢 초기 광고 표시 시작 (광고 페이지에서)');
            
            // 로딩 표시 제거
            const loading = this.bannersContainer?.querySelector('.ad-banner-loading');
            if (loading) {
                loading.remove();
            }
            
            // 스마트 추천 광고 가져오기
            const recommendedAds = await this.getRecommendedAds();
            
            if (recommendedAds.length === 0) {
                console.log('표시할 광고가 없음 - 안내 메시지 표시');
                this.showNoAdsMessage();
                return;
            }
            
            // 광고 표시 (최대 개수 제한)
            const adsToShow = recommendedAds.slice(0, this.options.maxBannersPerPage);
            
            for (let i = 0; i < adsToShow.length; i++) {
                setTimeout(() => {
                    this.displayAd(adsToShow[i], i);
                }, i * 500); // 0.5초 간격으로 표시
            }
            
            // 광고 회전 시작
            this.startAdRotation(adsToShow);
            
        } catch (error) {
            console.error('❌ 초기 광고 표시 실패:', error);
        }
    }

    /**
     * 광고가 없을 때 안내 메시지 표시
     */
    showNoAdsMessage() {
        const adContent = document.getElementById('ad-content');
        if (adContent) {
            adContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.7;">📢</div>
                    <div style="font-size: 18px; margin-bottom: 8px; font-weight: 500;">등록된 광고가 없습니다</div>
                    <div style="font-size: 14px; color: #999;">관리자 페이지에서 광고를 추가해주세요</div>
                </div>
            `;
            console.log('📭 광고 없음 메시지 표시 완료');
        }
    }

    /**
     * 스마트 광고 추천
     */
    async getRecommendedAds() {
        try {
            const currentUser = this.auth?.getCurrentUser();
            const userPrefs = currentUser ? this.userPreferences.get(currentUser.id) : null;
            
            let allAds = [];
            
            // 모든 카테고리에서 광고 수집
            Object.keys(this.adCategories).forEach(category => {
                const categoryData = this.adCategories[category];
                
                // 사용자가 차단한 카테고리는 제외
                if (userPrefs && userPrefs.blockedCategories.includes(category)) {
                    return;
                }
                
                // 관리자 광고 우선
                if (categoryData.adminAds && categoryData.adminAds.length > 0) {
                    allAds.push(...categoryData.adminAds.map(ad => ({
                        ...ad,
                        category,
                        source: 'admin',
                        score: this.calculateAdScore(ad, category, userPrefs)
                    })));
                }
                
                // 기본 광고 추가
                if (categoryData.defaultAds && categoryData.defaultAds.length > 0) {
                    allAds.push(...categoryData.defaultAds.map(ad => ({
                        ...ad,
                        category,
                        source: 'default',
                        score: this.calculateAdScore(ad, category, userPrefs)
                    })));
                }
            });
            
            // 점수별 정렬
            allAds.sort((a, b) => b.score - a.score);
            
            console.log(`📊 추천 광고 ${allAds.length}개 생성 완료`);
            return allAds;
            
        } catch (error) {
            console.error('❌ 광고 추천 실패:', error);
            return [];
        }
    }

    /**
     * 광고 점수 계산 (스마트 추천용)
     */
    calculateAdScore(ad, category, userPrefs) {
        let score = ad.priority || 1;
        
        // 사용자 선호 카테고리 가산점
        if (userPrefs && userPrefs.preferredCategories.includes(category)) {
            score += 10;
        }
        
        // 클릭 히스토리 기반 가산점
        if (userPrefs && userPrefs.clickHistory[category]) {
            score += userPrefs.clickHistory[category] * 2;
        }
        
        // 최근 상호작용 기반 점수 조정
        if (userPrefs && userPrefs.lastAdInteraction) {
            const daysSinceInteraction = (Date.now() - new Date(userPrefs.lastAdInteraction).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceInteraction < 1) {
                score += 5; // 최근 활동 사용자에게 가산점
            }
        }
        
        // 관리자 광고 가산점
        if (ad.source === 'admin') {
            score += 15;
        }
        
        return score;
    }

    /**
     * 개별 광고 표시
     */
    displayAd(adData, index = 0) {
        try {
            // 🚨 광고 페이지에서만 광고 표시 (다른 페이지 오염 방지)
            const adsPage = document.querySelector('#ads-page');
            if (!adsPage || !adsPage.classList.contains('active')) {
                console.log('⚠️ 현재 페이지가 광고 페이지가 아님 - 개별 광고 표시 중단');
                return;
            }
            
            const adElement = document.createElement('div');
            adElement.className = `ad-banner ad-banner-${adData.category}`;
            adElement.setAttribute('data-ad-id', adData.id);
            adElement.setAttribute('data-ad-category', adData.category);
            
            adElement.innerHTML = `
                <div class="ad-banner-content">
                    <button class="ad-banner-close" onclick="window.adBannerComponent.closeAd('${adData.id}')">&times;</button>
                    <div class="ad-banner-title">${adData.title}</div>
                    <div class="ad-banner-description">${adData.description}</div>
                    <div class="ad-banner-category">${this.adCategories[adData.category]?.name || adData.category}</div>
                </div>
            `;
            
            // 클릭 이벤트 추가
            adElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('ad-banner-close')) {
                    this.handleAdClick(adData);
                }
            });
            
            // DOM에 추가
            this.bannersContainer.appendChild(adElement);
            
            // 애니메이션과 함께 표시
            setTimeout(() => {
                adElement.classList.add('show');
            }, 100);
            
            // 활성 광고 목록에 추가
            this.activeAds.set(adData.id, {
                element: adElement,
                data: adData,
                displayedAt: new Date().toISOString()
            });
            
            // 노출 통계 기록
            this.recordAdImpression(adData);
            
            console.log(`📢 광고 표시: ${adData.title} (${adData.category})`);
            
        } catch (error) {
            console.error('❌ 광고 표시 실패:', error);
        }
    }

    /**
     * 광고 클릭 처리
     */
    handleAdClick(adData) {
        try {
            console.log(`🖱️ 광고 클릭: ${adData.title}`);
            
            // 클릭 통계 업데이트
            this.updateClickStats(adData);
            
            // 사용자 선호도 업데이트
            this.updateUserPreferences(adData);
            
            // 외부 링크 열기
            if (adData.linkUrl && adData.linkUrl.startsWith('http')) {
                window.open(adData.linkUrl, '_blank');
            }
            
            // 이벤트 발송
            this.dispatchEvent(new CustomEvent('ad:clicked', {
                detail: { adData }
            }));
            
            // 클릭 로그 기록
            this.recordAdClick(adData);
            
        } catch (error) {
            console.error('❌ 광고 클릭 처리 실패:', error);
        }
    }

    /**
     * 광고 닫기
     */
    closeAd(adId) {
        try {
            const activeAd = this.activeAds.get(adId);
            if (!activeAd) return;
            
            // 애니메이션 효과
            activeAd.element.style.opacity = '0';
            activeAd.element.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                activeAd.element.remove();
                this.activeAds.delete(adId);
            }, 300);
            
            // 사용자 선호도에 차단 기록
            const currentUser = this.auth?.getCurrentUser();
            if (currentUser) {
                const userPrefs = this.userPreferences.get(currentUser.id) || {
                    preferredCategories: [],
                    blockedCategories: [],
                    clickHistory: {}
                };
                
                if (!userPrefs.blockedCategories.includes(activeAd.data.category)) {
                    userPrefs.blockedCategories.push(activeAd.data.category);
                    this.userPreferences.set(currentUser.id, userPrefs);
                    this.saveUserPreferences();
                }
            }
            
            this.dispatchEvent(new CustomEvent('ad:closed', {
                detail: { adId, category: activeAd.data.category }
            }));
            
            console.log(`❌ 광고 닫음: ${adId}`);
            
        } catch (error) {
            console.error('❌ 광고 닫기 실패:', error);
        }
    }

    /**
     * 광고 회전 시작
     */
    startAdRotation(ads) {
        if (ads.length <= 1) return;
        
        let currentIndex = 0;
        
        this.rotationTimer = setInterval(() => {
            // 현재 광고 숨김
            const currentAd = this.activeAds.get(ads[currentIndex].id);
            if (currentAd) {
                currentAd.element.style.opacity = '0.7';
            }
            
            // 다음 광고로 이동
            currentIndex = (currentIndex + 1) % ads.length;
            
            // 다음 광고 강조
            const nextAd = this.activeAds.get(ads[currentIndex].id);
            if (nextAd) {
                nextAd.element.style.opacity = '1';
                nextAd.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
        }, this.options.defaultAdDuration);
    }

    /**
     * 새로고침 스케줄러 시작
     */
    startRefreshScheduler() {
        this.refreshTimer = setInterval(async () => {
            console.log('🔄 광고 새로고침');
            
            // 기존 광고 제거
            this.clearActiveAds();
            
            // 새 광고 로드 및 표시
            await this.displayInitialAds();
            
        }, this.options.refreshInterval);
    }

    /**
     * 분석 시스템 시작
     */
    startAnalyticsSystem() {
        this.analyticsTimer = setInterval(() => {
            this.sendAnalyticsData();
        }, 5 * 60 * 1000); // 5분마다
    }

    /**
     * 유틸리티 메서드들
     */

    // 활성 광고 제거
    clearActiveAds() {
        this.activeAds.forEach((ad, adId) => {
            ad.element.remove();
        });
        this.activeAds.clear();
    }

    // 광고 노출 기록
    recordAdImpression(adData) {
        const impressionId = `${adData.id}-${Date.now()}`;
        this.adHistory.set(impressionId, {
            adId: adData.id,
            category: adData.category,
            type: 'impression',
            timestamp: new Date().toISOString()
        });
    }

    // 광고 클릭 기록
    recordAdClick(adData) {
        const clickId = `${adData.id}-click-${Date.now()}`;
        this.adHistory.set(clickId, {
            adId: adData.id,
            category: adData.category,
            type: 'click',
            timestamp: new Date().toISOString()
        });
        
        // Supabase에 기록
        if (this.supabase) {
            const currentUser = this.auth?.getCurrentUser();
            this.supabase.insert('ad_analytics', {
                user_id: currentUser?.id,
                ad_id: adData.id,
                category: adData.category,
                action: 'click',
                timestamp: new Date().toISOString()
            });
        }
    }

    // 클릭 통계 업데이트
    updateClickStats(adData) {
        const key = `${adData.category}-${adData.id}`;
        const currentCount = this.clickStats.get(key) || 0;
        this.clickStats.set(key, currentCount + 1);
    }

    // 사용자 선호도 업데이트
    updateUserPreferences(adData) {
        const currentUser = this.auth?.getCurrentUser();
        if (!currentUser) return;
        
        const userPrefs = this.userPreferences.get(currentUser.id) || {
            preferredCategories: [],
            blockedCategories: [],
            clickHistory: {}
        };
        
        // 클릭한 카테고리를 선호 카테고리에 추가
        if (!userPrefs.preferredCategories.includes(adData.category)) {
            userPrefs.preferredCategories.push(adData.category);
        }
        
        // 클릭 히스토리 업데이트
        userPrefs.clickHistory[adData.category] = (userPrefs.clickHistory[adData.category] || 0) + 1;
        userPrefs.lastAdInteraction = new Date().toISOString();
        
        this.userPreferences.set(currentUser.id, userPrefs);
        this.saveUserPreferences();
    }

    // 사용자 선호도 저장
    saveUserPreferences() {
        const currentUser = this.auth?.getCurrentUser();
        if (!currentUser) return;
        
        const userPrefs = this.userPreferences.get(currentUser.id);
        if (!userPrefs) return;
        
        // 로컬 저장소에 저장
        localStorage.setItem(`user-ad-prefs-${currentUser.id}`, JSON.stringify({
            preferred: userPrefs.preferredCategories,
            blocked: userPrefs.blockedCategories,
            clicks: userPrefs.clickHistory,
            lastInteraction: userPrefs.lastAdInteraction
        }));
        
        // Supabase에 저장
        if (this.supabase) {
            this.supabase.upsert('user_ad_preferences', {
                user_id: currentUser.id,
                preferred_categories: userPrefs.preferredCategories,
                blocked_categories: userPrefs.blockedCategories,
                click_history: userPrefs.clickHistory,
                last_interaction: userPrefs.lastAdInteraction,
                updated_at: new Date().toISOString()
            });
        }
    }

    // 분석 데이터 전송
    sendAnalyticsData() {
        if (!this.options.enableAnalytics) return;
        
        const analyticsData = {
            timestamp: new Date().toISOString(),
            activeAds: this.activeAds.size,
            totalImpressions: Array.from(this.adHistory.values()).filter(h => h.type === 'impression').length,
            totalClicks: Array.from(this.adHistory.values()).filter(h => h.type === 'click').length,
            categoryStats: this.getCategoryStats()
        };
        
        this.dispatchEvent(new CustomEvent('ad:analytics', {
            detail: analyticsData
        }));
    }

    // 카테고리별 통계
    getCategoryStats() {
        const stats = {};
        
        Object.keys(this.adCategories).forEach(category => {
            stats[category] = {
                impressions: Array.from(this.adHistory.values()).filter(h => h.category === category && h.type === 'impression').length,
                clicks: Array.from(this.adHistory.values()).filter(h => h.category === category && h.type === 'click').length
            };
        });
        
        return stats;
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 페이지 가시성 변화
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 백그라운드로 갈 때 타이머 정지
                if (this.rotationTimer) {
                    clearInterval(this.rotationTimer);
                    this.rotationTimer = null;
                }
            } else {
                // 포그라운드로 돌아왔을 때 타이머 재시작
                if (this.activeAds.size > 1) {
                    this.startAdRotation(Array.from(this.activeAds.values()).map(ad => ad.data));
                }
            }
        });

        // 관리자 광고 설정 변경 감지
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.includes('admin-ads')) {
                console.log('🔧 관리자 광고 설정 변경 감지 - 새로고침');
                setTimeout(() => {
                    this.loadAdminAds().then(() => {
                        this.clearActiveAds();
                        this.displayInitialAds();
                    });
                }, 1000);
            }
        });

        console.log('👂 AdBanner 이벤트 리스너 설정 완료');
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            activeAds: this.activeAds.size,
            totalCategories: Object.keys(this.adCategories).length,
            adHistory: this.adHistory.size,
            userPreferences: this.userPreferences.size,
            refreshSchedulerActive: !!this.refreshTimer,
            rotationActive: !!this.rotationTimer
        };
    }

    /**
     * 관리자용 메서드들
     */

    // 광고 카테고리 추가
    addAdCategory(categoryKey, categoryData) {
        this.adCategories[categoryKey] = {
            ...categoryData,
            adminAds: [],
            defaultAds: categoryData.defaultAds || []
        };
        
        this.dispatchEvent(new CustomEvent('ad:category-added', {
            detail: { categoryKey, categoryData }
        }));
    }

    // 특정 카테고리 광고 새로고침
    async refreshCategoryAds(category) {
        // 해당 카테고리 광고 제거
        Array.from(this.activeAds.values()).forEach(ad => {
            if (ad.data.category === category) {
                this.closeAd(ad.data.id);
            }
        });
        
        // 새 광고 표시
        await this.displayInitialAds();
    }

    // 전체 광고 시스템 재시작
    async restart() {
        this.destroy();
        await this.init();
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        // 타이머 정리
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
        
        if (this.analyticsTimer) {
            clearInterval(this.analyticsTimer);
            this.analyticsTimer = null;
        }
        
        // 활성 광고 제거
        this.clearActiveAds();
        
        // DOM 요소 제거
        if (this.bannersContainer) {
            this.bannersContainer.remove();
            this.bannersContainer = null;
        }
        
        // 데이터 정리
        this.adHistory.clear();
        this.clickStats.clear();
        this.userPreferences.clear();
        
        this.isInitialized = false;
        
        console.log('🗑️ AdBannerComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.AdBannerComponent = AdBannerComponent;
    
    // 🚨 전역 인스턴스 자동 생성 완전 비활성화 (페이지별 분리를 위해)
    // 오류 방지를 위한 안전한 더미 함수들 등록
    if (!window.adBannerComponent) {
        window.adBannerComponent = {
            closeAd: function(adId) {
                console.log('📢 closeAd 호출됨, 하지만 광고 페이지가 아니므로 무시:', adId);
            },
            init: function() {
                console.log('📢 더미 AdBannerComponent init 호출됨 - 광고 페이지에서만 실제 초기화됨');
                return Promise.resolve();
            },
            displayInitialAds: function() {
                console.log('📢 더미 AdBannerComponent displayInitialAds 호출됨 - 광고 페이지가 아님');
                return Promise.resolve();
            },
            destroy: function() {
                console.log('📢 더미 AdBannerComponent destroy 호출됨');
                return Promise.resolve();
            },
            isInitialized: false,
            isDummy: true // 더미 객체임을 표시
        };
    }
    console.log('✅ AdBannerComponent 페이지별 분리 모드 활성화 (UI 오염 방지)');
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdBannerComponent;
}