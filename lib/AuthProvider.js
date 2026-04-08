"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);
const MembersContext = createContext([]);
const ProjectContext = createContext({ name: "Startup OS", logo: null, description: "" });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMember(authUser) {
    if (!authUser?.email) {
      setMember(null);
      return;
    }

    const { data } = await supabase
      .from("cockpit_members")
      .select("*")
      .eq("email", authUser.email)
      .in("status", ["active", "invited"])
      .single();

    if (data) {
      setMember(data);

      // If member was "invited" and just logged in, mark as active + link user_id
      if (data.status === "invited") {
        await supabase
          .from("cockpit_members")
          .update({ status: "active", user_id: authUser.id, last_seen_at: new Date().toISOString() })
          .eq("id", data.id);
      } else {
        // Update last seen
        await supabase
          .from("cockpit_members")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    } else {
      setMember(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadMember(u).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadMember(u);
      } else {
        setMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load project config (name, logo, description)
  const [project, setProject] = useState({ name: "", logo: null, description: "", loaded: false });

  useEffect(() => {
    async function loadProject() {
      const [{ data: nameRow }, { data: descRow }, { data: logoRow }] = await Promise.all([
        supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:project_name").maybeSingle(),
        supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:description").maybeSingle(),
        supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:logo_url").maybeSingle(),
      ]);
      setProject({
        name: nameRow?.body || "Startup OS",
        description: descRow?.body || "",
        logo: logoRow?.body || null,
        loaded: true,
      });
    }
    loadProject();
  }, []);

  // Load all active members (replaces hardcoded BUILDERS)
  const [members, setMembers] = useState([]);

  useEffect(() => {
    async function loadMembers() {
      const { data } = await supabase
        .from("cockpit_members")
        .select("*")
        .in("status", ["active", "invited"])
        .order("created_at");
      setMembers(data || []);
    }
    loadMembers();

    const channel = supabase
      .channel("members-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_members" }, () => {
        loadMembers();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Backward-compatible "builder" alias
  const builder = member
    ? { name: member.name, role: member.builder || "?", color: member.color || "#3b82f6", branch: member.name?.toLowerCase() }
    : null;

  const role = member?.role;
  const permissions = {
    isAdmin: role === "admin",
    isCofounder: role === "admin" || role === "cofounder",
    isMentor: role === "mentor",
    isObserver: role === "observer",
    canEdit: role === "admin" || role === "cofounder",
    canComment: role === "admin" || role === "cofounder" || role === "mentor",
    canView: (section) => {
      if (role === "admin" || role === "cofounder" || role === "mentor") return true;
      if (role === "observer") return ["pourquoi", "analytics", "feedback"].includes(section);
      return false;
    },
  };

  return (
    <AuthContext.Provider value={{ user, member, builder, loading, ...permissions }}>
      <ProjectContext.Provider value={project}>
        <MembersContext.Provider value={members}>
          {children}
        </MembersContext.Provider>
      </ProjectContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function useMembers() {
  return useContext(MembersContext);
}

export function useProject() {
  return useContext(ProjectContext);
}
