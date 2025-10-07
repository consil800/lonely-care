/**
 * Firebase Storage Manager
 * Firebase Firestore 기반 데이터 저장소 관리자
 */

class FirebaseStorageManager {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.initPromise = null;
        
        // 즉시 초기화하지 않고 Promise만 생성
        this.initPromise = this.initializeWithRetry();
    }

    async initializeWithRetry() {
        try {
            // Firebase 초기화 관리자 사용
            if (window.firebaseInitializer) {
                console.log('🔥 [생명구조] Firebase 초기화 관리자를 통한 Storage 초기화 시작');
                const success = await window.firebaseInitializer.initializeWithRetry();
                
                if (success && window.firebaseClient) {
                    this.db = window.firebaseClient.db;
                    this.isInitialized = true;
                    console.log('🔥 [생명구조] Firebase Storage Manager 초기화 완료');
                    return true;
                } else {
                    console.warn('⚠️ [생명구조] Firebase 초기화 실패 - 로컬 모드로 전환');
                    this.isInitialized = false;
                    return false;
                }
            } else {
                // 백업: 기존 로직 사용
                console.warn('⚠️ [생명구조] Firebase 초기화 관리자 없음 - 기존 로직 사용');
                await this.waitForFirebase();
                
                if (window.firebaseClient) {
                    this.db = window.firebaseClient.db;
                    this.isInitialized = true;
                    console.log('🔥 Firebase Storage Manager 초기화 완료 (백업 로직)');
                    return true;
                } else {
                    this.isInitialized = false;
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ [생명구조] Firebase Storage Manager 초기화 실패:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Storage 초기화 완료까지 대기
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async waitForInitialization() {
        if (this.initPromise) {
            return await this.initPromise;
        }
        return this.isInitialized;
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50; // 5초로 증가하여 안정성 확보
        
        return new Promise((resolve, reject) => {
            const checkFirebase = () => {
                attempts++;
                if (window.firebaseClient && window.firebaseClient.isInitialized) {
                    console.log('🔥 Firebase 클라이언트 초기화 완료');
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.warn(`⚠️ Firebase 초기화 ${maxAttempts * 100}ms 타임아웃 - 로컬 모드로 실행`);
                    resolve(false); // reject 대신 resolve(false)로 변경하여 앱이 계속 실행되도록
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // ===== 사용자 관련 메서드 =====
    
    async createUser(userData) {
        try {
            // 초기화 완료까지 대기
            await this.waitForInitialization();
            
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            // UserIdUtils로 사용자 ID 정규화
            const normalizedId = UserIdUtils.normalizeKakaoId(userData.kakao_id || userData.kakaoId || userData.id);
            const normalizedUserData = UserIdUtils.normalizeUserData(userData);

            const userDocData = {
                name: normalizedUserData.name || '',
                kakao_id: normalizedUserData.kakao_id,
                email: normalizedUserData.email || '',
                profile_image: normalizedUserData.profile_image || normalizedUserData.profileImage || '',
                phone: normalizedUserData.phone || '',
                address: normalizedUserData.address || '',
                birth_date: normalizedUserData.birth_date || normalizedUserData.birthDate || null,
                gender: normalizedUserData.gender || '',
                emergency_contact1: normalizedUserData.emergency_contact1 || '',
                emergency_contact2: normalizedUserData.emergency_contact2 || '',
                medical_info: normalizedUserData.medical_info || {},
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                is_active: true
            };

            // UserIdUtils로 정규화된 ID를 문서 ID로 사용
            const firebaseDocId = UserIdUtils.getFirebaseDocId(normalizedId);
            await window.firebaseClient.db.collection('users').doc(firebaseDocId).set(userDocData);
            
            const createdUser = { id: firebaseDocId, ...userDocData };
            console.log(`🔥 사용자 생성 성공: ${UserIdUtils.getUserIdentifier(normalizedId, normalizedUserData.name)}`);
            return createdUser;
            
        } catch (error) {
            console.error('사용자 생성 실패:', error);
            throw error;
        }
    }

    async getUserByKakaoId(kakaoId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const result = await window.firebaseClient.getUserByKakaoId(kakaoId);
            
            if (result.error) {
                throw result.error;
            }
            
            // 🩸 생명구조 앱 - 의료정보 역매핑 (Firebase snake_case → JavaScript camelCase)
            if (result.data) {
                const mappedData = this.mapFieldNamesFromFirebase(result.data);
                console.log('🔄 Firebase 데이터 역매핑 완료:', {
                    blood_type: result.data.blood_type ? '✅' : '❌',
                    bloodType: mappedData.bloodType ? '✅' : '❌'
                });
                return mappedData;
            }
            
            return result.data;
            
        } catch (error) {
            console.error('카카오 ID로 사용자 조회 실패:', error);
            throw error;
        }
    }

    // 긴급 로그인 사용자 조회 (생명 구조 우선)
    async getUserByEmergencyId(emergencyId) {
        try {
            console.log('🚨 긴급 ID로 사용자 조회:', emergencyId);
            
            // 1순위: Firebase에서 조회 (초기화된 경우)
            if (this.isInitialized) {
                try {
                    const usersRef = this.db.collection('users');
                    const snapshot = await usersRef.where('emergency_id', '==', emergencyId).get();
                    
                    if (!snapshot.empty) {
                        const userData = snapshot.docs[0].data();
                        console.log('✅ Firebase에서 긴급 사용자 찾음:', userData.name);
                        return { ...userData, id: snapshot.docs[0].id };
                    }
                } catch (firebaseError) {
                    console.warn('⚠️ Firebase 긴급 사용자 조회 실패, 로컬 조회로 대체:', firebaseError);
                }
            }
            
            // 2순위: 로컬 스토리지에서 조회
            try {
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    const userData = JSON.parse(currentUser);
                    if (userData.emergency_id === emergencyId || userData.id === emergencyId) {
                        console.log('✅ 로컬 스토리지에서 긴급 사용자 찾음:', userData.name);
                        return userData;
                    }
                }
            } catch (localError) {
                console.warn('⚠️ 로컬 스토리지 조회 실패:', localError);
            }
            
            console.log('ℹ️ 긴급 사용자 없음 - 새 사용자 생성 필요');
            return null;
            
        } catch (error) {
            console.error('❌ 긴급 ID로 사용자 조회 실패:', error);
            return null; // 긴급 상황이므로 에러를 throw하지 않고 null 반환
        }
    }

    async updateUser(userId, userData) {
        try {
            if (!this.isInitialized) {
                console.warn('⚠️ Firebase가 초기화되지 않아 로컬 업데이트만 수행');
                return { success: false, localOnly: true };
            }
            
            // undefined 값 필터링 함수
            const filterUndefined = (obj) => {
                const filtered = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value !== undefined) {
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            const nestedFiltered = filterUndefined(value);
                            if (Object.keys(nestedFiltered).length > 0) {
                                filtered[key] = nestedFiltered;
                            }
                        } else {
                            filtered[key] = value;
                        }
                    }
                }
                return filtered;
            };

            // camelCase를 snake_case로 매핑하는 함수
            const mapFieldNames = (data) => {
                const fieldMapping = {
                    // camelCase -> snake_case 매핑
                    'emergencyContact1': 'emergency_contact1',
                    'emergencyName1': 'emergency_name1',
                    'emergencyContact2': 'emergency_contact2',
                    'emergencyName2': 'emergency_name2',
                    'profilePic': 'profile_image',
                    'memorialPic': 'memorial_pic',
                    'bloodType': 'blood_type',
                    'medicalConditions': 'medical_conditions',
                    'detailAddress': 'detail_address'
                };

                const mappedData = {};
                for (const [key, value] of Object.entries(data)) {
                    const mappedKey = fieldMapping[key] || key;
                    mappedData[mappedKey] = value;
                }
                return mappedData;
            };

            // 필드명 매핑 적용
            const mappedUserData = mapFieldNames(userData);
            
            const updateData = {
                ...filterUndefined(mappedUserData),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('📝 매핑된 업데이트 데이터:', {
                phone: updateData.phone,
                emergency_contact1: updateData.emergency_contact1,
                emergency_name1: updateData.emergency_name1,
                emergency_contact2: updateData.emergency_contact2,
                emergency_name2: updateData.emergency_name2,
                profile_image: updateData.profile_image ? 'found' : 'not found',
                memorial_pic: updateData.memorial_pic ? 'found' : 'not found'
            });
            
            try {
                // 먼저 문서가 존재하는지 확인
                const docRef = window.firebaseClient.db.collection('users').doc(userId);
                console.log('🔍 Firebase 사용자 문서 확인:', userId);
                const docSnap = await docRef.get();
                
                if (docSnap.exists) {
                    // 문서가 존재하면 업데이트
                    console.log('📝 기존 사용자 문서 업데이트:', userId);
                    console.log('📝 업데이트 데이터:', updateData);
                    await docRef.update(updateData);
                    console.log('✅ Firebase 사용자 업데이트 성공:', userId);
                    return { success: true };
                } else {
                    // 문서가 없으면 새로 생성
                    console.log('📝 사용자 문서가 없어 새로 생성합니다:', userId);
                    const currentUser = this.getCurrentUser();
                    if (currentUser) {
                        const newUserData = {
                            ...currentUser,
                            ...updateData,
                            kakao_id: userId, // 문서 ID와 kakao_id 일치
                            created_at: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        console.log('📝 새 사용자 데이터:', newUserData);
                        await docRef.set(newUserData);
                        console.log('✅ Firebase 사용자 문서 생성 완료:', userId);
                        
                        // localStorage 업데이트
                        const updatedUser = { 
                            ...currentUser, 
                            id: userId,
                            ...updateData 
                        };
                        this.setCurrentUser(updatedUser);
                        return { success: true, created: true };
                    }
                }
            } catch (firebaseError) {
                console.error('Firebase 업데이트 오류:', firebaseError);
                throw firebaseError;
            }
            
        } catch (error) {
            console.warn('⚠️ 사용자 업데이트 실패하지만 계속 진행:', error.message);
            return { success: false, error: error.message };
        }
    }

    async updateUserStatus(userId, isActive = true) {
        try {
            if (!userId) {
                console.warn('⚠️ 사용자 ID가 없어 상태 업데이트를 건너뜁니다');
                return { success: false, reason: 'no_user_id' };
            }
            
            const updateData = {
                is_active: isActive,
                last_seen: new Date(),
                updated_at: new Date()
            };
            
            const result = await this.updateUser(userId, updateData);
            return result;
            
        } catch (error) {
            console.warn('⚠️ 사용자 상태 업데이트 실패하지만 계속 진행:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ===== 친구 관련 메서드 =====
    
    async getUser(userId) {
        try {
            console.log('🔍 [생명구조] getUser 호출됨:', userId);
            
            if (!userId) {
                const error = new Error('사용자 ID가 제공되지 않았습니다.');
                error.code = 'NO_USER_ID';
                throw error;
            }
            
            // 초기화 완료까지 대기
            await this.waitForInitialization();
            
            if (!this.isInitialized) {
                const error = new Error('Firebase Storage Manager가 초기화되지 않았습니다');
                error.code = 'FIREBASE_NOT_INITIALIZED';
                throw error;
            }
            
            if (!window.firebaseClient) {
                const error = new Error('Firebase 클라이언트가 로드되지 않았습니다.');
                error.code = 'FIREBASE_CLIENT_MISSING';
                throw error;
            }
            
            const result = await window.firebaseClient.getUser(userId);
            
            if (result.error) {
                const error = new Error(result.error.message || 'Firebase에서 사용자 정보를 가져오는데 실패했습니다.');
                error.code = result.error.code || 'FIREBASE_GET_USER_ERROR';
                error.originalError = result.error;
                throw error;
            }
            
            console.log('✅ [생명구조] getUser 성공:', result.data?.name || userId);
            return result.data;
            
        } catch (error) {
            console.error('❌ [생명구조] getUser 실패:', error);
            throw error;
        }
    }
    
    async getUserStatus(userId) {
        try {
            console.log('🔍 [생명구조] getUserStatus 호출됨:', userId);
            
            if (!userId) {
                console.warn('⚠️ [생명구조] getUserStatus: 사용자 ID 없음, 기본 상태 반환');
                return {
                    user_id: userId,
                    activity: 'unknown',
                    deviceOnline: false,
                    lastSeen: null
                };
            }
            
            if (!this.isInitialized) {
                console.warn('⚠️ [생명구조] getUserStatus: Firebase 미초기화, 기본 상태 반환');
                return {
                    user_id: userId,
                    activity: 'unknown',
                    deviceOnline: false,
                    lastSeen: null
                };
            }
            
            if (!window.firebaseClient) {
                console.warn('⚠️ [생명구조] getUserStatus: Firebase 클라이언트 없음, 기본 상태 반환');
                return {
                    user_id: userId,
                    activity: 'unknown',
                    deviceOnline: false,
                    lastSeen: null
                };
            }
            
            // 🚨 생명구조 앱: 인덱스 오류 방지 - 단순 쿼리 사용
            try {
                // 복합 쿼리 대신 단순 user_id 필터만 사용 (orderBy 제거)
                const result = await window.firebaseClient.queryDocuments('user_status', [
                    ['user_id', '==', userId]
                ], null, 10); // orderBy 없이, limit만 설정
                
                if (result.error) {
                    console.warn('⚠️ [생명구조] getUserStatus: Firebase 쿼리 실패, 기본 상태 반환:', result.error.message);
                    return {
                        user_id: userId,
                        activity: 'unknown',
                        deviceOnline: false,
                        lastSeen: null
                    };
                }
                
                // 클라이언트에서 정렬 (최신 상태 찾기)
                let userStatus = null;
                if (result.data && result.data.length > 0) {
                    // updated_at 기준으로 클라이언트에서 정렬
                    const sortedData = result.data.sort((a, b) => {
                        const timeA = a.updated_at ? (a.updated_at.toMillis ? a.updated_at.toMillis() : new Date(a.updated_at).getTime()) : 0;
                        const timeB = b.updated_at ? (b.updated_at.toMillis ? b.updated_at.toMillis() : new Date(b.updated_at).getTime()) : 0;
                        return timeB - timeA; // 내림차순 (최신이 먼저)
                    });
                    userStatus = sortedData[0];
                }
                
                console.log('✅ [생명구조] getUserStatus 성공:', userStatus?.activity || 'unknown');
                
                return userStatus || {
                    user_id: userId,
                    activity: 'unknown',
                    deviceOnline: false,
                    lastSeen: null
                };
                
            } catch (queryError) {
                console.warn('⚠️ [생명구조] getUserStatus: 쿼리 실행 실패, 기본 상태 반환:', queryError.message);
                return {
                    user_id: userId,
                    activity: 'unknown',
                    deviceOnline: false,
                    lastSeen: null
                };
            }
            
        } catch (error) {
            console.warn('⚠️ [생명구조] getUserStatus: 전체 실패, 기본 상태 반환:', error.message);
            // 🚨 생명구조 앱: 사용자 상태 조회 실패해도 앱이 중단되지 않도록 기본값 반환
            return {
                user_id: userId,
                activity: 'unknown',
                deviceOnline: false,
                lastSeen: null
            };
        }
    }
    
    async getFriends(userId) {
        try {
            // 초기화 완료까지 대기
            await this.waitForInitialization();
            
            // 🚨 생명구조 앱: 상세한 디버깅 정보 제공
            console.log('🔍 [생명구조] getFriends 호출됨:', {
                userId: userId,
                isInitialized: this.isInitialized,
                firebaseClient: !!window.firebaseClient,
                firebaseClientInit: window.firebaseClient?.isInitialized
            });
            
            if (!userId) {
                const error = new Error('사용자 ID가 제공되지 않았습니다. 로그인 상태를 확인해주세요.');
                error.code = 'NO_USER_ID';
                console.error('❌ [생명구조] 사용자 ID 없음:', error.message);
                throw error;
            }
            
            if (!this.isInitialized) {
                // Firebase 재초기화 시도
                console.log('🔧 [생명구조] Firebase 재초기화 시도...');
                try {
                    await this.init();
                    if (!this.isInitialized) {
                        const error = new Error('Firebase 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
                        error.code = 'FIREBASE_NOT_INITIALIZED';
                        console.error('❌ [생명구조] Firebase 초기화 실패:', error.message);
                        throw error;
                    }
                    console.log('✅ [생명구조] Firebase 재초기화 성공');
                } catch (initError) {
                    const error = new Error('Firebase 서비스 초기화에 실패했습니다. 네트워크 연결을 확인해주세요.');
                    error.code = 'FIREBASE_INIT_FAILED';
                    error.originalError = initError;
                    console.error('❌ [생명구조] Firebase 재초기화 실패:', initError);
                    throw error;
                }
            }
            
            if (!window.firebaseClient) {
                const error = new Error('Firebase 클라이언트가 로드되지 않았습니다. 앱을 다시 시작해주세요.');
                error.code = 'FIREBASE_CLIENT_MISSING';
                console.error('❌ [생명구조] Firebase 클라이언트 없음:', error.message);
                throw error;
            }
            
            if (!window.firebaseClient.isInitialized) {
                console.log('🔧 [생명구조] Firebase 클라이언트 초기화 대기 중...');
                try {
                    await window.firebaseClient.waitForInit();
                    console.log('✅ [생명구조] Firebase 클라이언트 초기화 완료');
                } catch (waitError) {
                    const error = new Error('Firebase 클라이언트 초기화가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
                    error.code = 'FIREBASE_CLIENT_INIT_TIMEOUT';
                    error.originalError = waitError;
                    console.error('❌ [생명구조] Firebase 클라이언트 초기화 대기 실패:', waitError);
                    throw error;
                }
            }
            
            console.log('🔍 [생명구조] Firebase 클라이언트에서 친구 데이터 요청 중...', userId);
            const result = await window.firebaseClient.getFriends(userId);
            
            console.log('🔍 [생명구조] Firebase 클라이언트 응답:', {
                hasData: !!result.data,
                dataLength: result.data ? result.data.length : 0,
                hasError: !!result.error,
                errorMessage: result.error ? result.error.message : null
            });
            
            if (result.error) {
                // 🚨 생명구조 앱: 실제 오류를 friends.js로 전달
                const error = new Error(result.error.message || 'Firebase에서 친구 데이터를 가져오는데 실패했습니다.');
                error.code = result.error.code || 'FIREBASE_GET_FRIENDS_ERROR';
                error.originalError = result.error;
                console.error('❌ [생명구조] Firebase getFriends 오류:', error);
                throw error;
            }
            
            const friendsData = result.data || [];
            console.log(`✅ [생명구조] 친구 데이터 로드 성공: ${friendsData.length}명`);
            
            return friendsData;
            
        } catch (error) {
            // 🚨 생명구조 앱: 모든 오류를 상위로 전달 (빈 배열 반환하지 않음)
            console.error('❌ [생명구조] getFriends 최종 오류:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            
            // 오류를 숨기지 않고 상위 레벨로 throw
            throw error;
        }
    }

    async addFriend(userId, friendId, status = 'active') {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const friendData = {
                user_id: userId,
                friend_id: friendId,
                status: status,
                created_at: new Date(),
                updated_at: new Date()
            };
            
            const result = await window.firebaseClient.addFriend(friendData);
            
            if (result.error) {
                throw result.error;
            }
            
            console.log('🔥 친구 추가 성공:', result.data);
            return result.data;
            
        } catch (error) {
            console.error('친구 추가 실패:', error);
            throw error;
        }
    }

    // ===== 초대 코드 관련 메서드 =====
    
    async getMyInviteCode(userId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const result = await window.firebaseClient.getInviteCode(userId);
            
            if (result.error) {
                throw result.error;
            }
            
            return result.data;
            
        } catch (error) {
            console.error('초대코드 조회 실패:', error);
            return null;
        }
    }

    async generateInviteCode(userId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            // 기존 활성 초대코드가 있다면 비활성화
            const existingCode = await this.getMyInviteCode(userId);
            if (existingCode) {
                console.log('🔄 기존 초대코드 비활성화:', existingCode.invite_code);
                // 기존 코드 비활성화는 새 코드 생성 후 처리
            }
            
            // 8자리 랜덤 코드 생성 (숫자와 대문자)
            const code = this.generateRandomInviteCode();
            
            const codeData = {
                user_id: userId,
                invite_code: code,
                is_active: true,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                expires_at: firebase.firestore.Timestamp.fromDate(
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후 만료
                )
            };
            
            const result = await window.firebaseClient.createInviteCode(codeData);
            
            if (result.error) {
                throw result.error;
            }
            
            console.log('🔥 초대코드 생성 성공:', result.data);
            return result.data;
            
        } catch (error) {
            console.error('초대코드 생성 실패:', error);
            throw error;
        }
    }

    generateRandomInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async findUserByInviteCode(inviteCode) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const result = await window.firebaseClient.findUserByInviteCode(inviteCode);
            
            if (result.error) {
                throw result.error;
            }
            
            return result.data;
            
        } catch (error) {
            console.error('초대코드로 사용자 조회 실패:', error);
            throw error;
        }
    }

    async checkFriendshipExists(userId1, userId2) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const result = await window.firebaseClient.checkFriendshipExists(userId1, userId2);
            
            if (result.error) {
                throw result.error;
            }
            
            return result.exists;
            
        } catch (error) {
            console.error('친구 관계 확인 실패:', error);
            return false;
        }
    }

    async deleteFriend(userId, friendId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const result = await window.firebaseClient.deleteFriendship(userId, friendId);
            
            if (result.error) {
                throw result.error;
            }
            
            console.log('🔥 친구 삭제 성공');
            return result.success;
            
        } catch (error) {
            console.error('친구 삭제 실패:', error);
            throw error;
        }
    }

    // ===== 모션 데이터 관련 메서드 =====
    
    async saveMotionData(userId, motionData) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            // UserIdUtils로 사용자 ID 정규화 (중복 방지)
            const normalizedUserId = UserIdUtils.normalizeKakaoId(userId);
            console.log(`🔄 모션 데이터 저장 - 사용자 ID 정규화: ${userId} → ${normalizedUserId}`);
            
            const data = {
                user_id: normalizedUserId, // 정규화된 사용자 ID 사용
                motion_type: motionData.type || 'unknown',
                intensity: motionData.intensity || 0,
                timestamp: motionData.timestamp || new Date(),
                device_info: motionData.deviceInfo || {},
                ...motionData
            };
            
            const result = await window.firebaseClient.saveMotionData(data);
            
            if (result.error) {
                throw result.error;
            }
            
            return result.data;
            
        } catch (error) {
            console.error('모션 데이터 저장 실패:', error);
            throw error;
        }
    }

    // ===== 알림 설정 관련 메서드 =====
    
    async getNotificationSettings(userId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase Storage Manager가 초기화되지 않았습니다');
            }
            
            const result = await window.firebaseClient.getNotificationSettings(userId);
            
            if (result.error) {
                throw result.error;
            }
            
            return result.data;
            
        } catch (error) {
            console.error('알림 설정 조회 실패:', error);
            // 기본 설정 반환
            return {
                push_notifications: true,
                friend_notifications: true,
                warning_notifications: true,
                danger_notifications: true,
                emergency_notifications: true
            };
        }
    }

    // ===== 현재 사용자 관련 메서드 =====
    
    /**
     * 🩸 생명구조 앱 - Firebase snake_case 필드를 JavaScript camelCase로 역매핑
     * 의료정보(혈액형 등) 정상 로딩을 위한 필수 함수
     */
    mapFieldNamesFromFirebase(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        const reverseFieldMapping = {
            // snake_case -> camelCase 역매핑
            'emergency_contact1': 'emergencyContact1',
            'emergency_name1': 'emergencyName1', 
            'emergency_contact2': 'emergencyContact2',
            'emergency_name2': 'emergencyName2',
            'profile_image': 'profilePic',
            'memorial_pic': 'memorialPic',
            'blood_type': 'bloodType',
            'medical_conditions': 'medicalConditions',
            'detail_address': 'detailAddress'
        };
        
        const mappedData = {};
        for (const [key, value] of Object.entries(data)) {
            const mappedKey = reverseFieldMapping[key] || key;
            mappedData[mappedKey] = value;
        }
        
        return mappedData;
    }
    
    getCurrentUser() {
        return this.getUserFromLocalStorage();
    }

    setCurrentUser(userData) {
        this.currentUser = userData;
        this.saveUserToLocalStorage(userData);
    }

    clearCurrentUser() {
        this.currentUser = null;
        this.clearLocalStorage();
    }

    // ===== 로컬 스토리지 유틸리티 =====
    
    saveUserToLocalStorage(userData) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(userData));
            console.log('💾 localStorage에 사용자 정보 저장:', userData.name);
        } catch (error) {
            console.error('localStorage 저장 실패:', error);
        }
    }

    getUserFromLocalStorage() {
        try {
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                const userData = JSON.parse(userStr);
                console.log('💾 localStorage에서 사용자 정보 복원:', userData.name);
                return userData;
            }
            return null;
        } catch (error) {
            console.error('localStorage 읽기 실패:', error);
            return null;
        }
    }

    clearLocalStorage() {
        try {
            localStorage.removeItem('currentUser');
            console.log('💾 localStorage에서 사용자 정보 삭제');
        } catch (error) {
            console.error('localStorage 삭제 실패:', error);
        }
    }

    // ===== 연결 상태 확인 =====
    
    async checkConnection() {
        try {
            if (!this.isInitialized) {
                return false;
            }
            
            const result = await window.firebaseClient.checkConnection();
            return result.connected;
            
        } catch (error) {
            console.warn('Firebase 연결 확인 실패:', error);
            return false;
        }
    }

}

// 전역 인스턴스 생성
window.firebaseStorage = new FirebaseStorageManager();

// 기존 storage와 호환성을 위한 별칭
window.storage = window.firebaseStorage;

console.log('🔥 Firebase Storage Manager 전역 등록 완료');