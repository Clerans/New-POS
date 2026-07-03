import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, BarChart2, Plus, Trash2, Search, X, Edit,
  TrendingDown, AlertTriangle, ArrowRightLeft, ChefHat,
  Truck, ShoppingCart, ClipboardList, Layers, Scale,
  Tag, CheckCircle, XCircle, RefreshCw, FileText, Eye,
  DollarSign, Boxes, ShieldAlert, FlaskConical
} from 'lucide-react';
import { apiClient } from '../api/apiClient.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Ingredient {
  id: string; name: string; sku: string; barcode?: string;
  categoryId: string; category?: { name: string };
  unitId: string; unit?: { name: string; abbreviation: string };
  costPrice: number; averageCost: number;
  reorderLevel: number; minStock: number; maxStock: number;
  currentStock: number; reservedStock: number;
  status: string; branchId?: string;
}
interface IngredientUnit { id: string; name: string; abbreviation: string; }
interface IngredientCategory { id: string; name: string; _count?: { ingredients: number }; }
interface Supplier {
  id: string; companyName: string; contactPerson?: string;
  email?: string; phone?: string; status: string;
  rating: number; outstandingBalance: number;
  _count?: { purchaseOrders: number };
}
interface PurchaseOrder {
  id: string; poNumber: string; supplierId: string;
  supplier?: Supplier; status: string;
  subtotal: number; tax: number; total: number;
  expectedDate?: string; createdAt: string;
  items?: POItem[];
}
interface POItem {
  id: string; ingredientId: string;
  ingredient?: Ingredient;
  quantityOrdered: number; quantityReceived: number; price: number;
}
interface Recipe {
  id: string; productId: string;
  product?: { name: string; price: number; category?: { name: string }; };
  recipeVersion: string; yield: number; preparationTime: number;
  cost: number; status: string;
  items?: RecipeItem[]; steps?: RecipeStep[];
  computedCost?: number; sellingPrice?: number; margin?: number;
}
interface RecipeItem {
  id: string; ingredientId: string;
  ingredient?: Ingredient & { unit?: { name: string; abbreviation: string } };
  quantity: number; unitId: string;
  unit?: { name: string; abbreviation: string };
  costShare: number;
}
interface RecipeStep { id: string; stepNumber: number; instruction: string; duration?: number; }
interface DashboardData {
  totalValuation: number; availableCount: number;
  lowStockCount: number; outOfStockCount: number;
  expiringSoon: number; expiredCount: number;
  todayPurchases: number; todayWaste: number;
  todayConsumption: number; openPOs: number;
}
interface StockMovement {
  id: string; type: string; quantity: number; balanceAfter: number;
  reason?: string; createdAt: string;
  ingredient?: { name: string; unit?: { abbreviation: string } };
}
interface InventoryAlert {
  id: string; type: string; severity: string; message: string;
  isResolved: boolean; createdAt: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusColor = (s: string) => {
  switch (s) {
    case 'AVAILABLE': return 'success';
    case 'LOW_STOCK': return 'warning';
    case 'OUT_OF_STOCK': return 'error';
    case 'COMPLETED': return 'success';
    case 'PENDING': case 'PARTIALLY_RECEIVED': return 'warning';
    case 'CANCELLED': return 'error';
    case 'ACTIVE': return 'success';
    default: return 'secondary';
  }
};

const movementColor = (type: string) => {
  switch (type) {
    case 'PURCHASE': return 'text-emerald-400';
    case 'SALE': return 'text-red-400';
    case 'RETURN': return 'text-blue-400';
    case 'WASTE': return 'text-amber-400';
    case 'ADJUSTMENT': return 'text-purple-400';
    case 'TRANSFER': return 'text-cyan-400';
    default: return 'text-muted-foreground';
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const InventoryManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingredients' | 'recipes' | 'suppliers' | 'purchasing' | 'operations'>('dashboard');

  // Ingredient States
  const [ingSearch, setIngSearch] = useState('');
  const [ingCategoryFilter, setIngCategoryFilter] = useState('all');
  const [ingStatusFilter, setIngStatusFilter] = useState('all');
  const [showIngModal, setShowIngModal] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingSku, setIngSku] = useState('');
  const [ingCategoryId, setIngCategoryId] = useState('');
  const [ingUnitId, setIngUnitId] = useState('');
  const [ingCostPrice, setIngCostPrice] = useState('0');
  const [ingReorderLevel, setIngReorderLevel] = useState('0');
  const [ingMinStock, setIngMinStock] = useState('0');
  const [ingMaxStock, setIngMaxStock] = useState('0');
  const [ingCurrentStock, setIngCurrentStock] = useState('0');

  // Recipe States
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recProductId, setRecProductId] = useState('');
  const [recYield, setRecYield] = useState('1');
  const [recPrepTime, setRecPrepTime] = useState('10');
  const [recInstructions, setRecInstructions] = useState('');
  const [recCalories, setRecCalories] = useState('');
  const [recItems, setRecItems] = useState<{ ingredientId: string; quantity: string; unitId: string }[]>([]);
  const [recSteps, setRecSteps] = useState<{ instruction: string; duration: string }[]>([]);
  const [recNewIngId, setRecNewIngId] = useState('');
  const [recNewQty, setRecNewQty] = useState('');
  const [recNewUnitId, setRecNewUnitId] = useState('');

  // Supplier States
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supCompany, setSupCompany] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supPaymentTerms, setSupPaymentTerms] = useState('NET_30');

  // PO States
  const [showPOModal, setShowPOModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poExpected, setPoExpected] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<{ ingredientId: string; quantityOrdered: string; price: string }[]>([]);
  const [poNewIngId, setPoNewIngId] = useState('');
  const [poNewQty, setPoNewQty] = useState('');
  const [poNewPrice, setPoNewPrice] = useState('');

  // Waste States
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteItems, setWasteItems] = useState<{ ingredientId: string; quantity: string; reason: string }[]>([]);
  const [wasteNewIngId, setWasteNewIngId] = useState('');
  const [wasteNewQty, setWasteNewQty] = useState('');
  const [wasteNewReason, setWasteNewReason] = useState('SPOILAGE');

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ['inv-dashboard'],
    queryFn: () => apiClient.get('/inventory/dashboard').then((r: any) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: ingredients = [] } = useQuery<Ingredient[]>({
    queryKey: ['inv-ingredients', ingSearch, ingCategoryFilter, ingStatusFilter],
    queryFn: () => {
      const params: any = {};
      if (ingSearch) params.search = ingSearch;
      if (ingCategoryFilter !== 'all') params.categoryId = ingCategoryFilter;
      if (ingStatusFilter !== 'all') params.status = ingStatusFilter;
      return apiClient.get('/inventory/ingredients', { params }).then((r: any) => r.data.data);
    },
  });

  const { data: ingCategories = [] } = useQuery<IngredientCategory[]>({
    queryKey: ['inv-ing-categories'],
    queryFn: () => apiClient.get('/suppliers/ingredient-categories').then((r: any) => r.data.data),
  });

  const { data: ingUnits = [] } = useQuery<IngredientUnit[]>({
    queryKey: ['inv-units'],
    queryFn: () => apiClient.get('/suppliers/units').then((r: any) => r.data.data),
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['inv-recipes'],
    queryFn: () => apiClient.get('/recipes').then((r: any) => r.data.data),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['inv-suppliers'],
    queryFn: () => apiClient.get('/suppliers').then((r: any) => r.data.data),
  });

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['inv-pos'],
    queryFn: () => apiClient.get('/suppliers/purchase-orders').then((r: any) => r.data.data),
  });

  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ['inv-movements'],
    queryFn: () => apiClient.get('/suppliers/movements?take=40').then((r: any) => r.data.data),
  });

  const { data: alerts = [] } = useQuery<InventoryAlert[]>({
    queryKey: ['inv-alerts'],
    queryFn: () => apiClient.get('/suppliers/alerts').then((r: any) => r.data.data),
  });

  // ─── Mutations ───────────────────────────────────────────────────────────
  const saveIngMutation = useMutation({
    mutationFn: (data: any) =>
      editingIng ? apiClient.put(`/inventory/ingredients/${editingIng.id}`, data) : apiClient.post('/inventory/ingredients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['inv-dashboard'] });
      setShowIngModal(false);
      addToast({ type: 'success', message: `Ingredient ${editingIng ? 'updated' : 'added'} successfully` });
    },
    onError: (e: any) => addToast({ type: 'error', message: e.response?.data?.message || 'Error saving ingredient' }),
  });

  const deleteIngMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/inventory/ingredients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-ingredients'] });
      addToast({ type: 'success', message: 'Ingredient removed' });
    },
    onError: (e: any) => addToast({ type: 'error', message: e.response?.data?.message || 'Error deleting ingredient' }),
  });

  const saveRecipeMutation = useMutation({
    mutationFn: (data: any) =>
      editingRecipe ? apiClient.put(`/recipes/${editingRecipe.id}`, data) : apiClient.post('/recipes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-recipes'] });
      setShowRecipeModal(false);
      addToast({ type: 'success', message: `Recipe ${editingRecipe ? 'updated' : 'created'}` });
    },
    onError: (e: any) => addToast({ type: 'error', message: e.response?.data?.message || 'Error saving recipe' }),
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-recipes'] });
      addToast({ type: 'success', message: 'Recipe removed' });
    },
  });

  const saveSupplierMutation = useMutation({
    mutationFn: (data: any) =>
      editingSupplier ? apiClient.put(`/suppliers/${editingSupplier.id}`, data) : apiClient.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-suppliers'] });
      setShowSupplierModal(false);
      addToast({ type: 'success', message: `Supplier ${editingSupplier ? 'updated' : 'registered'}` });
    },
    onError: (e: any) => addToast({ type: 'error', message: e.response?.data?.message || 'Error saving supplier' }),
  });

  const savePOMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/suppliers/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-pos'] });
      setShowPOModal(false);
      addToast({ type: 'success', message: 'Purchase Order created' });
    },
    onError: (e: any) => addToast({ type: 'error', message: e.response?.data?.message || 'Error creating PO' }),
  });

  const saveWasteMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/inventory/waste', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['inv-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inv-dashboard'] });
      setShowWasteModal(false);
      addToast({ type: 'success', message: 'Waste record logged' });
    },
    onError: (e: any) => addToast({ type: 'error', message: e.response?.data?.message || 'Error logging waste' }),
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/suppliers/alerts/${id}/resolve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-alerts'] });
      addToast({ type: 'success', message: 'Alert resolved' });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────
  const openIngForm = (ing: Ingredient | null = null) => {
    setEditingIng(ing);
    if (ing) {
      setIngName(ing.name); setIngSku(ing.sku); setIngCategoryId(ing.categoryId);
      setIngUnitId(ing.unitId); setIngCostPrice(ing.costPrice.toString());
      setIngReorderLevel(ing.reorderLevel.toString()); setIngMinStock(ing.minStock.toString());
      setIngMaxStock(ing.maxStock.toString()); setIngCurrentStock(ing.currentStock.toString());
    } else {
      setIngName(''); setIngSku(`ING-${Date.now().toString().slice(-6)}`);
      setIngCategoryId(ingCategories[0]?.id || ''); setIngUnitId(ingUnits[0]?.id || '');
      setIngCostPrice('0'); setIngReorderLevel('5'); setIngMinStock('1'); setIngMaxStock('100'); setIngCurrentStock('0');
    }
    setShowIngModal(true);
  };

  const handleSaveIng = () => {
    saveIngMutation.mutate({
      name: ingName, sku: ingSku, categoryId: ingCategoryId, unitId: ingUnitId,
      costPrice: Number(ingCostPrice), averageCost: Number(ingCostPrice),
      reorderLevel: Number(ingReorderLevel), minStock: Number(ingMinStock),
      maxStock: Number(ingMaxStock), currentStock: Number(ingCurrentStock),
    });
  };

  const openRecipeForm = (recipe: Recipe | null = null) => {
    setEditingRecipe(recipe);
    if (recipe) {
      setRecProductId(recipe.productId); setRecYield(recipe.yield.toString());
      setRecPrepTime(recipe.preparationTime.toString()); setRecInstructions(recipe.instructions || '');
      setRecCalories(recipe.calories?.toString() || '');
      setRecItems((recipe.items || []).map(it => ({ ingredientId: it.ingredientId, quantity: it.quantity.toString(), unitId: it.unitId })));
      setRecSteps((recipe.steps || []).map(st => ({ instruction: st.instruction, duration: st.duration?.toString() || '' })));
    } else {
      setRecProductId(''); setRecYield('1'); setRecPrepTime('10');
      setRecInstructions(''); setRecCalories(''); setRecItems([]); setRecSteps([]);
    }
    setShowRecipeModal(true);
  };

  const handleSaveRecipe = () => {
    saveRecipeMutation.mutate({
      productId: recProductId, yield: Number(recYield),
      preparationTime: Number(recPrepTime), instructions: recInstructions || null,
      calories: recCalories ? Number(recCalories) : null,
      items: recItems.map(it => ({ ingredientId: it.ingredientId, quantity: Number(it.quantity), unitId: it.unitId })),
      steps: recSteps.map((st, i) => ({ stepNumber: i + 1, instruction: st.instruction, duration: st.duration ? Number(st.duration) : null })),
    });
  };

  const openSupplierForm = (s: Supplier | null = null) => {
    setEditingSupplier(s);
    setSupCompany(s?.companyName || ''); setSupContact(s?.contactPerson || '');
    setSupEmail(s?.email || ''); setSupPhone(s?.phone || '');
    setSupAddress(s?.['address'] || ''); setSupPaymentTerms((s as any)?.paymentTerms || 'NET_30');
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = () => {
    saveSupplierMutation.mutate({
      companyName: supCompany, contactPerson: supContact || null,
      email: supEmail || null, phone: supPhone || null,
      address: supAddress || null, paymentTerms: supPaymentTerms,
    });
  };

  const openPOForm = () => {
    setPoSupplierId(suppliers[0]?.id || ''); setPoExpected(''); setPoNotes(''); setPoItems([]);
    setShowPOModal(true);
  };

  const handleSavePO = () => {
    savePOMutation.mutate({
      supplierId: poSupplierId, expectedDate: poExpected || null,
      notes: poNotes || null, items: poItems.map(it => ({
        ingredientId: it.ingredientId, quantityOrdered: Number(it.quantityOrdered), price: Number(it.price),
      })),
    });
  };

  const openWasteForm = () => {
    setWasteNotes(''); setWasteItems([]); setShowWasteModal(true);
  };

  const handleSaveWaste = () => {
    saveWasteMutation.mutate({
      notes: wasteNotes || null,
      items: wasteItems.map(it => ({ ingredientId: it.ingredientId, quantity: Number(it.quantity), reason: it.reason })),
    });
  };

  // ─── Rendering Helpers ────────────────────────────────────────────────────
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { key: 'ingredients', label: 'Ingredients', icon: Boxes },
    { key: 'recipes', label: 'Recipes & Costing', icon: ChefHat },
    { key: 'suppliers', label: 'Suppliers', icon: Truck },
    { key: 'purchasing', label: 'Purchasing & GRN', icon: ShoppingCart },
    { key: 'operations', label: 'Ledger & Alerts', icon: ClipboardList },
  ] as const;

  // ─── Modal Helper: Ingredient ─────────────────────────────────────────────
  const IngredientModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-xl font-extrabold">{editingIng ? 'Edit' : 'Add'} Ingredient</h2>
          <button onClick={() => setShowIngModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Ingredient Name *</label>
              <input value={ingName} onChange={e => setIngName(e.target.value)} placeholder="e.g. Whole Milk 3.2%" className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">SKU *</label>
              <input value={ingSku} onChange={e => setIngSku(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Cost Price (per unit)</label>
              <input type="number" step="0.01" value={ingCostPrice} onChange={e => setIngCostPrice(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Category</label>
              <select value={ingCategoryId} onChange={e => setIngCategoryId(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {ingCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Unit of Measure</label>
              <select value={ingUnitId} onChange={e => setIngUnitId(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {ingUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Current Stock</label>
              <input type="number" step="0.01" value={ingCurrentStock} onChange={e => setIngCurrentStock(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Reorder Level</label>
              <input type="number" step="0.01" value={ingReorderLevel} onChange={e => setIngReorderLevel(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Min Stock</label>
              <input type="number" step="0.01" value={ingMinStock} onChange={e => setIngMinStock(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Max Stock</label>
              <input type="number" step="0.01" value={ingMaxStock} onChange={e => setIngMaxStock(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 pt-0">
          <Button variant="outline" onClick={() => setShowIngModal(false)}>Cancel</Button>
          <Button onClick={handleSaveIng} disabled={saveIngMutation.isPending}>{saveIngMutation.isPending ? 'Saving...' : (editingIng ? 'Update' : 'Add Ingredient')}</Button>
        </div>
      </div>
    </div>
  );

  // ─── Modal Helper: Recipe ─────────────────────────────────────────────────
  const RecipeModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-xl font-extrabold">{editingRecipe ? 'Edit' : 'Build'} Recipe</h2>
          <button onClick={() => setShowRecipeModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Linked Product ID *</label>
              <input value={recProductId} onChange={e => setRecProductId(e.target.value)} placeholder="Product UUID from menu catalog" className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-[10px] text-muted-foreground mt-1">Copy the Product ID from Menu Catalog → Products table</p>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Yield (portions)</label>
              <input type="number" step="0.1" value={recYield} onChange={e => setRecYield(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Prep Time (min)</label>
              <input type="number" value={recPrepTime} onChange={e => setRecPrepTime(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Instructions</label>
              <textarea rows={2} value={recInstructions} onChange={e => setRecInstructions(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-bold mb-3 text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Ingredients</h3>
            <div className="space-y-2 mb-3">
              {recItems.map((it, i) => {
                const ing = ingredients.find(x => x.id === it.ingredientId);
                const unit = ingUnits.find(x => x.id === it.unitId);
                return (
                  <div key={i} className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium">{ing?.name || it.ingredientId}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-mono">{it.quantity}</span>
                      <span>{unit?.abbreviation || it.unitId}</span>
                      <button onClick={() => setRecItems(recItems.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <select value={recNewIngId} onChange={e => setRecNewIngId(e.target.value)} className="flex-1 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select Ingredient</option>
                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
              <input type="number" placeholder="Qty" step="0.01" value={recNewQty} onChange={e => setRecNewQty(e.target.value)} className="w-20 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <select value={recNewUnitId} onChange={e => setRecNewUnitId(e.target.value)} className="w-28 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Unit</option>
                {ingUnits.map(u => <option key={u.id} value={u.id}>{u.abbreviation}</option>)}
              </select>
              <Button size="sm" onClick={() => {
                if (!recNewIngId || !recNewQty || !recNewUnitId) { addToast({ type: 'warning', message: 'Fill ingredient, qty, and unit' }); return; }
                setRecItems([...recItems, { ingredientId: recNewIngId, quantity: recNewQty, unitId: recNewUnitId }]);
                setRecNewIngId(''); setRecNewQty(''); setRecNewUnitId('');
              }}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-bold mb-3 text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Preparation Steps</h3>
            <div className="space-y-2 mb-3">
              {recSteps.map((st, i) => (
                <div key={i} className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2 text-sm">
                  <span className="text-xs text-muted-foreground mr-2 font-mono">#{i + 1}</span>
                  <span className="flex-1">{st.instruction}</span>
                  {st.duration && <span className="text-xs text-muted-foreground mr-2">{st.duration}m</span>}
                  <button onClick={() => setRecSteps(recSteps.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input placeholder="Step instruction..." value="" onChange={() => {}} id="rec-step-input" className="flex-1 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <input type="number" placeholder="Min" id="rec-step-dur" className="w-16 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              <Button size="sm" onClick={() => {
                const inp = (document.getElementById('rec-step-input') as HTMLInputElement);
                const dur = (document.getElementById('rec-step-dur') as HTMLInputElement);
                if (!inp.value) { addToast({ type: 'warning', message: 'Enter step instruction' }); return; }
                setRecSteps([...recSteps, { instruction: inp.value, duration: dur.value }]);
                inp.value = ''; dur.value = '';
              }}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 pt-0">
          <Button variant="outline" onClick={() => setShowRecipeModal(false)}>Cancel</Button>
          <Button onClick={handleSaveRecipe} disabled={saveRecipeMutation.isPending}>{saveRecipeMutation.isPending ? 'Saving...' : (editingRecipe ? 'Update Recipe' : 'Create Recipe')}</Button>
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            Inventory & Supply Chain
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise-grade stock tracking, recipe costing, supplier management, and procurement workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'ingredients' && <Button onClick={() => openIngForm()} className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> New Ingredient</Button>}
          {activeTab === 'recipes' && <Button onClick={() => openRecipeForm()} className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> New Recipe</Button>}
          {activeTab === 'suppliers' && <Button onClick={() => openSupplierForm()} className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Supplier</Button>}
          {activeTab === 'purchasing' && <Button onClick={() => openPOForm()} className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> New Purchase Order</Button>}
          {activeTab === 'operations' && <Button onClick={() => openWasteForm()} variant="outline" className="flex items-center gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"><TrendingDown className="h-4 w-4" /> Log Waste</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-1.5 pb-3 pt-1 px-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === 'operations' && alerts.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Portfolio Value', value: `$${(dashboard?.totalValuation || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'from-emerald-500/20 to-emerald-500/5', tc: 'text-emerald-400' },
              { label: 'Available Items', value: dashboard?.availableCount || 0, icon: CheckCircle, color: 'from-blue-500/20 to-blue-500/5', tc: 'text-blue-400' },
              { label: 'Low Stock Alerts', value: dashboard?.lowStockCount || 0, icon: AlertTriangle, color: 'from-amber-500/20 to-amber-500/5', tc: 'text-amber-400' },
              { label: 'Out of Stock', value: dashboard?.outOfStockCount || 0, icon: XCircle, color: 'from-red-500/20 to-red-500/5', tc: 'text-red-400' },
              { label: 'Open POs', value: dashboard?.openPOs || 0, icon: ShoppingCart, color: 'from-purple-500/20 to-purple-500/5', tc: 'text-purple-400' },
            ].map((kpi) => (
              <Card key={kpi.label} className={`p-5 bg-gradient-to-br ${kpi.color} border-border shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">{kpi.label}</span>
                  <kpi.icon className={`h-5 w-5 ${kpi.tc}`} />
                </div>
                <div className={`text-2xl font-black ${kpi.tc}`}>{kpi.value}</div>
              </Card>
            ))}
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Today's Purchases", value: `$${(dashboard?.todayPurchases || 0).toFixed(2)}`, icon: ShoppingCart, color: 'text-emerald-400' },
              { label: "Today's Waste Cost", value: `$${(dashboard?.todayWaste || 0).toFixed(2)}`, icon: TrendingDown, color: 'text-red-400' },
              { label: 'Expiring (7 days)', value: `${dashboard?.expiringSoon || 0} batches`, icon: ShieldAlert, color: 'text-amber-400' },
              { label: 'Today Consumption', value: (dashboard?.todayConsumption || 0).toFixed(2), icon: FlaskConical, color: 'text-blue-400' },
            ].map((m) => (
              <Card key={m.label} className="p-4 bg-card border-border shadow flex items-center gap-4">
                <m.icon className={`h-8 w-8 ${m.color} shrink-0`} />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">{m.label}</p>
                  <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Alerts Panel */}
          {alerts.length > 0 && (
            <Card className="border border-red-500/20 bg-red-500/5 rounded-xl shadow p-5">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-4"><AlertTriangle className="h-4 w-4" /> Active Inventory Alerts</h3>
              <div className="space-y-2">
                {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between bg-card/60 rounded-lg px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium">{alert.message}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => resolveAlertMutation.mutate(alert.id)} className="text-xs h-7">Resolve</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Movements */}
          <Card className="border border-border rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-primary" /> Recent Stock Movements</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-accent/20 text-muted-foreground text-[11px] uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="px-5 py-3">Ingredient</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Qty Change</th>
                    <th className="px-5 py-3">Balance After</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {movements.slice(0, 10).map(m => (
                    <tr key={m.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-5 py-3 font-medium">{m.ingredient?.name || '—'}</td>
                      <td className="px-5 py-3"><span className={`font-bold text-xs ${movementColor(m.type)}`}>{m.type}</span></td>
                      <td className="px-5 py-3 font-mono">
                        <span className={m.quantity < 0 ? 'text-red-400' : 'text-emerald-400'}>{m.quantity > 0 ? '+' : ''}{m.quantity.toFixed(3)}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{m.balanceAfter.toFixed(3)}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{m.reason || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── INGREDIENTS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'ingredients' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 bg-card p-4 rounded-xl border border-border shadow">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search by name, SKU, barcode..." value={ingSearch} onChange={e => setIngSearch(e.target.value)} className="w-full bg-accent border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <select value={ingCategoryFilter} onChange={e => setIngCategoryFilter(e.target.value)} className="bg-accent border border-border text-foreground px-3 py-2 rounded-lg text-xs font-bold">
              <option value="all">All Categories</option>
              {ingCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={ingStatusFilter} onChange={e => setIngStatusFilter(e.target.value)} className="bg-accent border border-border text-foreground px-3 py-2 rounded-lg text-xs font-bold">
              <option value="all">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['inv-ingredients'] })} className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Table */}
          <Card className="border border-border rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-accent/20 text-muted-foreground text-[11px] uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="px-5 py-3.5">Name / SKU</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Unit</th>
                    <th className="px-5 py-3.5">Current Stock</th>
                    <th className="px-5 py-3.5">Cost / Unit</th>
                    <th className="px-5 py-3.5">Avg. Cost</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className={`hover:bg-accent/10 transition-colors ${ing.status === 'OUT_OF_STOCK' ? 'bg-red-500/5' : ing.status === 'LOW_STOCK' ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-foreground">{ing.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{ing.sku}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{ing.category?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{ing.unit?.abbreviation || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className={`font-black font-mono ${ing.currentStock <= 0 ? 'text-red-400' : ing.currentStock <= ing.reorderLevel ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {ing.currentStock.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Reorder @ {ing.reorderLevel}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-primary">${ing.costPrice.toFixed(3)}</td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">${ing.averageCost.toFixed(3)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={statusColor(ing.status) as any} className="text-[10px] capitalize">{ing.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openIngForm(ing)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors cursor-pointer"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => { if (confirm('Delete this ingredient?')) deleteIngMutation.mutate(ing.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ingredients.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-16 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No ingredients found. Add your first ingredient to begin tracking stock.</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── RECIPES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Recipes', value: recipes.length, icon: ChefHat, color: 'text-primary' },
              { label: 'Avg Food Cost %', value: `${recipes.length > 0 ? (recipes.reduce((a, r) => a + (100 - (r.margin || 0)), 0) / recipes.length).toFixed(1) : 0}%`, icon: Tag, color: 'text-amber-400' },
              { label: 'Avg Margin', value: `${recipes.length > 0 ? (recipes.reduce((a, r) => a + (r.margin || 0), 0) / recipes.length).toFixed(1) : 0}%`, icon: Scale, color: 'text-emerald-400' },
            ].map(k => (
              <Card key={k.label} className="p-4 border-border shadow flex items-center gap-4">
                <k.icon className={`h-8 w-8 ${k.color} shrink-0`} />
                <div><p className="text-xs text-muted-foreground font-semibold">{k.label}</p><p className={`text-2xl font-black ${k.color}`}>{k.value}</p></div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map(recipe => (
              <Card key={recipe.id} className="border border-border rounded-xl shadow p-5 hover:border-primary/40 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-foreground">{recipe.product?.name || 'Recipe'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{recipe.product?.category?.name || ''} · v{recipe.recipeVersion}</p>
                  </div>
                  <Badge variant={statusColor(recipe.status) as any} className="text-[10px]">{recipe.status}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-accent/20 rounded-lg p-3 mb-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">Sell Price</p>
                    <p className="font-black text-primary text-sm">${(recipe.sellingPrice || recipe.product?.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <p className="text-[10px] text-muted-foreground font-semibold">Food Cost</p>
                    <p className="font-black text-amber-400 text-sm">${(recipe.computedCost || recipe.cost || 0).toFixed(3)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground font-semibold">Margin</p>
                    <p className={`font-black text-sm ${(recipe.margin || 0) >= 60 ? 'text-emerald-400' : (recipe.margin || 0) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{(recipe.margin || 0).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-4">
                  <span className="mr-3">{recipe.items?.length || 0} ingredients</span>
                  <span className="mr-3">·</span>
                  <span>{recipe.preparationTime} min prep</span>
                  <span className="mr-3 ml-3">·</span>
                  <span>x{recipe.yield} yield</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewingRecipe(recipe)} className="flex-1 flex items-center justify-center gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                  <Button size="sm" variant="outline" onClick={() => openRecipeForm(recipe)} className="flex-1 flex items-center justify-center gap-1"><Edit className="h-3.5 w-3.5" /> Edit</Button>
                  <button onClick={() => { if (confirm('Remove this recipe?')) deleteRecipeMutation.mutate(recipe.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            ))}
            {recipes.length === 0 && (
              <div className="col-span-3 text-center py-20 text-muted-foreground"><ChefHat className="h-14 w-14 mx-auto mb-3 opacity-30" /><p>No recipes yet. Build your first recipe to enable automatic ingredient deductions.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── SUPPLIERS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-5">
          <Card className="border border-border rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-accent/20 text-muted-foreground text-[11px] uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Rating</th>
                    <th className="px-5 py-3.5">Outstanding</th>
                    <th className="px-5 py-3.5">Orders</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold">{s.companyName}</p>
                        <p className="text-xs text-muted-foreground">{s.email || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{s.contactPerson || '—'}<br />{s.phone || ''}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {'★'.repeat(Math.round(s.rating))}{'☆'.repeat(5 - Math.round(s.rating))}
                          <span className="text-xs text-muted-foreground ml-1">{s.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-amber-400">${s.outstandingBalance.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{s._count?.purchaseOrders || 0} POs</td>
                      <td className="px-5 py-3.5"><Badge variant={s.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">{s.status}</Badge></td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => openSupplierForm(s)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors cursor-pointer"><Edit className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-16 text-muted-foreground"><Truck className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No suppliers yet. Add your first supplier to begin procurement.</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── PURCHASING TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'purchasing' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total POs', value: purchaseOrders.length, color: 'text-foreground' },
              { label: 'Pending', value: purchaseOrders.filter(p => p.status === 'PENDING').length, color: 'text-amber-400' },
              { label: 'Completed', value: purchaseOrders.filter(p => p.status === 'COMPLETED').length, color: 'text-emerald-400' },
              { label: 'Total Value', value: `$${purchaseOrders.reduce((a, p) => a + p.total, 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, color: 'text-primary' },
            ].map(k => (
              <Card key={k.label} className="p-4 border-border shadow text-center">
                <p className="text-xs text-muted-foreground font-semibold">{k.label}</p>
                <p className={`text-2xl font-black ${k.color} mt-1`}>{k.value}</p>
              </Card>
            ))}
          </div>

          <Card className="border border-border rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-accent/20 text-muted-foreground text-[11px] uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="px-5 py-3.5">PO Number</th>
                    <th className="px-5 py-3.5">Supplier</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5">Total</th>
                    <th className="px-5 py-3.5">Expected</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-primary">{po.poNumber}</td>
                      <td className="px-5 py-3.5 font-medium">{po.supplier?.companyName || '—'}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{po.items?.length || 0} lines</td>
                      <td className="px-5 py-3.5 font-mono font-bold">${po.total.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3.5"><Badge variant={statusColor(po.status) as any} className="text-[10px]">{po.status}</Badge></td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-16 text-muted-foreground"><ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No purchase orders found. Create your first PO to get started.</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── LEDGER & ALERTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {/* Active Alerts */}
          <Card className="border border-border rounded-xl shadow">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-400" /> Active Alerts ({alerts.length})</h3>
            </div>
            <div className="p-5 space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${alert.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(alert.createdAt).toLocaleString()} · {alert.type}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolveAlertMutation.mutate(alert.id)} className="text-xs h-7 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Resolve
                  </Button>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">🎉 No active alerts. Your inventory is healthy.</p>}
            </div>
          </Card>

          {/* Stock Movements Ledger */}
          <Card className="border border-border rounded-xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-primary" /> Stock Movement Ledger</h3>
              <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['inv-movements'] })} className="flex items-center gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-accent/20 text-muted-foreground text-[11px] uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="px-5 py-3">Ingredient</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Qty Change</th>
                    <th className="px-5 py-3">Balance After</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-5 py-3 font-medium">{m.ingredient?.name || '—'}</td>
                      <td className="px-5 py-3"><span className={`font-bold text-xs ${movementColor(m.type)}`}>{m.type}</span></td>
                      <td className="px-5 py-3 font-mono">
                        <span className={m.quantity < 0 ? 'text-red-400' : 'text-emerald-400'}>{m.quantity > 0 ? '+' : ''}{m.quantity.toFixed(3)}</span>
                        <span className="text-muted-foreground text-xs ml-1">{m.ingredient?.unit?.abbreviation || ''}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{m.balanceAfter.toFixed(3)}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{m.reason || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No stock movements logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      {showIngModal && <IngredientModal />}
      {showRecipeModal && <RecipeModal />}

      {/* View Recipe Detail */}
      {viewingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-extrabold">{viewingRecipe.product?.name}</h2>
              <button onClick={() => setViewingRecipe(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3 bg-accent/20 rounded-lg p-4">
                <div className="text-center"><p className="text-[10px] text-muted-foreground">Selling Price</p><p className="font-black text-primary">${(viewingRecipe.sellingPrice || 0).toFixed(2)}</p></div>
                <div className="text-center border-x border-border"><p className="text-[10px] text-muted-foreground">Food Cost</p><p className="font-black text-amber-400">${(viewingRecipe.computedCost || viewingRecipe.cost).toFixed(3)}</p></div>
                <div className="text-center"><p className="text-[10px] text-muted-foreground">Margin</p><p className={`font-black ${(viewingRecipe.margin || 0) >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>{(viewingRecipe.margin || 0).toFixed(1)}%</p></div>
              </div>
              {viewingRecipe.items && viewingRecipe.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Ingredients</h3>
                  <div className="space-y-2">
                    {viewingRecipe.items.map(it => (
                      <div key={it.id} className="flex items-center justify-between bg-accent/20 rounded-lg px-3 py-2.5 text-sm">
                        <span className="font-medium">{it.ingredient?.name}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono">{it.quantity}</span>
                          <span className="text-xs">{it.unit?.abbreviation || it.ingredient?.unit?.abbreviation}</span>
                          <span className="text-primary font-mono text-xs">${it.costShare.toFixed(3)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingRecipe.steps && viewingRecipe.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Preparation Steps</h3>
                  <ol className="space-y-2">
                    {viewingRecipe.steps.map(st => (
                      <li key={st.id} className="flex gap-3 bg-accent/20 rounded-lg px-3 py-2.5 text-sm">
                        <span className="font-black text-primary min-w-[20px]">{st.stepNumber}.</span>
                        <span>{st.instruction}</span>
                        {st.duration && <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{st.duration}m</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-extrabold">{editingSupplier ? 'Edit' : 'Register'} Supplier</h2>
              <button onClick={() => setShowSupplierModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-xs font-bold text-muted-foreground mb-1 block">Company Name *</label><input value={supCompany} onChange={e => setSupCompany(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs font-bold text-muted-foreground mb-1 block">Contact Person</label><input value={supContact} onChange={e => setSupContact(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs font-bold text-muted-foreground mb-1 block">Phone</label><input value={supPhone} onChange={e => setSupPhone(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs font-bold text-muted-foreground mb-1 block">Email</label><input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs font-bold text-muted-foreground mb-1 block">Payment Terms</label>
                <select value={supPaymentTerms} onChange={e => setSupPaymentTerms(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {['COD', 'NET_7', 'NET_14', 'NET_30', 'NET_60', 'PREPAID'].map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="text-xs font-bold text-muted-foreground mb-1 block">Address</label><input value={supAddress} onChange={e => setSupAddress(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowSupplierModal(false)}>Cancel</Button>
              <Button onClick={handleSaveSupplier} disabled={saveSupplierMutation.isPending}>{saveSupplierMutation.isPending ? 'Saving...' : (editingSupplier ? 'Update' : 'Register Supplier')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-xl font-extrabold">Create Purchase Order</h2>
              <button onClick={() => setShowPOModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Supplier *</label>
                  <select value={poSupplierId} onChange={e => setPoSupplierId(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Expected Date</label>
                  <input type="date" value={poExpected} onChange={e => setPoExpected(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Notes</label>
                  <input value={poNotes} onChange={e => setPoNotes(e.target.value)} className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Order Lines</h3>
                <div className="space-y-2 mb-3">
                  {poItems.map((it, i) => {
                    const ing = ingredients.find(x => x.id === it.ingredientId);
                    return (
                      <div key={i} className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2 text-sm">
                        <span>{ing?.name || it.ingredientId}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono">x{it.quantityOrdered}</span>
                          <span className="font-mono text-primary">@${it.price}</span>
                          <button onClick={() => setPoItems(poItems.filter((_, j) => j !== i))} className="text-red-400 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <select value={poNewIngId} onChange={e => setPoNewIngId(e.target.value)} className="flex-1 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select ingredient</option>
                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                  </select>
                  <input type="number" placeholder="Qty" value={poNewQty} onChange={e => setPoNewQty(e.target.value)} className="w-20 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
                  <input type="number" placeholder="Price" step="0.01" value={poNewPrice} onChange={e => setPoNewPrice(e.target.value)} className="w-24 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
                  <Button size="sm" onClick={() => {
                    if (!poNewIngId || !poNewQty || !poNewPrice) { addToast({ type: 'warning', message: 'Fill ingredient, qty, and price' }); return; }
                    setPoItems([...poItems, { ingredientId: poNewIngId, quantityOrdered: poNewQty, price: poNewPrice }]);
                    setPoNewIngId(''); setPoNewQty(''); setPoNewPrice('');
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
                {poItems.length > 0 && (
                  <div className="mt-3 text-right text-sm font-bold text-primary">
                    Subtotal: ${poItems.reduce((a, it) => a + Number(it.quantityOrdered) * Number(it.price), 0).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowPOModal(false)}>Cancel</Button>
              <Button onClick={handleSavePO} disabled={savePOMutation.isPending || !poSupplierId || poItems.length === 0}>{savePOMutation.isPending ? 'Submitting...' : 'Submit PO'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-xl font-extrabold flex items-center gap-2"><TrendingDown className="h-5 w-5 text-amber-400" /> Log Waste Record</h2>
              <button onClick={() => setShowWasteModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Notes</label>
                <input value={wasteNotes} onChange={e => setWasteNotes(e.target.value)} placeholder="e.g. Accidental spill during cleaning" className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Trash2 className="h-4 w-4 text-amber-400" /> Wasted Items</h3>
                <div className="space-y-2 mb-3">
                  {wasteItems.map((it, i) => {
                    const ing = ingredients.find(x => x.id === it.ingredientId);
                    return (
                      <div key={i} className="flex items-center justify-between bg-accent/30 rounded-lg px-3 py-2 text-sm">
                        <span>{ing?.name || it.ingredientId}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono">{it.quantity} {ing?.unit?.abbreviation}</span>
                          <Badge variant="warning" className="text-[9px]">{it.reason}</Badge>
                          <button onClick={() => setWasteItems(wasteItems.filter((_, j) => j !== i))} className="text-red-400 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <select value={wasteNewIngId} onChange={e => setWasteNewIngId(e.target.value)} className="flex-1 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select ingredient</option>
                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.currentStock.toFixed(2)} {ing.unit?.abbreviation})</option>)}
                  </select>
                  <input type="number" placeholder="Qty" step="0.01" value={wasteNewQty} onChange={e => setWasteNewQty(e.target.value)} className="w-20 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
                  <select value={wasteNewReason} onChange={e => setWasteNewReason(e.target.value)} className="w-32 bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none">
                    {['SPOILAGE', 'EXPIRED', 'DROPPED', 'OVERCOOKED', 'TESTING', 'DAMAGED'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Button size="sm" onClick={() => {
                    if (!wasteNewIngId || !wasteNewQty) { addToast({ type: 'warning', message: 'Select ingredient and enter quantity' }); return; }
                    setWasteItems([...wasteItems, { ingredientId: wasteNewIngId, quantity: wasteNewQty, reason: wasteNewReason }]);
                    setWasteNewIngId(''); setWasteNewQty(''); setWasteNewReason('SPOILAGE');
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowWasteModal(false)}>Cancel</Button>
              <Button onClick={handleSaveWaste} disabled={saveWasteMutation.isPending || wasteItems.length === 0} className="bg-amber-500 hover:bg-amber-600 text-white">
                {saveWasteMutation.isPending ? 'Logging...' : 'Log Waste Record'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
