import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../lib/constants";

const adminColors = {
  bg: COLORS.bgDark || "#0A0A0A",
  surface: COLORS.surfaceDark || "#060606",
  border: COLORS.borderDark || COLORS.border,
  muted: COLORS.mutedDark || "rgba(255,255,255,0.45)",
  text: COLORS.white,
};

function AdminNav({ onSignOut }) {
  return (
    <nav
      style={{
        background: adminColors.surface,
        borderBottom: `1px solid ${adminColors.border}`,
        padding: "0 2rem",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        <div>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "14px",
              color: adminColors.text,
            }}
          >
            Estanler A
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              color: COLORS.gold,
              textTransform: "uppercase",
              marginLeft: "8px",
            }}
          >
            Admin
          </span>
        </div>
        {[
          { label: "Dashboard", to: "/admin" },
          { label: "Portfolio", to: "/admin/portfolio" },
          { label: "Galleries", to: "/admin/galleries" },
          { label: "Inquiries", to: "/admin/inquiries" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: adminColors.muted,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = adminColors.text)}
            onMouseLeave={(e) => (e.target.style.color = adminColors.muted)}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link
          to="/"
          target="_blank"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: adminColors.muted,
            textDecoration: "none",
          }}
        >
          View Site ↗
        </Link>
        <button
          onClick={onSignOut}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: adminColors.muted,
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.color = adminColors.text)}
          onMouseLeave={(e) => (e.target.style.color = adminColors.muted)}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

export { AdminNav };

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    galleries: 0,
    inquiries: 0,
    newInquiries: 0,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  useEffect(() => {
    async function fetchStats() {
      const [{ count: galleries }, { count: inquiries }, { count: newInq }] =
        await Promise.all([
          supabase
            .from("client_galleries")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("inquiries")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("inquiries")
            .select("*", { count: "exact", head: true })
            .eq("status", "new"),
        ]);
      setStats({
        galleries: galleries || 0,
        inquiries: inquiries || 0,
        newInquiries: newInq || 0,
      });
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Galleries",
      value: stats.galleries,
      to: "/admin/galleries",
      color: COLORS.gold,
    },
    {
      label: "Total Inquiries",
      value: stats.inquiries,
      to: "/admin/inquiries",
      color: adminColors.text,
    },
    {
      label: "New Inquiries",
      value: stats.newInquiries,
      to: "/admin/inquiries",
      color: "#4ade80",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: adminColors.bg }}>
      <AdminNav onSignOut={handleSignOut} />
      <div style={{ padding: "2.5rem 2rem" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "1.8rem",
            color: adminColors.text,
            marginBottom: "2rem",
          }}
        >
          Dashboard
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1px",
            background: adminColors.border,
            marginBottom: "3rem",
          }}
        >
          {statCards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: adminColors.surface,
                  padding: "2rem",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#0d0d0d")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = adminColors.surface)
                }
              >
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: "2.5rem",
                    color: card.color,
                    marginBottom: "0.5rem",
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.82rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: adminColors.muted,
                  }}
                >
                  {card.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <h2
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: "1rem",
          }}
        >
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link
            to="/admin/portfolio"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: adminColors.bg,
              background: COLORS.gold,
              padding: "12px 24px",
              textDecoration: "none",
            }}
          >
            Manage Portfolio
          </Link>
          <Link
            to="/admin/galleries"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: adminColors.bg,
              background: COLORS.gold,
              padding: "12px 24px",
              textDecoration: "none",
            }}
          >
            + New Gallery
          </Link>
          <Link
            to="/admin/inquiries"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: COLORS.gold,
              background: "transparent",
              border: `1px solid ${adminColors.border}`,
              padding: "12px 24px",
              textDecoration: "none",
            }}
          >
            View Inquiries
          </Link>
        </div>
      </div>
    </div>
  );
}
