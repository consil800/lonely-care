/**
 * Firebase 호환성 레이어
 * 기존 Supabase 코드와의 호환성을 위한 어댑터
 */

// Supabase 클라이언트를 Firebase 클라이언트로 매핑
function createSupabaseCompatLayer() {
    // Firebase가 준비될 때까지 대기
    const waitForFirebase = () => {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseStorage && window.firebaseStorage.isInitialized) {
                    resolve(window.firebaseStorage);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    };

    // Supabase 스타일 API를 Firebase로 변환
    const supabaseCompat = {
        from: (table) => ({
            select: (columns = '*') => ({
                eq: (column, value) => ({
                    async then() {
                        const storage = await waitForFirebase();
                        
                        try {
                            if (table === 'users' && column === 'kakao_id') {
                                const result = await storage.getUserByKakaoId(value);
                                return { 
                                    data: result ? [result] : [], 
                                    error: null 
                                };
                            }
                            
                            if (table === 'friends' && column === 'user_id') {
                                const result = await storage.getFriends(value);
                                return { 
                                    data: result || [], 
                                    error: null 
                                };
                            }
                            
                            if (table === 'user_invite_codes' && column === 'user_id') {
                                const result = await storage.getMyInviteCode(value);
                                return { 
                                    data: result ? [result] : [], 
                                    error: null 
                                };
                            }
                            
                            return { data: [], error: null };
                            
                        } catch (error) {
                            return { 
                                data: null, 
                                error: {
                                    message: error.message || 'Firebase 연결 실패',
                                    details: error.toString()
                                }
                            };
                        }
                    }
                }),
                
                order: (column, options = {}) => ({
                    async then() {
                        const storage = await waitForFirebase();
                        
                        try {
                            if (table === 'friends' && column === 'created_at') {
                                // 친구 목록을 시간순으로 정렬해서 반환
                                const result = await storage.getFriends();
                                const sortedResult = result.sort((a, b) => {
                                    const aTime = new Date(a.created_at);
                                    const bTime = new Date(b.created_at);
                                    return options.ascending ? aTime - bTime : bTime - aTime;
                                });
                                return { 
                                    data: sortedResult, 
                                    error: null 
                                };
                            }
                            
                            return { data: [], error: null };
                            
                        } catch (error) {
                            return { 
                                data: null, 
                                error: {
                                    message: error.message || 'Firebase 정렬 실패',
                                    details: error.toString()
                                }
                            };
                        }
                    }
                })
            }),
            
            insert: (data) => ({
                async then() {
                    const storage = await waitForFirebase();
                    
                    try {
                        if (table === 'users') {
                            const result = await storage.createUser(Array.isArray(data) ? data[0] : data);
                            return { 
                                data: [result], 
                                error: null 
                            };
                        }
                        
                        if (table === 'friends') {
                            const friendData = Array.isArray(data) ? data[0] : data;
                            const result = await storage.addFriend(
                                friendData.user_id, 
                                friendData.friend_id, 
                                friendData.status
                            );
                            return { 
                                data: [result], 
                                error: null 
                            };
                        }
                        
                        if (table === 'user_invite_codes') {
                            const codeData = Array.isArray(data) ? data[0] : data;
                            const result = await storage.generateInviteCode(codeData.user_id);
                            return { 
                                data: [result], 
                                error: null 
                            };
                        }
                        
                        return { data: [], error: null };
                        
                    } catch (error) {
                        return { 
                            data: null, 
                            error: {
                                message: error.message || 'Firebase 저장 실패',
                                details: error.toString()
                            }
                        };
                    }
                }
            }),
            
            update: (data) => ({
                eq: (column, value) => ({
                    async then() {
                        const storage = await waitForFirebase();
                        
                        try {
                            if (table === 'users' && column === 'id') {
                                const result = await storage.updateUser(value, data);
                                return { 
                                    data: [result], 
                                    error: null 
                                };
                            }
                            
                            return { data: [], error: null };
                            
                        } catch (error) {
                            return { 
                                data: null, 
                                error: {
                                    message: error.message || 'Firebase 업데이트 실패',
                                    details: error.toString()
                                }
                            };
                        }
                    }
                })
            })
        })
    };
    
    return supabaseCompat;
}

// 전역 Supabase 호환 객체 생성
if (!window.supabaseClient) {
    window.supabaseClient = createSupabaseCompatLayer();
}

// 기존 코드 호환성을 위한 전역 함수
window.initializeSupabase = function() {
    return {
        client: window.supabaseClient
    };
};

console.log('🔥 Firebase-Supabase 호환성 레이어 로드 완료');