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
        return super.onKeyDown(keyCode, event);
    }
}
