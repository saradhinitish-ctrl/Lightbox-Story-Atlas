package com.lightbox.widgets;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public final class WidgetHubActivity extends Activity {
    private static final int PAPER=Color.rgb(239,237,230);
    private static final int CARD=Color.rgb(249,248,243);
    private static final int INK=Color.rgb(24,25,22);
    private static final int MUTED=Color.rgb(83,86,77);
    private static final int RULE=Color.rgb(199,199,189);
    private static final int LIME=Color.rgb(198,255,0);
    private LinearLayout root;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        boolean synced=WidgetState.accept(this,getIntent().getData());
        render();
        WidgetState.publishPreviews(this);
        if(synced)Toast.makeText(this,"Story sent to your widgets",Toast.LENGTH_LONG).show();
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);setIntent(intent);
        boolean synced=WidgetState.accept(this,intent.getData());
        render();
        if(synced)Toast.makeText(this,"Widgets updated",Toast.LENGTH_LONG).show();
    }
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView text(String s,int size,int color,boolean bold,boolean serif) {
        TextView t=new TextView(this);
        t.setText(s);t.setTextSize(size);t.setTextColor(color);
        t.setIncludeFontPadding(false);
        t.setTypeface(Typeface.create(serif?"serif":"sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        return t;
    }
    private GradientDrawable background(int fill, int border, int corner) {
        GradientDrawable d=new GradientDrawable();
        d.setColor(fill);d.setCornerRadius(dp(corner));
        if(border!=0)d.setStroke(dp(1),border);
        return d;
    }
    private void add(View v,int top) {
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
        p.topMargin=dp(top);root.addView(v,p);
    }
    private Button button(String title,int fill,Runnable click) {
        Button b=new Button(this);
        b.setText(title);b.setAllCaps(false);b.setTextSize(12);
        b.setTextColor(INK);b.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));
        b.setBackground(background(fill,fill==LIME?INK:RULE,6));
        b.setOnClickListener(v->click.run());
        return b;
    }
    private void pin(Class<?> provider) {
        AppWidgetManager manager=AppWidgetManager.getInstance(this);
        if(manager.isRequestPinAppWidgetSupported()) {
            boolean requested=manager.requestPinAppWidget(new ComponentName(this,provider),null,null);
            if(!requested)Toast.makeText(this,"Use Home screen > Widgets > Lightbox Studio",Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(this,"Long-press your home screen, select Widgets, then Lightbox Studio",Toast.LENGTH_LONG).show();
        }
    }
    private void option(String no,String name,String description,Class<?> provider) {
        LinearLayout item=new LinearLayout(this);
        item.setOrientation(LinearLayout.HORIZONTAL);
        item.setGravity(Gravity.CENTER_VERTICAL);
        item.setPadding(dp(17),dp(18),dp(12),dp(18));
        item.setBackground(background(CARD,RULE,11));
        LinearLayout copy=new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        TextView number=text(no,10,MUTED,true,false);
        number.setLetterSpacing(.08f);
        copy.addView(number);
        TextView title=text(name,21,INK,false,true);
        LinearLayout.LayoutParams h=new LinearLayout.LayoutParams(-1,-2);
        h.topMargin=dp(8);copy.addView(title,h);
        TextView sub=text(description,12,MUTED,false,false);
        sub.setMaxLines(2);
        LinearLayout.LayoutParams d=new LinearLayout.LayoutParams(-1,-2);
        d.topMargin=dp(5);copy.addView(sub,d);
        item.addView(copy,new LinearLayout.LayoutParams(0,-2,1));
        Button add=button("ADD +",LIME,()->pin(provider));
        LinearLayout.LayoutParams action=new LinearLayout.LayoutParams(dp(84),dp(48));
        action.leftMargin=dp(14);
        item.addView(add,action);
        add(item,12);
    }
    private void openSync() {
        Intent intent=new Intent(this,StudioLauncherActivity.class);
        intent.putExtra(StudioLauncherActivity.EXTRA_OPEN_SYNC,true);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }
    private void render() {
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(22),dp(42),dp(22),dp(38));
        root.setBackgroundColor(PAPER);
        scroll.addView(root);
        setContentView(scroll);

        TextView kicker=text("LIGHTBOX  /  HOME SCREEN",11,MUTED,true,false);
        kicker.setLetterSpacing(.1f);
        add(kicker,0);
        add(text("Keep the story close.",36,INK,false,true),21);
        add(text("Choose a widget. Its buttons work directly from your home screen.",14,MUTED,false,false),11);

        WidgetState s=WidgetState.read(this);
        TextView current=text(s.syncedAt==0
            ? "No story synced yet · Select a story using Sync below"
            : s.title+"  /  "+s.scene+"  /  "+s.words+" words",
            12,INK,false,false);
        current.setPadding(dp(15),dp(14),dp(15),dp(14));
        current.setBackground(background(Color.rgb(229,231,219),0,8));
        add(current,22);

        add(text("PICK A SIZE",10,MUTED,true,false),30);
        option("01 / 2 × 2","Quick return","Your story and a quick note.",QuickProvider.class);
        option("02 / 4 × 2","Current scene","Scene number, word count and actions.",WideProvider.class);
        option("03 / 4 × 4","Story in progress","Writing progress, note and sync tools.",LargeProvider.class);

        Button sync=button("SYNC STORY DETAILS ↗",LIME,this::openSync);
        LinearLayout.LayoutParams syncLayout=new LinearLayout.LayoutParams(-1,dp(52));
        syncLayout.topMargin=dp(24);root.addView(sync,syncLayout);
        Button note=button("QUICK CAPTURE +",CARD,
            ()->startActivity(new Intent(this,QuickCaptureActivity.class)));
        LinearLayout.LayoutParams noteLayout=new LinearLayout.LayoutParams(-1,dp(50));
        noteLayout.topMargin=dp(9);root.addView(note,noteLayout);
        TextView foot=text("The widget uses the last manually synced story. Your screenplay stays in Lightbox.",11,MUTED,false,false);
        add(foot,18);
    }
}
