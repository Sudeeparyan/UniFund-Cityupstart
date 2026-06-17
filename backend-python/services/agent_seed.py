"""
Python port of agentData.js xorshift32 RNG.
JS: x = (seed ^ 0xdeadbeef) >>> 0  (unsigned 32-bit)
Python: use & 0xFFFFFFFF after every XOR to emulate unsigned 32-bit
"""
import math

PREFIXES = [
    'ARI','NOX','VED','ORI','LUM','SOR','ECH','FLU','NOV','ZAR',
    'KAI','REX','MIR','DSK','LYR','JAD','PIN','CRS','WAV','ISL',
    'AXE','BYR','CEL','DYN','EVA','FAR','GYR','HAL','IXI','JOV',
    'KUL','LOR','MYX','NEB','OXY','PYR','QUA','RYL','SYN','TOR',
    'URN','VEX','WYN','XEN','YOR','ZEN','ALT','BEX','CYR','DAX',
]
SUFFIXES = [
    'A','O','IX','ON','AR','EN','IS','RA','EX','OS',
    'AN','UR','IN','AL','AX','OR','EL','IK','YN','AV',
    'OX','EM','IT','RO','US','IA','EK','UL','AD','OT',
]

EXPERT_ICONS = ['🔮','🧬','⚡','🌀','💎','🔬','🌌','🧠']
COMM_ICONS   = ['🌊','🌿','💫','🎯','🌟','💡','🎪','🔵']
NEW_ICONS    = ['✨','🌱','○','◈','·','▸','◦','∘']

NOTABLE_BIOS = [
    'Mastered 9,842 career-path simulations. Guides others now.',
    'Serial founder, 3 exits. Maps startup probability spaces.',
    'Masters abroad veteran. Built the study-abroad skill tree.',
    'Decodes founder failure modes before they happen.',
    'Growth oracle — identified 7,301 divergence points.',
    'AI alignment researcher turned life-path simulator.',
    'Emerged from 12,000 identity simulations. Still evolving.',
    'Quantifies uncertainty. Makes chaos navigable.',
    'Supernova energy. Lights up dormant paths for others.',
    'Zero to one, repeatedly. High signal, low noise.',
    'Bridge between worlds. Community builder across skill gaps.',
    'Recursive thinker. Finds shortcuts in life mazes.',
    'Mirror-node. Reflects hidden paths back to the seeker.',
    'Twilight traveler. Specializes in career-pivot crossroads.',
    'Resonance expert. Harmonizes conflicting life goals.',
    'Crafts clarity from ambiguity for 1,200+ agents.',
    'Root system of the web. Deeply connected to all.',
    'Ridgeline walker. Navigates high-risk, high-reward paths.',
    'Waveform navigator. Surfs probability currents.',
    'Island hopper. Finds overlooked opportunities in gaps.',
    'Axes through complexity. Gets to the essential fast.',
    'Rare convergence node. Bridges distant skill clusters.',
    'Celestial mapper. Charts long-horizon life trajectories.',
    'Dynamic systems thinker. Models life as a living network.',
    'Emergence specialist. Helps patterns become clarity.',
    'Far-field scout. Explores futures others avoid.',
    'Gyroscope. Stabilizes agents during high-uncertainty phases.',
    'Harmonic node. Reduces friction between life goals.',
    'Iterative explorer. Runs micro-experiments on every path.',
    'Jovian presence. High gravity, pulls insights into orbit.',
]

REAL_PEOPLE = [
    {'name':'SUDEEP', 'full_name':'Sudeep Aryan · Founder',  'type':3, 'icon':'★',  'bio':'Building UniFund — the first AI that reasons about your future using your past.', 'score':14280},
    {'name':'RAMYA',  'full_name':'Ramya · AI Explorer',     'type':2, 'icon':'🔮', 'bio':'AI enthusiast navigating the intersection of technology and human potential.', 'score':12500},
    {'name':'SAJU',   'full_name':'Saju · Builder',          'type':2, 'icon':'🌌', 'bio':'Builder at heart. Turns complex ideas into working systems.', 'score':11800},
    {'name':'VINAY',  'full_name':'Vinay · Student',         'type':2, 'icon':'⚡', 'bio':'Engineering student exploring AI and life simulations. Early adopter.', 'score':11200},
    {'name':'MASTH',  'full_name':'Masthan · Student',       'type':2, 'icon':'🌀', 'bio':'CS undergrad figuring out the right career path. Curious mind.', 'score':10600},
    {'name':'GEETH',  'full_name':'Geethika · Rising Star',  'type':2, 'icon':'💫', 'bio':'Rising star in the agentic web. Connecting knowledge, skills, and ambition.', 'score':10100},
]

NOTABLE = [
    {'name':'ARIA',  'full_name':'ARIA · Career Switch',   'type':2, 'icon':'🧠', 'bio':NOTABLE_BIOS[0],  'score':9842},
    {'name':'NOX',   'full_name':'NOX · Founder',           'type':2, 'icon':'⚡', 'bio':NOTABLE_BIOS[1],  'score':9120},
    {'name':'VEDA',  'full_name':'VEDA · Masters Abroad',   'type':2, 'icon':'🔮', 'bio':NOTABLE_BIOS[2],  'score':8633},
    {'name':'ORION', 'full_name':'ORION · Founder',         'type':2, 'icon':'🌌', 'bio':NOTABLE_BIOS[3],  'score':7980},
    {'name':'LUME',  'full_name':'LUME · Personal Growth',  'type':2, 'icon':'💎', 'bio':NOTABLE_BIOS[4],  'score':7301},
    {'name':'SORA',  'full_name':'SORA · AI Research',      'type':2, 'icon':'🧬', 'bio':NOTABLE_BIOS[5],  'score':6880},
    {'name':'ECHO',  'full_name':'ECHO · Identity Pivot',   'type':2, 'icon':'🌀', 'bio':NOTABLE_BIOS[6],  'score':6512},
    {'name':'FLUX',  'full_name':'FLUX · Quant Finance',    'type':2, 'icon':'🔬', 'bio':NOTABLE_BIOS[7],  'score':6044},
    {'name':'NOVA',  'full_name':'NOVA · Creative Path',    'type':2, 'icon':'✨', 'bio':NOTABLE_BIOS[8],  'score':5722},
    {'name':'ZARA',  'full_name':'ZARA · Startup',          'type':2, 'icon':'💡', 'bio':NOTABLE_BIOS[9],  'score':5310},
    {'name':'KAI',   'full_name':'KAI · Bridge Builder',    'type':1, 'icon':'🌊', 'bio':NOTABLE_BIOS[10], 'score':4890},
    {'name':'REX',   'full_name':'REX · Problem Solver',    'type':1, 'icon':'🎯', 'bio':NOTABLE_BIOS[11], 'score':4430},
    {'name':'MIRA',  'full_name':'MIRA · Mirror Node',      'type':1, 'icon':'🌿', 'bio':NOTABLE_BIOS[12], 'score':3980},
    {'name':'DUSK',  'full_name':'DUSK · Crossroads',       'type':1, 'icon':'💫', 'bio':NOTABLE_BIOS[13], 'score':3512},
    {'name':'LYRA',  'full_name':'LYRA · Harmony Guide',    'type':1, 'icon':'🌟', 'bio':NOTABLE_BIOS[14], 'score':3120},
    {'name':'JADE',  'full_name':'JADE · Clarity Maker',    'type':1, 'icon':'🎪', 'bio':NOTABLE_BIOS[15], 'score':2890},
    {'name':'PINE',  'full_name':'PINE · Root Network',     'type':1, 'icon':'🌿', 'bio':NOTABLE_BIOS[16], 'score':2640},
    {'name':'CREST', 'full_name':'CREST · High Risk Path',  'type':1, 'icon':'🔵', 'bio':NOTABLE_BIOS[17], 'score':2310},
    {'name':'WAVE',  'full_name':'WAVE · Surfer',           'type':1, 'icon':'🌊', 'bio':NOTABLE_BIOS[18], 'score':2080},
    {'name':'ISLE',  'full_name':'ISLE · Niche Hunter',     'type':1, 'icon':'💫', 'bio':NOTABLE_BIOS[19], 'score':1840},
    {'name':'AXE',   'full_name':'AXE · Complexity Cutter', 'type':1, 'icon':'🎯', 'bio':NOTABLE_BIOS[20], 'score':1620},
    {'name':'BYR',   'full_name':'BYR · Rare Connector',    'type':0, 'icon':'◈',  'bio':NOTABLE_BIOS[21], 'score':1400},
    {'name':'CEL',   'full_name':'CEL · Long-Arc Mapper',   'type':0, 'icon':'✨', 'bio':NOTABLE_BIOS[22], 'score':1210},
    {'name':'DYN',   'full_name':'DYN · Systems Thinker',   'type':0, 'icon':'🌱', 'bio':NOTABLE_BIOS[23], 'score':1080},
    {'name':'EVA',   'full_name':'EVA · Emergent Pattern',  'type':0, 'icon':'○',  'bio':NOTABLE_BIOS[24], 'score': 920},
    {'name':'FAR',   'full_name':'FAR · Far-Field Scout',   'type':0, 'icon':'▸',  'bio':NOTABLE_BIOS[25], 'score': 810},
    {'name':'GYR',   'full_name':'GYR · Stabilizer',        'type':0, 'icon':'◦',  'bio':NOTABLE_BIOS[26], 'score': 700},
    {'name':'HAL',   'full_name':'HAL · Harmonic Node',     'type':0, 'icon':'∘',  'bio':NOTABLE_BIOS[27], 'score': 610},
    {'name':'IXI',   'full_name':'IXI · Iterator',          'type':0, 'icon':'·',  'bio':NOTABLE_BIOS[28], 'score': 520},
    {'name':'JOV',   'full_name':'JOV · Gravity Well',      'type':0, 'icon':'◈',  'bio':NOTABLE_BIOS[29], 'score': 440},
]


def sr(seed: int) -> float:
    """xorshift32 matching JS: (seed ^ 0xdeadbeef) >>> 0, then shift ops with unsigned 32-bit masking."""
    x = (seed ^ 0xDEADBEEF) & 0xFFFFFFFF
    x ^= (x << 13) & 0xFFFFFFFF
    x ^= (x >> 17) & 0xFFFFFFFF
    x ^= (x << 5)  & 0xFFFFFFFF
    return (x & 0xFFFFFFFF) / 0xFFFFFFFF


def pick_icon(type_: int, idx: int) -> str:
    if type_ == 2:
        return EXPERT_ICONS[int(sr(idx * 7 + 1) * len(EXPERT_ICONS))]
    if type_ == 1:
        return COMM_ICONS[int(sr(idx * 7 + 2) * len(COMM_ICONS))]
    if type_ == 3:
        return '★'
    return NEW_ICONS[int(sr(idx * 7 + 3) * len(NEW_ICONS))]


def make_name(idx: int) -> str:
    pi = int(sr(idx * 3 + 11) * len(PREFIXES))
    si = int(sr(idx * 3 + 17) * len(SUFFIXES))
    return PREFIXES[pi] + SUFFIXES[si]


def _build_agents() -> list:
    agents = []
    # Real people first (high scores, searchable by real name)
    for i, n in enumerate(REAL_PEOPLE):
        agents.append({'idx': 1500 + i, **n})
    # Named AI agents
    for i, n in enumerate(NOTABLE):
        agents.append({'idx': i, **n})

    for i in range(30, 1400):
        name = make_name(i)
        # Default to community type (1) for API — scene assigns real types on client
        type_ = 1
        role_pool = ['Explorer', 'Builder', 'Collaborator', 'Community Node', 'Connector']
        full_name = f"{name} · {role_pool[int(sr(i * 5 + 3) * len(role_pool))]}"
        icon = pick_icon(type_, i)
        bio = f"Node #{i}. {full_name.split('·')[1].strip()} in the UniMind web."
        score = int(sr(i * 13 + 7) * 380) + 10
        agents.append({
            'idx': i,
            'name': name,
            'full_name': full_name,
            'type': type_,
            'icon': icon,
            'bio': bio,
            'score': score,
        })

    agents.append({
        'idx': 1400,
        'name': 'YOU',
        'full_name': 'YOU · just arrived',
        'type': 3,
        'icon': '★',
        'bio': "That's you. Welcome to the web.",
        'score': 100,
    })
    return agents


# Built once at import time
AGENTS: list = _build_agents()
