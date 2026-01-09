
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Bell, 
  MessageSquare, 
  Camera, 
  Plus, 
  Search,
  AlertTriangle,
  ChevronRight,
  Send,
  Loader2,
  Trash2,
  BrainCircuit
} from 'lucide-react';
import { InventoryItem, Supplier, SupplierOrder, OrderStatus, AppNotification, ChatMessage } from './types';
import { GeminiService } from './services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Initial Mock Data
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Tomatoes', category: 'Vegetables', quantity: 5, unit: 'kg', minThreshold: 10, expiryDate: '2024-06-15', lastUpdated: new Date().toISOString() },
  { id: '2', name: 'Flour', category: 'Dry Goods', quantity: 50, unit: 'kg', minThreshold: 20, expiryDate: '2025-01-01', lastUpdated: new Date().toISOString() },
  { id: '3', name: 'Milk', category: 'Dairy', quantity: 2, unit: 'L', minThreshold: 12, expiryDate: '2024-05-20', lastUpdated: new Date().toISOString() },
  { id: '4', name: 'Chicken Breast', category: 'Meat', quantity: 15, unit: 'kg', minThreshold: 5, expiryDate: '2024-05-25', lastUpdated: new Date().toISOString() },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Fresh Farms', contact: 'contact@freshfarms.com', category: 'Vegetables' },
  { id: 's2', name: 'Bakery Supply Co', contact: 'orders@bakery.com', category: 'Dry Goods' },
  { id: 's3', name: 'Dairy Direct', contact: 'sales@dairydirect.net', category: 'Dairy' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'chat' | 'scan'>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dashboard Metrics
  const lowStockCount = useMemo(() => inventory.filter(i => i.quantity <= i.minThreshold).length, [inventory]);
  const expiringSoonCount = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    return inventory.filter(i => i.expiryDate && new Date(i.expiryDate) < nextWeek).length;
  }, [inventory]);

  // Notifications Logic
  useEffect(() => {
    const newNotifications: AppNotification[] = [];
    inventory.forEach(item => {
      if (item.quantity <= item.minThreshold) {
        newNotifications.push({
          id: `low-${item.id}`,
          type: 'warning',
          message: `Low stock: ${item.name} (${item.quantity} ${item.unit} left)`,
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    });
    setNotifications(newNotifications);
  }, [inventory]);

  const handleSendMessage = async (msg: string) => {
    if (!msg.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await GeminiService.chatWithInventory(
        msg, 
        inventory, 
        chatMessages.map(m => ({ role: m.role, text: m.text })),
        isThinking
      );
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I had trouble thinking about that." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsChatLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const analysis = await GeminiService.analyzeKitchenImage(base64, file.type);
        setChatMessages(prev => [...prev, 
          { role: 'user', text: "[Image Uploaded]" },
          { role: 'model', text: analysis }
        ]);
        setActiveTab('chat');
      } catch (error) {
        console.error("Image analysis failed", error);
      } finally {
        setIsChatLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="text-emerald-400" />
            SmartKitchen
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label="Inventory" />
          <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<Truck size={20} />} label="Orders" />
          <NavItem active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={20} />} label="AI Assistant" />
          <NavItem active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} icon={<Camera size={20} />} label="Scan & Analyze" />
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold">JD</div>
            <div className="text-sm">
              <p className="font-medium">John Doe</p>
              <p className="text-slate-400 text-xs">Head Chef</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                <Bell size={20} />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <DashboardView inventory={inventory} lowStockCount={lowStockCount} expiringSoonCount={expiringSoonCount} />}
          {activeTab === 'inventory' && <InventoryView inventory={inventory} searchTerm={searchTerm} setInventory={setInventory} />}
          {activeTab === 'orders' && <OrdersView orders={orders} suppliers={INITIAL_SUPPLIERS} setOrders={setOrders} inventory={inventory} />}
          {activeTab === 'chat' && <ChatView messages={chatMessages} onSend={handleSendMessage} isLoading={isChatLoading} isThinking={isThinking} setIsThinking={setIsThinking} />}
          {activeTab === 'scan' && <ScanView onUpload={handleImageUpload} />}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}><LayoutDashboard size={24} /></button>
        <button onClick={() => setActiveTab('inventory')} className={`p-2 ${activeTab === 'inventory' ? 'text-emerald-600' : 'text-slate-400'}`}><Package size={24} /></button>
        <button onClick={() => setActiveTab('chat')} className={`p-2 ${activeTab === 'chat' ? 'text-emerald-600' : 'text-slate-400'}`}><MessageSquare size={24} /></button>
        <button onClick={() => setActiveTab('scan')} className={`p-2 ${activeTab === 'scan' ? 'text-emerald-600' : 'text-slate-400'}`}><Camera size={24} /></button>
      </nav>
    </div>
  );
};

// Sub-components

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const DashboardView: React.FC<{ inventory: InventoryItem[]; lowStockCount: number; expiringSoonCount: number }> = ({ inventory, lowStockCount, expiringSoonCount }) => {
  const chartData = inventory.map(i => ({ name: i.name, value: i.quantity, min: i.minThreshold }));
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Items" value={inventory.length} color="bg-blue-500" />
        <StatCard title="Low Stock Alerts" value={lowStockCount} color="bg-amber-500" icon={<AlertTriangle size={20} />} />
        <StatCard title="Expiring Soon" value={expiringSoonCount} color="bg-red-500" icon={<AlertTriangle size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">Stock Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} />
                <YAxis fontSize={12} tick={{ fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">Inventory Categories</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[{name: 'Veg', value: 40}, {name: 'Meat', value: 30}, {name: 'Dairy', value: 20}, {name: 'Others', value: 10}]} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number | string; color: string; icon?: React.ReactNode }> = ({ title, value, color, icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-lg ${color} text-white`}>
      {icon || <Package size={20} />}
    </div>
  </div>
);

const InventoryView: React.FC<{ inventory: InventoryItem[]; searchTerm: string; setInventory: (inv: InventoryItem[]) => void }> = ({ inventory, searchTerm, setInventory }) => {
  const filtered = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const deleteItem = (id: string) => {
    setInventory(inventory.filter(i => i.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Inventory List</h3>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={18} /> Add Item
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Item Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Expiry</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">{item.name}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{item.category}</td>
                <td className="px-6 py-4 text-sm">{item.quantity} {item.unit}</td>
                <td className="px-6 py-4">
                  {item.quantity <= item.minThreshold ? (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Low Stock</span>
                  ) : (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Optimal</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.expiryDate || 'N/A'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                  <button className="text-slate-400 hover:text-emerald-500"><ChevronRight size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrdersView: React.FC<{ orders: SupplierOrder[]; suppliers: Supplier[]; setOrders: any; inventory: InventoryItem[] }> = ({ orders, suppliers, setOrders, inventory }) => {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const generateAISuggestion = async () => {
    setIsSuggesting(true);
    try {
      const res = await GeminiService.suggestOrders(inventory);
      setSuggestion(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Supplier Orders</h3>
        <button 
          onClick={generateAISuggestion}
          disabled={isSuggesting}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50"
        >
          {isSuggesting ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
          AI Order Suggestion
        </button>
      </div>

      {suggestion && (
        <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between mb-2">
            <h4 className="font-bold text-purple-900 flex items-center gap-2"><BrainCircuit size={16} /> Gemini's Optimized Strategy</h4>
            <button onClick={() => setSuggestion(null)} className="text-purple-400 hover:text-purple-600">×</button>
          </div>
          <p className="text-sm text-purple-800 whitespace-pre-wrap leading-relaxed">{suggestion}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-lg">{s.name}</h4>
            <p className="text-slate-500 text-sm mb-4">{s.category} • {s.contact}</p>
            <button className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
              Create New Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatView: React.FC<{ messages: ChatMessage[]; onSend: (msg: string) => void; isLoading: boolean; isThinking: boolean; setIsThinking: (t: boolean) => void }> = ({ messages, onSend, isLoading, isThinking, setIsThinking }) => {
  const [input, setInput] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Kitchen AI Guru</h4>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Deep Think</span>
          <button 
            onClick={() => setIsThinking(!isThinking)}
            className={`w-10 h-5 rounded-full relative transition-colors ${isThinking ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isThinking ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <BrainCircuit size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-slate-400 font-medium">Ask me about inventory, orders, or recipes!</h3>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl flex items-center gap-2 text-slate-500 italic text-sm">
              <Loader2 className="animate-spin" size={16} /> 
              {isThinking ? "Gemini is thinking deeply..." : "Thinking..."}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 flex gap-2">
        <input 
          type="text" 
          placeholder="Ask something..." 
          className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

const ScanView: React.FC<{ onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onUpload }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-6">
    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
      <Camera size={48} />
    </div>
    <div className="text-center">
      <h3 className="text-2xl font-bold">Scan Inventory or Receipts</h3>
      <p className="text-slate-500 mt-2 max-w-sm">Take a photo of your shelves or delivery notes. Gemini will automatically extract item details and update your system.</p>
    </div>
    <div className="flex gap-4">
      <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold cursor-pointer transition-all shadow-md active:scale-95">
        Upload Photo
        <input type="file" className="hidden" accept="image/*" onChange={onUpload} />
      </label>
    </div>
  </div>
);

export default App;
