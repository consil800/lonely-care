package com.lonelycare.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class SessionCheckReceiver extends BroadcastReceiver {
    private static final String TAG = "SessionCheckReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "세션 체크 알람 수신");
        
        // SessionKeepAliveService 시작
        Intent serviceIntent = new Intent(context, SessionKeepAliveService.class);
        context.startService(serviceIntent);
    }
}