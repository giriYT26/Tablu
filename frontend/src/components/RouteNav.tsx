import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GooeyNav from './GooeyNav/GooeyNav';
import type { GooeyNavProps, GooeyNavItem } from './GooeyNav/GooeyNav';

export interface RouteNavItem {
  label: string;
  to: string;
  end?: boolean;
  icon?: React.ReactNode;
}

type GooeyOptions = Omit<
  GooeyNavProps,
  'items' | 'activeIndex' | 'initialActiveIndex' | 'onChange' | 'ariaLabel'
>;

export interface RouteNavProps extends GooeyOptions {
  items: RouteNavItem[];
  ariaLabel?: string;
  onNavigate?: (item: RouteNavItem, index: number) => void;
}

const matchesPath = (pathname: string, item: RouteNavItem) =>
  item.end || item.to === '/'
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`);

export const RouteNav: React.FC<RouteNavProps> = ({ items, ariaLabel, onNavigate, ...navProps }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const activeIndex = useMemo(
    () => items.findIndex((item) => matchesPath(pathname, item)),
    [items, pathname]
  );

  const gooeyItems = useMemo<GooeyNavItem[]>(
    () => items.map((item) => ({ label: item.label, icon: item.icon })),
    [items]
  );

  const handleChange = (index: number) => {
    const item = items[index];
    if (!item) return;
    navigate(item.to);
    onNavigate?.(item, index);
  };

  return (
    <GooeyNav
      {...navProps}
      items={gooeyItems}
      ariaLabel={ariaLabel}
      activeIndex={activeIndex}
      onChange={handleChange}
    />
  );
};

export default RouteNav;
