"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Plug, Trash2 } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Catalog = { provider: string; label: string; status: string; setup_note: string };
type Integration = { id: number; provider: string; label: string; status: string; created_at: string };

const publicUrls: Record<string, string> = {
  freelancehunt: "https://freelancehunt.com/my/api",
};

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [freelancehuntToken, setFreelancehuntToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch(API + "/integrations/catalog", { credentials: "include" }),
        fetch(API + "/integrations", { credentials: "include" }),
      ]);
      if (responses.some((response) => response.status === 401)) {
        window.location.assign("/login");
        return;
      }
      const catalogData = await responses[0].json();
      const integrationsData = await responses[1].json();
      if (!responses[0].ok || !responses[1].ok) {
        throw new Error(catalogData.detail ?? integrationsData.detail ?? "Не удалось загрузить подключения.");
      }
      setCatalog(catalogData);
      setItems(integrationsData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось связаться с API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(item: Integration) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(API + "/integrations/" + item.id, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail ?? "Не удалось удалить подключение.");
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setMessage("Запись подключения удалена.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить подключение.");
    }
  }

  async function syncFreelancehunt() {
    setSyncing(true); setError(""); setMessage("");
    try {
      const response = await fetch(API + "/integrations/freelancehunt/sync", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (response.status === 401 && data.integration_status !== "reauth_required") {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        if (data.integration_status === "reauth_required") await load();
        throw new Error(data.detail ?? "Не удалось синхронизировать статусы Freelancehunt.");
      }
      setMessage(`Проверено откликов: ${data.checked}. Обновлено ответов заказчиков: ${data.updated}. Ошибок: ${data.errors}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось синхронизировать статусы.");
    } finally { setSyncing(false); }
  }

  async function connectFreelancehunt() {
    const secret = freelancehuntToken.trim();
    if (!secret) { setError("Введи API-токен Freelancehunt."); return; }
    setConnecting(true); setError(""); setMessage("");
    try {
      const response = await fetch(API + "/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "freelancehunt", secret })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Не удалось подключить Freelancehunt.");
      setFreelancehuntToken("");
      setMessage("API-токен проверен и сохранён в зашифрованном виде.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось подключить Freelancehunt.");
    } finally { setConnecting(false); }
  }

  return (
    <WorkspacePage
      title="Подключения"
      subtitle="Подключи Freelancehunt, чтобы находить заказы и отправлять отклики."
    >
      {error && <div className="sub-alert error" role="alert">{error}</div>}
      {message && <div className="sub-alert" role="status">{message}</div>}

      <section className="content-card">
        <h2><Plug size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />Биржи фриланса</h2>
        <p>Для Freelancehunt нужен API-токен. Получи его в своём аккаунте на бирже и вставь ниже — пароль от аккаунта вводить не нужно.</p>
        {loading ? (
          <div className="sub-empty">Загружаем список площадок…</div>
        ) : (
          <div className="sub-list">
            {catalog.map((entry) => {
              const integration = items.find((item) => item.provider === entry.provider);
              const externalUrl = publicUrls[entry.provider];
              return (
                <article className="sub-list-row" key={entry.provider}>
                  <div className="sub-list-main">
                    <strong>{entry.label}</strong>
                    <span>{entry.setup_note}</span>
                    {integration && <span>Запись: {integration.status.replaceAll("_", " ")}</span>}
                    {entry.provider === "freelancehunt" && (
                      <div className="sub-form" style={{ marginTop: 12, maxWidth: 520 }}>
                        <ol style={{ margin: "0 0 4px", paddingLeft: 20, lineHeight: 1.7 }}>
                          <li>Открой <a href="https://freelancehunt.com/my/api" target="_blank" rel="noreferrer">«Приложения и API» на Freelancehunt</a> и войди в аккаунт.</li>
                          <li>Создай API-ключ на этой странице и скопируй его.</li>
                          <li>Вставь ключ в поле ниже и нажми «Проверить и подключить».</li>
                        </ol>
                        <label htmlFor="freelancehunt-api-token">API-токен Freelancehunt</label>
                        <input id="freelancehunt-api-token" className="sub-input" type="password" autoComplete="new-password" value={freelancehuntToken} onChange={event => setFreelancehuntToken(event.target.value)} placeholder="Вставь API-токен, не пароль от аккаунта" />
                        <button className="sub-button primary" type="button" disabled={connecting || !freelancehuntToken.trim()} onClick={() => void connectFreelancehunt()}>{connecting ? "Проверяем токен…" : integration?.status === "connected" ? "Проверить и обновить токен" : "Проверить и подключить"}</button>
                      </div>
                    )}
                  </div>
                  <span className={"sub-badge " + (integration?.status === "connected" ? "" : "pending")}>
                    {integration?.status === "connected" ? "Подключено" : integration?.status === "reauth_required" ? "Нужно переподключить" : entry.provider === "freelancehunt" ? "Доступно через официальный API" : "Интеграция в разработке"}
                  </span>
                  {externalUrl && (
                    <a className="sub-button" href={externalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={14} /> Получить API-токен
                    </a>
                  )}
                  {integration?.provider === "freelancehunt" && integration.status === "connected" && (
                    <button className="sub-button" type="button" disabled={syncing} onClick={() => void syncFreelancehunt()}>
                      {syncing ? "Проверяем статусы…" : "Синхронизировать отклики"}
                    </button>
                  )}
                  {integration && (
                    <button className="sub-button danger" type="button" onClick={() => void remove(integration)}>
                      <Trash2 size={14} /> Удалить запись
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="content-card">
        <h2>Безопасность подключения</h2>
        <div className="sub-list">
          <div className="sub-list-row">
            <div className="sub-list-main">
              <strong>Пароли аккаунтов не запрашиваются</strong>
              <span>Подключение будет идти через официальный экран площадки или ограниченный токен, если биржа это поддерживает.</span>
            </div>
          </div>
          <div className="sub-list-row">
            <div className="sub-list-main">
              <strong>Отправка отклика не считается успешной заранее</strong>
              <span>Статус «Отправлен» появится только после подтверждения со стороны биржи.</span>
            </div>
          </div>
        </div>
      </section>
    </WorkspacePage>
  );
}

