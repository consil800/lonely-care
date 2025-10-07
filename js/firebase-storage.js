// Firebase Storage 관리자 - Supabase Storage를 대체
class FirebaseStorage {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.initialized = false;
    }

    // 초기화
    async init() {
        if (this.initialized) return;
        
        try {
            // Firebase가 로드될 때까지 대기
            await this.waitForFirebase();
            
            this.db = window.firebaseDb || firebase.firestore();
            this.auth = window.firebaseAuth || firebase.auth();
            
            // 오프라인 지원은 firebase-config.js에서 처리됨
            
            // 인증 상태 리스너
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = await this.getUser(user.uid);
                } else {
                    this.currentUser = null;
                }
            });
            
            this.initialized = true;
            console.log('✅ Firebase Storage 초기화 완료');
        } catch (error) {
            console.error('❌ Firebase Storage 초기화 실패:', error);
            throw error;
        }
    }

    // Firebase 로드 대기
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.firestore) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    // ===== 사용자 관련 메서드 =====
    
    // 사용자 조회 (kakaoId로) - UserIdUtils 적용
    async getUserByKakaoId(kakaoId) {
        try {
            // UserIdUtils로 정규화된 ID 사용
            const normalizedId = UserIdUtils.normalizeKakaoId(kakaoId);
            
            // 우선 문서 ID로 직접 조회 (가장 효율적)
            const docRef = this.db.collection('users').doc(normalizedId);
            const doc = await docRef.get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            
            // 문서 ID로 찾을 수 없으면 kakaoId 필드로 쿼리 검색
            const snapshot = await this.db.collection('users')
                .where('kakaoId', '==', normalizedId)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
        } catch (error) {
            console.error('사용자 조회 실패:', error);
            return null;
        }
    }

    // 사용자 조회 (userId로)
    async getUser(userId) {
        try {
            const doc = await this.db.collection('users').doc(userId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('사용자 조회 실패:', error);
            return null;
        }
    }

    // 사용자 생성
    async createUser(userData) {
        try {
            // UserIdUtils로 카카오 ID 정규화
            const normalizedId = UserIdUtils.normalizeKakaoId(userData.kakao_id || userData.kakaoId || userData.id);
            
            // 중복 사용자 검색 - 가능한 모든 ID 형태 검색
            const searchIds = UserIdUtils.generateSearchIds(normalizedId);
            let existing = null;
            
            for (const searchId of searchIds) {
                existing = await this.getUserByKakaoId(searchId);
                if (existing) {
                    console.log(`✅ 기존 사용자 발견: ${existing.name} (검색 ID: ${searchId}, 정규화 ID: ${normalizedId})`);
                    break;
                }
            }
            
            if (existing) {
                // 기존 사용자 정보 업데이트 (프로필 정보가 더 완전한 경우)
                const updates = {};
                if (userData.name && !existing.name) updates.name = userData.name;
                if (userData.profile_image && !existing.profileImage) {
                    updates.profileImage = userData.profile_image;
                }
                if (userData.email && !existing.email) updates.email = userData.email;
                
                if (Object.keys(updates).length > 0) {
                    await this.updateUser(existing.id, updates);
                    console.log(`📝 기존 사용자 정보 업데이트: ${existing.id}`);
                }
                
                return existing;
            }

            // Firebase 형식으로 변환 (UserIdUtils로 정규화된 사용자 데이터 사용)
            const normalizedUserData = UserIdUtils.normalizeUserData(userData);
            const firebaseDocId = UserIdUtils.getFirebaseDocId(normalizedId);
            
            const firebaseUserData = {
                kakaoId: normalizedUserData.kakao_id, // 정규화된 카카오 ID 사용
                name: normalizedUserData.name,
                email: normalizedUserData.email || null,
                profileImage: normalizedUserData.profile_image || normalizedUserData.profileImage || null,
                birthDate: normalizedUserData.birth_date || normalizedUserData.birthDate || null,
                bloodType: normalizedUserData.blood_type || normalizedUserData.bloodType || 'unknown',
                gender: normalizedUserData.gender || 'unknown',
                phone: normalizedUserData.phone || null,
                emergencyContactName: normalizedUserData.emergency_contact_name || normalizedUserData.emergencyContactName || null,
                emergencyContactPhone: normalizedUserData.emergency_contact_phone || normalizedUserData.emergencyContactPhone || null,
                medicalInfo: normalizedUserData.medical_info || normalizedUserData.medicalInfo || {},
                locationData: normalizedUserData.location_data || normalizedUserData.locationData || {},
                preferences: normalizedUserData.preferences || {},
                isActive: normalizedUserData.is_active !== undefined ? normalizedUserData.is_active : true,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // undefined 값을 가진 필드 제거
            Object.keys(firebaseUserData).forEach(key => {
                if (firebaseUserData[key] === undefined) {
                    delete firebaseUserData[key];
                }
            });

            // 정규화된 ID를 document ID로 사용하여 중복 방지 및 일관성 확보
            const docRef = this.db.collection('users').doc(firebaseDocId);
            await docRef.set(firebaseUserData);
            
            // 사용자 상태 초기화
            await this.initUserStatus(firebaseDocId);
            
            console.log(`🆔 사용자 생성 완료: ${UserIdUtils.getUserIdentifier(normalizedId, normalizedUserData.name)}`);
            return { id: firebaseDocId, ...firebaseUserData };
        } catch (error) {
            console.error('사용자 생성 실패:', error);
            throw error;
        }
    }

    // 사용자 업데이트
    async updateUser(userId, updates) {
        try {
            // Firebase 형식으로 필드명 정규화
            const firebaseUpdates = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // 필드명 매핑 (기존 코드와의 호환성 유지)
            const fieldMapping = {
                'name': 'name',
                'phone': 'phone', 
                'profilePic': 'profileImage',
                'profile_image': 'profileImage',
                'birth': 'birthDate',
                'gender': 'gender',
                'address': 'address',
                'detailAddress': 'detailAddress',
                'postal': 'postal',
                'emergencyContact1': 'emergencyContactPhone',
                'emergencyName1': 'emergencyContactName',
                'emergencyContact2': 'emergencyContact2',
                'emergencyName2': 'emergencyName2',
                'bloodType': 'bloodType',
                'medicalConditions': 'medicalConditions',
                'allergies': 'allergies',
                'workplace': 'workplace',
                'specialNotes': 'specialNotes',
                'memorialPic': 'memorialPic'
            };
            
            // 필드 매핑 적용
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    const mappedKey = fieldMapping[key] || key;
                    firebaseUpdates[mappedKey] = value;
                }
            });

            console.log(`🔥 Firebase 사용자 업데이트: ${userId}`, firebaseUpdates);
            await this.db.collection('users').doc(userId).update(firebaseUpdates);
            
            return true;
        } catch (error) {
            console.error('사용자 업데이트 실패:', error);
            return false;
        }
    }

    // 현재 사용자 설정
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    }

    // 현재 사용자 가져오기
    getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            return this.currentUser;
        }
        return null;
    }

    // ===== 사용자 상태 관련 메서드 =====

    // 사용자 상태 초기화
    async initUserStatus(userId) {
        try {
            await this.db.collection('userStatus').doc(userId).set({
                status: 'normal',
                lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                isOnline: true,
                batteryLevel: 100,
                deviceInfo: {},
                communicationOffset: 0,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('사용자 상태 초기화 실패:', error);
        }
    }

    // 사용자 상태 업데이트
    async updateUserStatus(userId, statusData) {
        try {
            await this.db.collection('userStatus').doc(userId).set({
                ...statusData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('사용자 상태 업데이트 실패:', error);
            return false;
        }
    }

    // 하트비트 업데이트
    async updateHeartbeat(userId) {
        try {
            await this.db.collection('userStatus').doc(userId).update({
                lastHeartbeat: firebase.firestore.FieldValue.serverTimestamp(),
                isOnline: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('하트비트 업데이트 실패:', error);
            return false;
        }
    }

    // ===== 친구 관련 메서드 =====

    // 친구 목록 조회
    async getFriends(userId) {
        try {
            const snapshot = await this.db.collection('friends')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .get();
            
            const friends = [];
            for (const doc of snapshot.docs) {
                const friendData = doc.data();
                const friend = await this.getUser(friendData.friendId);
                if (friend) {
                    friends.push({
                        ...friend,
                        friendshipId: doc.id,
                        friendshipStatus: friendData.status
                    });
                }
            }
            
            return friends;
        } catch (error) {
            console.error('친구 목록 조회 실패:', error);
            return [];
        }
    }

    // 친구 추가
    async addFriend(userId, friendId) {
        try {
            // 이미 친구인지 확인
            const existing = await this.db.collection('friends')
                .where('userId', '==', userId)
                .where('friendId', '==', friendId)
                .get();
            
            if (!existing.empty) {
                return { success: false, message: '이미 친구입니다.' };
            }

            // 양방향 친구 관계 생성
            const batch = this.db.batch();
            
            // A -> B
            const ref1 = this.db.collection('friends').doc();
            batch.set(ref1, {
                userId: userId,
                friendId: friendId,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // B -> A
            const ref2 = this.db.collection('friends').doc();
            batch.set(ref2, {
                userId: friendId,
                friendId: userId,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('친구 추가 실패:', error);
            return { success: false, message: error.message };
        }
    }

    // 친구 삭제
    async removeFriend(userId, friendId) {
        try {
            // 양방향 관계 모두 삭제
            const batch = this.db.batch();
            
            // A -> B 관계 찾기
            const snapshot1 = await this.db.collection('friends')
                .where('userId', '==', userId)
                .where('friendId', '==', friendId)
                .get();
            
            // B -> A 관계 찾기
            const snapshot2 = await this.db.collection('friends')
                .where('userId', '==', friendId)
                .where('friendId', '==', userId)
                .get();
            
            snapshot1.docs.forEach(doc => batch.delete(doc.ref));
            snapshot2.docs.forEach(doc => batch.delete(doc.ref));
            
            await batch.commit();
            return true;
        } catch (error) {
            console.error('친구 삭제 실패:', error);
            return false;
        }
    }

    // ===== 실시간 구독 메서드 =====

    // 친구 상태 구독
    subscribeFriendStatus(friendId, callback) {
        return this.db.collection('userStatus')
            .doc(friendId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                }
            });
    }

    // 친구 목록 실시간 구독
    subscribeFriends(userId, callback) {
        return this.db.collection('friends')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .onSnapshot(async (snapshot) => {
                const friends = [];
                for (const doc of snapshot.docs) {
                    const friendData = doc.data();
                    const friend = await this.getUser(friendData.friendId);
                    if (friend) {
                        const status = await this.getUserStatus(friend.id);
                        friends.push({
                            ...friend,
                            ...status,
                            friendshipId: doc.id
                        });
                    }
                }
                callback(friends);
            });
    }

    // 사용자 상태 조회
    async getUserStatus(userId) {
        try {
            const doc = await this.db.collection('userStatus').doc(userId).get();
            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error('사용자 상태 조회 실패:', error);
            return null;
        }
    }

    // ===== 알림 관련 메서드 =====

    // 알림 생성
    async createNotification(notification) {
        try {
            const docRef = await this.db.collection('notifications').add({
                ...notification,
                isRead: false,
                isSent: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { id: docRef.id, ...notification };
        } catch (error) {
            console.error('알림 생성 실패:', error);
            return null;
        }
    }

    // 알림 조회 (인덱스 문제 해결용 - 단순 쿼리)
    async getNotifications(userId, limit = 20) {
        try {
            // 인덱스 없이 사용할 수 있는 단순 쿼리
            const snapshot = await this.db.collection('notifications')
                .where('userId', '==', userId)
                .limit(limit)
                .get();
            
            // 클라이언트에서 정렬 (인덱스 없이 가능)
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // 생성 시간으로 정렬
            return notifications.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return bTime - aTime; // 내림차순 정렬
            });
            
        } catch (error) {
            console.error('알림 조회 실패:', error);
            return [];
        }
    }

    // 알림 읽음 처리
    async markNotificationAsRead(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).update({
                isRead: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error);
            return false;
        }
    }

    // ===== FCM 토큰 관리 =====

    // FCM 토큰 저장
    async saveFCMToken(userId, token, deviceInfo = {}) {
        try {
            // 기존 토큰 확인
            const existing = await this.db.collection('fcmTokens')
                .where('userId', '==', userId)
                .where('token', '==', token)
                .get();
            
            if (!existing.empty) {
                // 기존 토큰 업데이트
                await existing.docs[0].ref.update({
                    lastUsed: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true
                });
            } else {
                // 새 토큰 생성
                await this.db.collection('fcmTokens').add({
                    userId: userId,
                    token: token,
                    deviceType: deviceInfo.type || 'web',
                    deviceId: deviceInfo.id || 'unknown',
                    isActive: true,
                    lastUsed: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            return true;
        } catch (error) {
            console.error('FCM 토큰 저장 실패:', error);
            return false;
        }
    }

    // FCM 토큰 삭제
    async removeFCMToken(token) {
        try {
            const snapshot = await this.db.collection('fcmTokens')
                .where('token', '==', token)
                .get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            return true;
        } catch (error) {
            console.error('FCM 토큰 삭제 실패:', error);
            return false;
        }
    }

    // ===== 초대 코드 관련 =====

    // 초대 코드로 사용자 찾기 - 수정됨
    async findUserByInviteCode(inviteCode) {
        try {
            // 초대 코드는 별도 컬렉션에서 관리해야 함
            // 현재는 kakaoId 대신 name으로 검색 (임시)
            const snapshot = await this.db.collection('users')
                .where('name', '==', inviteCode)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            // kakaoId로도 검색 시도 (레거시 호환)
            const snapshot2 = await this.db.collection('users')
                .where('kakaoId', '==', String(inviteCode))
                .limit(1)
                .get();
                
            if (!snapshot2.empty) {
                const doc = snapshot2.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
        } catch (error) {
            console.error('초대 코드로 사용자 찾기 실패:', error);
            return null;
        }
    }

    // ===== 활동 기록 =====

    // 사용자 활동 기록
    async recordActivity(userId, activityType, activityData = {}) {
        try {
            await this.db.collection('userActivities').add({
                userId: userId,
                activityType: activityType,
                activityData: activityData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('활동 기록 실패:', error);
            return false;
        }
    }
}

// 전역 인스턴스 생성
const firebaseStorage = new FirebaseStorage();

// 기존 storage 변수와의 호환성을 위한 래퍼
const storage = {
    init: () => firebaseStorage.init(),
    supabase: {
        client: {
            auth: {
                signOut: () => firebase.auth().signOut()
            },
            from: (table) => ({
                select: () => ({ data: [], error: null }),
                insert: () => ({ data: null, error: null }),
                update: () => ({ data: null, error: null }),
                delete: () => ({ data: null, error: null })
            })
        }
    },
    getUserByKakaoId: (kakaoId) => firebaseStorage.getUserByKakaoId(kakaoId),
    getUser: (userId) => firebaseStorage.getUser(userId),
    createUser: (userData) => firebaseStorage.createUser(userData),
    updateUser: (userId, updates) => firebaseStorage.updateUser(userId, updates),
    setCurrentUser: (user) => firebaseStorage.setCurrentUser(user),
    getCurrentUser: () => firebaseStorage.getCurrentUser(),
    updateUserStatus: (userId, status) => firebaseStorage.updateUserStatus(userId, { status }),
    updateHeartbeat: (userId) => firebaseStorage.updateHeartbeat(userId),
    getFriends: (userId) => firebaseStorage.getFriends(userId),
    addFriend: (userId, friendId) => firebaseStorage.addFriend(userId, friendId),
    removeFriend: (userId, friendId) => firebaseStorage.removeFriend(userId, friendId),
    createNotification: (notification) => firebaseStorage.createNotification(notification),
    getNotifications: (userId, limit) => firebaseStorage.getNotifications(userId, limit),
    markNotificationAsRead: (notificationId) => firebaseStorage.markNotificationAsRead(notificationId),
    saveFCMToken: (userId, token, deviceInfo) => firebaseStorage.saveFCMToken(userId, token, deviceInfo),
    removeFCMToken: (token) => firebaseStorage.removeFCMToken(token),
    findUserByInviteCode: (inviteCode) => firebaseStorage.findUserByInviteCode(inviteCode),
    recordActivity: (userId, type, data) => firebaseStorage.recordActivity(userId, type, data),
    subscribeFriendStatus: (friendId, callback) => firebaseStorage.subscribeFriendStatus(friendId, callback),
    subscribeFriends: (userId, callback) => firebaseStorage.subscribeFriends(userId, callback)
};

// 전역 변수로 노출
window.storage = storage;
window.firebaseStorage = firebaseStorage;

// auth 객체와의 호환성을 위한 추가 메서드
storage.getCurrentUser = () => firebaseStorage.getCurrentUser();
storage.isLoggedIn = () => firebaseStorage.getCurrentUser() !== null;