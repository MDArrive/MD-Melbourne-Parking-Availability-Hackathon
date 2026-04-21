import React, { Suspense, ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Home } from "lucide-react";

import Wrapper from "../components/Wrapper";
import Sidebar from "../components/sidebar/Sidebar";
import Main from "../components/Main";
import Content from "../components/Content";
import Loader from "../components/Loader";
import { SidebarItemsType } from "../types/sidebar";

interface DashboardProps {
  children?: ReactNode;
}

const sidebarNavigation: { title: string; pages: SidebarItemsType[] }[] = [
  {
    title: "",
    pages: [
      {
        href: "/",
        title: "Home",
        icon: Home,
      },
    ],
  },
];

const Dashboard: React.FC<DashboardProps> = ({ children }) => (
  <React.Fragment>
    <Wrapper>
      <Sidebar items={sidebarNavigation} />
      <Main>
        <Content>
          <Suspense fallback={<Loader />}>
            {children}
            <Outlet />
          </Suspense>
        </Content>
      </Main>
    </Wrapper>
  </React.Fragment>
);

export default Dashboard;
