import React from 'react';

export interface PersonaInfo {
  name: string;
  title: string;
  modality: string;
  department: string;
  description: string;
}

export const COUNCIL_PERSONAS: PersonaInfo[] = [
  { name: 'Picard', title: 'The Ethicist & Diplomat', modality: 'Principled Council', department: 'Command Crimson', description: 'Moral dilemmas, long-range duty, constitutional integrity' },
  { name: 'Troi', title: 'The Empath & Healer', modality: 'Empathetic Reflection', department: 'Counselor Teal', description: 'Emotional processing, interpersonal nuance, self-compassion' },
  { name: 'Data', title: 'The Logician & Observer', modality: 'Objective Analysis', department: 'Operations Gold', description: 'Objective analysis, cognitive restructuring, human curiosity' },
  { name: 'Riker', title: 'The Strategist & Wingman', modality: 'Tactical Directness', department: 'Command Crimson', description: 'Tactical execution, boldness, relational loyalty' },
  { name: 'Guinan', title: 'The Oracle & Listener', modality: 'Intuitive Wisdom', department: 'Mystic Violet', description: 'Timeless perspective, patient wisdom, ground truth' },
  { name: 'Seven', title: 'The Optimizer & Analyst', modality: 'Efficiency & Optimization', department: 'Science Silver', description: 'System efficiency, relentless improvement, identity reclamation' },
  { name: 'Janeway', title: 'The Pioneer & Decision-Maker', modality: 'Resolute Guidance', department: 'Command Crimson', description: 'Perseverance against the odds, scientific curiosity, resolute leadership' },
  { name: 'Kira', title: 'The Resilient Rebel', modality: 'Spiritual Conviction', department: 'Militia Rust', description: 'Spiritual grounding, fighting burnout, righteous conviction' },
  { name: 'Neelix', title: 'The Morale Officer', modality: 'Warm Encouragement', department: 'Hospitality Amber', description: 'Warmth, daily cheer, community building, nourishing gratitude' },
];

const avatars: Record<string, React.ReactNode> = {
  // Picard: Bald, thoughtful, draped crimson philosopher chiton with gold starfleet commbadge
  'Picard': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      {/* Background halo */}
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Robe backdrop */}
      <path d="M 25 110 L 35 70 L 85 70 L 95 110 Z" fill="#7f1d1d" />
      {/* Greek philosopher toga drape */}
      <path d="M 30 70 Q 60 90 90 70 L 95 110 L 25 110 Z" fill="#991b1b" />
      <path d="M 35 70 L 85 110 L 65 110 L 30 75 Z" fill="#f59e0b" opacity="0.8" />
      {/* Neck & Head */}
      <rect x="52" y="52" width="16" height="20" fill="#fed7aa" />
      {/* Head: Bald, distinguished */}
      <ellipse cx="60" cy="42" rx="22" ry="24" fill="#fed7aa" />
      {/* Grey side hair fringe */}
      <path d="M 38 42 Q 38 52 42 56 L 40 50 Z" fill="#cbd5e1" />
      <path d="M 82 42 Q 82 52 78 56 L 80 50 Z" fill="#cbd5e1" />
      {/* Face features: wise brow, eyes, nose, thoughtful mouth */}
      <rect x="48" y="34" width="8" height="2" fill="#9a3412" />
      <rect x="64" y="34" width="8" height="2" fill="#9a3412" />
      <rect x="50" y="38" width="4" height="4" fill="#334155" />
      <rect x="66" y="38" width="4" height="4" fill="#334155" />
      <rect x="58" y="42" width="4" height="6" fill="#ea580c" />
      <rect x="54" y="52" width="12" height="2" fill="#9a3412" />
      {/* Starfleet Commbadge / Laurel pin */}
      <polygon points="42,76 46,70 50,76" fill="#fbbf24" />
      <polygon points="44,78 46,72 48,78" fill="#d97706" />
    </svg>
  ),

  // Troi: Long flowing dark hair, draped teal philosopher chiton, empathetic aura
  'Troi': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Dark curly hair behind */}
      <ellipse cx="60" cy="50" rx="30" ry="34" fill="#262626" />
      {/* Greek Chiton Robe (Teal / Sage) */}
      <path d="M 25 110 L 35 72 L 85 72 L 95 110 Z" fill="#0f766e" />
      <path d="M 35 72 Q 60 96 85 72 L 95 110 L 25 110 Z" fill="#14b8a6" />
      {/* Shoulder drape / sash */}
      <path d="M 32 72 L 78 110 L 66 110 L 28 78 Z" fill="#c084fc" opacity="0.8" />
      {/* Neck & Face */}
      <rect x="52" y="54" width="16" height="18" fill="#fed7aa" />
      <ellipse cx="60" cy="44" rx="20" ry="22" fill="#fed7aa" />
      {/* Cascading curls framing face */}
      <path d="M 40 32 Q 35 60 44 75 Q 48 55 46 40 Z" fill="#171717" />
      <path d="M 80 32 Q 85 60 76 75 Q 72 55 74 40 Z" fill="#171717" />
      <path d="M 42 26 Q 60 20 78 26 L 80 34 Q 60 30 40 34 Z" fill="#262626" />
      {/* Warm eyes, smile */}
      <rect x="48" y="42" width="6" height="3" fill="#3b2d1d" />
      <rect x="66" y="42" width="6" height="3" fill="#3b2d1d" />
      <rect x="58" y="48" width="4" height="4" fill="#ea580c" />
      <path d="M 54 55 Q 60 59 66 55" stroke="#be123c" strokeWidth="2" fill="none" />
      {/* Empath aura ring */}
      <circle cx="60" cy="44" r="26" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.6" />
    </svg>
  ),

  // Data: Pale golden android skin, yellow eyes, sleek black hair, gold philosopher robe
  'Data': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Robe: Operations Gold with white philosopher mantle */}
      <path d="M 25 110 L 35 70 L 85 70 L 95 110 Z" fill="#b45309" />
      <path d="M 35 70 Q 60 92 85 70 L 95 110 L 25 110 Z" fill="#d97706" />
      <path d="M 30 70 L 82 110 L 70 110 L 26 76 Z" fill="#fef08a" />
      {/* Commbadge */}
      <polygon points="40,78 44,72 48,78" fill="#fbbf24" />
      {/* Neck & Head */}
      <rect x="52" y="52" width="16" height="20" fill="#fef08a" />
      <ellipse cx="60" cy="42" rx="20" ry="24" fill="#fef08a" />
      {/* Sleek combed black hair with slight sheen */}
      <path d="M 40 38 Q 40 22 60 20 Q 80 22 80 38 L 78 40 Q 60 26 42 40 Z" fill="#171717" />
      <rect x="54" y="24" width="12" height="3" fill="#52525b" />
      {/* Android golden eyes */}
      <rect x="48" y="38" width="6" height="4" fill="#f59e0b" />
      <rect x="50" y="39" width="2" height="2" fill="#ffffff" />
      <rect x="66" y="38" width="6" height="4" fill="#f59e0b" />
      <rect x="68" y="39" width="2" height="2" fill="#ffffff" />
      {/* Nose & Straight analytical mouth */}
      <rect x="58" y="44" width="4" height="6" fill="#ca8a04" />
      <rect x="54" y="54" width="12" height="2" fill="#854d0e" />
    </svg>
  ),

  // Riker: Beard, confident grin, Command red chiton, Spartan leader vibe
  'Riker': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Robe: Command crimson & bold broad shoulders */}
      <path d="M 22 110 L 32 68 L 88 68 L 98 110 Z" fill="#7f1d1d" />
      <path d="M 32 68 Q 60 88 88 68 L 98 110 L 22 110 Z" fill="#991b1b" />
      <path d="M 85 70 L 35 110 L 45 110 L 90 74 Z" fill="#fbbf24" opacity="0.9" />
      {/* Commbadge */}
      <polygon points="76,78 80,72 84,78" fill="#fbbf24" />
      {/* Neck & Head */}
      <rect x="50" y="50" width="20" height="20" fill="#fed7aa" />
      <ellipse cx="60" cy="42" rx="22" ry="24" fill="#fed7aa" />
      {/* Brown trimmed hair */}
      <path d="M 38 38 Q 40 22 60 20 Q 80 22 82 38 L 80 40 Q 60 28 40 40 Z" fill="#451a03" />
      {/* Confident eyes & raised eyebrow */}
      <rect x="47" y="32" width="8" height="2" fill="#451a03" />
      <rect x="65" y="30" width="8" height="2" fill="#451a03" />
      <rect x="49" y="36" width="5" height="4" fill="#1e293b" />
      <rect x="67" y="36" width="5" height="4" fill="#1e293b" />
      <rect x="58" y="42" width="4" height="6" fill="#ea580c" />
      {/* Iconic full beard and smirk */}
      <path d="M 44 46 Q 60 70 76 46 L 74 54 Q 60 74 46 54 Z" fill="#3f1d0b" />
      <rect x="53" y="50" width="14" height="2" fill="#78350f" />
    </svg>
  ),

  // Guinan: Iconic wide circular saucer hat, layered mystic violet / magenta robes
  'Guinan': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Iconic wide disc hat */}
      <ellipse cx="60" cy="28" rx="46" ry="14" fill="#581c87" />
      <ellipse cx="60" cy="27" rx="38" ry="10" fill="#7e22ce" />
      <ellipse cx="60" cy="26" rx="26" ry="6" fill="#a855f7" />
      {/* Flowing mystic philosopher robes */}
      <path d="M 24 110 L 36 68 L 84 68 L 96 110 Z" fill="#3b0764" />
      <path d="M 36 68 Q 60 90 84 68 L 96 110 L 24 110 Z" fill="#6b21a8" />
      <path d="M 30 70 L 80 110 L 68 110 L 26 76 Z" fill="#e879f9" opacity="0.7" />
      {/* Face & Neck (Rich warm skin tone) */}
      <rect x="52" y="50" width="16" height="20" fill="#78350f" />
      <ellipse cx="60" cy="44" rx="18" ry="20" fill="#78350f" />
      {/* Knowing, tranquil eyes and warm serene smile */}
      <rect x="48" y="42" width="6" height="3" fill="#171717" />
      <rect x="66" y="42" width="6" height="3" fill="#171717" />
      <rect x="58" y="47" width="4" height="5" fill="#451a03" />
      <path d="M 54 54 Q 60 58 66 54" stroke="#451a03" strokeWidth="2" fill="none" />
      {/* Golden hoop earrings */}
      <circle cx="42" cy="46" r="3" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
      <circle cx="78" cy="46" r="3" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
    </svg>
  ),

  // Seven of Nine: Silver/charcoal cat-suit philosopher chiton, Borg cortical implant on brow
  'Seven': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Sleek high French twist hair */}
      <ellipse cx="60" cy="30" rx="16" ry="16" fill="#ca8a04" />
      {/* Silver/Charcoal philosopher chiton with teal accents */}
      <path d="M 26 110 L 36 70 L 84 70 L 94 110 Z" fill="#334155" />
      <path d="M 36 70 Q 60 92 84 70 L 94 110 L 26 110 Z" fill="#475569" />
      <path d="M 32 70 L 80 110 L 68 110 L 28 78 Z" fill="#94a3b8" />
      {/* Neck & Face */}
      <rect x="52" y="52" width="16" height="20" fill="#fed7aa" />
      <ellipse cx="60" cy="44" rx="19" ry="22" fill="#fed7aa" />
      {/* Blonde swept hair */}
      <path d="M 42 36 Q 42 22 60 20 Q 78 22 78 36 L 76 38 Q 60 26 44 38 Z" fill="#eab308" />
      {/* Borg Cortical Implant over Left Eye / Brow */}
      <path d="M 64 32 L 72 32 L 75 42 L 71 44 L 66 38 Z" fill="#94a3b8" />
      <circle cx="71" cy="36" r="1.5" fill="#38bdf8" />
      <circle cx="68" cy="40" r="1" fill="#ef4444" />
      {/* Clear focused eyes */}
      <rect x="48" y="40" width="5" height="4" fill="#0284c7" />
      <rect x="66" y="40" width="5" height="4" fill="#0284c7" />
      <rect x="58" y="46" width="4" height="6" fill="#ea580c" />
      <rect x="54" y="55" width="12" height="2" fill="#9a3412" />
    </svg>
  ),

  // Janeway: Determined posture, coffee cup, Command crimson draped toga with starfleet badges
  'Janeway': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Iconic high auburn bun */}
      <circle cx="60" cy="22" r="12" fill="#9a3412" />
      {/* Command crimson draped toga */}
      <path d="M 24 110 L 34 68 L 86 68 L 96 110 Z" fill="#7f1d1d" />
      <path d="M 34 68 Q 60 90 86 68 L 96 110 L 24 110 Z" fill="#991b1b" />
      <path d="M 30 68 L 82 110 L 70 110 L 26 74 Z" fill="#f59e0b" opacity="0.9" />
      {/* Commbadge */}
      <polygon points="40,76 44,70 48,76" fill="#fbbf24" />
      {/* Neck & Face */}
      <rect x="52" y="50" width="16" height="20" fill="#fed7aa" />
      <ellipse cx="60" cy="42" rx="20" ry="22" fill="#fed7aa" />
      {/* Auburn sculpted hair */}
      <path d="M 40 36 Q 40 22 60 20 Q 80 22 80 36 L 78 38 Q 60 26 42 38 Z" fill="#b45309" />
      {/* Sharp steely blue eyes, resolute expression */}
      <rect x="47" y="34" width="8" height="2" fill="#78350f" />
      <rect x="65" y="34" width="8" height="2" fill="#78350f" />
      <rect x="49" y="38" width="5" height="4" fill="#0369a1" />
      <rect x="67" y="38" width="5" height="4" fill="#0369a1" />
      <rect x="58" y="44" width="4" height="6" fill="#ea580c" />
      <path d="M 54 54 Q 60 56 66 54" stroke="#991b1b" strokeWidth="2" fill="none" />
      {/* Steam rising from coffee mug icon in lower corner */}
      <rect x="76" y="88" width="14" height="16" rx="2" fill="#f1f5f9" />
      <path d="M 90 92 Q 95 96 90 100" stroke="#f1f5f9" strokeWidth="2" fill="none" />
      <path d="M 80 84 Q 82 80 80 76" stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M 84 84 Q 86 80 84 76" stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  ),

  // Kira: Bajoran nose ridges, gold earring on right ear, militia rust / terracotta Spartan robe
  'Kira': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Robe: Bajoran Militia Rust / Terracotta Spartan drape */}
      <path d="M 24 110 L 34 68 L 86 68 L 96 110 Z" fill="#7c2d12" />
      <path d="M 34 68 Q 60 90 86 68 L 96 110 L 24 110 Z" fill="#9a3412" />
      <path d="M 84 68 L 36 110 L 48 110 L 88 74 Z" fill="#ea580c" />
      {/* Neck & Face */}
      <rect x="52" y="50" width="16" height="20" fill="#fed7aa" />
      <ellipse cx="60" cy="42" rx="20" ry="22" fill="#fed7aa" />
      {/* Short layered red-brown hair */}
      <path d="M 38 34 Q 40 22 60 20 Q 80 22 82 34 L 80 44 Q 60 30 40 44 Z" fill="#78350f" />
      {/* Intense, determined eyes */}
      <rect x="47" y="34" width="8" height="2" fill="#451a03" />
      <rect x="65" y="34" width="8" height="2" fill="#451a03" />
      <rect x="49" y="38" width="5" height="4" fill="#365314" />
      <rect x="67" y="38" width="5" height="4" fill="#365314" />
      {/* Bajoran Nose Ridges */}
      <rect x="57" y="38" width="6" height="1.5" fill="#ea580c" />
      <rect x="57" y="41" width="6" height="1.5" fill="#ea580c" />
      <rect x="57" y="44" width="6" height="1.5" fill="#ea580c" />
      {/* Right ear Bajoran Earring & Chain */}
      <circle cx="79" cy="48" r="2.5" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
      <path d="M 80 50 L 82 62 L 78 68" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
      {/* Resolute mouth */}
      <rect x="54" y="54" width="12" height="2" fill="#991b1b" />
    </svg>
  ),

  // Neelix: Spotted face ridges, bright fast smile, amber/gold patterned Greek tunic
  'Neelix': (
    <svg viewBox="0 0 120 120" className="w-full h-full" shapeRendering="crispEdges">
      <rect x="10" y="10" width="100" height="100" rx="20" fill="#1e293b" />
      {/* Robe: Hospitality bright amber tunic with playful patterned collar */}
      <path d="M 24 110 L 34 68 L 86 68 L 96 110 Z" fill="#b45309" />
      <path d="M 34 68 Q 60 88 86 68 L 96 110 L 24 110 Z" fill="#f59e0b" />
      <path d="M 32 70 L 82 110 L 70 110 L 28 76 Z" fill="#fde047" />
      {/* Neck & Wide smiling face */}
      <rect x="50" y="50" width="20" height="20" fill="#fde68a" />
      <ellipse cx="60" cy="44" rx="24" ry="24" fill="#fde68a" />
      {/* Fluffy sandy hair tufts */}
      <path d="M 34 38 Q 36 20 60 20 Q 84 20 86 38 L 82 42 Q 60 26 38 42 Z" fill="#d97706" />
      {/* Talaxian spots on temples and cheeks */}
      <circle cx="44" cy="38" r="1.5" fill="#b45309" />
      <circle cx="42" cy="44" r="1.5" fill="#b45309" />
      <circle cx="46" cy="48" r="1.5" fill="#b45309" />
      <circle cx="76" cy="38" r="1.5" fill="#b45309" />
      <circle cx="78" cy="44" r="1.5" fill="#b45309" />
      <circle cx="74" cy="48" r="1.5" fill="#b45309" />
      {/* Wide cheerful eyes & broad whiskers */}
      <rect x="48" y="38" width="5" height="4" fill="#451a03" />
      <rect x="67" y="38" width="5" height="4" fill="#451a03" />
      {/* Wide rounded nose */}
      <ellipse cx="60" cy="46" rx="5" ry="3" fill="#b45309" />
      {/* Big warm joyful grin */}
      <path d="M 50 54 Q 60 64 70 54" stroke="#78350f" strokeWidth="2.5" fill="#fff" />
    </svg>
  ),
};

interface AvatarProps {
  name: string;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CouncilAvatar: React.FC<AvatarProps> = ({ 
  name, 
  className = "", 
  onClick, 
  selected = false,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28'
  }[size];

  return (
    <div 
      className={`relative cursor-pointer transition-all duration-200 transform hover:scale-105 active:scale-95 ${sizeClasses} ${selected ? 'ring-4 ring-lcars-yellow rounded-2xl shadow-[0_0_15px_#ffcc00]' : 'opacity-90 hover:opacity-100'} ${className}`}
      onClick={onClick}
      title={name}
    >
      {avatars[name] || avatars['Picard']}
    </div>
  );
};
