/**
 * 🚨 생명구조 시스템: 전화번호 기능 테스트 유틸리티
 * 
 * 브라우저 콘솔에서 다음 함수들을 사용할 수 있습니다:
 * - testPhoneNumbers() - 전화번호 링크 테스트
 * - checkEmergencyContacts() - 긴급 연락처 현황 확인
 * 
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-10-06
 */

/**
 * 🚨 생명구조: 친구 전화번호 기능 테스트 (디버깅용)
 * 브라우저 콘솔에서 testPhoneNumbers() 실행하여 테스트 가능
 */
function testPhoneNumbers() {
    console.group('📞 [생명구조] 전화번호 기능 테스트');
    
    // 현재 표시된 모든 전화번호 링크 찾기
    const phoneLinks = document.querySelectorAll('.friend-phone a[href^="tel:"]');
    console.log(`✅ 전화번호 링크 ${phoneLinks.length}개 발견`);
    
    phoneLinks.forEach((link, index) => {
        const phoneNumber = link.href.replace('tel:', '');
        const displayText = link.querySelector('span:last-child')?.textContent;
        
        console.log(`📱 ${index + 1}번째 전화번호:`, {
            표시텍스트: displayText,
            실제링크: phoneNumber,
            올바른형식: /^[0-9+-]+$/.test(phoneNumber),
            클릭가능: true,
            링크요소: link
        });
        
        // 클릭 테스트 (실제 전화는 걸지 않음)
        link.addEventListener('click', function(e) {
            console.log(`🚨 [생명구조] 긴급 통화 시도:`, phoneNumber);
            // 로컬 환경에서는 실제 전화를 걸지 않고 테스트만
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('⚠️ 로컬 환경에서는 전화 연결 테스트만 수행됨');
                e.preventDefault(); // 테스트 모드에서는 실제 전화 차단
                alert(`테스트: ${phoneNumber}로 전화 연결 시도`);
                return false;
            }
        });
    });
    
    // 전화번호가 없는 친구들 확인
    const noPhoneElements = document.querySelectorAll('.friend-phone div:not(a)');
    if (noPhoneElements.length > 0) {
        console.log(`📵 전화번호가 없는 친구: ${noPhoneElements.length}명`);
        noPhoneElements.forEach((element, index) => {
            const card = element.closest('.friend-status-card');
            const friendName = card?.querySelector('.friend-name')?.textContent || `알 수 없음`;
            console.log(`   ${index + 1}. ${friendName}`);
        });
    }
    
    console.groupEnd();
    return phoneLinks.length;
}

/**
 * 🚨 생명구조: 긴급 연락처 확인 함수
 * 모든 친구들의 연락 가능 여부를 확인
 */
function checkEmergencyContacts() {
    console.group('🚨 [생명구조] 긴급 연락처 현황');
    
    const friendCards = document.querySelectorAll('.friend-status-card');
    let totalFriends = friendCards.length;
    let contactableFriends = 0;
    let emergencyReadyFriends = [];
    let notContactableFriends = [];
    
    friendCards.forEach((card, index) => {
        const friendName = card.querySelector('.friend-name')?.textContent || `친구 ${index + 1}`;
        const phoneLink = card.querySelector('.friend-phone a[href^="tel:"]');
        const friendStatus = card.querySelector('.friend-status')?.textContent || '알 수 없음';
        
        if (phoneLink) {
            contactableFriends++;
            const phoneNumber = phoneLink.href.replace('tel:', '');
            const friendData = {
                이름: friendName,
                전화번호: phoneNumber,
                상태: friendStatus,
                연락가능: true
            };
            emergencyReadyFriends.push(friendData);
            console.log(`✅ ${friendName}: ${phoneNumber} (${friendStatus})`);
        } else {
            const friendData = {
                이름: friendName,
                상태: friendStatus,
                연락가능: false,
                문제: '전화번호 없음'
            };
            notContactableFriends.push(friendData);
            console.log(`❌ ${friendName}: 전화번호 없음 (${friendStatus})`);
        }
    });
    
    const percentage = totalFriends > 0 ? Math.round(contactableFriends/totalFriends*100) : 0;
    console.log(`📊 연락 가능한 친구: ${contactableFriends}/${totalFriends}명 (${percentage}%)`);
    
    // 긴급상황 대비 분석
    if (contactableFriends === 0 && totalFriends > 0) {
        console.error('🚨 CRITICAL: 긴급상황 시 연락 가능한 친구가 없습니다!');
        console.log('💡 해결방법: 친구들에게 전화번호 등록을 요청하세요.');
    } else if (contactableFriends < totalFriends / 2) {
        console.warn('⚠️ WARNING: 절반 이상의 친구가 연락 불가능합니다.');
    } else {
        console.log('✅ 긴급 연락체계가 양호합니다.');
    }
    
    // 상세 리포트
    console.log('📋 상세 리포트:', {
        전체친구수: totalFriends,
        연락가능친구수: contactableFriends,
        연락불가친구수: notContactableFriends.length,
        연락가능률: `${percentage}%`,
        연락가능친구목록: emergencyReadyFriends,
        연락불가친구목록: notContactableFriends
    });
    
    console.groupEnd();
    return { 
        total: totalFriends, 
        contactable: contactableFriends,
        percentage: percentage,
        emergencyReady: emergencyReadyFriends,
        notContactable: notContactableFriends
    };
}

/**
 * 🚨 생명구조: 전화번호 형식 검증 함수
 */
function validatePhoneNumbers() {
    console.group('📋 [생명구조] 전화번호 형식 검증');
    
    const phoneLinks = document.querySelectorAll('.friend-phone a[href^="tel:"]');
    let validNumbers = 0;
    let invalidNumbers = 0;
    
    phoneLinks.forEach((link, index) => {
        const phoneNumber = link.href.replace('tel:', '');
        const displayText = link.querySelector('span:last-child')?.textContent;
        
        // 한국 전화번호 형식 검증 (기본적인 패턴)
        const koreanPhoneRegex = /^(\+82|0)(\d{1,2})[-.]?\d{3,4}[-.]?\d{4}$/;
        const cleanNumber = phoneNumber.replace(/[-.\s]/g, '');
        
        const isValid = koreanPhoneRegex.test(cleanNumber) || /^[0-9+-]{10,15}$/.test(phoneNumber);
        
        if (isValid) {
            validNumbers++;
            console.log(`✅ ${index + 1}. 유효: ${displayText} → ${phoneNumber}`);
        } else {
            invalidNumbers++;
            console.error(`❌ ${index + 1}. 무효: ${displayText} → ${phoneNumber}`);
        }
    });
    
    console.log(`📊 검증 결과: 유효 ${validNumbers}개, 무효 ${invalidNumbers}개`);
    console.groupEnd();
    
    return { valid: validNumbers, invalid: invalidNumbers };
}

/**
 * 🚨 생명구조: 종합 테스트 실행
 */
function runFullPhoneTest() {
    console.group('🔍 [생명구조] 전화번호 기능 종합 테스트');
    console.log('테스트 시작 시간:', new Date().toLocaleString());
    
    const phoneTest = testPhoneNumbers();
    const contactTest = checkEmergencyContacts();
    const validateTest = validatePhoneNumbers();
    
    console.log('📊 종합 결과:', {
        전화번호링크수: phoneTest,
        연락가능친구: contactTest.contactable,
        전체친구: contactTest.total,
        연락가능률: contactTest.percentage + '%',
        유효번호수: validateTest.valid,
        무효번호수: validateTest.invalid
    });
    
    // 최종 평가
    if (phoneTest === 0) {
        console.error('🚨 FAIL: 전화번호 링크가 없습니다!');
    } else if (contactTest.percentage < 50) {
        console.warn('⚠️ WARNING: 연락 가능한 친구가 부족합니다.');
    } else if (validateTest.invalid > 0) {
        console.warn('⚠️ WARNING: 일부 전화번호 형식이 올바르지 않습니다.');
    } else {
        console.log('✅ PASS: 전화번호 기능이 정상적으로 작동합니다!');
    }
    
    console.groupEnd();
    return {
        phoneLinks: phoneTest,
        contacts: contactTest,
        validation: validateTest,
        overallStatus: phoneTest > 0 && contactTest.percentage >= 50 && validateTest.invalid === 0 ? 'PASS' : 'FAIL'
    };
}

// 전역 함수로 등록
if (typeof window !== 'undefined') {
    window.testPhoneNumbers = testPhoneNumbers;
    window.checkEmergencyContacts = checkEmergencyContacts;
    window.validatePhoneNumbers = validatePhoneNumbers;
    window.runFullPhoneTest = runFullPhoneTest;
    
    console.log('📞 [생명구조] 전화번호 테스트 유틸리티 로드 완료');
    console.log('사용 가능한 함수: testPhoneNumbers(), checkEmergencyContacts(), validatePhoneNumbers(), runFullPhoneTest()');
}

// 자동 초기화 (페이지 로드 후 5초 뒤에 자동 테스트)
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (document.querySelectorAll('.friend-phone').length > 0) {
            console.log('📞 [생명구조] 자동 테스트 실행 중...');
            runFullPhoneTest();
        }
    }, 5000);
}