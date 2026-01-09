import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Truck, Bell, MessageSquare, Camera, Plus, Search,
  AlertTriangle, ChevronRight, Send, Loader2, Trash2, BrainCircuit, TrendingDown,
  Clock, CheckCircle2, ShoppingCart, MessageCircle, Sparkles, History,
  ArrowUpRight, Minus, PlusCircle, ShoppingBag, PieChart, ChefHat, 
  Settings, LogOut, Check, X, Filter, Info, ArrowUpDown, ChevronDown, Menu
} from 'lucide-react';
import { InventoryItem, Supplier, AppNotification, ChatMessage, UsageHistory } from './types';
import { GeminiService } from './geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

// --- MOCK DATA ---
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Jamón Ibérico 5J', category: 'Ibéricos', quantity: 4.2, unit: 'piezas', minThreshold: 2, pricePerUnit: 450, lastUpdated: new Date().toISOString() },
  { id: '2', name: 'AOVE Picual Premium', category: 'Aceites', quantity: 45, unit: 'L', minThreshold: 20, pricePerUnit: 12, lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Queso Manchego DOP', category: 'Lácteos', quantity: 3, unit: 'ruedas', minThreshold: 2, pricePerUnit: 85, lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Bacalao Giraldo', category: 'Pescados', quantity: 18, unit: 'kg', minThreshold: 10, pricePerUnit: 24, lastUpdated: new Date().toISOString() },
  { id: '5', name: 'Vino Rioja Alta 890', category: 'Bodega', quantity: 12, unit: 'botellas', minThreshold: 18, pricePerUnit: 145, lastUpdated: new Date().toISOString() },
];

const MOCK_USAGE: UsageHistory[] = [
  { id: 'h1', itemId: '1', itemName: 'Jamón Ibérico 5J', date: '2024-05-18', quantityConsumed: 0.2, unit: 'piezas' },
  { id: 'h2', itemId: '1', itemName: 'Jamón Ibérico 5J', date: '2024-05-19', quantityConsumed: 0.4, unit: 'piezas' },
  { id: 'h3', itemId: '4', itemName: 'Bacalao Giraldo', date: '2024-05-19', quantityConsumed: 5.5, unit: 'kg' },
];

const SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Bodegas Selectas', contact: 'pedidos@bodegas.es', phone: '34600112233', category: 'Bodega', reliability: 98 },
  { id: 's2', name: 'Distribución Gourmet', contact: 'info@gourmet.es', phone: '34655443322', category: 'Ibéricos', reliability: 95 },
  { id: 's3', name: 'Huerta Real', contact: 'ventas@huerta.es', phone: '34611223344', category: 'Perecederos', reliability: 92 },
];

const CATEGORY_THEMES: Record<string, string> = {
  'Ibéricos': 'border-rose-500/30 bg-rose-500/5 text-rose-400',
  'Aceites': 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
  'Lácteos': 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  'Pescados': 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400',
  'Bodega': 'border-purple-500/30 bg-purple-500/5 text-purple-400',
  'Default': 'border-slate-500/30 bg-slate-500/5 text-slate-400'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'chat' | 'scan' | 'notifications' | 'usage'>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [usage, setUsage] = useState<UsageHistory[]>(MOCK_USAGE);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Stats
  const stats = useMemo(() => ({
    totalValue: inventory.reduce((acc, item) => acc + (item.quantity * item.pricePerUnit), 0),
    criticalItems: inventory.filter(i => i.quantity <= i.minThreshold).length,
    unreadNotifications: notifications.filter(n => !n.isRead).length
  }), [inventory, notifications]);

  // Sync notifications with inventory
  useEffect(() => {
    const alerts: AppNotification[] = [];
    inventory.forEach(item => {
      if (item.quantity <= item.minThreshold) {
        alerts.push({
          id: `alert-${item.id}`,
          type: 'critical',
          title: 'Stock Crítico',
          message: `El producto ${item.name} ha alcanzado el umbral mínimo (${item.quantity} ${item.unit} restantes).`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    });
    setNotifications(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newAlerts = alerts.filter(a => !existingIds.has(a.id));
      return [...newAlerts, ...prev];
    });
  }, [inventory]);

  const recordUsage = (itemId: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || quantity <= 0) return;

    setInventory(prev => prev.map(i => 
      i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - quantity), lastUpdated: new Date().toISOString() } : i
    ));

    const newEntry: UsageHistory = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      itemName: item.name,
      date: new Date().toISOString(),
      quantityConsumed: quantity,
      unit: item.unit
    };
    setUsage(prev => [newEntry, ...prev]);
  };

  const getDailySuggestion = async () => {
    setIsLoading(true);
    try {
      const res = await GeminiService.suggestDailyOrders(inventory, usage);
      setAiSuggestion(res);
      setActiveTab('orders');
    } finally {
      setIsLoading(false);
    }
  };

  const onChatSend = async (msg: string) => {
    if (!msg.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsLoading(true);
    try {
      const res = await GeminiService.chatWithInventory(msg, inventory, chatMessages, isThinking);
      setChatMessages(prev => [...prev, { role: 'model', text: res }]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            <ChefHat className="text-white" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black tracking-tight text-white leading-none">Blanquita<span className="text-emerald-500">IA</span></span>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Cocina Inteligente</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">General</p>
        <NavItem active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={18} />} label="Panel de Control" />
        <NavItem active={activeTab === 'inventory'} onClick={() => handleTabChange('inventory')} icon={<Package size={18} />} label="Inventario" />
        <NavItem active={activeTab === 'usage'} onClick={() => handleTabChange('usage')} icon={<History size={18} />} label="Consumo Diario" />
        
        <p className="px-4 py-2 mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inteligencia</p>
        <NavItem active={activeTab === 'chat'} onClick={() => handleTabChange('chat')} icon={<MessageSquare size={18} />} label="Asistente IA" />
        <NavItem active={activeTab === 'scan'} onClick={() => handleTabChange('scan')} icon={<Camera size={18} />} label="Visión Artificial" />
        
        <p className="px-4 py-2 mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logística</p>
        <NavItem active={activeTab === 'orders'} onClick={() => handleTabChange('orders')} icon={<Truck size={18} />} label="Proveedores" />
      </nav>

      <div className="p-4 md:p-6 m-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">JD</div>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-slate-100 text-sm truncate">Chef Karen A.</p>
            <p className="text-slate-500 text-xs truncate">Administrador</p>
          </div>
          <button className="text-slate-600 hover:text-purple-400 transition-colors p-1"><LogOut size={16}/></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col hidden lg:flex shrink-0 bg-black/20 backdrop-blur-3xl">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#09090b] border-r border-white/10 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex justify-end p-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden relative">
        {/* Header */}
        <header className="h-16 md:h-20 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-6">
             <button 
               onClick={() => setIsMobileMenuOpen(true)}
               className="p-2 lg:hidden text-slate-400 hover:text-white transition-colors"
             >
               <Menu size={24} />
             </button>
             <h2 className="text-sm md:text-xl font-bold text-white tracking-tight uppercase tracking-widest truncate max-w-[150px] md:max-w-none">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="bg-white/5 border border-white/10 pl-12 pr-6 py-2 rounded-2xl text-sm w-40 md:w-80 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-slate-300 placeholder:text-slate-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`p-2.5 md:p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all relative ${activeTab === 'notifications' ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : ''}`}
            >
              <Bell size={20} />
              {stats.unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 md:top-3 md:right-3 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#09090b] flex items-center justify-center text-[8px] font-black text-white">
                  {stats.unreadNotifications}
                </span>
              )}
            </button>
            <button className="p-2.5 md:p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all sm:flex hidden">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 space-y-6 md:space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && <DashboardView stats={stats} inventory={inventory} getDailySuggestion={getDailySuggestion} isLoading={isLoading} setTab={handleTabChange} />}
          {activeTab === 'inventory' && <InventoryView inventory={inventory} searchTerm={searchTerm} onRecordUsage={recordUsage} />}
          {activeTab === 'orders' && <OrdersView suppliers={SUPPLIERS} suggestion={aiSuggestion} onClearSuggestion={() => setAiSuggestion(null)} getDailySuggestion={getDailySuggestion} isLoading={isLoading} />}
          {activeTab === 'chat' && <ChatView messages={chatMessages} onSend={onChatSend} isLoading={isLoading} isThinking={isThinking} setIsThinking={setIsThinking} />}
          {activeTab === 'scan' && <ScanView />}
          {activeTab === 'notifications' && <NotificationsView notifications={notifications} markAllAsRead={markAllAsRead} />}
          {activeTab === 'usage' && <UsageView usage={usage} inventory={inventory} onRecordUsage={recordUsage} />}
        </div>
      </main>
    </div>
  );
};

// --- Sub-components ---

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
  >
    <span className={active ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}>{icon}</span>
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </button>
);

const DashboardView: React.FC<{ stats: any; inventory: InventoryItem[]; getDailySuggestion: () => void; isLoading: boolean; setTab: any }> = ({ stats, inventory, getDailySuggestion, isLoading, setTab }) => {
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-2xl">
           <div className="relative z-10 max-w-lg">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full mb-4 md:mb-6 border border-emerald-500/20">
                <Sparkles size={12} /> IA Logística y Previsión
              </span>
              <h3 className="text-2xl md:text-4xl font-black text-white leading-tight">Optimiza tu cocina con inteligencia real.</h3>
              <p className="text-slate-500 mt-2 md:mt-4 text-sm md:text-base font-medium leading-relaxed">Analizamos tu consumo diario para sugerir compras inteligentes y reducir mermas.</p>
           </div>
           <div className="mt-6 md:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 relative z-10">
             <button 
               onClick={getDailySuggestion}
               disabled={isLoading}
               className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all shadow-[0_15px_40px_-10px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-3"
             >
               {isLoading ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
               Recomendación de Compra
             </button>
             <button 
                onClick={() => setTab('chat')}
                className="px-6 md:px-8 py-3.5 md:py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all border border-white/10 active:scale-95 flex items-center justify-center"
             >
               Consultar IA
             </button>
           </div>
           <div className="absolute top-[-50px] right-[-50px] w-64 md:w-96 h-64 md:h-96 bg-emerald-500/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
          <MetricCard title="Valor Almacén" value={`${stats.totalValue.toLocaleString()}€`} icon={<ShoppingBag className="text-emerald-400" />} trend="+2.4% mes" />
          <MetricCard title="Stock Crítico" value={stats.criticalItems} icon={<AlertTriangle className="text-rose-500" />} trend="Acción requerida" color="text-rose-500" />
        </div>
      </div>

      {/* Grid of secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-zinc-900/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 flex flex-col gap-3 md:gap-4">
           <div className="flex items-center justify-between">
              <p className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Eficiencia Operativa</p>
              <PieChart size={16} className="text-emerald-500" />
           </div>
           <p className="text-2xl md:text-4xl font-black text-white">96.8%</p>
           <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[96.8%] transition-all duration-1000"></div>
           </div>
        </div>
        <div className="bg-zinc-900/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 flex flex-col gap-3 md:gap-4">
           <div className="flex items-center justify-between">
              <p className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Ahorro IA</p>
              <ArrowUpRight size={16} className="text-indigo-400" />
           </div>
           <p className="text-2xl md:text-4xl font-black text-white">412€</p>
           <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Semanal</p>
        </div>
        <div className="bg-zinc-900/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 flex flex-col gap-3 md:gap-4 sm:col-span-2 md:col-span-1">
           <div className="flex items-center justify-between">
              <p className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Mermas</p>
              <Filter size={16} className="text-rose-500" />
           </div>
           <p className="text-2xl md:text-4xl font-black text-white">1.2k€</p>
           <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wide">8% menos vs mes ant.</p>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: any; icon: React.ReactNode; trend: string; color?: string }> = ({ title, value, icon, trend, color }) => (
  <div className="bg-zinc-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 flex flex-col justify-between shadow-xl h-full group hover:border-emerald-500/10 transition-all">
    <div className="flex justify-between items-start">
       <span className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">{title}</span>
       <div className="p-2 md:p-3 bg-white/5 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
    </div>
    <div className="mt-2 md:mt-4">
      <p className={`text-2xl md:text-4xl font-black ${color || 'text-white'}`}>{value}</p>
      <p className="text-[9px] md:text-[10px] font-bold text-slate-500 mt-1 md:mt-2 uppercase tracking-wide">{trend}</p>
    </div>
  </div>
);

const InventoryView: React.FC<{ inventory: InventoryItem[]; searchTerm: string; onRecordUsage: (id: string, q: number) => void }> = ({ inventory, searchTerm, onRecordUsage }) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [usageValue, setUsageValue] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiry'>('name');

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.category));
    return ['All', ...Array.from(cats)];
  }, [inventory]);

  const processedInventory = useMemo(() => {
    let result = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCategory !== 'All') {
      result = result.filter(i => i.category === filterCategory);
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return a.quantity - b.quantity;
      if (sortBy === 'expiry') return (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999');
      return 0;
    });
  }, [inventory, searchTerm, filterCategory, sortBy]);

  return (
    <div className="space-y-4 md:space-y-8 animate-in slide-in-from-right-4 duration-500 pb-10">
      <div className="bg-zinc-900 border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
        <div className="p-6 md:p-10 border-b border-white/5 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">Stock Estratégico</h3>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1">Gestión de suministros gourmet</p>
            </div>
            <button className="sm:hidden p-3 bg-emerald-500 text-black rounded-xl shadow-lg active:scale-90">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div className="flex items-center gap-2 bg-white/5 px-3 md:px-4 py-2.5 rounded-xl border border-white/10">
                <Filter size={14} className="text-slate-500 shrink-0" />
                <select 
                  className="bg-transparent text-slate-300 text-[10px] md:text-xs font-bold outline-none cursor-pointer w-full"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  {categories.map(cat => <option key={cat} value={cat} className="bg-[#09090b]">{cat}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white/5 px-3 md:px-4 py-2.5 rounded-xl border border-white/10">
                <ArrowUpDown size={14} className="text-slate-500 shrink-0" />
                <select 
                  className="bg-transparent text-slate-300 text-[10px] md:text-xs font-bold outline-none cursor-pointer w-full"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="name" className="bg-[#09090b]">Nombre</option>
                  <option value="quantity" className="bg-[#09090b]">Cantidad</option>
                  <option value="expiry" className="bg-[#09090b]">Caducidad</option>
                </select>
              </div>
            </div>

            <button className="hidden sm:flex px-6 py-2.5 md:py-3 bg-emerald-500 text-black rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs hover:bg-emerald-400 transition-all shadow-lg active:scale-95 items-center justify-center gap-2">
              <PlusCircle size={16} /> Alta Recurso
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Producto</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Stock</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Valor</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Estatus</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {processedInventory.map(item => (
                <InventoryRow key={item.id} item={item} onSelect={setSelectedItem} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-white/5">
          {processedInventory.map(item => (
            <div key={item.id} className="p-5 space-y-4 hover:bg-white/2 transition-colors group active:bg-white/5" onClick={() => setSelectedItem(item)}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-lg font-black shrink-0 ${CATEGORY_THEMES[item.category] || CATEGORY_THEMES.Default}`}>
                    {item.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-white text-base leading-tight truncate">{item.name}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{item.category}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-white">{item.quantity} <span className="text-slate-500 font-medium text-xs uppercase tracking-tight">{item.unit}</span></p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">{(item.quantity * item.pricePerUnit).toLocaleString()}€</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                {item.quantity <= item.minThreshold ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase rounded-lg border border-rose-500/20">
                     <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div> Reabastecer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase rounded-lg border border-emerald-500/20">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Óptimo
                  </span>
                )}
                <div className="flex gap-2">
                   <button className="p-2 bg-white/5 rounded-xl text-slate-400"><History size={16}/></button>
                   <button className="p-2 bg-rose-500/10 rounded-xl text-rose-500"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border-t sm:border border-white/10 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-8 md:p-10 shadow-3xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-6 md:mb-8">
               <h4 className="text-xl md:text-2xl font-black text-white">Registrar Consumo</h4>
               <button onClick={() => setSelectedItem(null)} className="text-slate-600 hover:text-white transition-colors p-1"><X size={24}/></button>
            </div>
            <div className="space-y-6 md:space-y-8">
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl md:rounded-3xl border border-white/5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${CATEGORY_THEMES[selectedItem.category] || CATEGORY_THEMES.Default}`}>{selectedItem.name[0]}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{selectedItem.name}</p>
                    <p className="text-xs text-slate-500">Stock: {selectedItem.quantity} {selectedItem.unit}</p>
                  </div>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 flex justify-between items-center">
                    <span>Cantidad a descontar ({selectedItem.unit})</span>
                    <span className="text-emerald-500 font-black">Restante: {(selectedItem.quantity - usageValue).toFixed(1)}</span>
                 </label>
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setUsageValue(prev => Math.max(1, prev - 1))}
                      className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white active:scale-90"
                    >
                      <Minus size={20} />
                    </button>
                    <input 
                      type="number" 
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-center text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      value={usageValue}
                      onChange={(e) => setUsageValue(Number(e.target.value))}
                    />
                    <button 
                      onClick={() => setUsageValue(prev => prev + 1)}
                      className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white active:scale-90"
                    >
                      <Plus size={20} />
                    </button>
                 </div>
               </div>
               <button 
                onClick={() => { onRecordUsage(selectedItem.id, usageValue); setSelectedItem(null); setUsageValue(1); }}
                className="w-full bg-emerald-500 py-4 md:py-5 rounded-2xl md:rounded-3xl text-black font-black text-base md:text-lg hover:bg-emerald-400 transition-all shadow-xl active:scale-95"
               >
                 Confirmar Operación
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InventoryRow: React.FC<{ item: InventoryItem; onSelect: any }> = ({ item, onSelect }) => (
  <tr className="hover:bg-white/2 transition-colors group">
    <td className="px-10 py-8">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-3xl border flex items-center justify-center text-xl font-black transition-transform group-hover:scale-110 shrink-0 ${CATEGORY_THEMES[item.category] || CATEGORY_THEMES.Default}`}>
          {item.name[0]}
        </div>
        <div>
          <p className="font-black text-white text-lg leading-none truncate max-w-[200px]">{item.name}</p>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">{item.category}</p>
        </div>
      </div>
    </td>
    <td className="px-10 py-8 text-center">
       <p className="text-xl font-black text-white">{item.quantity} <span className="text-slate-500 font-medium text-sm uppercase">{item.unit}</span></p>
    </td>
    <td className="px-10 py-8 text-sm font-bold text-slate-500">
      {(item.quantity * item.pricePerUnit).toLocaleString()}€
    </td>
    <td className="px-10 py-8">
      {item.quantity <= item.minThreshold ? (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase rounded-full border border-rose-500/20">
           <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div> Reabastecer
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase rounded-full border border-emerald-500/20">
           <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Óptimo
        </span>
      )}
    </td>
    <td className="px-10 py-8 text-right whitespace-nowrap">
      <button 
        onClick={() => onSelect(item)}
        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all mr-3"
      >
        <History size={18} />
      </button>
      <button className="p-3 bg-white/5 hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all">
        <Trash2 size={18} />
      </button>
    </td>
  </tr>
);

const NotificationsView: React.FC<{ notifications: AppNotification[]; markAllAsRead: () => void }> = ({ notifications, markAllAsRead }) => {
  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Centro de Alertas</h3>
          <p className="text-slate-500 mt-1 md:mt-2 text-sm font-medium uppercase tracking-wide">Notificaciones de stock mínimo</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="px-4 md:px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold text-emerald-400 border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Check size={16} /> Marcar todo como leído
        </button>
      </div>

      <div className="space-y-3 md:space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-zinc-900/50 p-12 md:p-20 text-center rounded-[2rem] md:rounded-[3rem] border border-white/5">
            <Bell size={40} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-500 font-bold">No hay alertas activas.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border transition-all flex items-start gap-4 md:gap-6 ${n.isRead ? 'bg-zinc-900/30 border-white/5 opacity-60' : 'bg-zinc-900 border-emerald-500/20 shadow-xl'}`}>
               <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0 ${n.type === 'critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {n.type === 'critical' ? <AlertTriangle size={20} /> : <Info size={20} />}
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-base md:text-xl font-bold text-white truncate">{n.title}</h4>
                    <span className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm leading-relaxed">{n.message}</p>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const UsageView: React.FC<{ usage: UsageHistory[]; inventory: InventoryItem[]; onRecordUsage: (id: string, q: number) => void }> = ({ usage, inventory, onRecordUsage }) => {
  const [selectedItem, setSelectedItem] = useState('');
  const [q, setQ] = useState(1);

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-left-4 duration-500 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-1 bg-zinc-900 border border-white/5 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] h-fit">
          <h3 className="text-xl md:text-2xl font-black text-white mb-6">Nuevo Registro</h3>
          <div className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Ingrediente</label>
              <select 
                className="w-full bg-white/5 border border-white/10 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="">Selecciona...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Cantidad Consumida</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-slate-300 focus:outline-none text-sm"
                value={q}
                onChange={(e) => setQ(Number(e.target.value))}
              />
            </div>
            <button 
              onClick={() => { onRecordUsage(selectedItem, q); setSelectedItem(''); }}
              className="w-full bg-emerald-500 py-4 md:py-5 rounded-xl md:rounded-3xl text-black font-black text-xs md:text-sm hover:bg-emerald-400 transition-all shadow-xl active:scale-95"
            >
              Registrar Gasto
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4 md:space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xl md:text-2xl font-black text-white">Historial</h3>
              <button className="p-2.5 bg-white/5 rounded-xl text-slate-500"><Filter size={16}/></button>
           </div>
           
           <div className="bg-zinc-900/50 border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
             {/* Desktop Usage Table */}
             <div className="hidden sm:block overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-white/2">
                     <tr>
                        <th className="px-6 md:px-10 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Fecha</th>
                        <th className="px-6 md:px-10 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Producto</th>
                        <th className="px-6 md:px-10 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Cantidad</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {usage.map(u => (
                        <tr key={u.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 md:px-10 py-5 md:py-6 text-xs text-slate-500 font-bold">{new Date(u.date).toLocaleDateString()}</td>
                          <td className="px-6 md:px-10 py-5 md:py-6 text-sm font-black text-white">{u.itemName}</td>
                          <td className="px-6 md:px-10 py-5 md:py-6 text-right font-black text-emerald-400">-{u.quantityConsumed} {u.unit}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             </div>

             {/* Mobile Usage List */}
             <div className="sm:hidden divide-y divide-white/5">
                {usage.map(u => (
                  <div key={u.id} className="p-4 flex justify-between items-center bg-zinc-900/30">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">{u.itemName}</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">{new Date(u.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-black text-rose-400">-{u.quantityConsumed} {u.unit}</p>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const OrdersView: React.FC<{ suppliers: Supplier[]; suggestion: string | null; onClearSuggestion: () => void; getDailySuggestion: () => void; isLoading: boolean }> = ({ suppliers, suggestion, onClearSuggestion, getDailySuggestion, isLoading }) => {
  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-left-4 duration-500 pb-10">
      {!suggestion ? (
        <div className="bg-zinc-900 border border-emerald-500/20 p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-10 shadow-3xl overflow-hidden relative">
          <div className="relative z-10 max-w-xl text-center lg:text-left">
             <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500/10 text-emerald-400 rounded-xl md:rounded-2xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <BrainCircuit size={28} />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white">Logística Predictiva</h3>
             </div>
             <p className="text-slate-400 leading-relaxed font-medium text-sm md:text-lg">Analizamos el consumo promedio y el stock actual para generar una sugerencia de compra que elimine el desperdicio.</p>
             <button 
               onClick={getDailySuggestion}
               disabled={isLoading}
               className="mt-6 md:mt-10 w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl md:rounded-3xl font-black text-base md:text-lg transition-all shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-3"
             >
               {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
               Generar Orden IA
             </button>
          </div>
          <div className="relative z-10 w-full lg:w-96 bg-black/40 border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 backdrop-blur-3xl shadow-2xl">
             <h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 md:mb-6 text-center">Eficiencia de Costes</h4>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-xs md:text-sm"><span className="text-slate-400 font-bold">Bodegas Selectas</span> <span className="text-emerald-400 font-black">-15%</span></div>
                <div className="flex justify-between items-center text-xs md:text-sm"><span className="text-slate-400 font-bold">Huerta Real</span> <span className="text-emerald-400 font-black">+12%</span></div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-4 md:mt-6"><div className="bg-emerald-500 h-full w-[80%]"></div></div>
             </div>
          </div>
          <div className="absolute top-0 right-0 w-64 md:w-[500px] h-64 md:h-[500px] bg-emerald-500/5 blur-[80px] md:blur-[120px] rounded-full"></div>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-emerald-500/40 p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] shadow-3xl relative animate-in zoom-in-95 duration-500">
           <div className="flex justify-between items-center mb-6 md:mb-10">
              <div className="flex items-center gap-3 md:gap-4">
                <Sparkles className="text-emerald-400" size={24} />
                <h4 className="text-xl md:text-3xl font-black text-white">Plan de Abastecimiento</h4>
              </div>
              <button onClick={onClearSuggestion} className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all text-slate-500 hover:text-white">✕</button>
           </div>
           <div className="prose prose-invert max-w-none bg-black/40 p-5 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 shadow-inner leading-relaxed text-slate-300 font-medium overflow-y-auto max-h-[300px] md:max-h-[500px] custom-scrollbar text-xs md:text-base">
              <div dangerouslySetInnerHTML={{ __html: suggestion.replace(/\n/g, '<br/>') }}></div>
           </div>
           <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3 md:gap-6">
              <button className="flex-1 bg-emerald-500 py-4 md:py-6 rounded-xl md:rounded-3xl text-black font-black text-base md:text-xl hover:bg-emerald-400 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                 <ShoppingCart size={20} /> Confirmar Pedido
              </button>
              <button className="flex-1 bg-white/5 py-4 md:py-6 rounded-xl md:rounded-3xl text-white font-black text-base md:text-xl hover:bg-white/10 transition-all border border-white/10 active:scale-95 flex items-center justify-center">
                 Albarán Digital
              </button>
           </div>
        </div>
      )}

      {/* Grid of suppliers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {suppliers.map(s => (
          <div key={s.id} className="bg-zinc-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 hover:border-emerald-500/20 transition-all group shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 md:mb-10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-black rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl group-hover:scale-110 transition-transform border border-white/5 shrink-0">
                <Truck className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="text-right">
                <p className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Fiabilidad</p>
                <p className="text-xl md:text-2xl font-black text-emerald-400">{s.reliability}%</p>
              </div>
            </div>
            <h4 className="text-xl md:text-2xl font-black text-white mb-2 truncate">{s.name}</h4>
            <p className="text-slate-500 text-xs md:text-sm font-medium mb-8 md:mb-12 truncate">{s.category}</p>
            <div className="space-y-3 md:space-y-4">
              <button 
                onClick={() => window.open(`https://wa.me/${s.phone}`, '_blank')}
                className="w-full py-4 md:py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl md:rounded-3xl text-emerald-400 font-black text-[10px] md:text-xs hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2 md:gap-3"
              >
                <MessageCircle size={16} /> Pedido WhatsApp
              </button>
              <button className="w-full py-4 md:py-5 bg-black/40 border border-white/5 rounded-xl md:rounded-3xl text-slate-500 font-black text-[10px] md:text-xs hover:text-white hover:border-white/10 transition-all">Ver Historial</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatView: React.FC<{ messages: ChatMessage[]; onSend: (msg: string) => void; isLoading: boolean; isThinking: boolean; setIsThinking: (t: boolean) => void }> = ({ messages, onSend, isLoading, isThinking, setIsThinking }) => {
  const [input, setInput] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-220px)] bg-zinc-900 border border-white/5 rounded-[1.5rem] md:rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="bg-black/60 px-6 md:px-10 py-4 md:py-8 text-white flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 gap-4">
        <div className="flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-500 rounded-xl md:rounded-3xl flex items-center justify-center shadow-2xl shrink-0"><BrainCircuit size={24} className="text-black" /></div>
          <div>
            <h4 className="font-black text-base md:text-xl">IA De Cocina</h4>
            <div className="flex items-center gap-2 mt-0.5 md:mt-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span><p className="text-[8px] md:text-[10px] text-emerald-500 uppercase font-bold tracking-widest">En línea</p></div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6">
           <button 
             onClick={() => onSend("Sugiéreme una receta para menú hoy basada en mi stock actual")}
             className="px-3 md:px-5 py-2 md:py-3 bg-white/5 hover:bg-white/10 text-[9px] md:text-xs font-black rounded-lg md:rounded-2xl border border-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-2"
           >
             <ChefHat size={14}/> <span className="hidden sm:inline">Receta Sugerida</span><span className="sm:hidden">Receta</span>
           </button>
           <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
           <div className="flex items-center gap-2 md:gap-4">
              <span className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">IA Pro</span>
              <button onClick={() => setIsThinking(!isThinking)} className={`w-10 md:w-14 h-5 md:h-7 rounded-full relative transition-all duration-300 ${isThinking ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                <div className={`absolute top-0.5 md:top-1 w-4 md:w-5 h-4 md:h-5 bg-white rounded-full transition-all shadow-lg ${isThinking ? 'left-5 md:left-8' : 'left-0.5 md:left-1'}`} />
              </button>
           </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 p-6 md:p-10 overflow-y-auto space-y-6 md:space-y-8 custom-scrollbar bg-black/20">
        {messages.length === 0 && (
          <div className="text-center py-10 md:py-20">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 border border-white/5">
              <MessageSquare className="w-8 h-8 md:w-12 md:h-12 text-slate-800" />
            </div>
            <p className="font-black text-xl md:text-2xl text-slate-400 tracking-tight px-4">Centro de Inteligencia Gastronómica</p>
            <p className="text-slate-600 max-w-xs mx-auto mt-2 md:mt-4 font-medium text-xs md:text-sm px-4">Consulta costes, auditorías de stock y control de albaranes.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] px-5 md:px-8 py-3 md:py-5 rounded-2xl md:rounded-[2.5rem] text-sm md:text-base shadow-2xl leading-relaxed font-medium ${m.role === 'user' ? 'bg-emerald-600 text-black rounded-tr-none' : 'bg-zinc-800 text-slate-200 rounded-tl-none border border-white/5'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 px-5 md:px-8 py-3 md:py-5 rounded-2xl md:rounded-[2.5rem] rounded-tl-none border border-white/5 flex items-center gap-3 md:gap-4 text-slate-500 italic text-xs md:text-sm">
              <Loader2 className="animate-spin text-emerald-500" size={16} /> 
              {isThinking ? "Calculando algoritmos..." : "Analizando..."}
            </div>
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if(input.trim() && !isLoading) { onSend(input); setInput(''); } }} className="p-4 md:p-10 bg-black/40 border-t border-white/5 flex gap-3 md:gap-6">
        <input 
          type="text" 
          placeholder="Consulta..." 
          className="flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-3xl px-4 md:px-8 py-3 md:py-5 outline-none font-bold text-sm md:text-lg focus:ring-2 focus:ring-emerald-500/20 text-slate-200 placeholder:text-slate-700 transition-all" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
        />
        <button type="submit" disabled={isLoading} className="w-12 md:w-20 bg-emerald-500 text-black rounded-xl md:rounded-3xl hover:bg-emerald-400 transition-all shadow-2xl flex items-center justify-center active:scale-90 disabled:opacity-50 shrink-0">
          <Send className="w-5 h-5 md:w-7 md:h-7" />
        </button>
      </form>
    </div>
  );
};

const ScanView: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-10 md:space-y-16 animate-in zoom-in-95 duration-700 p-6">
    <div className="relative">
      <div className="w-48 h-48 md:w-64 md:h-64 bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 rounded-[3rem] md:rounded-[4rem] flex items-center justify-center text-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.15)] relative group cursor-pointer transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20">
        <Camera strokeWidth={1} className="w-16 h-16 md:w-[100px] md:h-[100px] group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] md:blur-[150px] rounded-full -z-10 animate-pulse"></div>
    </div>
    <div className="text-center max-w-2xl">
      <h3 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight px-4">Escáner <span className="text-emerald-500">IA</span> Gastronómico</h3>
      <p className="text-slate-500 mt-4 md:mt-8 text-base md:text-xl font-medium leading-relaxed px-4">Analiza albaranes, etiquetas y stock real con visión artificial.</p>
    </div>
    <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full max-w-md md:max-w-none px-4">
      <label className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black px-6 md:px-14 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] font-black cursor-pointer transition-all shadow-xl flex items-center justify-center gap-3 md:gap-4 active:scale-95 text-sm md:text-lg">
        <Camera size={20} /> Iniciar Captura
        <input type="file" className="hidden" accept="image/*" />
      </label>
      <button className="flex-1 px-6 md:px-14 py-4 md:py-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl md:rounded-[2.5rem] font-black text-sm md:text-lg transition-all active:scale-95">Ver Galería</button>
    </div>
  </div>
);

export default App;
