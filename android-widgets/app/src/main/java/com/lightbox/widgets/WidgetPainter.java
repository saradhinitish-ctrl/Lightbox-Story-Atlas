package com.lightbox.widgets;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Draws the actual editorial design into a bitmap hosted by RemoteViews.
 * No network, logos, screenshot textures, or permissions are needed. */
public final class WidgetPainter {
    private static final int PAPER = Color.rgb(242,240,233);
    private static final int INK = Color.rgb(24,25,22);
    private static final int MUTED = Color.rgb(85,89,79);
    private static final int LIME = Color.rgb(198,255,0);
    private static final int RULE = Color.rgb(184,184,172);
    private final Canvas c;
    private final Paint p = new Paint(3);
    private final int width, height;
    private WidgetPainter(Canvas c, int w, int h) { this.c=c; this.width=w; this.height=h; }

    public static Bitmap draw(int type, WidgetState state, int targetWidthPx, int targetHeightPx) {
        int baseWidth = type == 0 ? 158 : 330;
        int baseHeight = type == 2 ? 324 : 158;
        int wp = Math.min(1100, Math.max(100, targetWidthPx));
        int hp = Math.min(1100, Math.max(100, targetHeightPx));
        Bitmap bitmap = Bitmap.createBitmap(wp, hp, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.scale((float)wp/baseWidth, (float)hp/baseHeight);
        WidgetPainter d = new WidgetPainter(canvas, baseWidth, baseHeight);
        d.background();
        if(type==0)d.small(state);
        else if(type==1)d.wide(state);
        else d.large(state);
        return bitmap;
    }
    private void background() {
        p.setStyle(Paint.Style.FILL);p.setColor(PAPER);
        c.drawRoundRect(0,0,width,height,17,17,p);
        c.save();android.graphics.Path path = new android.graphics.Path();
        path.addRoundRect(new RectF(0,0,width,height),17,17,android.graphics.Path.Direction.CW);
        c.clipPath(path);
    }
    private void box(float x,float y,float w,float h,int color) {
        p.setColor(color);p.setStyle(Paint.Style.FILL);c.drawRect(x,y,x+w,y+h,p);
    }
    private void line(float x,float y,float w,int color,float thickness) {
        box(x,y,w,thickness,color);
    }
    private void drawText(String value,float x,float y,float size,int color,String font,boolean bold) {
        p.setColor(color);p.setStyle(Paint.Style.FILL);p.setTextSize(size);
        p.setTypeface(Typeface.create(font,bold?Typeface.BOLD:Typeface.NORMAL));
        c.drawText(value,x,y,p);
    }
    private void label(String value,float x,float y,int color) {
        drawText(value,x,y,9,color,"monospace",true);
    }
    private void brand(float y) {
        label("LIGHTBOX / W.I.P.",16,y,INK);
        box(width-31,y-4,3,3,INK);box(width-25,y-6,4,5,INK);box(width-18,y-9,4,8,INK);
    }
    private List<String> wrapTitle(String raw,float maxW,float size,int maxLines) {
        String s=(raw==null||raw.isBlank()?"YOUR NEXT STORY":raw).toUpperCase(Locale.ROOT);
        p.setTypeface(Typeface.create("sans-serif-black",Typeface.BOLD));p.setTextSize(size);
        List<String> result=new ArrayList<>();StringBuilder line=new StringBuilder();
        for(String word:s.split("\\s+")){
            String next=line.length()==0?word:line+" "+word;
            if(p.measureText(next)<=maxW || line.length()==0){line.setLength(0);line.append(next);}
            else {result.add(line.toString());line.setLength(0);line.append(word);}
        }
        if(line.length()>0) result.add(line.toString());
        if(result.size()>maxLines){
            List<String> kept=new ArrayList<>(result.subList(0,maxLines));
            String last=kept.get(maxLines-1);
            while(last.length()>0&&p.measureText(last+"…")>maxW)last=last.substring(0,last.length()-1);
            kept.set(maxLines-1,last+"…");return kept;
        }
        return result;
    }
    private void title(String raw,float x,float baseline,float size,float leading,float maxWidth,int maxLines) {
        for(String s:wrapTitle(raw,maxWidth,size,maxLines)){
            drawText(s,x,baseline,size,INK,"sans-serif-black",true);baseline+=leading;
        }
    }
    private void footer(float y,String left,boolean dual) {
        box(0,y,width,height-y,INK);
        if(dual){
            box(width/2f,y,width/2f,height-y,LIME);
            label("RESUME  ↗",15,y+26,PAPER);
            label("CAPTURE  +",width/2f+19,y+26,INK);
        } else {
            box(width-45,y,45,height-y,LIME);
            label(left,15,y+25,PAPER);
            drawText("↗",width-31,y+29,23,INK,"sans-serif",true);
        }
    }
    private void small(WidgetState s) {
        brand(18);
        label("CURRENT WORK",15,48,MUTED);
        title(s.title,15,77,23,23,126,2);
        footer(119,"RESUME WRITING",false);
    }
    private void wide(WidgetState s) {
        brand(20);
        label("CURRENT STORY / "+trim(s.draft,13),16,48,MUTED);
        title(s.title,15,81,32,32,225,2);
        label("SC. "+trim(s.scene,4)+"  /  "+s.words+" WORDS",16,113,MUTED);
        box(260,36,70,83,LIME);
        drawText(trim(s.scene,3),267,92,52,INK,"sans-serif-black",true);
        label("SCENE",272,109,INK);
        footer(120,"RESUME WRITING",false);
    }
    private void large(WidgetState s) {
        brand(22);
        label("CURRENT STORY / "+trim(s.draft,14),18,53,MUTED);
        title(s.title,18,89,37,36,215,2);
        label("LAST EDITED  / SC. "+trim(s.scene,4),18,139,MUTED);
        box(258,38,72,96,LIME);
        drawText(trim(s.scene,3),267,102,52,INK,"sans-serif-black",true);
        label("SCENE",272,120,INK);
        line(18,157,294,INK,1.2f);
        label("UP NEXT / SCENE "+trim(s.scene,4),18,180,INK);
        box(262,169,50,17,LIME); drawText("WRITING",269,181,8,INK,"monospace",true);
        String heading = s.heading == null ? "OPEN YOUR SCREENPLAY" : s.heading.toUpperCase(Locale.ROOT);
        List<String> ls=wrapTitle(heading,291,15,2);float y=207;
        for(String line:ls){drawText(line,18,y,15,INK,"sans-serif",true);y+=19;}
        label("DRAFT PROGRESS",18,271,MUTED);
        String progress=s.target>0?s.words+" / "+s.target+" WORDS":s.words+" WORDS";
        drawText(progress,219,271,9,MUTED,"monospace",true);
        box(18,279,294,4,RULE);
        float ratio=s.target>0?Math.min(1f,s.words/(float)s.target):(s.words>0?0.13f:0f);
        box(18,279,294*ratio,4,INK);
        footer(284,"",true);
    }
    private String trim(String text,int max) {
        if(text==null||text.isEmpty())return "--";
        return text.length()<=max?text:text.substring(0,max);
    }
}
