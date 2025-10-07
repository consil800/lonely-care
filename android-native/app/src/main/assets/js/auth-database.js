/**
 * 카카오 로그인 후 데이터베이스 처리
 * 카카오 사용자를 데이터베이스에 등록하거나 기존 사용자 정보를 가져옴
 */

/**
 * 카카오 사용자를 데이터베이스에서 조회하거나 새로 생성
 */
async function processKakaoUser(kakaoUserInfo) {
    try {
        console.log('🔄 카카오 사용자 DB 처리 시작:', kakaoUserInfo);
        
        // 1. 기존 사용자 조회 (kakao_id로 검색)
        const { data: existingUser, error: findError } = await window.supabase
            .from('users')
            .select('*')
            .eq('kakao_id', String(kakaoUserInfo.id))
            .single();
        
        if (existingUser) {
            console.log('✅ 기존 사용자 발견:', existingUser.id);
            
            // 필요시 정보 업데이트
            const updates = {};
            if (existingUser.name !== kakaoUserInfo.nickname) {
                updates.name = kakaoUserInfo.nickname;
            }
            if (existingUser.profile_pic !== kakaoUserInfo.profile_image && kakaoUserInfo.profile_image) {
                updates.profile_pic = kakaoUserInfo.profile_image;
            }
            
            if (Object.keys(updates).length > 0) {
                updates.updated_at = new Date().toISOString();
                
                const { error: updateError } = await window.supabase
                    .from('users')
                    .update(updates)
                    .eq('id', existingUser.id);
                
                if (updateError) {
                    console.error('❌ 사용자 정보 업데이트 실패:', updateError);
                } else {
                    console.log('✅ 사용자 정보 업데이트 완료');
                }
            }
            
            return existingUser;
        }
        
        // 2. 새 사용자 생성
        console.log('🆕 새 사용자 생성 필요');
        
        const newUser = {
            kakao_id: String(kakaoUserInfo.id),
            email: kakaoUserInfo.email || `kakao_${kakaoUserInfo.id}@example.com`,
            name: kakaoUserInfo.nickname || '카카오 사용자',
            profile_pic: kakaoUserInfo.profile_image || null,
            is_kakao_user: true,
            is_active: true
        };
        
        const { data: createdUser, error: createError } = await window.supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
        
        if (createError) {
            console.error('❌ 사용자 생성 실패:', createError);
            
            // 이메일 중복 오류 처리
            if (createError.code === '23505' && createError.message.includes('email')) {
                // 이메일을 고유하게 만들어 재시도
                newUser.email = `kakao_${kakaoUserInfo.id}_${Date.now()}@example.com`;
                
                const { data: retryUser, error: retryError } = await window.supabase
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();
                
                if (retryError) {
                    throw retryError;
                }
                
                console.log('✅ 사용자 생성 성공 (재시도):', retryUser.id);
                return retryUser;
            }
            
            throw createError;
        }
        
        console.log('✅ 새 사용자 생성 완료:', createdUser.id);
        return createdUser;
        
    } catch (error) {
        console.error('❌ 카카오 사용자 DB 처리 실패:', error);
        throw error;
    }
}

/**
 * 로그인 성공 후 사용자 정보 저장
 */
function saveUserToLocalStorage(dbUser, kakaoInfo) {
    const userForStorage = {
        id: dbUser.id,  // UUID (데이터베이스 ID)
        kakao_id: dbUser.kakao_id,  // 카카오 ID
        email: dbUser.email,
        name: dbUser.name,
        nickname: dbUser.name,
        profile_image: dbUser.profile_pic,
        provider: 'kakao',
        is_kakao_user: true,
        // 추가 정보
        phone: dbUser.phone,
        emergency_contact1: dbUser.emergency_contact1,
        emergency_name1: dbUser.emergency_name1,
        emergency_contact2: dbUser.emergency_contact2,
        emergency_name2: dbUser.emergency_name2,
        created_at: dbUser.created_at
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userForStorage));
    console.log('💾 사용자 정보 localStorage 저장 완료');
    
    return userForStorage;
}

// 전역으로 내보내기
window.processKakaoUser = processKakaoUser;
window.saveUserToLocalStorage = saveUserToLocalStorage;