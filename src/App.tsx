/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map as MapIcon, 
  ClipboardList, 
  Leaf, 
  Newspaper, 
  Home, 
  ChevronLeft, 
  ChevronRight,
  MapPin, 
  ArrowRight, 
  CheckCircle2,
  Share2,
  BookOpen,
  Trophy,
  Heart,
  Search,
  Gift,
  ShoppingBag
} from 'lucide-react';
import {
  INITIAL_REGIONS,
  INITIAL_TASKS,
  ARTICLES,
  DEFAULT_ARTICLE,
  CHINA_CLAY_MAP_URL,
  INITIAL_SPECIALTIES,
} from './constants';
import {
  Region,
  Task,
  UserStats,
  RegionStage,
  Specialty,
} from './types';
import {
  growthProgressToStage,
  seenValueToSproutPhase,
  seenValueToObserverLevel,
  sproutPhaseEmoji,
  seenValueTierProgress,
  resolveArticleRegionName,
} from './stats';

const getStageColor = (s: RegionStage) => ['#b8b8b8', '#6dc96d', '#4aaa4a', '#e0a020'][s];
const getStageBg = (s: RegionStage) => ['#f0f0f0', '#d4f0c8', '#b8e8a0', '#fde9a0'][s];
const getStageLabel = (s: RegionStage) => ['未发现', '发芽中', '生长中', '丰收中'][s];
const getStageEmoji = (s: RegionStage) => ['⭕', '🌱', '🌿', '🌾'][s];

const regionStage = (r: Region) => growthProgressToStage(r.growthProgress);

export default function App() {
  const [screen, setScreen] = useState<'home' | 'region' | 'news' | 'tasks' | 'mine' | 'map'>('home');
  const [previousScreen, setPreviousScreen] = useState<'home' | 'region' | 'news' | 'tasks' | 'mine' | 'map'>('home');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [newsFromRegion, setNewsFromRegion] = useState<number | null>(null);
  
  const [regions, setRegions] = useState<Region[]>(INITIAL_REGIONS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [userStats, setUserStats] = useState<UserStats>({ seenValue: 24, sproutValue: 12 });
  /** 乡土线索等待结算的地区；随进入地区页 / 从地区读新闻更新 */
  const [lastRegionContextId, setLastRegionContextId] = useState<number>(1);
  const [specialties] = useState<Specialty[]>(INITIAL_SPECIALTIES);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const goRegion = (id: number) => {
    setLastRegionContextId(id);
    setSelectedRegionId(id);
    setScreen('region');
  };

  /** 地区详情页「继续关注这片土地」：+3 发芽值，当前地区 +20 成长进度 */
  const applyFocusLand = (regionId: number) => {
    setUserStats((prev) => ({ ...prev, sproutValue: prev.sproutValue + 3 }));
    setRegions((prev) => {
      const r = prev.find((x) => x.id === regionId);
      if (!r) return prev;
      const stBefore = regionStage(r);
      const nextProg = Math.min(100, r.growthProgress + 20);
      const stAfter = growthProgressToStage(nextProg);
      const msg =
        stAfter > stBefore
          ? `🎉 ${r.name} 村庄升级啦！\n已进入「${getStageLabel(stAfter)}」`
          : '🌿 +3 发芽值\n村庄成长进度 +20';
      setTimeout(() => showToast(msg), 0);
      return prev.map((x) => (x.id === regionId ? { ...x, growthProgress: nextProg } : x));
    });
  };

  const completeTask = (id: number) => {
    setTasks((prev) => {
      const t = prev.find((x) => x.id === id);
      if (!t || t.done) return prev;
      if (t.type === 'challenge') {
        const targetId =
          lastRegionContextId ||
          selectedRegionId ||
          regions.find((r) => r.growthProgress > 0)?.id ||
          regions[0]?.id ||
          1;
        const r0 = regions.find((x) => x.id === targetId);
        const st0 = r0 ? regionStage(r0) : 0;
        const nextProg = Math.min(100, (r0?.growthProgress ?? 0) + 30);
        const st1 = growthProgressToStage(nextProg);
        setRegions((rs) =>
          rs.map((r) => (r.id === targetId ? { ...r, growthProgress: nextProg } : r)),
        );
        setUserStats((s) => ({ ...s, sproutValue: s.sproutValue + 5 }));
        if (st1 > st0) {
          showToast(`🎊 线索完成！\n${r0?.name ?? '该地区'} 进入「${getStageLabel(st1)}」`);
        } else {
          showToast('🎊 线索完成！\n+5 发芽值 · 村庄进度 +30');
        }
      } else {
        showToast(`🎉 打卡完成\n${t.reward}`);
      }
      return prev.map((x) => (x.id === id ? { ...x, done: true } : x));
    });
  };

  const openNews = (articleId: string | null, fromRegionId: number | null) => {
    setSelectedArticleId(articleId);
    setNewsFromRegion(fromRegionId);
    if (fromRegionId) setLastRegionContextId(fromRegionId);
    setPreviousScreen(screen);
    setScreen('news');
  };

  const finishReading = () => {
    setUserStats((prev) => ({ ...prev, seenValue: prev.seenValue + 2 }));
    const locationName =
      newsFromRegion != null
        ? regions.find((r) => r.id === newsFromRegion)?.name ?? null
        : resolveArticleRegionName(selectedArticleId);
    if (locationName) {
      setRegions((prev) =>
        prev.map((r) =>
          r.name === locationName ? { ...r, followCount: r.followCount + 1 } : r,
        ),
      );
      showToast(`✨ +2 见闻值\n「${locationName}」关注 +1`);
    } else {
      showToast('✨ +2 见闻值\n每一次阅读，都会让小禾苗长大一点');
    }
    setScreen(previousScreen);
    setSelectedArticleId(null);
    setNewsFromRegion(null);
  };

  const selectedRegion = useMemo(() => 
    regions.find(r => r.id === selectedRegionId), 
    [regions, selectedRegionId]
  );

  const selectedArticle = useMemo(() => 
    selectedArticleId && ARTICLES[selectedArticleId] ? ARTICLES[selectedArticleId] : DEFAULT_ARTICLE,
    [selectedArticleId]
  );

  return (
    <div className="flex justify-center items-start bg-linear-to-br from-[#c8e8ff] via-[#d8f0c8] to-[#fdf6e8] min-h-screen py-10 font-sans">
      <div id="app" className="w-[375px] min-h-[720px] bg-[#f5f0e8] rounded-[36px] overflow-hidden relative shadow-[0_16px_48px_rgba(60,100,40,0.18),0_4px_12px_rgba(0,0,0,0.1)]">
        <div id="page-wrap" className="w-full h-[720px] overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            {screen === 'home' && (
              <HomeScreen
                userStats={userStats}
                regions={regions}
                setScreen={setScreen}
                goRegion={goRegion}
                openNews={openNews}
                showToast={showToast}
              />
            )}
            {screen === 'region' && selectedRegion && (
              <RegionScreen
                region={selectedRegion}
                onBack={() => setScreen('home')}
                onFocusLand={() => applyFocusLand(selectedRegion.id)}
                onOpenNews={(id) => openNews(id, selectedRegion.id)}
              />
            )}
            {screen === 'news' && (
              <NewsScreen 
                article={selectedArticle} 
                onBack={() => {
                  setScreen(previousScreen);
                  setSelectedArticleId(null);
                  setNewsFromRegion(null);
                }}
                onFinish={finishReading}
              />
            )}
            {screen === 'tasks' && (
              <TasksScreen 
                tasks={tasks} 
                onBack={() => setScreen('home')} 
                onComplete={completeTask}
              />
            )}
            {screen === 'mine' && (
              <MineScreen
                userStats={userStats}
                specialties={specialties}
                regions={regions}
                onBack={() => setScreen('home')}
                onSelectRegion={(id: number) => goRegion(id)}
              />
            )}
            {screen === 'map' && (
              <MapScreen
                regions={regions}
                onBack={() => setScreen('home')}
                onSelectRegion={(id) => goRegion(id)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              className="fixed top-[46%] left-1/2 bg-black/80 text-white px-7 py-3.5 rounded-3xl text-sm font-medium z-50 text-center max-w-[280px] leading-relaxed backdrop-blur-md"
            >
              {toastMsg.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Screen Components ---

function HomeScreen({ userStats, regions, setScreen, goRegion, openNews, showToast }: any) {
  const litCount = regions.filter((r: Region) => r.growthProgress > 0).length;
  const observerLv = seenValueToObserverLevel(userStats.seenValue);
  const sproutPhase = seenValueToSproutPhase(userStats.seenValue);
  const featured = regions.find((r: Region) => r.id === 4) ?? regions[0];
  const featuredStage = regionStage(featured);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="bg-linear-to-b from-[#8ab4f8] via-[#a8d8b8] to-[#e8f5e0] min-h-full"
    >
      {/* Header */}
      <div className="px-4.5 flex items-center justify-between h-12 bg-white/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-1.5">
          <div className="text-[15px] font-extrabold text-[#eb3333] tracking-tighter">腾讯</div>
          <div className="text-[13px] text-[#555] font-semibold">新闻</div>
          <div className="w-px h-3.5 bg-gray-300 mx-1.5"></div>
          <div className="text-[13px] text-[#2a6a28] font-bold">山河发芽计划</div>
        </div>
        <div className="text-[11px] text-[#5a9a58] bg-[#c8f0b4]/70 px-3 py-1 rounded-full font-semibold">
          Lv.{observerLv} 振兴观察员
        </div>
      </div>

      <div className="px-4.5 pt-4">
        {/* Title */}
        <div className="text-center mb-5 mt-2">
          <h1 className="font-title text-[38px] clay-title tracking-widest mb-2">山河发芽计划</h1>
          <p className="text-[14px] text-white/90 italic tracking-[4px] font-medium drop-shadow-sm">看见一方新闻，点亮一寸乡土</p>

        </div>

        {/* Stats Card with Welfare Icon */}
        <div className="bg-white/90 backdrop-blur-sm rounded-full py-2 px-2.5 mb-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-white flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setScreen('mine')}>
          {/* Avatar & Role */}
          <div className="flex items-center gap-1.5 bg-[#f5f0e8] rounded-full pl-1 pr-2.5 py-1">
            <img src="https://picsum.photos/seed/useravatar/100/100" alt="avatar" className="w-7 h-7 rounded-full" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[#1a3a18] leading-none">振兴观察员</span>
              <span className="text-[8px] text-[#2a6a28] bg-[#e8f5e0] px-1 rounded-sm mt-0.5 w-fit">Lv.{observerLv}</span>
            </div>
          </div>
          
          {/* Stats：见闻 = 全局阅读陪伴；发芽 = 地区深耕 */}
          <div className="flex gap-2 min-w-0 flex-1">
            <div className="flex-1 min-w-0 rounded-xl bg-[#fffaf5] border border-[#fde8d8] px-2 py-1">
              <div className="text-[10px] text-[#b07040] font-bold leading-tight">📖 见闻值</div>
              <div className="text-[11px] font-extrabold text-[#c05820] leading-none">{userStats.seenValue}</div>
            </div>
            <div className="flex-1 min-w-0 rounded-xl bg-[#f4fcf0] border border-[#d8f0c8] px-2 py-1">
              <div className="text-[10px] text-[#4a8a40] font-bold leading-tight">🌱 发芽值</div>
              <div className="text-[11px] font-extrabold text-[#2a7028] leading-none">{userStats.sproutValue}</div>
            </div>
          </div>

          {/* Welfare Exchange Icon */}
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#f0f8d8] to-[#dcf0b8] flex items-center justify-center shadow-sm border border-[#e8f5e0] flex-shrink-0 relative">
            <Gift size={16} className="text-[#5a9a58]" />
            <div className="absolute -top-0.5 -right-0.5 bg-[#ff6b6b] w-2.5 h-2.5 rounded-full border-2 border-white"></div>
          </div>
        </div>

        {/* Map Card */}
        <div className="bg-white/70 rounded-3xl p-3 shadow-lg mb-6">
          <div className="relative">
            <div className="absolute top-0 right-0 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] font-bold text-[#2a6a28] shadow-sm z-10">
              已发芽 {litCount} 个地区
            </div>
            <div className="rounded-2xl overflow-hidden relative group cursor-pointer" onClick={() => setScreen('map')}>
              <img 
                src={CHINA_CLAY_MAP_URL} 
                alt="3D Clay China Map" 
                className="w-full h-auto block transform transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              
              {/* Overlay SVG for interactive dots */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 343 240">
                {regions.map((r: Region) => {
                  const st = regionStage(r);
                  const color = getStageColor(st);
                  const lit = r.growthProgress > 0;
                  return (
                    <g key={r.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); goRegion(r.id); }}>
                      {lit && <circle className="dot-ring" cx={r.mx} cy={r.my} r="10" fill={color} opacity="0.3" />}
                      <circle cx={r.mx} cy={r.my} r="6" fill={color} stroke="#fff" strokeWidth="2" />
                      <rect x={r.mx - 16} y={r.my + 8} width="32" height="13" rx="6.5" fill="rgba(255,255,255,0.9)" />
                      <text x={r.mx} y={r.my + 17.5} textAnchor="middle" fontSize="7.5" fill="#2a5a28" fontWeight="600">{r.short}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            {[
              { color: '#80c870', label: '已点亮' },
              { color: '#ffffff', label: '待发芽' },
              { color: '#a0e888', label: '正在生长', icon: '🌱' }
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                {item.icon ? (
                  <span className="text-[10px]">{item.icon}</span>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                )}
                <span className="text-[11px] text-[#4a8a40] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Village Shortcut */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#80c870] text-white flex items-center justify-center shadow-sm">
                <Home size={20} />
              </div>
              <div>
                <div className="text-[15px] font-extrabold text-[#1a4a18]">今日关注村庄</div>
                <div className="text-[11px] text-[#6a9a60] font-medium">{featured.name}</div>
              </div>
            </div>
            <div className="bg-[#d8f0d0] text-[#2a6a28] px-3 py-1 rounded-full text-[11px] font-bold">
              {getStageLabel(featuredStage)}
            </div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-[11px] font-bold text-[#2a6a28] mb-1.5">
              <span>村庄成长进度（发芽值推动）</span>
              <span className="text-[13px]">{featured.growthProgress}%</span>
            </div>
            <div className="h-2.5 bg-[#e8f5e0] rounded-full overflow-hidden">
              <div className="h-full bg-[#6db85c] rounded-full" style={{ width: `${featured.growthProgress}%` }}></div>
            </div>
          </div>
          <button
            type="button"
            className="w-full bg-linear-to-r from-[#70c060] to-[#50a040] text-white py-2 rounded-full font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
            onClick={() => openNews('n7', featured.id)}
          >
            <Heart size={16} /> 读一条线索并积累见闻
          </button>
        </div>

        {/* Tasks Section Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[16px] font-extrabold text-[#1a4a18]">今日任务</h2>
          <button className="text-[12px] text-[#6a9a60] font-bold flex items-center" onClick={() => setScreen('tasks')}>
            全部 <ChevronRight size={14} />
          </button>
        </div>

        {/* Task List Preview */}
        <div className="space-y-3 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3.5 shadow-sm border border-white flex items-center gap-3 cursor-pointer" onClick={() => setScreen('tasks')}>
            <div className="w-12 h-12 rounded-2xl bg-[#e8f5e0] text-[#6db85c] flex items-center justify-center shadow-inner">
              <Newspaper size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-[#1a4a18] mb-0.5">看一条山间消息</div>
              <div className="text-[10px] text-[#6a9a60]">任意阅读 +2 见闻，让小禾苗慢慢长大</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-[11px] font-bold text-[#6db85c] bg-[#e8f5e0] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span>⚡</span> +2 见闻
              </div>
              <button className="w-8 h-8 rounded-full bg-[#6db85c] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3.5 shadow-sm border border-white flex items-center gap-3 cursor-pointer" onClick={() => setScreen('tasks')}>
            <div className="w-12 h-12 rounded-2xl bg-[#fff0e0] text-[#f0a050] flex items-center justify-center shadow-inner">
              <MapIcon size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-[#1a4a18] mb-0.5">回到昨天的地方</div>
              <div className="text-[10px] text-[#6a9a60]">带地点稿件再 +1 地区关注，为发芽值铺路</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-[11px] font-bold text-[#f0a050] bg-[#fff0e0] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span>⚡</span> 关注
              </div>
              <button className="w-8 h-8 rounded-full bg-[#f0a050] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-3.5 shadow-sm border border-white flex items-center gap-3 cursor-pointer" onClick={() => setScreen('tasks')}>
            <div className="w-12 h-12 rounded-2xl bg-[#e0f0ff] text-[#50a0f0] flex items-center justify-center shadow-inner">
              <Search size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-[#1a4a18] mb-0.5">完成乡土线索</div>
              <div className="text-[10px] text-[#6a9a60]">完成后 +5 发芽值，当前地区进度 +30</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-[11px] font-bold text-[#50a0f0] bg-[#e0f0ff] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span>⚡</span> 村庄
              </div>
              <button className="w-8 h-8 rounded-full bg-[#7ab0f0] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function RegionScreen({ region, onBack, onFocusLand, onOpenNews }: any) {
  const st = regionStage(region);
  const bigEmoji = ['🌑', '🌿', '🌳', '🌾'][st];

  return (
    <motion.div 
      initial={{ x: 375 }} 
      animate={{ x: 0 }} 
      exit={{ x: 375 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="bg-linear-to-b from-[#f5f0e8] to-[#f5f0e8] min-h-full"
      style={{ background: `linear-gradient(180deg, ${getStageBg(st)} 0%, #f5f0e8 55%)` }}
    >
      <div className="p-4.5 pt-4">
        <button onClick={onBack} className="bg-white/80 border-none cursor-pointer text-[#3a6a38] text-[13px] px-4 py-1.5 rounded-full mb-3 font-semibold shadow-sm flex items-center gap-1">
          <ChevronLeft size={16} /> 返回首页
        </button>
        
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1a3a18]">{region.name}</h2>
            <span className="stage-badge mt-1.5" style={{ backgroundColor: getStageBg(st), color: st === 0 ? '#888' : '#1a5a18' }}>
              {getStageEmoji(st)} {getStageLabel(st)}
            </span>
          </div>
          <div className="w-17 h-17 rounded-3xl bg-linear-to-br from-white to-transparent flex items-center justify-center text-4xl shadow-md bobbing" style={{ backgroundColor: getStageBg(st) }}>
            {bigEmoji}
          </div>
        </div>

        <div className="bg-white/70 rounded-2xl p-3.5 mb-3 border border-[rgba(180,200,160,0.3)]">
          <p className="text-[13px] text-[#3a5a38] leading-relaxed m-0">{region.desc}</p>
        </div>

        <div className="green-card p-4 mb-3.5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-semibold text-[#2a5a28]">村庄成长进度</span>
            <span className="text-base font-extrabold text-[#1a8a20]">{region.growthProgress}/100</span>
          </div>
          <div className="progress-track h-2.5">
            <div className="progress-fill" style={{ width: `${region.growthProgress}%`, background: 'linear-gradient(90deg, #80d870, #3aa830)' }}></div>
          </div>
          <p className="text-[10px] text-[#5a8a50] mt-2 m-0">关注次数 {region.followCount} · 发芽值用于解锁权益与图鉴</p>
        </div>

        <div className="text-[13px] font-bold text-[#1a4a18] mb-2.5">📰 新闻线索</div>
        {region.news.map((n: any) => (
          <div key={n.id} className="news-row border-l-4 rounded-l-none cursor-pointer group" style={{ borderLeftColor: n.c }} onClick={() => onOpenNews(n.id)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] bg-opacity-10 rounded-lg px-2.5 py-1 font-bold" style={{ backgroundColor: n.c + '1A', color: n.c }}>{n.tag}</span>
              {n.read && <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><CheckCircle2 size={10}/> 已阅读</span>}
            </div>
            <div className="text-[13px] font-semibold text-[#1a3a18] mb-2 line-clamp-2 group-hover:text-[#2a6a28] transition-colors">{n.t}</div>
            <div className="flex justify-end">
              <button className="btn-grass py-1.5 px-3.5 text-[11px] flex items-center gap-1">阅读线索 <ArrowRight size={12}/></button>
            </div>
          </div>
        ))}
        
        <div className="h-20"></div>
      </div>

      {/* Bottom Action：与 #app 同宽居中，避免 fixed 相对视口撑满导致超出手机预览框 */}
      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[375px] -translate-x-1/2 px-3 sm:px-4 py-3 bg-linear-to-t from-[#f5f0e8] via-[#f5f0e8] to-transparent pointer-events-none box-border">
        <div className="flex gap-2 sm:gap-3 pointer-events-auto min-w-0 w-full max-w-full">
          <button 
            type="button"
            onClick={() => onFocusLand()}
            className="w-full min-w-0 max-w-full bg-linear-to-r from-[#2a6a28] to-[#3a8a38] text-white py-3 sm:py-3.5 px-2 sm:px-3 rounded-2xl font-bold shadow-lg shadow-[#2a6a28]/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-center whitespace-normal leading-snug"
          >
            <Leaf size={18} className="shrink-0" />
            <span className="min-w-0">继续关注这片土地</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function NewsScreen({ article, onBack, onFinish }: any) {
  return (
    <motion.div 
      initial={{ y: 720 }} 
      animate={{ y: 0 }} 
      exit={{ y: 720 }}
      transition={{ type: 'spring', damping: 30, stiffness: 250 }}
      className="bg-white min-h-full"
    >
      {/* Header Bar */}
      <div className="h-12 flex items-center px-4 gap-2.5 sticky top-0 z-10 bg-white border-b border-gray-100">
        <button onClick={onBack} className="bg-none border-none cursor-pointer text-[#333] p-1">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-1.5">
          <div className="text-base font-extrabold text-[#eb3333] tracking-tighter">腾讯</div>
          <div className="text-sm text-[#333] font-semibold">新闻</div>
        </div>
        <div className="flex-1"></div>
        <span className="bg-[#e8f5e0] text-[#2a7a28] rounded-lg px-2.5 py-1 text-[11px] font-bold">乡村振兴</span>
      </div>

      {/* Article Header */}
      <div className="p-5 pb-3.5 border-b-[6px] border-[#f5f5f5]">
        <h1 className="text-xl font-extrabold text-[#111] leading-snug mb-3.5">{article.title}</h1>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-7.5 h-7.5 rounded-full bg-linear-to-br from-[#eb3333] to-[#ff6b35] flex items-center justify-center text-[13px] text-white font-bold">腾</div>
          <div>
            <div className="text-[12px] font-bold text-[#333]">{article.author}</div>
            <div className="text-[11px] text-gray-400">{article.time} · 约{article.readMin}分钟阅读</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-[#fff0e8] text-[#e07030] rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1">
            <MapPin size={10} /> {article.region}
          </span>
          <span className="bg-[#e8f5e0] text-[#2a7a28] rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1">
            <Leaf size={10} /> 可积累发芽值
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4.5">
        {article.body.map((b: any, i: number) => {
          if (b.type === 'text') return <p key={i} className="text-[15px] text-[#222] leading-loose mb-3.5">{b.text}</p>;
          if (b.type === 'img') return (
            <div key={i} className="w-full h-40 rounded-2xl mb-3.5 overflow-hidden relative bg-linear-to-br from-gray-200 to-gray-300">
              <img 
                src={`https://picsum.photos/seed/${b.src}/400/200`} 
                alt={b.alt} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-3 left-3.5 text-[11px] text-white font-bold bg-black/30 px-2.5 py-1 rounded-lg backdrop-blur-sm">腾讯新闻 现场图</div>
            </div>
          );
          if (b.type === 'quote') return (
            <div key={i} className="border-l-4 border-[#5aba50] bg-[#f0fce8] rounded-r-2xl p-3 px-4 mb-3.5 text-sm text-[#2a5a28] leading-relaxed italic">
              {b.text}
            </div>
          );
          return null;
        })}
      </div>

      {/* Finish Action */}
      <div className="mx-4.5 mb-5 bg-linear-to-br from-[#e8f8e0] to-[#d4f0c8] rounded-3xl p-4">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="text-3xl bobbing">🌱</div>
          <div>
            <div className="text-sm font-bold text-[#1a4a18]">阅读完成</div>
            <div className="text-[12px] text-[#4a8a48] leading-snug">
              每一次阅读 +2 见闻值，让小禾苗长大一点
              {article.region && article.region !== '乡土中国' ? `；带地点稿件还会为「${article.region}」+1 关注。` : '。'}
            </div>
          </div>
        </div>
        <button type="button" className="btn-grass w-full" onClick={onFinish}>✅ 完成阅读</button>
      </div>

      {/* Recommendations */}
      <div className="px-4.5 pb-6">
        <div className="text-[13px] font-bold text-[#333] mb-3">相关推荐</div>
        {[
          '农村电商：深山里的网络改变了什么',
          '一个贫困村的十年蜕变',
          '非遗手艺人：在坚守与创新之间'
        ].map((t, i) => (
          <div key={i} className="flex gap-3 py-3 border-b border-gray-50 cursor-pointer">
            <div className="flex-1">
              <div className="text-[13px] text-[#222] leading-relaxed font-medium">{t}</div>
              <div className="text-[11px] text-gray-400 mt-1">腾讯新闻 · {3 + i}小时前</div>
            </div>
            <div className="w-17.5 h-13 rounded-xl bg-linear-to-br from-[#c8e8a0] to-[#a0d070] shrink-0 overflow-hidden">
               <img src={`https://picsum.photos/seed/recommend${i}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TasksScreen({ tasks, onBack, onComplete }: any) {
  const done = tasks.filter((t: any) => t.done).length;
  const total = tasks.length;
  const progress = Math.round((done / total) * 100);

  return (
    <motion.div 
      initial={{ x: 375 }} 
      animate={{ x: 0 }} 
      exit={{ x: 375 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="bg-linear-to-b from-[#d8f4c8] to-[#f5f0e8] min-h-full"
    >
      <div className="p-4.5 pt-4 flex items-center gap-2.5">
        <button onClick={onBack} className="bg-white/80 border-none cursor-pointer text-[#3a6a38] text-[13px] px-3.5 py-1.5 rounded-2xl font-semibold shadow-sm">
          <ChevronLeft size={16} className="inline mr-1" /> 返回
        </button>
        <div className="text-lg font-extrabold text-[#1a4a18]">今日任务 🌻</div>
      </div>

      <div className="px-4.5 mb-3">
        <div className="green-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#2a5a28]">今日进度</span>
            <span className="text-sm font-extrabold text-[#1a8a20]">{done} / {total}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #80d870, #3aa830)' }}></div>
          </div>
        </div>
      </div>

      <div className="px-4.5 space-y-3">
        {tasks.map((t: any) => (
          <div key={t.id} className={`cream-card p-3.5 flex items-center gap-3.5 transition-all ${t.done ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-[#fffef8] to-[#f0f8e8] flex items-center justify-center text-2xl shadow-sm border border-[rgba(160,200,120,0.2)]">
              {t.ic}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-[#1a3a18] mb-0.5">{t.t}</div>
              <div className="text-[11px] text-[#c06820] font-bold">奖励：{t.reward}</div>
            </div>
            <button 
              onClick={() => onComplete(t.id)}
              disabled={t.done}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                t.done 
                  ? 'bg-[#e8f5e0] text-[#2a7a28] cursor-default' 
                  : 'bg-linear-to-r from-[#2a6a28] to-[#3a8a38] text-white shadow-md active:scale-90'
              }`}
            >
              {t.done ? '已完成' : '去完成'}
            </button>
          </div>
        ))}
      </div>
      <div className="h-6"></div>
    </motion.div>
  );
}

function MineScreen({ userStats, specialties, regions, onBack, onSelectRegion }: any) {
  const observerLv = seenValueToObserverLevel(userStats.seenValue);
  const sproutPhase = seenValueToSproutPhase(userStats.seenValue);
  const seenTierPct = seenValueTierProgress(userStats.seenValue);
  const sproutedRegions = regions.filter((r: Region) => r.growthProgress > 0).length;
  const [activeTab, setActiveTab] = useState<'product' | 'badge' | 'postcard'>('product');

  const filteredSpecialties = specialties.filter((s: Specialty) => s.type === activeTab);

  return (
    <motion.div 
      initial={{ x: 375 }} 
      animate={{ x: 0 }} 
      exit={{ x: 375 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="bg-linear-to-b from-[#fdf6e8] to-[#f5f0e8] min-h-full pb-10"
    >
      {/* Header with Back Button */}
      <div className="px-4.5 pt-4">
        <button onClick={onBack} className="bg-white/80 border-none cursor-pointer text-[#3a6a38] text-[13px] px-4 py-1.5 rounded-full font-semibold shadow-sm flex items-center gap-1 w-fit">
          <ChevronLeft size={16} /> 返回
        </button>
      </div>

      {/* Top User Info */}
      <div className="p-6 pt-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-linear-to-br from-[#ffecd2] to-[#fcb69f]">
          <img src="https://picsum.photos/seed/useravatar/100/100" alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-[#1a3a18]">山河旅人</h2>
            <span className="bg-[#e8f5e0] text-[#2a7a28] px-2 py-0.5 rounded-md text-[10px] font-bold">Lv.{observerLv}</span>
          </div>
          <div className="text-[12px] text-[#6a9a60] font-medium flex items-center gap-1">
            <Trophy size={12} className="text-[#e0a020]" /> 振兴观察员
          </div>
        </div>
      </div>

      {/* Sprout Card */}
      <div className="mx-4.5 mb-5">
        <div className="cream-card p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#eeffee] rounded-full blur-3xl opacity-50"></div>
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="text-7xl leading-none mb-3 bobbing">{sproutPhaseEmoji(sproutPhase)}</div>
            <div className="text-lg font-bold text-[#1a4a18] mb-1">小禾苗 · {sproutPhase}</div>
            <p className="text-[12px] text-[#6a9a60] leading-relaxed mb-4">
              见闻值越高，小禾苗越茁壮。<br />
              当前见闻 {userStats.seenValue}，由阅读一点点堆起来。
            </p>
            <div className="w-full">
              <div className="flex justify-between mb-1.5 px-1">
                <span className="text-[11px] text-[#6a9a60] font-bold">本阶段进度（见闻驱动）</span>
                <span className="text-[11px] text-gray-400">{Math.round(seenTierPct)}%</span>
              </div>
              <div className="progress-track h-2.5">
                <div className="progress-fill" style={{ width: `${seenTierPct}%`, background: 'linear-gradient(90deg, #a0e888, #3aa828)' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Area */}
      <div className="mx-4.5 mb-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#fde8d8]">
            <div className="text-[10px] text-[#b07040] mb-1 font-bold">📖 见闻值</div>
            <div className="text-xl font-extrabold text-[#c05820]">{userStats.seenValue}</div>
            <p className="text-[9px] text-gray-500 mt-1 leading-snug m-0">每一次阅读，都会让小禾苗长大一点</p>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-[#d8f0c8]">
            <div className="text-[10px] text-[#4a8a40] mb-1 font-bold">🌱 发芽值</div>
            <div className="text-xl font-extrabold text-[#2a7028]">{userStats.sproutValue}</div>
            <p className="text-[9px] text-gray-500 mt-1 leading-snug m-0">持续关注一片土地，会让那里慢慢发芽</p>
          </div>
        </div>
      </div>

      {/* Rights Section (Moved Up & Enhanced) */}
      <div className="mx-4.5 mb-5">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-sm border border-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-extrabold text-[#1a4a18] flex items-center gap-1.5">
              <Gift size={16} className="text-[#f0a050]" /> 我的助农权益
            </h3>
            <span className="text-[11px] text-[#6a9a60]">
              累计发芽 <span className="font-bold text-[#f0a050]">{userStats.sproutValue}</span>
            </span>
          </div>
          <div className="bg-[#fff8f0] rounded-2xl p-3 mb-3 border border-[#fde8d0]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-bold text-[#c87830]">地区权益解锁进度</span>
              <span className="text-[11px] text-[#d88840]">{userStats.sproutValue} / 100</span>
            </div>
            <div className="h-1.5 bg-[#fde8d0] rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-[#f0a050] to-[#f8c080] rounded-full" style={{ width: `${Math.min(100, (userStats.sproutValue / 100) * 100)}%` }}></div>
            </div>
            <p className="text-[9px] text-[#a07040] m-0 mt-2">发芽值来自地区深耕行为，用于解锁图鉴与权益</p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 bg-[#f8fcf5] p-2.5 rounded-2xl border border-[#e8f5e0]">
              <div className="w-12 h-12 bg-linear-to-br from-[#f0f8e8] to-[#d8f0c8] rounded-xl flex flex-col items-center justify-center text-[#2a6a28]">
                <span className="text-[10px] font-bold">¥</span>
                <span className="text-[16px] font-extrabold leading-none">10</span>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#1a4a18]">助农消费券</div>
                <div className="text-[10px] text-[#6a9a60]">购买指定农产品立减</div>
              </div>
              <button className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#6db85c] text-white shadow-sm active:scale-95 transition-transform">
                去使用
              </button>
            </div>
            <div className="flex items-center gap-3 bg-[#f5f5f5] p-2.5 rounded-2xl border border-[#eeeeee]">
              <div className="w-12 h-12 bg-linear-to-br from-[#eeeeee] to-[#e0e0e0] rounded-xl flex flex-col items-center justify-center text-[#888888]">
                <span className="text-[10px] font-bold">¥</span>
                <span className="text-[16px] font-extrabold leading-none">20</span>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#666666]">大额助农券</div>
                <div className="text-[10px] text-[#888888]">满200可用，需累计 100 发芽值</div>
              </div>
              <button className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#e0e0e0] text-[#888888]">
                未解锁
              </button>
            </div>
          </div>

          {/* Direct Supply Products */}
          <div className="mt-5">
            <h4 className="text-[14px] font-bold text-[#1a4a18] mb-3 flex items-center gap-1.5">
              <ShoppingBag size={15} className="text-[#6db85c]" /> 产地直供好物
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {/* Product 1 */}
              <div className="min-w-[140px] bg-white rounded-2xl overflow-hidden border border-[#e8f5e0] shadow-sm">
                <div className="h-28 bg-gray-100 relative">
                  <img src="https://picsum.photos/seed/oranges/200/200" alt="湖南麻阳冰糖橙" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-1.5 left-1.5 bg-[#ff6b6b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">可用券</div>
                </div>
                <div className="p-2.5">
                  <div className="text-[12px] font-bold text-[#1a3a18] line-clamp-1 mb-1">湖南麻阳冰糖橙 5斤装</div>
                  <div className="flex items-end gap-1 mb-2.5">
                    <span className="text-[15px] font-extrabold text-[#ff6b6b] leading-none">¥19.9</span>
                    <span className="text-[10px] text-gray-400 line-through leading-none mb-0.5">¥29.9</span>
                  </div>
                  <button className="w-full bg-linear-to-r from-[#70c060] to-[#50a040] text-white text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-transform shadow-sm">
                    10元券购买
                  </button>
                </div>
              </div>
              
              {/* Product 2 */}
              <div className="min-w-[140px] bg-white rounded-2xl overflow-hidden border border-[#e8f5e0] shadow-sm">
                <div className="h-28 bg-gray-100 relative">
                  <img src="https://picsum.photos/seed/eggs/200/200" alt="农家散养初生土鸡蛋" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-1.5 left-1.5 bg-[#ff6b6b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">可用券</div>
                </div>
                <div className="p-2.5">
                  <div className="text-[12px] font-bold text-[#1a3a18] line-clamp-1 mb-1">农家散养初生土鸡蛋 30枚</div>
                  <div className="flex items-end gap-1 mb-2.5">
                    <span className="text-[15px] font-extrabold text-[#ff6b6b] leading-none">¥35.9</span>
                    <span className="text-[10px] text-gray-400 line-through leading-none mb-0.5">¥45.9</span>
                  </div>
                  <button className="w-full bg-linear-to-r from-[#70c060] to-[#50a040] text-white text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-transform shadow-sm">
                    10元券购买
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mx-4.5 mb-5 grid grid-cols-2 gap-2">
        {[
          { label: '振兴观察员', value: `Lv.${observerLv}`, icon: '🏅', hint: '由见闻值决定' },
          { label: '小禾苗阶段', value: sproutPhase, icon: sproutPhaseEmoji(sproutPhase), hint: '由见闻值决定' },
          { label: '已发芽地区', value: sproutedRegions, icon: '📍', hint: '成长进度>0' },
          { label: '累计发芽值', value: userStats.sproutValue, icon: '🌿', hint: '地区深耕累计' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-2.5 text-center shadow-sm border border-white/50">
            <div className="text-lg mb-0.5">{item.icon}</div>
            <div className="text-base font-extrabold text-[#1a4a18]">{item.value}</div>
            <div className="text-[9px] text-gray-400 font-medium leading-tight">{item.label}</div>
            <div className="text-[8px] text-[#8a9a80] mt-0.5">{item.hint}</div>
          </div>
        ))}
      </div>

      {/* Specialties Module */}
      <div className="mx-4.5 mb-5">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#1a3a18] flex items-center gap-1">
              <BookOpen size={14} className="text-[#5aba50]" /> 我的风物图鉴
            </h3>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['product', 'badge', 'postcard'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === tab ? 'bg-white text-[#1a3a18] shadow-sm' : 'text-gray-400'}`}
                >
                  {tab === 'product' ? '农产' : tab === 'badge' ? '徽章' : '明信片'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {filteredSpecialties.map((s: Specialty) => (
              <div key={s.id} className="min-w-[80px] flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#fdfaf0] border border-[#f0e0c0] p-1 mb-1.5 flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-bold text-[#1a3a18] text-center">{s.name}</span>
              </div>
            ))}
            {filteredSpecialties.length === 0 && (
              <div className="w-full py-4 text-center text-[11px] text-gray-400 italic">尚未收集，快去探索吧~</div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Followed Places */}
      <div className="mx-4.5 mb-5">
        <h3 className="text-[14px] font-bold text-[#1a3a18] mb-3 px-1">最近关注的地方</h3>
        <div className="space-y-2.5">
          {regions.filter((r: Region) => r.growthProgress > 0).slice(0, 3).map((r: Region) => {
            const st = regionStage(r);
            return (
            <div key={r.id} className="bg-white/80 rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-white/50 cursor-pointer" onClick={() => onSelectRegion(r.id)}>
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#d4f0c8] to-[#b8e8a0] flex items-center justify-center text-xl">
                {getStageEmoji(st)}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#1a3a18]">{r.name}</div>
                <div className="text-[10px] text-gray-400">成长 {r.growthProgress}% · {getStageLabel(st)} · 关注 {r.followCount}</div>
              </div>
              <ArrowRight size={14} className="text-gray-300" />
            </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function MapScreen({ regions, onBack, onSelectRegion }: any) {
  return (
    <motion.div 
      initial={{ x: 375 }} 
      animate={{ x: 0 }} 
      exit={{ x: 375 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="bg-linear-to-b from-[#b8e0ff] to-[#f5f0e8] min-h-full"
    >
      <div className="p-4.5 pt-4 flex items-center gap-2.5">
        <button onClick={onBack} className="bg-white/80 border-none cursor-pointer text-[#3a6a38] text-[13px] px-3.5 py-1.5 rounded-2xl font-semibold shadow-sm">
          <ChevronLeft size={16} className="inline mr-1" /> 返回
        </button>
        <div className="text-lg font-extrabold text-[#1a4a18]">地区地图</div>
      </div>

      <div className="mx-4.5 mb-3.5">
        <div className="green-card p-3.5">
          <div className="rounded-2xl overflow-hidden relative bg-white">
            <img 
              src={CHINA_CLAY_MAP_URL} 
              alt="3D Clay China Map" 
              className="w-full h-auto block opacity-80"
              referrerPolicy="no-referrer"
            />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 343 240">
              {regions.map((r: Region) => {
                const st = regionStage(r);
                const color = getStageColor(st);
                const lit = r.growthProgress > 0;
                return (
                  <g key={r.id} onClick={() => onSelectRegion(r.id)} className="cursor-pointer">
                    {lit && <circle className="dot-ring" cx={r.mx} cy={r.my} r="11" fill={color} opacity="0.2" />}
                    <circle cx={r.mx} cy={r.my} r="7" fill={color} stroke="#fff" strokeWidth="2.5" />
                    {lit && <circle cx={r.mx} cy={r.my} r="2.8" fill="#fff" opacity="0.85" />}
                    <rect x={r.mx - 18} y={r.my + 9} width="36" height="14" rx="7" fill="rgba(255,255,255,0.9)" />
                    <text x={r.mx} y={r.my + 18.5} textAnchor="middle" fontSize="8" fill="#2a5a28" fontWeight="600">{r.short}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className="px-4.5">
        <div className="text-[13px] font-bold text-[#1a4a18] mb-2.5">全部地区</div>
        {regions.map((r: Region) => (
          <div key={r.id} className="mb-2 cursor-pointer" onClick={() => onSelectRegion(r.id)}>
            <div className="cream-card p-3 border-l-4 rounded-l-none flex items-center justify-between" style={{ borderLeftColor: getStageColor(regionStage(r)) }}>
              <span className="text-sm font-bold text-[#1a3a18]">{r.name}</span>
              <span className="stage-badge" style={{ backgroundColor: getStageBg(regionStage(r)), color: regionStage(r) === 0 ? '#888' : '#1a5a18' }}>
                {getStageEmoji(regionStage(r))} {getStageLabel(regionStage(r))}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="h-6"></div>
    </motion.div>
  );
}
