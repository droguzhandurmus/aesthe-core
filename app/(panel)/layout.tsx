"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("ac_calendar_date");
    router.replace("/login");
  }

  if (!checked) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar onSignOut={handleSignOut} />
      <main className="flex-1 h-full overflow-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}
