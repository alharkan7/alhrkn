import { LucideIcon } from 'lucide-react';

interface Category {
    value: string;
    icon: LucideIcon;
    label: string;
}


import {
    Utensils,
    ShoppingBag,
    ShoppingBasket,
    Baby,
    Bus,
    Book,
    Donut,
    Tv,
    Gift,
    Users,
    Heart,
    DollarSign,
    FileText,
    Home,
    ChartArea,
    Dices,
    Banknote, PenLine, BriefcaseBusiness, Landmark
} from "lucide-react"


export const categories: Category[] = [
    { value: '🍔 Food & Beverages', icon: Utensils, label: 'Food & Beverages' },
    { value: '🥫 Snacks', icon: Donut, label: 'Snacks' },
    { value: '👼🏼 Baby', icon: Baby, label: 'Baby' },
    { value: '🛒 Groceries', icon: ShoppingBasket, label: 'Groceries' },
    { value: '🚗 Transportation', icon: Bus, label: 'Transportation' },
    { value: '🎓 Education', icon: Book, label: 'Education' },
    { value: '🍿 Entertainment', icon: Tv, label: 'Entertainment' },
    { value: '🎁 Gift & Donations', icon: Gift, label: 'Gift & Donations' },
    { value: '😊 Family', icon: Users, label: 'Family' },
    { value: '💊 Health', icon: Heart, label: 'Health' },
    { value: '🧾 Bill & Utilities', icon: FileText, label: 'Bill & Utilities' },
    { value: '💵 Fees & Charges', icon: DollarSign, label: 'Fees & Charges' },
    { value: '🛍️ Shopping', icon: ShoppingBag, label: 'Shopping' },
    { value: '💰 Investment', icon: ChartArea, label: 'Investment' },
    { value: '🏠 Accommodation', icon: Home, label: 'Accommodation' },
    { value: '🎲 Others', icon: Dices, label: 'Others' },
] as const;

export const categoriesIncome: Category[] = [
    { value: '💰 Salary', icon: Banknote, label: 'Salary' },
    { value: '✍🏼 Event', icon: PenLine, label: 'Event' },
    { value: '💼 Business', icon: BriefcaseBusiness, label: 'Business' },
    { value: '🎁 Gift', icon: Landmark, label: 'Gift' },
    { value: '🎲 Others', icon: Dices, label: 'Others' },
] as const;