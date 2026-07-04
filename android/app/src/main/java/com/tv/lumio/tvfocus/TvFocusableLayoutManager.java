package com.tv.lumio.tvfocus;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

import javax.annotation.Nullable;

public class TvFocusableLayoutManager extends ViewGroupManager<TvFocusableLayout> {

    public static final String REACT_CLASS = "TvFocusView";

    // JS 可调用的命令 ID
    public static final int CMD_REQUEST_FOCUS = 1;

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    protected TvFocusableLayout createViewInstance(ThemedReactContext reactContext) {
        return new TvFocusableLayout(reactContext);
    }

    @ReactProp(name = "borderRadius", defaultFloat = 8f)
    public void setBorderRadius(TvFocusableLayout view, float radius) {
        view.setBorderRadius(radius);
    }

    @ReactProp(name = "focusColor", defaultInt = 0xFF3498DB)
    public void setFocusColor(TvFocusableLayout view, int color) {
        view.setFocusColor(color);
    }

    @ReactProp(name = "hasTVPreferredFocus", defaultBoolean = false)
    public void setHasTVPreferredFocus(TvFocusableLayout view, boolean preferred) {
        view.setHasTVPreferredFocus(preferred);
    }

    @ReactProp(name = "lockHorizontal", defaultBoolean = false)
    public void setLockHorizontal(TvFocusableLayout view, boolean lock) {
        view.setLockHorizontal(lock);
    }

    /**
     * 注册 JS 可调用的命令，让 JS 能主动把焦点推给 TvFocusView
     */
    @Override
    @Nullable
    public Map<String, Integer> getCommandsMap() {
        return MapBuilder.of("requestFocus", CMD_REQUEST_FOCUS);
    }

    @Override
    public void receiveCommand(TvFocusableLayout view, int commandId, @Nullable ReadableArray args) {
        if (commandId == CMD_REQUEST_FOCUS) {
            view.post(new Runnable() {
                @Override
                public void run() {
                    view.requestFocus();
                }
            });
        }
    }

    @Override
    public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.<String, Object>builder()
                .put("topPress", MapBuilder.of("registrationName", "onPress"))
                .put("topDirection", MapBuilder.of("registrationName", "onDirection"))
                .put("topFocus", MapBuilder.of("registrationName", "onFocus"))
                .put("topBlur", MapBuilder.of("registrationName", "onBlur"))
                .build();
    }
}
