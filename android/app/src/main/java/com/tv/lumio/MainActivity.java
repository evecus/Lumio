package com.tv.lumio;

import com.reactnativenavigation.NavigationActivity;
import android.view.KeyEvent;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MainActivity extends NavigationActivity {

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            try {
                ReactContext reactContext = ((MainApplication) getApplication())
                        .getReactNativeHost()
                        .getReactInstanceManager()
                        .getCurrentReactContext();
                if (reactContext != null) {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("tvMenuKey", null);
                }
            } catch (Exception e) {
                // ReactContext 尚未就绪时忽略
            }
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
            // 仅广播事件，不消费按键，避免影响其他页面里下键的正常焦点导航
            // （比如 TV 播放详情页需要用下键呼出底部控制栏，
            // 但其余页面下键仍要保留原本"移动焦点"的行为）
            try {
                ReactContext reactContext = ((MainApplication) getApplication())
                        .getReactNativeHost()
                        .getReactInstanceManager()
                        .getCurrentReactContext();
                if (reactContext != null) {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("tvDpadDownKey", null);
                }
            } catch (Exception e) {
                // ReactContext 尚未就绪时忽略
            }
            return super.onKeyDown(keyCode, event);
        }
        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
                || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY
                || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
            // 媒体键（遥控器播放/暂停键）广播给 JS，供 MV 播放器等使用；
            // 不消费按键，保持系统默认行为不受影响
            try {
                ReactContext reactContext = ((MainApplication) getApplication())
                        .getReactNativeHost()
                        .getReactInstanceManager()
                        .getCurrentReactContext();
                if (reactContext != null) {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("tvMediaKey", null);
                }
            } catch (Exception e) {
                // ReactContext 尚未就绪时忽略
            }
            return super.onKeyDown(keyCode, event);
        }
        return super.onKeyDown(keyCode, event);
    }
}
