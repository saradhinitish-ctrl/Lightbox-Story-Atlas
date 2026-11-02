package com.lightbox.widgets;

import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.text.DateFormat;
import java.util.Date;

public final class QuickCaptureActivity extends PaperActivity {
    static final String ARCHIVE="archive";
    private static final String PREFS="lightbox.widget.capture.v1";
    private EditText editor;
    private String draft="";
    private boolean reviewing;
    private JSONArray items;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        draft=state==null?"":state.getString("draft","");
        reviewing=state==null?getIntent().getBooleanExtra(ARCHIVE,false):state.getBoolean(ARCHIVE);
        try { items=readNotes(); }
        catch(JSONException corrupt) {
            new AlertDialog.Builder(this).setMessage("The saved notebook could not be read. Its contents have been preserved.")
                .setPositiveButton("Close",(d,w)->finish()).setOnCancelListener(d->finish()).show();
            return;
        }
        if(reviewing) archive(); else compose();
    }
    @Override protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if(intent.getBooleanExtra(ARCHIVE,false))archive();
        else if(reviewing)compose();
    }
    private JSONArray readNotes() throws JSONException {
        return new JSONArray(getSharedPreferences(PREFS,MODE_PRIVATE).getString("notes","[]"));
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putString("draft",editor==null?draft:editor.getText().toString());
        out.putBoolean(ARCHIVE,reviewing);
    }
    private void compose() {
        reviewing=false;
        LinearLayout page=column(); page.setPadding(dp(22),dp(10),dp(22),dp(10));
        LinearLayout bar=row(); add(page,bar,0);
        bar.addView(button("Cancel",false,this::cancel));
        flex(bar,new View(this));
        Button save=button("Save note",true,this::save); bar.addView(save);
        rule(page,8);
        boolean compact=getResources().getConfiguration().screenHeightDp<460;
        if(!compact)add(page,folio("FIELD NOTES"),16);
        WidgetState story=WidgetState.read(this);
        TextView heading=text(story.syncedAt==0?"Unfiled idea":story.title,24,INK,"serif");
        heading.setMaxLines(1); heading.setEllipsize(android.text.TextUtils.TruncateAt.END); if(!compact)add(page,heading,3);
        editor=new EditText(this);
        editor.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        editor.setGravity(Gravity.TOP|Gravity.START); editor.setBackgroundColor(PAPER);
        editor.setPadding(0,dp(15),0,dp(8)); editor.setTextSize(20);
        editor.setTypeface(android.graphics.Typeface.SERIF); editor.setTextColor(INK);
        editor.setHintTextColor(SUB); editor.setHint("Write a line, a scene, or something you noticed…");
        editor.setText(draft); editor.setSelection(editor.length());
        editor.setImeOptions(android.view.inputmethod.EditorInfo.IME_FLAG_NO_EXTRACT_UI);
        page.addView(editor,new LinearLayout.LayoutParams(-1,0,1));
        Runnable validate=()->{boolean ok=!editor.getText().toString().trim().isEmpty();save.setEnabled(ok);save.setAlpha(ok?1:.48f);};
        editor.addTextChangedListener(new TextWatcher(){
            public void beforeTextChanged(CharSequence s,int a,int n,int f){}
            public void onTextChanged(CharSequence s,int a,int b,int c){validate.run();}
            public void afterTextChanged(Editable e){}
        });
        validate.run();
        rule(page,0);
        add(page,button("Saved notes ("+items.length()+")",false,this::archive),0);
        install(page); editor.requestFocus();
        EditText target=editor;
        target.post(()->getSystemService(InputMethodManager.class).showSoftInput(target,InputMethodManager.SHOW_IMPLICIT));
    }
    private void cancel() {
        if(editor==null || editor.getText().toString().trim().isEmpty()){finish();return;}
        new AlertDialog.Builder(this).setMessage("Discard this unsaved note?")
            .setNegativeButton("Keep writing",null).setPositiveButton("Discard",(d,w)->finish()).show();
    }
    private boolean persist(JSONArray next) {
        if(!getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString("notes",next.toString()).commit()) {
            Toast.makeText(this,"Could not save changes",Toast.LENGTH_LONG).show(); return false;
        }
        items=next; WidgetState.refreshAll(this); return true;
    }
    private void save() {
        String value=editor.getText().toString().trim();
        if(value.isEmpty())return;
        try {
            WidgetState state=WidgetState.read(this);
            JSONObject note=new JSONObject().put("text",value).put("created",System.currentTimeMillis())
                .put("project",state.syncedAt>0?state.title:"");
            JSONArray old=readNotes(),next=new JSONArray().put(note);
            for(int i=0;i<old.length();i++)next.put(old.get(i));
            if(!persist(next))return;
            editor.setText(""); draft="";
            Toast.makeText(this,"Note saved",Toast.LENGTH_SHORT).show(); archive();
        } catch(JSONException e){Toast.makeText(this,"Could not read the notebook",Toast.LENGTH_LONG).show();}
    }
    private void archive() {
        if(editor!=null){
            draft=editor.getText().toString();
            getSystemService(InputMethodManager.class).hideSoftInputFromWindow(editor.getWindowToken(),0);
            editor=null;
        }
        reviewing=true;
        try {items=readNotes();} catch(JSONException e){finish();return;}
        LinearLayout page=column(); page.setPadding(dp(22),dp(12),dp(22),dp(12));
        LinearLayout bar=row(); add(page,bar,0);flex(bar,folio("FIELD NOTES"));
        bar.addView(button(draft.isEmpty()?"New note":"Resume note",true,this::compose));
        rule(page,8);add(page,text("Notebook",36,INK,"serif"),18);
        add(page,text(items.length()+" saved on this device",14,SUB,"sans-serif"),2);
        if(items.length()==0) add(page,text("Your saved ideas will appear here.",18,SUB,"serif"),30);
        ListView list=new ListView(this);list.setDividerHeight(dp(1));
        list.setAdapter(new BaseAdapter(){
            public int getCount(){return items.length();}
            public JSONObject getItem(int i){return items.optJSONObject(i);}
            public long getItemId(int i){return i;}
            public View getView(int i,View recycled,ViewGroup parent){
                JSONObject note=getItem(i); LinearLayout cell=column();cell.setPadding(0,dp(16),0,dp(16));
                if(note==null)return cell;
                long date=note.optLong("created");
                String project=note.optString("project","");
                String stamp=date>0?DateFormat.getDateTimeInstance(DateFormat.MEDIUM,DateFormat.SHORT).format(new Date(date)):"";
                add(cell,text(project.isEmpty()?stamp:project+"  ·  "+stamp,12,SUB,"sans-serif"),0);
                TextView body=text(note.optString("text"),18,INK,"serif");
                body.setMaxLines(3);body.setEllipsize(android.text.TextUtils.TruncateAt.END);add(cell,body,5);return cell;
            }
        });
        list.setOnItemClickListener((parent,v,pos,id)->detail(items.optJSONObject(pos)));
        page.addView(list,new LinearLayout.LayoutParams(-1,0,1));install(page);
    }
    private void detail(JSONObject note) {
        if(note==null)return;
        String value=note.optString("text");
        new AlertDialog.Builder(this).setTitle("Saved note").setMessage(value)
            .setPositiveButton("Copy",(d,w)->{
                getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Lightbox note",value));
                Toast.makeText(this,"Copied",Toast.LENGTH_SHORT).show();
            }).setNeutralButton("Delete",(d,w)->new AlertDialog.Builder(this)
                .setMessage("Delete this saved note?").setNegativeButton("Keep",null)
                .setPositiveButton("Delete",(dialog,which)->remove(note)).show())
            .setNegativeButton("Close",null).show();
    }
    private void remove(JSONObject note) {
        try {
            JSONArray fresh=readNotes();
            for(int i=0;i<fresh.length();i++) {
                if(note.toString().equals(fresh.get(i).toString())) {
                    fresh.remove(i); if(persist(fresh))archive(); return;
                }
            }
            archive();
        } catch(JSONException e){Toast.makeText(this,"Could not remove note",Toast.LENGTH_LONG).show();}
    }
    @Override public void onBackPressed() {
        if(reviewing && !draft.isEmpty())compose();
        else if(reviewing)finish();
        else cancel();
    }
}
