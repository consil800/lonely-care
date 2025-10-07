/**
 * 광고 배너 스타일 정리 스크립트
 * AdBannerComponent가 추가한 인라인 스타일을 제거하고 기존 스타일 복원
 */

(function() {
    console.log('🧹 광고 배너 스타일 정리 시작');
    
    // AdBannerComponent가 추가한 컨테이너 제거
    const adContainers = document.querySelectorAll('#ad-banners-container, .ad-banners-container');
    adContainers.forEach(container => {
        console.log('🗑️ 광고 컨테이너 제거:', container.id || container.className);
        container.remove();
    });
    
    // AdBannerComponent가 추가한 인라인 스타일 제거
    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach(styleTag => {
        if (styleTag.textContent.includes('ad-banner') || 
            styleTag.textContent.includes('ad-banners-container')) {
            console.log('🗑️ AdBanner 인라인 스타일 제거');
            styleTag.remove();
        }
    });
    
    // 기존 광고 아이템들의 스타일 복원 확인
    const adItems = document.querySelectorAll('.ad-item');
    adItems.forEach(item => {
        // 인라인 스타일 제거
        item.removeAttribute('style');
        
        // 기존 클래스 유지
        if (!item.classList.contains('ad-item')) {
            item.classList.add('ad-item');
        }
        
        console.log('✅ 광고 아이템 스타일 복원:', item);
    });
    
    // 기존 광고 배너들의 스타일 복원 확인
    const adBanners = document.querySelectorAll('.ad-banner');
    adBanners.forEach(banner => {
        // AdBannerComponent가 추가한 클래스 제거
        banner.classList.remove('show', 'ad-banner-insurance', 'ad-banner-funeral', 'ad-banner-lawyer', 'ad-banner-healthcare');
        
        // 인라인 스타일 제거
        banner.removeAttribute('style');
        
        console.log('✅ 광고 배너 스타일 복원:', banner);
    });
    
    // 광고 콘텐츠 스타일 복원
    const adContents = document.querySelectorAll('.ad-content');
    adContents.forEach(content => {
        content.removeAttribute('style');
        console.log('✅ 광고 콘텐츠 스타일 복원:', content);
    });
    
    console.log('✅ 광고 배너 스타일 정리 완료');
    
    // 5초 후 다시 한 번 정리 (지연 로딩된 요소들을 위해)
    setTimeout(() => {
        console.log('🔄 지연 광고 요소 정리 중...');
        
        const delayedContainers = document.querySelectorAll('#ad-banners-container, .ad-banners-container');
        delayedContainers.forEach(container => {
            container.remove();
        });
        
        console.log('✅ 지연 광고 요소 정리 완료');
    }, 5000);
    
})();