import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  User as UserIcon,
  Plus,
  Minus,
  Trash2,
  Lock,
  Unlock,
  CreditCard,
  Wifi,
  WifiOff,
  Save,
  Printer,
  X,
  UserCheck,
  Coins,
  Split,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '../api/apiClient.js';
import { getSocket } from '../api/socket.js';
import { useUserStore } from '../store/userStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  categoryId: string;
  category?: { name: string };
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints: number;
  isLoyaltyMember: boolean;
}

interface TableSimple {
  id: string;
  tableNumber: string;
  floor: { name: string };
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  priceOverride?: number;
  notes?: string;
  modifiers: Array<{ name: string; price: number; groupName: string }>;
}

export const Billing: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useUserStore();
  const { addToast } = useNotificationStore();

  // Search, category and grid states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [offlineStatus, setOfflineStatus] = useState<boolean>(!navigator.onLine);

  // Cart & Order states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<string>('EAT_IN');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Tax, Discount & Service Charges
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [tips, setTips] = useState<number>(0);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

  // Modals & Panels toggle
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [showHoldDrawer, setShowHoldDrawer] = useState<boolean>(false);
  const [showModifierDialog, setShowModifierDialog] = useState<boolean>(false);
  const [activeCartIndexForModifiers, setActiveCartIndexForModifiers] = useState<number | null>(null);

  // Price override modal state
  const [showPriceOverrideModal, setShowPriceOverrideModal] = useState<boolean>(false);
  const [overrideItemIndex, setOverrideItemIndex] = useState<number | null>(null);
  const [overridePriceVal, setOverridePriceVal] = useState<string>('');

  // Customer creation state
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');

  // Cash shift opening/closing state
  const [openingBalance, setOpeningBalance] = useState<string>('250.00');
  const [closingBalance, setClosingBalance] = useState<string>('');
  const [shiftTransAmount, setShiftTransAmount] = useState<string>('');
  const [shiftTransReason, setShiftTransReason] = useState<string>('');
  const [shiftTransType, setShiftTransType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');

  // Split billing state
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'ITEMS'>('EQUAL');
  const [splitCount, setSplitCount] = useState<number>(2);

  // Payment selections
  const [paymentSplits, setPaymentSplits] = useState<Array<{ method: string; amount: number }>>([
    { method: 'CASH', amount: 0 },
  ]);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [changeDue, setChangeDue] = useState<number>(0);
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<any | null>(null);

  // Focus ref for F1 search shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Queries
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['pos-products'],
    queryFn: () => apiClient.get('/products').then((res: any) => res.data.data),
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['pos-categories'],
    queryFn: () => apiClient.get('/categories').then((res: any) => res.data.data),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['pos-customers'],
    queryFn: () => apiClient.get('/customers').then((res: any) => res.data.data),
  });

  const { data: tables = [] } = useQuery<TableSimple[]>({
    queryKey: ['pos-tables-simple'],
    queryFn: () => apiClient.get('/tables').then((res: any) => res.data.data),
  });

  const { data: drawers = [] } = useQuery<any[]>({
    queryKey: ['cash-drawers'],
    queryFn: () => apiClient.get('/cash-shifts/drawers').then((res: any) => res.data.data),
  });

  const { data: activeShift, refetch: refetchShift } = useQuery<any>({
    queryKey: ['active-shift'],
    queryFn: () => apiClient.get('/cash-shifts/status').then((res: any) => res.data.data),
  });

  const { data: heldOrders = [], refetch: refetchHeld } = useQuery<any[]>({
    queryKey: ['held-orders'],
    queryFn: () => apiClient.get('/orders/held').then((res: any) => res.data.data),
  });

  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ['coupons-list'],
    queryFn: () => apiClient.get('/orders').then(() => [
      { name: 'Welcome Voucher (10%)', code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minSpend: 15 },
      { name: 'Happy Hour $5 Off', code: 'HAPPY5', type: 'FIXED', value: 5, minSpend: 20 },
      { name: 'Employee Discount (15%)', code: 'STAFF15', type: 'PERCENTAGE', value: 15, minSpend: 0 },
    ]),
  });

  // Offline network status tracking & auto-sync queue
  useEffect(() => {
    const handleOnline = () => {
      setOfflineStatus(false);
      addToast({ type: 'success', message: 'Connection restored. Synchronizing offline queue...' });
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setOfflineStatus(true);
      addToast({ type: 'error', message: 'Internet connection lost. Switched to Offline POS Cache.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard hotkeys shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowCustomerDrawer(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openCheckoutModal();
      } else if (e.key === 'F9') {
        e.preventDefault();
        resetCart();
      } else if (e.key === 'Escape') {
        setShowPaymentModal(false);
        setShowCustomerDrawer(false);
        setShowShiftModal(false);
        setShowHoldDrawer(false);
        setShowSplitModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomerId, orderType, selectedTableId]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();
    socket.on('order_created', () => {
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    });
    socket.on('shift_opened', () => refetchShift());
    socket.on('shift_closed', () => refetchShift());

    return () => {
      socket.off('order_created');
    };
  }, [queryClient]);

  // Mutations
  const openShiftMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/cash-shifts/open', data),
    onSuccess: () => {
      refetchShift();
      addToast({ type: 'success', message: 'Cash shift opened successfully' });
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/cash-shifts/close', data),
    onSuccess: () => {
      refetchShift();
      setShowShiftModal(false);
      addToast({ type: 'success', message: 'Shift closed successfully. Variance logged.' });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      addToast({ type: 'success', message: 'Customer registered successfully' });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/orders', data),
    onSuccess: async (res) => {
      const createdOrder = res.data.data;
      // Process payment next
      await apiClient.post('/orders/pay', {
        orderId: createdOrder.id,
        payments: paymentSplits,
        activeShiftId: activeShift?.id,
      });

      addToast({ type: 'success', message: `Order ${createdOrder.orderNumber} paid successfully!` });
      
      // Load receipt data
      const orderDetails = await apiClient.get(`/orders/${createdOrder.id}`).then((r) => r.data.data);
      setCompletedOrderReceipt(orderDetails);
      
      resetCart();
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    },
  });

  const shiftTransactionMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post(shiftTransType === 'CASH_IN' ? '/cash-shifts/cash-in' : '/cash-shifts/cash-out', data),
    onSuccess: () => {
      refetchShift();
      setShiftTransAmount('');
      setShiftTransReason('');
      addToast({ type: 'success', message: 'Shift cash ledger recorded' });
    },
  });

  // Calculations
  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.priceOverride !== undefined ? item.priceOverride : item.price;
      const modsPrice = item.modifiers.reduce((mSum, m) => mSum + m.price, 0);
      return sum + (price + modsPrice) * item.quantity;
    }, 0);
  };

  const getDiscount = () => {
    const sub = getSubtotal();
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'PERCENTAGE') {
      return sub * (appliedCoupon.value / 100);
    }
    return appliedCoupon.value;
  };

  const getTax = () => {
    const sub = getSubtotal();
    const disc = getDiscount();
    return Math.max(0, sub - disc) * 0.08; // 8% standard tax
  };

  const getTotal = () => {
    const sub = getSubtotal();
    const disc = getDiscount();
    const tax = getTax();
    return sub - disc + tax + Number(serviceCharge) + Number(deliveryCharge) + Number(tips);
  };

  // Cart operations
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.productId === product.id && !item.priceOverride);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1, modifiers: [] }]);
    }
  };

  const updateQty = (index: number, delta: number) => {
    const updated = [...cart];
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    }
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const resetCart = () => {
    setCart([]);
    setSelectedCustomerId('');
    setSelectedTableId('');
    setNotes('');
    setServiceCharge(0);
    setDeliveryCharge(0);
    setTips(0);
    setAppliedCoupon(null);
    setSelectedCouponCode('');
  };

  // Hold & Resume
  const handleHoldCart = async () => {
    if (cart.length === 0) return;
    try {
      await apiClient.post('/orders/hold', {
        orderType,
        customerId: selectedCustomerId || null,
        tableId: selectedTableId || null,
        items: cart,
        notes,
      });
      addToast({ type: 'success', message: 'Cart held successfully' });
      resetCart();
      refetchHeld();
    } catch {
      addToast({ type: 'error', message: 'Error holding cart' });
    }
  };

  const handleResumeCart = async (held: any) => {
    try {
      const res = await apiClient.post(`/orders/resume/${held.id}`);
      const restored = res.data.data;
      setCart(restored.items.map((i: any) => ({
        productId: i.productId,
        name: i.product.name,
        price: i.price,
        quantity: i.quantity,
        modifiers: i.modifiers ? JSON.parse(i.modifiers) : [],
        notes: i.notes,
      })));
      setOrderType(restored.orderType);
      setSelectedTableId(restored.tableId || '');
      setSelectedCustomerId(restored.customerId || '');
      setNotes(restored.notes || '');
      setShowHoldDrawer(false);
      refetchHeld();
      addToast({ type: 'success', message: 'Held cart restored successfully' });
    } catch {
      addToast({ type: 'error', message: 'Error resuming held cart' });
    }
  };

  // Coupons
  const applyCouponCode = () => {
    const found = coupons.find((c) => c.code.toUpperCase() === selectedCouponCode.trim().toUpperCase());
    if (found) {
      if (getSubtotal() < found.minSpend) {
        addToast({ type: 'warning', message: `Minimum spend of $${found.minSpend} required for this coupon` });
      } else {
        setAppliedCoupon(found);
        addToast({ type: 'success', message: `Coupon ${found.code} applied successfully` });
      }
    } else {
      addToast({ type: 'error', message: 'Invalid coupon code' });
    }
  };

  // Offline Synchronization helper
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('local_pos_queue') || '[]');
    if (queue.length === 0) return;

    let successfulCount = 0;
    for (const orderData of queue) {
      try {
        await apiClient.post('/orders', orderData);
        successfulCount++;
      } catch (err) {
        console.error('Error syncing order:', err);
      }
    }

    localStorage.setItem('local_pos_queue', JSON.stringify([]));
    if (successfulCount > 0) {
      addToast({ type: 'success', message: `Synced ${successfulCount} offline orders to server.` });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    }
  };

  // Process checkout payments modal opening
  const openCheckoutModal = () => {
    const totalDue = getTotal();
    setPaymentSplits([{ method: 'CASH', amount: totalDue }]);
    setCashTendered(totalDue.toFixed(2));
    setChangeDue(0);
    setCompletedOrderReceipt(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSplitChange = (index: number, field: string, value: any) => {
    const updated = [...paymentSplits];
    if (field === 'amount') {
      updated[index].amount = Number(value);
    } else {
      updated[index].method = value;
    }
    setPaymentSplits(updated);
  };

  const handleCheckoutSubmit = () => {
    // If offline, queue cart in localStorage
    if (offlineStatus) {
      const offlineQueue = JSON.parse(localStorage.getItem('local_pos_queue') || '[]');
      const offlinePayload = {
        orderType,
        customerId: selectedCustomerId || null,
        tableId: selectedTableId || null,
        items: cart,
        discounts: appliedCoupon ? [appliedCoupon] : [],
        taxRules: [{ name: 'VAT Standard', rate: 8, isInclusive: false }],
        serviceCharge,
        deliveryCharge,
        tips,
        notes,
        createdAt: new Date().toISOString(),
      };
      offlineQueue.push(offlinePayload);
      localStorage.setItem('local_pos_queue', JSON.stringify(offlineQueue));
      addToast({ type: 'warning', message: 'POS offline. Order stored locally in sync queue.' });
      resetCart();
      setShowPaymentModal(false);
      return;
    }

    // Server-side check
    checkoutMutation.mutate({
      orderType,
      customerId: selectedCustomerId || null,
      tableId: selectedTableId || null,
      items: cart,
      discounts: appliedCoupon ? [appliedCoupon] : [],
      taxRules: [{ name: 'VAT Standard', rate: 8, isInclusive: false }],
      serviceCharge,
      deliveryCharge,
      tips,
      notes,
    });
  };

  // Keyboard scanner simulation: barcodes sku search
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = products.find((p) => p.sku === searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (match) {
      addToCart(match);
      setSearchQuery('');
      addToast({ type: 'success', message: `Added ${match.name} to cart` });
    } else {
      addToast({ type: 'warning', message: 'No product matched SKU/name query.' });
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'all' || prod.categoryId === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground select-none">
      {/* Header controls bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-wider text-primary flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            CafeChai Cashier POS
          </h1>

          <div className="flex items-center gap-2 text-xs">
            {offlineStatus ? (
              <Badge variant="danger" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Offline Mode
              </Badge>
            ) : (
              <Badge variant="success" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" /> System Online
              </Badge>
            )}

            {activeShift ? (
              <Badge variant="primary" className="flex items-center gap-1">
                <Unlock className="h-3 w-3" /> Drawer Opened (Shift #{activeShift.id.slice(0, 5)})
              </Badge>
            ) : (
              <Badge variant="danger" className="flex items-center gap-1 cursor-pointer" onClick={() => setShowShiftModal(true)}>
                <Lock className="h-3 w-3" /> Drawer Closed - Click to Open
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowHoldDrawer(true)} className="relative">
            <Save className="h-4 w-4 mr-1.5" /> Held Orders
            {heldOrders.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowShiftModal(true)}>
            <Coins className="h-4 w-4 mr-1.5" /> Shift Drawer
          </Button>

          <div className="text-right text-xs">
            <p className="font-bold text-foreground">{user?.displayName || 'Cashier Desk'}</p>
            <p className="text-muted-foreground">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left Side: Product catalog and category swiper */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 overflow-y-auto">
          {/* Search bar & Barcode simulation */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search SKU barcode or product name... (Press F1 to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button type="submit" variant="outline">
              Add SKU
            </Button>
          </form>

          {/* Categories Tab Swiper */}
          <div className="flex border-b border-border overflow-x-auto gap-2 pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => (
              <Card
                key={prod.id}
                onClick={() => addToCart(prod)}
                className={`p-4 cursor-pointer hover:border-primary/50 transition-all flex flex-col justify-between h-36 ${
                  prod.stock <= prod.minStock ? 'border-amber-500/30 bg-amber-950/5' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-extrabold text-sm text-foreground line-clamp-2">{prod.name}</span>
                    {prod.stock <= prod.minStock && (
                      <Badge variant="warning" className="text-[9px] px-1 py-0 scale-90">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">SKU: {prod.sku}</span>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                  <span className="font-mono text-base font-black text-primary">${prod.price.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground font-semibold">Qty: {prod.stock}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Side: Cart Summary Panel */}
        <div className="col-span-12 lg:col-span-5 flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden h-[680px]">
          {/* Order type & dining table selector */}
          <div className="p-4 border-b border-border bg-accent/20 flex justify-between items-center gap-3">
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="bg-background border border-border text-foreground px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              <option value="EAT_IN">Dine In</option>
              <option value="TAKEAWAY">Take Away</option>
              <option value="DELIVERY">Delivery</option>
              <option value="QUICK_SALE">Quick Sale</option>
            </select>

            {orderType === 'EAT_IN' && (
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-background border border-border text-foreground px-3 py-1.5 rounded-lg text-xs font-bold flex-1"
              >
                <option value="">Select Table...</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.tableNumber}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomerDrawer(true)}
              className="text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <UserCheck className="h-3.5 w-3.5" />
              {selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId)?.name : 'Assign Cust (F2)'}
            </Button>
          </div>

          {/* Cart list scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {cart.length > 0 ? (
              cart.map((item, index) => (
                <div key={index} className="flex justify-between items-start gap-4 p-3 bg-accent/20 border border-border/50 rounded-xl hover:border-border transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-extrabold text-sm text-foreground truncate">{item.name}</span>
                      <span className="font-mono text-sm font-bold text-foreground shrink-0">
                        ${((item.priceOverride !== undefined ? item.priceOverride : item.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {item.modifiers.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Mods: {item.modifiers.map((m) => `${m.name} (+$${m.price})`).join(', ')}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setActiveCartIndexForModifiers(index);
                          setShowModifierDialog(true);
                        }}
                        className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-bold px-2 py-0.5 rounded cursor-pointer"
                      >
                        Modifiers
                      </button>

                      {hasPermission('POS.PriceOverride') && (
                        <button
                          onClick={() => {
                            setOverrideItemIndex(index);
                            setOverridePriceVal(item.price.toString());
                            setShowPriceOverrideModal(true);
                          }}
                          className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded cursor-pointer"
                        >
                          Override Price
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-center shrink-0">
                    <button
                      onClick={() => updateQty(index, -1)}
                      className="p-1 rounded bg-accent hover:bg-accent/80 text-foreground cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-sm font-black w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(index, 1)}
                      className="p-1 rounded bg-accent hover:bg-accent/80 text-foreground cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-1 rounded hover:bg-rose-950/20 text-rose-500 cursor-pointer ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2.5">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm">Active cart is empty. Add products from the grid.</p>
              </div>
            )}
          </div>

          {/* Cart totals & discounts section */}
          <div className="p-4 border-t border-border bg-accent/10 space-y-3.5">
            {/* Coupon codes trigger */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Discount coupon code..."
                value={selectedCouponCode}
                onChange={(e) => setSelectedCouponCode(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground flex-1"
              />
              <Button size="sm" onClick={applyCouponCode} className="text-xs py-1 px-3">
                Apply Code
              </Button>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-foreground">${getSubtotal().toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-mono">-${getDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT / GST (8%)</span>
                <span className="font-mono font-semibold text-foreground">${getTax().toFixed(2)}</span>
              </div>

              {/* Service charge edits */}
              <div className="flex justify-between items-center">
                <span>Service Charge</span>
                <input
                  type="number"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(Number(e.target.value))}
                  className="w-16 bg-background border border-border text-right rounded px-1.5 py-0.5 text-xs font-mono font-semibold text-foreground"
                />
              </div>
            </div>

            {/* Checkout total & Payment launch */}
            <div className="pt-3.5 border-t border-border/80 flex justify-between items-center gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Total Due</span>
                <span className="font-mono text-2xl font-black text-primary">${getTotal().toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSplitModal(true)} disabled={cart.length === 0}>
                  <Split className="h-4 w-4" /> Split
                </Button>
                <Button onClick={openCheckoutModal} disabled={cart.length === 0 || !activeShift} className="px-6 font-bold flex items-center gap-1.5 shadow-lg shadow-primary/20">
                  <CreditCard className="h-4.5 w-4.5" /> Pay Order (F4)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY MODALS & SLIDE DRAWERS */}

      {/* 1. Cash Shift Open/Close Drawer Dialog */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center gap-1.5">
                <Coins className="h-5 w-5 text-primary" /> Shift Drawer Management
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-accent/40 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Shift Opened:</span>
                    <span className="font-bold">{new Date(activeShift.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opening Drawer Cash:</span>
                    <span className="font-mono font-bold">${activeShift.openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drawer expected Cash:</span>
                    <span className="font-mono font-bold text-primary">
                      $
                      {(
                        activeShift.openingBalance +
                        activeShift.transactions.reduce((sum: number, t: any) => sum + t.amount, 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Cash In / Out ledger */}
                <div className="border-t border-border pt-3 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Log Shift Transactions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShiftTransType('CASH_IN')}
                      className={`py-2 text-xs font-bold rounded-lg border ${
                        shiftTransType === 'CASH_IN' ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      Cash Deposit (In)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftTransType('CASH_OUT')}
                      className={`py-2 text-xs font-bold rounded-lg border ${
                        shiftTransType === 'CASH_OUT' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'border-border text-muted-foreground'
                      }`}
                    >
                      Cash Drop (Out)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="number"
                      placeholder="Amount..."
                      value={shiftTransAmount}
                      onChange={(e) => setShiftTransAmount(e.target.value)}
                      className="bg-background border border-border text-foreground px-3 py-1.5 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Reason details..."
                      value={shiftTransReason}
                      onChange={(e) => setShiftTransReason(e.target.value)}
                      className="bg-background border border-border text-foreground px-3 py-1.5 rounded-lg text-xs"
                    />
                  </div>

                  <Button
                    onClick={() =>
                      shiftTransactionMutation.mutate({
                        shiftId: activeShift.id,
                        amount: shiftTransAmount,
                        reason: shiftTransReason,
                      })
                    }
                    className="w-full mt-2 text-xs py-1.5"
                    disabled={!shiftTransAmount || !shiftTransReason}
                  >
                    Save Ledger Entry
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="text-xs text-muted-foreground font-bold">Close Drawer Count ($)</label>
                  <input
                    type="number"
                    placeholder="Enter final cash drawer total..."
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                  />

                  <Button
                    onClick={() =>
                      closeShiftMutation.mutate({
                        shiftId: activeShift.id,
                        closingBalance,
                      })
                    }
                    className="w-full mt-3 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    disabled={!closingBalance}
                  >
                    Close Shift & Lock Register
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The cashier drawer is currently locked. Enter the opening shift cash flow amount to begin billing checkout.
                </p>

                <div>
                  <label className="text-xs text-muted-foreground font-bold">Opening Balance Cash ($)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground font-mono"
                  />
                </div>

                <Button
                  onClick={() =>
                    openShiftMutation.mutate({
                      drawerId: drawers[0]?.id || 'drawer-default', // mock default
                      openingBalance,
                    })
                  }
                  className="w-full font-bold"
                  disabled={!openingBalance}
                >
                  Open Cash Shift
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Customer Assignment Drawer */}
      {showCustomerDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-card border-l border-border w-full max-w-md p-6 h-screen flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                <h3 className="text-lg font-bold flex items-center gap-1.5">
                  <UserIcon className="h-5 w-5 text-primary" /> Assign POS Customer
                </h3>
                <button onClick={() => setShowCustomerDrawer(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Customer Selector search list */}
              <div className="space-y-4">
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setShowCustomerDrawer(false);
                      }}
                      className={`w-full flex justify-between items-center p-3 border rounded-xl text-left transition-colors ${
                        selectedCustomerId === c.id ? 'border-primary bg-primary/10' : 'border-border hover:border-foreground'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sm text-foreground">{c.name}</span>
                        {c.phone && <span className="text-[10px] text-muted-foreground block">{c.phone}</span>}
                      </div>
                      <Badge variant="primary" className="text-[9px]">
                        Pts: {c.loyaltyPoints}
                      </Badge>
                    </button>
                  ))}
                </div>

                {/* Quick Add Customer */}
                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Create Customer Account</h4>
                  <input
                    type="text"
                    placeholder="Customer Name..."
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number..."
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
                  />
                  <input
                    type="email"
                    placeholder="Email Address..."
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
                  />
                  <Button
                    onClick={() =>
                      createCustomerMutation.mutate({
                        name: newCustName,
                        phone: newCustPhone,
                        email: newCustEmail,
                        isLoyaltyMember: true,
                      })
                    }
                    className="w-full text-xs py-1.5"
                    disabled={!newCustName}
                  >
                    Register & Select Customer
                  </Button>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={() => setShowCustomerDrawer(false)} className="w-full">
              Close Panel
            </Button>
          </div>
        </div>
      )}

      {/* 3. Held Orders Resume Drawer */}
      {showHoldDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-card border-l border-border w-full max-w-md p-6 h-screen flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                <h3 className="text-lg font-bold flex items-center gap-1.5">
                  <Save className="h-5 w-5 text-primary" /> Active Held Orders
                </h3>
                <button onClick={() => setShowHoldDrawer(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 max-h-[500px] overflow-y-auto">
                {heldOrders.map((held) => (
                  <div key={held.id} className="p-3 bg-accent/40 border border-border rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">{held.orderNumber}</span>
                      <span className="font-mono text-sm font-black text-primary">${held.total.toFixed(2)}</span>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Held: {new Date(held.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    <Button onClick={() => handleResumeCart(held)} className="w-full text-xs py-1">
                      Resume Order ticket
                    </Button>
                  </div>
                ))}

                {heldOrders.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Save className="h-10 w-10 mx-auto opacity-30 mb-2" />
                    <p className="text-xs">No held orders available in ledger.</p>
                  </div>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={() => setShowHoldDrawer(false)} className="w-full">
              Close Drawer
            </Button>
          </div>
        </div>
      )}

      {/* 4. Payment/Checkout Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl p-6 grid grid-cols-12 gap-6 max-h-[90vh] overflow-y-auto">
            <div className="col-span-12 flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Process POS Order Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {completedOrderReceipt ? (
              <div className="col-span-12 space-y-4 text-center">
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl max-w-md mx-auto space-y-3">
                  <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-bold text-emerald-300">Payment Processed Successfully!</h4>
                  <p className="text-xs text-muted-foreground">
                    Invoice: {completedOrderReceipt.orderNumber} | Change Due: $
                    {Math.max(0, Number(cashTendered) - completedOrderReceipt.total).toFixed(2)}
                  </p>
                </div>

                {/* Thermal Ticket Printer Preview */}
                <div className="border border-border rounded-xl p-4 bg-white text-black max-w-xs mx-auto text-left font-mono text-[11px] shadow-lg leading-relaxed select-text">
                  <div className="text-center font-bold border-b border-dashed border-black pb-2 mb-2">
                    <p className="text-sm">CAFECHAI POS ENTERPRISE</p>
                    <p className="font-normal text-[9px]">Main Head Office branch</p>
                    <p className="font-normal text-[9px]">{new Date().toLocaleString()}</p>
                  </div>

                  <div className="flex justify-between">
                    <span>Order #:</span>
                    <span>{completedOrderReceipt.orderNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-black pb-2 mb-2">
                    <span>Type:</span>
                    <span className="uppercase">{completedOrderReceipt.orderType}</span>
                  </div>

                  <div className="space-y-1">
                    {completedOrderReceipt.orderItems.map((oi: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {oi.quantity}x {oi.product.name}
                        </span>
                        <span>${(oi.price * oi.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-black mt-2 pt-2 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${completedOrderReceipt.subtotal.toFixed(2)}</span>
                    </div>
                    {completedOrderReceipt.discount > 0 && (
                      <div className="flex justify-between font-bold">
                        <span>Discount:</span>
                        <span>-${completedOrderReceipt.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Taxes:</span>
                      <span>${completedOrderReceipt.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-xs border-t border-black pt-1">
                      <span>Total Paid:</span>
                      <span>${completedOrderReceipt.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center border-t border-dashed border-black mt-4 pt-2 text-[9px]">
                    <p>Powered by CafeChai Enterprise</p>
                    <p>Thank you for your visit!</p>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-1">
                    <Printer className="h-4 w-4" /> Print Thermal Ticket
                  </Button>
                  <Button onClick={() => setShowPaymentModal(false)}>Close Screen</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Left col: Split Calculator & Input keypad */}
                <div className="col-span-12 md:col-span-6 space-y-4">
                  <div className="bg-accent/20 border border-border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-sm font-bold text-muted-foreground">Total Due:</span>
                      <span className="font-mono text-xl font-extrabold text-primary">${getTotal().toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-bold">Cash Tendered ($)</label>
                      <input
                        type="text"
                        value={cashTendered}
                        onChange={(e) => {
                          setCashTendered(e.target.value);
                          setChangeDue(Math.max(0, Number(e.target.value) - getTotal()));
                        }}
                        className="w-full bg-background border border-border text-foreground font-mono text-lg px-3 py-2 rounded-lg text-right"
                      />
                    </div>

                    {/* Quick Cash calculator grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 20, 50, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setCashTendered(val.toFixed(2));
                            setChangeDue(Math.max(0, val - getTotal()));
                          }}
                          className="bg-accent hover:bg-accent/80 text-foreground py-2 text-xs font-bold rounded-lg border border-border cursor-pointer"
                        >
                          ${val} Cash
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setCashTendered(getTotal().toFixed(2));
                          setChangeDue(0);
                        }}
                        className="bg-primary/20 hover:bg-primary/30 text-primary py-2 text-xs font-bold rounded-lg border border-primary/50 cursor-pointer"
                      >
                        Exact Change
                      </button>
                    </div>

                    {changeDue > 0 && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-center font-mono font-bold text-sm">
                        Change Due: ${changeDue.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right col: Payment splits methods selection */}
                <div className="col-span-12 md:col-span-6 space-y-4">
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Payment Mode</h4>

                    {paymentSplits.map((split, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-accent/20 p-2.5 rounded-xl border border-border/50">
                        <select
                          value={split.method}
                          onChange={(e) => handlePaymentSplitChange(idx, 'method', e.target.value)}
                          className="bg-background border border-border rounded-lg text-xs px-2 py-1.5 text-foreground flex-1"
                        >
                          <option value="CASH">Cash Drawer</option>
                          <option value="CARD">Debit / Credit Card</option>
                          <option value="QR">Mobile Wallet QR</option>
                          <option value="LOYALTY">Loyalty Points</option>
                        </select>

                        <input
                          type="number"
                          value={split.amount}
                          onChange={(e) => handlePaymentSplitChange(idx, 'amount', e.target.value)}
                          className="bg-background border border-border rounded-lg text-xs px-2 py-1.5 text-foreground w-28 text-right font-mono"
                        />

                        {paymentSplits.length > 1 && (
                          <button
                            onClick={() => setPaymentSplits(paymentSplits.filter((_, i) => i !== idx))}
                            className="text-rose-500 p-1 hover:bg-accent rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentSplits([...paymentSplits, { method: 'CARD', amount: 0 }])}
                      className="w-full text-xs py-1"
                    >
                      Add Payment Method (Split Pay)
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4">
                    <Button onClick={handleCheckoutSubmit} className="w-full py-3 text-sm font-bold shadow-lg shadow-primary/20">
                      Validate & Complete Checkout Transaction
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Modifiers Selection Dialog */}
      {showModifierDialog && activeCartIndexForModifiers !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Customize Product Modifiers</h3>
              <button onClick={() => setShowModifierDialog(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Size Selectors */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cup Size</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Regular Cup', price: 0 },
                    { name: 'Medium Grande', price: 0.5 },
                    { name: 'Large Venti', price: 1.0 },
                  ].map((sz, idx) => {
                    const isSelected = cart[activeCartIndexForModifiers].modifiers.some((m) => m.name === sz.name);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const updated = [...cart];
                          // Remove other sizes
                          updated[activeCartIndexForModifiers].modifiers = updated[activeCartIndexForModifiers].modifiers.filter(
                            (m) => m.groupName !== 'Size'
                          );
                          updated[activeCartIndexForModifiers].modifiers.push({ ...sz, groupName: 'Size' });
                          setCart(updated);
                        }}
                        className={`py-2 text-xs font-bold rounded-lg border text-center whitespace-nowrap cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground'
                        }`}
                      >
                        {sz.name} (+${sz.price.toFixed(2)})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Milk Options */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Milk Alternatives</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Whole Milk', price: 0 },
                    { name: 'Oat Milk Premium', price: 0.75 },
                    { name: 'Soy Milk Organic', price: 0.6 },
                  ].map((mlk, idx) => {
                    const isSelected = cart[activeCartIndexForModifiers].modifiers.some((m) => m.name === mlk.name);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const updated = [...cart];
                          updated[activeCartIndexForModifiers].modifiers = updated[activeCartIndexForModifiers].modifiers.filter(
                            (m) => m.groupName !== 'Milk'
                          );
                          updated[activeCartIndexForModifiers].modifiers.push({ ...mlk, groupName: 'Milk' });
                          setCart(updated);
                        }}
                        className={`py-2 text-xs font-bold rounded-lg border text-center whitespace-nowrap cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-foreground'
                        }`}
                      >
                        {mlk.name} (+${mlk.price.toFixed(2)})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button onClick={() => setShowModifierDialog(false)}>Apply Customizations</Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Price Override Modal */}
      {showPriceOverrideModal && overrideItemIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Manual Price Override</h3>
              <button onClick={() => setShowPriceOverrideModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Override unit price for <span className="font-extrabold text-foreground">{cart[overrideItemIndex].name}</span>.
            </p>

            <div>
              <label className="text-xs text-muted-foreground font-bold">New Unit Price ($)</label>
              <input
                type="number"
                value={overridePriceVal}
                onChange={(e) => setOverridePriceVal(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPriceOverrideModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const updated = [...cart];
                  updated[overrideItemIndex].priceOverride = Number(overridePriceVal);
                  setCart(updated);
                  setShowPriceOverrideModal(false);
                  setOverrideItemIndex(null);
                  addToast({ type: 'success', message: 'Cart item price overridden' });
                }}
              >
                Apply Override
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Split Bill Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Split Dining Bill</h3>
              <button onClick={() => setShowSplitModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSplitMethod('EQUAL')}
                  className={`py-2 text-xs font-bold rounded-lg border text-center flex-1 transition-colors ${
                    splitMethod === 'EQUAL' ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  Split Equally
                </button>
                <button
                  onClick={() => setSplitMethod('ITEMS')}
                  className={`py-2 text-xs font-bold rounded-lg border text-center flex-1 transition-colors ${
                    splitMethod === 'ITEMS' ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  Split by Items
                </button>
              </div>

              {splitMethod === 'EQUAL' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-bold">Number of Splits</label>
                    <input
                      type="number"
                      value={splitCount}
                      onChange={(e) => setSplitCount(Number(e.target.value))}
                      className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground font-mono"
                      min="2"
                      max="10"
                    />
                  </div>

                  <div className="p-4 bg-accent/40 rounded-xl space-y-1.5 text-center">
                    <span className="text-xs text-muted-foreground block">Amount Per Person:</span>
                    <span className="font-mono text-xl font-black text-primary">${(getTotal() / splitCount).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-accent/20 border border-border rounded-xl text-xs text-muted-foreground">
                  Select items in the cart to drag or split into a secondary ticket.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowSplitModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowSplitModal(false);
                  addToast({ type: 'success', message: 'Bill split completed' });
                }}
              >
                Confirm Splits
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
