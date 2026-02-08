import { OrderStatus, Allergen } from '@/types/enums';

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
  [OrderStatus.CONFIRMED]: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  [OrderStatus.ACCEPTED]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
  [OrderStatus.PREPARING]: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  [OrderStatus.READY]: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
  [OrderStatus.OUT_FOR_DELIVERY]: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
  [OrderStatus.DELIVERED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Oczekujące',
  [OrderStatus.CONFIRMED]: 'Potwierdzone',
  [OrderStatus.ACCEPTED]: 'Zaakceptowane',
  [OrderStatus.PREPARING]: 'W przygotowaniu',
  [OrderStatus.READY]: 'Gotowe',
  [OrderStatus.OUT_FOR_DELIVERY]: 'W dostawie',
  [OrderStatus.DELIVERED]: 'Dostarczone',
  [OrderStatus.CANCELLED]: 'Anulowane',
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  [Allergen.GLUTEN]: 'Gluten',
  [Allergen.CRUSTACEANS]: 'Skorupiaki',
  [Allergen.EGGS]: 'Jaja',
  [Allergen.FISH]: 'Ryby',
  [Allergen.PEANUTS]: 'Orzeszki ziemne',
  [Allergen.SOYBEANS]: 'Soja',
  [Allergen.MILK]: 'Mleko',
  [Allergen.NUTS]: 'Orzechy',
  [Allergen.CELERY]: 'Seler',
  [Allergen.MUSTARD]: 'Gorczyca',
  [Allergen.SESAME]: 'Sezam',
  [Allergen.SULPHITES]: 'Siarczyny',
  [Allergen.LUPIN]: 'Łubin',
  [Allergen.MOLLUSCS]: 'Mięczaki',
};

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  separator?: boolean;
  external?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { title: 'Zamówienia', href: '/orders', icon: 'ShoppingCart' },
  { title: 'Menu', href: '/menu', icon: 'UtensilsCrossed' },
  { title: 'Magazyn', href: '/inventory', icon: 'Warehouse' },
  { title: 'Pracownicy', href: '/employees', icon: 'Users' },
  { title: 'Kuchnia KDS', href: '/kitchen', icon: 'ChefHat', separator: true, external: true },
  { title: 'Ustawienia', href: '/settings', icon: 'Settings', separator: true },
];

export const APP_NAME = 'MESOpos';
export const DEFAULT_CURRENCY = 'PLN';
export const DEFAULT_LOCALE = 'pl-PL';
export const STORAGE_PREFIX = 'mesopos_';
