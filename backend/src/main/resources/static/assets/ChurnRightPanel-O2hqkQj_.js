import{r as o,j as e}from"./index-BB_3LKiY.js";import{M as X,r as Z,T as U,g as ee,a as te}from"./index-NjT4_Tk6.js";import{M as ne,G as ae,a as ie,u as oe,L as re}from"./Marker--CfJXtT2.js";function fe(){const[c,p]=o.useState([]),[A,N]=o.useState("이탈거래처"),[M,h]=o.useState("prevAmount"),[f,E]=o.useState({open:!1,x:0,y:0,row:null}),g=o.useRef(null),[m,x]=o.useState("customer"),[S,C]=o.useState(!1),[T,z]=o.useState(null),[W,D]=o.useState(""),[a,l]=o.useState(""),[s,d]=o.useState([]),[u,v]=o.useState(null),[L,w]=o.useState([]),[j,$]=o.useState(null),[V,_]=o.useState([]),[G,H]=o.useState(null);o.useEffect(()=>{const t=r=>{var k;const n=(k=r==null?void 0:r.detail)==null?void 0:k.tab;n==="sales-status"?x("ai"):n==="compare"?x("customer"):n==="activity-ag"?(d([]),v(null),w([]),$(null),x("activity-map")):n==="arrears"&&(_([]),H(null),p([]),d([]),v(null),w([]),$(null),x("customer"))};return window.addEventListener("tnt.sales.dashboard.tabChange",t),()=>{window.removeEventListener("tnt.sales.dashboard.tabChange",t)}},[]),o.useEffect(()=>{const t=i=>{var y;const b=Array.isArray((y=i==null?void 0:i.detail)==null?void 0:y.items)?i.detail.items:[];p(b),N("이탈거래처"),h("prevAmount"),x("customer")},r=i=>{var y;const b=Array.isArray((y=i==null?void 0:i.detail)==null?void 0:y.items)?i.detail.items:[];p(b),N("신규 거래처"),h("curAmount"),x("customer")},n=i=>{var B,R;const b=Array.isArray((B=i==null?void 0:i.detail)==null?void 0:B.customers)?i.detail.customers:[],y=(R=i==null?void 0:i.detail)==null?void 0:R.cellInfo;d(b),v(y),x("arrears")},k=i=>{var R,F,J;const b=Array.isArray((R=i==null?void 0:i.detail)==null?void 0:R.customers)?i.detail.customers:[],y=((F=i==null?void 0:i.detail)==null?void 0:F.name)||"",B=((J=i==null?void 0:i.detail)==null?void 0:J.totalValue)||0;w(b),$({name:y,totalValue:B}),x("aging")},O=i=>{var B,R;const b=Array.isArray((B=i==null?void 0:i.detail)==null?void 0:B.regionData)?i.detail.regionData:[],y=(R=i==null?void 0:i.detail)==null?void 0:R.mapInfo;_(b),H(y),x("activity-map")};return window.addEventListener("tnt.sales.dashboard.churn",t),window.addEventListener("tnt.sales.dashboard.newcustomers",r),window.addEventListener("tnt.sales.dashboard.arrearsCell",n),window.addEventListener("tnt.sales.dashboard.agingBar",k),window.addEventListener("tnt.sales.dashboard.activityRegion",O),()=>{window.removeEventListener("tnt.sales.dashboard.churn",t),window.removeEventListener("tnt.sales.dashboard.newcustomers",r),window.removeEventListener("tnt.sales.dashboard.arrearsCell",n),window.removeEventListener("tnt.sales.dashboard.agingBar",k),window.removeEventListener("tnt.sales.dashboard.activityRegion",O)}},[]),o.useEffect(()=>{const t=n=>{f.open&&g.current&&!g.current.contains(n.target)&&E({open:!1,x:0,y:0,row:null})},r=n=>{n.key==="Escape"&&E({open:!1,x:0,y:0,row:null})};return document.addEventListener("click",t,!0),document.addEventListener("contextmenu",t,!0),document.addEventListener("keydown",r,!0),()=>{document.removeEventListener("click",t,!0),document.removeEventListener("contextmenu",t,!0),document.removeEventListener("keydown",r,!0)}},[f.open]);const I=t=>new Intl.NumberFormat("ko-KR").format(Math.round(t||0)),K=t=>new Intl.NumberFormat("ko-KR",{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round((t||0)/1e6)),q=async()=>{if(!a.trim()){z("질문을 입력해주세요.");return}C(!0),z(null),D("");try{const t=await fetch("/api/v1/sales-analysis-ai/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:a.trim(),assigneeId:te(),empName:ee()})});if(!t.ok)throw new Error(`HTTP ${t.status}`);const r=await t.json();r.error?z(r.error):r.analysis?D(r.analysis):z("분석 결과를 받지 못했습니다.")}catch(t){z(t.message||"분석 중 오류가 발생했습니다.")}finally{C(!1)}},Y=t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),q())},Q=t=>{l(t)};return e.jsxs("div",{ref:g,className:"card",style:{padding:0,height:"100%",overflow:"hidden",position:"relative",display:"flex",flexDirection:"column"},children:[e.jsx("style",{children:`
        @keyframes ai-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ai-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ai-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.6); }
        }
        @keyframes ai-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ai-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes ai-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .ai-panel-container {
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1f 100%);
          position: relative;
          overflow: hidden;
        }
        .ai-panel-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 30%);
          pointer-events: none;
        }
        .ai-input-container {
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 12px;
          padding: 2px;
          transition: all 0.3s ease;
        }
        .ai-input-container:focus-within {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
        }
        .ai-textarea {
          background: transparent !important;
          border: none !important;
          color: #e2e8f0 !important;
          resize: none;
          outline: none;
        }
        .ai-textarea::placeholder {
          color: rgba(148, 163, 184, 0.6);
        }
        .ai-send-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          background-size: 200% 200%;
          animation: ai-gradient 3s ease infinite;
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ai-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        }
        .ai-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          animation: none;
          background: #4b5563;
        }
        .ai-chip {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 20px;
          color: #a5b4fc;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ai-chip:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-1px);
        }
        .ai-response-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }
        .ai-panel-markdown {
          color: #e2e8f0 !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .ai-panel-markdown * {
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
          max-width: 100% !important;
        }
        .ai-panel-markdown h1, .ai-panel-markdown h2, .ai-panel-markdown h3 {
          color: #a5b4fc !important;
          font-size: 13px;
          margin: 14px 0 8px 0;
          font-weight: 600;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          padding-bottom: 4px;
          white-space: normal !important;
          word-break: break-all !important;
        }
        .ai-panel-markdown p {
          margin: 8px 0;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
          color: #cbd5e1;
          max-width: 100% !important;
        }
        .ai-panel-markdown ul, .ai-panel-markdown ol {
          padding-left: 18px;
          margin: 8px 0;
          max-width: 100% !important;
        }
        .ai-panel-markdown li {
          margin: 4px 0;
          color: #cbd5e1;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          white-space: normal !important;
        }
        .ai-panel-markdown li::marker {
          color: #6366f1;
        }
        .ai-panel-markdown strong {
          color: #f1f5f9;
          font-weight: 600;
        }
        .ai-panel-markdown table {
          font-size: 10px;
          border-collapse: collapse;
          width: 100% !important;
          max-width: 100% !important;
          margin: 10px 0;
          table-layout: fixed !important;
          display: table !important;
          overflow-x: hidden !important;
        }
        .ai-panel-markdown th, .ai-panel-markdown td {
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 6px 8px;
          text-align: left;
          white-space: normal !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          overflow: hidden !important;
          text-overflow: ellipsis;
        }
        .ai-panel-markdown th {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          font-weight: 600;
        }
        .ai-panel-markdown td {
          background: rgba(255, 255, 255, 0.02);
        }
        .ai-panel-markdown tr:hover td {
          background: rgba(99, 102, 241, 0.08);
        }
        .ai-panel-markdown pre {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          color: #a5b4fc;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
          overflow-x: hidden !important;
          max-width: 100% !important;
        }
        .ai-panel-markdown code {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 10px;
          color: #a5b4fc;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          overflow-wrap: anywhere !important;
        }
        .ai-loading-dot {
          width: 8px;
          height: 8px;
          background: #6366f1;
          border-radius: 50%;
          display: inline-block;
          animation: ai-bounce 1.4s infinite ease-in-out both;
        }
        .ai-loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .ai-loading-dot:nth-child(2) { animation-delay: -0.16s; }
        .ai-loading-dot:nth-child(3) { animation-delay: 0; }
        .ai-sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #a5b4fc;
          border-radius: 50%;
          animation: ai-pulse 2s ease-in-out infinite;
        }
      `}),e.jsx("div",{style:{padding:"12px 14px",borderBottom:m==="ai"?"1px solid rgba(99, 102, 241, 0.3)":"1px solid var(--border)",background:m==="ai"?"linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)":"var(--background)",display:"flex",alignItems:"center",gap:10,position:"relative",overflow:"hidden"},children:m==="ai"?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"ai-sparkle",style:{top:"20%",left:"10%",animationDelay:"0s"}}),e.jsx("div",{className:"ai-sparkle",style:{top:"60%",left:"85%",animationDelay:"0.5s"}}),e.jsx("div",{className:"ai-sparkle",style:{top:"80%",left:"30%",animationDelay:"1s"}}),e.jsx("div",{style:{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(99, 102, 241, 0.5)",position:"relative",zIndex:1},children:e.jsx("span",{style:{fontSize:16},children:"🤖"})}),e.jsxs("div",{style:{position:"relative",zIndex:1},children:[e.jsx("div",{style:{fontWeight:700,color:"#e2e8f0",fontSize:13,letterSpacing:"0.5px"},children:"Sales AI Agent"}),e.jsxs("div",{style:{fontSize:9,color:"#a5b4fc",marginTop:2,display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{width:6,height:6,background:"#22c55e",borderRadius:"50%",boxShadow:"0 0 6px #22c55e"}}),"Powered by AI"]})]})]}):m==="arrears"?e.jsx("span",{style:{fontWeight:700,fontSize:13,color:"#dc2626"},children:"Risk Map 선택 영역"}):m==="aging"?e.jsx("span",{style:{fontWeight:700,fontSize:13,color:"#3b82f6"},children:"연령 분포 선택"}):m==="activity-map"?e.jsx("span",{style:{fontWeight:700,fontSize:13,color:"#2563eb"},children:"지역별 활동 현황"}):e.jsx("span",{style:{fontWeight:700,fontSize:13},children:A})}),e.jsx("div",{className:m==="ai"?"ai-panel-container":"",style:{flex:1,overflow:"auto",padding:12,background:void 0},children:m==="customer"?e.jsx(e.Fragment,{children:!c||c.length===0?e.jsx("div",{className:"empty-state",children:"데이터가 없습니다"}):e.jsx("div",{className:"table-container",style:{maxHeight:"calc(100% - 20px)"},children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"거래처명"}),e.jsx("th",{style:{width:100,textAlign:"right"},children:M==="prevAmount"?"작년매출":"올해매출"})]})}),e.jsx("tbody",{children:c.map((t,r)=>e.jsxs("tr",{onClick:()=>{try{const k={customerSeq:t.customerSeq,customerName:t.customerName};localStorage.setItem("tnt.sales.selectedCustomer",JSON.stringify(k)),window.dispatchEvent(new CustomEvent("tnt.sales.customer.selected",{detail:{source:"dashboard-churn",customer:k}}))}catch{}const n=document.querySelector('button[data-key="customer:sales-activity-new"]');n&&n.click()},onContextMenu:n=>{n.preventDefault(),E({open:!0,x:n.clientX,y:n.clientY,row:t})},style:{cursor:"pointer"},title:"클릭하면 영업활동 등록으로 이동",children:[e.jsx("td",{children:t.customerName||""}),e.jsx("td",{style:{textAlign:"right",fontSize:11},children:I(t[M])})]},r))})]})})}):m==="arrears"?e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",gap:8},children:[u&&e.jsxs("div",{style:{padding:"8px 12px",background:"#f1f5f9",borderRadius:6,fontSize:11,color:"#475569",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0},children:[e.jsxs("span",{children:["총 채권 ",e.jsx("span",{style:{fontWeight:700,color:"#0f172a"},children:K(s.reduce((t,r)=>t+r.totalAr,0))})," 백만, 연체율 ",u.yMin,"~",u.yMax,"%",e.jsxs("span",{style:{marginLeft:8,fontWeight:600,color:"#0f172a"},children:["(",s.length,"개)"]})]}),e.jsx("button",{onClick:()=>{d([]),v(null),x("customer")},style:{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#94a3b8",padding:"2px 6px"},children:"×"})]}),s.length===0?e.jsx("div",{className:"empty-state",children:"해당 영역에 거래처가 없습니다"}):e.jsx("div",{style:{flex:1,overflow:"auto",display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:6,alignContent:"start",padding:"2px"},children:s.map((t,r)=>{const n=t.original,k=((n==null?void 0:n.m1)||0)+((n==null?void 0:n.m2)||0)+((n==null?void 0:n.m3)||0),O=((n==null?void 0:n.m4)||0)+((n==null?void 0:n.m5)||0)+((n==null?void 0:n.m6)||0),i=((n==null?void 0:n.m7)||0)+((n==null?void 0:n.m8)||0)+((n==null?void 0:n.m9)||0)+((n==null?void 0:n.m10)||0)+((n==null?void 0:n.m11)||0)+((n==null?void 0:n.m12)||0),b=(n==null?void 0:n.over12)||0;return e.jsxs("div",{style:{background:"#fff",borderRadius:6,padding:8,border:"1px solid #e2e8f0",fontSize:10},children:[e.jsx("div",{style:{fontWeight:600,fontSize:11,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2},title:t.name,children:t.name}),e.jsxs("div",{style:{fontSize:9,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:4},children:[t.dept," / ",t.emp]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4},children:[e.jsx("span",{style:{color:"#64748b"},children:"총 미수"}),e.jsx("span",{style:{fontWeight:700,color:"#0f172a"},children:I(t.totalAr)})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:2,fontSize:9,background:"#f8fafc",borderRadius:4,padding:4},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"#3b82f6"},children:"1~3M"}),e.jsx("span",{children:I(k)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"#f59e0b"},children:"4~6M"}),e.jsx("span",{children:I(O)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"#ea580c"},children:"7~12M"}),e.jsx("span",{children:I(i)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"#dc2626"},children:"1Y+"}),e.jsx("span",{children:I(b)})]})]}),e.jsxs("div",{style:{marginTop:4,paddingTop:4,borderTop:"1px dashed #e2e8f0",display:"flex",justifyContent:"space-between",fontSize:9},children:[e.jsx("span",{style:{color:"#64748b"},children:"장기연체율"}),e.jsxs("span",{style:{fontWeight:600,color:t.ratio>50?"#dc2626":t.ratio>20?"#f59e0b":"#3b82f6"},children:[t.ratio,"%"]})]})]},r)})})]}):m==="aging"?e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",gap:8},children:[j&&e.jsxs("div",{style:{padding:"8px 12px",background:"#eff6ff",borderRadius:6,fontSize:11,color:"#1e40af",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0},children:[e.jsxs("span",{children:[e.jsx("span",{style:{fontWeight:700},children:j.name})," 연체 금액",e.jsx("span",{style:{fontWeight:700,marginLeft:8},children:K(j.totalValue)})," 백만",e.jsxs("span",{style:{marginLeft:8,fontWeight:600,color:"#1e40af"},children:["(",L.length,"개)"]})]}),e.jsx("button",{onClick:()=>{w([]),$(null),x("customer")},style:{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#94a3b8",padding:"2px 6px"},children:"×"})]}),L.length===0?e.jsx("div",{className:"empty-state",children:"해당 연령대에 거래처가 없습니다"}):e.jsx("div",{style:{flex:1,overflow:"auto",display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:6,alignContent:"start",padding:"2px"},children:L.map((t,r)=>e.jsxs("div",{style:{background:"#fff",borderRadius:6,padding:8,border:"1px solid #e2e8f0",fontSize:10},children:[e.jsx("div",{style:{fontWeight:600,fontSize:11,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2},title:t.name,children:t.name}),e.jsxs("div",{style:{fontSize:9,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:4},children:[t.dept," / ",t.emp]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"4px 6px",background:"#eff6ff",borderRadius:4},children:[e.jsx("span",{style:{color:"#1e40af",fontWeight:500},children:j==null?void 0:j.name}),e.jsx("span",{style:{fontWeight:700,color:"#1e40af"},children:I(t.agingValue)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("span",{style:{color:"#64748b"},children:"총 미수"}),e.jsx("span",{style:{fontWeight:600,color:"#0f172a"},children:I(t.totalAr)})]})]},r))})]}):m==="activity-map"?e.jsx(pe,{regionData:V,mapInfo:G}):e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100%",gap:10,position:"relative",zIndex:1},children:[e.jsx("div",{className:"ai-input-container",children:e.jsxs("div",{style:{display:"flex",gap:8,padding:6},children:[e.jsx("textarea",{className:"ai-textarea",value:a,onChange:t=>l(t.target.value),onKeyPress:Y,placeholder:"매출 데이터에 대해 무엇이든 물어보세요...",disabled:S,style:{flex:1,padding:"10px 12px",fontSize:12,height:52,fontFamily:"inherit",lineHeight:1.5,boxSizing:"border-box"}}),e.jsx("button",{className:"ai-send-btn",onClick:q,disabled:S||!a.trim(),style:{padding:"0 16px",fontSize:18,fontWeight:600,minWidth:50},children:S?e.jsx("div",{style:{width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid white",borderRadius:"50%",animation:"ai-spin 1s linear infinite"}}):"→"})]})}),e.jsx("div",{style:{display:"flex",gap:6,flexWrap:"wrap"},children:[{label:"📅 이번달 매출",q:"이번 달 매출 현황을 알려줘"},{label:"📦 품목별 분석",q:"품목별 매출을 분석해줘"},{label:"🏆 Top 10 고객",q:"고객별 매출 Top 10을 보여줘"}].map((t,r)=>e.jsx("button",{className:"ai-chip",onClick:()=>Q(t.q),disabled:S,style:{padding:"5px 12px",fontSize:10,fontWeight:500},children:t.label},r))}),e.jsxs("div",{style:{flex:1,overflow:"auto",minHeight:0},children:[S&&e.jsxs("div",{style:{textAlign:"center",padding:30,display:"flex",flexDirection:"column",alignItems:"center",gap:16},children:[e.jsxs("div",{style:{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"},children:[e.jsx("div",{style:{position:"absolute",width:"100%",height:"100%",border:"2px solid transparent",borderTop:"2px solid #6366f1",borderRadius:"50%",animation:"ai-spin 1s linear infinite"}}),e.jsx("span",{style:{fontSize:24},children:"🤖"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:"#e2e8f0",fontSize:12,fontWeight:500,marginBottom:8},children:"AI가 데이터를 분석하고 있습니다"}),e.jsxs("div",{style:{display:"flex",gap:6,justifyContent:"center"},children:[e.jsx("span",{className:"ai-loading-dot"}),e.jsx("span",{className:"ai-loading-dot"}),e.jsx("span",{className:"ai-loading-dot"})]})]})]}),T&&e.jsxs("div",{style:{padding:14,background:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.3)",borderRadius:10,color:"#fca5a5",fontSize:11,display:"flex",alignItems:"flex-start",gap:10},children:[e.jsx("span",{style:{fontSize:16},children:"⚠️"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:600,marginBottom:4},children:"오류 발생"}),e.jsx("div",{style:{color:"#fecaca"},children:T})]})]}),!S&&!T&&W&&e.jsxs("div",{className:"ai-response-box",style:{padding:14,overflowY:"auto",overflowX:"hidden",maxHeight:"calc(100% - 10px)",width:"100%",maxWidth:"100%",boxSizing:"border-box"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:"1px solid rgba(99, 102, 241, 0.2)"},children:[e.jsx("div",{style:{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0},children:"🤖"}),e.jsx("span",{style:{color:"#a5b4fc",fontSize:11,fontWeight:600},children:"AI 분석 결과"})]}),e.jsx("div",{style:{fontSize:11,lineHeight:1.7,wordBreak:"break-all",overflowWrap:"anywhere",width:"100%",maxWidth:"100%",overflowX:"hidden"},className:"markdown-content ai-panel-markdown",children:e.jsx(X,{remarkPlugins:[Z],children:W})})]}),!S&&!T&&!W&&e.jsxs("div",{style:{textAlign:"center",padding:30,display:"flex",flexDirection:"column",alignItems:"center",gap:12},children:[e.jsxs("div",{style:{width:70,height:70,borderRadius:"50%",background:"linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"},children:[e.jsx("div",{style:{position:"absolute",width:"100%",height:"100%",border:"1px solid rgba(99, 102, 241, 0.3)",borderRadius:"50%",animation:"ai-pulse 2s ease-in-out infinite"}}),e.jsx("span",{style:{fontSize:32},children:"🤖"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:"#e2e8f0",fontSize:13,fontWeight:600,marginBottom:6},children:"Sales AI Agent"}),e.jsxs("div",{style:{color:"#94a3b8",fontSize:11,lineHeight:1.5},children:["매출 데이터를 분석하고",e.jsx("br",{}),"인사이트를 제공합니다"]})]}),e.jsx("div",{style:{marginTop:8,padding:"6px 12px",background:"rgba(99, 102, 241, 0.1)",borderRadius:20,fontSize:9,color:"#a5b4fc"},children:"위 입력창에 질문을 입력하세요"})]})]})]})}),f.open&&f.row&&e.jsx("div",{role:"menu",style:{position:"fixed",left:f.x,top:f.y,zIndex:9999,background:"var(--panel)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:8,boxShadow:"0 10px 24px rgba(0,0,0,.2)"},children:e.jsx("button",{role:"menuitem",className:"btn",style:{display:"block",width:"100%",padding:"8px 12px",background:"transparent",color:"inherit",border:"none",borderRadius:8},onClick:()=>{const t=f.row;try{const r={customerSeq:t.customerSeq,customerName:t.customerName};localStorage.setItem("tnt.sales.selectedCustomer",JSON.stringify(r)),window.dispatchEvent(new CustomEvent("tnt.sales.customer.selected",{detail:{source:"dashboard-churn",customer:r}})),window.dispatchEvent(new CustomEvent("tnt.sales.navigate",{detail:{key:"customer:sales-activity-new"}}))}catch{}E({open:!1,x:0,y:0,row:null})},children:"영업활동 이동"})})]})}const se=[[33,125.8],[38.6,130]],le={서울특별시:[37.5665,126.978],서울:[37.5665,126.978],부산광역시:[35.1796,129.0756],부산:[35.1796,129.0756],대구광역시:[35.8714,128.6014],대구:[35.8714,128.6014],인천광역시:[37.4563,126.7052],인천:[37.4563,126.7052],광주광역시:[35.1595,126.8526],광주:[35.1595,126.8526],대전광역시:[36.3504,127.3845],대전:[36.3504,127.3845],울산광역시:[35.5384,129.3114],울산:[35.5384,129.3114],세종특별자치시:[36.48,127.289],세종:[36.48,127.289],경기도:[37.4138,127.5183],경기:[37.4138,127.5183],강원특별자치도:[37.8228,128.1555],강원도:[37.8228,128.1555],강원:[37.8228,128.1555],충청북도:[36.6357,127.4914],충북:[36.6357,127.4914],충청남도:[36.5184,126.8],충남:[36.5184,126.8],전북특별자치도:[35.7175,127.153],전라북도:[35.7175,127.153],전북:[35.7175,127.153],전라남도:[34.8679,126.991],전남:[34.8679,126.991],경상북도:[36.4919,128.8889],경북:[36.4919,128.8889],경상남도:[35.4606,128.2132],경남:[35.4606,128.2132],제주특별자치도:[33.489,126.4983],제주도:[33.489,126.4983],제주:[33.489,126.4983]};function de(){const c=oe();return o.useEffect(()=>{c.fitBounds(se,{padding:[10,10]}),c.setZoom(c.getZoom()+.2)},[c]),null}function P(c){return c.toLocaleString()}function ce(c,p,A,N){const M=N>0?p/N:0,h=Math.max(50,Math.min(80,50+M*30)),f=A>0?Math.round(p/A*100):0,E=f>=80?225:f>=50?35:350,g=65,m=Math.max(80,90-M*10);return re.divIcon({className:"activity-marker",html:`<div style="
background: hsl(${E}, ${g}%, ${m}%);
color: #334155;
border-radius: 50%;
width: ${h}px;
height: ${h}px;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
font-size: ${Math.max(10,h/6.5)}px;
font-weight: bold;
border: 2px solid white;
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
line-height: 1.2;
">
  <div style="font-size: ${Math.max(8,h/6)}px; opacity: 0.85; margin-bottom: 2px;">${c.replace(/특별시|광역시|특별자치시|특별자치도|도$/,"")}</div>
  <div style="font-size: 0.9em;">계획 ${P(A)}</div>
  <div style="font-size: 0.9em;">완료 ${P(p)}</div>
    </div>`,iconSize:[h,h],iconAnchor:[h/2,h/2]})}function pe({regionData:c,mapInfo:p}){const[A,N]=o.useState(null),[M,h]=o.useState(!0),[f,E]=o.useState(null),g=o.useRef(null),[m,x]=o.useState(null),S=a=>{if(!a)return null;const d=a.trim().split(/\s+/)[0];return{서울특별시:"서울특별시",서울:"서울특별시",부산광역시:"부산광역시",부산:"부산광역시",대구광역시:"대구광역시",대구:"대구광역시",인천광역시:"인천광역시",인천:"인천광역시",광주광역시:"광주광역시",광주:"광주광역시",대전광역시:"대전광역시",대전:"대전광역시",울산광역시:"울산광역시",울산:"울산광역시",세종특별자치시:"세종특별자치시",세종:"세종특별자치시",경기도:"경기도",경기:"경기도",강원특별자치도:"강원특별자치도",강원도:"강원특별자치도",강원:"강원특별자치도",충청북도:"충청북도",충북:"충청북도",충청남도:"충청남도",충남:"충청남도",전북특별자치도:"전북특별자치도",전라북도:"전북특별자치도",전북:"전북특별자치도",전라남도:"전라남도",전남:"전라남도",경상북도:"경상북도",경북:"경상북도",경상남도:"경상남도",경남:"경상남도",제주특별자치도:"제주특별자치도",제주도:"제주특별자치도",제주:"제주특별자치도"}[d]||null},C=o.useMemo(()=>{const a={};return c.forEach(l=>{const s=S(l.region);s&&(a[s]||(a[s]={totalCount:0,completedCount:0}),a[s].totalCount+=l.totalCount,a[s].completedCount+=l.completedCount)}),a},[c]),T=o.useMemo(()=>Object.entries(C).map(([a,l])=>({sido:a,totalCount:l.totalCount,completedCount:l.completedCount,center:le[a]})).filter(a=>a.center&&(a.completedCount>0||a.totalCount>0)),[C]),z=o.useMemo(()=>Math.max(...Object.values(C).map(a=>a.completedCount),1),[C]);o.useEffect(()=>{fetch("/sales/data/sido_boundary_simplified.geojson").then(a=>{if(!a.ok)throw new Error("지도 데이터를 불러올 수 없습니다.");return a.json()}).then(a=>{N(a),h(!1)}).catch(a=>{E(a.message),h(!1)})},[]);const W=a=>{var w;if(!a)return{};const l=((w=a.properties)==null?void 0:w.CTP_KOR_NM)||"",s=m===l,d=C[l],u=(d==null?void 0:d.completedCount)||0,v=z>0?u/z:0,L=u>0?.2+v*.5:.05;return{fillColor:u>0?"#60a5fa":"#e5e7eb",weight:s?2:1,opacity:1,color:s?"#1d4ed8":"#9ca3af",fillOpacity:L}},D=(a,l)=>{var w;const s=((w=a.properties)==null?void 0:w.CTP_KOR_NM)||"알 수 없음",d=C[s],u=(d==null?void 0:d.completedCount)||0,v=(d==null?void 0:d.totalCount)||0,L=v>0?Math.round(u/v*100):0;l.on({mouseover:()=>{x(s),g.current&&g.current.setStyle(j=>W(j))},mouseout:()=>{x(null),g.current&&g.current.setStyle(j=>W(j))}}),l.bindTooltip(`<strong>${s}</strong><br />완료: ${P(u)} / ${P(v)} (${L}%)`,{permanent:!1,direction:"center",className:"activity-map-tooltip"})};return M?e.jsx("div",{style:{height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},children:"지도 로딩 중..."}):f?e.jsx("div",{style:{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"red"},children:f}):c.length===0?e.jsxs("div",{style:{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#64748b",gap:12,padding:20,textAlign:"center"},children:[e.jsx("div",{style:{fontSize:48,opacity:.5},children:"🗺️"}),e.jsx("div",{style:{fontSize:14,fontWeight:600},children:"활동 데이터를 조회해주세요"}),e.jsxs("div",{style:{fontSize:12,lineHeight:1.5},children:["활동분석 탭에서 조회 조건을 설정하고",e.jsx("br",{}),"조회 버튼을 클릭하면",e.jsx("br",{}),"지역별 활동 현황이 지도에 표시됩니다."]})]}):e.jsxs("div",{style:{height:"100%",position:"relative"},children:[p&&e.jsxs("div",{style:{position:"absolute",top:10,right:10,background:"rgba(255,255,255,0.95)",padding:"8px 12px",borderRadius:8,fontSize:11,boxShadow:"0 2px 4px rgba(0,0,0,0.1)",zIndex:1e3},children:[e.jsxs("div",{style:{fontWeight:600,marginBottom:4,color:"#1e293b"},children:[p.year,"년 ",p.month!=="all"?`${p.month}월`:""," ",p.week!=="all"?`${p.week}주`:""]}),e.jsxs("div",{style:{display:"flex",gap:12},children:[e.jsxs("span",{children:["계획: ",e.jsx("b",{style:{color:"#64748b"},children:p.totalPlanned.toLocaleString()})]}),e.jsxs("span",{children:["완료: ",e.jsx("b",{style:{color:"#2563eb"},children:p.totalCompleted.toLocaleString()})]})]})]}),e.jsxs(ne,{center:[36.5,127.5],zoom:7,zoomSnap:.1,style:{height:"100%",width:"100%",background:"#fff"},scrollWheelZoom:!0,children:[A&&e.jsxs(e.Fragment,{children:[e.jsx(ae,{ref:g,data:A,style:W,onEachFeature:D}),e.jsx(de,{})]}),T.map(a=>{const l=ce(a.sido,a.completedCount,a.totalCount,z),s=a.totalCount>0?Math.round(a.completedCount/a.totalCount*100):0;return e.jsx(ie,{position:a.center,icon:l,children:e.jsx(U,{direction:"top",offset:[0,-20],className:"activity-marker-tooltip",children:e.jsxs("div",{style:{padding:"4px 0"},children:[e.jsx("div",{style:{color:"#6b7280",fontSize:12,marginBottom:6},children:a.sido}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:"#10b981",display:"inline-block"}}),e.jsx("span",{style:{color:"#374151",fontSize:13},children:"완료: "}),e.jsxs("span",{style:{color:"#10b981",fontWeight:600,fontSize:13},children:[a.completedCount.toLocaleString(),"건"]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{width:10,height:10,borderRadius:"50%",background:"#94a3b8",display:"inline-block"}}),e.jsx("span",{style:{color:"#374151",fontSize:13},children:"계획: "}),e.jsxs("span",{style:{color:"#374151",fontWeight:600,fontSize:13},children:[a.totalCount.toLocaleString(),"건 (",s,"%)"]})]})]})})},a.sido)})]}),e.jsxs("div",{style:{position:"absolute",bottom:10,right:10,background:"rgba(255,255,255,0.95)",padding:"8px 12px",borderRadius:8,fontSize:11,boxShadow:"0 2px 4px rgba(0,0,0,0.1)",zIndex:1e3},children:[e.jsx("div",{style:{fontWeight:600,marginBottom:4},children:"활동 완료수"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("div",{style:{width:16,height:16,background:"rgba(96, 165, 250, 0.2)",border:"1px solid #9ca3af"}}),e.jsx("span",{children:"적음"}),e.jsx("div",{style:{width:16,height:16,background:"rgba(96, 165, 250, 0.7)",border:"1px solid #9ca3af",marginLeft:8}}),e.jsx("span",{children:"많음"})]})]}),e.jsx("style",{children:`
.activity-map-tooltip {
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  padding: 6px 10px;
}
.activity-marker {
  background: transparent;
  border: none;
}
.activity-marker-tooltip {
  background: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  font-family: inherit !important;
}
.activity-marker-tooltip::before {
  border-top-color: #fff !important;
}
.leaflet-tooltip.activity-marker-tooltip {
  opacity: 1 !important;
}
`})]})}export{fe as ChurnRightPanel};
