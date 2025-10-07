/**
 * ProfileComponent v1.0
 * 사용자 프로필 관리 시스템을 담당하는 독립 컴포넌트
 * 
 * 프로필 정보 관리, 이미지 업로드, 개인 설정, 응급 연락처 관리
 * 카카오 인증과 연동한 프로필 정보 동기화
 */

class ProfileComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            autoInit: true,
            enableImageUpload: true,
            enableEmergencyContacts: true,
            enablePrivacySettings: true,
            enableDataExport: true,
            maxImageSize: 5 * 1024 * 1024, // 5MB
            allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
            cacheExpiry: 30 * 60 * 1000, // 30분
            debug: options.debug || false,
            ...options
        };

        // 프로필 데이터 구조
        this.profileData = {
            // 기본 정보
            userId: null,
            name: '',
            email: '',
            phone: '',
            birthDate: '',
            gender: '',
            
            // 프로필 이미지
            profileImage: null,
            profileImageUrl: '',
            
            // 추가 정보
            address: '',
            medicalInfo: '',
            allergies: '',
            medications: '',
            
            // 응급 연락처
            emergencyContacts: [
                { name: '', phone: '', relationship: '' },
                { name: '', phone: '', relationship: '' },
                { name: '', phone: '', relationship: '' }
            ],
            
            // 개인 설정
            privacySettings: {
                shareLocationWithFriends: true,
                allowFriendRequests: true,
                showOnlineStatus: true,
                shareActivityStatus: true,
                allowDataAnalytics: true
            },
            
            // 메타데이터
            createdAt: null,
            updatedAt: null,
            lastSyncedAt: null
        };

        // 상태 관리
        this.isInitialized = false;
        this.isDirty = false; // 변경사항 있는지 추적
        this.isUploading = false;
        this.profileCache = new Map();
        this.validationErrors = new Map();
        
        // UI 요소들
        this.profileForm = null;
        this.imageUploadArea = null;
        this.emergencyContactsContainer = null;
        this.privacySettingsContainer = null;
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        this.kakaoAuth = null;
        
        console.log('👤 ProfileComponent 초기화', this.options);
        
        // 자동 초기화 비활성화 (UI 간섭 방지)
        // if (this.options.autoInit) {
        //     this.init();
        // }
        console.log('⚠️ ProfileComponent 자동 초기화 비활성화됨 (UI 보호)');
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 Profile 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            this.kakaoAuth = window.kakaoAuthComponent;
            
            if (!this.auth) {
                throw new Error('필수 의존성 (Auth)이 준비되지 않았습니다.');
            }
            
            // UI 요소 초기화
            this.initializeUIElements();
            
            // 현재 사용자 프로필 로드
            await this.loadCurrentUserProfile();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 프로필 폼 렌더링
            this.renderProfileForm();
            
            // 자동 저장 설정
            this.setupAutoSave();
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('profile:system-ready', {
                detail: { component: this, userId: this.profileData.userId }
            }));

            console.log('✅ Profile 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ Profile 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('profile:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * UI 요소 초기화
     */
    initializeUIElements() {
        // 프로필 페이지 확인
        const profilePage = document.getElementById('profile-page');
        if (!profilePage) {
            console.warn('프로필 페이지를 찾을 수 없습니다');
            return;
        }

        // 프로필 폼 컨테이너 생성/확인
        this.profileForm = profilePage.querySelector('.profile-form') || this.createProfileForm(profilePage);
        
        // 이미지 업로드 영역
        this.imageUploadArea = this.profileForm?.querySelector('.image-upload-area');
        
        // 응급 연락처 컨테이너
        this.emergencyContactsContainer = this.profileForm?.querySelector('.emergency-contacts');
        
        // 개인정보 설정 컨테이너
        this.privacySettingsContainer = this.profileForm?.querySelector('.privacy-settings');

        console.log('🎨 Profile UI 요소 초기화 완료');
    }

    /**
     * 프로필 폼 생성
     */
    createProfileForm(container) {
        const formHTML = `
            <div class="profile-form">
                <style>
                .profile-form {
                    max-width: 400px;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                }
                
                .profile-section {
                    margin-bottom: 25px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    color: #495057;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .image-upload-area {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .profile-image-preview {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid #74c0fc;
                    margin-bottom: 10px;
                    background: #e9ecef;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 10px auto;
                    color: #6c757d;
                    font-size: 36px;
                    cursor: pointer;
                }
                
                .profile-image-preview.has-image {
                    background: none;
                    font-size: 0;
                }
                
                .image-upload-btn {
                    background: #74c0fc;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin: 0 4px;
                }
                
                .image-upload-btn:hover {
                    background: #4dabf7;
                }
                
                .form-group {
                    margin-bottom: 15px;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #495057;
                    font-size: 13px;
                }
                
                .form-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                
                .form-input:focus {
                    outline: none;
                    border-color: #74c0fc;
                    box-shadow: 0 0 0 2px rgba(116, 192, 252, 0.2);
                }
                
                .form-textarea {
                    min-height: 60px;
                    resize: vertical;
                }
                
                .form-select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 14px;
                    background: white;
                    box-sizing: border-box;
                }
                
                .emergency-contact {
                    background: white;
                    padding: 12px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                    border: 1px solid #dee2e6;
                }
                
                .emergency-contact-header {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #495057;
                    font-size: 13px;
                }
                
                .contact-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                
                .privacy-setting {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                
                .privacy-setting:last-child {
                    border-bottom: none;
                }
                
                .privacy-label {
                    font-size: 13px;
                    color: #495057;
                    flex: 1;
                }
                
                .privacy-toggle {
                    position: relative;
                    width: 40px;
                    height: 20px;
                    background: #ccc;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                
                .privacy-toggle.active {
                    background: #74c0fc;
                }
                
                .privacy-toggle::after {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.3s;
                }
                
                .privacy-toggle.active::after {
                    transform: translateX(20px);
                }
                
                .save-btn {
                    background: #74c0fc;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    width: 100%;
                    margin-top: 20px;
                }
                
                .save-btn:hover {
                    background: #4dabf7;
                }
                
                .save-btn:disabled {
                    background: #6c757d;
                    cursor: not-allowed;
                }
                
                .error-message {
                    color: #dc3545;
                    font-size: 12px;
                    margin-top: 4px;
                }
                
                .success-message {
                    color: #28a745;
                    font-size: 12px;
                    margin-top: 4px;
                }
                
                .loading-indicator {
                    display: none;
                    text-align: center;
                    padding: 20px;
                    color: #6c757d;
                }
                
                .loading-indicator.show {
                    display: block;
                }
                
                @media (max-width: 480px) {
                    .contact-row {
                        grid-template-columns: 1fr;
                    }
                }
                </style>
                
                <div class="loading-indicator" id="profile-loading">
                    📄 프로필 정보를 불러오는 중...
                </div>
                
                <div class="profile-content" id="profile-content" style="display: none;">
                    <!-- 프로필 이미지 섹션 -->
                    <div class="profile-section">
                        <div class="section-title">
                            <span>📷</span> 프로필 이미지
                        </div>
                        <div class="image-upload-area">
                            <div class="profile-image-preview" id="profile-image-preview">
                                👤
                            </div>
                            <div>
                                <input type="file" id="profile-image-input" accept="image/*" style="display: none;">
                                <button class="image-upload-btn" onclick="document.getElementById('profile-image-input').click()">
                                    이미지 선택
                                </button>
                                <button class="image-upload-btn" onclick="window.profileComponent.removeProfileImage()">
                                    제거
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 기본 정보 섹션 -->
                    <div class="profile-section">
                        <div class="section-title">
                            <span>👤</span> 기본 정보
                        </div>
                        <div class="form-group">
                            <label class="form-label">이름</label>
                            <input type="text" class="form-input" id="profile-name" placeholder="이름을 입력하세요">
                        </div>
                        <div class="form-group">
                            <label class="form-label">이메일</label>
                            <input type="email" class="form-input" id="profile-email" placeholder="이메일을 입력하세요">
                        </div>
                        <div class="form-group">
                            <label class="form-label">전화번호</label>
                            <input type="tel" class="form-input" id="profile-phone" placeholder="010-0000-0000">
                        </div>
                        <div class="form-group">
                            <label class="form-label">생년월일</label>
                            <input type="date" class="form-input" id="profile-birth-date">
                        </div>
                        <div class="form-group">
                            <label class="form-label">성별</label>
                            <select class="form-select" id="profile-gender">
                                <option value="">선택하세요</option>
                                <option value="male">남성</option>
                                <option value="female">여성</option>
                                <option value="other">기타</option>
                            </select>
                        </div>
                    </div>

                    <!-- 추가 정보 섹션 -->
                    <div class="profile-section">
                        <div class="section-title">
                            <span>📍</span> 추가 정보
                        </div>
                        <div class="form-group">
                            <label class="form-label">주소</label>
                            <textarea class="form-input form-textarea" id="profile-address" placeholder="주소를 입력하세요"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">의료 정보</label>
                            <textarea class="form-input form-textarea" id="profile-medical-info" placeholder="특별한 의료 정보가 있다면 입력하세요"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">알레르기</label>
                            <textarea class="form-input form-textarea" id="profile-allergies" placeholder="알레르기가 있다면 입력하세요"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">복용 중인 약물</label>
                            <textarea class="form-input form-textarea" id="profile-medications" placeholder="복용 중인 약물이 있다면 입력하세요"></textarea>
                        </div>
                    </div>

                    <!-- 응급 연락처 섹션 -->
                    <div class="profile-section">
                        <div class="section-title">
                            <span>🚨</span> 응급 연락처
                        </div>
                        <div class="emergency-contacts" id="emergency-contacts-container">
                            <!-- 응급 연락처들이 여기에 동적 생성됨 -->
                        </div>
                    </div>

                    <!-- 개인정보 설정 섹션 -->
                    <div class="profile-section">
                        <div class="section-title">
                            <span>🔒</span> 개인정보 설정
                        </div>
                        <div class="privacy-settings" id="privacy-settings-container">
                            <!-- 개인정보 설정들이 여기에 동적 생성됨 -->
                        </div>
                    </div>

                    <!-- 저장 버튼 -->
                    <button class="save-btn" id="profile-save-btn" disabled>
                        💾 프로필 저장
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = formHTML;
        return container.querySelector('.profile-form');
    }

    /**
     * 현재 사용자 프로필 로드
     */
    async loadCurrentUserProfile() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                throw new Error('현재 로그인된 사용자가 없습니다.');
            }

            console.log('👤 사용자 프로필 로딩 중...', currentUser.id);

            this.profileData.userId = currentUser.id;

            // Supabase에서 프로필 정보 로드
            if (this.supabase) {
                const profileResult = await this.supabase.query('user_profiles', {
                    eq: { user_id: currentUser.id },
                    single: true
                });

                if (profileResult.data && !profileResult.error) {
                    this.mergeProfileData(profileResult.data);
                    console.log('✅ Supabase에서 프로필 정보 로드 완료');
                }
            }

            // 카카오 프로필 정보와 동기화
            await this.syncWithKakaoProfile();

            // 로컬 저장소에서 추가 정보 로드
            const localProfile = JSON.parse(localStorage.getItem(`profile-data-${currentUser.id}`) || '{}');
            if (Object.keys(localProfile).length > 0) {
                this.mergeProfileData(localProfile);
                console.log('📱 로컬 저장소에서 프로필 정보 보완');
            }

            // 프로필 캐시 업데이트
            this.profileCache.set(currentUser.id, { ...this.profileData });

            this.dispatchEvent(new CustomEvent('profile:loaded', {
                detail: { profileData: this.profileData }
            }));

        } catch (error) {
            console.error('❌ 프로필 로드 실패:', error);
            this.dispatchEvent(new CustomEvent('profile:load-error', {
                detail: { error }
            }));
        }
    }

    /**
     * 카카오 프로필과 동기화
     */
    async syncWithKakaoProfile() {
        try {
            if (!this.kakaoAuth) return;

            const kakaoProfile = this.kakaoAuth.getKakaoProfile();
            if (kakaoProfile) {
                // 이름 동기화 (비어있는 경우만)
                if (!this.profileData.name && kakaoProfile.nickname) {
                    this.profileData.name = kakaoProfile.nickname;
                }

                // 이메일 동기화 (비어있는 경우만)
                if (!this.profileData.email && kakaoProfile.email) {
                    this.profileData.email = kakaoProfile.email;
                }

                // 프로필 이미지 동기화 (비어있는 경우만)
                if (!this.profileData.profileImageUrl && kakaoProfile.profile_image_url) {
                    this.profileData.profileImageUrl = kakaoProfile.profile_image_url;
                }

                console.log('🔄 카카오 프로필 동기화 완료');
            }
        } catch (error) {
            console.warn('⚠️ 카카오 프로필 동기화 실패:', error);
        }
    }

    /**
     * 프로필 데이터 병합
     */
    mergeProfileData(newData) {
        // 기본 정보
        if (newData.name) this.profileData.name = newData.name;
        if (newData.email) this.profileData.email = newData.email;
        if (newData.phone) this.profileData.phone = newData.phone;
        if (newData.birth_date) this.profileData.birthDate = newData.birth_date;
        if (newData.gender) this.profileData.gender = newData.gender;
        if (newData.address) this.profileData.address = newData.address;
        if (newData.medical_info) this.profileData.medicalInfo = newData.medical_info;
        if (newData.allergies) this.profileData.allergies = newData.allergies;
        if (newData.medications) this.profileData.medications = newData.medications;

        // 프로필 이미지
        if (newData.profile_image_url) this.profileData.profileImageUrl = newData.profile_image_url;

        // 응급 연락처
        if (newData.emergency_contacts) {
            this.profileData.emergencyContacts = newData.emergency_contacts;
        }

        // 개인정보 설정
        if (newData.privacy_settings) {
            this.profileData.privacySettings = { ...this.profileData.privacySettings, ...newData.privacy_settings };
        }

        // 메타데이터
        if (newData.created_at) this.profileData.createdAt = newData.created_at;
        if (newData.updated_at) this.profileData.updatedAt = newData.updated_at;

        this.profileData.lastSyncedAt = new Date().toISOString();
    }

    /**
     * 프로필 폼 렌더링
     */
    renderProfileForm() {
        try {
            console.log('🎨 프로필 폼 렌더링 시작');

            // 로딩 숨기기, 컨텐츠 표시
            const loadingEl = document.getElementById('profile-loading');
            const contentEl = document.getElementById('profile-content');
            
            if (loadingEl) loadingEl.classList.remove('show');
            if (contentEl) contentEl.style.display = 'block';

            // 기본 정보 렌더링
            this.renderBasicInfo();

            // 프로필 이미지 렌더링
            this.renderProfileImage();

            // 응급 연락처 렌더링
            this.renderEmergencyContacts();

            // 개인정보 설정 렌더링
            this.renderPrivacySettings();

            console.log('✅ 프로필 폼 렌더링 완료');

        } catch (error) {
            console.error('❌ 프로필 폼 렌더링 실패:', error);
        }
    }

    /**
     * 기본 정보 렌더링
     */
    renderBasicInfo() {
        const fields = {
            'profile-name': this.profileData.name,
            'profile-email': this.profileData.email,
            'profile-phone': this.profileData.phone,
            'profile-birth-date': this.profileData.birthDate,
            'profile-gender': this.profileData.gender,
            'profile-address': this.profileData.address,
            'profile-medical-info': this.profileData.medicalInfo,
            'profile-allergies': this.profileData.allergies,
            'profile-medications': this.profileData.medications
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
            }
        });
    }

    /**
     * 프로필 이미지 렌더링
     */
    renderProfileImage() {
        const imagePreview = document.getElementById('profile-image-preview');
        if (!imagePreview) return;

        if (this.profileData.profileImageUrl) {
            imagePreview.innerHTML = `<img src="${this.profileData.profileImageUrl}" alt="프로필 이미지" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            imagePreview.classList.add('has-image');
        } else {
            imagePreview.innerHTML = '👤';
            imagePreview.classList.remove('has-image');
        }
    }

    /**
     * 응급 연락처 렌더링
     */
    renderEmergencyContacts() {
        const container = document.getElementById('emergency-contacts-container');
        if (!container) return;

        container.innerHTML = this.profileData.emergencyContacts.map((contact, index) => `
            <div class="emergency-contact">
                <div class="emergency-contact-header">연락처 ${index + 1}</div>
                <div class="contact-row">
                    <input type="text" class="form-input" placeholder="이름" 
                           data-contact="${index}" data-field="name" value="${contact.name || ''}">
                    <input type="text" class="form-input" placeholder="관계" 
                           data-contact="${index}" data-field="relationship" value="${contact.relationship || ''}">
                </div>
                <input type="tel" class="form-input" placeholder="전화번호" 
                       data-contact="${index}" data-field="phone" value="${contact.phone || ''}">
            </div>
        `).join('');

        // 응급 연락처 입력 이벤트 리스너 추가
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const contactIndex = parseInt(e.target.getAttribute('data-contact'));
                const field = e.target.getAttribute('data-field');
                this.profileData.emergencyContacts[contactIndex][field] = e.target.value;
                this.markAsDirty();
            });
        });
    }

    /**
     * 개인정보 설정 렌더링
     */
    renderPrivacySettings() {
        const container = document.getElementById('privacy-settings-container');
        if (!container) return;

        const settings = [
            { key: 'shareLocationWithFriends', label: '친구들과 위치 정보 공유' },
            { key: 'allowFriendRequests', label: '친구 요청 허용' },
            { key: 'showOnlineStatus', label: '온라인 상태 표시' },
            { key: 'shareActivityStatus', label: '활동 상태 공유' },
            { key: 'allowDataAnalytics', label: '데이터 분석 허용' }
        ];

        container.innerHTML = settings.map(setting => `
            <div class="privacy-setting">
                <div class="privacy-label">${setting.label}</div>
                <div class="privacy-toggle ${this.profileData.privacySettings[setting.key] ? 'active' : ''}" 
                     data-setting="${setting.key}">
                </div>
            </div>
        `).join('');

        // 개인정보 설정 토글 이벤트 리스너 추가
        container.querySelectorAll('.privacy-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const settingKey = e.target.getAttribute('data-setting');
                const isActive = e.target.classList.contains('active');
                
                e.target.classList.toggle('active');
                this.profileData.privacySettings[settingKey] = !isActive;
                this.markAsDirty();
            });
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 기본 정보 입력 필드들
        const inputFields = [
            'profile-name', 'profile-email', 'profile-phone', 
            'profile-birth-date', 'profile-gender', 'profile-address',
            'profile-medical-info', 'profile-allergies', 'profile-medications'
        ];

        inputFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', (e) => {
                    this.updateProfileField(fieldId, e.target.value);
                });
            }
        });

        // 프로필 이미지 업로드
        const imageInput = document.getElementById('profile-image-input');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files[0]);
            });
        }

        // 저장 버튼
        const saveBtn = document.getElementById('profile-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }

        // 전화번호 포맷팅
        const phoneFields = document.querySelectorAll('input[type="tel"]');
        phoneFields.forEach(field => {
            field.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });
        });

        console.log('👂 Profile 이벤트 리스너 설정 완료');
    }

    /**
     * 프로필 필드 업데이트
     */
    updateProfileField(fieldId, value) {
        const fieldMap = {
            'profile-name': 'name',
            'profile-email': 'email',
            'profile-phone': 'phone',
            'profile-birth-date': 'birthDate',
            'profile-gender': 'gender',
            'profile-address': 'address',
            'profile-medical-info': 'medicalInfo',
            'profile-allergies': 'allergies',
            'profile-medications': 'medications'
        };

        const profileKey = fieldMap[fieldId];
        if (profileKey) {
            this.profileData[profileKey] = value;
            this.markAsDirty();
            
            // 실시간 유효성 검사
            this.validateField(fieldId, value);
        }
    }

    /**
     * 변경사항 표시
     */
    markAsDirty() {
        this.isDirty = true;
        const saveBtn = document.getElementById('profile-save-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 프로필 저장 (변경됨)';
        }

        this.dispatchEvent(new CustomEvent('profile:changed', {
            detail: { profileData: this.profileData }
        }));
    }

    /**
     * 이미지 업로드 처리
     */
    async handleImageUpload(file) {
        try {
            if (!file) return;

            // 파일 유효성 검사
            if (!this.validateImageFile(file)) {
                return;
            }

            this.isUploading = true;
            const saveBtn = document.getElementById('profile-save-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = '📤 이미지 업로드 중...';
            }

            // 이미지 미리보기
            const reader = new FileReader();
            reader.onload = (e) => {
                const imagePreview = document.getElementById('profile-image-preview');
                if (imagePreview) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="프로필 이미지" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                    imagePreview.classList.add('has-image');
                }
            };
            reader.readAsDataURL(file);

            // Supabase Storage에 업로드 (설정된 경우)
            let uploadedImageUrl = null;
            if (this.supabase && this.supabase.uploadImage) {
                const uploadResult = await this.supabase.uploadImage(
                    'profile-images',
                    `${this.profileData.userId}-${Date.now()}.${file.type.split('/')[1]}`,
                    file
                );

                if (uploadResult.data) {
                    uploadedImageUrl = uploadResult.data.publicUrl;
                }
            }

            // Base64로 로컬 저장소에 저장 (백업용)
            if (!uploadedImageUrl) {
                uploadedImageUrl = await this.fileToBase64(file);
            }

            this.profileData.profileImageUrl = uploadedImageUrl;
            this.markAsDirty();

            this.dispatchEvent(new CustomEvent('profile:image-uploaded', {
                detail: { imageUrl: uploadedImageUrl }
            }));

            console.log('✅ 프로필 이미지 업로드 완료');

        } catch (error) {
            console.error('❌ 이미지 업로드 실패:', error);
            alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        } finally {
            this.isUploading = false;
            const saveBtn = document.getElementById('profile-save-btn');
            if (saveBtn && this.isDirty) {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 프로필 저장 (변경됨)';
            }
        }
    }

    /**
     * 프로필 이미지 제거
     */
    removeProfileImage() {
        this.profileData.profileImageUrl = '';
        this.renderProfileImage();
        this.markAsDirty();

        this.dispatchEvent(new CustomEvent('profile:image-removed'));
    }

    /**
     * 프로필 저장
     */
    async saveProfile() {
        try {
            console.log('💾 프로필 저장 시작');

            const saveBtn = document.getElementById('profile-save-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = '💾 저장 중...';
            }

            // 유효성 검사
            if (!this.validateProfile()) {
                throw new Error('프로필 유효성 검사 실패');
            }

            // Supabase에 저장
            if (this.supabase) {
                const profileDataForDB = {
                    user_id: this.profileData.userId,
                    name: this.profileData.name,
                    email: this.profileData.email,
                    phone: this.profileData.phone,
                    birth_date: this.profileData.birthDate,
                    gender: this.profileData.gender,
                    address: this.profileData.address,
                    medical_info: this.profileData.medicalInfo,
                    allergies: this.profileData.allergies,
                    medications: this.profileData.medications,
                    profile_image_url: this.profileData.profileImageUrl,
                    emergency_contacts: this.profileData.emergencyContacts,
                    privacy_settings: this.profileData.privacySettings,
                    updated_at: new Date().toISOString()
                };

                const result = await this.supabase.upsert('user_profiles', profileDataForDB);
                if (result.error) {
                    throw new Error('데이터베이스 저장 실패: ' + result.error.message);
                }
            }

            // 로컬 저장소에 백업 저장
            localStorage.setItem(
                `profile-data-${this.profileData.userId}`,
                JSON.stringify(this.profileData)
            );

            // 캐시 업데이트
            this.profileCache.set(this.profileData.userId, { ...this.profileData });

            this.isDirty = false;
            this.profileData.updatedAt = new Date().toISOString();

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = '✅ 저장 완료';
                setTimeout(() => {
                    saveBtn.textContent = '💾 프로필 저장';
                }, 2000);
            }

            this.dispatchEvent(new CustomEvent('profile:saved', {
                detail: { profileData: this.profileData }
            }));

            console.log('✅ 프로필 저장 완료');

        } catch (error) {
            console.error('❌ 프로필 저장 실패:', error);
            
            const saveBtn = document.getElementById('profile-save-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 프로필 저장 (변경됨)';
            }

            alert('프로필 저장에 실패했습니다: ' + error.message);

            this.dispatchEvent(new CustomEvent('profile:save-error', {
                detail: { error }
            }));
        }
    }

    /**
     * 자동 저장 설정
     */
    setupAutoSave() {
        // 5분마다 자동 저장 (변경사항이 있는 경우만)
        setInterval(() => {
            if (this.isDirty && !this.isUploading) {
                console.log('🔄 자동 저장 실행');
                this.saveProfile();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * 유틸리티 메서드들
     */

    // 프로필 유효성 검사
    validateProfile() {
        this.validationErrors.clear();

        // 필수 필드 검사
        if (!this.profileData.name?.trim()) {
            this.validationErrors.set('name', '이름은 필수 항목입니다.');
        }

        if (this.profileData.email && !this.isValidEmail(this.profileData.email)) {
            this.validationErrors.set('email', '올바른 이메일 형식이 아닙니다.');
        }

        if (this.profileData.phone && !this.isValidPhoneNumber(this.profileData.phone)) {
            this.validationErrors.set('phone', '올바른 전화번호 형식이 아닙니다.');
        }

        return this.validationErrors.size === 0;
    }

    // 개별 필드 유효성 검사
    validateField(fieldId, value) {
        const errorElement = document.querySelector(`#${fieldId} + .error-message`);
        if (errorElement) errorElement.remove();

        let isValid = true;
        let errorMessage = '';

        switch (fieldId) {
            case 'profile-email':
                if (value && !this.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = '올바른 이메일 형식이 아닙니다.';
                }
                break;
            case 'profile-phone':
                if (value && !this.isValidPhoneNumber(value)) {
                    isValid = false;
                    errorMessage = '올바른 전화번호 형식이 아닙니다.';
                }
                break;
        }

        if (!isValid) {
            const field = document.getElementById(fieldId);
            if (field) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = errorMessage;
                field.parentNode.appendChild(errorDiv);
            }
        }

        return isValid;
    }

    // 이미지 파일 유효성 검사
    validateImageFile(file) {
        if (file.size > this.options.maxImageSize) {
            alert(`이미지 크기가 너무 큽니다. ${this.options.maxImageSize / (1024 * 1024)}MB 이하의 파일을 선택해주세요.`);
            return false;
        }

        if (!this.options.allowedImageTypes.includes(file.type)) {
            alert('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP 파일만 업로드할 수 있습니다.');
            return false;
        }

        return true;
    }

    // 이메일 유효성 검사
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 전화번호 유효성 검사
    isValidPhoneNumber(phone) {
        const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
        return phoneRegex.test(phone.replace(/-/g, ''));
    }

    // 전화번호 포맷팅
    formatPhoneNumber(value) {
        const numbers = value.replace(/[^\d]/g, '');
        
        if (numbers.length <= 3) {
            return numbers;
        } else if (numbers.length <= 7) {
            return numbers.slice(0, 3) + '-' + numbers.slice(3);
        } else if (numbers.length <= 11) {
            return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7);
        } else {
            return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11);
        }
    }

    // 파일을 Base64로 변환
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            userId: this.profileData.userId,
            isDirty: this.isDirty,
            isUploading: this.isUploading,
            validationErrors: Object.fromEntries(this.validationErrors),
            lastUpdated: this.profileData.updatedAt,
            cacheSize: this.profileCache.size
        };
    }

    /**
     * 프로필 데이터 내보내기
     */
    exportProfileData() {
        const exportData = {
            ...this.profileData,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `profile-${this.profileData.userId}-${new Date().toISOString().split('T')[0]}.json`;
        downloadLink.click();

        URL.revokeObjectURL(url);

        this.dispatchEvent(new CustomEvent('profile:exported', {
            detail: { exportData }
        }));
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        // 프로필 데이터 정리 (민감 정보 제거)
        this.profileData = null;
        this.profileCache.clear();
        this.validationErrors.clear();

        // UI 요소 참조 제거
        this.profileForm = null;
        this.imageUploadArea = null;
        this.emergencyContactsContainer = null;
        this.privacySettingsContainer = null;

        this.isInitialized = false;
        this.isDirty = false;
        this.isUploading = false;

        console.log('🗑️ ProfileComponent 정리 완료');
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.ProfileComponent = ProfileComponent;
    
    // 즉시 인스턴스 생성 비활성화 (UI 간섭 방지)
    // if (!window.profileComponent) {
    //     window.profileComponent = new ProfileComponent({ autoInit: false });
    //     
    //     console.log('🌐 ProfileComponent 전역 등록 완료');
    // }
    console.log('⚠️ ProfileComponent 자동 인스턴스 생성 비활성화됨 (UI 보호)');
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileComponent;
}