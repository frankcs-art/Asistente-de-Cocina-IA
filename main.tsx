import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Truck, Bell, MessageSquare, Camera, Plus, Search,
  AlertTriangle, ChevronRight, Send, Loader2, Trash2, BrainCircuit, TrendingDown,
  Clock, CheckCircle2, ShoppingCart, MessageCircle, Sparkles, History,
  ArrowUpRight, Minus, PlusCircle, ShoppingBag, PieChart, ChefHat, 
  Settings, LogOut, Check, X, Filter, Info, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { InventoryItem, Supplier, AppNotification, ChatMessage, UsageHistory } from './types';
import { GeminiService } from './services/geminiService';
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

  return (
    <div className="flex h-screen bg-[#09090b] text-slate-200 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col hidden lg:flex shrink-0 bg-black/20 backdrop-blur-3xl">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <ChefHat className="text-white" size={26} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white leading-none">Blanquita<span className="text-emerald-500">IA</span></span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Cocina Inteligente</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">General</p>
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label="Panel de Control" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={18} />} label="Inventario" />
          <NavItem active={activeTab === 'usage'} onClick={() => setActiveTab('usage')} icon={<History size={18} />} label="Consumo Diario" />
          
          <p className="px-4 py-2 mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inteligencia</p>
          <NavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={18} />} label="Asistente IA" />
          <NavItem active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon={<Camera size={18} />} label="Visión Artificial" />
          
          <p className="px-4 py-2 mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logística</p>
          <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<Truck size={18} />} label="Proveedores" />
        </nav>

        <div className="p-6 m-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg">JD</div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-slate-100 text-sm truncate">Chef Karen A.</p>
              <p className="text-slate-500 text-xs">Administrador</p>
            </div>
            <button className="text-slate-600 hover:text-purple-400 transition-colors"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-6">
             <h2 className="text-xl font-bold text-white tracking-tight uppercase tracking-widest">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Buscar recursos gourmet..." 
                className="bg-white/5 border border-white/10 pl-12 pr-6 py-2.5 rounded-2xl text-sm w-80 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-slate-300 placeholder:text-slate-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all relative ${activeTab === 'notifications' ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : ''}`}
            >
              <Bell size={20} />
              {stats.unreadNotifications > 0 && (
                <span className="absolute top-3 right-3 w-4 h-4 bg-rose-500 rounded-full border-4 border-[#09090b] flex items-center justify-center text-[8px] font-black text-white">
                  {stats.unreadNotifications}
                </span>
              )}
            </button>
            <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10 custom-scrollbar">
          {activeTab === 'dashboard' && <DashboardView stats={stats} inventory={inventory} getDailySuggestion={getDailySuggestion} isLoading={isLoading} setTab={setActiveTab} />}
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-2xl">
           <div className="relative z-10 max-w-lg">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-6 border border-emerald-500/20">
                <Sparkles size={12} /> IA Logística y Previsión de pedidos Recetario.
              </span>
              <h3 className="text-4xl font-black text-white leading-tight">Optimiza tu cocina <br/>con inteligencia real sugerencia de menús diarios.</h3>
              <p className="text-slate-500 mt-4 font-medium leading-relaxed">Analizamos tu consumo diario para sugerir compras inteligentes y reducir mermas directo a WhatsApp.</p>
           </div>
           <div className="mt-12 flex items-center gap-4 relative z-10">
             <button 
               onClick={getDailySuggestion}
               disabled={isLoading}
               className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-[0_15px_40px_-10px_rgba(16,185,129,0.5)] active:scale-95 flex items-center gap-3"
             >
               {isLoading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
               Recomendación de Compra por historial de consumo diario
             </button>
             <button 
                onClick={() => setTab('chat')}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all border border-white/10 active:scale-95"
             >
               Consultar a Blanquita IA
             </button>
           </div>
           {/* Background decorative elements */}
           <div className="absolute top-[-50px] right-[-50px] w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="space-y-6">
          <MetricCard title="Valor del Almacén" value={`${stats.totalValue.toLocaleString()}€`} icon={<ShoppingBag className="text-emerald-400" />} trend="+2.4% vs mes anterior" />
          <MetricCard title="Puntos de Stock Críticos" value={stats.criticalItems} icon={<AlertTriangle className="text-rose-500" />} trend="Acción requerida inmediata" color="text-rose-500" />
        </div>
      </div>

      {/* Grid of secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Eficiencia Operativa Simplificada</p>
              <PieChart size={18} className="text-emerald-500" />
           </div>
           <p className="text-4xl font-black text-white">96.8%</p>
           <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[96.8%]"></div>
           </div>
        </div>
        <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ahorro IA Semanal</p>
              <ArrowUpRight size={18} className="text-indigo-400" />
           </div>
           <p className="text-4xl font-black text-white">412€</p>
           <p className="text-xs text-indigo-400 font-bold">Por optimización de proveedores</p>
        </div>
        <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Mermas</p>
              <Filter size={18} className="text-rose-500" />
           </div>
           <p className="text-4xl font-black text-white">1.2k€</p>
           <p className="text-xs text-rose-500 font-bold">8% menos que la semana pasada</p>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: any; icon: React.ReactNode; trend: string; color?: string }> = ({ title, value, icon, trend, color }) => (
  <div className="bg-zinc-900 p-8 rounded-[2rem] border border-white/5 flex flex-col justify-between shadow-xl h-full group hover:border-white/10 transition-colors">
    <div className="flex justify-between items-start">
       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{title}</span>
       <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
    </div>
    <div className="mt-4">
      <p className={`text-4xl font-black ${color || 'text-white'}`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-500 mt-2">{trend}</p>
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
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-2xl font-black text-white">Stock Estratégico</h3>
            <p className="text-slate-500 text-sm mt-1">Control de Productos de Comida Nacional</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <Filter size={16} className="text-slate-500" />
              <select 
                className="bg-transparent text-slate-300 text-xs font-bold outline-none cursor-pointer"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat} className="bg-[#09090b]">{cat}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <ArrowUpDown size={16} className="text-slate-500" />
              <select 
                className="bg-transparent text-slate-300 text-xs font-bold outline-none cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="name" className="bg-[#09090b]">Nombre</option>
                <option value="quantity" className="bg-[#09090b]">Cantidad</option>
                <option value="expiry" className="bg-[#09090b]">Caducidad</option>
              </select>
            </div>

            <button className="px-6 py-3 bg-emerald-500 text-black rounded-2xl font-black text-xs hover:bg-emerald-400 transition-all shadow-lg active:scale-95 flex items-center gap-2">
              <PlusCircle size={16} /> Alta de Recurso
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
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
                <tr key={item.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-3xl border flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${CATEGORY_THEMES[item.category] || CATEGORY_THEMES.Default}`}>
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="font-black text-white text-lg leading-none">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                     <p className="text-xl font-black text-white">{item.quantity} <span className="text-slate-500 font-medium text-sm">{item.unit}</span></p>
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
                  <td className="px-10 py-8 text-right">
                    <button 
                      onClick={() => setSelectedItem(item)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all mr-3"
                    >
                      <History size={18} />
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Modal - Simplified */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-md rounded-[3rem] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
               <h4 className="text-2xl font-black text-white">Registrar Consumo</h4>
               <button onClick={() => setSelectedItem(null)} className="text-slate-600 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            <div className="space-y-8">
               <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-black font-black">{selectedItem.name[0]}</div>
                  <div>
                    <p className="font-bold text-white">{selectedItem.name}</p>
                    <p className="text-xs text-slate-500">Stock actual: {selectedItem.quantity} {selectedItem.unit}</p>
                  </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Cantidad Utilizada ({selectedItem.unit})</label>
                 <input 
                   type="number" 
                   className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-xl font-black text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all"
                   value={usageValue}
                   onChange={(e) => setUsageValue(Number(e.target.value))}
                 />
               </div>
               <button 
                onClick={() => { onRecordUsage(selectedItem.id, usageValue); setSelectedItem(null); setUsageValue(1); }}
                className="w-full bg-emerald-500 py-5 rounded-3xl text-black font-black text-lg hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
               >
                 Confirmar Gasto
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationsView: React.FC<{ notifications: AppNotification[]; markAllAsRead: () => void }> = ({ notifications, markAllAsRead }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-3xl font-black text-white tracking-tight">Centro de Alertas</h3>
          <p className="text-slate-500 mt-2 font-medium">Notificaciones de stock mínimo</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-emerald-400 border border-emerald-500/20 transition-all flex items-center gap-2"
        >
          <Check size={16} /> Marcar todo como leído
        </button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-zinc-900/50 p-20 text-center rounded-[3rem] border border-white/5">
            <Bell size={48} className="mx-auto text-slate-800 mb-6" />
            <p className="text-slate-500 font-bold">No hay alertas activas en este momento.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`p-8 rounded-[2rem] border transition-all flex items-start gap-6 ${n.isRead ? 'bg-zinc-900/30 border-white/5 opacity-60' : 'bg-zinc-900 border-emerald-500/20 shadow-xl'}`}>
               <div className={`p-4 rounded-2xl ${n.type === 'critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {n.type === 'critical' ? <AlertTriangle size={24} /> : <Info size={24} />}
               </div>
               <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xl font-bold text-white">{n.title}</h4>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(n.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-400 mt-2 leading-relaxed">{n.message}</p>
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
    <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-zinc-900 border border-white/5 p-10 rounded-[2.5rem] h-fit sticky top-20">
          <h3 className="text-2xl font-black text-white mb-6">Nuevo Registro</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Ingrediente</label>
              <select 
                className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="">Selecciona un producto...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Cantidad Consumida</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-slate-300 focus:outline-none"
                value={q}
                onChange={(e) => setQ(Number(e.target.value))}
              />
            </div>
            <button 
              onClick={() => { onRecordUsage(selectedItem, q); setSelectedItem(''); }}
              className="w-full bg-emerald-500 py-5 rounded-3xl text-black font-black text-sm hover:bg-emerald-400 transition-all shadow-xl active:scale-95"
            >
              Registrar Gasto Diario
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black text-white">Historial de Consumo</h3>
              <div className="flex gap-2">
                <button className="p-3 bg-white/5 rounded-2xl text-slate-500"><Filter size={18}/></button>
              </div>
           </div>
           <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-white/2">
                   <tr>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Fecha</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Producto</th>
                      {/* Fix: Correcting typo [10px) to [10px] */}
                      <th className="px-10 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Cantidad</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {usage.map(u => (
                      <tr key={u.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-10 py-6 text-xs text-slate-500 font-bold">{new Date(u.date).toLocaleDateString()}</td>
                        <td className="px-10 py-6 text-sm font-black text-white">{u.itemName}</td>
                        <td className="px-10 py-6 text-right font-black text-emerald-400">-{u.quantityConsumed} {u.unit}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

const OrdersView: React.FC<{ suppliers: Supplier[]; suggestion: string | null; onClearSuggestion: () => void; getDailySuggestion: () => void; isLoading: boolean }> = ({ suppliers, suggestion, onClearSuggestion, getDailySuggestion, isLoading }) => {
  return (
    <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
      {!suggestion ? (
        <div className="bg-zinc-900 border border-emerald-500/20 p-12 rounded-[3rem] flex flex-col lg:flex-row items-center justify-between gap-10 shadow-3xl overflow-hidden relative">
          <div className="relative z-10 max-w-xl">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <BrainCircuit size={32} />
                </div>
                <h3 className="text-3xl font-black text-white">Logística Predictiva</h3>
             </div>
             <p className="text-slate-400 leading-relaxed font-medium text-lg">Nuestro motor de IA analiza tus consumos de los últimos 30 días, la estacionalidad y el stock actual para generar una sugerencia de compra que elimine el desperdicio.</p>
             <button 
               onClick={getDailySuggestion}
               disabled={isLoading}
               className="mt-10 px-12 py-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-3xl font-black text-lg transition-all shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] active:scale-95 flex items-center gap-3"
             >
               {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
               Generar Orden Optimizada
             </button>
          </div>
          <div className="relative z-10 w-full lg:w-96 bg-black/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 text-center">Últimos Ahorros</h4>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold">Bodegas Selectas</span> <span className="text-emerald-400 font-black">-15% coste</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold">Huerta Real</span> <span className="text-emerald-400 font-black">+12% eficiencia</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold">El Gambón Azul</span> <span className="text-emerald-400 font-black">-10% coste</span></div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-6"><div className="bg-emerald-500 h-full w-[80%]"></div></div>
             </div>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full"></div>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-emerald-500/40 p-12 rounded-[3.5rem] shadow-3xl relative animate-in zoom-in-95 duration-500">
           <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <Sparkles className="text-emerald-400" size={32} />
                <h4 className="text-3xl font-black text-white">Plan de Abastecimiento Diario</h4>
              </div>
              <button onClick={onClearSuggestion} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all text-slate-500 hover:text-white">✕</button>
           </div>
           <div className="prose prose-invert max-w-none bg-black/40 p-10 rounded-[2.5rem] border border-white/5 shadow-inner leading-relaxed text-slate-300 font-medium overflow-y-auto max-h-[500px] custom-scrollbar">
              <div dangerouslySetInnerHTML={{ __html: suggestion.replace(/\n/g, '<br/>') }}></div>
           </div>
           <div className="mt-10 flex gap-6">
              <button className="flex-1 bg-emerald-500 py-6 rounded-3xl text-black font-black text-xl hover:bg-emerald-400 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                 <ShoppingCart size={24} /> Confirmar Todo el Pedido
              </button>
              <button className="flex-1 bg-white/5 py-6 rounded-3xl text-white font-black text-xl hover:bg-white/10 transition-all border border-white/10 active:scale-95">
                 Descargar Albarán Digital
              </button>
           </div>
        </div>
      )}

      {/* Grid of suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {suppliers.map(s => (
          <div key={s.id} className="bg-zinc-900 p-10 rounded-[3rem] border border-white/5 hover:border-white/20 transition-all group shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-10">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl group-hover:scale-110 transition-transform border border-white/5">
                <Truck size={32} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Fiabilidad</p>
                <p className="text-2xl font-black text-emerald-400">{s.reliability}%</p>
              </div>
            </div>
            <h4 className="text-2xl font-black text-white mb-2">{s.name}</h4>
            <p className="text-slate-500 text-sm font-medium mb-12">Logística Inteligente <span className="text-slate-300">{s.category}</span>.</p>
            <div className="space-y-4">
              <button 
                onClick={() => window.open(`https://wa.me/${s.phone}`, '_blank')}
                className="w-full py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400 font-black text-xs hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-3"
              >
                <MessageCircle size={18} /> Pedido WhatsApp
              </button>
              <button className="w-full py-5 bg-black/40 border border-white/5 rounded-3xl text-slate-500 font-black text-xs hover:text-white hover:border-white/10 transition-all">Ver Albaranes Históricos</button>
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
    <div className="flex flex-col h-[calc(100vh-220px)] bg-zinc-900 border border-white/5 rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="bg-black/60 px-10 py-8 text-white flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl"><BrainCircuit size={28} className="text-black" /></div>
          <div>
            <h4 className="font-black text-xl">IA De Cocina</h4>
            <div className="flex items-center gap-2 mt-1"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span><p className="text-[10px] text-emerald-500 uppercase tracking-widest">Núcleo Activo</p></div>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <button 
             onClick={() => onSend("Sugiéreme una receta para menú hoy basada en mi stock actual")}
             className="px-5 py-3 bg-white/5 hover:bg-white/10 text-xs font-black rounded-2xl border border-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-2"
           >
             <ChefHat size={16}/> Receta sugerida
           </button>
           <div className="h-8 w-px bg-white/10"></div>
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Raciocinio Profundo</span>
              <button onClick={() => setIsThinking(!isThinking)} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${isThinking ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-lg ${isThinking ? 'left-8' : 'left-1'}`} />
              </button>
           </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar bg-black/20">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
              <MessageSquare size={48} className="text-slate-800" />
            </div>
            <p className="font-black text-2xl text-slate-400 tracking-tight">Bienvenido al Centro de Inteligencia.</p>
            <p className="text-slate-600 max-w-xs mx-auto mt-4 font-medium">Pregunta sobre costes de inventario, recetas creativas o auditorías de stock y control de albaranes de pedidos.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-8 py-5 rounded-[2.5rem] text-[16px] shadow-2xl leading-relaxed font-medium ${m.role === 'user' ? 'bg-emerald-600 text-black rounded-tr-none' : 'bg-zinc-800 text-slate-200 rounded-tl-none border border-white/5'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 px-8 py-5 rounded-[2.5rem] rounded-tl-none border border-white/5 flex items-center gap-4 text-slate-500 italic text-sm"><Loader2 className="animate-spin text-emerald-500" size={20} /> {isThinking ? "Consultando algoritmos Premium..." : "Analizando despensa Premium..."}</div>
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if(input.trim() && !isLoading) { onSend(input); setInput(''); } }} className="p-10 bg-black/40 border-t border-white/5 flex gap-6">
        <input 
          type="text" 
          placeholder="Consulta Blanquita IA sobre tu cocina..." 
          className="flex-1 bg-white/5 border border-white/10 rounded-3xl px-8 py-5 outline-none font-bold text-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 text-slate-200 placeholder:text-slate-700 transition-all" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
        />
        <button type="submit" disabled={isLoading} className="w-20 bg-emerald-500 text-black rounded-3xl hover:bg-emerald-400 transition-all shadow-2xl flex items-center justify-center active:scale-90 disabled:opacity-50"><Send size={28} /></button>
      </form>
    </div>
  );
};

const ScanView: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-16 animate-in zoom-in-95 duration-700">
    <div className="relative">
      <div className="w-64 h-64 bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 rounded-[4rem] flex items-center justify-center text-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.15)] relative group cursor-pointer transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20">
        <Camera size={100} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="absolute inset-0 bg-emerald-500/10 blur-[150px] rounded-full -z-10 animate-pulse"></div>
    </div>
    <div className="text-center max-w-2xl">
      <h3 className="text-5xl font-black text-white leading-tight tracking-tight">Analizador de Documentos y Productos<br/><span className="text-emerald-500">con Asistente IA</span></h3>
      <p className="text-slate-500 mt-8 text-xl font-medium leading-relaxed">Analiza albaranes, fechas de caducidad en etiquetas y stock en inventarios con un solo clic. La IA se encarga de los datos.</p>
    </div>
    <div className="flex gap-6">
      <label className="bg-emerald-500 hover:bg-emerald-400 text-black px-14 py-6 rounded-[2.5rem] font-black cursor-pointer transition-all shadow-[0_20px_60px_-15px_rgba(16,185,129,0.6)] flex items-center gap-4 active:scale-95 text-lg">
        <Camera size={24} /> Iniciar Captura Inteligente
        <input type="file" className="hidden" accept="image/*" />
      </label>
      <button className="px-14 py-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2.5rem] font-black text-lg transition-all active:scale-95">Ver Historial de Imágenes</button>
    </div>
  </div>
);

export default App;