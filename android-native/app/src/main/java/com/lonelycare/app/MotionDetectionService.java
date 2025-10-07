package com.lonelycare.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import java.util.Date;

public class MotionDetectionService extends Service implements SensorEventListener {
    private static final String TAG = "MotionDetectionService";
    private static final String CHANNEL_ID = "motion_detection_channel";
    private static final int NOTIFICATION_ID = 1;
    
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private Sensor stepCounter;
    
    private SharedPreferences prefs;
    private static final String PREF_NAME = "motion_detection";
    private static final String LAST_MOTION_TIME = "last_motion_time";
    private static final String STEP_COUNT = "step_count";
    
    // 움직임 감지 임계값
    private static final float MOTION_THRESHOLD = 2.0f;
    private float lastX, lastY, lastZ;
    private boolean isFirstReading = true;
    
    // 주기적 체크를 위한 핸들러
    private Handler handler = new Handler(Looper.getMainLooper());
    private Runnable periodicCheck;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "서비스 생성됨");
        
        prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        
        // 가속도계 센서
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        
        // 걸음 감지 센서 (있으면 사용)
        stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        
        // 주기적 체크 (1시간마다)
        periodicCheck = new Runnable() {
            @Override
            public void run() {
                checkAndUpdateActivity();
                handler.postDelayed(this, 3600000); // 1시간
            }
        };
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "서비스 시작됨");
        
        // Foreground 서비스로 실행
        createNotificationChannel();
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        // 센서 리스너 등록
        if (accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL);
        }
        if (stepCounter != null) {
            sensorManager.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL);
        }
        
        // 주기적 체크 시작
        handler.post(periodicCheck);
        
        // 마지막 움직임 시간 초기화 (첫 실행시)
        if (prefs.getLong(LAST_MOTION_TIME, 0) == 0) {
            updateLastMotionTime();
        }
        
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "서비스 종료됨");
        
        // 센서 리스너 해제
        sensorManager.unregisterListener(this);
        
        // 주기적 체크 중지
        handler.removeCallbacks(periodicCheck);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            
            if (!isFirstReading) {
                float deltaX = Math.abs(x - lastX);
                float deltaY = Math.abs(y - lastY);
                float deltaZ = Math.abs(z - lastZ);
                
                float totalMovement = deltaX + deltaY + deltaZ;
                
                if (totalMovement > MOTION_THRESHOLD) {
                    Log.d(TAG, "움직임 감지됨: " + totalMovement);
                    updateLastMotionTime();
                }
            } else {
                isFirstReading = false;
            }
            
            lastX = x;
            lastY = y;
            lastZ = z;
            
        } else if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            float steps = event.values[0];
            float lastSteps = prefs.getFloat(STEP_COUNT, 0);
            
            if (steps > lastSteps) {
                Log.d(TAG, "걸음 감지됨: " + steps);
                updateLastMotionTime();
                prefs.edit().putFloat(STEP_COUNT, steps).apply();
            }
        }
    }
    
    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // 필요시 구현
    }
    
    private void updateLastMotionTime() {
        long currentTime = System.currentTimeMillis();
        prefs.edit().putLong(LAST_MOTION_TIME, currentTime).apply();
        
        // Supabase에 활동 기록 전송
        sendActivityToSupabase();
    }
    
    private void checkAndUpdateActivity() {
        long lastMotion = prefs.getLong(LAST_MOTION_TIME, System.currentTimeMillis());
        long currentTime = System.currentTimeMillis();
        long timeDiff = currentTime - lastMotion;
        
        // 24시간 이상 움직임이 없으면 알림
        if (timeDiff > 24 * 60 * 60 * 1000) {
            Log.w(TAG, "24시간 이상 움직임 없음!");
            // 여기에 알림 로직 추가
        }
    }
    
    private void sendActivityToSupabase() {
        // WebView를 통해 JavaScript 함수 호출
        Intent intent = new Intent("com.lonelycare.MOTION_DETECTED");
        intent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(intent);
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "안전 모니터링",
                    NotificationManager.IMPORTANCE_MIN  // IMPORTANCE_LOW에서 MIN으로 변경 (더 조용함)
            );
            channel.setDescription("백그라운드에서 안전을 모니터링합니다");
            channel.setShowBadge(false);  // 알림 배지 제거
            channel.enableLights(false);  // LED 표시등 비활성화
            channel.enableVibration(false);  // 진동 비활성화
            channel.setSound(null, null);  // 알림음 비활성화
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("안심케어")
                .setContentText("백그라운드에서 안전을 모니터링 중")  // 더 친화적인 메시지
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_MIN)  // PRIORITY_LOW에서 MIN으로 변경
                .setShowWhen(false)  // 시간 표시 비활성화
                .setOngoing(true)    // 스와이프로 제거 방지 (시스템 서비스임을 명시)
                .setAutoCancel(false)  // 터치로 자동 제거 방지
                .setSilent(true)     // 완전히 조용한 알림
                .setBadgeIconType(NotificationCompat.BADGE_ICON_NONE)  // 배지 아이콘 제거
                .build();
    }
}