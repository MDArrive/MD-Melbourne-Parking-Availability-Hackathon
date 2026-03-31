import React from "react";

import useSidebar from "../../hooks/useSidebar";
import SidebarNav from "./SidebarNav";
import Logo from "../../assets/img/logo.svg?react";

import { SidebarItemsType } from "../../types/sidebar";

interface SidebarProps {
  items: {
    title: string;
    pages: SidebarItemsType[];
  }[];
  open?: boolean;
  showFooter?: boolean;
}

const Sidebar = ({ items, showFooter = true }: SidebarProps) => {
  const { isOpen } = useSidebar();

  return (
    <nav className={`sidebar ${!isOpen ? "collapsed" : ""}`}>
      <div className="sidebar-content">
          <a className="sidebar-brand" href="/">
            <Logo /> <span className="align-middle me-3">AI Learning</span>
          </a>

          <SidebarNav items={items} />
      </div>
    </nav>
  );
};

export default Sidebar;
