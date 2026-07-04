package com.tv.lumio.tvfocus;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;

public class TvFocusableLayout extends ViewGroup {

    private final Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private float borderRadiusDp = 8f;
    private boolean isFocused = false;
    private boolean hasTVPreferredFocus = false;
    private boolean preferredFocusConsumed = false;
    // 锁定水平方向键：锁定时左右键不移动焦点，而是向 JS 发事件
    private boolean lockHorizontal = false;

    public TvFocusableLayout(Context context) {
        super(context);
        setFocusable(true);
        setFocusableInTouchMode(false);
        setDescendantFocusability(FOCUS_BLOCK_DESCENDANTS);

        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(dpToPx(2.5f));
        borderPaint.setColor(0xFF3498DB);

        setWillNotDraw(false);

        setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                ReactContext reactContext = (ReactContext) getContext();
                reactContext.getJSModule(RCTEventEmitter.class)
                        .receiveEvent(getId(), "topPress", null);
            }
        });
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {}

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(
            MeasureSpec.getSize(widthMeasureSpec),
            MeasureSpec.getSize(heightMeasureSpec)
        );
    }

    public void setBorderRadius(float radiusDp) {
        this.borderRadiusDp = radiusDp;
        invalidate();
    }

    public void setFocusColor(int color) {
        borderPaint.setColor(color);
        invalidate();
    }

    public void setHasTVPreferredFocus(boolean preferred) {
        this.hasTVPreferredFocus = preferred;
        this.preferredFocusConsumed = false;
    }

    public void setLockHorizontal(boolean lock) {
        this.lockHorizontal = lock;
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (hasTVPreferredFocus && !preferredFocusConsumed) {
            preferredFocusConsumed = true;
            post(new Runnable() {
                @Override
                public void run() {
                    requestFocus();
                }
            });
        }
    }

    @Override
    protected void onFocusChanged(boolean gainFocus, int direction,
            android.graphics.Rect previouslyFocusedRect) {
        super.onFocusChanged(gainFocus, direction, previouslyFocusedRect);
        isFocused = gainFocus;
        // 失去焦点时自动解锁
        if (!gainFocus) lockHorizontal = false;
        invalidate();
        // 向 JS 发送焦点事件
        ReactContext reactContext = (ReactContext) getContext();
        reactContext.getJSModule(RCTEventEmitter.class)
                .receiveEvent(getId(), gainFocus ? "topFocus" : "topBlur", null);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
            performClick();
            return true;
        }
        // 锁定水平键时，拦截左右方向键并发送 JS 事件
        if (lockHorizontal) {
            if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                sendDirectionEvent("left");
                return true; // 消费，不移焦点
            }
            if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                sendDirectionEvent("right");
                return true; // 消费，不移焦点
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    private void sendDirectionEvent(String direction) {
        ReactContext reactContext = (ReactContext) getContext();
        WritableMap map = Arguments.createMap();
        map.putString("direction", direction);
        reactContext.getJSModule(RCTEventEmitter.class)
                .receiveEvent(getId(), "topDirection", map);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (!isFocused) return;

        float stroke = borderPaint.getStrokeWidth();
        float half = stroke / 2f;
        float r = dpToPx(borderRadiusDp);
        RectF rect = new RectF(half, half, getWidth() - half, getHeight() - half);
        canvas.drawRoundRect(rect, r, r, borderPaint);
    }

    private float dpToPx(float dp) {
        return dp * getContext().getResources().getDisplayMetrics().density;
    }
}
