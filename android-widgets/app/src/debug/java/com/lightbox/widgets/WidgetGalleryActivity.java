package com.lightbox.widgets;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
/**
 * DEBUG-ONLY preview harness. Not included in the release app.
 * Renders the real native widget painter with representative content.
 */
public final class WidgetGalleryActivity extends Activity {
    private int dp(float value) {return Math.round(value*getResources().getDisplayMetrics().density);}
    private TextView label(String value,int size,boolean bold) {
        TextView t=new TextView(this);t.setText(value);t.setTextColor(Color.rgb(24,25,22));t.setTextSize(size);
        t.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        return t;
    }
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        int variant=Math.max(0,Math.min(2,getIntent().getIntExtra("variant",0)));
        int width=variant==0?158:330, height=variant==2?324:158;
        String title=getIntent().getStringExtra("title");
        if(title==null) title="AFTER THE RAIN";
        WidgetState example=new WidgetState(title,"DRAFT 02","06",
            "EXT. STATION PLATFORM — NIGHT","test-project","test-scene",1250,2700,1L);
        ScrollView sc=new ScrollView(this);sc.setFillViewport(true);
        sc.setBackgroundColor(Color.rgb(234,233,225));
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(17),dp(65),dp(17),dp(24));
        sc.addView(root);
        TextView brand=label("LIGHTBOX / ANDROID WIDGET QA",13,true);
        root.addView(brand);
        TextView heading=label(variant==0?"2 × 2   QUICK RETURN":variant==1?"4 × 2   CURRENT SCENE":"4 × 4   STORY IN PROGRESS",18,true);
        LinearLayout.LayoutParams headingParams=new LinearLayout.LayoutParams(-2,-2);headingParams.topMargin=dp(27);
        root.addView(heading,headingParams);
        Bitmap bitmap=WidgetPainter.draw(variant,example,dp(width*2),dp(height*2));
        ImageView iv=new ImageView(this);iv.setImageBitmap(bitmap);
        iv.setScaleType(ImageView.ScaleType.FIT_XY);
        LinearLayout.LayoutParams box=new LinearLayout.LayoutParams(dp(width),dp(height));box.topMargin=dp(36);
        root.addView(iv,box);
        TextView caption=label("REAL NATIVE RENDER · TEST CONTENT",11,false);
        LinearLayout.LayoutParams capParams=new LinearLayout.LayoutParams(-2,-2);capParams.topMargin=dp(22);
        root.addView(caption,capParams);
        setContentView(sc);
    }
}
