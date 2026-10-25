import { useState, useRef, useEffect } from "react";

const GOAL_KEY = "purposefields_goals";
const CONSENT_KEY = "purposefields_consent_v1";
const CRISIS_KW = ["suicide","suicidal","kill myself","end my life","want to die","don't want to live","dont want to live","self-harm","self harm","hurt myself","cut myself","overdose","harm myself","not worth living","better off dead"];
const detectCrisis = t => CRISIS_KW.some(k => t.toLowerCase().includes(k));
const CRISIS_RES = [{name:"Lifeline",num:"13 11 14",desc:"24/7 crisis support"},{name:"Beyond Blue",num:"1300 22 4636",desc:"Mental health support"},{name:"Emergency",num:"000",desc:"Immediate danger"},{name:"13YARN",num:"13 92 76",desc:"Aboriginal & Torres Strait Islander"}];
const SAFETY = `\n\nSAFETY: If user expresses suicidal ideation, self-harm, or crisis — acknowledge warmly and provide: Lifeline 13 11 14, Beyond Blue 1300 22 4636, Emergency 000. This tool does not replace professional mental health care.`;

const api = async (messages, system, retries=2, delay=1500, maxTokens=900) => {
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages})});
  const d = await res.json();
  if (res.status===529&&retries>0){await new Promise(r=>setTimeout(r,delay));return api(messages,system,retries-1,delay*1.5,maxTokens);}
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
  {id:"career",icon:"🧗",name:"Career Pathway Coach",desc:"Six gated phases from values to role options to three calendar-locked commitments toward your next job."},

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
function Chat({header,children,messages,input,setInput,onSend,loading,onCrisis,inputDisabled,style}){
  const bottomRef=useRef(null);const inputRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);
  const send=()=>{if(!input.trim()||loading||inputDisabled)return;onSend(input.trim());setInput("");};
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"Georgia,serif",maxWidth:700,margin:"0 auto",...style}}>
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



// ── CAREER PATHWAY COACH ───────────────────────────────────────────────────
// Employment Pathway Facilitation Engine: 6 gated phases. The model replies in prose and
// appends a <state>{…}</state> JSON patch; the app merges it into the session schema and
// enforces every exit gate client-side, so the model can never skip a phase.
const CAREER_KEY="pf_career_session_v1";
const CP_PHASES=[
  {n:1,name:"Boundary Envelope",short:"Boundaries",color:"#4a7c59",subs:["Core Values","Identity Inventory","North Star Vision","Hard Constraints"]},
  {n:2,name:"Tri-Factor Audit",short:"Inventory",color:"#3b6ea5",subs:["Applied Skills","Knowledge Domains","Core Energy Drivers","Semantic Dedupe"]},
  {n:3,name:"Role Architecture",short:"Roles",color:"#7a5ea8",subs:["Taxonomy Cross-Match","Sector & Setting Fit","Hybrid Role Modeling","Market Feasibility"]},
  {n:4,name:"Positioning Fit",short:"Position",color:"#b8952f",subs:["Filter Pruning","Value Proposition","Gap Analysis"]},
  {n:5,name:"Lever Triage",short:"Levers",color:"#c97d4e",subs:["Pipeline Actions","Critical-Path Sort","Rule-of-3 Filter"]},
  {n:6,name:"Calendar Lock",short:"Calendar",color:"#b5546b",subs:["Capacity Assessment","Calendar Time-Blocks","Definitions of Done"]},
];
const VALUE_CLUSTERS=[
  {name:"Growth & Mastery",color:"#3b6ea5",values:["Learning velocity","Intellectual challenge","Competence","Craft depth"]},
  {name:"Autonomy & Trust",color:"#7a5ea8",values:["Schedule flexibility","Self-direction","Low micromanagement","Asynchronous communication"]},
  {name:"Wellbeing & Security",color:"#4a7c59",values:["Psychological safety","Sustainable workload","Job stability","Mental health support"]},
  {name:"Impact & Purpose",color:"#c97d4e",values:["Mission alignment","Ethical standards","Social good","Tangible user outcomes"]},
  {name:"Compensation & Prestige",color:"#b8952f",values:["Market-leading pay","Brand reputation","Organisational authority","Career acceleration"]},
];
const EMP_TYPES=[["PERMANENT_FULL_TIME","Permanent full-time"],["CONTRACT","Fixed-term / contract"],["FRACTIONAL","Fractional"]];
const LOC_MODELS=[["REMOTE","Remote"],["HYBRID","Hybrid"],["ONSITE","Onsite"]];
const PACES=[["FAST_PACED","Fast-paced"],["STEADY","Steady"],["AUTONOMOUS","Autonomous"]];
const NOVELTY=[["HIGH","High novelty"],["MODERATE","Moderate"],["STRUCTURED","Structured"]];
const CURRENCIES=["AUD","USD","GBP","EUR","NZD","CAD","SGD","INR"];
const SKILL_CAT={TECHNICAL:"#3b6ea5",INTERPERSONAL:"#4a7c59",ANALYTICAL:"#7a5ea8",OPERATIONAL:"#c97d4e"};
const KNOW_CTX={INDUSTRY_VERTICAL:"#3b6ea5",METHODOLOGY:"#4a7c59",REGULATORY_SYSTEMS:"#b5546b"};
const PASSION_T={PROBLEM_SOLVING:"#c97d4e",HUMAN_DEVELOPMENT:"#4a7c59",SYSTEMIC_DESIGN:"#7a5ea8",DOMAIN_CAUSE:"#3b6ea5",CREATIVE_EXPRESSION:"#b8952f"};
const MOTIONS=[{k:"DIRECT_ELEVATION",name:"Direct Elevation",desc:"Upward step in your primary discipline",need:"2"},{k:"CROSS_DISCIPLINARY_HYBRID",name:"Cross-Disciplinary Hybrid",desc:"At the intersection of two domains",need:"3–4"},{k:"DOMAIN_PIVOT",name:"Domain Pivot",desc:"Core skills ported into a passion-aligned setting",need:"2"}];
const ACTION_T={POSITIONING_ASSETS:{icon:"🪪",c:"#4a7c59",name:"Positioning assets"},PROOF_OF_WORK:{icon:"📁",c:"#3b6ea5",name:"Proof of work"},DIRECT_DISCOVERY:{icon:"🤝",c:"#b5546b",name:"Direct discovery"},SKILL_REMEDIATION:{icon:"🛠",c:"#c97d4e",name:"Skill remediation"}};
const ACTION_ALIAS={POSITIONING:"POSITIONING_ASSETS",PORTFOLIO:"PROOF_OF_WORK",NETWORKING:"DIRECT_DISCOVERY",APPLICATION:"DIRECT_DISCOVERY"};
const actionT=t=>ACTION_T[ACTION_ALIAS[t]||t]||{icon:"•",c:"#a0aec0",name:t||"Action"};
const GAP_T={CREDENTIAL:"🎓",DEMONSTRABLE_PORTFOLIO:"📁",TECHNICAL_TOOL:"🛠"};
const RANKS=[{name:"Foundation",short:"Found.",color:"#4a7c59"},{name:"Proof / Evidence",short:"Proof",color:"#3b6ea5"},{name:"Market Contact",short:"Contact",color:"#b5546b"}];
const WINDOWS=[[1,2],[3,6],[7,10]];

const arr=v=>Array.isArray(v)?v:[];
const isObj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const deepMerge=(a,b)=>{if(!isObj(b))return b===undefined?a:b;const out={...(isObj(a)?a:{})};for(const k of Object.keys(b))out[k]=deepMerge(out[k],b[k]);return out;};
const words=t=>String(t||"").trim().split(/\s+/).filter(Boolean).length;
const pretty=v=>v?String(v).toLowerCase().replace(/_/g," ").replace(/^\w/,c=>c.toUpperCase()):"—";
const isoDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays=(iso,n)=>{const d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);return isoDate(d);};
const dayDiff=(a,b)=>Math.round((new Date(b+"T00:00:00").getTime()-new Date(a+"T00:00:00").getTime())/864e5);
const toMin=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||"");return m?+m[1]*60+ +m[2]:null;};
const localTZ=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";}catch{return "UTC";}};
const cpUuid=()=>{try{return crypto.randomUUID();}catch{return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&3|8)).toString(16);});}};
const fmtMoney=(n,cur,compact)=>{try{return new Intl.NumberFormat("en-AU",{style:"currency",currency:cur||"AUD",maximumFractionDigits:compact?0:0,notation:compact?"compact":"standard"}).format(n);}catch{return `${cur||""} ${Math.round(n).toLocaleString()}`;}};
const fitColor=f=>f>=0.75?"#4a7c59":f>=0.5?"#b8952f":"#c0504d";
const valueColor=v=>(VALUE_CLUSTERS.find(c=>c.values.some(x=>x.toLowerCase()===String(v).toLowerCase()))||{color:"#a0aec0"}).color;
const parseSub=v=>{const m=/(\d)\s*\.\s*(\d)/.exec(String(v||""));return m?[Math.min(6,Math.max(1,+m[1])),Math.max(1,+m[2])]:[1,1];};
const cpAnchor=s=>s.phase6_anchor||isoDate(new Date());

const emptyCareer=()=>({session_id:cpUuid(),created_at:isoDate(new Date()),phase_status:"IN_PROGRESS",current_sub_routine:"1.1",phase6_anchor:null,
  user_context:{current_title:"",years_experience:null,target_timeline_months:null},
  boundary_envelope:{core_values:[],identities:{current_roles:[],emerging_identities:[],aspired_titles:[]},
    north_star_vision:{scale_of_influence:"",reputation_and_standing:"",leadership_or_craft_focus:"",raw_statement:""},
    hard_constraints:{base_salary_floor:null,currency:"",employment_type:"",location_model:"",max_commute_minutes:null,max_office_days_per_week:null,workplace_conditions:{pace:"",novelty_level:"",cultural_non_negotiables:[]}}},
  tri_factor_inventory:{skills:[],knowledge:[],passions:[]},
  candidate_roles:[],
  career_positioning:{primary_target_role:"",alternative_pivot_roles:[],target_environments:[],unique_value_proposition:"",gap_analysis:[],confirmed:false},
  execution_pipeline:{brainstormed_tasks:[],top_3_commitments:[]}});

// ── gates ──
function hcIssues(hc){hc=hc||{};const wc=hc.workplace_conditions||{};const o=[];
  if(!(Number(hc.base_salary_floor)>0))o.push("Salary floor: exact figure required");
  if(!/^[A-Z]{3}$/.test(hc.currency||""))o.push("Currency: ISO code required");
  if(!EMP_TYPES.some(([k])=>k===hc.employment_type))o.push("Employment type missing");
  if(!LOC_MODELS.some(([k])=>k===hc.location_model))o.push("Location model missing");
  else if(hc.location_model==="ONSITE"&&!(Number(hc.max_commute_minutes)>0))o.push("Onsite: max commute minutes required");
  else if(hc.location_model==="HYBRID"&&!(Number(hc.max_office_days_per_week)>=1&&Number(hc.max_office_days_per_week)<=5))o.push("Hybrid: max office days per week required");
  if(!wc.pace)o.push("Workplace pace missing");
  return o;}
function commitmentIssues(c,anchor){const ce=(c&&c.calendar_event)||{};const o=[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ce.scheduled_date||"")||toMin(ce.start_time)==null||toMin(ce.end_time)==null){o.push("not scheduled");return o;}
  const dur=toMin(ce.end_time)-toMin(ce.start_time);if(dur<90||dur>180)o.push(`${dur} min block (need 90–180)`);
  const w=WINDOWS[(c.rank||3)-1]||WINDOWS[2];const d=dayDiff(anchor,ce.scheduled_date);if(d<w[0]||d>w[1])o.push(`day ${d} (window: day ${w[0]}–${w[1]})`);
  return o;}
function careerGates(s){
  const g={1:[],2:[],3:[],4:[],5:[],6:[]};
  const be=s.boundary_envelope||{},id=be.identities||{},ns=be.north_star_vision||{};
  const cv=arr(be.core_values).length;if(cv<4||cv>6)g[1].push(`Core values: ${cv} selected (need 4–6)`);
  if(!arr(id.current_roles).length)g[1].push("Identity: functional base missing");
  if(!arr(id.emerging_identities).length)g[1].push("Identity: informal capability identity missing");
  if(!arr(id.aspired_titles).length)g[1].push("Identity: aspirational horizon missing");
  const nw=words(ns.raw_statement);if(nw<75||nw>120)g[1].push(`North Star: ${nw} words (need 75–120)`);
  g[1].push(...hcIssues(be.hard_constraints));
  const inv=s.tri_factor_inventory||{};const seen={};
  [["skills","Skills"],["knowledge","Knowledge"],["passions","Passions"]].forEach(([k,l])=>{
    const labels=arr(inv[k]).map(x=>String((x&&x.label)||"").trim().toLowerCase()).filter(Boolean);const uniq=new Set(labels);
    if(uniq.size<5)g[2].push(`${l}: ${uniq.size}/5 distinct`);
    if(uniq.size<labels.length)g[2].push(`${l}: duplicate entries to merge`);
    uniq.forEach(x=>{if(seen[x]&&seen[x]!==l)g[2].push(`"${x}" sits in both ${seen[x]} and ${l}`);seen[x]=l;});});
  const roles=arr(s.candidate_roles);const mc=k=>roles.filter(r=>r.motion_type===k).length;
  if(roles.length<6||roles.length>8)g[3].push(`Candidate roles: ${roles.length} (need 6–8)`);
  if(mc("DIRECT_ELEVATION")!==2)g[3].push(`Direct elevation: ${mc("DIRECT_ELEVATION")}/2`);
  const h=mc("CROSS_DISCIPLINARY_HYBRID");if(h<2||h>4)g[3].push(`Hybrid roles: ${h} (target 3–4)`);
  if(mc("DOMAIN_PIVOT")!==2)g[3].push(`Domain pivot: ${mc("DOMAIN_PIVOT")}/2`);
  if(roles.some(r=>typeof r.boundary_fit_score!=="number"||r.boundary_fit_score<0||r.boundary_fit_score>1))g[3].push("Every role needs a 0–1 boundary fit score");
  if(roles.some(r=>!r.organizational_setting))g[3].push("Every role needs an organisational setting");
  const cp=s.career_positioning||{};
  if(!cp.primary_target_role)g[4].push("Primary target role not selected");
  if(arr(cp.alternative_pivot_roles).length>2)g[4].push("Max 2 backup pivot roles");
  if(!cp.unique_value_proposition)g[4].push("Value proposition not drafted");
  if(!arr(cp.gap_analysis).length)g[4].push("Gap analysis empty");
  if(!cp.confirmed)g[4].push("Awaiting your confirmation of positioning");
  const ep=s.execution_pipeline||{};const bt=arr(ep.brainstormed_tasks).length;const t3=arr(ep.top_3_commitments);
  if(bt<6||bt>10)g[5].push(`Brainstormed actions: ${bt} (need 6–10)`);
  if(t3.length!==3)g[5].push(`Commitments: ${t3.length} (exactly 3)`);
  if(t3.some(c=>!c.definition_of_done))g[5].push("Each commitment needs a Definition of Done");
  if(t3.length!==3)g[6].push("3 ranked commitments needed");
  else{const a=cpAnchor(s);t3.forEach(c=>commitmentIssues(c,a).forEach(i=>g[6].push(`#${c.rank}: ${i}`)));}
  return g;}
const allowedPhase=g=>{for(let p=1;p<=5;p++)if(g[p].length)return p;return 6;};
const GATE_SUB=[[/duplicate|sits in both/,"2.4"],[/^Core values/,"1.1"],[/^Identity/,"1.2"],[/^North Star/,"1.3"],[/^(Salary|Currency|Employment|Location|Onsite|Hybrid:|Workplace)/,"1.4"],[/^Skills/,"2.1"],[/^Knowledge/,"2.2"],[/^Passions/,"2.3"],[/^(Primary|Max 2)/,"4.1"],[/^Value proposition/,"4.2"],[/^(Gap|Awaiting your confirmation)/,"4.3"],[/^Brainstormed/,"5.1"],[/^(Commitments|Each commitment)/,"5.3"]];
const gateSub=(item,p)=>(GATE_SUB.find(([re])=>re.test(item))||[null,`${p}.1`])[1];

// Merge a patch (from the model or a UI widget), normalise ids, then clamp the sub-routine
// to the furthest phase whose predecessors' gates are all met.
function applyCareerPatch(prev,patch){
  if(!isObj(patch))return{state:prev,blocked:null};
  let next=deepMerge(prev,patch);
  const inv=next.tri_factor_inventory||{};
  next.tri_factor_inventory={...inv,...Object.fromEntries([["skills","S"],["knowledge","K"],["passions","P"]].map(([k,px])=>[k,arr(inv[k]).filter(x=>x&&x.label).map((x,i)=>({...x,id:x.id||`${px}${i+1}`}))]))};
  next.candidate_roles=arr(next.candidate_roles).filter(r=>r&&r.job_title).map((r,i)=>({...r,id:r.id||`R${i+1}`}));
  const ep=next.execution_pipeline||{};
  next.execution_pipeline={...ep,brainstormed_tasks:arr(ep.brainstormed_tasks).filter(t=>t&&t.description).map((t,i)=>({...t,task_id:t.task_id||`T${i+1}`})),top_3_commitments:arr(ep.top_3_commitments).filter(Boolean).slice(0,3)};
  const cpp=patch.career_positioning;
  if(isObj(cpp)&&cpp.confirmed!==true&&Object.keys(cpp).some(k=>k!=="confirmed"))next.career_positioning={...next.career_positioning,confirmed:false};
  const g=careerGates(next);const maxP=allowedPhase(g);const want=parseSub(next.current_sub_routine);let blocked=null;
  if(want[0]>maxP){blocked={phase:maxP,items:g[maxP]};next.current_sub_routine=gateSub(g[maxP][0],maxP);}
  if(parseSub(next.current_sub_routine)[0]===6&&!next.phase6_anchor)next.phase6_anchor=isoDate(new Date());
  if(next.phase_status==="COMPLETED"&&(maxP<6||g[6].length))next.phase_status="IN_PROGRESS";
  return{state:next,blocked};}

const splitState=raw=>{const m=String(raw||"").match(/<state>([\s\S]*?)(<\/state>|$)/);let patch=null;
  if(m){try{patch=JSON.parse(m[1].trim().replace(/^```(?:json)?/,"").replace(/```$/,"").trim());}catch{}}
  return{text:String(raw||"").replace(/<state>[\s\S]*?(<\/state>|$)/,"").trim(),patch};};

// ── calendar export ──
const tzOffset=d=>{const o=-d.getTimezoneOffset();const a=Math.abs(o);return `${o>=0?"+":"-"}${String(Math.floor(a/60)).padStart(2,"0")}:${String(a%60).padStart(2,"0")}`;};
function eventPayload(c,s){const ce=c.calendar_event||{};const st=new Date(`${ce.scheduled_date}T${ce.start_time}:00`),en=new Date(`${ce.scheduled_date}T${ce.end_time}:00`);
  const task=arr(s.execution_pipeline.brainstormed_tasks).find(t=>t.task_id===c.task_id);
  return{calendar_event:{summary:`[CAREER COMMITMENT] ${c.title}`,
    description:`TARGET ROLE: ${s.career_positioning.primary_target_role}\n\nOBJECTIVE: ${(task&&task.description)||c.title}\n\nDEFINITION OF DONE: ${c.definition_of_done}`,
    start:{dateTime:`${ce.scheduled_date}T${ce.start_time}:00${tzOffset(st)}`,timeZone:localTZ()},
    end:{dateTime:`${ce.scheduled_date}T${ce.end_time}:00${tzOffset(en)}`,timeZone:localTZ()},
    reminders:{useDefault:false,overrides:[{method:"popup",minutes:15}]}}};}
const icsStamp=d=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
const icsEsc=t=>String(t||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
function buildICS(s){const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Purposefields//Career Pathway Coach//EN","CALSCALE:GREGORIAN"];
  arr(s.execution_pipeline.top_3_commitments).forEach(c=>{const p=eventPayload(c,s).calendar_event;
    L.push("BEGIN:VEVENT",`UID:${s.session_id}-${c.rank}@purposefields`,`DTSTAMP:${icsStamp(new Date())}`,`DTSTART:${icsStamp(new Date(p.start.dateTime))}`,`DTEND:${icsStamp(new Date(p.end.dateTime))}`,`SUMMARY:${icsEsc(p.summary)}`,`DESCRIPTION:${icsEsc(p.description)}`,"BEGIN:VALARM","TRIGGER:-PT15M","ACTION:DISPLAY",`DESCRIPTION:${icsEsc(p.summary)}`,"END:VALARM","END:VEVENT");});
  L.push("END:VCALENDAR");return L.join("\r\n");}
const gcalLink=(c,s)=>{const p=eventPayload(c,s).calendar_event;return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(p.summary)}&dates=${icsStamp(new Date(p.start.dateTime))}/${icsStamp(new Date(p.end.dateTime))}&details=${encodeURIComponent(p.description)}`;};
const download=(name,text,type)=>{try{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{}};

// ── system prompt ──
const CAREER_PROTOCOL=`You are an expert Career Development Practitioner and Vocational Systems Agent. You guide professionals through a rigorous, 6-phase career exploration process that maps their applied skills, knowledge domains, and energy drivers into viable, high-conviction job titles and employment pathways.

CORE OPERATING PRINCIPLES
1. EMPLOYMENT-FOCUSED CONVERGENCE: employment transitions, job roles and career pivots only — not venture creation. Phase 3 produces genuine market job titles, hybrid organisational roles and target sectors.
2. STRICT PHASE GATING: one phase at a time, never skip ahead. The app enforces exit gates (see GATE REPORT) and will hold you in a phase whose gate is UNMET.
3. CONCRETE CONSTRAINTS OVER ASPIRATIONS: 4–6 core values; an exact numeric salary floor and ISO currency (reject "competitive"); ≥5 distinct items each for Skills, Knowledge and Passions; exactly 3 final commitments (reject 4+).
4. COMBINATORIAL MAPPING: Role Target = Skill_A + Knowledge_B + Passion_C — surface non-obvious hybrid titles alongside traditional ladders.
5. CALENDAR-LOCKED MOMENTUM: never end with an open to-do list. The session ends only when 3 commitments have dates, times and Definitions of Done and the user locks them.

SUB-ROUTINES
1.1 Core Values — the app shows a picker of 5 clusters (Growth & Mastery; Autonomy & Trust; Wellbeing & Security; Impact & Purpose; Compensation & Prestige). User picks strictly 4–6 values. Reject outside [4,6].
1.2 Identity — three tiers: Functional base (what they reliably do today), Informal capability identity (the role they fall into on teams), Aspirational horizon (title/seniority of intended scope). Also capture user_context (current title, years experience, target timeline in months). Store clean declarative lines.
1.3 North Star — elicit scope of influence (team / cross-departmental / enterprise / public), reputation ("What problem do you want colleagues and leaders to seek you out to solve?"), and day-to-day contribution (high-context strategy, deep technical execution, or people leadership). Then draft a 75–120 word Professional North Star Statement in their voice, show it, invite edits, store it in raw_statement.
1.4 Hard Constraints — the app shows a form. Need: numeric salary floor + currency; REMOTE / HYBRID (max office days/week) / ONSITE (max commute minutes); PERMANENT_FULL_TIME / CONTRACT / FRACTIONAL; pace, novelty, cultural non-negotiables. Block Phase 2 if salary or location is missing.
2.1 Skills (what you can DO) — ≥5. category TECHNICAL|INTERPERSONAL|ANALYTICAL|OPERATIONAL; proficiency COMPETENT|ADVANCED|EXPERT (ask, or infer and say so).
2.2 Knowledge (what you KNOW) — ≥5. context INDUSTRY_VERTICAL|METHODOLOGY|REGULATORY_SYSTEMS; acquisition FORMAL_EDUCATION|PROFESSIONAL_PRACTICE|SELF_DIRECTED.
2.3 Passions (what ENERGISES you) — ≥5. interest_type PROBLEM_SOLVING|HUMAN_DEVELOPMENT|SYSTEMIC_DESIGN|DOMAIN_CAUSE|CREATIVE_EXPRESSION.
2.4 Dedupe — move misplaced items (e.g. "Psychology" Skills→Knowledge; "Workshop facilitation" Knowledge→Skills), merge synonyms, tell the user exactly what you moved. Exit: ≥5 clean entries in each bucket.
3.1–3.4 Role Architecture — generate 7–8 genuine market job titles in ONE turn: exactly 2 DIRECT_ELEVATION, 3–4 CROSS_DISCIPLINARY_HYBRID, exactly 2 DOMAIN_PIVOT. Each cites the S/K/P ids it combines (vector_alignment) plus a one-line rationale. Assign organizational_setting ENTERPRISE|GOVERNMENT_PUBLIC|SCALE_UP|NON_PROFIT|PROFESSIONAL_SERVICES and seniority_level INDIVIDUAL_CONTRIBUTOR|SENIOR|LEAD|PRINCIPAL|MANAGER|DIRECTOR. Estimate salary range in the user's currency and market (say clearly these are estimates to verify). market_demand GROWING|STABLE|SPECIALIZED_NICHE. Score boundary_fit_score 0.0–1.0 against salary floor, location model and core values; record every breach in boundary_flags. Then summarise briefly — the board shows the cards.
4.1 Target selection — the app shows a role picker: 1 primary + up to 2 backups. Ask which best aligns with strengths and direction, reviewing against lifestyle constraints.
4.2 Unique Value Proposition — three labelled lines: "Headline:", "Problem solved:", "Hybrid advantage:". Also set target_environments.
4.3 Gap analysis — honest hard gaps (CREDENTIAL, TECHNICAL_TOOL) and narrative gaps (DEMONSTRABLE_PORTFOLIO), each with a direct bridge_strategy. Ask the user to confirm (the app shows a Confirm button). Set career_positioning.confirmed=true ONLY when the user explicitly confirms.
5.1 Brainstorm 6–10 practical actions for the next 14 days, mixing the user's ideas with yours. action_type POSITIONING_ASSETS|PROOF_OF_WORK|DIRECT_DISCOVERY|SKILL_REMEDIATION.
5.2 Triage — mark busywork status "REJECTED" with a reason (mass generic applications, weeks tweaking resume templates); keep high-leverage items "KEPT".
5.3 Rule-of-3 — the app shows a picker for exactly 3. Rank 1 Foundation (align positioning materials to the target role taxonomy), rank 2 Proof/Evidence (package evidence for the primary gap), rank 3 Market Contact (targeted outreach / high-intent applications). Write a strict, verifiable definition_of_done for each.
6.1 Capacity — ask about availability over the next 7–14 days; protected 90–180 minute blocks.
6.2 Time-blocks — #1 on day 1–2, #2 on day 3–6, #3 on day 7–10 (day 0 = SCHEDULE ANCHOR). Propose concrete dates/times; the user can edit them on the board.
6.3 Definitions of Done appear in each calendar event. When all blocks validate, ask the user to press "Lock commitments". After lock (phase_status COMPLETED) give a short, encouraging summary.

STYLE
Warm, direct, practitioner tone. ≤170 words of prose per turn unless drafting the North Star or presenting roles. Work one sub-routine at a time; ask at most two questions. When entering a new sub-routine, start with "**Phase X.Y – Name**". Use **bold** sparingly; plain-text lists only (no tables, no headings). The user sees a live visual Pathway Board of the state — refer to it instead of repeating long lists.

STATE PROTOCOL (mandatory)
End EVERY reply with exactly one block, on its own line:
<state>{JSON patch}</state>
- A partial of the session schema. Objects deep-merge; arrays REPLACE, so always send the full array.
- Always include "current_sub_routine":"X.Y" for where the conversation now is.
- Record only what the user said or explicitly accepted, as soon as they say it. Never invent user data.
- Shapes:
user_context{current_title,years_experience,target_timeline_months}
boundary_envelope{core_values[],identities{current_roles[],emerging_identities[],aspired_titles[]},north_star_vision{scale_of_influence,reputation_and_standing,leadership_or_craft_focus,raw_statement},hard_constraints{base_salary_floor:number,currency,employment_type,location_model,max_commute_minutes,max_office_days_per_week,workplace_conditions{pace:FAST_PACED|STEADY|AUTONOMOUS,novelty_level:HIGH|MODERATE|STRUCTURED,cultural_non_negotiables[]}}}
tri_factor_inventory{skills[{id:"S1",label,category,proficiency}],knowledge[{id:"K1",label,domain,context,acquisition}],passions[{id:"P1",label,interest_type}]}
candidate_roles[{id:"R1",job_title,motion_type,seniority_level,organizational_setting,vector_alignment{skill_ids[],knowledge_ids[],passion_ids[]},estimated_salary_range{min,max},market_demand,boundary_fit_score,boundary_flags[],rationale}]
career_positioning{primary_target_role,alternative_pivot_roles[],target_environments[],unique_value_proposition,gap_analysis[{gap_item,gap_type,bridge_strategy}],confirmed}
execution_pipeline{brainstormed_tasks[{task_id:"T1",action_type,description,status:"KEPT"|"REJECTED",reason}],top_3_commitments[{rank,task_id,title,definition_of_done,calendar_event{scheduled_date:"YYYY-MM-DD",start_time:"HH:MM",end_time:"HH:MM",allocated_duration_minutes}}]}`;

function careerSystem(s){
  const g=careerGates(s);const maxP=allowedPhase(g);const cur=Math.min(parseSub(s.current_sub_routine)[0],maxP);const d=new Date();const anchor=cpAnchor(s);
  const report=CP_PHASES.slice(0,cur).map(ph=>`Phase ${ph.n} ${ph.name}: ${g[ph.n].length?"UNMET → "+g[ph.n].join("; "):"MET"}`).join("\n");
  return `${CAREER_PROTOCOL}

LIVE CONTEXT
TODAY: ${isoDate(d)} (${d.toLocaleDateString("en-AU",{weekday:"long"})}), timezone ${localTZ()}. SCHEDULE ANCHOR (day 0): ${anchor} → #1 on ${addDays(anchor,1)}–${addDays(anchor,2)}, #2 on ${addDays(anchor,3)}–${addDays(anchor,6)}, #3 on ${addDays(anchor,7)}–${addDays(anchor,10)}.
CURRENT SUB-ROUTINE: ${s.current_sub_routine}
GATE REPORT:
${report}
CURRENT SESSION STATE:
${JSON.stringify(s)}${SAFETY}`;}

const CP_OPENER=`Welcome — I'm your **Career Pathway Coach**. We'll move through six gated phases: your boundaries, your capability inventory, candidate roles, your positioning, the three highest-leverage actions, and finally locking those actions into your calendar.

The **Pathway Board** fills in as we go, and each phase only unlocks once its exit gate is met.

**Phase 1.1 – Core Values**
Below are five value clusters. Choose **strictly 4 to 6** values that are genuine non-negotiables for your next role — not nice-to-haves.`;

// ── small UI pieces ──
const cpInp={border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 8px",fontSize:13,fontFamily:"Georgia,serif",color:"#2d3748",background:"#fff"};
const Lbl=({children,style})=><div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#a0aec0",textTransform:"uppercase",margin:"14px 0 6px",...style}}>{children}</div>;
const Empty=({children})=><div style={{fontSize:13,color:"#a0aec0",fontStyle:"italic",lineHeight:1.6}}>{children}</div>;
const Chip=({c,children,title,solid})=><span title={title} style={{display:"inline-block",fontSize:12,padding:"3px 9px",borderRadius:999,background:solid?c:(c||"#a0aec0")+"14",border:`1px solid ${(c||"#a0aec0")}55`,color:solid?"#fff":"#2d3748",margin:"0 5px 5px 0",lineHeight:1.5}}>{children}</span>;
const Meter=({n,need,max,color})=>{const total=Math.max(max||need,n);return <div style={{display:"flex",gap:3,alignItems:"center"}}>{Array.from({length:total}).map((_,i)=><div key={i} style={{width:10,height:10,borderRadius:3,background:i<n?color:"#edf2f7",border:i>=need&&i>=n?`1px dashed ${color}88`:"1px solid transparent"}}/>)}<span style={{fontSize:11,color:n>=need?color:"#a0aec0",marginLeft:4}}>{n}/{max&&max!==need?`${need}–${max}`:need}</span></div>;};
const Btn=({onClick,disabled,children,color="#2d3748",ghost,style})=><button onClick={onClick} disabled={disabled} style={{background:ghost?"#fff":disabled?"#e2e8f0":color,color:ghost?color:disabled?"#a0aec0":"#fff",border:ghost?`1px solid ${color}66`:"none",borderRadius:9,padding:"8px 14px",fontSize:13,cursor:disabled?"default":"pointer",fontFamily:"Georgia,serif",...style}}>{children}</button>;
const Pills=({opts,val,onChange,color})=><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{opts.map(([k,l])=><button key={k} onClick={()=>onChange(k)} style={{fontSize:12,padding:"5px 10px",borderRadius:999,border:`1px solid ${val===k?color:"#e2e8f0"}`,background:val===k?color:"#fff",color:val===k?"#fff":"#4a5568",cursor:"pointer",fontFamily:"Georgia,serif"}}>{l}</button>)}</div>;
const Widget=({title,color,children})=><div style={{background:"#fff",border:`1px solid ${color}44`,borderRadius:14,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}><div style={{fontSize:11,fontWeight:700,letterSpacing:1,color,textTransform:"uppercase",marginBottom:10}}>{title}</div>{children}</div>;

function useWide(min){
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth>=min:true);
  useEffect(()=>{const f=()=>setW(window.innerWidth>=min);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f);},[min]);
  return w;}

function PhaseRail({curP,curSub,completed,onPick}){
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:4,padding:"8px 10px",background:"#fff",borderBottom:"1px solid #e2e8f0"}}>
      {CP_PHASES.map(ph=>{const done=completed||ph.n<curP;const active=!completed&&ph.n===curP;
        return(
          <button key={ph.n} onClick={()=>onPick(ph.n)} title={`Phase ${ph.n} · ${ph.name}`} style={{background:active?ph.color+"12":"none",border:"none",borderRadius:8,padding:"5px 2px",cursor:"pointer",fontFamily:"Georgia,serif",minWidth:0}}>
            <div style={{width:22,height:22,borderRadius:999,margin:"0 auto 3px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?ph.color:active?"#fff":"#edf2f7",color:done?"#fff":active?ph.color:"#a0aec0",border:`2px solid ${active?ph.color:"transparent"}`,boxSizing:"border-box"}}>{done?"✓":ph.n}</div>
            <div style={{fontSize:10,color:active?"#2d3748":"#718096",fontWeight:active?600:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.short}</div>
            <div style={{display:"flex",gap:2,justifyContent:"center",marginTop:4}}>{ph.subs.map((_,i)=><div key={i} style={{width:7,height:3,borderRadius:2,background:done||(active&&i+1<=curSub)?ph.color:"#e2e8f0"}}/>)}</div>
          </button>);})}
    </div>);}

function CpSection({ph,status,gate,open,onToggle,children}){
  const pill=status==="done"?{t:"✓ Gate passed",c:"#4a7c59"}:status==="active"?{t:gate.length?`${gate.length} to go`:"Gate met",c:ph.color}:{t:"Locked",c:"#a0aec0"};
  return(
    <div id={`cp-phase-${ph.n}`} style={{marginBottom:12,border:`1px solid ${status==="active"?ph.color+"66":"#e2e8f0"}`,borderRadius:14,background:status==="locked"?"#f7f7f5":"#fff",overflow:"hidden",scrollMarginTop:8}}>
      <button onClick={onToggle} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:"Georgia,serif",textAlign:"left"}}>
        <span style={{width:26,height:26,borderRadius:8,background:status==="locked"?"#e2e8f0":ph.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{status==="locked"?"🔒":ph.n}</span>
        <span style={{flex:1,minWidth:0}}>
          <span style={{display:"block",fontSize:14,fontWeight:600,color:"#2d3748"}}>Phase {ph.n} · {ph.name}</span>
          <span style={{display:"block",fontSize:11,color:"#a0aec0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.subs.map((x,i)=>`${ph.n}.${i+1} ${x}`).join(" · ")}</span>
        </span>
        <span style={{fontSize:11,color:pill.c,background:pill.c+"14",borderRadius:999,padding:"2px 9px",whiteSpace:"nowrap"}}>{pill.t}</span>
        <span style={{color:"#a0aec0",fontSize:12}}>{open?"▾":"▸"}</span>
      </button>
      {open&&<div style={{padding:"0 14px 14px",marginTop:-10}}>
        {status==="locked"?<Empty>Unlocks when Phase {ph.n-1} passes its exit gate.</Empty>:children}
        {status==="active"&&gate.length>0&&<div style={{marginTop:14,background:"#fafaf8",border:`1px dashed ${ph.color}66`,borderRadius:10,padding:"10px 12px"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:ph.color,textTransform:"uppercase",marginBottom:6}}>Exit gate</div>
          {gate.map((g,i)=><div key={i} style={{fontSize:12,color:"#718096",lineHeight:1.7}}>○ {g}</div>)}
        </div>}
      </div>}
    </div>);}

// ── board views ──
function EnvelopeView({s}){
  const be=s.boundary_envelope||{},id=be.identities||{},ns=be.north_star_vision||{},hc=be.hard_constraints||{},wc=hc.workplace_conditions||{},uc=s.user_context||{};
  const vals=arr(be.core_values);const nw=words(ns.raw_statement);
  const tiers=[["Today","Functional base",id.current_roles,"#cbd5e0"],["On teams","Informal identity",id.emerging_identities,"#9fb8a5"],["Horizon","Aspired scope",id.aspired_titles,"#4a7c59"]];
  const loc=hc.location_model?`${pretty(hc.location_model)}${hc.location_model==="HYBRID"&&hc.max_office_days_per_week?` · ≤${hc.max_office_days_per_week} office days/wk`:""}${hc.max_commute_minutes?` · ≤${hc.max_commute_minutes} min commute`:""}`:"—";
  const tiles=[["Salary floor",Number(hc.base_salary_floor)>0?`${fmtMoney(hc.base_salary_floor,hc.currency)} ${hc.currency||""}`:"—"],["Work model",loc],["Contract",EMP_TYPES.find(([k])=>k===hc.employment_type)?.[1]||"—"],["Pace",pretty(wc.pace)],["Novelty",pretty(wc.novelty_level)]];
  return(<>
    {(uc.current_title||uc.years_experience)&&<div style={{fontSize:12,color:"#718096",marginTop:12}}>{uc.current_title}{uc.years_experience?` · ${uc.years_experience} yrs`:""}{uc.target_timeline_months?` · target: ${uc.target_timeline_months} months`:""}</div>}
    <Lbl>1.1 Core values</Lbl>
    {vals.length?<div>{vals.map(v=><Chip key={v} c={valueColor(v)}>{v}</Chip>)}</div>:<Empty>Choose 4–6 values in the coach panel.</Empty>}
    <Lbl>1.2 Identity trajectory</Lbl>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>
      {tiers.map(([t,sub,list,c],i)=>(
        <div key={t} style={{borderRadius:10,padding:"8px 10px",background:c+"1f",borderTop:`3px solid ${c}`}}>
          <div style={{fontSize:12,fontWeight:600,color:"#2d3748"}}>{t}{i<2?" →":""}</div>
          <div style={{fontSize:10,color:"#a0aec0",marginBottom:4}}>{sub}</div>
          {arr(list).length?arr(list).map((x,j)=><div key={j} style={{fontSize:12,color:"#2d3748",lineHeight:1.5}}>{x}</div>):<div style={{fontSize:12,color:"#cbd5e0"}}>—</div>}
        </div>))}
    </div>
    <Lbl>1.3 North Star</Lbl>
    {ns.raw_statement?<div style={{borderLeft:"3px solid #b8952f",padding:"8px 12px",background:"#fffbea",borderRadius:"0 8px 8px 0",fontSize:13,lineHeight:1.7,color:"#2d3748",fontStyle:"italic"}}>“{ns.raw_statement}”
      <div style={{fontStyle:"normal",fontSize:11,marginTop:6,color:nw>=75&&nw<=120?"#4a7c59":"#c97d4e"}}>{nw} words · target 75–120</div></div>
      :<Empty>Your 75–120 word Professional North Star will be drafted here.</Empty>}
    {(ns.scale_of_influence||ns.reputation_and_standing||ns.leadership_or_craft_focus)&&<div style={{marginTop:8}}>
      {ns.scale_of_influence&&<Chip c="#b8952f" title="Scale of influence">🌐 {ns.scale_of_influence}</Chip>}
      {ns.reputation_and_standing&&<Chip c="#b8952f" title="Sought out to solve">🔑 {ns.reputation_and_standing}</Chip>}
      {ns.leadership_or_craft_focus&&<Chip c="#b8952f" title="Contribution focus">🎯 {ns.leadership_or_craft_focus}</Chip>}
    </div>}
    <Lbl>1.4 Hard constraints</Lbl>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:6}}>
      {tiles.map(([k,v])=><div key={k} style={{border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 10px"}}><div style={{fontSize:10,color:"#a0aec0",textTransform:"uppercase",letterSpacing:0.5}}>{k}</div><div style={{fontSize:13,color:v==="—"?"#cbd5e0":"#2d3748",fontWeight:600,marginTop:2}}>{v}</div></div>)}
    </div>
    {arr(wc.cultural_non_negotiables).length>0&&<div style={{marginTop:8}}>{arr(wc.cultural_non_negotiables).map(x=><Chip key={x} c="#718096">⛔ {x}</Chip>)}</div>}
  </>);}

function InventoryView({s}){
  const inv=s.tri_factor_inventory||{};
  const cols=[{k:"skills",t:"Skills",q:"What you can DO",c:"#3b6ea5",tag:x=>x.category,map:SKILL_CAT},{k:"knowledge",t:"Knowledge",q:"What you KNOW",c:"#4a7c59",tag:x=>x.context||x.acquisition,map:KNOW_CTX},{k:"passions",t:"Passions",q:"What ENERGISES you",c:"#c97d4e",tag:x=>x.interest_type,map:PASSION_T}];
  const prof={COMPETENT:1,ADVANCED:2,EXPERT:3};
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginTop:12}}>
      {cols.map(col=>{const items=arr(inv[col.k]);return(
        <div key={col.k} style={{border:`1px solid ${col.c}33`,borderRadius:12,padding:10,background:col.c+"08"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><div style={{fontSize:13,fontWeight:600,color:col.c}}>{col.t}</div><div style={{fontSize:10,color:"#a0aec0"}}>{col.q}</div></div>
          <div style={{margin:"6px 0 8px"}}><Meter n={items.length} need={5} color={col.c}/></div>
          {items.length?items.map(x=>{const tg=col.tag(x);const tc=col.map[tg]||"#a0aec0";return(
            <div key={x.id} style={{display:"flex",gap:7,alignItems:"flex-start",padding:"4px 0",borderTop:"1px solid #edf2f7"}}>
              <span style={{fontSize:9,color:"#a0aec0",width:18,flexShrink:0,paddingTop:3}}>{x.id}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:"#2d3748",lineHeight:1.4}}>{x.label}{x.domain&&col.k==="knowledge"&&x.domain!==x.label?<span style={{color:"#a0aec0"}}> · {x.domain}</span>:null}</div>
                <div style={{fontSize:10,color:tc}}>{pretty(tg)}{col.k==="skills"&&x.proficiency?<span style={{color:"#a0aec0",marginLeft:6,letterSpacing:1}} title={pretty(x.proficiency)}>{"●".repeat(prof[x.proficiency]||0)}{"○".repeat(3-(prof[x.proficiency]||0))}</span>:null}</div>
              </div>
            </div>);}):<Empty>Nothing yet.</Empty>}
        </div>);})}
    </div>
    <div style={{fontSize:10,color:"#a0aec0",marginTop:8,lineHeight:1.8}}>
      {[...Object.entries(SKILL_CAT),...Object.entries(KNOW_CTX)].map(([k,c])=><span key={k} style={{marginRight:10,whiteSpace:"nowrap"}}><span style={{color:c}}>■</span> {pretty(k)}</span>)}
    </div>
  </>);}

function RoleCard({r,s,floor,cur,scale,tag}){
  const inv=s.tri_factor_inventory||{};const f=Math.max(0,Math.min(1,Number(r.boundary_fit_score)||0));const fc=fitColor(f);
  const sr=r.estimated_salary_range||{};const mn=Number(sr.min)||0,mx=Number(sr.max)||0;
  const sc=mx&&floor?(mn>=floor?"#4a7c59":mx>=floor?"#b8952f":"#c0504d"):"#a0aec0";
  const va=r.vector_alignment||{};const lab=(list,i)=>(arr(list).find(x=>x.id===i)||{}).label||i;
  const vec=[["skill_ids",inv.skills,"#3b6ea5"],["knowledge_ids",inv.knowledge,"#4a7c59"],["passion_ids",inv.passions,"#c97d4e"]];
  return(
    <div style={{border:`1px solid ${tag?"#b8952f":"#e2e8f0"}`,borderRadius:12,padding:12,marginBottom:8,background:tag==="Primary"?"#fffbea":"#fff"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:"#2d3748"}}>{r.job_title} {tag&&<span style={{fontSize:10,color:"#fff",background:"#b8952f",borderRadius:999,padding:"1px 7px",verticalAlign:"middle"}}>{tag==="Primary"?"★ ":""}{tag}</span>}</div>
          <div style={{fontSize:11,color:"#718096",marginTop:2}}>{pretty(r.seniority_level)} · {pretty(r.organizational_setting)}{r.market_demand&&<> · <span style={{color:r.market_demand==="GROWING"?"#4a7c59":"#718096"}}>{r.market_demand==="GROWING"?"↗ ":""}{pretty(r.market_demand)}</span></>}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:18,fontWeight:700,color:fc,lineHeight:1}}>{Math.round(f*100)}%</div><div style={{fontSize:9,color:"#a0aec0",marginTop:2}}>boundary fit</div></div>
      </div>
      <div style={{height:5,background:"#edf2f7",borderRadius:3,margin:"9px 0 8px"}}><div style={{width:`${f*100}%`,height:"100%",background:fc,borderRadius:3}}/></div>
      {mx>0&&<div style={{marginBottom:6}}>
        <div style={{position:"relative",height:14}}>
          <div style={{position:"absolute",top:5,left:0,right:0,height:4,background:"#edf2f7",borderRadius:2}}/>
          <div style={{position:"absolute",top:3,height:8,borderRadius:4,background:sc,left:`${mn/scale*100}%`,width:`${Math.max(1.5,(mx-mn)/scale*100)}%`}}/>
          {floor>0&&<div title="Your salary floor" style={{position:"absolute",top:0,bottom:0,left:`${floor/scale*100}%`,width:2,background:"#2d3748"}}/>}
        </div>
        <div style={{fontSize:10,color:"#718096"}}>Est. {fmtMoney(mn,cur,true)}–{fmtMoney(mx,cur,true)}{floor>0&&<> · <span style={{color:"#2d3748"}}>▍floor {fmtMoney(floor,cur,true)}</span></>}</div>
      </div>}
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:4,marginTop:4}}>
        {vec.map(([k,list,c],i)=>[i>0&&arr(va[k]).length?<span key={k+"+"} style={{color:"#cbd5e0",fontSize:12}}>+</span>:null,...[...new Set(arr(va[k]))].map(x=><span key={k+x} title={lab(list,x)} style={{fontSize:11,padding:"1px 7px",borderRadius:6,background:c+"18",color:c}}>{x} {lab(list,x)}</span>)])}
      </div>
      {r.rationale&&<div style={{fontSize:11,color:"#718096",fontStyle:"italic",marginTop:6,lineHeight:1.5}}>{r.rationale}</div>}
      {arr(r.boundary_flags).map((x,i)=><div key={i} style={{fontSize:11,color:"#a0522d",marginTop:4}}>⚠ {x}</div>)}
    </div>);}

function CoverageMatrix({s}){
  const inv=s.tri_factor_inventory||{};const roles=arr(s.candidate_roles);
  const cols=[...arr(inv.skills).map(x=>({...x,b:"skill_ids",c:"#3b6ea5"})),...arr(inv.knowledge).map(x=>({...x,b:"knowledge_ids",c:"#4a7c59"})),...arr(inv.passions).map(x=>({...x,b:"passion_ids",c:"#c97d4e"}))];
  if(!cols.length||!roles.length)return null;
  const uses=c=>roles.filter(r=>arr((r.vector_alignment||{})[c.b]).includes(c.id)).length;
  return(<>
    <Lbl>3.1 Taxonomy cross-match · which assets each role draws on</Lbl>
    <div style={{overflowX:"auto",border:"1px solid #edf2f7",borderRadius:10,padding:8}}>
      <table style={{borderCollapse:"collapse",fontSize:10}}>
        <thead><tr><th/>{cols.map(c=><th key={c.id} title={c.label} style={{color:c.c,fontWeight:600,padding:"0 1px 4px"}}>{c.id}</th>)}</tr></thead>
        <tbody>
          {roles.map(r=><tr key={r.id}><td title={r.job_title} style={{whiteSpace:"nowrap",paddingRight:8,color:"#2d3748",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}}>{r.job_title}</td>
            {cols.map(c=>{const on=arr((r.vector_alignment||{})[c.b]).includes(c.id);return <td key={c.id} style={{padding:1}}><div title={`${r.job_title} × ${c.label}`} style={{width:14,height:14,borderRadius:3,background:on?c.c:"#f1f3f5"}}/></td>;})}</tr>)}
          <tr><td style={{color:"#a0aec0",paddingTop:4}}>roles using</td>{cols.map(c=><td key={c.id} style={{textAlign:"center",color:uses(c)?c.c:"#cbd5e0",paddingTop:4}}>{uses(c)}</td>)}</tr>
        </tbody>
      </table>
    </div>
  </>);}

function RolesView({s}){
  const roles=arr(s.candidate_roles);const hc=(s.boundary_envelope||{}).hard_constraints||{};const cp=s.career_positioning||{};
  if(!roles.length)return <div style={{marginTop:12}}><Empty>Your 6–8 candidate roles — direct elevation, cross-disciplinary hybrid and domain pivot — will appear here, each scored against your boundary envelope.</Empty></div>;
  const floor=Number(hc.base_salary_floor)||0;const scale=(Math.max(floor,...roles.map(r=>Number((r.estimated_salary_range||{}).max)||0))*1.12)||1;
  const tagOf=r=>r.job_title===cp.primary_target_role?"Primary":arr(cp.alternative_pivot_roles).includes(r.job_title)?"Backup":null;
  const groups=[...MOTIONS,{k:null,name:"Other",desc:"",need:""}].map(m=>({...m,rs:roles.filter(r=>m.k?r.motion_type===m.k:!MOTIONS.some(x=>x.k===r.motion_type))})).filter(m=>m.k||m.rs.length);
  return(<>
    {groups.map(m=><div key={m.name}>
      <Lbl>{m.name} <span style={{fontWeight:400,letterSpacing:0,textTransform:"none"}}>· {m.desc} · {m.rs.length}/{m.need}</span></Lbl>
      {m.rs.length?m.rs.map(r=><RoleCard key={r.id} r={r} s={s} floor={floor} cur={hc.currency} scale={scale} tag={tagOf(r)}/>):<Empty>None yet.</Empty>}
    </div>)}
    <CoverageMatrix s={s}/>
  </>);}

function PositionView({s}){
  const cp=s.career_positioning||{};
  if(!cp.primary_target_role)return <div style={{marginTop:12}}><Empty>Pick a primary target role (and up to 2 backups) to build your positioning.</Empty></div>;
  return(<>
    <div style={{marginTop:12,borderRadius:12,padding:"12px 14px",background:"linear-gradient(135deg,#fffbea,#fff)",border:"1px solid #e8dfc8"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#b8952f",textTransform:"uppercase"}}>★ Primary target</div>
      <div style={{fontSize:17,fontWeight:600,color:"#2d3748",margin:"3px 0 6px"}}>{cp.primary_target_role}</div>
      {arr(cp.alternative_pivot_roles).length>0&&<div style={{fontSize:12,color:"#718096"}}>Backups: {arr(cp.alternative_pivot_roles).join(" · ")}</div>}
      {arr(cp.target_environments).length>0&&<div style={{marginTop:8}}>{arr(cp.target_environments).map(x=><Chip key={x} c="#b8952f">🏢 {x}</Chip>)}</div>}
      {cp.confirmed&&<div style={{fontSize:11,color:"#4a7c59",marginTop:4}}>✓ Confirmed by you</div>}
    </div>
    <Lbl>4.2 Value proposition</Lbl>
    {cp.unique_value_proposition?<div style={{fontSize:13,lineHeight:1.7,color:"#2d3748",whiteSpace:"pre-wrap",background:"#fafaf8",borderRadius:10,padding:"10px 12px"}}>{bold(String(cp.unique_value_proposition).replace(/(Headline:|Problem solved:|Hybrid advantage:)/g,"**$1**"))}</div>:<Empty>Being drafted…</Empty>}
    <Lbl>4.3 Gap analysis & bridges</Lbl>
    {arr(cp.gap_analysis).length?arr(cp.gap_analysis).map((g,i)=>(
      <div key={i} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 18px minmax(0,1.3fr)",gap:8,alignItems:"center",padding:"8px 0",borderTop:i?"1px solid #edf2f7":"none"}}>
        <div><div style={{fontSize:12,fontWeight:600,color:"#2d3748"}}>{GAP_T[g.gap_type]||"•"} {g.gap_item}</div><div style={{fontSize:10,color:"#c0504d"}}>{pretty(g.gap_type)}</div></div>
        <div style={{color:"#cbd5e0",textAlign:"center"}}>→</div>
        <div style={{fontSize:12,color:"#4a7c59",lineHeight:1.5}}>{g.bridge_strategy}</div>
      </div>)):<Empty>Gaps will be mapped once your pitch is drafted.</Empty>}
  </>);}

function LeversView({s}){
  const ep=s.execution_pipeline||{};const tasks=arr(ep.brainstormed_tasks);const t3=arr(ep.top_3_commitments);
  return(<>
    <Lbl>5.1 Brainstorm · 5.2 triage</Lbl>
    {tasks.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:6}}>
      {tasks.map(t=>{const at=actionT(t.action_type);const rej=t.status==="REJECTED";const chosen=t3.some(c=>c.task_id===t.task_id);return(
        <div key={t.task_id} style={{border:`1px solid ${chosen?at.c:"#e2e8f0"}`,borderLeft:`3px solid ${rej?"#cbd5e0":at.c}`,borderRadius:8,padding:"7px 9px",background:rej?"#f7f7f5":chosen?at.c+"0d":"#fff",opacity:rej?0.75:1}}>
          <div style={{fontSize:10,color:rej?"#a0aec0":at.c}}>{at.icon} {t.task_id} · {at.name}{chosen?" · ★ chosen":""}</div>
          <div style={{fontSize:12,color:rej?"#a0aec0":"#2d3748",textDecoration:rej?"line-through":"none",lineHeight:1.45,marginTop:2}}>{t.description}</div>
          {rej&&t.reason&&<div style={{fontSize:10,color:"#c0504d",marginTop:3}}>✕ {t.reason}</div>}
        </div>);})}
    </div>:<Empty>6–10 actions for the next 14 days will be brainstormed here, then busywork gets cut.</Empty>}
    <Lbl>5.3 Rule of 3 · critical path</Lbl>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:6}}>
      {RANKS.map((rk,i)=>{const c=t3.find(x=>Number(x.rank)===i+1);return(
        <div key={i} style={{borderRadius:10,padding:10,border:c?`1px solid ${rk.color}55`:"1px dashed #cbd5e0",background:c?rk.color+"0d":"transparent"}}>
          <div style={{fontSize:10,fontWeight:700,color:rk.color,letterSpacing:0.5}}>#{i+1} {rk.name.toUpperCase()}</div>
          {c?<><div style={{fontSize:13,fontWeight:600,color:"#2d3748",margin:"3px 0"}}>{c.title}</div><div style={{fontSize:11,color:"#718096",lineHeight:1.5}}><strong>Done when:</strong> {c.definition_of_done||"—"}</div></>:<div style={{fontSize:12,color:"#cbd5e0",marginTop:4}}>Empty slot</div>}
        </div>);})}
    </div>
  </>);}

function CalendarView({s,onPatch,onLock,completed}){
  const ep=s.execution_pipeline||{};const t3=[...arr(ep.top_3_commitments)].sort((a,b)=>a.rank-b.rank);const anchor=cpAnchor(s);
  const [copied,setCopied]=useState(false);
  if(t3.length!==3)return <div style={{marginTop:12}}><Empty>Your three commitments will be time-blocked here once the Rule-of-3 cut is made.</Empty></div>;
  const days=Array.from({length:14},(_,i)=>addDays(anchor,i));
  const upd=(rank,f)=>onPatch({execution_pipeline:{top_3_commitments:arr(ep.top_3_commitments).map(c=>{if(c.rank!==rank)return c;const ce={...(c.calendar_event||{}),...f};const d=toMin(ce.end_time)-toMin(ce.start_time);if(toMin(ce.start_time)!=null&&toMin(ce.end_time)!=null)ce.allocated_duration_minutes=d;return {...c,calendar_event:ce};})}});
  const allOk=t3.every(c=>!commitmentIssues(c,anchor).length);
  const copy=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(t3.map(c=>eventPayload(c,s)),null,2));setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{}};
  return(<>
    <Lbl>6.2 Next 14 days · shaded = target window</Lbl>
    <div style={{display:"grid",gridTemplateColumns:"52px repeat(14,minmax(0,1fr))",gap:2,fontSize:10}}>
      <div/>{days.map((d,i)=>{const dt=new Date(d+"T00:00:00");return <div key={d} style={{textAlign:"center",color:i===0?"#2d3748":"#a0aec0",fontWeight:i===0?700:400,lineHeight:1.3}}>{dt.toLocaleDateString("en-AU",{weekday:"narrow"})}<br/>{dt.getDate()}</div>;})}
      {RANKS.map((rk,ri)=>{const c=t3[ri];const ce=(c&&c.calendar_event)||{};const dd=ce.scheduled_date?dayDiff(anchor,ce.scheduled_date):null;const [a,b]=WINDOWS[ri];
        return [<div key={"l"+ri} style={{color:rk.color,fontWeight:600,alignSelf:"center",whiteSpace:"nowrap"}}>#{ri+1} {rk.short}</div>,
          ...days.map((d,i)=>{const inWin=i>=a&&i<=b;const here=dd===i;return <div key={ri+"-"+i} title={here?`${c.title} · ${ce.start_time}–${ce.end_time}`:inWin?`${rk.name} window`:""} style={{height:22,borderRadius:4,background:here?(inWin?rk.color:"#c0504d"):inWin?rk.color+"26":"#f4f4f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>{here?"●":""}</div>;})];})}
    </div>
    <Lbl>6.1 Protected blocks · 6.3 definitions of done</Lbl>
    {t3.map((c,ri)=>{const rk=RANKS[ri];const ce=c.calendar_event||{};const iss=commitmentIssues(c,anchor);const dd=ce.scheduled_date?dayDiff(anchor,ce.scheduled_date):null;return(
      <div key={c.rank} style={{border:"1px solid #e2e8f0",borderLeft:`4px solid ${rk.color}`,borderRadius:10,padding:10,marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:"#2d3748"}}>#{c.rank} {c.title}</div>
        <div style={{fontSize:11,color:"#718096",lineHeight:1.5,marginTop:2}}><strong>Done when:</strong> {c.definition_of_done}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8,alignItems:"center"}}>
          <input type="date" value={ce.scheduled_date||""} min={addDays(anchor,WINDOWS[ri][0])} max={addDays(anchor,WINDOWS[ri][1])} disabled={completed} onChange={e=>upd(c.rank,{scheduled_date:e.target.value})} style={cpInp}/>
          <input type="time" value={ce.start_time||""} disabled={completed} onChange={e=>upd(c.rank,{start_time:e.target.value})} style={cpInp}/>
          <span style={{color:"#a0aec0"}}>–</span>
          <input type="time" value={ce.end_time||""} disabled={completed} onChange={e=>upd(c.rank,{end_time:e.target.value})} style={cpInp}/>
          {!iss.length&&<a href={gcalLink(c,s)} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#3b6ea5"}}>+ Google Calendar</a>}
        </div>
        <div style={{fontSize:11,marginTop:6,color:iss.length?"#c0504d":"#4a7c59"}}>{iss.length?iss.join(" · "):`✓ ${ce.allocated_duration_minutes||toMin(ce.end_time)-toMin(ce.start_time)} min · day ${dd} of window ${WINDOWS[ri][0]}–${WINDOWS[ri][1]}`}</div>
      </div>);})}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
      <Btn ghost color="#3b6ea5" disabled={!allOk} onClick={()=>download("career-commitments.ics",buildICS(s),"text/calendar")}>⬇ Download .ics</Btn>
      <Btn ghost color="#718096" disabled={!allOk} onClick={copy}>{copied?"Copied ✓":"Copy event JSON"}</Btn>
      {!completed&&<Btn color="#b5546b" disabled={!allOk} onClick={onLock}>🔒 Lock commitments</Btn>}
    </div>
    {completed&&<div style={{marginTop:10,fontSize:13,color:"#4a7c59",background:"#f0f7f2",borderRadius:10,padding:"10px 12px"}}>🔒 Commitments locked · session <strong>COMPLETED</strong></div>}
  </>);}

function CareerBoard({s,g,curP,completed,open,setOpen,onPatch,onLock,onExport,onReset,resetArm}){
  const cp=s.career_positioning||{};const passed=CP_PHASES.filter(ph=>completed||ph.n<curP).length;
  const views=[<EnvelopeView s={s}/>,<InventoryView s={s}/>,<RolesView s={s}/>,<PositionView s={s}/>,<LeversView s={s}/>,<CalendarView s={s} onPatch={onPatch} onLock={onLock} completed={completed}/>];
  return(
    <div style={{padding:"14px 14px 40px",maxWidth:760,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,letterSpacing:2,color:"#a0aec0",textTransform:"uppercase"}}>Pathway board</div>
          <div style={{fontSize:13,color:"#2d3748",marginTop:2}}>{passed}/6 gates passed{cp.primary_target_role?<> · <span style={{color:"#b8952f"}}>★ {cp.primary_target_role}</span></>:null}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn ghost color="#718096" onClick={onExport} style={{padding:"5px 10px",fontSize:12}}>Export JSON</Btn>
          <Btn ghost color={resetArm?"#c0504d":"#718096"} onClick={onReset} style={{padding:"5px 10px",fontSize:12}}>{resetArm?"Tap again to reset":"New session"}</Btn>
        </div>
      </div>
      <div style={{height:6,background:"#edf2f7",borderRadius:3,marginBottom:14,overflow:"hidden",display:"flex"}}>{CP_PHASES.map(ph=><div key={ph.n} style={{flex:1,background:completed||ph.n<curP?ph.color:"transparent",borderRight:"2px solid #f8f7f4"}}/>)}</div>
      {CP_PHASES.map((ph,i)=>{const status=completed||ph.n<curP?"done":ph.n===curP?"active":"locked";const isOpen=open[ph.n]??status!=="locked";
        return <CpSection key={ph.n} ph={ph} status={status} gate={g[ph.n]} open={isOpen} onToggle={()=>setOpen(o=>({...o,[ph.n]:!isOpen}))}>{views[i]}</CpSection>;})}
    </div>);}

// ── in-chat widgets ──
function ValuePicker({initial,onSubmit}){
  const [sel,setSel]=useState(arr(initial));const n=sel.length;
  const toggle=v=>setSel(x=>x.includes(v)?x.filter(y=>y!==v):x.length>=6?x:[...x,v]);
  return(
    <Widget title="1.1 · Choose 4–6 non-negotiable values" color="#4a7c59">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
        {VALUE_CLUSTERS.map(c=>(
          <div key={c.name} style={{border:`1px solid ${c.color}33`,background:c.color+"0b",borderRadius:10,padding:10}}>
            <div style={{fontSize:12,fontWeight:600,color:c.color,marginBottom:6}}>{c.name}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{c.values.map(v=>{const on=sel.includes(v);return(
              <button key={v} onClick={()=>toggle(v)} style={{fontSize:12,padding:"4px 9px",borderRadius:999,border:`1px solid ${on?c.color:"#e2e8f0"}`,background:on?c.color:"#fff",color:on?"#fff":"#4a5568",cursor:"pointer",fontFamily:"Georgia,serif",opacity:!on&&n>=6?0.4:1}}>{on?"✓ ":""}{v}</button>);})}</div>
          </div>))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,gap:10,flexWrap:"wrap"}}>
        <div><Meter n={n} need={4} max={6} color="#4a7c59"/><div style={{fontSize:11,color:"#718096",marginTop:3}}>{n<4?`Pick ${4-n} more`:n===6?"Maximum reached — deselect to swap":"Locked range met (up to 6)"}</div></div>
        <Btn color="#4a7c59" disabled={n<4||n>6} onClick={()=>onSubmit(sel)}>Lock values →</Btn>
      </div>
    </Widget>);}

function ConstraintForm({initial,onSubmit}){
  const hc=initial||{};const wc=hc.workplace_conditions||{};
  const [f,setF]=useState({salary:hc.base_salary_floor||"",currency:hc.currency||"AUD",type:hc.employment_type||"",loc:hc.location_model||"",commute:hc.max_commute_minutes||"",days:hc.max_office_days_per_week||"",pace:wc.pace||"",novelty:wc.novelty_level||"",nn:arr(wc.cultural_non_negotiables).join(", ")});
  const set=k=>v=>setF(x=>({...x,[k]:v}));
  const sal=Number(String(f.salary).replace(/[^\d.]/g,""));
  const ok=sal>0&&f.type&&f.loc&&(f.loc!=="ONSITE"||Number(f.commute)>0)&&(f.loc!=="HYBRID"||(Number(f.days)>=1&&Number(f.days)<=5))&&f.pace;
  const row=(label,ctl,hint)=><div style={{marginBottom:10}}><div style={{fontSize:12,fontWeight:600,color:"#2d3748",marginBottom:4}}>{label}</div>{ctl}{hint&&<div style={{fontSize:11,color:"#a0aec0",marginTop:3}}>{hint}</div>}</div>;
  const submit=()=>{
    const nn=f.nn.split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
    const out={base_salary_floor:sal,currency:f.currency,employment_type:f.type,location_model:f.loc,max_commute_minutes:f.loc!=="REMOTE"&&Number(f.commute)>0?Number(f.commute):null,max_office_days_per_week:f.loc==="HYBRID"?Number(f.days):null,workplace_conditions:{pace:f.pace,novelty_level:f.novelty,cultural_non_negotiables:nn}};
    const txt=`My hard constraints: base salary floor ${fmtMoney(sal,f.currency)} ${f.currency}; ${EMP_TYPES.find(([k])=>k===f.type)[1]}; ${pretty(f.loc)}${f.loc==="HYBRID"?` (max ${f.days} office days/week)`:""}${out.max_commute_minutes?`, max commute ${out.max_commute_minutes} min`:""}; ${pretty(f.pace)} pace${f.novelty?`, ${pretty(f.novelty).toLowerCase()} novelty`:""}${nn.length?`; non-negotiables: ${nn.join(", ")}`:""}.`;
    onSubmit(out,txt);};
  return(
    <Widget title="1.4 · Hard employment constraints" color="#4a7c59">
      {row("Base salary floor",<div style={{display:"flex",gap:6}}><select value={f.currency} onChange={e=>set("currency")(e.target.value)} style={cpInp}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select><input inputMode="numeric" placeholder="e.g. 135000" value={f.salary} onChange={e=>set("salary")(e.target.value)} style={{...cpInp,flex:1,minWidth:0}}/></div>,"The absolute baseline you'd accept. An exact figure — “competitive” isn't accepted.")}
      {row("Contract type",<Pills opts={EMP_TYPES} val={f.type} onChange={set("type")} color="#4a7c59"/>)}
      {row("Workplace model",<Pills opts={LOC_MODELS} val={f.loc} onChange={set("loc")} color="#4a7c59"/>)}
      {f.loc==="HYBRID"&&row("Max in-office days per week",<Pills opts={[1,2,3,4,5].map(d=>[d,String(d)])} val={Number(f.days)} onChange={set("days")} color="#4a7c59"/>)}
      {(f.loc==="ONSITE"||f.loc==="HYBRID")&&row(`Max commute (minutes, one way)${f.loc==="ONSITE"?"":" — optional"}`,<input inputMode="numeric" value={f.commute} onChange={e=>set("commute")(e.target.value.replace(/\D/g,""))} style={{...cpInp,width:110}}/>)}
      {row("Pace",<Pills opts={PACES} val={f.pace} onChange={set("pace")} color="#4a7c59"/>)}
      {row("Novelty level",<Pills opts={NOVELTY} val={f.novelty} onChange={set("novelty")} color="#4a7c59"/>)}
      {row("Cultural non-negotiables",<textarea rows={2} value={f.nn} onChange={e=>set("nn")(e.target.value)} placeholder="e.g. no on-call, flat hierarchy, inclusive leadership" style={{...cpInp,width:"100%",boxSizing:"border-box",resize:"vertical"}}/>,"Comma-separated.")}
      <div style={{display:"flex",justifyContent:"flex-end"}}><Btn color="#4a7c59" disabled={!ok} onClick={submit}>Lock constraints →</Btn></div>
    </Widget>);}

function RolePicker({roles,onSubmit}){
  const [primary,setPrimary]=useState("");const [backs,setBacks]=useState([]);
  const sorted=[...roles].sort((a,b)=>(b.boundary_fit_score||0)-(a.boundary_fit_score||0));
  const pick=t=>{setPrimary(t);setBacks(b=>b.filter(x=>x!==t));};
  const back=t=>setBacks(b=>b.includes(t)?b.filter(x=>x!==t):b.length>=2?b:[...b,t]);
  return(
    <Widget title="4.1 · Choose 1 primary + up to 2 backups" color="#b8952f">
      {sorted.map(r=>{const f=Number(r.boundary_fit_score)||0;const isP=primary===r.job_title,isB=backs.includes(r.job_title);return(
        <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderTop:"1px solid #edf2f7"}}>
          <div style={{width:38,fontSize:13,fontWeight:700,color:fitColor(f),flexShrink:0}}>{Math.round(f*100)}%</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:"#2d3748"}}>{r.job_title}</div><div style={{fontSize:10,color:"#a0aec0"}}>{pretty(r.motion_type)} · {pretty(r.organizational_setting)}{arr(r.boundary_flags).length?` · ⚠ ${arr(r.boundary_flags).length}`:""}</div></div>
          <button onClick={()=>pick(r.job_title)} style={{fontSize:11,padding:"4px 8px",borderRadius:999,border:`1px solid ${isP?"#b8952f":"#e2e8f0"}`,background:isP?"#b8952f":"#fff",color:isP?"#fff":"#718096",cursor:"pointer",fontFamily:"Georgia,serif"}}>★ Primary</button>
          <button onClick={()=>back(r.job_title)} disabled={isP} style={{fontSize:11,padding:"4px 8px",borderRadius:999,border:`1px solid ${isB?"#718096":"#e2e8f0"}`,background:isB?"#718096":"#fff",color:isB?"#fff":"#718096",cursor:isP?"default":"pointer",opacity:isP||(!isB&&backs.length>=2)?0.4:1,fontFamily:"Georgia,serif"}}>Backup</button>
        </div>);})}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn color="#b8952f" disabled={!primary} onClick={()=>onSubmit(primary,backs)}>Set my target →</Btn></div>
    </Widget>);}

function TaskPicker({tasks,onSubmit}){
  const [sel,setSel]=useState([]);
  const toggle=id=>setSel(x=>x.includes(id)?x.filter(y=>y!==id):x.length>=3?x:[...x,id]);
  return(
    <Widget title="5.3 · Rule of 3 — pick exactly three" color="#c97d4e">
      {tasks.map(t=>{const at=actionT(t.action_type);const on=sel.includes(t.task_id);return(
        <button key={t.task_id} onClick={()=>toggle(t.task_id)} style={{display:"flex",gap:8,alignItems:"flex-start",width:"100%",textAlign:"left",padding:"8px 10px",marginBottom:5,borderRadius:9,border:`1px solid ${on?at.c:"#e2e8f0"}`,background:on?at.c+"12":"#fff",cursor:"pointer",fontFamily:"Georgia,serif",opacity:!on&&sel.length>=3?0.45:1}}>
          <span style={{width:18,height:18,borderRadius:5,border:`2px solid ${on?at.c:"#cbd5e0"}`,background:on?at.c:"transparent",color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{on?sel.indexOf(t.task_id)+1:""}</span>
          <span><span style={{fontSize:10,color:at.c,display:"block"}}>{at.icon} {t.task_id} · {at.name}</span><span style={{fontSize:13,color:"#2d3748"}}>{t.description}</span></span>
        </button>);})}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
        <Meter n={sel.length} need={3} color="#c97d4e"/>
        <Btn color="#c97d4e" disabled={sel.length!==3} onClick={()=>onSubmit(sel.map(id=>tasks.find(t=>t.task_id===id)))}>Commit to these 3 →</Btn>
      </div>
    </Widget>);}

function CareerCoach({onBack,onCrisis}){
  const wide=useWide(980);
  const [s,setS]=useState(null);const [msgs,setMsgs]=useState([]);const [input,setInput]=useState("");const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("chat");const [blocked,setBlocked]=useState(null);const [open,setOpen]=useState({});const [resetArm,setResetArm]=useState(false);const [boardPing,setBoardPing]=useState(false);
  const sRef=useRef(null);const msgsRef=useRef([]);
  const commit=st=>{sRef.current=st;setS(st);};
  const setM=m=>{msgsRef.current=m;setMsgs(m);};
  const fresh=()=>{commit(emptyCareer());setM([{role:"assistant",text:CP_OPENER,ts:now()}]);setBlocked(null);setOpen({});};

  useEffect(()=>{
    let done=false;
    (async()=>{
      let saved=null;try{const r=await window.storage.get(CAREER_KEY);if(r?.value)saved=JSON.parse(r.value);}catch{}
      if(done)return;
      if(saved?.state){commit(saved.state);setM(saved.msgs||[]);}else fresh();
    })();
    return()=>{done=true;};
  },[]);
  useEffect(()=>{if(!s)return;try{const p=window.storage.set(CAREER_KEY,JSON.stringify({state:s,msgs:msgs.slice(-80)}));p?.catch?.(()=>{});}catch{}},[s,msgs]);

  const toApi=list=>{let h=list.filter(m=>m.text).map(m=>({role:m.role,content:m.text})).slice(-30);if(h[0]?.role!=="user")h=[{role:"user",content:"Please begin the session."},...h];return h;};

  const send=async(text,patch)=>{
    if(detectCrisis(text))onCrisis();
    if(patch)commit(applyCareerPatch(sRef.current,patch).state);
    const next=[...msgsRef.current,{role:"user",text,ts:now(),color:"#3b6ea5"}];setM(next);setLoading(true);setBlocked(null);
    try{
      const raw=await api(toApi(next),careerSystem(sRef.current),2,1500,3000);
      const {text:reply,patch:mp}=splitState(raw);
      const res=applyCareerPatch(sRef.current,mp);commit(res.state);setBlocked(res.blocked);if(mp&&!wide)setBoardPing(true);
      setM([...next,{role:"assistant",text:reply||"(no reply)",ts:now()}]);
    }catch{setM([...next,{role:"assistant",text:"Something went wrong. Please try again.",ts:now()}]);}
    setLoading(false);
  };
  const patchOnly=patch=>commit(applyCareerPatch(sRef.current,patch).state);

  if(!s)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Georgia,serif",color:"#a0aec0",fontSize:14}}>Loading…</div>;

  const g=careerGates(s);const maxP=allowedPhase(g);const [wp,ws]=parseSub(s.current_sub_routine);
  const curP=Math.min(wp,maxP);const curSub=Math.min(wp>maxP?1:ws,CP_PHASES[curP-1].subs.length);const completed=s.phase_status==="COMPLETED";
  const ph=CP_PHASES[curP-1];
  const be=s.boundary_envelope||{};const cp=s.career_positioning||{};const ep=s.execution_pipeline||{};const roles=arr(s.candidate_roles);
  const kept=arr(ep.brainstormed_tasks).filter(t=>t.status!=="REJECTED");
  const onLock=()=>send("I've reviewed the calendar blocks — lock in my three commitments.",{phase_status:"COMPLETED"});
  const onExport=()=>download(`career-session-${s.session_id.slice(0,8)}.json`,JSON.stringify(s,null,2),"application/json");
  const onReset=()=>{if(!resetArm){setResetArm(true);setTimeout(()=>setResetArm(false),3000);return;}setResetArm(false);fresh();};
  const pickPhase=n=>{setOpen(o=>({...o,[n]:true}));if(!wide)setTab("board");setTimeout(()=>document.getElementById(`cp-phase-${n}`)?.scrollIntoView({behavior:"smooth",block:"start"}),60);};

  let widget=null;
  if(!loading&&!completed){
    if(curP===1&&curSub===1&&g[1].some(x=>x.startsWith("Core values")))
      widget=<ValuePicker initial={be.core_values} onSubmit={v=>send(`My core values are: ${v.join(", ")}.`,{boundary_envelope:{core_values:v}})}/>;
    else if(curP===1&&curSub===4&&hcIssues(be.hard_constraints).length)
      widget=<ConstraintForm initial={be.hard_constraints} onSubmit={(hc,txt)=>send(txt,{boundary_envelope:{hard_constraints:hc}})}/>;
    else if(curP===4&&roles.length&&!cp.primary_target_role)
      widget=<RolePicker roles={roles} onSubmit={(p,b)=>send(`My primary target role is ${p}.${b.length?` Backups: ${b.join(", ")}.`:" No backups."}`,{career_positioning:{primary_target_role:p,alternative_pivot_roles:b}})}/>;
    else if(curP===4&&cp.primary_target_role&&cp.unique_value_proposition&&arr(cp.gap_analysis).length&&!cp.confirmed)
      widget=<Widget title="4.3 · Confirm your positioning" color="#b8952f">
        <div style={{fontSize:13,color:"#718096",lineHeight:1.6,marginBottom:10}}>Review your target, pitch and gap bridges on the Pathway Board. Confirming closes Phase 4.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn color="#b8952f" onClick={()=>send("I confirm this positioning.",{career_positioning:{confirmed:true}})}>✓ Confirm positioning</Btn>{!wide&&<Btn ghost color="#b8952f" onClick={()=>pickPhase(4)}>View board</Btn>}<Btn ghost color="#718096" onClick={()=>setInput("I'd like to change: ")}>Suggest changes</Btn></div>
      </Widget>;
    else if(curP===5&&kept.length>=3&&arr(ep.brainstormed_tasks).length>=6&&arr(ep.top_3_commitments).length!==3)
      widget=<TaskPicker tasks={kept} onSubmit={ts=>send(`My three critical-path actions: ${ts.map(t=>`${t.task_id} (${t.description})`).join("; ")}. Please rank them Foundation → Proof → Market Contact and write strict Definitions of Done.`)}/>;
    else if(curP===6&&!g[6].length)
      widget=<Widget title="6 · Lock your commitments" color="#b5546b">
        {[...arr(ep.top_3_commitments)].sort((a,b)=>a.rank-b.rank).map((c,i)=><div key={c.rank} style={{fontSize:13,color:"#2d3748",padding:"4px 0"}}><span style={{color:RANKS[i].color,fontWeight:700}}>#{c.rank}</span> {c.title} <span style={{color:"#718096"}}>· {new Date(c.calendar_event.scheduled_date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})} {c.calendar_event.start_time}–{c.calendar_event.end_time}</span></div>)}
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}><Btn color="#b5546b" onClick={onLock}>🔒 Lock commitments</Btn><Btn ghost color="#3b6ea5" onClick={()=>download("career-commitments.ics",buildICS(s),"text/calendar")}>⬇ .ics</Btn></div>
      </Widget>;
  }
  const chatExtras=<>
    {blocked&&blocked.items.length>0&&<div style={{background:"#fff8f0",border:"1px solid #f3d9c4",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#8a5a3c",lineHeight:1.6}}><strong>Exit gate holding Phase {blocked.phase}</strong> — {blocked.items.join(" · ")}</div>}
    {widget}
    {completed&&!loading&&<Widget title="Session complete" color="#4a7c59"><div style={{fontSize:13,color:"#2d3748",lineHeight:1.6,marginBottom:10}}>🎉 Three commitments locked toward <strong>{cp.primary_target_role}</strong>.</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn color="#3b6ea5" onClick={()=>download("career-commitments.ics",buildICS(s),"text/calendar")}>⬇ Calendar (.ics)</Btn><Btn ghost color="#718096" onClick={onExport}>Export session JSON</Btn></div></Widget>}
  </>;

  const hdr=<Hdr icon="🧗" name="Career Pathway Coach" sub={completed?"Completed · commitments locked":`Phase ${curP}.${curSub} — ${ph.subs[curSub-1]}`} onBack={onBack} onCrisis={onCrisis}/>;
  const board=<CareerBoard s={s} g={g} curP={curP} completed={completed} open={open} setOpen={setOpen} onPatch={patchOnly} onLock={onLock} onExport={onExport} onReset={onReset} resetArm={resetArm}/>;
  const chat=st=><Chat messages={msgs} input={input} setInput={setInput} onSend={t=>send(t)} loading={loading} onCrisis={onCrisis} style={st}>{chatExtras}</Chat>;
  const tabBtn=(k,l)=><button onClick={()=>{setTab(k);if(k==="board")setBoardPing(false);}} style={{flex:1,padding:"9px 0",background:"none",border:"none",borderBottom:`2px solid ${tab===k?ph.color:"transparent"}`,color:tab===k?"#2d3748":"#a0aec0",fontSize:13,fontWeight:tab===k?600:400,cursor:"pointer",fontFamily:"Georgia,serif",position:"relative"}}>{l}{k==="board"&&boardPing&&tab!=="board"&&<span style={{display:"inline-block",width:7,height:7,borderRadius:999,background:"#c97d4e",marginLeft:6,verticalAlign:"middle"}}/>}</button>;

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"Georgia,serif",background:"#f8f7f4"}}>
      {hdr}
      <PhaseRail curP={curP} curSub={curSub} completed={completed} onPick={pickPhase}/>
      {wide?(
        <div style={{flex:1,minHeight:0,display:"grid",gridTemplateColumns:"minmax(380px,1fr) minmax(440px,1.15fr)"}}>
          {chat({height:"100%",maxWidth:"none",margin:0,minHeight:0,borderRight:"1px solid #e2e8f0",background:"#fbfaf7"})}
          <div style={{overflowY:"auto",minHeight:0}}>{board}</div>
        </div>
      ):(<>
        <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #e2e8f0"}}>{tabBtn("chat","💬 Coach")}{tabBtn("board","🗺 Pathway board")}</div>
        {tab==="chat"?chat({flex:1,height:"auto",minHeight:0,maxWidth:"none",margin:0,width:"100%"}):<div style={{flex:1,overflowY:"auto",minHeight:0}}>{board}</div>}
      </>)}
    </div>);
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
      {screen==="career"&&<CareerCoach {...cp}/>}

    </>
  );
}
