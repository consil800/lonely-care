/**
 * 초대 시스템 컴포넌트
 * 친구 초대 코드 생성, 검증, 사용을 관리하는 통합 컴포넌트
 */

class InviteSystemComponent {
    constructor() {
        this.databaseComponent = null;
        this.currentUser = null;
        this.isInitialized = false;
        
        console.log('💌 InviteSystemComponent 초기화');
    }

    /**
     * 컴포넌트 초기화
     */
    async init() {
        try {
            // DatabaseComponent 대기
            await this.waitForDatabase();
            
            // 현재 사용자 정보 로드
            await this.loadCurrentUser();
            
            this.isInitialized = true;
            console.log('✅ InviteSystemComponent 초기화 완료');
            
            return true;
        } catch (error) {
            console.error('❌ InviteSystemComponent 초기화 실패:', error);
            return false;
        }
    }

    /**
     * DatabaseComponent 대기
     */
    async waitForDatabase() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            if (window.databaseComponent && window.databaseComponent.isConnected()) {
                this.databaseComponent = window.databaseComponent;
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        throw new Error('DatabaseComponent를 찾을 수 없습니다');
    }

    /**
     * 현재 사용자 정보 로드
     */
    async loadCurrentUser() {
        if (window.auth && window.auth.getCurrentUser) {
            this.currentUser = window.auth.getCurrentUser();
        }
        
        if (!this.currentUser) {
            throw new Error('현재 사용자 정보를 찾을 수 없습니다');
        }
    }

    /**
     * 초대 코드 생성
     */
    async generateInviteCode() {
        if (!this.isInitialized) {
            throw new Error('InviteSystemComponent가 초기화되지 않았습니다');
        }

        try {
            // 6자리 랜덤 초대 코드 생성
            const inviteCode = this.generateRandomCode();
            
            // 중복 검사
            const existing = await this.databaseComponent.getCollection('invite_codes', {
                where: [{ field: 'code', operator: '==', value: inviteCode }]
            });
            
            if (existing.length > 0) {
                // 중복된 경우 재귀적으로 다시 생성
                return await this.generateInviteCode();
            }
            
            // 초대 코드 저장
            const inviteData = {
                code: inviteCode,
                created_by: this.currentUser.id,
                created_by_name: this.currentUser.name || 'Unknown',
                status: 'active',
                max_uses: 1,
                current_uses: 0,
                expires_at: this.getExpirationDate(),
                created_at: new Date().toISOString()
            };
            
            const docId = await this.databaseComponent.addDocument('invite_codes', inviteData);
            
            console.log('📧 초대 코드 생성됨:', inviteCode);
            
            return {
                code: inviteCode,
                id: docId,
                expiresAt: inviteData.expires_at
            };
            
        } catch (error) {
            console.error('초대 코드 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 랜덤 코드 생성 (6자리)
     */
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * 만료 날짜 계산 (7일 후)
     */
    getExpirationDate() {
        const now = new Date();
        now.setDate(now.getDate() + 7);
        return now.toISOString();
    }

    /**
     * 초대 코드 검증
     */
    async validateInviteCode(code) {
        if (!this.isInitialized) {
            throw new Error('InviteSystemComponent가 초기화되지 않았습니다');
        }

        try {
            // 초대 코드 조회
            const inviteCodes = await this.databaseComponent.getCollection('invite_codes', {
                where: [{ field: 'code', operator: '==', value: code.toUpperCase() }]
            });
            
            if (inviteCodes.length === 0) {
                return {
                    valid: false,
                    reason: 'INVALID_CODE',
                    message: '유효하지 않은 초대 코드입니다.'
                };
            }
            
            const invite = inviteCodes[0];
            
            // 상태 검사
            if (invite.status !== 'active') {
                return {
                    valid: false,
                    reason: 'INACTIVE_CODE',
                    message: '사용할 수 없는 초대 코드입니다.'
                };
            }
            
            // 사용 횟수 검사
            if (invite.current_uses >= invite.max_uses) {
                return {
                    valid: false,
                    reason: 'USED_CODE',
                    message: '이미 사용된 초대 코드입니다.'
                };
            }
            
            // 만료 날짜 검사
            if (new Date() > new Date(invite.expires_at)) {
                return {
                    valid: false,
                    reason: 'EXPIRED_CODE',
                    message: '만료된 초대 코드입니다.'
                };
            }
            
            // 자신의 코드 사용 방지
            if (invite.created_by === this.currentUser.id) {
                return {
                    valid: false,
                    reason: 'SELF_INVITE',
                    message: '자신의 초대 코드는 사용할 수 없습니다.'
                };
            }
            
            return {
                valid: true,
                invite: invite
            };
            
        } catch (error) {
            console.error('초대 코드 검증 실패:', error);
            throw error;
        }
    }

    /**
     * 초대 코드 사용
     */
    async useInviteCode(code) {
        if (!this.isInitialized) {
            throw new Error('InviteSystemComponent가 초기화되지 않았습니다');
        }

        try {
            // 코드 검증
            const validation = await this.validateInviteCode(code);
            
            if (!validation.valid) {
                return validation;
            }
            
            const invite = validation.invite;
            
            // 친구 관계 생성
            await this.createFriendship(invite.created_by, this.currentUser.id);
            
            // 초대 코드 사용 횟수 증가
            await this.databaseComponent.updateDocument('invite_codes', invite.id, {
                current_uses: invite.current_uses + 1,
                last_used_at: new Date().toISOString(),
                last_used_by: this.currentUser.id
            });
            
            console.log('🤝 초대 코드 사용 완료:', code);
            
            return {
                success: true,
                friendId: invite.created_by,
                friendName: invite.created_by_name
            };
            
        } catch (error) {
            console.error('초대 코드 사용 실패:', error);
            throw error;
        }
    }

    /**
     * 친구 관계 생성
     */
    async createFriendship(userId1, userId2) {
        try {
            const batch = this.databaseComponent.createBatch();
            
            // 양방향 친구 관계 생성
            const friendship1 = {
                user_id: userId1,
                friend_id: userId2,
                status: 'active',
                created_at: new Date().toISOString()
            };
            
            const friendship2 = {
                user_id: userId2,
                friend_id: userId1,
                status: 'active',
                created_at: new Date().toISOString()
            };
            
            // 배치로 동시 생성
            const ref1 = this.databaseComponent.db.collection('friends').doc();
            const ref2 = this.databaseComponent.db.collection('friends').doc();
            
            batch.set(ref1, friendship1);
            batch.set(ref2, friendship2);
            
            await batch.commit();
            
            console.log('🤝 친구 관계 생성 완료:', userId1, '↔', userId2);
            
        } catch (error) {
            console.error('친구 관계 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 내가 생성한 초대 코드 목록 조회
     */
    async getMyInviteCodes() {
        if (!this.isInitialized) {
            throw new Error('InviteSystemComponent가 초기화되지 않았습니다');
        }

        try {
            const codes = await this.databaseComponent.getCollection('invite_codes', {
                where: [{ field: 'created_by', operator: '==', value: this.currentUser.id }],
                orderBy: { field: 'created_at', direction: 'desc' }
            });
            
            return codes.map(code => ({
                ...code,
                isExpired: new Date() > new Date(code.expires_at),
                isUsed: code.current_uses >= code.max_uses
            }));
            
        } catch (error) {
            console.error('내 초대 코드 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 초대 코드 비활성화
     */
    async deactivateInviteCode(codeId) {
        if (!this.isInitialized) {
            throw new Error('InviteSystemComponent가 초기화되지 않았습니다');
        }

        try {
            await this.databaseComponent.updateDocument('invite_codes', codeId, {
                status: 'inactive',
                deactivated_at: new Date().toISOString()
            });
            
            console.log('🚫 초대 코드 비활성화됨:', codeId);
            return true;
            
        } catch (error) {
            console.error('초대 코드 비활성화 실패:', error);
            throw error;
        }
    }

    /**
     * 초대 통계 조회
     */
    async getInviteStats() {
        if (!this.isInitialized) {
            throw new Error('InviteSystemComponent가 초기화되지 않았습니다');
        }

        try {
            const codes = await this.getMyInviteCodes();
            
            const stats = {
                totalCreated: codes.length,
                activeCount: codes.filter(c => c.status === 'active' && !c.isExpired).length,
                usedCount: codes.filter(c => c.isUsed).length,
                expiredCount: codes.filter(c => c.isExpired).length
            };
            
            return stats;
            
        } catch (error) {
            console.error('초대 통계 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 컴포넌트 정리
     */
    destroy() {
        this.databaseComponent = null;
        this.currentUser = null;
        this.isInitialized = false;
        console.log('🗑️ InviteSystemComponent 정리 완료');
    }
}

// 전역 인스턴스
let inviteSystemComponent = null;

/**
 * InviteSystemComponent 초기화 및 반환
 */
async function initInviteSystemComponent() {
    if (!inviteSystemComponent) {
        inviteSystemComponent = new InviteSystemComponent();
        await inviteSystemComponent.init();
        window.inviteSystemComponent = inviteSystemComponent;
    }
    return inviteSystemComponent;
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InviteSystemComponent, initInviteSystemComponent };
} else {
    window.InviteSystemComponent = InviteSystemComponent;
    window.initInviteSystemComponent = initInviteSystemComponent;
}