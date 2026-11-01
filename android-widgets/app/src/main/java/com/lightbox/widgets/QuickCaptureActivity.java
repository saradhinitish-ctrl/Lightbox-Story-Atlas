package com.lightbox.widgets;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

public final class QuickCaptureActivity extends Activity {
    private static final String PREFS="lightbox.widget.capture.v1";
    private final int PAPER=Color.rgb(239,237,230),INK=Color.rgb(24,25,22),
        MUTED=Color.rgb(83,86,77),LIME=Color.rgb(198,255,0);
    private LinearLayout root;
    private EditText field;
    private int px(float dp){return (int)(dp*getResources().getDisplayMetrics().density+.5f);}
    private GradientDrawable bg(int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(px(10));d.setStroke(px(1),INK);return d;}
    private TextView label(String str,int size,int color,boolean bold){
        TextView v=new TextView(this);v.setText(str);v.setTextSize(size);v.setTextColor(color);
        v.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));return v;
    }
    private void add(android.view.View v,int gap) {
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.topMargin=px(gap);root.addView(v,p);
    }
    private Button button(String text,int color,int textColor,Runnable f) {
        Button b=new Button(this);b.setText(text);b.setAllCaps(false);
        b.setTextColor(textColor);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        b.setBackground(bg(color));b.setOnClickListener(v->f.run());add(b,12);return b;
    }
    @Override public void onCreate(Bundle b){super.onCreate(b);render();}
    private JSONArray notes(){
        try{return new JSONArray(getSharedPreferences(PREFS,MODE_PRIVATE).getString("notes","[]"));}
        catch(Exception ignored){return new JSONArray();}
    }
    private void save(){
        String value=field.getText().toString().trim();
        if(value.isEmpty()){field.setError("Write a thought first.");return;}
        value=WidgetState.shortText(value,800);
        WidgetState state=WidgetState.read(this);
        try {
            JSONArray items=notes();JSONArray next=new JSONArray();
            JSONObject note=new JSONObject();note.put("text",value);note.put("project",state.title);
            note.put("created",System.currentTimeMillis());next.put(note);
            for(int i=0;i<Math.min(29,items.length());i++)next.put(items.get(i));
            getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString("notes",next.toString()).apply();
            Toast.makeText(this,"Captured privately on this device",Toast.LENGTH_SHORT).show();
            render();
        }catch(Exception e){Toast.makeText(this,"Couldn't save note",Toast.LENGTH_LONG).show();}
    }
    private void render(){
        ScrollView s=new ScrollView(this);s.setFillViewport(true);
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(px(24),px(34),px(24),px(36));root.setBackgroundColor(PAPER);
        s.addView(root);setContentView(s);
        add(label("LIGHTBOX / QUICK CAPTURE",12,INK,true),0);
        add(label("Hold that thought.",34,INK,true),28);
        add(label("For / "+WidgetState.read(this).title,13,MUTED,false),10);
        field=new EditText(this);field.setHint("A visual. A line of dialogue. A moment worth remembering…");
        field.setTextColor(INK);field.setHintTextColor(MUTED);field.setTextSize(16);
        field.setMinLines(5);field.setGravity(Gravity.TOP);field.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(800)});
        field.setPadding(px(16),px(18),px(16),px(16));field.setBackground(bg(Color.WHITE));
        add(field,24);
        button("SAVE NOTE  +",LIME,INK,this::save);
        button("OPEN STUDIO  ↗",PAPER,INK,()->startActivity(new Intent(this,StudioLauncherActivity.class)));
        add(label("SAVED ON THIS DEVICE / PRIVATE NOTES",11,MUTED,true),28);
        JSONArray list=notes();
        if(list.length()==0)add(label("No notes captured yet.",14,MUTED,false),14);
        for(int i=0;i<Math.min(20,list.length());i++){
            JSONObject item=list.optJSONObject(i);if(item==null)continue;
            String value=item.optString("text","");
            TextView v=label(value,14,INK,false);
            v.setPadding(px(14),px(14),px(14),px(14));v.setBackground(bg(Color.WHITE));add(v,11);
            Button copy=button("COPY TO LIGHTBOX  ↗",PAPER,INK,()->{
                ClipboardManager cb=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);
                cb.setPrimaryClip(ClipData.newPlainText("Lightbox capture",value));
                Toast.makeText(this,"Copied — paste into your project in Lightbox",Toast.LENGTH_SHORT).show();
            });
            copy.setTextSize(11);
        }
        add(label("Notes stay in this companion app until copied. They are not silently inserted into a screenplay.",11,MUTED,false),21);
    }
}
