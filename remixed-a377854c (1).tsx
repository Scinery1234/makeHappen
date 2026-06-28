import { useState, useRef, useEffect } from "react";

const GOAL_KEY = "purposefields_goals";
const CONSENT_KEY = "purposefields_consent_v1";
const CRISIS_KW = ["suicide","suicidal","kill myself","end my life","want to die","don't want to live","dont want to live","self-harm","self harm","hurt myself","cut myself","overdose","harm myself","not worth living","better off dead"];
const detectCrisis = t => CRISIS_KW.some(k => t.toLowerCase().includes(k));
const CRISIS_RES = [{name:"Lifeline",num:"13 11 14",desc:"24/7 crisis support"},{name:"Beyond Blue",num:"1300 22 4636",desc:"Mental health support"},{name:"Emergency",num:"000",desc:"Immediate danger"},{name:"13YARN",num:"13 92 76",desc:"Aboriginal & Torres Strait Islander"}];
const SAFETY = `\n\nSAFETY: If user expresses suicidal ideation, self-harm, or crisis — acknowledge warmly and provide: Lifeline 13 11 14, Beyond Blue 1300 22 4636, Emergency 000. This tool does not replace professional mental health care.`;

const api = async (messages, system, retries=2, delay=1500) => {
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,system,messages})});
  const d = await res.json();
  if (res.status===529&&retries>0){await new Promise(r=>setTimeout(r,delay));return api(messages,system,retries-1,delay*1.5);}
  if (!res.ok) throw new Error(`API ${res.status}`);
  return d.content?.find(b=>b.type==="text")?.text||"";
};

const now = () => new Date().toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"});
const bold = t => t.split(/(\*\*[^*]+\*\*)/g).map((p,i)=>p.startsWith("**")&&p.endsWith("**")?<strong key={i}>{p.slice(2,-2)}</strong>:p);

const TOOLS = [
  {id:"cbt",icon:"🌿",name:"CBT Coach",desc:"A structured 10-step CBT session to work through what's troubling you."},
  {id:"action",icon:"⚡",name:"Action Coach",desc:"For when you know what to do but can't start. Uncover resistance, rebuild momentum."},
  {id:"exec",icon:"🧭",name:"Executive Function Coach",desc:"For neurodivergent minds. Think out loud, externalise tasks, find calm clarity."},
  {id:"charge",icon:"🌊",name:"Reducing the Charge",desc:"Process emotional resistance and release what you're carrying, gently."},
  {id:"clarity",icon:"🧿",name:"Clarity Compass",desc:"A guided process for decisions that actually feel like yours."},
  {id:"tasks",icon:"✅",name:"Task Assistant",desc:"Add, organise, and bulk-edit your tasks by chatting. Say \"undo\" anytime."},

];

// ── CRISIS OVERLAY ─────────────────────────────────────────────────────────
function CrisisOverlay({onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,10,20,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Georgia,serif"}}>
      <div style={{background:"#fff",borderRadius:16,maxWidth:420,width:"100%",padding:28,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:10}}>💙</div>
        <h2 style={{fontSize:18,fontWeight:600,color:"#2d3748",marginBottom:8}}>You're not alone</h2>
        <p style={{fontSize:14,color:"#718096",lineHeight:1.7,marginBottom:20}}>It sounds like things may be really difficult right now. Please reach out to someone who can help.</p>
        {CRISIS_RES.map((r,i)=>(
          <div key={i} style={{background:"#f7fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div><div style={{fontWeight:600,fontSize:13,color:"#2d3748"}}>{r.name}</div><div style={{fontSize:11,color:"#718096"}}>{r.desc}</div></div>
            <a href={`tel:${r.num.replace(/\s/g,"")}`} style={{fontWeight:700,fontSize:14,color:"#4a7c59",textDecoration:"none"}}>{r.num}</a>
          </div>
        ))}
        <button onClick={onClose} style={{marginTop:12,background:"none",border:"1px solid #e2e8f0",borderRadius:8,padding:"9px 22px",fontSize:13,color:"#718096",cursor:"pointer",fontFamily:"Georgia,serif"}}>I'm safe — continue</button>
      </div>
    </div>
  );
}

// ── CONSENT ────────────────────────────────────────────────────────────────
const CONSENT_ITEMS=[
  {k:"notTherapy",t:"This is coaching, not therapy",b:"These tools offer AI-assisted reflection and coaching. They are not a substitute for professional mental health care."},
  {k:"ai",t:"Responses are AI-generated",b:"All coaching is powered by Claude (Anthropic). Use your own judgment."},
  {k:"data",t:"Your data stays on your device",b:"Goals and notes are stored locally in your browser only."},
  {k:"age",t:"I'm 18 years or older",b:"These tools are designed for adults."},
];
function ConsentGate({onAccept,onCrisis}){
  const [checks,setChecks]=useState({notTherapy:false,ai:false,data:false,age:false});
  const all=Object.values(checks).every(Boolean);
  return(
    <div style={{minHeight:"100vh",fontFamily:"Georgia,serif",background:"#f8f7f4",display:"flex",flexDirection:"column"}}>
      <div style={{flex:1,overflowY:"auto",maxWidth:520,margin:"0 auto",width:"100%",padding:"40px 24px 100px"}}>
        <div style={{fontSize:11,letterSpacing:2,color:"#a0aec0",textTransform:"uppercase",marginBottom:14}}>Purposefields</div>
        <h1 style={{fontSize:26,fontWeight:500,color:"#2d3748",marginBottom:8}}>A few things to know first</h1>
        <p style={{fontSize:15,color:"#718096",lineHeight:1.7,marginBottom:24}}>Tick each one to continue.</p>
        {CONSENT_ITEMS.map(({k,t,b})=>(
          <div key={k} onClick={()=>setChecks(c=>({...c,[k]:!c[k]}))} style={{display:"flex",gap:16,alignItems:"flex-start",padding:"16px 0",borderBottom:"1px solid #edf2f7",cursor:"pointer"}}>
            <div style={{width:24,height:24,borderRadius:6,border:`2px solid ${checks[k]?"#4a7c59":"#cbd5e0"}`,background:checks[k]?"#4a7c59":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
              {checks[k]&&<span style={{color:"white",fontSize:13,fontWeight:700}}>✓</span>}
            </div>
            <div><div style={{fontWeight:600,fontSize:15,color:"#2d3748",marginBottom:4}}>{t}</div><div style={{fontSize:14,color:"#718096",lineHeight:1.65}}>{b}</div></div>
          </div>
        ))}
        <div style={{paddingTop:20,fontSize:13,color:"#a0aec0",textAlign:"center"}}>
          If you're going through a hard time,{" "}
          <button onClick={onCrisis} style={{background:"none",border:"none",color:"#718096",fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"Georgia,serif"}}>support is available</button>.
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e2e8f0",padding:"14px 24px",display:"flex",justifyContent:"flex-end"}}>
        <button onClick={onAccept} disabled={!all} style={{background:all?"#2d3748":"#e2e8f0",color:all?"white":"#a0aec0",border:"none",borderRadius:10,padding:"12px 28px",fontSize:14,cursor:all?"pointer":"default",fontFamily:"Georgia,serif"}}>Enter →</button>
      </div>
    </div>
  );
}

// ── CHAT SHELL ─────────────────────────────────────────────────────────────
function Chat({header,children,messages,input,setInput,onSend,loading,onCrisis,inputDisabled}){
  const bottomRef=useRef(null);const inputRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);
  const send=()=>{if(!input.trim()||loading||inputDisabled)return;onSend(input.trim());setInput("");};
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"Georgia,serif",maxWidth:700,margin:"0 auto"}}>
      {header}
      <div style={{flex:1,overflowY:"auto",padding:"18px 16px",display:"flex",flexDirection:"column",gap:14}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"82%",padding:"11px 15px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?m.color||"#4a7c59":"#fff",color:m.role==="user"?"#fff":"#2d3748",fontSize:14,lineHeight:1.7,border:m.role==="assistant"?"1px solid #e2e8f0":"none",whiteSpace:"pre-wrap"}}>
              {m.role==="assistant"?bold(m.text):m.text}
            </div>
            {m.ts&&<div style={{fontSize:10,color:"#b0b8c1",marginTop:2,padding:"0 4px"}}>{m.ts}</div>}
          </div>
        ))}
        {loading&&<div style={{display:"flex"}}><div style={{padding:"11px 15px",borderRadius:"18px 18px 18px 4px",background:"#fff",border:"1px solid #e2e8f0",color:"#bbb",fontSize:20}}>···</div></div>}
        {children}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"12px 14px",borderTop:"1px solid #e2e8f0",background:"#fff",display:"flex",gap:10,alignItems:"flex-end"}}>
        <textarea ref={inputRef} value={input} onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Type your response…" disabled={loading||inputDisabled} rows={1} style={{flex:1,resize:"none",border:"1px solid #e2e8f0",borderRadius:12,padding:"10px 13px",fontSize:14,fontFamily:"Georgia,serif",lineHeight:1.5,outline:"none",overflow:"hidden",color:"#2d3748",background:"#f8f7f4"}}/>
        <button onClick={send} disabled={loading||!input.trim()||inputDisabled} style={{background:loading||!input.trim()||inputDisabled?"#e2e8f0":"#4a7c59",color:loading||!input.trim()||inputDisabled?"#a0aec0":"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>Send</button>
      </div>
    </div>
  );
}

function Hdr({icon,name,sub,extra,onBack,onCrisis}){
  return(
    <div style={{padding:"13px 18px",borderBottom:"1px solid #e2e8f0",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#718096",padding:"0 4px 0 0"}}>←</button>
        <span>{icon}</span>
        <div><div style={{fontWeight:600,fontSize:14,color:"#2d3748"}}>{name}</div>{sub&&<div style={{fontSize:11,color:"#718096",marginTop:1}}>{sub}</div>}</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {extra}
        <button onClick={onCrisis} style={{fontSize:11,color:"#e53e3e",background:"#fff5f5",border:"1px solid #fed7d7",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"Georgia,serif"}}>🆘</button>
      </div>
    </div>
  );
}

// ── CBT COACH ──────────────────────────────────────────────────────────────
const CBT_STEPS=["What's Bothering You","Emotions & Behaviors","Beliefs Behind Emotions","Challenge Your Beliefs","New Actions & Emotions","Immediate Actions for Today","Weekly Goals","Review Goals","Gratitude Practice","Self-Love & Reflection"];

function CBTCoach({onBack,onCrisis}){
  const [msgs,setMsgs]=useState([]);const [input,setInput]=useState("");const [loading,setLoading]=useState(true);const [step,setStep]=useState(1);const [goals,setGoals]=useState([]);
  const hist=useRef([]);

  const sys=gs=>`You are a digital CBT coach following a strict 10-step process. Warm, person-centred, strengths-based. Label each step: "**Step N – Title**". Only advance after user confirms readiness. Use the user's exact words.
Steps: 1-What's Bothering You, 2-Emotions & Behaviors, 3-Beliefs Behind Emotions, 4-Challenge Your Beliefs, 5-New Actions & Emotions, 6-Immediate Actions for Today, 7-Weekly Goals, 8-Review Goals, 9-Gratitude Practice, 10-Self-Love & Reflection.
${gs.length?`STORED GOALS (reference at Step 8):\n${gs.map((g,i)=>`${i+1}. ${g}`).join("\n")}`:"No stored goals. At Step 8, invite reflection on any intentions they've been carrying."}
Step 1 opening: "Hi, I'm here with you. We can take this one step at a time. What's been on your mind lately?"${SAFETY}`;

  useEffect(()=>{
    let done=false;
    (async()=>{
      let gs=[];try{const r=await window.storage.get(GOAL_KEY);if(r?.value)gs=JSON.parse(r.value).map(g=>g.text||g);}catch{}
      if(done)return;setGoals(gs);
      const init={role:"user",content:"Please begin the session."};hist.current=[init];
      try{const r=await api([init],sys(gs));if(!done){hist.current.push({role:"assistant",content:r});setMsgs([{role:"assistant",text:r,ts:now()}]);}}
      catch{if(!done)setMsgs([{role:"assistant",text:"Something went wrong. Please try again.",ts:now()}]);}
      if(!done)setLoading(false);
    })();
    return()=>{done=true;};
  },[]);

  const detectStep=t=>{const m=t.match(/\*\*Step (\d+)/i);return m?parseInt(m[1]):null;};

  const send=async text=>{
    if(detectCrisis(text))onCrisis();
    const um={role:"user",content:text};const h=[...hist.current,um];hist.current=h;
    setMsgs(p=>[...p,{role:"user",text,ts:now()}]);setLoading(true);
    try{const r=await api(h,sys(goals));hist.current.push({role:"assistant",content:r});const ds=detectStep(r);if(ds)setStep(ds);setMsgs(p=>[...p,{role:"assistant",text:r,ts:now()}]);}
    catch{setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong.",ts:now()}]);}
    setLoading(false);
  };

  const prog=<div style={{display:"flex",gap:3}}>{CBT_STEPS.map((_,i)=><div key={i} style={{width:14,height:4,borderRadius:2,background:i+1<=step?"#4a7c59":"#e2e8f0"}}/>)}</div>;

  return <Chat header={<Hdr icon="🌿" name="CBT Coach" sub={`Step ${step} of 10 — ${CBT_STEPS[step-1]}`} extra={prog} onBack={onBack} onCrisis={onCrisis}/>} messages={msgs} input={input} setInput={setInput} onSend={send} loading={loading} onCrisis={onCrisis}/>;
}

// ── ACTION COACH ───────────────────────────────────────────────────────────
const ACTION_SYS=`You are a motivational coach helping people overcome resistance to action. Person-centred, grounded in SDT, ACT, and solution-focused therapy. Never give advice or suggestions. Listen, reflect, ask one question. Match the user's energy. Warm, natural, emotionally intelligent.${SAFETY}`;
const PROFILE_KEY="pf_action_profile";

function ActionCoach({onBack,onCrisis}){
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hey, I'm here. What's on your mind — what are you wanting to do but finding yourself resisting?",ts:now()}]);
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [profile,setProfile]=useState(null);const [saving,setSaving]=useState(false);

  useEffect(()=>{(async()=>{try{const r=await window.storage.get(PROFILE_KEY);if(r?.value)setProfile(JSON.parse(r.value));}catch{}})();},[]);

  const sys=p=>p?`${ACTION_SYS}\n\nMOTIVATIONAL PROFILE (use quietly):\nCommunication: ${p.communication_style}\nResonant: ${(p.resonant_approaches||[]).join("; ")}\nAvoid: ${p.what_to_avoid}`:ACTION_SYS;

  const send=async text=>{
    if(detectCrisis(text))onCrisis();
    const um={role:"user",content:text,ts:now()};const next=[...msgs,um];setMsgs(next);setLoading(true);
    try{const r=await api(next.map(m=>({role:m.role,content:m.text||m.content})),sys(profile));setMsgs(p=>[...p,{role:"assistant",text:r,ts:now()}]);}
    catch{setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong.",ts:now()}]);}
    setLoading(false);
  };

  const newSession=async()=>{
    if(msgs.length>2){setSaving(true);try{const txt=msgs.map(m=>`${m.role==="user"?"User":"Coach"}: ${m.text||m.content}`).join("\n\n");const raw=await api([{role:"user",content:txt}],'Extract motivational profile as JSON: {"resonant_approaches":[],"flat_approaches":[],"themes":[],"communication_style":"","what_to_try_more":"","what_to_avoid":""}. Return ONLY valid JSON.');const p=JSON.parse(raw);await window.storage.set(PROFILE_KEY,JSON.stringify(p));setProfile(p);}catch{}setSaving(false);}
    setMsgs([{role:"assistant",text:"Hey, I'm here. What's on your mind — what are you wanting to do but finding yourself resisting?",ts:now()}]);
  };

  const extra=<><button onClick={newSession} disabled={saving} style={{fontSize:12,color:"#666",background:"none",border:"1px solid #ddd",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>{saving?"Saving…":"New session"}</button>{profile&&<div style={{fontSize:11,color:"#7a9e7e"}}>✦ Learning</div>}</>;

  return <Chat header={<Hdr icon="⚡" name="Action Coach" sub="ACT · SDT · Person-Centred" extra={extra} onBack={onBack} onCrisis={onCrisis}/>} messages={msgs} input={input} setInput={setInput} onSend={send} loading={loading||saving} onCrisis={onCrisis}/>;
}

// ── EXEC FUNCTION COACH ────────────────────────────────────────────────────
const EXEC_SYS=`You are a gentle, reflective conversational partner for neurodivergent individuals navigating ADHD, Dyspraxia, and fluctuating energy. Never give advice. Listen, reflect, ask one thoughtful question at a time. Help users externalise thoughts. Calm, unhurried. Grounded in ACT, CBT, Mindfulness, with Buddhist/Taoist/Yogic tone.${SAFETY}`;

function ExecCoach({onBack,onCrisis}){
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hi, I'm here with you. Take a breath — there's no rush. How are you feeling right now, in this moment?",ts:now()}]);
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [checklist,setChecklist]=useState([]);const [showList,setShowList]=useState(false);

  useEffect(()=>{(async()=>{try{const r=await window.storage.get("pf_exec_list");if(r?.value)setChecklist(JSON.parse(r.value));}catch{}})();},[]);

  const saveList=async l=>{setChecklist(l);try{await window.storage.set("pf_exec_list",JSON.stringify(l));}catch{}};

  const send=async text=>{
    if(detectCrisis(text))onCrisis();
    const um={role:"user",content:text,ts:now()};const next=[...msgs,um];setMsgs(next);setLoading(true);
    try{
      const r=await api(next.map(m=>({role:m.role,content:m.text||m.content})),EXEC_SYS);
      setMsgs(p=>[...p,{role:"assistant",text:r,ts:now()}]);
      const raw=await api([{role:"user",content:`From this exchange, extract any tasks or intentions mentioned. Return ONLY a JSON array of short strings, or [].\n\nUser: ${text}\nCoach: ${r}`}],"Extract tasks. Return ONLY a JSON array. No markdown.");
      try{const items=JSON.parse(raw);if(items.length)saveList([...new Set([...checklist,...items])]);}catch{}
    }catch{setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong.",ts:now()}]);}
    setLoading(false);
  };

  const incomplete=checklist.filter(i=>!(i.done));
  const extra=<button onClick={()=>setShowList(s=>!s)} style={{fontSize:12,color:"#666",background:"none",border:"1px solid #ddd",borderRadius:6,padding:"4px 10px",cursor:"pointer",position:"relative"}}>{showList?"Hide list":"My list"}{incomplete.length>0&&<span style={{position:"absolute",top:-6,right:-6,background:"#c97d4e",color:"white",borderRadius:999,fontSize:10,padding:"1px 5px"}}>{incomplete.length}</span>}</button>;

  return(
    <Chat header={<Hdr icon="🧭" name="Executive Function Coach" sub="ACT · CBT · Mindfulness" extra={extra} onBack={onBack} onCrisis={onCrisis}/>} messages={msgs} input={input} setInput={setInput} onSend={send} loading={loading} onCrisis={onCrisis}>
      {showList&&(
        <div style={{background:"#fffdf9",border:"1px solid #e4ddd4",borderRadius:10,padding:14,margin:"4px 0"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#7a6f62",letterSpacing:0.5,marginBottom:8}}>CAPTURED TASKS</div>
          {checklist.length===0&&<div style={{fontSize:13,color:"#bbb",fontStyle:"italic"}}>Tasks mentioned will appear here.</div>}
          {checklist.map((item,i)=>{
            const text=typeof item==="object"?item.text:item;const done=typeof item==="object"?item.done:false;
            return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
              <input type="checkbox" checked={!!done} onChange={()=>saveList(checklist.map((x,j)=>j===i?{text:typeof x==="object"?x.text:x,done:!done}:x))} style={{accentColor:"#7a9e7e",cursor:"pointer"}}/>
              <span style={{fontSize:13,flex:1,textDecoration:done?"line-through":"none",color:done?"#bbb":"#2c2c2c"}}>{text}</span>
              <button onClick={()=>saveList(checklist.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14}}>×</button>
            </div>);
          })}
        </div>
      )}
    </Chat>
  );
}

// ── REDUCING THE CHARGE ────────────────────────────────────────────────────
const CHARGE_SYS=`You are 'Reducing the Charge,' a therapeutic guide helping users process emotional resistance. Integrate ACT, ULH, UFT, Exposure Therapy, CBT, Mindfulness. Never directive — gently invite. One question at a time. 3-4 lines per prompt. Begin by asking the user to rate their emotional charge 1-10.${SAFETY}`;

function ChargeCoach({onBack,onCrisis}){
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Welcome. Before we begin, you might like to put your phone on silent to give this space some quiet.\n\nWhenever you're ready: on a scale of 1 to 10, how would you rate the emotional charge you're carrying right now?",ts:now()}]);
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [charge,setCharge]=useState(null);

  const send=async text=>{
    if(detectCrisis(text))onCrisis();
    const m=text.match(/\b([1-9]|10)\b/);if(m)setCharge(parseInt(m[1]));
    const um={role:"user",content:text,ts:now()};const next=[...msgs,um];setMsgs(next);setLoading(true);
    try{const r=await api(next.map(m=>({role:m.role,content:m.text||m.content})),CHARGE_SYS);setMsgs(p=>[...p,{role:"assistant",text:r,ts:now()}]);}
    catch{setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong.",ts:now()}]);}
    setLoading(false);
  };

  const extra=charge!==null&&<div style={{fontSize:12,color:"#7a6f9a",background:"#f0eef8",border:"1px solid #ddd8e8",borderRadius:999,padding:"3px 11px"}}>Charge: <strong>{charge}</strong>/10</div>;

  return <Chat header={<Hdr icon="🌊" name="Reducing the Charge" sub="ACT · UFT · Mindfulness" extra={extra} onBack={onBack} onCrisis={onCrisis}/>} messages={msgs} input={input} setInput={setInput} onSend={send} loading={loading} onCrisis={onCrisis}/>;
}

// ── CLARITY COMPASS ────────────────────────────────────────────────────────
const CLARITY_PHASES=["Ground","Values","Aspiration","Barriers","Strategy","Decision Tooling","The Decision","Plan","Resistance Check","Break It Down","Visualise","Schedule","First Action"];
const VALUES_LIST="Accountability, Authenticity, Adventure, Balance, Belonging, Clarity, Connection, Courage, Creativity, Dignity, Empathy, Excellence, Faith, Family, Freedom, Growth, Gratitude, Health, Honesty, Humility, Impact, Integrity, Joy, Justice, Kindness, Learning, Love, Loyalty, Meaning, Mindfulness, Nature, Order, Patience, Peace, Purpose, Resilience, Respect, Security, Service, Simplicity, Spirituality, Trust, Wisdom, Wonder";

function buildClaritySystem(phase){
  return `You are Clarity Compass, a decision-making companion. 13-phase process. SFBT, ACT, coaching. Never give advice. ONE question at a time. Label transitions: "**Phase N – Name**". Current phase: ${phase} – ${CLARITY_PHASES[phase-1]}.
Phase 1–Ground: Life needs, non-negotiables, relevant identity.
Phase 2–Values: Top 5 from: ${VALUES_LIST}
Phase 3–Aspiration: Ideal future via Miracle Question.
Phase 4–Barriers: What's in the way?
Phase 5–Strategy: How to overcome barriers?
Phase 6–Decision Tooling (OPTIONAL): 2-3 meta-questions, 1-2 tools.
Phase 7–THE DECISION: User names decision. Confirm warmly. Celebrate.
Phase 8–Plan: Step-by-step toward aspiration.
Phase 9–Resistance Check (OPTIONAL): Anything feel hard to start?
Phase 10–Break It Down (OPTIONAL): Decompose complex steps.
Phase 11–Visualise (OPTIONAL): Walk through plan mentally.
Phase 12–Schedule: First steps as real calendar commitments.
Phase 13–First Action: What happens right now?${SAFETY}`;
}

function ClarityCoach({onBack,onCrisis}){
  const [msgs,setMsgs]=useState([]);const [input,setInput]=useState("");const [loading,setLoading]=useState(true);const [phase,setPhase]=useState(1);const [decision,setDecision]=useState(null);
  const hist=useRef([]);const phaseRef=useRef(1);

  useEffect(()=>{
    let done=false;
    (async()=>{
      const init={role:"user",content:"Please begin the session."};hist.current=[init];
      try{const r=await api([init],buildClaritySystem(1));if(!done){hist.current.push({role:"assistant",content:r});setMsgs([{role:"assistant",text:r,ts:now()}]);}}
      catch{if(!done)setMsgs([{role:"assistant",text:"Something went wrong. Please try again.",ts:now()}]);}
      if(!done)setLoading(false);
    })();
    return()=>{done=true;};
  },[]);

  const detectPhase=t=>{const m=t.match(/\*\*Phase (\d+)/i);return m?parseInt(m[1]):null;};

  const send=async text=>{
    if(detectCrisis(text))onCrisis();
    const um={role:"user",content:text};const h=[...hist.current,um];hist.current=h;
    setMsgs(p=>[...p,{role:"user",text,ts:now()}]);setLoading(true);
    try{
      const r=await api(h,buildClaritySystem(phaseRef.current));
      hist.current.push({role:"assistant",content:r});
      const dp=detectPhase(r);if(dp&&dp>phaseRef.current){phaseRef.current=dp;setPhase(dp);}
      setMsgs(p=>[...p,{role:"assistant",text:r,ts:now()}]);
      if(phaseRef.current>=7&&!decision){
        const raw=await api([{role:"user",content:`Extract the affirmed decision from this exchange: "${text}" → "${r}". Return ONLY the decision text or NONE.`}],"Extract decisions. Return ONLY the text or NONE.");
        if(raw.trim()!=="NONE")setDecision(raw.trim());
      }
    }catch{setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong.",ts:now()}]);}
    setLoading(false);
  };

  const prog=<div style={{display:"flex",gap:2}}>{CLARITY_PHASES.map((_,i)=><div key={i} style={{width:12,height:4,borderRadius:2,background:i+1<phase?"#c9a84c":i+1===phase?"#e8c96a":"#e2e8f0"}}/>)}</div>;

  return(
    <Chat header={<Hdr icon="🧿" name="Clarity Compass" sub={`Phase ${phase} of 13 — ${CLARITY_PHASES[phase-1]}`} extra={prog} onBack={onBack} onCrisis={onCrisis}/>} messages={msgs} input={input} setInput={setInput} onSend={send} loading={loading} onCrisis={onCrisis}>
      {decision&&<div style={{background:"#fffbea",border:"1px solid #e8dfc8",borderRadius:10,padding:"12px 14px",margin:"4px 0",display:"flex",gap:10,alignItems:"center"}}><span>⭐</span><div><div style={{fontSize:11,fontWeight:600,color:"#a09060",marginBottom:3}}>YOUR DECISION</div><div style={{fontSize:13,color:"#2d3748"}}>{decision}</div></div></div>}
    </Chat>
  );
}



// ── TASK ASSISTANT ─────────────────────────────────────────────────────────
const TASK_KEY="pf_exec_list"; // shared with Executive Function Coach
let idSeq=0;
const uid=()=>"t"+Date.now().toString(36)+(idSeq++);
const normTasks=arr=>(arr||[]).map(x=>x&&typeof x==="object"?{id:x.id||uid(),text:x.text??"",done:!!x.done}:{id:uid(),text:String(x),done:false});
const extractJSON=raw=>{const a=raw.indexOf("{"),b=raw.lastIndexOf("}");if(a<0||b<=a)throw new Error("no json");return JSON.parse(raw.slice(a,b+1));};
const applyOps=(tasks,ops)=>{
  let next=[...tasks];
  for(const o of ops||[]){
    if(o.op==="add"&&o.text!=null) next.push({id:uid(),text:String(o.text),done:false});
    else if(o.op==="delete") next=next.filter(t=>t.id!==o.id);
    else if(o.op==="update") next=next.map(t=>t.id===o.id?{...t,...(o.text!=null?{text:String(o.text)}:{}),...(o.done!=null?{done:!!o.done}:{})}:t);
    else if(o.op==="clear_completed") next=next.filter(t=>!t.done);
  }
  return next;
};
const taskSys=tasks=>`You are a friendly task management assistant. The user speaks naturally; you translate their request into structured operations on their task list.

CURRENT TASK LIST (use these exact ids for delete/update):
${tasks.length?tasks.map(t=>`- id:${t.id} | [${t.done?"x":" "}] ${t.text}`).join("\n"):"(empty)"}

Respond with ONLY a JSON object — no prose, no markdown fences:
{"reply":"<one short friendly sentence about what you did>","ops":[...]}

Valid ops:
- {"op":"add","text":"..."}                                  add a new task
- {"op":"delete","id":"..."}                                 remove a task by its id
- {"op":"update","id":"...","text":"...","done":true|false}  edit text and/or completion (omit fields you aren't changing)
- {"op":"clear_completed"}                                   remove all completed tasks
- {"op":"undo"}                                              revert the most recent change

Rules:
- For bulk requests emit MULTIPLE ops (e.g. "mark these three done" = three update ops).
- Only reference ids that exist in the list above. If a task can't be found, say so in reply with "ops":[].
- If the user is just asking a question or chatting, give a helpful reply with "ops":[].
- Keep reply under 20 words.${SAFETY}`;

function TaskAssistant({onBack,onCrisis}){
  const [tasks,setTasks]=useState([]);
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hi! Tell me what to add, change, or remove — e.g. \"add buy milk and call the dentist\" or \"mark the gym one done\". Say \"undo\" anytime.",ts:now()}]);
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [showList,setShowList]=useState(true);
  const undoStack=useRef([]);const [canUndo,setCanUndo]=useState(false);

  useEffect(()=>{(async()=>{try{const r=await window.storage.get(TASK_KEY);if(r?.value)setTasks(normTasks(JSON.parse(r.value)));}catch{}})();},[]);

  const persist=async t=>{setTasks(t);try{await window.storage.set(TASK_KEY,JSON.stringify(t));}catch{}};
  const pushUndo=cur=>{undoStack.current=[...undoStack.current,cur].slice(-20);setCanUndo(true);};
  const doUndo=async announce=>{
    if(!undoStack.current.length){if(announce)setMsgs(p=>[...p,{role:"assistant",text:"Nothing to undo.",ts:now()}]);return false;}
    const prev=undoStack.current[undoStack.current.length-1];
    undoStack.current=undoStack.current.slice(0,-1);setCanUndo(undoStack.current.length>0);
    await persist(prev);
    if(announce)setMsgs(p=>[...p,{role:"assistant",text:"Reverted the last change.",ts:now()}]);
    return true;
  };

  const send=async text=>{
    if(detectCrisis(text))onCrisis();
    const hist=[...msgs,{role:"user",text}].slice(-12).map(m=>({role:m.role,content:m.text||m.content}));
    while(hist.length&&hist[0].role!=="user")hist.shift();
    setMsgs(p=>[...p,{role:"user",text,ts:now()}]);setLoading(true);
    try{
      const raw=await api(hist,taskSys(tasks));
      let data;try{data=extractJSON(raw);}catch{setMsgs(p=>[...p,{role:"assistant",text:"I didn't quite get that — try rephrasing?",ts:now()}]);setLoading(false);return;}
      const ops=Array.isArray(data.ops)?data.ops:[];
      if(ops.some(o=>o.op==="undo")){
        const ok=await doUndo(false);
        setMsgs(p=>[...p,{role:"assistant",text:ok?(data.reply||"Reverted the last change."):"Nothing to undo.",ts:now()}]);
      }else if(ops.length){
        pushUndo(tasks);await persist(applyOps(tasks,ops));
        setMsgs(p=>[...p,{role:"assistant",text:data.reply||"Done.",ts:now()}]);
      }else{
        setMsgs(p=>[...p,{role:"assistant",text:data.reply||"Okay.",ts:now()}]);
      }
    }catch{setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong.",ts:now()}]);}
    setLoading(false);
  };

  const toggle=i=>{pushUndo(tasks);persist(tasks.map((t,j)=>j===i?{...t,done:!t.done}:t));};
  const remove=i=>{pushUndo(tasks);persist(tasks.filter((_,j)=>j!==i));};

  const open=tasks.filter(t=>!t.done).length;
  const extra=<>
    <button onClick={()=>doUndo(true)} disabled={!canUndo} style={{fontSize:12,color:canUndo?"#666":"#ccc",background:"none",border:"1px solid #ddd",borderRadius:6,padding:"4px 10px",cursor:canUndo?"pointer":"default"}}>↶ Undo</button>
    <button onClick={()=>setShowList(s=>!s)} style={{fontSize:12,color:"#666",background:"none",border:"1px solid #ddd",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>{showList?"Hide list":"My list"}{open>0&&` (${open})`}</button>
  </>;

  return(
    <Chat header={<Hdr icon="✅" name="Task Assistant" sub="Manage tasks by chatting" extra={extra} onBack={onBack} onCrisis={onCrisis}/>} messages={msgs} input={input} setInput={setInput} onSend={send} loading={loading} onCrisis={onCrisis}>
      {showList&&(
        <div style={{background:"#fffdf9",border:"1px solid #e4ddd4",borderRadius:10,padding:14,margin:"4px 0"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#7a6f62",letterSpacing:0.5,marginBottom:8}}>MY TASKS</div>
          {tasks.length===0&&<div style={{fontSize:13,color:"#bbb",fontStyle:"italic"}}>No tasks yet — tell me what to add.</div>}
          {tasks.map((t,i)=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
              <input type="checkbox" checked={!!t.done} onChange={()=>toggle(i)} style={{accentColor:"#7a9e7e",cursor:"pointer"}}/>
              <span style={{fontSize:13,flex:1,textDecoration:t.done?"line-through":"none",color:t.done?"#bbb":"#2c2c2c"}}>{t.text}</span>
              <button onClick={()=>remove(i)} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14}}>×</button>
            </div>
          ))}
        </div>
      )}
    </Chat>
  );
}

// ── HOME ───────────────────────────────────────────────────────────────────
function Home({onSelect,onCrisis}){
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"Georgia,serif",background:"#f8f7f4"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px"}}>
        <div style={{fontSize:11,letterSpacing:2,color:"#a0aec0",textTransform:"uppercase",marginBottom:10}}>Purposefields</div>
        <h1 style={{fontSize:24,fontWeight:600,color:"#2d3748",marginBottom:8}}>Coaching Hub</h1>
        <p style={{color:"#718096",fontSize:14,marginBottom:36,textAlign:"center",maxWidth:360,lineHeight:1.7}}>Choose a coaching space. Each session is private and learns from you over time.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:440}}>
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>onSelect(t.id)} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px 18px",background:"white",border:"1px solid #e2e8f0",borderRadius:12,cursor:"pointer",textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
              <span style={{fontSize:24,lineHeight:1,flexShrink:0}}>{t.icon}</span>
              <div><div style={{fontWeight:600,fontSize:14,color:"#2d3748",marginBottom:2}}>{t.name}</div><div style={{fontSize:13,color:"#718096",lineHeight:1.6}}>{t.desc}</div></div>
            </button>
          ))}
        </div>
      </div>
      <div style={{borderTop:"1px solid #e2e8f0",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"white",flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:12,color:"#a0aec0"}}>🆘 In crisis? <a href="tel:131114" style={{color:"#e53e3e",fontWeight:600,textDecoration:"none"}}>Lifeline 13 11 14</a> · <button onClick={onCrisis} style={{background:"none",border:"none",color:"#e53e3e",fontWeight:600,fontSize:12,cursor:"pointer",padding:0,fontFamily:"Georgia,serif"}}>All resources →</button></div>
        <div style={{fontSize:12,color:"#a0aec0"}}>AI coaching · Not therapy</div>
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("home");
  const [consented,setConsented]=useState(null);
  const [crisis,setCrisis]=useState(false);

  useEffect(()=>{
    let done=false;
    const fallback=setTimeout(()=>{if(!done){done=true;setConsented(false);}},3000);
    (async()=>{
      try{const r=await window.storage.get(CONSENT_KEY);if(!done){done=true;clearTimeout(fallback);if(r?.value){const{ts}=JSON.parse(r.value);setConsented((Date.now()-ts)/(864e5)<90);}else setConsented(false);}}
      catch{if(!done){done=true;clearTimeout(fallback);setConsented(false);}}
    })();
    return()=>{done=true;clearTimeout(fallback);};
  },[]);

  const handleConsent=async()=>{await window.storage.set(CONSENT_KEY,JSON.stringify({ts:Date.now()}));setConsented(true);};

  if(consented===null) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Georgia,serif",color:"#a0aec0",fontSize:14}}>Loading…</div>;
  if(!consented) return <><ConsentGate onAccept={handleConsent} onCrisis={()=>setCrisis(true)}/>{crisis&&<CrisisOverlay onClose={()=>setCrisis(false)}/>}</>;

  const cp={onBack:()=>setScreen("home"),onCrisis:()=>setCrisis(true)};

  return(
    <>
      {crisis&&<CrisisOverlay onClose={()=>setCrisis(false)}/>}
      {screen==="home"&&<Home onSelect={setScreen} onCrisis={()=>setCrisis(true)}/>}
      {screen==="cbt"&&<CBTCoach {...cp}/>}
      {screen==="action"&&<ActionCoach {...cp}/>}
      {screen==="exec"&&<ExecCoach {...cp}/>}
      {screen==="charge"&&<ChargeCoach {...cp}/>}
      {screen==="clarity"&&<ClarityCoach {...cp}/>}
      {screen==="tasks"&&<TaskAssistant {...cp}/>}

    </>
  );
}
