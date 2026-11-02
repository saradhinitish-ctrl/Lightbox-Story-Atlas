package com.lightbox.widgets;

import android.app.Activity;
import android.content.res.ColorStateList;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Shared page margins, typography and inset handling for the two native tools. */
abstract class PaperActivity extends Activity {
    static final int PAPER=0xffefede6, INK=0xff181916, SUB=0xff53564d, RULE=0xffcecec3, LIME=0xffc6ff00, LILAC=0xffebe5ff;
    final int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    LinearLayout column() {
        LinearLayout v=new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        return v;
    }
    TextView text(String value,int size,int color,String face) {
        TextView v=new TextView(this);
        v.setText(value); v.setTextColor(color); v.setTextSize(size);
        v.setTypeface(Typeface.create(face,Typeface.NORMAL));
        return v;
    }
    TextView folio(String value) {
        TextView t=text(value,12,SUB,"monospace");
        t.setLetterSpacing(.08f);
        return t;
    }
    Button button(String label, boolean primary,Runnable click) {
        Button b=new Button(this);
        b.setAllCaps(false); b.setText(label); b.setTextSize(15);
        b.setTextColor(INK); b.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL)); b.setMinHeight(dp(48)); b.setMinWidth(dp(48));
        b.setPadding(dp(12),dp(4),dp(12),dp(4));
        GradientDrawable shape=new GradientDrawable();
        shape.setColor(primary?LIME:PAPER); shape.setCornerRadius(dp(8)); shape.setStroke(dp(1),primary?INK:RULE);
        b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x40869962),shape,null));
        b.setStateListAnimator(null); b.setOnClickListener(v->click.run());
        return b;
    }
    void add(LinearLayout parent,View child,int gap) {
        LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-1,-2);
        params.topMargin=dp(gap); parent.addView(child,params);
    }
    void rule(LinearLayout parent,int gap) {
        View line=new View(this); line.setBackgroundColor(RULE);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(1));
        p.topMargin=dp(gap); parent.addView(line,p);
    }
    void install(View page) {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        getWindow().setStatusBarColor(PAPER); getWindow().setNavigationBarColor(PAPER);
        android.widget.FrameLayout frame=new android.widget.FrameLayout(this);
        frame.setBackgroundColor(PAPER);
        frame.addView(page);
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        if(android.os.Build.VERSION.SDK_INT>=30) {
            getWindow().setDecorFitsSystemWindows(false);
            frame.setOnApplyWindowInsetsListener((v,i)->{
                android.graphics.Insets pad=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime()|WindowInsets.Type.displayCutout());
                v.setPadding(pad.left,pad.top,pad.right,pad.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(frame);
    }
    LinearLayout row() {
        LinearLayout r=new LinearLayout(this);
        r.setGravity(Gravity.CENTER_VERTICAL); return r;
    }
    void flex(LinearLayout parent, View child) {
        parent.addView(child,new LinearLayout.LayoutParams(0,-2,1));
    }
}
