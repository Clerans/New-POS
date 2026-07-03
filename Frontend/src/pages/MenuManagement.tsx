import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Search, ChevronRight, ChevronDown, Download, Upload,
  X, Sparkles, Layers, Notebook,
  Apple, Settings as Sliders, ArrowRightLeft, Languages
} from 'lucide-react';
import { apiClient } from '../api/apiClient.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  color?: string;
  parentCategoryId?: string | null;
  status: string;
  translations?: Array<{ language: string; name: string; description?: string }>;
  subCategories?: Category[];
  _count?: { products: number };
}

interface Product {
  id: string;
  name: string;
  displayName?: string;
  sku: string;
  barcode?: string;
  internalCode?: string;
  shortDescription?: string;
  fullDescription?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  brand?: string;
  unit: string;
  preparationTime: number;
  recipeLink?: string;
  status: string;
  productType: string;
  categoryId?: string | null;
  category?: { name: string };
  images?: Array<{ url: string; thumbnail: boolean }>;
  variants?: any[];
  tags?: any[];
  modifiers?: any[];
  pricings?: any[];
  availabilities?: any[];
  nutrition?: any;
  analytics?: any;
}

export const MenuManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'modifiers' | 'logs'>('products');

  // --- Filtering States ---
  const [productSearch, setProductSearch] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // --- Modal Open States ---
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showModifierModal, setShowModifierModal] = useState<boolean>(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<any | null>(null);

  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // --- Category Tree UI Expand State ---
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // --- Queries ---
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['menu-categories'],
    queryFn: () => apiClient.get('/categories').then((res: any) => res.data.data),
  });

  const { data: categoriesTree = [] } = useQuery<Category[]>({
    queryKey: ['menu-categories-tree'],
    queryFn: () => apiClient.get('/categories?tree=true').then((res: any) => res.data.data),
  });

  const { data: productsData } = useQuery<any>({
    queryKey: ['menu-products', productSearch, filterCategory, filterType, filterStatus],
    queryFn: () => {
      const params: any = {};
      if (productSearch) params.search = productSearch;
      if (filterCategory !== 'all') params.categoryId = filterCategory;
      if (filterType !== 'all') params.productType = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      return apiClient.get('/products', { params }).then((res: any) => res.data);
    },
  });
  const productsList = productsData?.data || [];

  const { data: modifierGroups = [] } = useQuery<any[]>({
    queryKey: ['menu-modifiers'],
    queryFn: () => apiClient.get('/products/modifiers').then((res: any) => res.data.data),
  });

  const { data: importLogs = [], refetch: refetchImportLogs } = useQuery<any[]>({
    queryKey: ['menu-import-logs'],
    queryFn: () => apiClient.get('/products/import-logs').then((res: any) => res.data.data),
  });

  const { data: tagList = [] } = useQuery<any[]>({
    queryKey: ['menu-tags'],
    queryFn: () => apiClient.get('/products/tags').then((res: any) => res.data.data),
  });

  // --- Form Sub-builder State (Products) ---
  const [prodName, setProdName] = useState('');
  const [prodDisplayName, setProdDisplayName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodInternalCode, setProdInternalCode] = useState('');
  const [prodPrice, setProdPrice] = useState('0');
  const [prodCost, setProdCost] = useState('0');
  const [prodStock, setProdStock] = useState('0');
  const [prodMinStock, setProdMinStock] = useState('10');
  const [prodBrand, setProdBrand] = useState('');
  const [prodUnit, setProdUnit] = useState('PCS');
  const [prodPrepTime, setProdPrepTime] = useState('10');
  const [prodRecipeLink, setProdRecipeLink] = useState('');
  const [prodStatus, setProdStatus] = useState('ACTIVE');
  const [prodType, setProdType] = useState('REGULAR');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodFullDesc, setProdFullDesc] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');

  // Variants list state
  const [variantList, setVariantList] = useState<any[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarCost, setNewVarCost] = useState('');

  // Nutrition state
  const [nutCalories, setNutCalories] = useState('');
  const [nutProtein, setNutProtein] = useState('');
  const [nutFat, setNutFat] = useState('');
  const [nutCarbs, setNutCarbs] = useState('');
  const [nutSugar, setNutSugar] = useState('');
  const [nutAllergens, setNutAllergens] = useState('');
  const [nutServingSize, setNutServingSize] = useState('');

  // Mapped Modifiers & Tags state
  const [mappedModifierIds, setMappedModifierIds] = useState<string[]>([]);
  const [mappedTagIds, setMappedTagIds] = useState<string[]>([]);

  // Combo Items state
  const [comboItems, setComboItems] = useState<any[]>([]);
  const [selectedComboProductId, setSelectedComboProductId] = useState('');
  const [selectedComboQty, setSelectedComboQty] = useState('1');

  // Pricing Tiers (Dine-In, Takeaway, Delivery, Happy Hour)
  const [dineInPrice, setDineInPrice] = useState('');
  const [takeawayPrice, setTakeawayPrice] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [happyHourPrice, setHappyHourPrice] = useState('');

  // --- Form Sub-builder State (Categories) ---
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIcon, setCatIcon] = useState('Coffee');
  const [catDisplayOrder, setCatDisplayOrder] = useState('0');
  const [catColor, setCatColor] = useState('');
  const [catParentId, setCatParentId] = useState('');
  const [catStatus, setCatStatus] = useState('ACTIVE');
  const [catTransNameAr, setCatTransNameAr] = useState('');
  const [catTransDescAr, setCatTransDescAr] = useState('');

  // --- Form Sub-builder State (Modifier Groups) ---
  const [modName, setModName] = useState('');
  const [modDescription, setModDescription] = useState('');
  const [modMin, setModMin] = useState('0');
  const [modMax, setModMax] = useState('1');
  const [modRequired, setModRequired] = useState(false);
  const [modMulti, setModMulti] = useState(false);
  const [modStatus, setModStatus] = useState('ACTIVE');
  const [modDisplayOrder, setModDisplayOrder] = useState('0');
  const [modOptions, setModOptions] = useState<any[]>([]);
  const [newOptName, setNewOptName] = useState('');
  const [newOptPrice, setNewOptPrice] = useState('');

  // --- Bulk Import State ---
  const [importJsonText, setImportJsonText] = useState('');
  const [importReport, setImportReport] = useState<any | null>(null);

  // --- Mutations ---
  const saveProductMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingProduct) {
        return apiClient.put(`/products/${editingProduct.id}`, data);
      }
      return apiClient.post('/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      setShowProductModal(false);
      addToast({ type: 'success', message: `Product ${editingProduct ? 'updated' : 'created'} successfully` });
    },
    onError: (err: any) => {
      addToast({ type: 'error', message: err.response?.data?.message || 'Error saving product' });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      addToast({ type: 'success', message: 'Product deleted or archived successfully' });
    }
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCategory) {
        return apiClient.put(`/categories/${editingCategory.id}`, data);
      }
      return apiClient.post('/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories-tree'] });
      setShowCategoryModal(false);
      addToast({ type: 'success', message: `Category ${editingCategory ? 'updated' : 'created'} successfully` });
    },
    onError: (err: any) => {
      addToast({ type: 'error', message: err.response?.data?.message || 'Error saving category' });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories-tree'] });
      addToast({ type: 'success', message: 'Category deleted successfully' });
    },
    onError: (err: any) => {
      addToast({ type: 'error', message: err.response?.data?.message || 'Error deleting category' });
    }
  });

  const saveModifierMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingModifierGroup) {
        return apiClient.put(`/products/modifiers/${editingModifierGroup.id}`, data);
      }
      return apiClient.post('/products/modifiers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-modifiers'] });
      setShowModifierModal(false);
      addToast({ type: 'success', message: `Modifier Group ${editingModifierGroup ? 'updated' : 'created'} successfully` });
    },
    onError: (err: any) => {
      addToast({ type: 'error', message: err.response?.data?.message || 'Error saving modifier group' });
    }
  });

  const deleteModifierMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/modifiers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-modifiers'] });
      addToast({ type: 'success', message: 'Modifier Group deleted successfully' });
    }
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/products/import', data),
    onSuccess: (res) => {
      setImportReport(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['menu-products'] });
      refetchImportLogs();
      addToast({ type: 'success', message: 'Bulk import processed' });
    },
    onError: (err: any) => {
      addToast({ type: 'error', message: err.response?.data?.message || 'Error importing products' });
    }
  });

  // --- Category Tree Toggle Collapse ---
  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Handlers for modals ---
  const openProductForm = (product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      setProdName(product.name);
      setProdDisplayName(product.displayName || '');
      setProdSku(product.sku);
      setProdBarcode(product.barcode || '');
      setProdInternalCode(product.internalCode || '');
      setProdPrice(product.price.toString());
      setProdCost(product.cost.toString());
      setProdStock(product.stock.toString());
      setProdMinStock(product.minStock.toString());
      setProdBrand(product.brand || '');
      setProdUnit(product.unit);
      setProdPrepTime(product.preparationTime.toString());
      setProdRecipeLink(product.recipeLink || '');
      setProdStatus(product.status);
      setProdType(product.productType);
      setProdCategoryId(product.categoryId || '');
      setProdShortDesc(product.shortDescription || '');
      setProdFullDesc(product.fullDescription || '');
      setProdImageUrl(product.images?.[0]?.url || '');

      setVariantList(product.variants || []);
      
      const nut = product.nutrition;
      setNutCalories(nut?.calories?.toString() || '');
      setNutProtein(nut?.protein?.toString() || '');
      setNutFat(nut?.fat?.toString() || '');
      setNutCarbs(nut?.carbohydrates?.toString() || '');
      setNutSugar(nut?.sugar?.toString() || '');
      setNutAllergens(nut?.allergens || '');
      setNutServingSize(nut?.servingSize || '');

      setMappedModifierIds((product.modifiers || []).map((m: any) => m.modifierGroupId));
      setMappedTagIds((product.tags || []).map((t: any) => t.tagId));

      const dIn = product.pricings?.find((p: any) => p.priceType === 'DINE_IN')?.price;
      const tAw = product.pricings?.find((p: any) => p.priceType === 'TAKEAWAY')?.price;
      const dLv = product.pricings?.find((p: any) => p.priceType === 'DELIVERY')?.price;
      const hHr = product.pricings?.find((p: any) => p.priceType === 'HAPPY_HOUR')?.price;

      setDineInPrice(dIn?.toString() || '');
      setTakeawayPrice(tAw?.toString() || '');
      setDeliveryPrice(dLv?.toString() || '');
      setHappyHourPrice(hHr?.toString() || '');

      setComboItems(product.variants || []); // combos load here if combo meal
    } else {
      setProdName('');
      setProdDisplayName('');
      setProdSku(`PRD-${Math.floor(Math.random() * 90000) + 10000}`);
      setProdBarcode('');
      setProdInternalCode('');
      setProdPrice('0.00');
      setProdCost('0.00');
      setProdStock('50');
      setProdMinStock('10');
      setProdBrand('');
      setProdUnit('PCS');
      setProdPrepTime('10');
      setProdRecipeLink('');
      setProdStatus('ACTIVE');
      setProdType('REGULAR');
      setProdCategoryId(categories[0]?.id || '');
      setProdShortDesc('');
      setProdFullDesc('');
      setProdImageUrl('https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=200');

      setVariantList([]);
      setNutCalories('');
      setNutProtein('');
      setNutFat('');
      setNutCarbs('');
      setNutSugar('');
      setNutAllergens('');
      setNutServingSize('');

      setMappedModifierIds([]);
      setMappedTagIds([]);
      setComboItems([]);

      setDineInPrice('');
      setTakeawayPrice('');
      setDeliveryPrice('');
      setHappyHourPrice('');
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = () => {
    const data: any = {
      name: prodName,
      displayName: prodDisplayName || prodName,
      sku: prodSku,
      barcode: prodBarcode || null,
      internalCode: prodInternalCode || null,
      shortDescription: prodShortDesc || null,
      fullDescription: prodFullDesc || null,
      price: Number(prodPrice),
      cost: Number(prodCost),
      stock: Number(prodStock),
      minStock: Number(prodMinStock),
      brand: prodBrand || null,
      unit: prodUnit,
      preparationTime: Number(prodPrepTime),
      recipeLink: prodRecipeLink || null,
      status: prodStatus,
      productType: prodType,
      categoryId: prodCategoryId || null,
      images: prodImageUrl ? [prodImageUrl] : [],
      variants: prodType === 'VARIANT' ? variantList : undefined,
      tags: mappedTagIds,
      modifiers: mappedModifierIds,
      comboItems: prodType === 'COMBO' ? comboItems : undefined,
      nutrition: {
        calories: nutCalories ? Number(nutCalories) : null,
        protein: nutProtein ? Number(nutProtein) : null,
        fat: nutFat ? Number(nutFat) : null,
        carbohydrates: nutCarbs ? Number(nutCarbs) : null,
        sugar: nutSugar ? Number(nutSugar) : null,
        allergens: nutAllergens || null,
        servingSize: nutServingSize || null,
      },
      pricings: [
        { priceType: 'DINE_IN', price: Number(dineInPrice || prodPrice) },
        { priceType: 'TAKEAWAY', price: Number(takeawayPrice || Number(prodPrice) - 0.50) },
        { priceType: 'DELIVERY', price: Number(deliveryPrice || Number(prodPrice) + 1.00) },
        { priceType: 'HAPPY_HOUR', price: Number(happyHourPrice || Number(prodPrice) * 0.80) },
      ],
    };

    saveProductMutation.mutate(data);
  };

  const openCategoryForm = (category: Category | null = null) => {
    setEditingCategory(category);
    if (category) {
      setCatName(category.name);
      setCatSlug(category.slug || '');
      setCatDescription(category.description || '');
      setCatIcon(category.icon || 'Coffee');
      setCatDisplayOrder(category.displayOrder.toString());
      setCatColor(category.color || '');
      setCatParentId(category.parentCategoryId || '');
      setCatStatus(category.status);
      
      const ar = category.translations?.find((t) => t.language === 'ar');
      setCatTransNameAr(ar?.name || '');
      setCatTransDescAr(ar?.description || '');
    } else {
      setCatName('');
      setCatSlug('');
      setCatDescription('');
      setCatIcon('Coffee');
      setCatDisplayOrder('0');
      setCatColor('');
      setCatParentId('');
      setCatStatus('ACTIVE');
      setCatTransNameAr('');
      setCatTransDescAr('');
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    const translations = [];
    translations.push({ language: 'en', name: catName, description: catDescription });
    if (catTransNameAr) {
      translations.push({ language: 'ar', name: catTransNameAr, description: catTransDescAr });
    }

    const data = {
      name: catName,
      slug: catSlug || null,
      description: catDescription || null,
      icon: catIcon,
      displayOrder: Number(catDisplayOrder || 0),
      color: catColor || null,
      parentCategoryId: catParentId || null,
      status: catStatus,
      translations,
    };

    saveCategoryMutation.mutate(data);
  };

  const openModifierForm = (group: any | null = null) => {
    setEditingModifierGroup(group);
    if (group) {
      setModName(group.name);
      setModDescription(group.description || '');
      setModMin(group.minSelection.toString());
      setModMax(group.maxSelection.toString());
      setModRequired(group.isRequired);
      setModMulti(group.isMultiSelect);
      setModStatus(group.status);
      setModDisplayOrder(group.displayOrder.toString());
      setModOptions(group.options || []);
    } else {
      setModName('');
      setModDescription('');
      setModMin('0');
      setModMax('1');
      setModRequired(false);
      setModMulti(false);
      setModStatus('ACTIVE');
      setModDisplayOrder('0');
      setModOptions([]);
    }
    setShowModifierModal(true);
  };

  const handleSaveModifierGroup = () => {
    const data = {
      name: modName,
      description: modDescription || null,
      minSelection: Number(modMin),
      maxSelection: Number(modMax),
      isRequired: modRequired,
      isMultiSelect: modMulti,
      status: modStatus,
      displayOrder: Number(modDisplayOrder || 0),
      options: modOptions,
    };

    saveModifierMutation.mutate(data);
  };

  const handleImportSubmit = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      importMutation.mutate({
        products: Array.isArray(parsed) ? parsed : [parsed],
        fileName: 'dashboard_manual_wizard.json',
      });
    } catch (e) {
      addToast({ type: 'error', message: 'Invalid JSON text format' });
    }
  };

  const handleExportCatalog = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(productsList, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', 'menu_catalog_export.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(`${apiClient.defaults.baseURL}/products/export?format=csv&token=${localStorage.getItem('token')}`, '_blank');
    }
  };

  // --- Sub-actions: Add Option / Variant Helpers ---
  const addVariantToList = () => {
    if (!newVarName || !newVarSku || !newVarPrice) {
      addToast({ type: 'warning', message: 'Name, SKU, and Price required' });
      return;
    }
    setVariantList([
      ...variantList,
      {
        name: newVarName,
        sku: newVarSku,
        price: Number(newVarPrice),
        cost: Number(newVarCost || 0),
        status: 'ACTIVE',
        prices: [], // branch overrides placeholder
      }
    ]);
    setNewVarName('');
    setNewVarSku('');
    setNewVarPrice('');
    setNewVarCost('');
  };

  const removeVariantFromList = (index: number) => {
    const updated = [...variantList];
    updated.splice(index, 1);
    setVariantList(updated);
  };

  const addOptionToModifierGroup = () => {
    if (!newOptName) {
      addToast({ type: 'warning', message: 'Option name required' });
      return;
    }
    setModOptions([
      ...modOptions,
      {
        name: newOptName,
        price: Number(newOptPrice || 0),
        isAvailable: true,
      }
    ]);
    setNewOptName('');
    setNewOptPrice('');
  };

  const removeOptionFromModifierGroup = (index: number) => {
    const updated = [...modOptions];
    updated.splice(index, 1);
    setModOptions(updated);
  };

  const addComboItemToList = () => {
    if (!selectedComboProductId) {
      addToast({ type: 'warning', message: 'Select product component' });
      return;
    }
    const match = productsList.find((p: any) => p.id === selectedComboProductId);
    if (!match) return;

    setComboItems([
      ...comboItems,
      {
        productId: selectedComboProductId,
        product: { name: match.name, sku: match.sku },
        quantity: Number(selectedComboQty || 1),
        isRequired: true,
        displayOrder: comboItems.length,
      }
    ]);
    setSelectedComboProductId('');
    setSelectedComboQty('1');
  };

  const removeComboItemFromList = (index: number) => {
    const updated = [...comboItems];
    updated.splice(index, 1);
    setComboItems(updated);
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground select-none">
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Notebook className="h-8 w-8 text-primary" />
            Menu & Catalog Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Build categories hierarchies, setup variant configurations, modifier groups, and combo meals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => handleExportCatalog('csv')} className="flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5">
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>

          <Button
            onClick={() => {
              if (activeTab === 'products') openProductForm();
              else if (activeTab === 'categories') openCategoryForm();
              else openModifierForm();
            }}
            className="flex items-center gap-1.5 font-bold"
          >
            <Plus className="h-4.5 w-4.5" />
            {activeTab === 'products' ? 'New Product' : activeTab === 'categories' ? 'New Category' : 'New Modifier'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        {(['products', 'categories', 'modifiers', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 capitalize cursor-pointer ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'modifiers' ? 'Modifier Groups' : tab === 'logs' ? 'Import Logs' : tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-card to-accent/15 border-border shadow">
              <span className="text-muted-foreground text-xs font-semibold block">Total Catalog Products</span>
              <span className="text-2xl font-black text-foreground block mt-1">{productsList.length} Items</span>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-card to-accent/15 border-border shadow">
              <span className="text-muted-foreground text-xs font-semibold block">Low Stock Alerts</span>
              <span className="text-2xl font-black text-amber-500 block mt-1">
                {productsList.filter((p: any) => p.stock <= p.minStock).length} Warning
              </span>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-card to-accent/15 border-border shadow">
              <span className="text-muted-foreground text-xs font-semibold block">Combo Packages</span>
              <span className="text-2xl font-black text-pink-500 block mt-1">
                {productsList.filter((p: any) => p.productType === 'COMBO').length} Bundles
              </span>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-card to-accent/15 border-border shadow">
              <span className="text-muted-foreground text-xs font-semibold block">Drafts / Inactive</span>
              <span className="text-2xl font-black text-muted-foreground block mt-1">
                {productsList.filter((p: any) => p.status !== 'ACTIVE').length} Saved
              </span>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search catalog by SKU, barcode, name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-accent border border-border text-foreground px-3 py-2 rounded-lg text-xs font-bold"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-accent border border-border text-foreground px-3 py-2 rounded-lg text-xs font-bold"
            >
              <option value="all">All Types</option>
              <option value="REGULAR">Regular Base</option>
              <option value="VARIANT">Variants Group</option>
              <option value="COMBO">Combo Bundles</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-accent border border-border text-foreground px-3 py-2 rounded-lg text-xs font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Products List Table */}
          <Card className="border border-border rounded-xl shadow-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left">
                <thead className="bg-accent/20 text-muted-foreground text-[11px] uppercase tracking-wider font-extrabold">
                  <tr>
                    <th className="px-6 py-3.5">Name / SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Base Price</th>
                    <th className="px-6 py-3.5">Stock Qty</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm font-medium">
                  {productsList.map((prod: Product) => (
                    <tr key={prod.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-base">{prod.name}</span>
                          <span className="font-mono text-xs text-muted-foreground mt-0.5">{prod.sku}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="primary" className="text-[10px]">
                          {prod.category?.name || 'Unassigned'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-primary">
                        ${prod.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={prod.stock <= prod.minStock ? 'text-amber-500 font-extrabold' : 'text-foreground'}>
                          {prod.stock} {prod.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={prod.productType === 'COMBO' ? 'danger' : prod.productType === 'VARIANT' ? 'warning' : 'secondary'} className="text-[10px]">
                          {prod.productType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={prod.status === 'ACTIVE' ? 'success' : prod.status === 'DRAFT' ? 'secondary' : 'danger'} className="text-[10px]">
                          {prod.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openProductForm(prod)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete/Archive this product?')) {
                                deleteProductMutation.mutate(prod.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-accent cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {productsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No products found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Categories Hierarchical Tree */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-lg font-bold border-b border-border pb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Restaurant Category Tree Structure
            </h3>

            <div className="bg-card border border-border rounded-xl p-4 shadow space-y-3">
              {categoriesTree.map((parent) => {
                const isExpanded = expandedCategories[parent.id];
                return (
                  <div key={parent.id} className="border border-border/50 rounded-xl overflow-hidden bg-accent/5">
                    {/* Parent Row */}
                    <div className="flex items-center justify-between p-3.5 bg-accent/10 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleCategoryExpand(parent.id)}
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <span className="font-extrabold text-base tracking-wide text-foreground">{parent.name}</span>
                        <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded">
                          Parent
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCategoryForm(parent)}
                          className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete category?')) deleteCategoryMutation.mutate(parent.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Children Sub-rows */}
                    {isExpanded && (
                      <div className="p-3 pl-8 bg-card divide-y divide-border/30">
                        {parent.subCategories && parent.subCategories.length > 0 ? (
                          parent.subCategories.map((child) => (
                            <div key={child.id} className="flex justify-between items-center py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-muted-foreground">{child.name}</span>
                                {child._count?.products !== undefined && (
                                  <Badge variant="secondary" className="scale-75 origin-left py-0 text-[10px]">
                                    {child._count.products} Products
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openCategoryForm(child)}
                                  className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete subcategory?')) deleteCategoryMutation.mutate(child.id);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            No child subcategories placed under this item.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-border shadow-md">
              <h4 className="font-bold border-b border-border pb-2">Multi-Language Setup</h4>
              <p className="text-xs text-muted-foreground mt-2">
                Clicking the edit option supports setting translations for category names, including <b>Arabic</b> translations for custom order menus.
              </p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'modifiers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modifierGroups.map((group) => (
            <Card key={group.id} className="p-5 border-border shadow-md flex flex-col justify-between h-64 bg-card">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{group.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{group.description || 'No description'}</p>
                  </div>
                  <Badge variant={group.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {group.status}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Selection Constraint:</span>
                    <span>Min {group.minSelection} | Max {group.maxSelection}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {group.options && group.options.map((opt: any) => (
                      <span key={opt.id} className="text-[10px] bg-accent/40 border border-border/50 text-muted-foreground font-bold px-2 py-0.5 rounded">
                        {opt.name} (+${opt.price.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border mt-4 pt-3">
                <Button size="sm" variant="outline" onClick={() => openModifierForm(group)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="text-rose-500 hover:bg-rose-950/15" onClick={() => {
                  if (confirm('Delete modifier group?')) deleteModifierMutation.mutate(group.id);
                }}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
          {modifierGroups.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              No modifier groups configured. Click "New Modifier" to set options.
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-lg font-bold border-b border-border pb-2">Recent Catalog Upload Actions</h3>
            <div className="space-y-3">
              {importLogs.map((log: any) => (
                <Card key={log.id} className="p-4 border-border shadow flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-foreground block">{log.fileName}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Timestamp: {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-500">Success: {log.successRows}</span>
                    <span className="text-xs font-bold text-rose-500 ml-4">Fail: {log.failedRows}</span>
                  </div>
                </Card>
              ))}
              {importLogs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border rounded-xl">
                  No import attempts logged.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="p-6 border-border shadow bg-card space-y-4">
              <h4 className="font-black text-base border-b border-border pb-2 flex items-center gap-1.5">
                <Upload className="h-5 w-5 text-primary" /> Drag & Drop Import Wizard
              </h4>
              <p className="text-xs text-muted-foreground">
                Paste JSON catalog array strings in the upload modal to populate products, branch schedules, and tags dynamically.
              </p>
              <Button onClick={() => setShowImportModal(true)} className="w-full">
                Launch Import Wizard
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* --- PRODUCT FORM MODAL --- */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 scrollbar-thin">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                {editingProduct ? 'Edit Catalog Product' : 'Create New Menu Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: General Info */}
              <div className="space-y-4">
                <div className="border-b border-border pb-2 font-bold text-sm text-primary uppercase tracking-wider">
                  General Inventory Details
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Product Name</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    placeholder="e.g. Caffe Latte Grande"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">SKU Code</label>
                    <input
                      type="text"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Category</label>
                    <select
                      value={prodCategoryId}
                      onChange={(e) => setProdCategoryId(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    >
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Base Price ($)</label>
                    <input
                      type="number"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Cost Margin ($)</label>
                    <input
                      type="number"
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Current Stock</label>
                    <input
                      type="number"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Min Alert Stock</label>
                    <input
                      type="number"
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Measure Unit</label>
                    <input
                      type="text"
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Type Option</label>
                    <select
                      value={prodType}
                      onChange={(e) => setProdType(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    >
                      <option value="REGULAR">Regular Base</option>
                      <option value="VARIANT">Variants Group</option>
                      <option value="COMBO">Combo Bundle</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block">Preparation (mins)</label>
                    <input
                      type="number"
                      value={prodPrepTime}
                      onChange={(e) => setProdPrepTime(e.target.value)}
                      className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Catalog Status</label>
                  <select
                    value={prodStatus}
                    onChange={(e) => setProdStatus(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Image URL</label>
                  <input
                    type="text"
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    placeholder="https://unsplash.com/..."
                  />
                </div>
              </div>

              {/* Right Side: Tabular sub-forms */}
              <div className="space-y-4">
                <div className="border-b border-border pb-2 font-bold text-sm text-primary uppercase tracking-wider">
                  Menu Customization & Relations
                </div>

                {/* Modifiers List Checklist */}
                <div>
                  <span className="text-xs font-bold text-muted-foreground block mb-2">Modifier Groups Checklist</span>
                  <div className="grid grid-cols-2 gap-2 bg-accent/15 border border-border p-3 rounded-lg max-h-32 overflow-y-auto">
                    {modifierGroups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2 text-xs font-semibold select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mappedModifierIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) setMappedModifierIds([...mappedModifierIds, group.id]);
                            else setMappedModifierIds(mappedModifierIds.filter((id) => id !== group.id));
                          }}
                          className="rounded border-border accent-primary"
                        />
                        {group.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags Checklist */}
                <div>
                  <span className="text-xs font-bold text-muted-foreground block mb-2">Product Tags Checklist</span>
                  <div className="grid grid-cols-2 gap-2 bg-accent/15 border border-border p-3 rounded-lg max-h-30 overflow-y-auto">
                    {tagList.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 text-xs font-semibold select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mappedTagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) setMappedTagIds([...mappedTagIds, tag.id]);
                            else setMappedTagIds(mappedTagIds.filter((id) => id !== tag.id));
                          }}
                          className="rounded border-border accent-primary"
                        />
                        <span style={{ color: tag.color }}>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Variants Editor Subsection */}
                {prodType === 'VARIANT' && (
                  <div className="border border-border p-4 rounded-xl space-y-3 bg-accent/10">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <Sparkles className="h-4 w-4" /> Size / Flavor Variant Builder
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Variant e.g. Regular Cup"
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        className="bg-background border border-border rounded px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Variant SKU"
                        value={newVarSku}
                        onChange={(e) => setNewVarSku(e.target.value)}
                        className="bg-background border border-border rounded px-2.5 py-1.5"
                      />
                      <input
                        type="number"
                        placeholder="Variant Price"
                        value={newVarPrice}
                        onChange={(e) => setNewVarPrice(e.target.value)}
                        className="bg-background border border-border rounded px-2.5 py-1.5"
                      />
                      <input
                        type="number"
                        placeholder="Variant Cost"
                        value={newVarCost}
                        onChange={(e) => setNewVarCost(e.target.value)}
                        className="bg-background border border-border rounded px-2.5 py-1.5"
                      />
                    </div>
                    <Button size="sm" onClick={addVariantToList} className="w-full text-xs">
                      Append Variant Option
                    </Button>

                    <div className="space-y-1 max-h-24 overflow-y-auto mt-2 text-xs font-semibold">
                      {variantList.map((vr, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-card p-1.5 border border-border rounded">
                          <span>{vr.name} (${vr.price.toFixed(2)})</span>
                          <button onClick={() => removeVariantFromList(idx)} className="text-rose-500 hover:text-rose-600 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Combo Builder Subsection */}
                {prodType === 'COMBO' && (
                  <div className="border border-border p-4 rounded-xl space-y-3 bg-accent/10">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <Layers className="h-4 w-4" /> Combo Component Builder
                    </span>

                    <div className="grid grid-cols-12 gap-2 text-xs">
                      <select
                        value={selectedComboProductId}
                        onChange={(e) => setSelectedComboProductId(e.target.value)}
                        className="bg-background border border-border rounded px-2.5 py-1.5 col-span-8 focus:outline-none"
                      >
                        <option value="">Choose item...</option>
                        {productsList.filter((p: any) => p.productType === 'REGULAR').map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={selectedComboQty}
                        onChange={(e) => setSelectedComboQty(e.target.value)}
                        className="bg-background border border-border rounded px-2.5 py-1.5 col-span-4"
                      />
                    </div>
                    <Button size="sm" onClick={addComboItemToList} className="w-full text-xs">
                      Add Combo Item
                    </Button>

                    <div className="space-y-1 max-h-24 overflow-y-auto mt-2 text-xs font-semibold">
                      {comboItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-card p-1.5 border border-border rounded">
                          <span>{item.product?.name} (Qty: {item.quantity})</span>
                          <button onClick={() => removeComboItemFromList(idx)} className="text-rose-500 hover:text-rose-600 cursor-pointer">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing Tiers Section */}
                <div className="border border-border p-4 rounded-xl space-y-3 bg-accent/5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-4 w-4 text-primary" /> Branch Price Overrides & Tiers
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block">Dine-In Price ($)</label>
                      <input
                        type="number"
                        value={dineInPrice}
                        onChange={(e) => setDineInPrice(e.target.value)}
                        placeholder={prodPrice}
                        className="bg-background border border-border rounded px-2.5 py-1.5 w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block">Takeaway Price ($)</label>
                      <input
                        type="number"
                        value={takeawayPrice}
                        onChange={(e) => setTakeawayPrice(e.target.value)}
                        placeholder={(Number(prodPrice) - 0.5).toString()}
                        className="bg-background border border-border rounded px-2.5 py-1.5 w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block">Delivery Price ($)</label>
                      <input
                        type="number"
                        value={deliveryPrice}
                        onChange={(e) => setDeliveryPrice(e.target.value)}
                        placeholder={(Number(prodPrice) + 1.0).toString()}
                        className="bg-background border border-border rounded px-2.5 py-1.5 w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold block">Happy Hour Price ($)</label>
                      <input
                        type="number"
                        value={happyHourPrice}
                        onChange={(e) => setHappyHourPrice(e.target.value)}
                        placeholder={(Number(prodPrice) * 0.8).toString()}
                        className="bg-background border border-border rounded px-2.5 py-1.5 w-full mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Nutrition & Allergens Drawer Section */}
                <div className="border border-border p-4 rounded-xl space-y-3 bg-accent/5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Apple className="h-4 w-4 text-emerald-500" /> Nutritional Value & Allergens
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Calories</label>
                      <input
                        type="number"
                        placeholder="e.g. 150"
                        value={nutCalories}
                        onChange={(e) => setNutCalories(e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Protein (g)</label>
                      <input
                        type="number"
                        placeholder="e.g. 4"
                        value={nutProtein}
                        onChange={(e) => setNutProtein(e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 w-full mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Fat (g)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5"
                        value={nutFat}
                        onChange={(e) => setNutFat(e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 w-full mt-0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block">Allergens Checklist (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Milk, Gluten, Soy"
                      value={nutAllergens}
                      onChange={(e) => setNutAllergens(e.target.value)}
                      className="bg-background border border-border rounded px-2.5 py-1.5 w-full mt-1 text-xs"
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setShowProductModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProduct} disabled={saveProductMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- CATEGORY FORM MODAL --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block">Category Name (English)</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  placeholder="e.g. Hot Drinks"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block flex items-center gap-1 text-amber-500">
                  <Languages className="h-4 w-4" /> Arabic Translation (الاسم باللغة العربية)
                </label>
                <input
                  type="text"
                  value={catTransNameAr}
                  onChange={(e) => setCatTransNameAr(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none text-right font-semibold"
                  placeholder="مثال: مشروبات ساخنة"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Slug Reference</label>
                  <input
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    placeholder="hot-drinks"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Parent Category</label>
                  <select
                    value={catParentId}
                    onChange={(e) => setCatParentId(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  >
                    <option value="">No Parent (Root Category)</option>
                    {categories.filter((c) => !c.parentCategoryId && c.id !== editingCategory?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Display Order</label>
                  <input
                    type="number"
                    value={catDisplayOrder}
                    onChange={(e) => setCatDisplayOrder(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Color Hex</label>
                  <input
                    type="text"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                    placeholder="#10b981"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Status</label>
                  <select
                    value={catStatus}
                    onChange={(e) => setCatStatus(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block">Description</label>
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none h-16"
                  placeholder="Enter short description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} disabled={saveCategoryMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODIFIER GROUP FORM MODAL --- */}
      {showModifierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                {editingModifierGroup ? 'Edit Modifier Group' : 'Create Modifier Group'}
              </h3>
              <button onClick={() => setShowModifierModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block">Group Name</label>
                <input
                  type="text"
                  value={modName}
                  onChange={(e) => setModName(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  placeholder="e.g. Milk Choices"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block">Description</label>
                <input
                  type="text"
                  value={modDescription}
                  onChange={(e) => setModDescription(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  placeholder="Select custom toppings or options..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Min Selection</label>
                  <input
                    type="number"
                    value={modMin}
                    onChange={(e) => setModMin(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block">Max Selection</label>
                  <input
                    type="number"
                    value={modMax}
                    onChange={(e) => setModMax(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3.5 py-2 mt-1 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modRequired}
                    onChange={(e) => setModRequired(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  Is Required
                </label>
                <label className="flex items-center gap-2 text-xs font-bold select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modMulti}
                    onChange={(e) => setModMulti(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  Multi Select
                </label>
              </div>

              {/* Modifier Options Builder */}
              <div className="border border-border p-4 rounded-xl space-y-3 bg-accent/10">
                <span className="text-xs font-bold text-primary">Append Options List</span>
                <div className="grid grid-cols-12 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Option name e.g. Oat Milk"
                    value={newOptName}
                    onChange={(e) => setNewOptName(e.target.value)}
                    className="bg-background border border-border rounded px-2.5 py-1.5 col-span-7"
                  />
                  <input
                    type="number"
                    placeholder="Price override (+$)"
                    value={newOptPrice}
                    onChange={(e) => setNewOptPrice(e.target.value)}
                    className="bg-background border border-border rounded px-2.5 py-1.5 col-span-5"
                  />
                </div>
                <Button size="sm" onClick={addOptionToModifierGroup} className="w-full text-xs">
                  Add Modifier Option
                </Button>

                <div className="space-y-1 max-h-24 overflow-y-auto mt-2 text-xs font-semibold">
                  {modOptions.map((opt, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-card p-1.5 border border-border rounded">
                      <span>{opt.name} (+${Number(opt.price || 0).toFixed(2)})</span>
                      <button onClick={() => removeOptionFromModifierGroup(idx)} className="text-rose-500 hover:text-rose-600 cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setShowModifierModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveModifierGroup} disabled={saveModifierMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- BULK IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Bulk Catalog Import Wizard
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-full hover:bg-accent text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Paste your product catalog array in JSON structure below:
              </p>

              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-3 text-xs font-mono h-64 focus:outline-none"
                placeholder={`[
  {
    "name": "Iced Matcha Latte",
    "sku": "PRD-MCH-01",
    "price": 5.50,
    "cost": 1.20,
    "stock": 80,
    "minStock": 10,
    "categoryName": "Coffee"
  }
]`}
              />

              {importReport && (
                <div className="p-4 bg-accent/20 border border-border rounded-xl text-xs space-y-1">
                  <span className="font-extrabold text-foreground block">Validation / Upload Report:</span>
                  <span className="text-emerald-500 block">✓ Successful Rows: {importReport.successRows}</span>
                  <span className="text-rose-500 block">✗ Failed Rows: {importReport.failedRows}</span>
                  {importReport.errors && importReport.errors.length > 0 && (
                    <div className="max-h-24 overflow-y-auto border-t border-border mt-2 pt-2 space-y-1">
                      {importReport.errors.map((e: any, i: number) => (
                        <div key={i} className="text-rose-400">
                          Row {e.row} (SKU: {e.sku}): {e.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="outline" onClick={() => {
                setShowImportModal(false);
                setImportReport(null);
              }}>
                Close
              </Button>
              <Button onClick={handleImportSubmit} disabled={importMutation.isPending}>
                Execute Import
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MenuManagement;
