import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

// Icon name to component mapping
const iconMap: Record<string, LucideIcon> = {
  'Utensils': Icons.Utensils,
  'Donut': Icons.Donut,
  'Baby': Icons.Baby,
  'ShoppingBasket': Icons.ShoppingBasket,
  'Bus': Icons.Bus,
  'Book': Icons.Book,
  'Tv': Icons.Tv,
  'Gift': Icons.Gift,
  'Users': Icons.Users,
  'Heart': Icons.Heart,
  'DollarSign': Icons.DollarSign,
  'FileText': Icons.FileText,
  'ShoppingBag': Icons.ShoppingBag,
  'ChartArea': Icons.ChartArea,
  'Home': Icons.Home,
  'Dices': Icons.Dices,
  'Banknote': Icons.Banknote,
  'PenLine': Icons.PenLine,
  'BriefcaseBusiness': Icons.BriefcaseBusiness,
  'Landmark': Icons.Landmark,
};

/**
 * Get LucideIcon component from icon name string
 */
export function getIconFromName(iconName: string): LucideIcon {
  return iconMap[iconName] || Icons.Dices; // Default to Dices if icon not found
}

/**
 * Convert database category format to form-compatible format
 */
export interface DatabaseCategory {
  value: string;
  label: string;
  icon: string;
}

export interface FormCategory {
  value: string;
  label: string;
  icon: LucideIcon;
}

export function convertDatabaseCategoriesToForm(dbCategories: DatabaseCategory[]): FormCategory[] {
  return dbCategories.map(cat => ({
    value: cat.value,
    label: cat.label,
    icon: getIconFromName(cat.icon)
  }));
}
