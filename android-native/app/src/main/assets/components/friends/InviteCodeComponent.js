/**
 * InviteCodeComponent v1.0
 * 초대 코드 시스템을 담당하는 독립 컴포넌트
 * 
 * 기존 invite-code.js 기능을 래핑하여 컴포넌트화
 * 코드 생성/관리/검증, QR코드, 공유 기능 등의 고급 기능 제공
 */

class InviteCodeComponent extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.options = {
            codeLength: 6,
            codeExpireDays: 30,
            autoRefresh: true,
            enableQR: true,
            enableShare: true,
            maxUsageCount: 50, // 한 코드로 최대 50명까지
            debug: options.debug || false,
            ...options
        };

        // 상태 관리
        this.myInviteCode = null;
        this.codeData = null; // 코드의 상세 정보 (만료일, 사용횟수 등)
        this.isInitialized = false;
        this.isLoading = false;
        
        // 의존성 컴포넌트
        this.storage = null;
        this.supabase = null;
        this.auth = null;
        
        // 기존 InviteCodeManager 참조 (호환성)
        this.legacyManager = null;
        
        console.log('🎫 InviteCodeComponent 초기화', this.options);
        
        // 자동 초기화 비활성화 (UI 간섭 방지)
        // this.init();
        console.log('⚠️ InviteCodeComponent 자동 초기화 비활성화됨 (UI 보호)');
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            console.log('🚀 InviteCode 초기화 시작');
            
            // 의존성 컴포넌트 연결
            this.storage = window.storageComponent || window.storage;
            this.supabase = window.supabaseComponent;
            this.auth = window.auth;
            
            if (!this.storage || !this.auth) {
                throw new Error('필수 의존성 (Storage, Auth)이 준비되지 않았습니다.');
            }
            
            // 기존 InviteCodeManager 참조 (호환성)
            if (window.inviteCodeManager) {
                this.legacyManager = window.inviteCodeManager;
            }
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 코드 로드
            await this.loadMyInviteCode();
            
            this.isInitialized = true;
            this.dispatchEvent(new CustomEvent('invite:ready', {
                detail: { component: this, inviteCode: this.myInviteCode }
            }));

            console.log('✅ InviteCode 초기화 완료');
            return true;

        } catch (error) {
            console.error('❌ InviteCode 초기화 실패:', error);
            this.dispatchEvent(new CustomEvent('invite:init-error', {
                detail: { error }
            }));
            return false;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 초대코드 복사 버튼
        const copyBtn = document.getElementById('copy-invite-code');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyInviteCode();
            });
        }

        // 새 초대코드 생성 버튼
        const generateBtn = document.getElementById('generate-new-code');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateNewInviteCode();
            });
        }

        // 친구 초대코드 입력 후 추가 버튼
        const addByCodeBtn = document.getElementById('add-by-invite-code');
        if (addByCodeBtn) {
            addByCodeBtn.addEventListener('click', () => {
                this.addFriendByCode();
            });
        }

        // 친구 초대코드 입력 (엔터키 지원)
        const friendCodeInput = document.getElementById('friend-invite-code');
        if (friendCodeInput) {
            friendCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addFriendByCode();
                }
            });

            // 입력시 자동 대문자 변환 및 형식 검증
            friendCodeInput.addEventListener('input', (e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value !== e.target.value) {
                    e.target.value = value;
                }
                
                // 실시간 코드 검증
                this.validateCodeFormat(value);
            });
        }

        // QR 코드 표시 버튼
        const qrBtn = document.getElementById('show-qr-code');
        if (qrBtn && this.options.enableQR) {
            qrBtn.addEventListener('click', () => {
                this.showQRCode();
            });
        }

        // 초대코드 공유 버튼
        const shareBtn = document.getElementById('share-invite-code');
        if (shareBtn && this.options.enableShare) {
            shareBtn.addEventListener('click', () => {
                this.shareInviteCode();
            });
        }

        console.log('👂 InviteCode 이벤트 리스너 설정 완료');
    }

    /**
     * 나의 초대코드 로드
     */
    async loadMyInviteCode() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                console.log('로그인되지 않음 - 초대코드 로드 건너뜀');
                return { success: false, error: 'Not logged in' };
            }

            console.log('📥 초대코드 로드 중...');
            this.setLoadingState(true);

            // 데이터베이스에서 기존 초대코드 조회
            if (this.supabase && this.supabase.client) {
                const codeResult = await this.supabase.query('user_invite_codes', {
                    eq: { 
                        user_id: currentUser.id,
                        is_active: true
                    },
                    gte: {
                        expires_at: new Date().toISOString() // 만료되지 않은 코드만
                    },
                    order: { created_at: 'desc' },
                    single: true
                });

                if (codeResult.data && !codeResult.error) {
                    this.myInviteCode = codeResult.data.invite_code;
                    this.codeData = codeResult.data;
                    console.log('✅ 기존 초대코드 로드:', this.myInviteCode);
                } else {
                    // 초대코드가 없으면 새로 생성
                    console.log('초대코드 없음 - 새로 생성');
                    await this.generateNewInviteCode();
                }
            } else {
                // Supabase 연결이 안 되어 있으면 임시 코드 생성
                this.myInviteCode = this.generateRandomCode();
                console.log('⚠️ 오프라인 - 임시 코드 생성:', this.myInviteCode);
            }

            this.updateCodeDisplay();

            this.dispatchEvent(new CustomEvent('invite:loaded', {
                detail: { inviteCode: this.myInviteCode, codeData: this.codeData }
            }));

            return { success: true, inviteCode: this.myInviteCode };

        } catch (error) {
            console.error('❌ 초대코드 로드 실패:', error);
            
            // 오류 발생시 임시 코드 생성
            this.myInviteCode = this.generateRandomCode();
            this.updateCodeDisplay();
            
            this.dispatchEvent(new CustomEvent('invite:load-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };

        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 새 초대코드 생성
     */
    async generateNewInviteCode() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다.');
            }

            console.log('🎲 새 초대코드 생성 중...');
            this.setLoadingState(true);

            // 새 코드 생성 (중복 확인)
            let newCode;
            let attempts = 0;
            const maxAttempts = 10;

            do {
                newCode = this.generateRandomCode();
                attempts++;
                
                // 중복 확인 (Supabase에서)
                if (this.supabase && this.supabase.client) {
                    const duplicateCheck = await this.supabase.query('user_invite_codes', {
                        eq: { invite_code: newCode, is_active: true }
                    });
                    
                    if (!duplicateCheck.data || duplicateCheck.data.length === 0) {
                        break; // 중복 없음
                    }
                }
            } while (attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                throw new Error('고유한 초대코드 생성에 실패했습니다.');
            }

            // 데이터베이스에 저장
            if (this.supabase && this.supabase.client) {
                // 기존 코드 비활성화
                await this.supabase.update('user_invite_codes', 
                    { is_active: false }, 
                    { user_id: currentUser.id }
                );

                // 새 코드 저장
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + this.options.codeExpireDays);

                const newCodeData = {
                    user_id: currentUser.id,
                    invite_code: newCode,
                    is_active: true,
                    usage_count: 0,
                    max_usage: this.options.maxUsageCount,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt.toISOString()
                };

                const insertResult = await this.supabase.insert('user_invite_codes', newCodeData, {
                    select: '*',
                    single: true
                });

                if (insertResult.error) {
                    throw insertResult.error;
                }

                this.codeData = insertResult.data;
            }

            this.myInviteCode = newCode;
            this.updateCodeDisplay();
            
            this.showNotification('새 초대코드가 생성되었습니다!', 'success');

            this.dispatchEvent(new CustomEvent('invite:generated', {
                detail: { inviteCode: newCode, codeData: this.codeData }
            }));

            console.log('✅ 새 초대코드 생성:', newCode);
            return { success: true, inviteCode: newCode };

        } catch (error) {
            console.error('❌ 초대코드 생성 실패:', error);
            this.showNotification('초대코드 생성에 실패했습니다.', 'error');
            
            this.dispatchEvent(new CustomEvent('invite:generate-error', {
                detail: { error: error.message }
            }));

            return { success: false, error: error.message };

        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 초대코드 복사
     */
    async copyInviteCode() {
        try {
            if (!this.myInviteCode) {
                this.showNotification('초대코드가 없습니다.', 'error');
                return { success: false, error: 'No invite code' };
            }

            console.log('📋 초대코드 복사:', this.myInviteCode);

            // 클립보드에 복사
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(this.myInviteCode);
            } else {
                // 구형 브라우저 지원
                const codeInput = document.getElementById('my-invite-code');
                if (codeInput) {
                    codeInput.select();
                    codeInput.setSelectionRange(0, 99999); // 모바일 지원
                    document.execCommand('copy');
                } else {
                    throw new Error('복사 기능을 사용할 수 없습니다.');
                }
            }

            this.showNotification('초대코드가 복사되었습니다!', 'success');

            this.dispatchEvent(new CustomEvent('invite:copied', {
                detail: { inviteCode: this.myInviteCode }
            }));

            return { success: true };

        } catch (error) {
            console.error('❌ 초대코드 복사 실패:', error);
            this.showNotification('초대코드 복사에 실패했습니다.', 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * 초대코드로 친구 추가
     */
    async addFriendByCode(inviteCode = null) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                throw new Error('로그인이 필요합니다.');
            }

            // 입력 필드에서 코드 가져오기 (파라미터로 전달되지 않은 경우)
            if (!inviteCode) {
                const friendCodeInput = document.getElementById('friend-invite-code');
                if (!friendCodeInput) {
                    throw new Error('초대코드 입력 필드를 찾을 수 없습니다.');
                }
                inviteCode = friendCodeInput.value.trim();
            }

            // 입력 검증
            const validation = this.validateInviteCode(inviteCode);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            const cleanCode = inviteCode.toUpperCase();

            if (cleanCode === this.myInviteCode) {
                throw new Error('자신의 초대코드는 입력할 수 없습니다.');
            }

            console.log('🔍 초대코드로 친구 찾기:', cleanCode);
            this.setAddByCodeLoading(true);

            // 초대코드로 사용자 찾기
            const friendData = await this.findUserByInviteCode(cleanCode);
            if (!friendData) {
                throw new Error('유효하지 않거나 만료된 초대코드입니다.');
            }

            const { user: friendUser, codeInfo } = friendData;

            // 코드 사용 가능 여부 확인
            if (codeInfo.usage_count >= codeInfo.max_usage) {
                throw new Error('이 초대코드는 사용 한도에 도달했습니다.');
            }

            // 이미 친구인지 확인
            if (window.friendsManagerComponent) {
                const alreadyFriend = window.friendsManagerComponent.isFriendAlready(friendUser);
                if (alreadyFriend) {
                    throw new Error('이미 친구로 등록되어 있습니다.');
                }
            }

            // 친구 관계 추가 (FriendsManagerComponent 사용)
            let addResult;
            if (window.friendsManagerComponent) {
                // 고급 친구 추가 로직 사용
                addResult = await this.addFriendViaComponent(friendUser);
            } else {
                // 기존 방식 사용
                addResult = await this.addFriendLegacy(currentUser, friendUser);
            }

            if (!addResult.success) {
                throw new Error(addResult.error || '친구 추가에 실패했습니다.');
            }

            // 초대코드 사용 횟수 증가
            await this.incrementCodeUsage(codeInfo.id);

            // 입력 필드 초기화
            const friendCodeInput = document.getElementById('friend-invite-code');
            if (friendCodeInput) {
                friendCodeInput.value = '';
            }

            this.showNotification(`${friendUser.name || friendUser.nickname || '친구'}님이 친구로 추가되었습니다!`, 'success');

            this.dispatchEvent(new CustomEvent('invite:friend-added', {
                detail: { friend: friendUser, inviteCode: cleanCode }
            }));

            return { success: true, friend: friendUser };

        } catch (error) {
            console.error('❌ 초대코드로 친구 추가 실패:', error);
            this.showNotification(error.message, 'error');

            this.dispatchEvent(new CustomEvent('invite:add-friend-error', {
                detail: { error: error.message, inviteCode: inviteCode }
            }));

            return { success: false, error: error.message };

        } finally {
            this.setAddByCodeLoading(false);
        }
    }

    /**
     * 초대코드로 사용자 찾기
     */
    async findUserByInviteCode(inviteCode) {
        try {
            if (!this.supabase || !this.supabase.client) {
                throw new Error('데이터베이스에 연결할 수 없습니다.');
            }

            // 초대코드 정보와 사용자 정보를 JOIN으로 조회
            const result = await this.supabase.query('user_invite_codes', {
                select: '*, user:user_id(id, kakao_id, name, nickname, profile_image)',
                eq: { 
                    invite_code: inviteCode,
                    is_active: true
                },
                gte: {
                    expires_at: new Date().toISOString()
                },
                single: true
            });

            if (result.error || !result.data) {
                return null;
            }

            return {
                user: result.data.user,
                codeInfo: {
                    id: result.data.id,
                    usage_count: result.data.usage_count,
                    max_usage: result.data.max_usage,
                    expires_at: result.data.expires_at
                }
            };

        } catch (error) {
            console.error('초대코드로 사용자 찾기 실패:', error);
            return null;
        }
    }

    /**
     * FriendsManagerComponent를 통한 친구 추가
     */
    async addFriendViaComponent(friendUser) {
        try {
            // 임시로 친구 사용자명을 입력 필드에 설정
            const friendUsernameInput = document.getElementById('friend-username');
            if (friendUsernameInput) {
                const originalValue = friendUsernameInput.value;
                friendUsernameInput.value = friendUser.kakao_id || friendUser.id;
                
                const result = await window.friendsManagerComponent.addFriend();
                
                // 원래 값 복원
                friendUsernameInput.value = originalValue;
                
                return result;
            } else {
                // 직접 Storage 호출
                await this.storage.addFriend(
                    this.auth.getCurrentUser().username || this.auth.getCurrentUser().kakao_id,
                    friendUser.kakao_id || friendUser.id
                );
                
                return { success: true, friend: friendUser };
            }

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 기존 방식으로 친구 추가
     */
    async addFriendLegacy(currentUser, friendUser) {
        try {
            // 양방향 친구 관계 추가
            await this.storage.addFriend(
                currentUser.username || currentUser.kakao_id,
                friendUser.username || friendUser.kakao_id
            );

            if (this.legacyManager && this.legacyManager.storage.addFriend) {
                await this.legacyManager.storage.addFriend(
                    friendUser.username || friendUser.kakao_id,
                    currentUser.username || currentUser.kakao_id
                );
            }

            return { success: true, friend: friendUser };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 초대코드 사용 횟수 증가
     */
    async incrementCodeUsage(codeId) {
        try {
            if (!this.supabase || !this.supabase.client) return;

            await this.supabase.update('user_invite_codes', 
                { 
                    usage_count: this.supabase.client.rpc('increment', { x: 1 })
                }, 
                { id: codeId }
            );

        } catch (error) {
            console.warn('초대코드 사용 횟수 업데이트 실패:', error);
        }
    }

    /**
     * QR 코드 표시
     */
    async showQRCode() {
        try {
            if (!this.myInviteCode) {
                this.showNotification('초대코드가 없습니다.', 'error');
                return;
            }

            console.log('📱 QR 코드 생성:', this.myInviteCode);

            // QR 코드 생성 (간단한 구현 - 실제로는 QR 라이브러리 사용)
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.myInviteCode)}`;
            
            this.showQRModal(qrCodeUrl);

            this.dispatchEvent(new CustomEvent('invite:qr-shown', {
                detail: { inviteCode: this.myInviteCode, qrUrl: qrCodeUrl }
            }));

        } catch (error) {
            console.error('❌ QR 코드 생성 실패:', error);
            this.showNotification('QR 코드 생성에 실패했습니다.', 'error');
        }
    }

    /**
     * 초대코드 공유
     */
    async shareInviteCode() {
        try {
            if (!this.myInviteCode) {
                this.showNotification('초대코드가 없습니다.', 'error');
                return;
            }

            const shareData = {
                title: 'lonely-care 친구 초대',
                text: `lonely-care에서 친구가 되어주세요! 초대코드: ${this.myInviteCode}`,
                url: window.location.href
            };

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Web Share API 미지원시 클립보드 복사
                await this.copyInviteCode();
            }

            this.dispatchEvent(new CustomEvent('invite:shared', {
                detail: { inviteCode: this.myInviteCode, shareData }
            }));

        } catch (error) {
            console.error('❌ 초대코드 공유 실패:', error);
            this.showNotification('초대코드 공유에 실패했습니다.', 'error');
        }
    }

    /**
     * 유틸리티 메서드들
     */

    // 랜덤 초대코드 생성
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < this.options.codeLength; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 초대코드 입력 검증
    validateInviteCode(code) {
        if (!code || code.trim().length === 0) {
            return { isValid: false, message: '초대코드를 입력해주세요.' };
        }

        const cleanCode = code.trim().toUpperCase();
        
        if (cleanCode.length !== this.options.codeLength) {
            return { isValid: false, message: `초대코드는 ${this.options.codeLength}자리여야 합니다.` };
        }

        if (!/^[A-Z0-9]+$/.test(cleanCode)) {
            return { isValid: false, message: '초대코드는 영문 대문자와 숫자만 포함할 수 있습니다.' };
        }

        return { isValid: true };
    }

    // 실시간 코드 형식 검증
    validateCodeFormat(code) {
        const input = document.getElementById('friend-invite-code');
        if (!input) return;

        const validation = this.validateInviteCode(code);
        
        // 입력 필드 스타일 업데이트
        if (code.length === 0) {
            input.classList.remove('invalid', 'valid');
        } else if (validation.isValid) {
            input.classList.remove('invalid');
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
            input.classList.add('invalid');
        }
    }

    // 초대코드 화면 업데이트
    updateCodeDisplay() {
        const codeInput = document.getElementById('my-invite-code');
        if (codeInput && this.myInviteCode) {
            codeInput.value = this.myInviteCode;
        }

        // 코드 정보 표시 (만료일, 사용 횟수 등)
        this.updateCodeInfo();
    }

    // 코드 정보 업데이트 (만료일, 사용 횟수)
    updateCodeInfo() {
        if (!this.codeData) return;

        const infoElement = document.getElementById('invite-code-info');
        if (infoElement) {
            const expiresAt = new Date(this.codeData.expires_at);
            const remainingDays = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
            const usageCount = this.codeData.usage_count || 0;
            const maxUsage = this.codeData.max_usage || this.options.maxUsageCount;

            infoElement.innerHTML = `
                <div class="code-stats">
                    <span class="stat-item">사용: ${usageCount}/${maxUsage}</span>
                    <span class="stat-item">만료: ${remainingDays}일 후</span>
                </div>
            `;
        }
    }

    // QR 모달 표시
    showQRModal(qrUrl) {
        const modalHTML = `
            <div class="qr-modal" id="qr-modal">
                <div class="modal-overlay" onclick="closeQRModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>초대코드 QR</h3>
                        <button class="modal-close" onclick="closeQRModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="qr-container">
                            <img src="${qrUrl}" alt="초대코드 QR" class="qr-image">
                            <p class="invite-code-text">${this.myInviteCode}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="window.inviteCodeComponent.copyInviteCode()">코드 복사</button>
                        <button class="btn-secondary" onclick="closeQRModal()">닫기</button>
                    </div>
                </div>
            </div>
        `;

        // 기존 모달 제거
        const existingModal = document.getElementById('qr-modal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 로딩 상태 설정
    setLoadingState(loading) {
        this.isLoading = loading;
        
        const generateBtn = document.getElementById('generate-new-code');
        if (generateBtn) {
            generateBtn.disabled = loading;
            generateBtn.textContent = loading ? '생성 중...' : '새 코드 생성';
        }

        const loadingElement = document.getElementById('invite-code-loading');
        if (loadingElement) {
            loadingElement.style.display = loading ? 'block' : 'none';
        }
    }

    // 친구 추가 로딩 상태
    setAddByCodeLoading(loading) {
        const addBtn = document.getElementById('add-by-invite-code');
        if (addBtn) {
            addBtn.disabled = loading;
            addBtn.textContent = loading ? '추가 중...' : '친구 추가';
        }
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        if (this.auth && this.auth.showNotification) {
            this.auth.showNotification(message, type);
        } else {
            console.log(`📢 [${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * 상태 정보
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            hasInviteCode: !!this.myInviteCode,
            inviteCode: this.myInviteCode,
            codeData: this.codeData
        };
    }

    /**
     * 기존 코드와의 호환성을 위한 메서드들
     */

    // invite-code.js와 완전 호환
    async copyInviteCodeLegacy() {
        return await this.copyInviteCode();
    }

    async addFriendByCodeLegacy(code) {
        return await this.addFriendByCode(code);
    }

    // 전역 이벤트 리스너 지원
    on(event, callback) {
        this.addEventListener(event.replace('invite:', ''), (e) => {
            callback(e.detail);
        });
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.myInviteCode = null;
        this.codeData = null;
        this.isInitialized = false;
        this.isLoading = false;
        
        console.log('🗑️ InviteCodeComponent 정리 완료');
    }
}

// QR 모달 닫기 전역 함수
function closeQRModal() {
    const modal = document.getElementById('qr-modal');
    if (modal) {
        modal.remove();
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.InviteCodeComponent = InviteCodeComponent;
    window.closeQRModal = closeQRModal;
    
    // 즉시 인스턴스 생성 비활성화 (UI 간섭 방지)
    // if (!window.inviteCodeComponent) {
    //     window.inviteCodeComponent = new InviteCodeComponent();
    //     
    //     console.log('🌐 InviteCodeComponent 전역 등록 완료');
    // }
    console.log('⚠️ InviteCodeComponent 자동 인스턴스 생성 비활성화됨 (UI 보호)');
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InviteCodeComponent;
}