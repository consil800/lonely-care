package com.lonelycare.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class HeartbeatReceiver extends BroadcastReceiver {
    private static final String TAG = "HeartbeatReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "하트비트 알람 수신: " + action);
        
        if ("HEARTBEAT_ALARM".equals(action)) {
            String pairId = intent.getStringExtra("pair_id");
            int delaySeconds = intent.getIntExtra("delay_seconds", 1);
            
            Log.d(TAG, "하트비트 실행: " + pairId + " (지연: " + delaySeconds + "초)");
            
            // HeartbeatService에 하트비트 전송 요청
            Intent serviceIntent = new Intent(context, HeartbeatService.class);
            serviceIntent.setAction("SEND_HEARTBEAT");
            serviceIntent.putExtra("pair_id", pairId);
            context.startService(serviceIntent);
            
            // 5분 후 하트비트 상태 확인
            Intent checkIntent = new Intent(context, HeartbeatService.class);
            checkIntent.setAction("CHECK_HEARTBEAT");
            context.startService(checkIntent);
        }
    }
}