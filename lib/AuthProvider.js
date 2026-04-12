"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);
const MembersContext = createContext([]);
const ProjectContext = createContext({ name: "Startup OS", logo: null, description: "" });

const SELFHOSTED = process.env.NEXT_PUBLIC_AUTH_MODE === "selfhosted";

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

      if (!SELFHOSTED) {
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
      }
    } else {
      setMember(null);
    }
  }

  // Self-hosted mode: auto-login as first admin member
  useEffect(() => {
    if (!SELFHOSTED) return;
    async function selfHostedLogin() {
      const { data } = await supabase
        .from("cockpit_members")
        .select("*")
        .eq("role", "admin")
        .eq("status", "active")
        .limit(1)
        .single();
      if (data) {
        setUser({ email: data.email, id: data.id });
        setMember(data);
      }
      setLoading(false);
    }
    selfHostedLogin();
  }, []);

  // Supabase Auth mode: magic link flow
  useEffect(() => {
    if (SELFHOSTED) return;

    // Check if the URL has a magic link hash fragment — if so, wait for
    // onAuthStateChange to fire instead of immediately resolving as "no session"
    const hasHashToken =
      typeof window !== "undefined" &&
      window.location.hash.includes("access_token");

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadMember(u).then(() => setLoading(false));
      } else if (!hasHashToken) {
        // Only stop loading if there is no hash token pending
        setLoading(false);
      }
      // If hasHashToken && !u, we wait — onAuthStateChange will fire shortly
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadMember(u).then(() => setLoading(false));
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    // Safety timeout: if hash processing takes too long, stop loading anyway
    let timeout;
    if (hasHashToken) {
      timeout = setTimeout(() => setLoading(false), 5000);
    }

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
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

    if (SELFHOSTED) return; // no realtime in self-hosted mode

    const channel = supabase
      .channel("members-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_members" }, () => {
        loadMembers();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Revalidate current member when members list changes
  useEffect(() => {
    if (!user?.email || members.length === 0) return;
    const current = members.find((m) => m.email === user.email);
    if (!current) {
      // Member was deleted — clear session
      setMember(null);
    } else if (member && (current.role !== member.role || current.status !== member.status)) {
      // Role or status changed — update member
      setMember(current);
    }
  }, [members]);

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
