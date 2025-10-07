/**
 * 사용자 ID 유틸리티
 * 카카오 사용자 ID 정규화 및 중복 방지를 위한 공통 함수들
 */

class UserIdUtils {
    /**
     * 카카오 ID를 정규화
     * @param {string|number} kakaoId - 카카오 ID (숫자 또는 문자열)
     * @returns {string} 정규화된 ID (문자열)
     */
    static normalizeKakaoId(kakaoId) {
        if (!kakaoId) {
            throw new Error('카카오 ID가 없습니다');
        }
        
        // 숫자나 문자열을 문자열로 변환
        let normalized = String(kakaoId).trim();
        
        // 'kakao-' 접두어가 있으면 제거
        if (normalized.startsWith('kakao-')) {
            normalized = normalized.substring(6);
        }
        
        // 숫자가 아닌 문자가 포함되어 있으면 에러
        if (!/^\d+$/.test(normalized)) {
            throw new Error(`유효하지 않은 카카오 ID 형식: ${kakaoId}`);
        }
        
        return normalized;
    }

    /**
     * 사용자 데이터에서 카카오 ID 추출 및 정규화
     * @param {Object} userData - 사용자 데이터
     * @returns {string} 정규화된 카카오 ID
     */
    static extractNormalizedKakaoId(userData) {
        const possibleFields = [
            'kakao_id',
            'kakaoId', 
            'id',
            'user_id',
            'userId'
        ];
        
        for (const field of possibleFields) {
            if (userData[field]) {
                try {
                    return this.normalizeKakaoId(userData[field]);
                } catch (error) {
                    console.warn(`⚠️ ${field} 필드에서 ID 추출 실패:`, error.message);
                    continue;
                }
            }
        }
        
        throw new Error('사용자 데이터에서 카카오 ID를 찾을 수 없습니다');
    }

    /**
     * 중복 사용자 검색을 위한 가능한 ID 목록 생성
     * @param {string|number} kakaoId - 원본 카카오 ID
     * @returns {string[]} 검색할 ID 목록
     */
    static generateSearchIds(kakaoId) {
        const normalized = this.normalizeKakaoId(kakaoId);
        
        return [
            normalized,                    // 4380054435
            `kakao-${normalized}`,        // kakao-4380054435
            parseInt(normalized),         // 4380054435 (숫자)
            `user-${normalized}`,         // user-4380054435 (혹시 사용된 경우)
        ].filter(id => id !== null && id !== undefined);
    }

    /**
     * Firebase 문서 ID로 사용할 정규화된 ID 생성
     * @param {string|number} kakaoId - 카카오 ID
     * @returns {string} Firebase 문서 ID로 사용할 ID
     */
    static getFirebaseDocId(kakaoId) {
        // Firebase 문서 ID는 숫자만 사용 (단순하고 일관성 있게)
        return this.normalizeKakaoId(kakaoId);
    }

    /**
     * 사용자 데이터 정규화
     * @param {Object} userData - 원본 사용자 데이터
     * @returns {Object} 정규화된 사용자 데이터
     */
    static normalizeUserData(userData) {
        const normalizedKakaoId = this.extractNormalizedKakaoId(userData);
        
        return {
            ...userData,
            kakao_id: normalizedKakaoId,    // 필드명 통일
            id: normalizedKakaoId,          // ID 필드도 통일
            kakaoId: normalizedKakaoId      // 기존 호환성 유지
        };
    }

    /**
     * 로그용 사용자 식별자 생성
     * @param {string|number} kakaoId - 카카오 ID
     * @param {string} name - 사용자 이름 (선택사항)
     * @returns {string} 로그용 식별자
     */
    static getUserIdentifier(kakaoId, name = null) {
        const normalized = this.normalizeKakaoId(kakaoId);
        return name ? `${name}(${normalized})` : normalized;
    }

    /**
     * 같은 사용자인지 확인
     * @param {string|number} id1 - 첫 번째 ID
     * @param {string|number} id2 - 두 번째 ID
     * @returns {boolean} 같은 사용자 여부
     */
    static isSameUser(id1, id2) {
        try {
            const normalized1 = this.normalizeKakaoId(id1);
            const normalized2 = this.normalizeKakaoId(id2);
            return normalized1 === normalized2;
        } catch (error) {
            console.warn('⚠️ 사용자 ID 비교 실패:', error.message);
            return false;
        }
    }
}

// 전역으로 사용할 수 있도록 등록
if (typeof window !== 'undefined') {
    window.UserIdUtils = UserIdUtils;
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserIdUtils;
}

console.log('🔧 UserIdUtils 로드 완료 - 카카오 ID 정규화 유틸리티');