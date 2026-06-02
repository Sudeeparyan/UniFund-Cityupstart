import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

// ── Design tokens (exact Mytasky palette) ─────────────────────────────────────
const BG   = '#111118';
const CARD = '#1C1C28';
const SB   = '#0E0E16';
const PUR  = '#8B5CF6';
const TEAL = '#22D3EE';
const ORG  = '#F59E0B';
const GRN  = '#10B981';
const RED  = '#EF4444';

// ── Static data ───────────────────────────────────────────────────────────────

const MONTH_DATA = [
  { month:'Sep', spent:1380, budget:1300, risk:'high',   note:'Moving costs + deposit' },
  { month:'Oct', spent:1050, budget:1300, risk:'safe',   note:'Settled in' },
  { month:'Nov', spent:1120, budget:1300, risk:'safe',   note:'' },
  { month:'Dec', spent:1490, budget:1300, risk:'high',   note:'Holiday travel' },
  { month:'Jan', spent:980,  budget:1300, risk:'safe',   note:'' },
  { month:'Feb', spent:1060, budget:1300, risk:'safe',   note:'' },
  { month:'Mar', spent:1200, budget:1300, risk:'mid',    note:'Visa renewal fee' },
  { month:'Apr', spent:1070, budget:1300, risk:'safe',   note:'' },
  { month:'May', spent:1338, budget:1300, risk:'mid',    note:'Overspending this month' },
  { month:'Jun', spent:null, budget:1300, risk:'future', note:'Predicted' },
  { month:'Jul', spent:null, budget:1300, risk:'future', note:'Predicted' },
  { month:'Aug', spent:null, budget:1300, risk:'warn',   note:'Low reserves predicted' },
];

const SOURCE_TYPES = [
  { type:'salary',       label:'Salary / Stipend',    color:'#69F0AE' },
  { type:'freelance',    label:'Freelance',            color:'#00D1FF' },
  { type:'side_project', label:'Side Project / SaaS', color:'#7B61FF' },
  { type:'sponsorship',  label:'Sponsorship / OSS',   color:'#FF5FB6' },
  { type:'content',      label:'Content / Teaching',  color:'#FFD54F' },
  { type:'bounty',       label:'Bug Bounty',          color:'#4FC3F7' },
  { type:'other',        label:'Other',               color:'#B388FF' },
];

const INIT_SOURCES = [
  { id:1, type:'salary',       label:'Salary / Stipend',     color:'#69F0AE', amount:1200, active:true  },
  { id:2, type:'freelance',    label:'Freelance Projects',   color:'#00D1FF', amount:0,    active:false },
  { id:3, type:'side_project', label:'Side Project Revenue', color:'#7B61FF', amount:0,    active:false },
];

const INIT_CATEGORIES = [
  { id:'rent',      label:'Rent & Housing',    spent:520, budget:520, color:'#7B61FF' },
  { id:'groceries', label:'Groceries',         spent:180, budget:200, color:'#00D1FF' },
  { id:'cloud',     label:'Cloud & Infra',     spent:45,  budget:60,  color:'#4FC3F7' },
  { id:'devtools',  label:'Dev Tools',         spent:38,  budget:50,  color:'#B388FF' },
  { id:'ai',        label:'SaaS & AI Tools',   spent:42,  budget:40,  color:'#FF5FB6' },
  { id:'learning',  label:'Learning',          spent:29,  budget:40,  color:'#FFD54F' },
  { id:'domains',   label:'Domains & Hosting', spent:15,  budget:20,  color:'#00D1FF' },
  { id:'transport', label:'Transport',         spent:89,  budget:100, color:'#4FC3F7' },
  { id:'food',      label:'Eating Out',        spent:95,  budget:80,  color:'#FF8A65' },
  { id:'health',    label:'Health',            spent:28,  budget:60,  color:'#69F0AE' },
  { id:'hardware',  label:'Hardware',          spent:42,  budget:30,  color:'#B388FF' },
];

const TRANSACTIONS = [
  { id:1,  date:'Today',    merchant:'Lidl',         category:'Groceries',     color:'#F59E0B', amount:-34.20,
    ai_tip:'Your 3rd grocery trip this week. You\'ve spent €145 of €200 budget — consider batch shopping to reduce visits.' },
  { id:2,  date:'Today',    merchant:'TfL',          category:'Transport',     color:'#22D3EE', amount:-4.80,
    ai_tip:'Daily commute spend is on track. A monthly travelcard at €89 would save you ~€30 vs pay-as-you-go this month.' },
  { id:3,  date:'Yesterday',merchant:'Spotify',      category:'Subscriptions', color:'#1DB954', amount:-9.99,
    ai_tip:'You\'ve had Spotify 8+ months. Bundling with Apple One saves €3/mo — or switch to free with student discount.' },
  { id:4,  date:'Yesterday',merchant:'OpenAI',       category:'AI Tools',      color:'#10a37f', amount:-20.00,
    ai_tip:'You pay for both ChatGPT and GitHub Copilot. They overlap ~70% — dropping one saves €20/mo with no productivity loss.' },
  { id:5,  date:'Yesterday',merchant:'Deliveroo',    category:'Food & Drink',  color:'#FF5FB6', amount:-22.50,
    ai_tip:'4th food delivery this month. At this rate you\'ll spend €90 on delivery fees alone. Cooking twice a week saves ~€60.' },
  { id:6,  date:'27 May',   merchant:'Salary',       category:'Income',        color:'#10B981', amount:1200.00,
    ai_tip:'Salary received on time. After fixed costs you have ~€77 surplus. Moving €50 to savings today extends runway by 3 days.' },
  { id:7,  date:'27 May',   merchant:'AWS',          category:'Cloud & Infra', color:'#FF9900', amount:-12.50,
    ai_tip:'Cloud spend 25% over budget. Your EC2 instance runs idle 14h/day — switching to spot saves ~€8/mo immediately.' },
  { id:8,  date:'26 May',   merchant:'Vercel',       category:'Hosting',       color:'#8B5CF6', amount:-20.00,
    ai_tip:'Vercel Pro at €20/mo for personal projects is unnecessary. The free Hobby tier covers everything you\'re currently using.' },
  { id:9,  date:'26 May',   merchant:'GitHub',       category:'Dev Tools',     color:'#6e40c9', amount:-4.00,
    ai_tip:'GitHub Pro is fully covered by the GitHub Student Pack — you\'re paying for something that should be free. Claim it.' },
  { id:10, date:'25 May',   merchant:'Tesco',        category:'Groceries',     color:'#F59E0B', amount:-28.40,
    ai_tip:'Combined grocery spend this week: €62.60. Your €200 budget is 31% used at the 25-day mark — you\'re on track.' },
  { id:11, date:'25 May',   merchant:'Notion',       category:'Productivity',  color:'#B388FF', amount:-16.00,
    ai_tip:'Notion Plus at €16/mo — the free plan supports everything a solo developer needs. Consider downgrading to save.' },
  { id:12, date:'25 May',   merchant:'JetBrains',    category:'Dev Tools',     color:'#22D3EE', amount:-22.90,
    ai_tip:'JetBrains All Products is free with a student or open-source license. You\'re paying for something you qualify for free.' },
  { id:13, date:'24 May',   merchant:'Bolt',         category:'Transport',     color:'#34D399', amount:-11.20,
    ai_tip:'3 Bolt rides this week totalling €27. Public transport for the same routes costs ~€8 — worth checking journey times.' },
  { id:14, date:'24 May',   merchant:'DigitalOcean', category:'Cloud & Infra', color:'#0080FF', amount:-12.00,
    ai_tip:'This droplet hasn\'t had meaningful traffic in 6 days. Snapshot it and destroy until you need it — saves €12/mo.' },
  { id:15, date:'23 May',   merchant:'Landlord',     category:'Rent',          color:'#8B5CF6', amount:-520.00,
    ai_tip:'Rent is 43% of your total income. The healthy threshold is 30%. One additional €200 freelance client changes this ratio.' },
];

// Daily spend for May (€/day, 28 days so far)
const DAILY_SPEND_DATA = [
  45, 12, 78, 23, 89, 34, 56, 78, 23, 45,
  12, 67, 34, 89, 23, 45, 67, 34, 12, 56,
  78, 45, 34, 67, 23, 45, 56, 34,
];

// Projected savings balance through 31 May
const RUNWAY_PROJ_DATA = [
  3400, 3366, 3332, 3290, 3256, 3222, 3190, 3165,
  3133, 3100, 3078, 3044, 3012, 2984, 2956, 2924,
  2898, 2870, 2844, 2818, 2790, 2765, 2740, 2718,
  2695, 2674, 2654, 2640, 2625, 2612, 2600,
];

const STUDENT_DEALS = [
  // Tech
  { id:'github-edu',     name:'GitHub Education',     category:'Tech',           discount:'Free Pro + Copilot',   desc:'Free GitHub Pro, AI Copilot, and 80+ partner tools via the Student Developer Pack.',   color:'#6e40c9', tag:'FREE'     },
  { id:'jetbrains',      name:'JetBrains Student',    category:'Tech',           discount:'100% off all IDEs',    desc:'Free license for every JetBrains IDE — IntelliJ, WebStorm, PyCharm, Rider, and more.', color:'#22D3EE', tag:'FREE'     },
  { id:'replit',         name:'Replit Hacker',        category:'Tech',           discount:'Free Hacker plan',     desc:'Free Replit Hacker plan with Ghostwriter AI coding assistant via GitHub Education pack.', color:'#F26207', tag:'FREE'    },
  { id:'unity-student',  name:'Unity Student',        category:'Tech',           discount:'Free Student plan',    desc:'Unity Student plan free for anyone enrolled in a course — all core features included.',  color:'#222222', tag:'FREE'     },
  // Cloud
  { id:'aws-educate',    name:'AWS Educate',          category:'Cloud',          discount:'$100 credit / yr',     desc:'AWS credits plus access to 30+ cloud services with no credit card required.',            color:'#FF9900', tag:'CREDIT'   },
  { id:'azure-student',  name:'Azure for Students',   category:'Cloud',          discount:'$100 free credit',     desc:'$100 Azure credit with no credit card needed. Renews yearly while enrolled.',             color:'#0089D6', tag:'CREDIT'   },
  { id:'gcp',            name:'Google Cloud',         category:'Cloud',          discount:'$300 trial credit',    desc:'$300 in free credits for 90 days on any Google Cloud product.',                         color:'#4285F4', tag:'CREDIT'   },
  { id:'digitalocean',   name:'DigitalOcean',         category:'Cloud',          discount:'$200 credit',          desc:'$200 in cloud credits for 1 year via the GitHub Student Developer Pack.',               color:'#0080FF', tag:'CREDIT'   },
  { id:'vercel',         name:'Vercel Hobby',         category:'Cloud',          discount:'Free forever',         desc:'Unlimited personal projects with free custom domains, analytics, and serverless functions.', color:'#888888', tag:'FREE'  },
  // Design
  { id:'figma-edu',      name:'Figma Education',      category:'Design',         discount:'Free Professional',    desc:'Full Figma Professional plan free for students — unlimited projects, team features, dev mode.', color:'#F24E1E', tag:'FREE' },
  { id:'adobe-cc',       name:'Adobe Creative Cloud', category:'Design',         discount:'60% off',              desc:'All 20+ CC apps including Photoshop, Illustrator, Premiere at 60% student discount.',   color:'#FF0000', tag:'DISCOUNT' },
  { id:'canva-edu',      name:'Canva Education',      category:'Design',         discount:'Free Pro',             desc:'Free Canva Pro plan — premium templates, brand kit, background remover, and more.',       color:'#7D2AE8', tag:'FREE'     },
  { id:'sketch',         name:'Sketch',               category:'Design',         discount:'50% off',              desc:'50% off Sketch with a valid student email. The go-to vector tool for product designers.', color:'#F7B500', tag:'DISCOUNT' },
  // Productivity
  { id:'notion-edu',     name:'Notion Education',     category:'Productivity',   discount:'Free Plus plan',       desc:'Free Notion Plus (normally €10/mo) with .edu email — unlimited pages, synced databases.', color:'#000000', tag:'FREE'    },
  { id:'ms365',          name:'Microsoft 365',        category:'Productivity',   discount:'Free with .edu',       desc:'Word, Excel, PowerPoint, Teams, 1 TB OneDrive — all free with an institutional email.',  color:'#D83B01', tag:'FREE'     },
  { id:'1password',      name:'1Password Student',    category:'Productivity',   discount:'Free 1 year',          desc:'Free 1Password via GitHub Education — store passwords, passkeys, and secure notes.',      color:'#0094F5', tag:'FREE'     },
  { id:'grammarly',      name:'Grammarly Premium',    category:'Productivity',   discount:'Free via university',  desc:'Many universities offer Grammarly Premium free. Check your institution\'s software portal.', color:'#15C39A', tag:'FREE'    },
  // Entertainment
  { id:'spotify',        name:'Spotify Student',      category:'Entertainment',  discount:'50% off',              desc:'€2.99/mo Spotify Premium for up to 4 years. Verifies via SheerID — no .edu needed.',       color:'#1DB954', tag:'DISCOUNT' },
  { id:'apple-music',    name:'Apple Music Student',  category:'Entertainment',  discount:'50% off',              desc:'€2.99/mo for the full Apple Music catalog — 100M songs, spatial audio, lossless.',        color:'#FC3C44', tag:'DISCOUNT' },
  { id:'youtube-prem',   name:'YouTube Premium',      category:'Entertainment',  discount:'50% off',              desc:'€3.99/mo for ad-free YouTube and YouTube Music. Background play on mobile included.',      color:'#FF0000', tag:'DISCOUNT' },
  { id:'prime-student',  name:'Amazon Prime Student', category:'Entertainment',  discount:'6 months free',        desc:'6 months free then 50% off — free next-day delivery, Prime Video, and Prime Music.',       color:'#FF9900', tag:'FREE'     },
  // Transport
  { id:'railcard',       name:'16–25 Railcard',       category:'Transport',      discount:'1/3 off rail fares',   desc:'Save 33% on most UK and national rail fares. £30/year — pays for itself in one trip.',     color:'#E30613', tag:'DISCOUNT' },
  { id:'bus-pass',       name:'Student Bus Pass',     category:'Transport',      discount:'Up to 30% off',        desc:'Most operators offer termly or annual student passes significantly cheaper than pay-as-you-go.', color:'#F59E0B', tag:'DISCOUNT' },
  // Learning
  { id:'coursera',       name:'Coursera Financial Aid',category:'Learning',      discount:'Free certificates',    desc:'Apply for financial aid on any course — most are approved within 15 days. 7,000+ courses.', color:'#0056D2', tag:'FREE'    },
  { id:'linkedin-learn', name:'LinkedIn Learning',    category:'Learning',       discount:'1 month free',         desc:'Free trial with 21,000+ professional video courses. Great for portfolio-building skills.',   color:'#0A66C2', tag:'TRIAL'    },
  { id:'oreilly',        name:'O\'Reilly Learning',   category:'Learning',       discount:'Free via library',     desc:'Many university libraries give free O\'Reilly access — 60,000+ tech books and courses.',    color:'#D3002D', tag:'FREE'     },
  // Finance
  { id:'monzo-student',  name:'Monzo Student',        category:'Finance',        discount:'0% overdraft',         desc:'£2,000 arranged overdraft at 0% APR. No monthly fee, instant notifications, budgeting tools.', color:'#FF5B30', tag:'FREE'  },
  { id:'starling-student',name:'Starling Student',    category:'Finance',        discount:'Free account',         desc:'Fee-free student account with instant payments, savings spaces, and no foreign transaction fees.', color:'#6935FF', tag:'FREE' },
];

const DEAL_CATEGORIES = ['All','Tech','Cloud','Design','Productivity','Entertainment','Transport','Learning','Finance'];

const TAG_COLORS = { FREE:'#10B981', DISCOUNT:'#22D3EE', CREDIT:'#F59E0B', TRIAL:'#8B5CF6' };

const INIT_LINKED = [
  { id:1, bank:'Revolut',  type:'Current Account', last4:'4821', balance:1842.50, accent:'#00D1FF', syncedMins:12 },
  { id:2, bank:'N26',      type:'Savings Account', last4:'3309', balance:1557.20, accent:'#7B61FF', syncedMins:45 },
];

const BANK_OPTIONS = [
  { name:'Revolut',  icon:'◈', color:'#00D1FF', desc:'Digital bank'    },
  { name:'Monzo',    icon:'◉', color:'#FF5B30', desc:'UK neobank'      },
  { name:'N26',      icon:'⬡', color:'#7B61FF', desc:'EU digital'      },
  { name:'Wise',     icon:'✦', color:'#00B67A', desc:'Multi-currency'  },
  { name:'HSBC',     icon:'▣', color:'#DB0011', desc:'Traditional'     },
  { name:'Starling', icon:'★', color:'#6935FF', desc:'Challenger'      },
  { name:'Bunq',     icon:'◆', color:'#00C48C', desc:'EU fintech'      },
  { name:'Monese',   icon:'◎', color:'#FF5FB6', desc:'Expat-friendly'  },
];

const INSIGHTS = [
  { text:'Cloud costs 25% over budget. Switch idle instances to spot to save ~€18/mo.',    color:TEAL  },
  { text:'3 overlapping AI subs detected. Consolidate ChatGPT + Copilot to save ~€22/mo.', color:ORG   },
  { text:'8 devs with your stack use Railway over Heroku and save €30/mo on infra.',        color:TEAL  },
  { text:'Learning budget well managed — €29 of €40. Keep investing in skills.',            color:GRN   },
  { text:'Adding €200/mo freelance income extends your runway by 2.8 months.',             color:PUR   },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function AnimNum({ value, prefix = '', suffix = '', decimals = 0 }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);
  useEffect(() => { mv.set(value); }, [value]);
  useEffect(() => spring.on('change', v => setDisplay(v)), [spring]);
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV = [
  { key:'overview',  label:'Overview'  },
  { key:'accounts',  label:'Accounts'  },
  { key:'simulator', label:'Simulate'  },
  { key:'deals',     label:'Deals'     },
];

function Sidebar({ activeTab, setActiveTab, onBack }) {
  return (
    <div style={{ width:156, background:SB, display:'flex', flexDirection:'column',
      padding:'22px 0 20px', flexShrink:0, zIndex:10,
      borderRight:`1px solid rgba(255,255,255,0.05)` }}>

      {/* Logo mark */}
      <div style={{ padding:'0 18px 28px' }}>
        <div style={{ width:32, height:32, borderRadius:9,
          background:'linear-gradient(135deg,#22D3EE,#8B5CF6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, color:'white', fontWeight:700,
          boxShadow:'0 0 16px rgba(139,92,246,0.4)' }}>
          U
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2, padding:'0 10px' }}>
        {NAV.map(item => {
          const active = activeTab === item.key;
          return (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              style={{ display:'flex', alignItems:'center', padding:'9px 10px',
                borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
                textAlign:'left', width:'100%', transition:'all 0.15s',
                background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.36)',
                fontSize:13, fontWeight: active ? 600 : 400,
                borderLeft: `2px solid ${active ? TEAL : 'transparent'}` }}>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Back */}
      <div style={{ padding:'0 10px' }}>
        <button onClick={onBack}
          onMouseEnter={e => { e.currentTarget.style.color='#F87171'; }}
          onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.28)'; }}
          style={{ display:'flex', alignItems:'center', padding:'9px 10px',
            borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
            textAlign:'left', width:'100%', fontSize:13, fontWeight:400,
            background:'transparent', color:'rgba(255,255,255,0.28)',
            transition:'color 0.15s', borderLeft:'2px solid transparent' }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function DashHeader({ userName, runway }) {
  const label = userName
    ? userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()
    : 'User';
  const clampedRunway = Math.min(runway, 12);
  return (
    <div style={{ padding:'28px 28px 18px', display:'flex', alignItems:'flex-start',
      justifyContent:'space-between', flexShrink:0 }}>
      <div>
        <h1 style={{ fontSize:30, fontWeight:700, color:'white', margin:0,
          letterSpacing:'-0.02em', lineHeight:1.2 }}>
          Welcome, {label}!
        </h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.36)', margin:'5px 0 0' }}>
          Automate savings and achieve financial freedom.
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8,
        padding:'7px 16px', height:38, borderRadius:10,
        background:'rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize:15, fontWeight:700, color:TEAL,
          fontFamily:"'JetBrains Mono',monospace" }}>
          {clampedRunway >= 12 ? '12+' : clampedRunway.toFixed(1)}
        </span>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)' }}>months runway today</span>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.18)' }}>›</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button style={{ width:38, height:38, borderRadius:10, border:'none', cursor:'pointer',
          background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:16, fontFamily:'inherit' }}>⌕</button>
        <div style={{ position:'relative' }}>
          <button style={{ width:38, height:38, borderRadius:10, border:'none', cursor:'pointer',
            background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontFamily:'inherit', letterSpacing:'0.02em' }}>4</button>
          <div style={{ position:'absolute', top:-3, right:-3, width:17, height:17,
            borderRadius:'50%', background:RED,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, fontWeight:700, color:'white' }}>4</div>
        </div>
        <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,#F59E0B,#EF4444)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:700, color:'white', cursor:'pointer' }}>
          {userName ? userName.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </div>
  );
}

// ── Tool cards row ────────────────────────────────────────────────────────────

function ToolCard({ source }) {
  return (
    <motion.div whileHover={{ y:-2 }}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
        borderRadius:14, background:CARD, flexShrink:0, minWidth:185,
        border:'1px solid rgba(255,255,255,0.04)', cursor:'default' }}>
      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
        background:`${source.color}22`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, fontWeight:700, color:source.color }}>
        {source.label[0]}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'white', marginBottom:2,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {source.label} +
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)',
          fontFamily:"'JetBrains Mono',monospace" }}>
          €{source.amount.toLocaleString()}/mo
        </div>
      </div>
    </motion.div>
  );
}

function AddToolCard({ onClick }) {
  return (
    <motion.button whileHover={{ y:-2 }} onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${GRN}55`; e.currentTarget.style.color=GRN; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.28)'; }}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 18px',
        borderRadius:14, background:'transparent', flexShrink:0,
        border:'1px dashed rgba(255,255,255,0.08)', cursor:'pointer',
        color:'rgba(255,255,255,0.28)', fontSize:12, fontFamily:'inherit',
        transition:'all 0.15s', whiteSpace:'nowrap' }}>
      <span style={{ fontSize:18, lineHeight:1 }}>+</span> Add Income
    </motion.button>
  );
}

// ── Balance card (physical bank card style) ───────────────────────────────────

function BalanceCard({ savings, userName, editSavings, savingsInput, setSavingsInput, setSavings, setEditSavings }) {
  const cardName = userName
    ? userName.toUpperCase()
    : 'CARD HOLDER';

  return (
    <div style={{
      borderRadius: 18,
      position: 'relative',
      overflow: 'hidden',
      background: '#05111f',
      backgroundImage: [
        'radial-gradient(ellipse 80% 95% at 28% 60%, rgba(55,130,255,0.92) 0%, transparent 55%)',
        'radial-gradient(ellipse 50% 55% at 5% 10%,  rgba(80,155,255,0.35) 0%, transparent 50%)',
        'radial-gradient(ellipse 45% 45% at 90% 85%, rgba(10,45,110,0.7)   0%, transparent 55%)',
        'linear-gradient(145deg, #071828 0%, #04101d 100%)',
      ].join(','),
      boxShadow: '0 16px 40px rgba(0,8,40,0.65), 0 4px 12px rgba(0,20,70,0.45)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      flex: '0 0 auto',
      width: 400,
      height: 225,
    }}>

      {/* Top gloss */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%',
        background:'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
        borderRadius:'18px 18px 0 0', pointerEvents:'none' }} />

      {/* Top row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <div style={{ width:24, height:24, borderRadius:'50%',
            background:'rgba(185,195,210,0.55)', zIndex:2, position:'relative' }} />
          <div style={{ width:24, height:24, borderRadius:'50%',
            background:'rgba(155,170,190,0.38)', marginLeft:-9 }} />
        </div>
        <svg width="22" height="18" viewBox="0 0 26 22" fill="none">
          <circle cx="5" cy="11" r="2.2" fill="rgba(255,255,255,0.75)" />
          <path d="M9,4 C13.5,4 17,7.5 17,11 C17,14.5 13.5,18 9,18"
            stroke="rgba(255,255,255,0.65)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          <path d="M13,1 C20,1 25,5.5 25,11 C25,16.5 20,21 13,21"
            stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        </svg>
      </div>

      {/* Balance */}
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.58)', marginBottom:5, letterSpacing:'0.01em' }}>
          Available balance
        </div>
        {editSavings ? (
          <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
            <span style={{ fontSize:16, color:'rgba(255,255,255,0.35)', fontFamily:"'JetBrains Mono',monospace" }}>€</span>
            <input type="number" value={savingsInput}
              onChange={e => setSavingsInput(Number(e.target.value))}
              onKeyDown={e => { if(e.key==='Enter'){ setSavings(savingsInput); setEditSavings(false); }}}
              autoFocus
              style={{ background:'transparent', border:'none',
                borderBottom:'1px solid rgba(255,255,255,0.35)', outline:'none',
                color:'white', fontSize:28, fontWeight:700,
                fontFamily:"'JetBrains Mono',monospace", width:140, letterSpacing:'-0.02em' }} />
            <button onClick={() => { setSavings(savingsInput); setEditSavings(false); }}
              style={{ fontSize:10, padding:'3px 10px', borderRadius:6,
                background:'rgba(255,255,255,0.16)', color:'white',
                border:'none', cursor:'pointer', fontFamily:'inherit' }}>Save</button>
            <button onClick={() => setEditSavings(false)}
              style={{ fontSize:13, color:'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer' }}>×</button>
          </div>
        ) : (
          <button onClick={() => { setSavingsInput(savings); setEditSavings(true); }}
            style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <div style={{ fontSize:30, fontWeight:700, color:'white',
              letterSpacing:'-0.025em', fontFamily:"'JetBrains Mono',monospace",
              lineHeight:1, textShadow:'0 2px 10px rgba(80,160,255,0.3)' }}>
              €{savings.toLocaleString()}
            </div>
          </button>
        )}
      </div>

      {/* Bottom: name only */}
      <div style={{ position:'relative', zIndex:1 }}>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.62)',
          letterSpacing:'0.18em', fontWeight:500 }}>
          {cardName}
        </span>
      </div>
    </div>
  );
}


// ── Spending bar chart (Task Time style) ──────────────────────────────────────

function SpendingChart({ data, activeIdx, onHover }) {
  const recent = data.slice(-5);
  const maxVal = Math.max(...recent.map(d => d.spent || d.budget), 1);
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:110, padding:'0 4px' }}>
        {recent.map((d, i) => {
          const actualIdx = data.length - 5 + i;
          const isActive = activeIdx === actualIdx;
          const isFuture = d.spent == null;
          const val = isFuture ? d.budget : d.spent;
          const barH = Math.max(8, (val / maxVal) * 90);
          return (
            <div key={d.month} style={{ flex:1, display:'flex', flexDirection:'column',
              alignItems:'center', cursor:'pointer' }}
              onMouseEnter={() => onHover(actualIdx)}
              onMouseLeave={() => onHover(null)}>
              {/* Label above bar */}
              <div style={{ height:18, display:'flex', alignItems:'center', marginBottom:4 }}>
                {isActive && (
                  <span style={{ fontSize:9, color:ORG, fontWeight:700,
                    fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' }}>
                    €{val}
                  </span>
                )}
              </div>
              <motion.div
                initial={{ height:0 }} animate={{ height:barH }}
                transition={{ duration:0.5, delay:i*0.05, ease:[0.22,1,0.36,1] }}
                style={{ width:'100%', borderRadius:'6px 6px 3px 3px',
                  background: isActive ? ORG : isFuture ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)',
                  boxShadow: isActive ? `0 0 18px ${ORG}55` : 'none',
                  transition:'background 0.2s' }} />
            </div>
          );
        })}
      </div>
      {/* X labels */}
      <div style={{ display:'flex', gap:10, padding:'8px 4px 0' }}>
        {recent.map((d, i) => {
          const actualIdx = data.length - 5 + i;
          const isActive = activeIdx === actualIdx;
          return (
            <div key={d.month} style={{ flex:1, textAlign:'center', fontSize:10,
              color: isActive ? 'white' : 'rgba(255,255,255,0.28)',
              fontWeight: isActive ? 600 : 400, transition:'color 0.2s' }}>
              {d.month}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Category table (Tasks List style) ─────────────────────────────────────────

function CategoryTable({ categories }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 88px 60px 60px 50px',
        padding:'0 0 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:2 }}>
        {['Name','Status','Budget','Spent','Track'].map(h => (
          <span key={h} style={{ fontSize:10, color:'rgba(255,255,255,0.26)',
            fontWeight:500, letterSpacing:'0.05em' }}>{h}</span>
        ))}
      </div>
      {categories.slice(0, 6).map((cat, i) => {
        const over = cat.spent > cat.budget;
        const near = !over && cat.spent / cat.budget > 0.83;
        const sBg = over ? `${RED}18` : near ? `${ORG}18` : `${PUR}18`;
        const sClr = over ? '#F87171' : near ? '#FCD34D' : '#A78BFA';
        const sLbl = over ? 'over budget' : near ? 'near limit' : 'in progress';
        return (
          <motion.div key={cat.id}
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:i*0.04, duration:0.3 }}
            style={{ display:'grid', gridTemplateColumns:'1fr 88px 60px 60px 50px',
              alignItems:'center', padding:'11px 0',
              borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color, flexShrink:0 }} />
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.76)', fontWeight:500,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {cat.label}
                <span style={{ marginLeft:5, fontSize:9, color: over ? RED : 'rgba(255,255,255,0.22)' }}>
                  {over ? '↑' : '↑'}
                </span>
              </span>
            </div>
            <span style={{ fontSize:10, padding:'3px 8px', borderRadius:6,
              background:sBg, color:sClr, fontWeight:600, letterSpacing:'0.02em',
              display:'inline-block', whiteSpace:'nowrap' }}>
              {sLbl}
            </span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.32)',
              fontFamily:"'JetBrains Mono',monospace" }}>€{cat.budget}</span>
            <span style={{ fontSize:11, fontWeight:600,
              color: over ? '#F87171' : 'rgba(255,255,255,0.76)',
              fontFamily:"'JetBrains Mono',monospace" }}>€{cat.spent}</span>
            <button style={{ width:28, height:28, borderRadius:'50%', border:'none',
              cursor:'pointer', background:'rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:10, fontFamily:'inherit' }}>
              {i === 0 ? '⏸' : '▶'}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Optimize Workflow card ────────────────────────────────────────────────────

function InsightCard({ insights, activeInsight, onPrev, onNext }) {
  const ins = insights[activeInsight];
  return (
    <div style={{ borderRadius:20, padding:'20px 22px',
      background:'linear-gradient(135deg, #3B1F8C 0%, #5B21B6 35%, #4338CA 70%, #1E3A8A 100%)',
      position:'relative', overflow:'hidden', display:'flex', flexDirection:'column',
      width:'100%', height:'100%', boxSizing:'border-box' }}>

      {/* Top row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
            ⚙
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>Optimize Runway</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['←', onPrev], ['→', onNext]].map(([icon, fn]) => (
            <button key={icon} onClick={fn}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.14)'}
              style={{ width:28, height:28, borderRadius:7, border:'none', cursor:'pointer',
                background:'rgba(255,255,255,0.14)', color:'white', fontSize:13,
                fontFamily:'inherit', display:'flex', alignItems:'center',
                justifyContent:'center', transition:'background 0.15s' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Text */}
      <AnimatePresence mode="wait">
        <motion.p key={activeInsight}
          initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, y:-6 }} transition={{ duration:0.25 }}
          style={{ fontSize:12, color:'rgba(255,255,255,0.68)', lineHeight:1.65,
            margin:'0 0 18px', flex:1, maxWidth:180 }}>
          {ins.text}
        </motion.p>
      </AnimatePresence>

      <button
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.9)'}
        onMouseLeave={e => e.currentTarget.style.background='white'}
        style={{ alignSelf:'flex-start', padding:'8px 18px', borderRadius:10,
          background:'white', color:'#4C1D95', fontSize:11, fontWeight:700,
          border:'none', cursor:'pointer', letterSpacing:'0.08em',
          fontFamily:'inherit', transition:'background 0.15s' }}>
        SET UP
      </button>

      {/* Mountain illustration */}
      <div style={{ position:'absolute', bottom:0, right:0, width:165, height:115, pointerEvents:'none' }}>
        <svg viewBox="0 0 165 115" width="165" height="115">
          <defs>
            <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="165" height="115" fill="url(#sky2)" />
          <path d="M0,95 L35,48 L58,68 L85,28 L115,62 L140,42 L165,72 L165,115 L0,115 Z"
            fill="rgba(139,92,246,0.45)" />
          <path d="M0,115 L22,78 L48,95 L78,58 L105,80 L132,64 L165,82 L165,115 Z"
            fill="rgba(79,33,182,0.88)" />
          <path d="M85,28 L90,17 L96,28 Z" fill="rgba(255,255,255,0.55)" />
          <path d="M35,48 L40,36 L46,48 Z" fill="rgba(255,255,255,0.38)" />
          <path d="M140,42 L145,31 L151,42 Z" fill="rgba(255,255,255,0.3)" />
        </svg>
      </div>
    </div>
  );
}

// ── Runway health card (Completed Tasks style) ────────────────────────────────

function RunwayCard({ runway, savings, totalSpend, totalIncome, surplus }) {
  const clampedRunway = Math.min(runway, 12);
  const pctChange = surplus !== 0
    ? (surplus > 0 ? '+' : '') + Math.round((surplus / Math.max(totalSpend, 1)) * 100) + '%'
    : '0%';
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:600, color:'white' }}>Runway Health</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, padding:'4px 10px', borderRadius:7, fontWeight:700,
            background: surplus > 0 ? `${GRN}18` : `${RED}18`,
            color: surplus > 0 ? GRN : '#F87171' }}>
            {pctChange} today
          </span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.28)',
            background:'rgba(255,255,255,0.05)', padding:'4px 10px', borderRadius:7 }}>
            Week ↓
          </span>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:60, fontWeight:700, color:'white', lineHeight:1,
            fontFamily:"'JetBrains Mono',monospace", letterSpacing:'-0.04em' }}>
            {clampedRunway >= 12 ? '12+' : Math.round(clampedRunway)}
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:3 }}>months left</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, paddingTop:8 }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.28)' }}>€{savings.toLocaleString()} saved</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.28)' }}>€{totalSpend}/mo burn</span>
          <span style={{ fontSize:10, color: totalIncome > totalSpend ? GRN : '#F87171' }}>
            €{totalIncome}/mo in
          </span>
        </div>
      </div>

      {/* Area chart */}
      <div style={{ flex:1, display:'flex', gap:8, minHeight:70 }}>
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', paddingBottom:2 }}>
          {[40,30,20,10].map(v => (
            <span key={v} style={{ fontSize:9, color:'rgba(255,255,255,0.2)',
              fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
          ))}
        </div>
        <div style={{ flex:1, position:'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 400 85" preserveAspectRatio="none">
            <defs>
              <linearGradient id="runwayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PUR} stopOpacity="0.45" />
                <stop offset="100%" stopColor={PUR} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[21,42,63,84].map(y => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            <path d="M0,68 C40,62 80,40 120,52 C160,65 200,26 240,40 C280,53 320,20 360,30 L400,24 L400,85 L0,85 Z"
              fill="url(#runwayGrad)" />
            <path d="M0,68 C40,62 80,40 120,52 C160,65 200,26 240,40 C280,53 320,20 360,30 L400,24"
              fill="none" stroke={PUR} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Legacy components (other tabs) ────────────────────────────────────────────

function CategoryBar({ cat, delay }) {
  const pct = Math.min(cat.spent / cat.budget, 1.5);
  const over = cat.spent > cat.budget;
  return (
    <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay, duration:0.4 }}
      className="flex items-center gap-3">
      <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color, flexShrink:0 }} />
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.65)' }}>{cat.label}</span>
          <span className="text-[11px]" style={{ color: over ? '#F87171' : 'rgba(255,255,255,0.5)', fontFamily:"'JetBrains Mono',monospace" }}>
            €{cat.spent} <span style={{ color:'rgba(255,255,255,0.25)' }}>/ €{cat.budget}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(pct*100,100)}%` }}
            transition={{ delay: delay+0.1, duration:0.7, ease:[0.22,1,0.36,1] }}
            className="h-full rounded-full"
            style={{ background: over ? `linear-gradient(90deg,#F87171,#F59E0B)` : `linear-gradient(90deg,${cat.color}99,${cat.color})` }} />
        </div>
      </div>
    </motion.div>
  );
}

function BudgetSlider({ label, value, min, max, step, onChange, color, prefix='€' }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.5)' }}>{label}</span>
        <span className="text-[12px] font-semibold" style={{ color, fontFamily:"'JetBrains Mono',monospace" }}>{prefix}{value.toLocaleString()}/mo</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background:`linear-gradient(90deg,${color} ${((value-min)/(max-min))*100}%,rgba(255,255,255,0.08) 0%)`, outline:'none' }} />
    </div>
  );
}

function IncomeSourceCard({ source, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(source.amount);
  const commit = () => { onEdit(source.id, Number(editVal)); setEditing(false); };
  return (
    <motion.div layout initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }}
      className="px-4 py-3 rounded-xl"
      style={{ background: source.active ? `${source.color}08` : 'rgba(255,255,255,0.025)', border:`1px solid ${source.active ? `${source.color}28` : 'rgba(255,255,255,0.06)'}` }}>
      <div className="flex items-center gap-3">
        <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
        background:`${source.color}18`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, fontWeight:700, color:source.color }}>
        {source.label[0]}
      </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-medium" style={{ color: source.active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>{source.label}</span>
            {source.active && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background:`${source.color}20`, color:source.color, fontFamily:"'JetBrains Mono',monospace" }}>ACTIVE</span>}
          </div>
          {editing ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]" style={{ color:'rgba(255,255,255,0.4)', fontFamily:"'JetBrains Mono',monospace" }}>€</span>
              <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                className="w-24 bg-transparent text-[12px] outline-none text-white" style={{ borderBottom:'1px solid rgba(255,255,255,0.2)', fontFamily:"'JetBrains Mono',monospace" }}
                onKeyDown={e => e.key==='Enter' && commit()} autoFocus />
              <button onClick={commit} className="text-[10px] px-2 py-0.5 rounded" style={{ background:`${source.color}25`, color:source.color }}>Save</button>
              <button onClick={() => setEditing(false)} className="text-[10px]" style={{ color:'rgba(255,255,255,0.3)' }}>×</button>
            </div>
          ) : (
            <span className="text-[11px]" style={{ color: source.active ? source.color : 'rgba(255,255,255,0.25)', fontFamily:"'JetBrains Mono',monospace" }}>
              {source.amount > 0 ? `€${source.amount.toLocaleString()}/mo` : 'Not set — click Edit'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <button onClick={() => { setEditVal(source.amount); setEditing(true); }}
              className="text-[10px] px-2 py-0.5 rounded" style={{ color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.05)' }}>Edit</button>
          )}
          <button onClick={() => onToggle(source.id)}
            className="w-8 h-4 rounded-full relative flex-shrink-0"
            style={{ background: source.active ? source.color : 'rgba(255,255,255,0.12)' }}>
            <motion.div animate={{ x: source.active ? 17 : 2 }}
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
              transition={{ type:'spring', stiffness:400, damping:25 }} />
          </button>
          <button onClick={() => onDelete(source.id)} className="text-sm opacity-25 hover:opacity-60 transition-opacity" style={{ color:'#F87171' }}>×</button>
        </div>
      </div>
    </motion.div>
  );
}

function AddSourcePanel({ onAdd, onClose }) {
  const [form, setForm] = useState({ type:'freelance', label:'', amount:'' });
  const selType = SOURCE_TYPES.find(t => t.type === form.type);
  const handleAdd = () => {
    if (!form.label.trim() || !form.amount) return;
    onAdd({ id: Date.now(), type: form.type, label: form.label, color: selType.color, amount: Number(form.amount), active: true });
    onClose();
  };
  return (
    <motion.div initial={{ opacity:0, y:12, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:6, scale:0.97 }}
      className="rounded-2xl px-5 py-5"
      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(20px)' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[9px] tracking-[0.2em]" style={{ color:'rgba(255,255,255,0.4)', fontFamily:"'JetBrains Mono',monospace" }}>ADD INCOME SOURCE</div>
        <button onClick={onClose} className="text-lg opacity-40 hover:opacity-70 text-white">×</button>
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-[10px] mb-2" style={{ color:'rgba(255,255,255,0.4)' }}>Type</div>
          <div className="grid grid-cols-4 gap-1.5">
            {SOURCE_TYPES.map(t => (
              <button key={t.type} onClick={() => setForm(f => ({ ...f, type:t.type }))}
                className="px-2 py-2 rounded-lg text-center transition-colors"
                style={{ background:form.type===t.type?`${t.color}20`:'rgba(255,255,255,0.03)', border:`1px solid ${form.type===t.type?`${t.color}40`:'rgba(255,255,255,0.07)'}`, color:form.type===t.type?t.color:'rgba(255,255,255,0.4)' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:2, color:'inherit' }}>{t.label[0]}</div>
                <div className="text-[8px] leading-tight">{t.label.split('/')[0].trim()}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] mb-1.5" style={{ color:'rgba(255,255,255,0.4)' }}>Label</div>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label:e.target.value }))}
            placeholder={selType?.label || 'e.g. Client Project'}
            className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
            style={{ border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.03)' }} />
        </div>
        <div>
          <div className="text-[10px] mb-1.5" style={{ color:'rgba(255,255,255,0.4)' }}>Monthly Amount (€)</div>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))}
            placeholder="e.g. 500"
            className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
            style={{ border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.03)', fontFamily:"'JetBrains Mono',monospace" }} />
        </div>
        <motion.button onClick={handleAdd} whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          className="w-full py-2.5 rounded-xl text-[11px] tracking-widest"
          style={{ background:form.label&&form.amount?`linear-gradient(135deg,${selType?.color}25,${selType?.color}12)`:'rgba(255,255,255,0.04)', border:`1px solid ${form.label&&form.amount?`${selType?.color}40`:'rgba(255,255,255,0.08)'}`, color:form.label&&form.amount?selType?.color:'rgba(255,255,255,0.25)', fontFamily:"'JetBrains Mono',monospace" }}>
          + ADD SOURCE
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── AI Insight Panel ──────────────────────────────────────────────────────────

function AIInsightPanel({ tip }) {
  const [displayed, setDisplayed] = useState('');
  const [cursor,    setCursor]    = useState(true);
  const [done,      setDone]      = useState(false);

  // Typewriter effect — re-runs every time tip changes (new transaction opened)
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(tip.slice(0, i));
      if (i >= tip.length) { setDone(true); clearInterval(timer); }
    }, 14);
    return () => clearInterval(timer);
  }, [tip]);

  // Blinking cursor while typing
  useEffect(() => {
    if (done) { setCursor(false); return; }
    const t = setInterval(() => setCursor(c => !c), 480);
    return () => clearInterval(t);
  }, [done]);

  // Pull out any "save €X" / "saves ~€X" mention for the highlight badge
  const m = tip.match(/save[sd]?\s*~?€[\d,.]+(\/mo)?/i);

  return (
    <div style={{ margin:'12px 0 10px 0px', borderRadius:12, overflow:'hidden',
      background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.22)' }}>

      {/* Gradient top accent strip */}
      <div style={{ height:2,
        background:'linear-gradient(90deg, #8B5CF6 0%, #22D3EE 55%, transparent 100%)' }} />

      <div style={{ padding:'11px 14px 13px' }}>

        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
              background:'linear-gradient(135deg,#8B5CF6,#22D3EE)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, color:'white' }}>✦</div>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em',
              color:'rgba(255,255,255,0.5)' }}>AI ANALYST</span>
          </div>
          {m && (
            <span style={{ fontSize:10, fontWeight:700, color:GRN,
              background:`${GRN}15`, border:`1px solid ${GRN}30`,
              padding:'2px 9px', borderRadius:6 }}>
              {m[0]}
            </span>
          )}
        </div>

        {/* Typewriter body */}
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.72,
          margin:0, minHeight:36 }}>
          {displayed}
          {!done && cursor && (
            <span style={{ display:'inline-block', width:2, height:13,
              background:PUR, marginLeft:1, verticalAlign:'middle',
              borderRadius:1 }} />
          )}
        </p>

        {/* Feedback row */}
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          {['Helpful', 'Not helpful', 'Take action'].map(label => (
            <button key={label}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.09)'; e.currentTarget.style.color='rgba(255,255,255,0.65)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.color='rgba(255,255,255,0.3)'; }}
              style={{ fontSize:10, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
                color:'rgba(255,255,255,0.3)', fontFamily:'inherit', transition:'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Spending History (Revolut-style transaction feed) ─────────────────────────

function SpendingHistory() {
  const [expanded, setExpanded] = useState(null);

  const groups = TRANSACTIONS.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  return (
    <div style={{ overflowY:'auto', flex:1,
      scrollbarWidth:'thin', scrollbarColor:'rgba(139,92,246,0.2) transparent' }}>
      {Object.entries(groups).map(([date, txns]) => (
        <div key={date}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', letterSpacing:'0.1em',
            fontWeight:600, padding:'10px 0 4px', textTransform:'uppercase' }}>
            {date}
          </div>
          {txns.map(t => {
            const isOpen = expanded === t.id;
            return (
              <div key={t.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                {/* Transaction row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0',
                    cursor:'pointer', borderRadius:8, transition:'background 0.15s',
                    background: isOpen ? 'rgba(139,92,246,0.06)' : 'transparent' }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background='rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background='transparent'; }}>

                  {/* Merchant initial */}
                  <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0,
                    background:`${t.color}20`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:700, color:t.color }}>
                    {t.merchant[0]}
                  </div>

                  {/* Name + category */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.88)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {t.merchant}
                    </div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:1 }}>
                      {t.category}
                    </div>
                  </div>

                  {/* Amount + expand caret */}
                  <div style={{ flexShrink:0, textAlign:'right', display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontSize:13, fontWeight:700,
                      fontFamily:"'JetBrains Mono',monospace",
                      color: t.amount > 0 ? GRN : 'rgba(255,255,255,0.82)' }}>
                      {t.amount > 0 ? '+' : '-'}€{Math.abs(t.amount).toFixed(2)}
                    </div>
                    <span style={{ fontSize:10, color: isOpen ? PUR : 'rgba(255,255,255,0.2)',
                      transition:'transform 0.2s, color 0.15s',
                      display:'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                  </div>
                </div>

                {/* AI insight panel */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity:0, height:0 }}
                      animate={{ opacity:1, height:'auto' }}
                      exit={{ opacity:0, height:0 }}
                      transition={{ duration:0.22 }}
                      style={{ overflow:'hidden' }}>
                      <AIInsightPanel tip={t.ai_tip} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Sparkline primitive ───────────────────────────────────────────────────────

function Sparkline({ data, color, height = 56, currentIdx }) {
  const valid = data.filter(v => v != null);
  const min   = Math.min(...valid);
  const max   = Math.max(...valid);
  const range = max - min || 1;
  const pad   = 4;

  const pts = data.map((v, i) => v == null ? null : {
    x: (i / (data.length - 1)) * 100,
    y: (height - pad) - ((v - min) / range) * (height - pad * 2) + pad,
    v, i,
  }).filter(Boolean);

  if (pts.length < 2) return null;

  // Smooth catmull-rom path
  function catmull(ps) {
    let d = `M${ps[0].x.toFixed(1)},${ps[0].y.toFixed(1)}`;
    for (let i = 0; i < ps.length - 1; i++) {
      const p0 = ps[Math.max(0, i - 1)];
      const p1 = ps[i];
      const p2 = ps[i + 1];
      const p3 = ps[Math.min(ps.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const line = catmull(pts);
  const area = `${line} L${pts.at(-1).x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`;
  const cur  = currentIdx != null ? pts.find(p => p.i === currentIdx) : pts.at(-1);
  const gid  = `spk${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none" style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" initial={{ pathLength:0 }}
        animate={{ pathLength:1 }} transition={{ duration:1.1, ease:[0.22,1,0.36,1] }} />
      {cur && (
        <>
          <circle cx={cur.x} cy={cur.y} r="3.5" fill={color} />
          <circle cx={cur.x} cy={cur.y} r="6"   fill={color} opacity="0.2" />
        </>
      )}
    </svg>
  );
}

// ── Interactive Area Chart (Y-axis + X weekly periods + hover tooltip) ────────

function BigAreaChart({ data, color, xLabels, valuePrefix = '€', valueSuffix = '' }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const SVG_W   = 1000;
  const SVG_H   = 100;
  const CHART_H = 172; // px height of chart area div

  const valid   = data.filter(v => v != null);
  const dataMin = Math.min(...valid);
  const dataMax = Math.max(...valid);

  // Compute nice Y-axis ticks
  const niceStep = (() => {
    const rough = (dataMax - dataMin) / 4;
    if (!rough) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    for (const f of [1, 2, 2.5, 5, 10]) if (mag * f >= rough) return mag * f;
    return mag * 10;
  })();
  const yMin   = Math.floor(dataMin / niceStep) * niceStep;
  const yMax   = Math.ceil(dataMax  / niceStep) * niceStep;
  const yRange = yMax - yMin || 1;
  const yTicks = [];
  for (let v = yMin; v <= yMax + niceStep * 0.001; v += niceStep) yTicks.push(Math.round(v));

  // SVG coordinate helpers
  const svgY = v => ((yMax - v) / yRange) * SVG_H;
  const svgX = i => (i / (data.length - 1)) * SVG_W;

  const pts = data.map((v, i) => ({ x: svgX(i), y: svgY(v), v, i }));

  function catmullPath(ps) {
    let d = `M${ps[0].x.toFixed(1)},${ps[0].y.toFixed(1)}`;
    for (let k = 0; k < ps.length - 1; k++) {
      const p0 = ps[Math.max(0, k - 1)], p1 = ps[k];
      const p2 = ps[k + 1],              p3 = ps[Math.min(ps.length - 1, k + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const linePath = catmullPath(pts);
  const areaPath = `${linePath} L${SVG_W},${SVG_H} L0,${SVG_H} Z`;
  const hov      = hoverIdx != null ? pts[hoverIdx] : null;
  const gid      = `bac${color.replace(/[^a-z0-9]/gi, '')}`;

  // Weekly X-axis ticks (every 7 days = one period)
  const xTickIdxs = [];
  for (let i = 0; i < data.length; i += 7) xTickIdxs.push(i);
  if (xTickIdxs.at(-1) !== data.length - 1) xTickIdxs.push(data.length - 1);

  const fmtY     = v => v >= 1000 ? `${valuePrefix}${(v / 1000).toFixed(1)}K` : `${valuePrefix}${v}`;
  const tipXPct  = hov ? (hov.x / SVG_W) * 100 : 0;
  const tipYPct  = hov ? (hov.y / SVG_H) * 100 : 0;
  const tipXDir  = tipXPct > 70 ? '-100%' : tipXPct < 30 ? '0%' : '-50%';

  return (
    <div style={{ width: '100%', display: 'flex', gap: 0 }}
      onMouseLeave={() => setHoverIdx(null)}>

      {/* Y-axis labels column */}
      <div style={{ width: 50, flexShrink: 0, height: CHART_H,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 7 }}>
        {[...yTicks].reverse().map(v => (
          <span key={v} style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)',
            fontFamily: "'JetBrains Mono',monospace", lineHeight: 1, whiteSpace: 'nowrap' }}>
            {fmtY(v)}
          </span>
        ))}
      </div>

      {/* Chart area + X-axis */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Chart area with grid + SVG */}
        <div style={{ position: 'relative', height: CHART_H,
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)' }}>

          {/* Horizontal grid lines at each Y tick */}
          {yTicks.map(v => (
            <div key={v} style={{
              position: 'absolute', left: 0, right: 0,
              top: `${((yMax - v) / yRange) * 100}%`,
              height: 1, background: 'rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }} />
          ))}

          {/* Vertical tick marks at weekly X positions */}
          {xTickIdxs.map(idx => (
            <div key={idx} style={{
              position: 'absolute', top: '100%', marginTop: 1,
              left: `${(idx / (data.length - 1)) * 100}%`,
              width: 1, height: 5, background: 'rgba(255,255,255,0.18)',
              transform: 'translateX(-50%)', pointerEvents: 'none',
            }} />
          ))}

          {/* Chart SVG (shapes only, no text — avoids preserveAspectRatio distortion) */}
          <svg ref={svgRef} width="100%" height="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, display: 'block',
              cursor: 'crosshair', overflow: 'visible' }}
            onMouseMove={e => {
              if (!svgRef.current) return;
              const r = svgRef.current.getBoundingClientRect();
              setHoverIdx(Math.max(0, Math.min(data.length - 1,
                Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))));
            }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="0.45" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gid})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            {hov && <>
              <line x1={hov.x} y1={0} x2={hov.x} y2={SVG_H}
                stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
              <circle cx={hov.x} cy={hov.y} r="5"  fill="white" />
              <circle cx={hov.x} cy={hov.y} r="10" fill={color} opacity="0.2" />
            </>}
          </svg>

          {/* Tooltip */}
          {hov && (
            <div style={{
              position: 'absolute', pointerEvents: 'none', zIndex: 30,
              left: `${tipXPct}%`, top: `${tipYPct}%`,
              transform: `translate(${tipXDir}, -120%)`,
            }}>
              <div style={{
                background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 10, padding: '7px 14px',
                boxShadow: '0 8px 28px rgba(0,0,0,0.75)', whiteSpace: 'nowrap',
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  marginBottom: 2, fontWeight: 500 }}>
                  {xLabels?.[hoverIdx] ?? `Day ${hoverIdx + 1}`}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color,
                  fontFamily: "'JetBrains Mono',monospace" }}>
                  {valuePrefix}{data[hoverIdx]?.toLocaleString()}{valueSuffix}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* X-axis labels — weekly period markers */}
        <div style={{ position: 'relative', height: 18, marginTop: 6 }}>
          {xTickIdxs.map(idx => (
            <span key={idx} style={{
              position: 'absolute',
              left: `${(idx / (data.length - 1)) * 100}%`,
              transform: 'translateX(-50%)',
              fontSize: 9, color: 'rgba(255,255,255,0.32)',
              fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap',
            }}>
              {xLabels?.[idx] ?? `D${idx + 1}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Spending Rate card ────────────────────────────────────────────────────────

function SpendingRateCard() {
  const labels = DAILY_SPEND_DATA.map((_, i) => `May ${i + 1}`);
  const avg    = Math.round(DAILY_SPEND_DATA.reduce((s, v) => s + v, 0) / DAILY_SPEND_DATA.length);
  const last   = DAILY_SPEND_DATA.at(-1);
  const tClr   = last > avg ? '#F87171' : GRN;
  const pct    = Math.abs(Math.round(((last - avg) / avg) * 100));

  return (
    <div style={{ borderRadius: 18, padding: '16px 18px 12px', background: CARD,
      display: 'flex', flexDirection: 'column', height: '100%',
      boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 2 }}>Spending Rate</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Daily · May 2026</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1,
            fontFamily: "'JetBrains Mono',monospace" }}>€{last}</div>
          <div style={{ fontSize: 9, color: tClr, marginTop: 3 }}>
            {last > avg ? '↑' : '↓'}{pct}% · avg €{avg}/day
          </div>
        </div>
      </div>
      <BigAreaChart data={DAILY_SPEND_DATA} color={ORG} xLabels={labels} valuePrefix="€" />
    </div>
  );
}

// ── Runway Predictor card ─────────────────────────────────────────────────────

function RunwayPredictorCard() {
  const labels  = RUNWAY_PROJ_DATA.map((_, i) => `May ${i + 1}`);
  const endBal  = RUNWAY_PROJ_DATA.at(-1);
  const burned  = RUNWAY_PROJ_DATA[0] - endBal;

  return (
    <div style={{ borderRadius: 18, padding: '16px 18px 12px', background: CARD,
      display: 'flex', flexDirection: 'column', height: '100%',
      boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'white', marginBottom: 2 }}>Runway Predictor</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Balance · end of May</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1,
            fontFamily: "'JetBrains Mono',monospace" }}>€{endBal.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: '#F87171', marginTop: 3 }}>-€{burned} burned this month</div>
        </div>
      </div>
      <BigAreaChart data={RUNWAY_PROJ_DATA} color={PUR} xLabels={labels} valuePrefix="€" />
    </div>
  );
}

// ── Chip Icon ─────────────────────────────────────────────────────────────────

function ChipIcon() {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
      <rect width="30" height="24" rx="4" fill="rgba(255,210,80,0.82)" />
      <rect x="2" y="8" width="26" height="8" rx="1"
        stroke="rgba(140,100,0,0.55)" strokeWidth="0.8" fill="none" />
      <line x1="10" y1="0" x2="10" y2="24" stroke="rgba(140,100,0,0.45)" strokeWidth="0.8" />
      <line x1="20" y1="0" x2="20" y2="24" stroke="rgba(140,100,0,0.45)" strokeWidth="0.8" />
      <line x1="0"  y1="8" x2="30" y2="8"  stroke="rgba(140,100,0,0.45)" strokeWidth="0.8" />
      <line x1="0"  y1="16" x2="30" y2="16" stroke="rgba(140,100,0,0.45)" strokeWidth="0.8" />
    </svg>
  );
}

// ── Bank Card ─────────────────────────────────────────────────────────────────

const CARD_GRADIENTS = {
  Revolut:  'linear-gradient(145deg, #0c1829 0%, #0f2d5c 52%, #1d55b8 100%)',
  N26:      'linear-gradient(145deg, #120c28 0%, #261060 52%, #4d22c2 100%)',
  Monzo:    'linear-gradient(145deg, #28100c 0%, #5c1a10 52%, #b8361d 100%)',
  Wise:     'linear-gradient(145deg, #0c2818 0%, #0f5230 52%, #1da860 100%)',
  HSBC:     'linear-gradient(145deg, #280c0c 0%, #5c1010 52%, #b01818 100%)',
  Starling: 'linear-gradient(145deg, #180c28 0%, #3a1060 52%, #7022c2 100%)',
  Bunq:     'linear-gradient(145deg, #0c2820 0%, #105c3a 52%, #1ab870 100%)',
  Monese:   'linear-gradient(145deg, #280c20 0%, #5c103a 52%, #b81d7a 100%)',
};

function BankCard({ account, onUnlink }) {
  const [hovered, setHovered]             = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const bg = CARD_GRADIENTS[account.bank]
    || `linear-gradient(145deg, #0d0d1a 0%, ${account.accent}22 52%, #111118 100%)`;

  return (
    <motion.div layout
      initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0, scale:0.88 }} whileHover={{ y:-5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmUnlink(false); }}
      style={{ width:240, height:152, borderRadius:18, flexShrink:0,
        position:'relative', overflow:'hidden', cursor:'default',
        background:bg,
        boxShadow:`0 16px 40px rgba(0,0,0,0.55), 0 4px 14px ${account.accent}20` }}>

      {/* Top gloss */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%',
        background:'linear-gradient(180deg,rgba(255,255,255,0.07) 0%,transparent 100%)',
        pointerEvents:'none' }} />

      {/* Decorative circles */}
      <div style={{ position:'absolute', top:-40, left:-40, width:130, height:130,
        borderRadius:'50%', background:`${account.accent}10`, pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:-18, left:-18, width:75, height:75,
        borderRadius:'50%', background:`${account.accent}07`, pointerEvents:'none' }} />

      {/* Content */}
      <div style={{ position:'relative', zIndex:1, padding:'16px 18px', height:'100%',
        boxSizing:'border-box', display:'flex', flexDirection:'column',
        justifyContent:'space-between' }}>

        {/* Top: chip + bank name */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <ChipIcon />
          <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.88)',
            letterSpacing:'0.1em', textTransform:'uppercase' }}>
            {account.bank}
          </span>
        </div>

        {/* Masked number */}
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.62)',
          fontFamily:"'JetBrains Mono',monospace", letterSpacing:'0.18em' }}>
          •••• •••• •••• {account.last4}
        </div>

        {/* Bottom: type + balance */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.36)', letterSpacing:'0.1em',
              textTransform:'uppercase', marginBottom:3 }}>Account</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.68)', fontWeight:500 }}>
              {account.type}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.36)', letterSpacing:'0.1em',
              textTransform:'uppercase', marginBottom:3 }}>Balance</div>
            <div style={{ fontSize:15, fontWeight:700, color:'white',
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:'-0.01em' }}>
              €{account.balance.toLocaleString('en',{minimumFractionDigits:2})}
            </div>
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'absolute', inset:0, borderRadius:18, zIndex:10,
              background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
            {!confirmUnlink ? (
              <button onClick={() => setConfirmUnlink(true)}
                style={{ fontSize:11, color:'#F87171', background:'rgba(239,68,68,0.12)',
                  border:'1px solid rgba(239,68,68,0.28)', borderRadius:8,
                  padding:'7px 18px', cursor:'pointer', fontFamily:'inherit' }}>
                Remove
              </button>
            ) : (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginBottom:12 }}>
                  Remove {account.bank}?
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                  <button onClick={() => onUnlink(account.id)}
                    style={{ fontSize:11, color:'#F87171', background:'rgba(239,68,68,0.12)',
                      border:'1px solid rgba(239,68,68,0.28)', borderRadius:8,
                      padding:'6px 14px', cursor:'pointer', fontFamily:'inherit' }}>
                    Yes
                  </button>
                  <button onClick={() => setConfirmUnlink(false)}
                    style={{ fontSize:11, color:'rgba(255,255,255,0.42)',
                      background:'rgba(255,255,255,0.06)',
                      border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                      padding:'6px 14px', cursor:'pointer', fontFamily:'inherit' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Add Bank Card ──────────────────────────────────────────────────────────────

function AddBankCard({ onClick, isOpen }) {
  return (
    <motion.button onClick={onClick} whileHover={{ y:-5 }} whileTap={{ scale:0.97 }}
      style={{ width:240, height:152, borderRadius:18, flexShrink:0,
        border:`2px dashed ${isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
        background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:9 }}>
      <div style={{ width:32, height:32, borderRadius:'50%',
        background:'rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, color:'rgba(255,255,255,0.28)', fontWeight:300, lineHeight:1 }}>
        +
      </div>
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.26)' }}>Add account</span>
    </motion.button>
  );
}

// ── Bank List Row ─────────────────────────────────────────────────────────────

function BankListRow({ bank, onConnect, isConnected, isConnecting }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display:'flex', alignItems:'center', gap:12,
        padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.04)',
        transition:'background 0.12s' }}>

      <div style={{ width:30, height:30, borderRadius:7, flexShrink:0,
        background:`${bank.color}18`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, fontWeight:700, color:bank.color }}>
        {bank.name[0]}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600,
          color: isConnected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.82)' }}>
          {bank.name}
        </div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{bank.desc}</div>
      </div>

      <div style={{ flexShrink:0, minWidth:70, textAlign:'right' }}>
        {isConnected ? (
          <span style={{ fontSize:10, color:GRN }}>Connected</span>
        ) : isConnecting ? (
          <motion.span animate={{ opacity:[1,0.35,1] }} transition={{ repeat:Infinity, duration:0.85 }}
            style={{ fontSize:10, color:bank.color }}>Connecting…</motion.span>
        ) : (
          <button onClick={() => onConnect(bank)}
            style={{ fontSize:10, color: hovered ? 'white' : 'rgba(255,255,255,0.38)',
              background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
              padding:0, transition:'color 0.12s' }}>
            Connect →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sim step indicator ────────────────────────────────────────────────────────

function SimStepIndicator({ step }) {
  const steps = [{ n:1, label:'Income' }, { n:2, label:'Spending' }, { n:3, label:'Plan' }];
  const active = step === 'generating' ? 2 : step;
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center',
      gap:0, marginBottom:44 }}>
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <motion.div animate={{
                background: active > s.n ? GRN : active === s.n ? TEAL : 'rgba(255,255,255,0.08)',
              }} transition={{ duration:0.35 }}
              style={{ width:28, height:28, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:700, color:'white' }}>
              {active > s.n ? '✓' : s.n}
            </motion.div>
            <span style={{ fontSize:10, transition:'color 0.35s',
              color: active >= s.n ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <motion.div animate={{ background: active > s.n ? GRN : 'rgba(255,255,255,0.08)' }}
              transition={{ duration:0.35 }}
              style={{ width:72, height:2, borderRadius:1, margin:'13px 10px 0' }} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ── Generating step component ─────────────────────────────────────────────────

function GeneratingStep({ onDone }) {
  const [done, setDone] = useState(0);
  const tasks = [
    'Reading your income',
    'Analysing spending patterns',
    'Identifying savings opportunities',
    'Crafting your personal plan',
  ];
  useEffect(() => {
    const timers = tasks.map((_, i) => setTimeout(() => setDone(d => d + 1), 500 + i * 620));
    const end = setTimeout(onDone, 500 + tasks.length * 620 + 320);
    return () => { [...timers, end].forEach(clearTimeout); };
  }, []);

  return (
    <div style={{ textAlign:'center', padding:'28px 0 40px' }}>
      <motion.div animate={{ scale:[1,1.14,1], opacity:[0.6,1,0.6] }}
        transition={{ repeat:Infinity, duration:2 }}
        style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 32px',
          background:`linear-gradient(135deg,${TEAL}22,${PUR}22)`,
          border:`2px solid ${TEAL}40`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, color:TEAL }}>
        ✦
      </motion.div>
      <div style={{ fontSize:20, fontWeight:600, color:'white', marginBottom:32,
        letterSpacing:'-0.02em' }}>
        Building your plan
      </div>
      <div style={{ maxWidth:260, margin:'0 auto' }}>
        {tasks.map((task, i) => (
          <motion.div key={task}
            initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
            transition={{ delay: i * 0.62, duration:0.3 }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
              borderBottom: i < tasks.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0,
              transition:'all 0.3s',
              background: done > i ? GRN : 'rgba(255,255,255,0.07)',
              border:`2px solid ${done > i ? GRN : done === i ? TEAL : 'rgba(255,255,255,0.1)'}`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              {done > i
                ? <span style={{ fontSize:8, color:'white', fontWeight:700 }}>✓</span>
                : done === i && (
                  <motion.div animate={{ scale:[1,1.4,1] }} transition={{ repeat:Infinity, duration:0.65 }}
                    style={{ width:5, height:5, borderRadius:'50%', background:TEAL }} />
                )}
            </div>
            <span style={{ fontSize:13, textAlign:'left', transition:'color 0.3s',
              color: done > i ? 'rgba(255,255,255,0.6)' : done === i ? 'white' : 'rgba(255,255,255,0.2)' }}>
              {task}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Savings plan calculator ───────────────────────────────────────────────────

function computePlan(monthlyIncome, expenses) {
  const totalSpend    = expenses.reduce((s, e) => s + e.amount, 0);
  const surplus       = monthlyIncome - totalSpend;
  const savingsActual = Math.max(0, surplus);
  const targetSavings = Math.round(monthlyIncome * 0.20);

  const fixedIds = ['rent', 'transport', 'health'];
  const subsIds  = ['cloud', 'devtools', 'ai', 'domains'];
  const fixedTotal = expenses.filter(e =>  fixedIds.includes(e.id)).reduce((s,e)=>s+e.amount,0);
  const subsTotal  = expenses.filter(e =>  subsIds.includes(e.id)).reduce((s,e)=>s+e.amount,0);
  const varTotal   = expenses.filter(e => !fixedIds.includes(e.id) && !subsIds.includes(e.id)).reduce((s,e)=>s+e.amount,0);

  const recs = [];

  // 1. Auto-save on payday
  const autoSave = Math.max(50, Math.min(savingsActual + Math.round((targetSavings - savingsActual) * 0.5), targetSavings));
  recs.push({
    title: `Auto-transfer €${autoSave} the moment you get paid`,
    detail: 'Move it to a separate savings pot before you spend anything. "Pay yourself first" is the single most effective habit.',
    impact: autoSave,
  });

  // 2. Overspent category
  const overCats = INIT_CATEGORIES.filter(c => {
    const e = expenses.find(x => x.id === c.id);
    return e && e.amount > c.budget;
  });
  if (overCats.length > 0) {
    const cat = overCats[0];
    const e   = expenses.find(x => x.id === cat.id);
    const cut = e.amount - cat.budget;
    recs.push({
      title: `Trim ${cat.label} by €${cut}/mo`,
      detail: `You're €${cut} over your own budget here. Closing this gap alone saves €${cut * 12}/year.`,
      impact: cut,
    });
  }

  // 3. Subscription audit
  if (subsTotal > 80) {
    recs.push({
      title: `Audit your €${subsTotal}/mo tool subscriptions`,
      detail: 'Cloud, devtools, and AI subs overlap heavily. Most developers cut €20–35/mo with zero productivity loss.',
      impact: 28,
    });
  }

  // 4. Food delivery
  const food = expenses.find(e => e.id === 'food');
  if (food && food.amount > 60) {
    recs.push({
      title: 'Cook twice more a week instead of ordering',
      detail: `Each skipped delivery saves ~€12. Twice a week = €${12*2*4}/mo and €${12*2*4*12}/year — without cutting your social life.`,
      impact: 12 * 2 * 4,
    });
  }

  // 5. Gap close (if still under target)
  if (savingsActual < targetSavings && recs.length < 4) {
    const gap = targetSavings - savingsActual;
    recs.push({
      title: `Close the remaining €${gap}/mo savings gap`,
      detail: `Your 20% target is €${targetSavings}/mo. Small cuts spread across categories get you there faster than one big sacrifice.`,
      impact: gap,
    });
  }

  return {
    monthlyIncome, totalSpend, surplus, savingsActual, targetSavings,
    split: { fixed: fixedTotal, variable: varTotal, subs: subsTotal, savings: savingsActual },
    recommendations: recs.slice(0, 4),
    yearActual: savingsActual * 12,
    yearTarget: targetSavings * 12,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RunwayPage({ userName = 'USER', onBack, onHome }) {
  const [sources, setSources] = useState(INIT_SOURCES);
  const [categories] = useState(INIT_CATEGORIES);
  const [savings, setSavings] = useState(3400);
  const [editSavings, setEditSavings] = useState(false);
  const [savingsInput, setSavingsInput] = useState(3400);
  const [showAddSource, setShowAddSource] = useState(false);
  const [activeMonth, setActiveMonth] = useState(null);
  const [activeInsight, setActiveInsight] = useState(0);
  const [activeTab, setActiveTab]       = useState('overview');
  const [dealSearch, setDealSearch]     = useState('');
  const [dealCategory, setDealCategory] = useState('All');
  const [linkedAccounts, setLinkedAccounts] = useState(INIT_LINKED);
  const [connectingBank, setConnectingBank]   = useState(null);
  const [bankSearch, setBankSearch]           = useState(null); // null = collapsed

  const unlinkAccount = id => setLinkedAccounts(prev => prev.filter(a => a.id !== id));
  const connectBank   = bank => {
    if (linkedAccounts.some(a => a.bank === bank.name) || connectingBank) return;
    setConnectingBank(bank.name);
    setTimeout(() => {
      setLinkedAccounts(prev => [...prev, {
        id: Date.now(), bank: bank.name, type: 'Current Account',
        last4: String(Math.floor(1000 + Math.random() * 9000)),
        balance: Math.round((200 + Math.random() * 3000) * 100) / 100,
        accent: bank.color, syncedMins: 0,
      }]);
      setConnectingBank(null);
    }, 1800);
  };

  const [simPayFreq, setSimPayFreq]       = useState('monthly');
  const [simPayAmount, setSimPayAmount]   = useState(1200);
  const [simExpenses, setSimExpenses]     = useState(
    INIT_CATEGORIES.map(c => ({ id:c.id, label:c.label, icon:c.icon, amount:c.spent, color:c.color }))
  );
  const [simStep, setSimStep]         = useState(1); // 1 | 2 | 'generating' | 3
  const [simDirection, setSimDirection] = useState(1);
  const [simPlan, setSimPlan]         = useState(null);

  const totalIncome = useMemo(() => sources.filter(s => s.active).reduce((sum, s) => sum + s.amount, 0), [sources]);
  const totalSpend  = useMemo(() => categories.reduce((sum, c) => sum + c.spent, 0), [categories]);
  const surplus     = totalIncome - totalSpend;

  const calcRunway = (income, spend, bank) => {
    const deficit = spend - income;
    if (deficit <= 0) return 12;
    return Math.max(0.1, bank / deficit);
  };
  const runway    = calcRunway(totalIncome, totalSpend, savings);
  const simMonthlyIncome =
    simPayFreq === 'weekly'   ? Math.round(simPayAmount * 52 / 12) :
    simPayFreq === 'biweekly' ? Math.round(simPayAmount * 26 / 12) :
    simPayAmount;

  const goSimStep = (next, dir = 1) => { setSimDirection(dir); setSimStep(next); };
  const startSimulate = () => { setSimDirection(1); setSimStep('generating'); };
  const overspend = categories.filter(c => c.spent > c.budget);

  useEffect(() => {
    const id = setInterval(() => setActiveInsight(i => (i + 1) % INSIGHTS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const addSource    = src  => setSources(s => [...s, src]);
  const toggleSource = id   => setSources(s => s.map(x => x.id===id ? { ...x, active:!x.active } : x));
  const editSource   = (id, amount) => setSources(s => s.map(x => x.id===id ? { ...x, amount } : x));
  const deleteSource = id   => setSources(s => s.filter(x => x.id !== id));

  const clampedRunway = Math.min(runway, 12);
  const runwayColor   = clampedRunway < 3 ? '#F87171' : clampedRunway < 6 ? ORG : GRN;

  return (
    <div style={{ display:'flex', width:'100vw', height:'100vh', overflow:'hidden',
      background:BG, fontFamily:'Manrope,sans-serif', position:'relative' }}>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onBack={onBack} />

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        <DashHeader userName={userName} runway={runway} />

        {/* Tool cards row */}
        <div style={{ padding:'0 28px 18px', display:'flex', gap:10, overflowX:'auto',
          flexShrink:0, scrollbarWidth:'none' }}>
          {sources.filter(s => s.active && s.amount > 0).map(src => (
            <ToolCard key={src.id} source={src} />
          ))}
          <AddToolCard onClick={() => setActiveTab('accounts')} />
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 28px 28px',
          scrollbarWidth:'thin', scrollbarColor:'rgba(139,92,246,0.2) transparent' }}>
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW — free-form canvas, every card is position:absolute ── */}
            {activeTab === 'overview' && (
              <motion.div key="overview"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-6 }} transition={{ duration:0.28 }}
                style={{ position:'relative', height:580 }}>

                {/* ── Balance Card ── top / left */}
                <div style={{ position:'absolute', top:0, left:0 }}>
                  <BalanceCard
                    savings={savings} userName={userName}
                    editSavings={editSavings} savingsInput={savingsInput}
                    setSavingsInput={setSavingsInput} setSavings={setSavings}
                    setEditSavings={setEditSavings}
                  />
                </div>

                {/* ── Insight Card ── top:245 = card height(225) + gap(20) */}
                <div style={{ position:'absolute', top:245, left:0, width:400, bottom:0 }}>
                  <InsightCard
                    insights={INSIGHTS}
                    activeInsight={activeInsight}
                    onPrev={() => setActiveInsight(i => (i - 1 + INSIGHTS.length) % INSIGHTS.length)}
                    onNext={() => setActiveInsight(i => (i + 1) % INSIGHTS.length)}
                  />
                </div>

                {/* ── Spending History ── left:420 = card width(400) + gap(20) */}
                <div style={{ position:'absolute', top:0, left:420, right:630, bottom:0,
                  borderRadius:20, padding:'18px 20px', background:CARD, boxSizing:'border-box',
                  display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexShrink:0 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'white' }}>Spending History</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.28)',
                      background:'rgba(255,255,255,0.05)', padding:'4px 10px', borderRadius:7 }}>
                      May 2026 ↓
                    </span>
                  </div>
                  <SpendingHistory />
                </div>

                {/* ── Spending Rate sparkline — right:0, top half */}
                <div style={{ position:'absolute', top:0, right:0, width:610, height:280 }}>
                  <SpendingRateCard />
                </div>

                {/* ── Runway Predictor sparkline — right:0, bottom half */}
                <div style={{ position:'absolute', top:300, right:0, width:610, bottom:0 }}>
                  <RunwayPredictorCard />
                </div>

              </motion.div>
            )}

            {/* ── ACCOUNTS ── */}
            {activeTab === 'accounts' && (
              <motion.div key="accounts" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.28 }}>

                {/* Header */}
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontSize:20, fontWeight:600, color:'white',
                    letterSpacing:'-0.02em', marginBottom:5 }}>
                    Linked Accounts
                  </div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.32)' }}>
                    {linkedAccounts.length === 0
                      ? 'No accounts connected yet'
                      : `${linkedAccounts.length} account${linkedAccounts.length !== 1 ? 's' : ''} · €${
                          linkedAccounts.reduce((s,a) => s + a.balance, 0)
                            .toLocaleString('en',{minimumFractionDigits:2})} total`}
                  </div>
                </div>

                {/* Card row */}
                <div style={{ display:'flex', gap:20, flexWrap:'wrap',
                  alignItems:'flex-start', marginBottom:36 }}>
                  <AnimatePresence>
                    {linkedAccounts.map(acc => (
                      <BankCard key={acc.id} account={acc} onUnlink={unlinkAccount} />
                    ))}
                  </AnimatePresence>
                  <AddBankCard
                    onClick={() => setBankSearch(b => b === null ? '' : null)}
                    isOpen={bankSearch !== null} />
                </div>

                {/* Connect panel — slides in below cards */}
                <AnimatePresence>
                  {bankSearch !== null && (
                    <motion.div key="connect"
                      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                      exit={{ opacity:0, y:6 }} transition={{ duration:0.2 }}
                      style={{ maxWidth:400 }}>

                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)',
                        fontWeight:500, marginBottom:12 }}>
                        Connect a bank
                      </div>

                      <input value={bankSearch} onChange={e => setBankSearch(e.target.value)}
                        placeholder="Search your bank…" autoFocus
                        style={{ width:'100%', boxSizing:'border-box', outline:'none',
                          fontFamily:'inherit', background:'rgba(255,255,255,0.05)',
                          border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
                          padding:'10px 14px', fontSize:12, color:'rgba(255,255,255,0.8)',
                          marginBottom:6 }} />

                      <div style={{ borderRadius:12, overflow:'hidden', background:CARD }}>
                        {BANK_OPTIONS
                          .filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
                          .map(bank => (
                            <div key={bank.name} style={{ padding:'0 16px' }}>
                              <BankListRow bank={bank}
                                onConnect={connectBank}
                                isConnected={linkedAccounts.some(a => a.bank === bank.name)}
                                isConnecting={connectingBank === bank.name} />
                            </div>
                          ))}
                      </div>

                      <div style={{ marginTop:10, fontSize:10,
                        color:'rgba(255,255,255,0.18)' }}>
                        Read-only access · PSD2 / Open Banking
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}

            {/* ── SIMULATOR ── */}
            {activeTab === 'simulator' && (
              <motion.div key="simulator" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.28 }}
                style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ width:'100%', maxWidth:520 }}>

                  {/* Step indicator — hidden during generating */}
                  {simStep !== 'generating' && <SimStepIndicator step={simStep} />}

                  <AnimatePresence mode="wait" custom={simDirection}>

                    {/* ── STEP 1: Income ── */}
                    {simStep === 1 && (
                      <motion.div key="s1"
                        custom={simDirection}
                        initial={d => ({ x: d * 48, opacity:0 })}
                        animate={{ x:0, opacity:1, transition:{ duration:0.32, ease:[0.22,1,0.36,1] } }}
                        exit={d => ({ x: -d * 48, opacity:0, transition:{ duration:0.2 } })}>

                        <div style={{ textAlign:'center', marginBottom:32 }}>
                          <div style={{ fontSize:22, fontWeight:600, color:'white',
                            letterSpacing:'-0.02em', marginBottom:8 }}>
                            How do you get paid?
                          </div>
                          <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>
                            We'll convert this to a monthly figure for your plan.
                          </div>
                        </div>

                        {/* Frequency tiles */}
                        <div style={{ display:'flex', gap:10, marginBottom:28 }}>
                          {[
                            ['weekly',   'Weekly',    'Every 7 days'  ],
                            ['biweekly', 'Bi-weekly', 'Every 2 weeks' ],
                            ['monthly',  'Monthly',   'Once a month'  ],
                          ].map(([val, label, sub]) => (
                            <motion.button key={val} onClick={() => setSimPayFreq(val)}
                              whileHover={{ y:-2 }} whileTap={{ scale:0.97 }}
                              style={{ flex:1, padding:'18px 10px', borderRadius:14,
                                fontFamily:'inherit', cursor:'pointer', transition:'all 0.15s',
                                background: simPayFreq===val ? `${TEAL}18` : 'rgba(255,255,255,0.04)',
                                border:`2px solid ${simPayFreq===val ? `${TEAL}50` : 'rgba(255,255,255,0.07)'}`,
                                boxShadow: simPayFreq===val ? `0 0 20px ${TEAL}18` : 'none' }}>
                              <div style={{ fontSize:13, fontWeight:600, marginBottom:4,
                                color: simPayFreq===val ? TEAL : 'rgba(255,255,255,0.65)' }}>
                                {label}
                              </div>
                              <div style={{ fontSize:10,
                                color: simPayFreq===val ? `${TEAL}99` : 'rgba(255,255,255,0.25)' }}>
                                {sub}
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        {/* Amount */}
                        <div style={{ marginBottom:10 }}>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)',
                            textAlign:'center', marginBottom:16 }}>
                            {simPayFreq === 'weekly' ? 'Weekly' : simPayFreq === 'biweekly' ? 'Per-paycheck' : 'Monthly'} take-home (after tax)
                          </div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <span style={{ fontSize:28, color:'rgba(255,255,255,0.2)',
                              fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>€</span>
                            <input type="number" value={simPayAmount}
                              onChange={e => setSimPayAmount(Number(e.target.value))}
                              style={{ background:'transparent', border:'none', outline:'none',
                                fontSize:52, fontWeight:700, color:'white', width:200,
                                textAlign:'center', fontFamily:"'JetBrains Mono',monospace",
                                letterSpacing:'-0.04em' }} />
                          </div>
                          {simPayFreq !== 'monthly' && (
                            <div style={{ textAlign:'center', fontSize:12,
                              color:'rgba(255,255,255,0.28)', marginTop:10 }}>
                              ≈ €{simMonthlyIncome.toLocaleString()} per month
                            </div>
                          )}
                        </div>

                        <motion.button onClick={() => goSimStep(2, 1)}
                          whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
                          style={{ width:'100%', marginTop:28, padding:'15px', borderRadius:13,
                            border:'none', cursor:'pointer', fontFamily:'inherit',
                            fontSize:14, fontWeight:600,
                            background:`linear-gradient(135deg,${TEAL}28,${PUR}28)`,
                            border:`1px solid ${TEAL}30`, color:'white' }}>
                          Continue →
                        </motion.button>
                      </motion.div>
                    )}

                    {/* ── STEP 2: Spending ── */}
                    {simStep === 2 && (
                      <motion.div key="s2"
                        custom={simDirection}
                        initial={d => ({ x: d * 48, opacity:0 })}
                        animate={{ x:0, opacity:1, transition:{ duration:0.32, ease:[0.22,1,0.36,1] } }}
                        exit={d => ({ x: -d * 48, opacity:0, transition:{ duration:0.2 } })}>

                        <div style={{ textAlign:'center', marginBottom:28 }}>
                          <div style={{ fontSize:22, fontWeight:600, color:'white',
                            letterSpacing:'-0.02em', marginBottom:8 }}>
                            What do you spend each month?
                          </div>
                          <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>
                            Edit any amount — approximate is fine.
                          </div>
                        </div>

                        {/* Expense list */}
                        <div style={{ borderRadius:16, overflow:'hidden', background:CARD,
                          marginBottom:10 }}>
                          {simExpenses.map((expense, i) => (
                            <div key={expense.id} style={{ display:'flex', alignItems:'center',
                              gap:12, padding:'12px 18px',
                              borderBottom: i < simExpenses.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                              <div style={{ width:22, height:22, borderRadius:5, flexShrink:0,
                                background:`${expense.color}20`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:10, fontWeight:700, color:expense.color }}>
                                {expense.label[0]}
                              </div>
                              <span style={{ flex:1, fontSize:12, color:'rgba(255,255,255,0.62)' }}>
                                {expense.label}
                              </span>
                              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)',
                                  fontFamily:"'JetBrains Mono',monospace" }}>€</span>
                                <input type="number" value={expense.amount}
                                  onChange={e => setSimExpenses(prev =>
                                    prev.map(x => x.id===expense.id ? {...x, amount:Number(e.target.value)} : x)
                                  )}
                                  style={{ width:64, background:'transparent', border:'none',
                                    borderBottom:'1px solid rgba(255,255,255,0.14)', outline:'none',
                                    fontSize:13, fontWeight:600, color:'white', textAlign:'right',
                                    fontFamily:"'JetBrains Mono',monospace", padding:'2px 0' }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div style={{ display:'flex', justifyContent:'space-between',
                          padding:'10px 18px', borderRadius:10, marginBottom:24,
                          background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.38)' }}>Total spending</span>
                          <span style={{ fontSize:13, fontWeight:700, color:'white',
                            fontFamily:"'JetBrains Mono',monospace" }}>
                            €{simExpenses.reduce((s,e)=>s+e.amount,0).toLocaleString()}/mo
                          </span>
                        </div>

                        {/* Nav */}
                        <div style={{ display:'flex', gap:10 }}>
                          <button onClick={() => goSimStep(1, -1)}
                            style={{ flex:1, padding:'13px', borderRadius:12,
                              background:'rgba(255,255,255,0.04)',
                              border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer',
                              fontFamily:'inherit', fontSize:13, color:'rgba(255,255,255,0.5)' }}>
                            ← Back
                          </button>
                          <motion.button onClick={startSimulate}
                            whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
                            style={{ flex:2, padding:'13px', borderRadius:12, border:'none',
                              cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600,
                              background:`linear-gradient(135deg,${TEAL}28,${PUR}28)`,
                              border:`1px solid ${TEAL}30`, color:'white' }}>
                            Generate My Plan →
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── GENERATING ── */}
                    {simStep === 'generating' && (
                      <motion.div key="gen"
                        initial={{ scale:0.96, opacity:0 }}
                        animate={{ scale:1, opacity:1, transition:{ duration:0.3 } }}
                        exit={{ scale:1.02, opacity:0, transition:{ duration:0.2 } }}>
                        <GeneratingStep onDone={() => {
                          setSimPlan(computePlan(simMonthlyIncome, simExpenses));
                          goSimStep(3, 1);
                        }} />
                      </motion.div>
                    )}

                    {/* ── STEP 3: Plan ── */}
                    {simStep === 3 && simPlan && (
                      <motion.div key="s3"
                        custom={simDirection}
                        initial={d => ({ x: d * 48, opacity:0 })}
                        animate={{ x:0, opacity:1, transition:{ duration:0.32, ease:[0.22,1,0.36,1] } }}
                        exit={d => ({ x: -d * 48, opacity:0, transition:{ duration:0.2 } })}
                        style={{ display:'flex', flexDirection:'column', gap:12 }}>

                        {/* Header */}
                        <div style={{ textAlign:'center', marginBottom:8 }}>
                          <div style={{ fontSize:22, fontWeight:600, color:'white',
                            letterSpacing:'-0.02em', marginBottom:6 }}>
                            Your Savings Plan
                          </div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.32)' }}>
                            Based on €{simPlan.monthlyIncome.toLocaleString()}/mo income
                            · €{simPlan.totalSpend.toLocaleString()}/mo spending
                          </div>
                        </div>

                        {/* Budget split */}
                        <div style={{ borderRadius:16, padding:'20px 22px', background:CARD }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.45)',
                            marginBottom:18 }}>Where your money goes</div>
                          {[
                            { label:'Fixed costs',   amount:simPlan.split.fixed,    color:PUR  },
                            { label:'Variable',      amount:simPlan.split.variable,  color:TEAL },
                            { label:'Subscriptions', amount:simPlan.split.subs,     color:ORG  },
                            { label:'Savings',       amount:simPlan.split.savings,  color:GRN  },
                          ].map((item, i) => {
                            const pct = Math.round((item.amount / simPlan.monthlyIncome) * 100);
                            return (
                              <div key={item.label} style={{ marginBottom:14 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.52)' }}>{item.label}</span>
                                  <span style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace",
                                    color:'rgba(255,255,255,0.7)' }}>
                                    €{item.amount} · {pct}%
                                  </span>
                                </div>
                                <div style={{ height:6, borderRadius:3,
                                  background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                                  <motion.div
                                    initial={{ width:0 }} animate={{ width:`${Math.min(pct,100)}%` }}
                                    transition={{ duration:0.8, ease:[0.22,1,0.36,1], delay:0.1 + i*0.07 }}
                                    style={{ height:'100%', borderRadius:3, background:item.color }} />
                                </div>
                              </div>
                            );
                          })}
                          {simPlan.savingsActual < simPlan.targetSavings && (
                            <div style={{ fontSize:11, color:ORG, lineHeight:1.6, marginTop:6,
                              padding:'10px 12px', borderRadius:8, background:`${ORG}0a`,
                              border:`1px solid ${ORG}20` }}>
                              You're €{simPlan.targetSavings - simPlan.savingsActual}/mo short of the 20% target.
                              The steps below close that gap.
                            </div>
                          )}
                        </div>

                        {/* Recommendations */}
                        <div style={{ borderRadius:16, padding:'20px 22px', background:CARD }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.45)',
                            marginBottom:16 }}>Your action plan</div>
                          {simPlan.recommendations.map((rec, i) => (
                            <motion.div key={i}
                              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                              transition={{ delay:0.1 + i * 0.09 }}
                              style={{ display:'flex', gap:13, padding:'12px 0',
                                borderBottom: i < simPlan.recommendations.length-1
                                  ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              <div style={{ width:24, height:24, borderRadius:7, flexShrink:0,
                                background:'rgba(255,255,255,0.06)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)' }}>
                                {i + 1}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:600,
                                  color:'rgba(255,255,255,0.88)', marginBottom:4 }}>
                                  {rec.title}
                                </div>
                                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)',
                                  lineHeight:1.7 }}>
                                  {rec.detail}
                                </div>
                              </div>
                              {rec.impact > 0 && (
                                <div style={{ flexShrink:0, fontSize:13, fontWeight:700,
                                  color:GRN, fontFamily:"'JetBrains Mono',monospace", paddingTop:2 }}>
                                  +€{rec.impact}/mo
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>

                        {/* Annual projection */}
                        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                          transition={{ delay:0.5 }}
                          style={{ borderRadius:14, padding:'18px 22px',
                            background:`${GRN}08`, border:`1px solid ${GRN}22`,
                            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.55)',
                              marginBottom:3 }}>Annual savings potential</div>
                            <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>
                              Following this plan
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                              transition={{ delay:0.7 }}
                              style={{ fontSize:28, fontWeight:700, color:GRN, lineHeight:1,
                                fontFamily:"'JetBrains Mono',monospace", letterSpacing:'-0.03em' }}>
                              €{simPlan.yearTarget.toLocaleString()}
                            </motion.div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:3 }}>
                              saved in 12 months
                            </div>
                          </div>
                        </motion.div>

                        {/* Footer actions */}
                        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                          <button onClick={() => goSimStep(2, -1)}
                            style={{ flex:1, padding:'11px', borderRadius:10, cursor:'pointer',
                              background:'rgba(255,255,255,0.04)',
                              border:'1px solid rgba(255,255,255,0.08)', fontFamily:'inherit',
                              fontSize:12, color:'rgba(255,255,255,0.45)' }}>
                            ← Adjust spending
                          </button>
                          <button onClick={() => { setSimPlan(null); goSimStep(1, -1); }}
                            style={{ flex:1, padding:'11px', borderRadius:10, cursor:'pointer',
                              background:'rgba(255,255,255,0.04)',
                              border:'1px solid rgba(255,255,255,0.08)', fontFamily:'inherit',
                              fontSize:12, color:'rgba(255,255,255,0.45)' }}>
                            Start over
                          </button>
                        </div>

                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── DEALS ── */}
            {activeTab === 'deals' && (() => {
              const filtered = STUDENT_DEALS.filter(d => {
                const q = dealSearch.toLowerCase();
                const matchSearch = !q || d.name.toLowerCase().includes(q)
                  || d.desc.toLowerCase().includes(q)
                  || d.category.toLowerCase().includes(q)
                  || d.discount.toLowerCase().includes(q);
                const matchCat = dealCategory === 'All' || d.category === dealCategory;
                return matchSearch && matchCat;
              });
              return (
                <motion.div key="deals" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.28 }}>

                  {/* Search bar */}
                  <div style={{ position:'relative', marginBottom:16 }}>
                    <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                      fontSize:15, color:'rgba(255,255,255,0.22)', pointerEvents:'none' }}>⌕</span>
                    <input value={dealSearch} onChange={e => setDealSearch(e.target.value)}
                      placeholder="Search deals — GitHub, Spotify, transport, finance…"
                      style={{ width:'100%', boxSizing:'border-box', outline:'none', fontFamily:'inherit',
                        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
                        borderRadius:12, padding:'13px 16px 13px 42px',
                        fontSize:13, color:'rgba(255,255,255,0.8)' }} />
                    {dealSearch && (
                      <button onClick={() => setDealSearch('')}
                        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', cursor:'pointer',
                          fontSize:16, color:'rgba(255,255,255,0.3)', lineHeight:1 }}>×</button>
                    )}
                  </div>

                  {/* Category pills */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
                    {DEAL_CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setDealCategory(cat)}
                        style={{ padding:'6px 14px', borderRadius:20, fontSize:11, fontFamily:'inherit',
                          cursor:'pointer', transition:'all 0.15s', fontWeight: dealCategory===cat ? 600 : 400,
                          background: dealCategory===cat ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${dealCategory===cat ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)'}`,
                          color: dealCategory===cat ? 'white' : 'rgba(255,255,255,0.4)' }}>
                        {cat}
                        {cat !== 'All' && (
                          <span style={{ marginLeft:5, fontSize:9, color:'rgba(255,255,255,0.3)' }}>
                            {STUDENT_DEALS.filter(d => d.category === cat).length}
                          </span>
                        )}
                      </button>
                    ))}
                    <span style={{ marginLeft:'auto', fontSize:11, color:'rgba(255,255,255,0.25)',
                      alignSelf:'center' }}>
                      {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Deal cards grid */}
                  {filtered.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'48px 0',
                      fontSize:13, color:'rgba(255,255,255,0.2)' }}>
                      No deals found for "{dealSearch}"
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                      <AnimatePresence>
                        {filtered.map((deal, i) => {
                          const tagClr = TAG_COLORS[deal.tag] || GRN;
                          return (
                            <motion.div key={deal.id}
                              layout
                              initial={{ opacity:0, y:8, scale:0.98 }}
                              animate={{ opacity:1, y:0, scale:1 }}
                              exit={{ opacity:0, scale:0.96 }}
                              transition={{ duration:0.2, delay: i < 12 ? i * 0.03 : 0 }}
                              whileHover={{ y:-3 }}
                              style={{ borderRadius:14, padding:'18px 18px 16px',
                                background:CARD, cursor:'default',
                                border:'1px solid rgba(255,255,255,0.05)',
                                display:'flex', flexDirection:'column', gap:10,
                                transition:'border-color 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor=`${deal.color}30`}
                              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}>

                              {/* Top: avatar + tag */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                                  background:`${deal.color}18`,
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:15, fontWeight:700, color:deal.color }}>
                                  {deal.name[0]}
                                </div>
                                <span style={{ fontSize:8, padding:'3px 8px', borderRadius:6,
                                  background:`${tagClr}15`, color:tagClr,
                                  fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
                                  letterSpacing:'0.06em' }}>
                                  {deal.tag}
                                </span>
                              </div>

                              {/* Name + category */}
                              <div>
                                <div style={{ fontSize:13, fontWeight:600,
                                  color:'rgba(255,255,255,0.88)', marginBottom:2 }}>
                                  {deal.name}
                                </div>
                                <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)' }}>
                                  {deal.category}
                                </div>
                              </div>

                              {/* Discount value */}
                              <div style={{ fontSize:14, fontWeight:700, color:tagClr,
                                letterSpacing:'-0.01em' }}>
                                {deal.discount}
                              </div>

                              {/* Description */}
                              <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)',
                                lineHeight:1.65, marginTop:-2 }}>
                                {deal.desc}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                </motion.div>
              );
            })()}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
