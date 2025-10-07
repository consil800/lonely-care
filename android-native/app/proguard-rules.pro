# Android R+ 호환성을 위한 ProGuard 규칙

# 기본 Android 규칙 유지
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver

# WebView JavaScript Interface 보존
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 카카오 SDK 호환성
-keep class com.kakao.** { *; }
-dontwarn com.kakao.**

# Firebase 호환성
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# 네트워크 관련 클래스 보존
-keep class org.apache.http.** { *; }
-keep class android.net.** { *; }

# 자바스크립트 브릿지 인터페이스 보존 (R8 호환성 강화)
-keep class com.lonelycare.app.AndroidBridge { *; }
-keep class com.lonelycare.app.AndroidBridge$* { *; }
-keepclassmembers class com.lonelycare.app.AndroidBridge$* {
    *;
}

# 리플렉션 사용 클래스 보존
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses

# Android R+ 호환성: 리소스 최적화 비활성화
-dontoptimize
-dontobfuscate
-dontshrink

# JSON 직렬화 클래스 보존
-keep class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# 디버깅을 위한 라인 번호 보존
-keepattributes SourceFile,LineNumberTable

# Android R+ 패키지 가시성 규칙
-keep class android.content.** { *; }
-keep class android.app.** { *; }

# R8 NullPointerException 방지 - 모든 앱 클래스 보존
-keep class com.lonelycare.app.** { *; }
-keepclassmembers class com.lonelycare.app.** {
    *;
}